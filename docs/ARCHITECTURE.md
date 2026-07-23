# 아키텍처

## 컴포넌트

```
┌─────────────────────────────────────────────┐        ┌──────────────────┐
│ VSCode Extension (extension.ts)              │        │ KCLOUD VM         │
│                                               │        │                    │
│  - createWebviewPanel()                      │  HTTP  │  Express           │
│  - git remote/user.name 조회 → mode 판별      │◄──────►│  better-sqlite3    │
│  - onDidChangeViewState / WindowState 감지    │ (from  │  (WAL mode)        │
│  - globalState (local 모드 최고점수 저장)      │webview)│  systemd 상시구동   │
│           │ postMessage                       │        └──────────────────┘
│           ▼                                   │
│  ┌─────────────────────────────────────┐     │
│  │ Webview (Phaser 게임, bundle.js)      │     │
│  │  BootScene / GameScene               │     │
│  │  message 핸들러: init / setPaused     │     │
│  └───────────────────────────────────────┘     │
└─────────────────────────────────────────────┘
```

- 게임 로직(Phaser)은 webview 안에서만 실행되며 VSCode API에 직접 접근할 수 없다.
- extension.ts가 git 정보 조회, 포커스 감지, 로컬 저장소(`globalState`)를 담당하고 `postMessage`로 webview에 전달한다.
- webview는 `mode`에 따라 서버 통신 여부를 분기하고, 서버와의 HTTP 통신은 webview에서 직접 수행한다 (extension을 경유하지 않음).

## 모드 분기 (local / online)

`extension.ts`가 워크스페이스의 git remote 유무로 판별:

- git remote 없음 → `mode: 'local'`
  - 서버 통신 코드 경로를 타지 않음
  - 최고 점수는 `context.globalState`에 저장/조회
- git remote 있음 → `mode: 'online'`
  - `groupId = sha256(repoUrl).slice(0, 12)`
  - `userName = git config user.name`
  - 점수 제출/리더보드 조회는 webview → 서버로 직접 HTTP 요청

판별 결과는 webview 생성 직후 한 번, `{ type: 'init', mode, groupId, userName }` 메시지로 전달한다.

online 모드에서 서버 요청이 실패해도 게임이 죽지 않도록 fallback 처리(로컬 표시로 전환)가 필요하다 — [PLAN.md 5일차](./PLAN.md#5일차--리더보드-ui--일시정지-오버레이--안정성) 참고.

## 포커스 감지 → pause/resume

목적: webview가 백그라운드 탭이거나 VSCode 창이 비활성 상태일 때 게임 클릭이 씹히지 않도록(입력 유실) 미리 일시정지시킨다.

**감지 (extension.ts, 두 리스너 모두 패널 생성 시점에 등록)**
- `panel.onDidChangeViewState` — 다른 에디터 탭으로 전환
- `vscode.window.onDidChangeWindowState` — VSCode 창 자체가 포커스 아웃

두 경우 모두 동일한 메시지로 webview에 전달:

```ts
panel.webview.postMessage({ type: 'setPaused', paused: boolean });
```

**처리 (game.js, 단일 message 리스너에서 type으로 분기)**

| type | 동작 |
|---|---|
| `init` | mode/groupId/userName을 게임 컨텍스트에 저장 |
| `setPaused` | `paused === true`: `game.scene.pause('GameScene')` + `game.input.enabled = false`<br>`paused === false`: `game.scene.resume('GameScene')` + `game.input.enabled = true` |

`setPaused` 시 UI 측에서 "일시정지" 오버레이도 함께 표시/해제한다 (`showPauseOverlay`). 오버레이가 없으면 사용자가 클릭이 안 먹는 이유를 알 수 없기 때문.

**주의**: `game.scene.pause()`만으로는 클릭 이벤트 자체를 막지 못할 수 있어 `game.input.enabled`도 함께 꺼야 한다 — 정지 중 클릭으로 데미지가 들어가거나 서버 요청이 트리거되는 걸 막기 위함 (4일차 체크포인트).

## 리소스 로딩 (webview 제약)

- Phaser 게임은 `vite build`로 `bundle.js`에 번들링 후 webview에 로드
- 모든 정적 리소스 경로는 `panel.webview.asWebviewUri()`로 변환 필요 (webview는 `vscode-webview://` 스킴만 신뢰)
- CSP: `connect-src`에 VM 주소를 명시해야 webview에서 서버로 fetch 가능 (`default-src 'none'` 기준으로 나머지 전부 명시적 허용 필요)

## 서버-확장 간 결합도

서버는 어떤 클라이언트가 요청하는지 알 필요 없이 순수 REST API로 동작한다. extension/webview와 결합되는 지점은 오직 groupId 해싱 알고리즘(sha256 앞 12자리)이 양쪽에서 동일해야 한다는 것 — 서버는 클라이언트가 보낸 groupId를 그대로 저장/조회할 뿐 재계산하지 않는다.
