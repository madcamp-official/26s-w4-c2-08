# 프론트엔드 (Phaser) 구현

webview 안에서 실행되는 보스 클리커 게임의 씬 구성, 전투 시스템, extension과의 메시지 프로토콜을 정리한다. 전체 구조는 [ARCHITECTURE.md](./ARCHITECTURE.md), 서버 API는 [API.md](./API.md), 일정은 [PLAN.md](./PLAN.md) 참고.

## 씬 구성

| 씬 | 역할 |
|---|---|
| `BootScene` | 스프라이트/사운드 등 에셋 로드 후 `GameScene`으로 전환 |
| `GameScene` | 보스 스프라이트, HP바, 클릭 입력, 전투 로직, 승리 처리 |

`GameScene`은 `preload` 없이 `BootScene`이 로드해둔 에셋만 사용한다 (씬 전환 시 재로딩 방지).

## 전투 시스템

기본 흐름: 보스 클릭 → 데미지 계산 → HP 차감 → HP바 갱신 → HP 0 이하면 승리 처리.

```
click ──▶ rollDamage() ──▶ boss.hp -= damage ──▶ updateHpBar()
                                   │
                                   └─ hp <= 0 ? ──▶ onGameClear()
```

### 콤보 시스템

연속 클릭 간격이 일정 시간(threshold) 이내일 때 콤보 카운트가 오르고, 데미지에 배율로 곱해진다. 간격을 벗어나면 콤보가 리셋된다.

- 클릭마다 `now - lastClickTime`을 비교해 콤보 유지/리셋 판단
- 콤보 배율은 콤보 수에 따라 증가(예: 1.0 → 1.05 → 1.1 ...), 상한을 둬서 무한 배율 방지
- 정지 상태([일시정지](#일시정지-오버레이) 참고)에서는 클릭 자체가 막히므로 콤보 타이머도 함께 정지됨에 유의 — `setPaused` 동안 `lastClickTime` 갱신이 없어야 재개 후 즉시 콤보가 끊기지 않는다

### 크리티컬 히트

클릭마다 일정 확률로 크리티컬 판정, 성공 시 데미지에 배수(예: x2)를 적용한다. 일반 타격과 시각/사운드 피드백을 구분한다(이펙트 색상, 크리티컬 전용 사운드).

### 타격 이펙트

- 보스 스프라이트 흔들림: tween으로 짧은 시간 x/y 오프셋을 줬다가 원위치
- 데미지 텍스트 팝업: 클릭 지점 근처에 데미지 숫자를 띄우고 위로 떠오르며 페이드아웃 (tween + `destroy` on complete)
- 크리티컬 히트는 별도 스타일(더 큰 폰트/색상)로 구분

### 사운드

- 타격음: 일반 클릭마다 재생
- 크리티컬음: 크리티컬 성공 시 타격음 대신(또는 함께) 재생
- 승리음: HP 0 도달 시 1회 재생

사운드 재생은 `setPaused === true`인 동안 트리거되지 않아야 한다 — 입력 자체가 막히므로 자연히 보장되지만, 타이머 기반 이펙트(딜레이 콜백 등)가 정지 중에도 큐에 남아 나중에 재생되지 않도록 씬 pause와 함께 정리한다.

## 게임 종료 → onGameClear

HP가 0 이하가 되면 승리 오버레이를 표시하고 `onGameClear(context, score)`를 호출한다. 이후 처리는 모드에 따라 분기한다.

```js
function onGameClear(context, score) {
  if (context.mode === 'online') {
    submitScore(context.groupId, context.userName, score);
    fetchLeaderboard(context.groupId);
  } else {
    postToExtension({ type: 'saveLocalScore', score });
  }
}
```

- `online`: webview가 서버로 직접 `POST /api/scores` 호출 후 `GET /api/leaderboard` 조회 ([API 스펙](./API.md)). 요청 실패 시 크래시 없이 콘솔 경고 후 로컬 표시로 폴백한다 ([API.md의 fallback](./API.md#클라이언트-측-fallback)).
- `local`: 서버 요청 없이 extension에 `saveLocalScore` 메시지를 보내고, extension이 `context.globalState.update('bestScore', score)`로 저장한다.

## extension ↔ webview 메시지 프로토콜

모든 메시지는 `type` 필드로 구분하고, webview 쪽 단일 `message` 리스너에서 분기한다.

| 방향 | type | payload | 처리 |
|---|---|---|---|
| ext → webview | `init` | `{ mode, groupId, userName }` | 게임 컨텍스트(`gameContext`)에 저장, 웹뷰 생성 직후 1회 전달 |
| ext → webview | `setPaused` | `{ paused: boolean }` | [일시정지](#일시정지-오버레이) 참고 |
| webview → ext | `saveLocalScore` | `{ score }` | local 모드에서 최고점수 저장 요청 |

```js
window.addEventListener('message', (event) => {
  const msg = event.data;
  switch (msg.type) {
    case 'init':
      gameContext = { mode: msg.mode, groupId: msg.groupId, userName: msg.userName };
      break;
    case 'setPaused':
      if (msg.paused) {
        game.scene.pause('GameScene');
        game.input.enabled = false;
      } else {
        game.scene.resume('GameScene');
        game.input.enabled = true;
      }
      showPauseOverlay(msg.paused);
      break;
  }
});
```

`setPaused`는 두 소스(탭 전환, 창 포커스 아웃)에서 올 수 있지만 webview 입장에서는 동일하게 처리한다. 자세한 발신 측 로직은 [ARCHITECTURE.md 포커스 감지](./ARCHITECTURE.md#포커스-감지--pauseresume) 참고.

## 모드별 UI 분기 (online / local)

`gameContext.mode` 값에 따라 클리어 후 보여줄 화면이 다르다.

- `online`: 리더보드 섹션 표시. `fetchLeaderboard` 응답 대기 중 로딩 상태, 실패 시 에러 상태를 UI에 반영
- `local`: 리더보드 섹션을 숨기고 "내 최고 기록: XXX점" 텍스트만 표시. 값은 extension이 `globalState`에서 조회해 `init` 이후 별도 메시지(또는 `saveLocalScore` 응답)로 내려준 값을 사용

두 모드 모두 `mode` 판별 자체는 webview가 아니라 extension이 git remote 유무로 미리 계산해 `init` 메시지로 내려준 값을 그대로 신뢰한다 ([ARCHITECTURE.md 모드 분기](./ARCHITECTURE.md#모드-분기-local--online)).

## 일시정지 오버레이

`setPaused` 처리와 함께 오버레이를 표시/해제해 사용자가 "왜 클릭이 안 먹는지" 헷갈리지 않도록 한다.

```js
function showPauseOverlay(paused) {
  document.getElementById('pause-overlay').style.display = paused ? 'flex' : 'none';
}
```

- 오버레이는 게임 캔버스 위에 겹치는 DOM 엘리먼트로, Phaser 씬과 별개로 순수 HTML/CSS로 관리
- `game.input.enabled = false`만으로 클릭 자체는 막히지만 오버레이가 없으면 사용자가 "안 눌리는 버그"로 오인할 수 있음 (5일차 체크포인트)

## 리소스/번들링 제약

- 개발은 일반 브라우저에서, 최종 산출물은 `vite build`로 `bundle.js` 하나로 번들링해 webview에 로드
- webview는 `vscode-webview://` 스킴 외 리소스를 신뢰하지 않으므로 정적 에셋(이미지/사운드) 경로는 extension이 `asWebviewUri()`로 변환한 값을 `bundle.js`에 주입하거나, 빌드 시 상대경로로 포함시켜야 함
- CSP `connect-src`에 서버 주소가 없으면 online 모드에서 `fetch`가 조용히 실패하므로, 네트워크 탭에서 CSP 위반 여부를 우선 확인 ([ARCHITECTURE.md 리소스 로딩](./ARCHITECTURE.md#리소스-로딩-webview-제약))
