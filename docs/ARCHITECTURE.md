# 아키텍처

## 컴포넌트

```
┌─────────────────────────────────────────────┐        ┌──────────────────┐
│ VSCode Extension (extension.ts)              │        │ KCLOUD VM         │
│                                               │        │                    │
│  - createWebviewPanel()                      │  HTTP  │  Express           │
│  - git remote/user.name 조회 → mode 판별      │◄──────►│  better-sqlite3    │
│  - globalState (local 모드 최고점수 저장)      │ (from  │  (WAL mode)        │
│           │ postMessage                       │webview)│  systemd 상시구동   │
│           ▼                                   │        └──────────────────┘
│  ┌─────────────────────────────────────┐     │
│  │ Webview (Phaser 게임, bundle.js)      │     │
│  │  BootScene / GameScene               │     │
│  │  msg: init/agentTaunt ↔ saveLocalScore│     │
│  │        /saveUserName                 │     │
│  └───────────────────────────────────────┘     │
└─────────────────────────────────────────────┘
```

- 게임 로직(Phaser)은 webview 안에서만 실행되며 VSCode API에 직접 접근할 수 없다.
- extension.ts가 git 정보 조회, 로컬 저장소(`globalState`)를 담당하고 `postMessage`로 webview에 전달한다.
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

판별 결과는 webview 생성 직후 한 번, `{ type: 'init', mode, groupId, userName, hasUserName, bestScore }` 메시지로 전달한다. `bestScore`는 `context.globalState`에서 조회한 local 모드 최고기록으로, online 모드에서는 webview가 무시한다. `hasUserName`은 `userName`이 실제로 알아낸 이름(저장된 값 또는 git `user.name`)인지, `'player'` 폴백인지를 나타낸다 — online 모드에서 게임 종료 시 이 값이 `false`이면 webview가 이름 입력 모달을 띄우고, 확정된 이름을 `saveUserName` 메시지로 돌려보낸다. 전체 메시지 프로토콜은 [FRONTEND.md](./FRONTEND.md#extension--webview-메시지-프로토콜) 참고.

online 모드에서 서버 요청이 실패해도 게임이 죽지 않도록 fallback 처리(로컬 표시로 전환)가 필요하다.

## 리소스 로딩 (webview 제약)

- Phaser 게임은 `vite build`로 `bundle.js`에 번들링 후 webview에 로드
- 모든 정적 리소스 경로는 `panel.webview.asWebviewUri()`로 변환 필요 (webview는 `vscode-webview://` 스킴만 신뢰)
- CSP: `connect-src`에 VM 주소(`https://vibehit.backend.madcamp-kaist.org`)를 명시해야 webview에서 서버로 fetch 가능 (`default-src 'none'` 기준으로 나머지 전부 명시적 허용 필요)

## 서버-확장 간 결합도

서버는 어떤 클라이언트가 요청하는지 알 필요 없이 순수 REST API로 동작한다. extension/webview와 결합되는 지점은 오직 groupId 해싱 알고리즘(sha256 앞 12자리)이 양쪽에서 동일해야 한다는 것 — 서버는 클라이언트가 보낸 groupId를 그대로 저장/조회할 뿐 재계산하지 않는다.

## Stop 훅 (토큰 사용량 기반 실시간 캐릭터 대사)

`hitTheAgent.enableTokenWatchHook` 설정(기본 off)을 켜면, Claude Code가 **매 턴 응답을 마칠 때마다**(`Stop` 이벤트) 이번 세션 누적 토큰 사용량을 확인해 임계치(`extension/src/hookManager.ts`의 `TOKEN_THRESHOLD` 상수, 코드에 고정값)를 넘기면 확률적으로 게임 캐릭터가 대사를 띄운다. extension이 직접 감지하는 게 아니라 Claude Code 자체의 hook 메커니즘에 얹는 구조라, 두 프로세스가 파일로만 통신한다. 처음엔 `SessionEnd`(세션 완전 종료 시 1회)로 만들었다가, 게임이 열려 있는 동안 실시간으로 반응하게 하려고 `Stop`(매 턴)으로 바꿨다.

1. **등록/해제**: `extension/src/hookManager.ts`가 워크스페이스의 `.claude/settings.local.json`(로컬 전용, gitignore 대상 — 팀원 설정에는 영향 없음)에 `hooks.Stop` 항목을 추가/제거한다. `activate()` 시점과 `enableTokenWatchHook` 설정 변경 시점에 동기화되며, 우리가 심은 항목인지는 커맨드 문자열에 `token-watch-hook.js`가 포함돼 있는지로 식별해 다른 훅은 건드리지 않는다. `Stop`은 matcher를 지원하지 않는다.
2. **훅 실행**: Claude Code가 각 턴을 마칠 때마다 `node extension/scripts/token-watch-hook.js --threshold=... --chance=... --stateFile=...`를 실행하고, `{ session_id, transcript_path, cwd, stop_hook_active, ... }`를 stdin으로 넘겨준다. 이 스크립트는 VSCode API에 접근할 수 없는 완전히 독립된 Node 프로세스다.
3. **절대 block하면 안 됨**: `Stop` 훅은 SessionEnd와 달리 exit code 2나 `{"decision":"block"}`을 반환하면 사용자의 실제 턴이 끝나지 못하게 막아버릴 수 있다. 이 스크립트는 순수 관찰자로만 동작 — 항상 exit 0, stdout에 아무것도 안 찍고, 모든 에러 경로(최상위 try/catch 포함)를 조용히 삼킨다. `stop_hook_active`가 true면(재진입 루프 방지용 플래그) 바로 종료한다.
4. **토큰 계산 — 증분(incremental) 방식**: 매 턴마다 훅이 도는 만큼, 매번 트랜스크립트 전체를 다시 읽으면 세션이 길어질수록 턴마다 지연이 계속 늘어난다(Stop 훅은 동기적으로 사용자의 다음 입력을 막는 훅이라 이 지연이 그대로 체감됨). 그래서 세션별 진행 상태를 `.claude/hit-the-agent/progress/<session_id>.json`에 `{ offset, tokenTotal, notified }`로 저장해두고, 매 턴마다 트랜스크립트 파일에서 **이전 offset 이후로 새로 추가된 바이트만** `fs.readSync`로 읽어 `type: "assistant"`인 줄들의 `message.usage.input_tokens + output_tokens`만 더한다. 마지막 줄이 아직 개행으로 안 끝났으면(쓰는 도중) 다음 턴으로 넘긴다.
5. **재발동 조건**: 한 번 발동하면 그 시점의 누적 토큰(`notifiedAtTokenTotal`)을 기록해두고, 그 이후로 다시 threshold만큼 토큰을 **새로** 쓸 때마다 재도전 대상이 된다 (예: threshold=50000이면 50000, 100000, 150000... 지점마다). 각 도전은 확률(`TRIGGER_CHANCE`, 기본 0.3 — 테스트 중엔 1로 임시 고정)로 결정되며, 확률에서 떨어지면 기준점을 안 옮기고 다음 턴에 그대로 재도전한다 — 매 턴마다 무조건 뜨는 스팸은 아니면서도, 계속 대화하면 주기적으로 다시 뜨는 방식.
6. **이벤트 전달**: 발동하면 `<workspace>/.claude/hit-the-agent-state.json`에 `{ triggered, tokenCount, timestamp }`를 기록한다. extension은 두 경로로 이걸 소비한다: (a) 게임 패널이 열려 있는 동안엔 `.claude` 디렉터리에 건 `fs.watch`가 파일 생성을 감지해 **그 자리에서 바로** webview에 `agentTaunt`를 보낸다 (실시간). (b) 패널이 닫혀 있었다면 다음에 `HitTheAgent.start`로 게임을 열 때 소비한다. 두 경로 모두 읽는 즉시 파일을 지워 중복 전달을 막는다.
