# 프론트엔드 (Phaser) 구현

webview 안에서 실행되는 보스 클리커 게임의 씬 구성, 전투 시스템, extension과의 메시지 프로토콜을 정리한다. 전체 구조는 [ARCHITECTURE.md](./ARCHITECTURE.md), 서버 API는 [API.md](./API.md), 일정은 [PLAN.md](./PLAN.md) 참고.

## 씬 구성

| 씬 | 역할 |
|---|---|
| `BootScene` | 스프라이트/사운드 등 에셋 로드 후 `GameScene`으로 전환 |
| `GameScene` | 보스/무기 오브젝트, HP바, 드래그 입력, 충돌 판정, 전투 로직, 점수/리스폰 처리 |

`GameScene`은 `preload` 없이 `BootScene`이 로드해둔 에셋만 사용한다 (씬 전환 시 재로딩 방지).

## 전투 시스템

클릭으로 직접 때리는 방식이 아니라, **유저가 보스를 드래그로 옮기고 → 무기와 부딪히면 자동으로 데미지가 들어가는** 방식이다.

```
(boss와 weapon이 겹침, 히트 쿨다운 통과) ──▶ onBossHitWeapon() ──▶ rollDamage()
                                                          │
                                            boss.hp -= damage, score += damage
                                                          │
                                                          ▼
                                              updateHpBar() / updateScoreText()
                                                          │
                                                hp <= 0 ? ──▶ respawnBoss()
```

겹침이 발생하는 경로는 [무기 시스템](#무기-시스템-설치형--투척형--휴대형)에 따라 세 가지이지만(보스를 끌어서 무기에 부딪히기 / 무기를 던지기 / 무기를 끌어서 보스에 부딪히기), 겹침 이후의 데미지 처리(`onBossHitWeapon` 이하)는 무기 종류와 무관하게 공통 로직 하나로 처리한다.

### 보스 이동

- 보스는 자체 AI 이동 로직이 없다 — 스폰된 위치나 마지막으로 놓인 위치에 그대로 머무른다
- 보스 스프라이트에도 `setInteractive({ draggable: true })`를 적용해 플레이어가 직접 끌어서 옮길 수 있다 (주로 [설치형 무기](#1-설치형-무기)에 부딪히게 할 때 사용)
- `dragstart` / `drag` / `dragend` 이벤트로 포인터를 따라 보스 위치를 갱신, 화면 밖으로 나가지 않도록 드래그 중 좌표를 캔버스 바운드로 clamp
- [일시정지](#일시정지-오버레이) 중에는 `game.input.enabled = false`로 드래그 입력 자체가 막힘 (드래그 도중 정지된 경우 `dragend` 없이 멈추므로, `setPaused: true` 수신 시 진행 중인 드래그를 강제로 종료시켜 다음 재개 때 포인터가 꼬이지 않게 처리)

### 무기 시스템 (설치형 / 투척형 / 휴대형)

무기는 세 종류가 있고, 한 세션에 동시에 존재할 수 있다(설치형/휴대형 무기가 필드에 함께 놓여 있고, 투척형은 필요할 때 던지는 방식). 세 종류 모두 보스와 겹치면 동일한 `onBossHitWeapon`(공통 데미지 파이프라인, [위 다이어그램](#전투-시스템) 참고)으로 이어지고, 차이는 **무기가 어떻게 보스와 겹치게 되는가**뿐이다.

각 무기 오브젝트는 Arcade Physics 바디를 가지며, `this.physics.add.overlap(boss, weapon, onBossHitWeapon, ...)`로 겹침을 감지한다. 겹쳐 있는 동안 매 프레임 데미지가 들어가지 않도록 **히트 쿨다운**(예: 200~300ms 간격)을 두고, 쿨다운이 끝난 시점에만 실제 데미지를 적용한다. 데미지 계산(`rollDamage`) 자체는 무기 종류와 무관하게 기본 데미지 + 콤보 배율 + 크리티컬 배수를 곱해서 산출한다.

#### 1. 설치형 무기

- 인벤토리/배치 UI에서 필드로 드래그해 원하는 위치에 "설치"하면 그 자리에 고정된다 (설치 후에는 스스로 움직이지 않음)
- 데미지 트리거는 **보스 쪽을 드래그**해서 이 무기와 부딪히게 하는 것 ([보스 이동](#보스-이동) 참고)

#### 2. 투척형 무기

- 인벤토리/보관함 위치에서 드래그를 시작해 놓는(release) 방향과 거리로 발사 속도를 계산하는 슬링샷 방식으로 던진다
- 던져진 무기는 투사체로 전환되어 Arcade Physics 속도(velocity)를 받아 이동하며, 보스와 겹치면 `onBossHitWeapon`이 호출된 뒤 소멸한다(또는 화면 밖으로 나가면 소멸)
- 소멸 후에는 일정 쿨다운 뒤 다시 던질 수 있는 상태로 인벤토리에 리셋된다 — 쿨다운 중에는 드래그를 시작할 수 없도록 인터랙션을 막는다

#### 3. 휴대형 무기

- 플레이어가 직접 드래그해서 조작하는 무기로, `setInteractive({ draggable: true })`를 적용한다는 점은 [보스 이동](#보스-이동)과 동일하지만 대상이 무기 오브젝트라는 점이 다르다
- 이 무기를 쓸 때 보스는 스스로 움직이지 않고 그 자리에 고정되어 있으므로, 플레이어가 무기를 보스 위치까지 끌고 가서 부딪히면 데미지가 들어간다
- 설치형과 마찬가지로 던지는 게 아니라 계속 잡고 있는 상태이므로, 드래그 도중 계속 겹쳐 있으면 히트 쿨다운 주기로 반복 데미지가 들어간다 (콤보 유지에 유리)

### 콤보 시스템

기존에는 "연속 클릭 간격"으로 콤보를 유지했지만, 이제 클릭이 아니라 충돌 히트가 데미지 트리거이므로 **연속 히트 간격**으로 대체한다.

- 히트가 발생할 때마다 `now - lastHitTime`을 비교해 콤보 유지/리셋 판단 (threshold 초과 시 리셋)
- 콤보 배율은 콤보 수에 따라 증가(예: 1.0 → 1.05 → 1.1 ...), 상한을 둬서 무한 배율 방지
- 보스와 무기(설치형이든 휴대형이든)를 계속 겹쳐두면 히트 쿨다운 주기로 자동 콤보가 쌓이므로, 콤보 threshold는 히트 쿨다운보다 넉넉하게 잡아야 "겹쳐두기만 해도 콤보 유지"가 자연스럽게 성립한다. 투척형은 겹침이 한 순간뿐이라 단발 히트로 끝나고 콤보는 다음 투척/다른 무기의 히트와 연결되어야 이어진다
- 정지 상태에서는 씬 자체가 pause되어 히트가 발생하지 않으므로 `lastHitTime`도 갱신되지 않는다 — 재개 직후 곧바로 콤보가 끊기지 않도록 유의

### 크리티컬 히트

히트마다 일정 확률로 크리티컬 판정, 성공 시 데미지에 배수(예: x2)를 적용한다. 일반 히트와 시각/사운드 피드백을 구분한다(이펙트 색상, 크리티컬 전용 사운드).

### 타격 이펙트

- 보스 스프라이트 흔들림: 히트 시 tween으로 짧은 시간 x/y 오프셋을 줬다가 원위치
- 데미지 텍스트 팝업: 충돌 지점 근처에 데미지 숫자를 띄우고 위로 떠오르며 페이드아웃 (tween + `destroy` on complete)
- 크리티컬 히트는 별도 스타일(더 큰 폰트/색상)로 구분

### 사운드

- 타격음: 히트 쿨다운이 풀려 실제 데미지가 적용될 때마다 재생
- 크리티컬음: 크리티컬 성공 시 타격음 대신(또는 함께) 재생
- 보스 처치음: HP 0 도달(리스폰 직전)에 1회 재생

사운드 재생은 `setPaused === true`인 동안 트리거되지 않아야 한다 — 씬이 pause되어 physics overlap 콜백 자체가 멈추므로 자연히 보장된다.

## 점수 & 보스 리스폰

- **점수는 보스에게 입힌 데미지량에 비례해 증가한다**: 히트가 발생할 때마다 `score += damage`로 누적. HP가 깎일수록(=데미지를 줄수록) 점수가 오르는 구조이며, 보스를 실제로 쓰러뜨리는 것 자체는 점수에 별도 보너스를 주지 않아도 된다 (원한다면 처치 보너스를 얹는 것은 선택사항)
- **HP가 0 이하가 되면 즉시 리스폰**: 승리 오버레이나 씬 정지 없이 `respawnBoss()`를 호출해 `hp = maxHp`로 초기화하고, 무기와 곧바로 다시 겹쳐 연속 데미지가 들어가는 것을 막기 위해 무기 히트박스에서 떨어진 위치(랜덤 스폰 포인트 또는 화면 중앙)로 보스를 재배치한다
- 리스폰 시 "처치!" 텍스트 팝업 등 짧은 피드백만 주고 게임 진행은 끊기지 않는다 — 세션 전체가 하나의 연속된 플레이로 이어지고, 점수는 리스폰을 거듭해도 계속 누적된다

```js
function onBossHitWeapon(boss, weapon) {
  if (now() - lastHitTime < HIT_COOLDOWN) return;
  const damage = rollDamage(); // 콤보 배율 + 크리티컬 배수 포함
  boss.hp -= damage;
  score += damage;
  lastHitTime = now();
  updateHpBar();
  updateScoreText();
  if (boss.hp <= 0) respawnBoss();
}

function respawnBoss() {
  boss.hp = boss.maxHp;
  boss.setPosition(...getSpawnPointAwayFromWeapon());
  playDefeatFeedback();
  updateHpBar();
}
```

## 게임 종료 → onGameEnd

보스가 즉시 리스폰되며 게임이 자동으로 끝나지 않으므로, **플레이어가 화면의 "종료" 버튼을 눌러야** 세션이 끝나고 그때까지 누적된 점수가 제출된다 (HP 0 시점이 더 이상 종료 트리거가 아님).

```js
function onEndButtonClick(context, score) {
  game.scene.pause('GameScene');
  game.input.enabled = false;
  onGameEnd(context, score);
}

function onGameEnd(context, score) {
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
- "종료" 버튼은 [일시정지 오버레이](#일시정지-오버레이)와 별개의 UI로, 포커스 이탈로 인한 자동 정지(`setPaused`)와 혼동되지 않도록 구분해서 표시한다. 종료 후에는 재개 대신 결과 화면(최종 점수, online이면 리더보드)을 보여준다.

## extension ↔ webview 메시지 프로토콜

모든 메시지는 `type` 필드로 구분하고, webview 쪽 단일 `message` 리스너에서 분기한다.

| 방향 | type | payload | 처리 |
|---|---|---|---|
| ext → webview | `init` | `{ mode, groupId, userName }` | 게임 컨텍스트(`gameContext`)에 저장, 웹뷰 생성 직후 1회 전달 |
| ext → webview | `setPaused` | `{ paused: boolean }` | [일시정지](#일시정지-오버레이) 참고 |
| webview → ext | `saveLocalScore` | `{ score }` | local 모드에서 종료 버튼 클릭 시 최고점수 저장 요청 |

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

`gameContext.mode` 값에 따라 종료 버튼을 누른 뒤 보여줄 화면이 다르다.

- `online`: 리더보드 섹션 표시. `fetchLeaderboard` 응답 대기 중 로딩 상태, 실패 시 에러 상태를 UI에 반영
- `local`: 리더보드 섹션을 숨기고 "내 최고 기록: XXX점" 텍스트만 표시. 값은 extension이 `globalState`에서 조회해 `init` 이후 별도 메시지(또는 `saveLocalScore` 응답)로 내려준 값을 사용

두 모드 모두 `mode` 판별 자체는 webview가 아니라 extension이 git remote 유무로 미리 계산해 `init` 메시지로 내려준 값을 그대로 신뢰한다 ([ARCHITECTURE.md 모드 분기](./ARCHITECTURE.md#모드-분기-local--online)).

## 일시정지 오버레이

`setPaused` 처리와 함께 오버레이를 표시/해제해 사용자가 "왜 드래그가 안 되는지" 헷갈리지 않도록 한다.

```js
function showPauseOverlay(paused) {
  document.getElementById('pause-overlay').style.display = paused ? 'flex' : 'none';
}
```

- 오버레이는 게임 캔버스 위에 겹치는 DOM 엘리먼트로, Phaser 씬과 별개로 순수 HTML/CSS로 관리
- `game.input.enabled = false`만으로 드래그/클릭 자체는 막히지만 오버레이가 없으면 사용자가 "안 눌리는 버그"로 오인할 수 있음 (5일차 체크포인트)
- 종료 버튼을 눌러 나오는 결과 화면과는 별개의 오버레이다 — 일시정지는 재개 가능, 종료는 재개 없이 결과만 보여준다

## 리소스/번들링 제약

- 개발은 일반 브라우저에서, 최종 산출물은 `vite build`로 `bundle.js` 하나로 번들링해 webview에 로드
- webview는 `vscode-webview://` 스킴 외 리소스를 신뢰하지 않으므로 정적 에셋(이미지/사운드) 경로는 extension이 `asWebviewUri()`로 변환한 값을 `bundle.js`에 주입하거나, 빌드 시 상대경로로 포함시켜야 함
- CSP `connect-src`에 서버 주소가 없으면 online 모드에서 `fetch`가 조용히 실패하므로, 네트워크 탭에서 CSP 위반 여부를 우선 확인 ([ARCHITECTURE.md 리소스 로딩](./ARCHITECTURE.md#리소스-로딩-webview-제약))
