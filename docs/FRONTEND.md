# 프론트엔드 (Phaser) 구현

webview 안에서 실행되는 보스 클리커 게임의 씬 구성, 전투 시스템, extension과의 메시지 프로토콜을 정리한다. 전체 구조는 [ARCHITECTURE.md](./ARCHITECTURE.md), 서버 API는 [API.md](./API.md), 일정은 [PLAN.md](./PLAN.md) 참고.

## 구현 현황

사운드는 아직 코드가 없는 설계 문서이며 섹션 제목에 `(미구현)`으로 표시했다. 콤보 시스템과 크리티컬 히트는 구현하지 않기로 결정해서 스펙에서 제외했다.

| 항목 | 상태 |
|---|---|
| 보스 드래그 이동, 충돌 시 데미지, HP바/점수 갱신, HP 0 시 즉시 리스폰 | ✅ 구현됨 |
| [무기 시스템](#무기-시스템-설치형--투척형--휴대형) (설치형/투척형/휴대형) | ✅ 구현됨 — 최초 설계와 세부 동작이 달라짐 (아래 참고) |
| [무기 뽑기(Draw)](#무기-뽑기-draw) | ✅ 구현됨 — 최초 설계에는 없던 기능 |
| [다중 무기 히트 데미지 합산](#다중-무기-히트-데미지-합산) | ✅ 구현됨 — 최초 설계에는 없던 기능 |
| [무기 합체(스택)](#무기-합체스택) | ✅ 구현됨 — 최초 설계에는 없던 기능 |
| [타격 이펙트](#타격-이펙트) (흔들림/플래시/데미지 팝업/처치 팝업) | ✅ 구현됨 |
| 사운드 | ⬜ 미구현 |
| 종료 버튼 / `onGameEnd` | ✅ 구현됨 — online: 점수 제출 + 리더보드 조회(실패 시 로컬 표시로 폴백), local: `saveLocalScore`로 최고기록 저장 |
| extension ↔ webview 연동, pause/resume, 리더보드 UI | ✅ 구현됨 — `extension/src/extension.ts`, `frontend/src/vscodeBridge.js` |

## 씬 구성

| 씬 | 역할 |
|---|---|
| `BootScene` | 스프라이트/사운드 등 에셋 로드 후 `GameScene`으로 전환 |
| `GameScene` | 보스/무기 오브젝트, HP바, 드래그 입력, 충돌 판정, 전투 로직, 점수/리스폰 처리 |

`GameScene`은 `preload` 없이 `BootScene`이 로드해둔 에셋만 사용한다 (씬 전환 시 재로딩 방지).

## 전투 시스템

클릭으로 직접 때리는 방식이 아니라, **유저가 보스나 무기를 드래그로 옮겨서 서로 부딪히면 자동으로 데미지가 들어가는** 방식이다.

```
(boss와 겹친 무기들, 히트 쿨다운 통과) ──▶ CombatSystem.handleHit()
                                                    │
                        겹친 무기마다 rollDamage() × weapon.damageMultiplier 를
                              독립적으로 굴려서 합산 (겹친 무기가 없으면 1회만 굴림)
                                                    │
                              boss.hp -= 합산 데미지, score += 합산 데미지
                                                    │
                                                    ▼
              HP바/점수 갱신 + 보스 흔들림·플래시(Boss.shake/flash) + 무기별 데미지 팝업
                                                    │
                                          hp <= 0 ? ──▶ 처치 팝업 표시 + respawn()
```

겹침이 발생하는 경로는 [무기 시스템](#무기-시스템-설치형--투척형--휴대형)에 따라 다르지만(보스와 무기 둘 다 드래그 가능하므로 어느 쪽을 끌어도 서로 부딪힐 수 있음 / 투척형은 발사대를 누르고 있으면 투사체가 자동으로 날아감), 겹침 이후의 데미지 처리(`CombatSystem.handleHit`)는 무기 종류와 무관하게 공통 로직 하나로 처리한다. 보스가 **동시에 여러 무기와 겹쳐 있으면** 겹친 개수만큼 데미지를 각각 독립적으로 굴려 합산한다 — [상세](#다중-무기-히트-데미지-합산).

### 보스 이동

- 보스는 자체 AI 이동 로직이 없다 — 스폰된 위치나 마지막으로 놓인 위치에 그대로 머무른다
- 보스 스프라이트에도 `setInteractive({ draggable: true })`를 적용해 플레이어가 직접 끌어서 옮길 수 있다 ([설치형](#1-설치형-무기)/[휴대형](#3-휴대형-무기) 무기도 전부 드래그 가능하므로, 보스를 무기 쪽으로 끌든 무기를 보스 쪽으로 끌든 어느 방향으로든 부딪힐 수 있다)
- `drag` 이벤트로 포인터를 따라 보스 위치를 갱신, 화면 밖으로 나가지 않도록 드래그 중 좌표를 캔버스 바운드로 clamp. 드래그 중인 대상이 보스인지 무기인지에 따라 `WeaponManager.resolveOverlapForBoss` / `resolveOverlapForDraggedWeapon`으로 서로를 완전히 통과하지는 못하게 막되, 히트 판정이 계속 되도록 약간의 겹침(`CONTACT_OVERLAP`)은 남겨둔다
- [일시정지](#일시정지-오버레이): `setPaused: true` 수신 시 `game.input.enabled = false`로 드래그 입력 자체를 막는다. 드래그 도중 정지된 경우 `dragend` 없이 멈추지만, 재개 후 `pointerdown`부터 다시 시작하므로 포인터 상태가 꼬이지 않는다

### 무기 시스템 (설치형 / 투척형 / 휴대형)

무기는 세 종류가 있고, 한 세션에 동시에 여러 개 존재할 수 있다. **게임 시작 시점에는 필드에 무기가 하나도 없이 보스만 존재**하며, [무기 뽑기(Draw)](#무기-뽑기-draw)를 통해서만 필드에 무기가 생긴다. 세 종류 모두 보스와 겹치면 동일한 `CombatSystem.handleHit`(공통 데미지 파이프라인, [위 다이어그램](#전투-시스템) 참고)으로 이어지고, 차이는 **무기가 어떻게 보스와 겹치게 되는가**뿐이다.

각 무기 오브젝트는 Arcade Physics 바디를 가지며, `this.physics.add.overlap(boss.sprite, weapon, onOverlap, ...)`로 겹침을 감지한다. 겹쳐 있는 동안 매 프레임 데미지가 들어가지 않도록 **히트 쿨다운**(`HIT_COOLDOWN`, 300ms)을 두고, 쿨다운이 끝난 시점에만 실제 데미지를 적용한다. 데미지 계산(`rollDamage`)은 기본 데미지(5~15) 범위에서 굴리며, [무기 합체(스택)](#무기-합체스택)로 얻은 `damageMultiplier`가 곱해진다.

> 설치형과 휴대형은 최초 설계에서는 "필드에 고정 vs 플레이어가 드는 것"으로 구분됐지만, 구현 과정에서 **둘 다 자유롭게 드래그로 옮길 수 있게 바뀌면서 사실상 동작이 동일**해졌다. 남은 차이는 텍스처(모양)와, [무기 합체](#무기-합체스택) 시 "같은 타입"을 판정하는 소속 그룹(`weapons` / `portableWeapons` 배열)뿐이다.

#### 1. 설치형 무기

- 파란 네모(`weapon` 텍스처). `physics.add.image` + `setInteractive({ draggable: true })`로 자유롭게 드래그 가능
- 보스와 항상 `physics.add.overlap`이 걸려 있어서, 보스를 이 무기 쪽으로 끌거나 이 무기를 보스 쪽으로 끌거나 어느 방향으로 부딪혀도 데미지가 들어간다
- 드래그 중에는 보스를 완전히 뚫고 지나가지 못하도록 `resolveOverlapForBoss`/`resolveOverlapForDraggedWeapon`이 위치를 막되, 히트 판정용으로 살짝(`CONTACT_OVERLAP`) 겹친 채로 멈춘다

#### 2. 투척형 무기

최초 설계였던 "드래그 시작 지점에서 놓는 방향/거리로 쏘는 슬링샷" 방식 대신, **누르고 있는 동안 자동으로 연사하는 방식**으로 구현했다.

- 파란 원(`weapon_throw`) 모양의 발사대(런처)를 필드에 두고, 발사대 자체도 드래그로 옮길 수 있다
- 발사대를 `pointerdown`(누르는 순간) 즉시 1발을 발사하고, 이후 누르고 있는 동안 `THROW_FIRE_INTERVAL`(400ms)마다 계속 자동 발사한다. `pointerup`(손을 떼면) 발사가 멈춘다
- 매 발사 시점마다 **그 순간의 보스 위치**를 향해 각도를 계산해 작은 원형 투사체(`weapon_throw_projectile`)에 Arcade velocity(`THROW_PROJECTILE_SPEED`)를 부여한다 — 발사 이후에는 유도(호밍)하지 않고 직선으로 날아간다
- 투사체가 보스와 겹치면 `handleHit`이 호출된 뒤 스스로 파괴되고, 화면 밖으로 나가도 정리된다(`WeaponManager.updateProjectiles`, 매 프레임 체크)
- **발사대 본체는 데미지를 주지 않는다** — 데미지를 주는 것은 오직 투사체뿐이며, [다중 히트 합산](#다중-무기-히트-데미지-합산) 대상에도 발사대는 포함되지 않는다
- 발사대를 드래그하는 도중에도 계속 연사되며, 매 발사마다 발사대의 최신 위치를 기준으로 조준한다

#### 3. 휴대형 무기

- 파란 세모(`weapon_portable` 텍스처). 설치형과 동일하게 `physics.add.image` + `setInteractive({ draggable: true })`로 자유롭게 드래그 가능하고, 보스와의 겹침 판정·이동 제한도 설치형과 완전히 동일한 로직(`WeaponManager.createDraggableWeapon`)을 공유한다
- 계속 잡고 겹쳐두면(또는 보스를 계속 겹쳐두면) 히트 쿨다운 주기로 반복 데미지가 들어간다

### 무기 뽑기 (Draw)

- 게임 시작 시점에는 필드에 무기가 하나도 없다. 화면 우상단의 "Weapon" 버튼을 눌러야 무기가 생긴다
- 버튼을 누르면 설치형/휴대형/투척형 중 **무작위 타입 하나**를 화면 안 랜덤 위치에 생성한다(`WeaponManager.spawnRandomWeapon`)
- 뽑을 수 있는 횟수 = `INITIAL_FREE_DRAWS`(시작 시 무료 1회) + `floor(score / DRAW_SCORE_STEP)`(점수 100당 1회) − 이미 사용한 횟수. 남은 횟수가 0이면 버튼이 반투명 처리되어 비활성 상태로 보인다
- 시작 시 무료 1회를 주는 이유: 필드에 무기가 하나도 없으면 애초에 보스를 때릴 방법이 없어 점수를 얻을 수 없기 때문

### 다중 무기 히트 데미지 합산

- 보스가 동시에 **여러 무기(설치형/휴대형/투척형 투사체)** 와 겹쳐 있으면, 히트 쿨다운이 풀리는 한 번의 타이밍에 겹친 무기 개수만큼 `rollDamage()`를 각각 독립적으로 굴려서 합산한다 — 예: 무기 2개가 동시에 겹쳐 있으면 데미지는 대략 5~15가 아니라 10~30 범위
- 무기별 굴림에는 각 무기의 `damageMultiplier`([무기 합체](#무기-합체스택) 참고)가 곱해진다
- 히트 쿨다운(`HIT_COOLDOWN`, 300ms) 자체는 무기 개수와 무관하게 여전히 전역으로 한 번만 걸린다 — 무기가 몇 개든 쿨다운 주기당 판정은 1회
- 겹친 무기가 하나도 없는 상태로 `handleHit`이 호출되는 경우(이론상 발생하지 않아야 하지만 안전장치로)는 기본 굴림 1회만 적용

### 무기 합체(스택)

- 같은 타입의 무기 2개를 드래그로 서로 겹치게 놓으면(드래그를 놓는 시점, `dragend`에 판정) 하나로 합쳐진다. **다른 타입끼리는 합쳐지지 않는다** — 설치형은 설치형끼리, 휴대형은 휴대형끼리, 투척형은 발사대끼리만
- 합쳐지면 흡수한 쪽의 `stackLevel`이 상대방의 `stackLevel`만큼 누적되고, `damageMultiplier = STACK_DAMAGE_MULTIPLIER ^ (stackLevel - 1)`(기본 배율 1.5, 합칠 때마다 복리로 증가)로 재계산된다. 흡수된 쪽은 파괴된다
- 합쳐진 무기는 `setTintFill(STACK_TINT_COLOR)`로 순수한 초록색으로 칠해져 한눈에 구분된다
- 투척형이 합쳐지면 발사대의 `damageMultiplier`가 발사 시점에 투사체로 그대로 복사되어(`fireProjectile`), 이후 발사되는 투사체 데미지도 함께 강화된다

### 타격 이펙트

`CombatSystem.handleHit`이 반환하는 `hits`(겹친 무기별 `{ amount, isBoosted, x, y }` 목록), `defeated`, `deathPosition`을 받아 `GameScene.onHit`에서 처리한다.

- **보스 흔들림**(`Boss.shake`): 히트마다 tween으로 짧은 시간 x/y 오프셋(`BOSS_SHAKE_MAGNITUDE`)을 줬다가 원위치. 보스를 드래그 중이면 다음 드래그 좌표가 곧바로 덮어써서 자연히 묻힌다
- **보스 플래시**(`Boss.flash`): `setTintFill`로 짧게(`BOSS_FLASH_DURATION`) 색이 바뀌었다 복귀. 겹친 무기 중 하나라도 [스택된(부스트)](#무기-합체스택) 무기가 있으면 초록색, 아니면 흰색
- **데미지 텍스트 팝업**(`GameScene.spawnDamagePopup`): 겹친 무기마다 그 무기의 위치 근처에 데미지 숫자를 띄우고 위로 떠오르며 페이드아웃(tween + `destroy` on complete). 스택된 무기가 준 데미지는 더 크고 초록색(`BOOSTED_POPUP_COLOR`) 글씨로 구분된다
- **처치 팝업**(`GameScene.spawnDefeatPopup`): HP가 0 이하가 되면 리스폰 전에 사망 위치를 미리 저장해두고, 그 위치에 주황색(`DEFEAT_POPUP_COLOR`) "처치!" 텍스트를 띄운다 — 리스폰된 새 위치가 아니라 실제로 맞은 자리에 뜨는 것이 포인트

### 사운드 (미구현)

- 타격음: 히트 쿨다운이 풀려 실제 데미지가 적용될 때마다 재생
- 보스 처치음: HP 0 도달(리스폰 직전)에 1회 재생

사운드 재생은 `setPaused === true`인 동안 트리거되지 않아야 한다 — 씬이 pause되어 physics overlap 콜백 자체가 멈추므로 자연히 보장된다.

## 점수 & 보스 리스폰

- **점수는 보스에게 입힌 데미지량에 비례해 증가한다**: 히트가 발생할 때마다 `score += damage`로 누적(겹친 무기가 여러 개면 [합산된 데미지](#다중-무기-히트-데미지-합산)만큼). HP가 깎일수록(=데미지를 줄수록) 점수가 오르는 구조. 보스 처치 자체에는 별도 보너스가 없다
- **HP가 0 이하가 되면 즉시 리스폰**: 승리 오버레이나 씬 정지 없이 `Boss.respawn()`을 호출해 `hp = maxHp`로 초기화하고, `BOSS_SPAWN`(고정 좌표)으로 위치를 되돌린다. 무기 위치를 피해 랜덤 스폰하지는 않는다 — 필드에 무기가 여러 개 흩어져 있을 수 있는 지금 구조에서는 "무기에서 떨어진 위치"를 매번 계산하는 대신 고정 스폰 지점 하나로 충분하다고 판단
- 리스폰 시 [처치 팝업](#타격-이펙트)("처치!" 텍스트, 사망 위치에 표시)만 띄우고 게임 진행은 끊기지 않는다 — 세션 전체가 하나의 연속된 플레이로 이어지고, 점수는 리스폰을 거듭해도 계속 누적된다

```js
// 실제 구현은 CombatSystem.handleHit() / GameScene.onHit() — 아래는 흐름을 간략화한 의사코드
function handleHit() {
  if (now() - lastHitTime < HIT_COOLDOWN) return;
  lastHitTime = now();

  // 겹친 무기마다 개별로 굴려서 합산
  const hits = overlappingWeapons.map((weapon) => ({
    amount: rollDamage() * weapon.damageMultiplier,
    isBoosted: weapon.stackLevel > 1,
    x: weapon.x, y: weapon.y,
  }));
  const damage = hits.reduce((sum, h) => sum + h.amount, 0);

  boss.hp -= damage;
  score += damage;

  const defeated = boss.hp <= 0;
  const deathPosition = defeated ? { x: boss.x, y: boss.y } : null;
  if (defeated) respawnBoss(); // BOSS_SPAWN 고정 좌표로 재배치

  onHit(hits, defeated, deathPosition); // HP바/점수 갱신 + 흔들림·플래시·팝업
}
```

## 게임 종료 → onGameEnd

보스가 즉시 리스폰되며 게임이 자동으로 끝나지 않으므로, **플레이어가 화면의 "End" 버튼을 눌러야** 세션이 끝난다 (HP 0 시점이 더 이상 종료 트리거가 아님).

화면 우상단 "End" 버튼(`Hud.createEndButton`)을 누르면 `GameScene.onEndButtonClick`이 실행되어, `Hud.showGameEndOverlay`가 화면을 어둡게 덮으며 "게임 종료" + 최종 점수 + 상태 텍스트(리더보드/최고기록, 처음엔 빈 문자열) + "다시하기" 버튼을 보여준다. 중복 클릭은 `this.isEnded` 플래그로 막는다.

게임플레이 정지는 씬 전체를 멈추는 `this.scene.pause()` 대신, 아래처럼 **필요한 부분만** 멈춘다:
- `this.physics.world.pause()`로 물리 시뮬레이션(투사체 이동, 보스-무기 overlap 판정)만 정지
- `WeaponManager.stopAllFiring()`으로 발사 중이던 투척형 발사대의 자동 연사 타이머를 정리
- 드래그(`drag`/`dragend`)와 무기 뽑기(`onDrawButtonClick`) 핸들러 각각에 `if (this.isEnded) return;` 가드를 넣어서 개별적으로 차단

`this.scene.pause()`나 `game.input.enabled = false`처럼 씬의 입력 처리 자체를 막는 방식을 쓰지 않는 이유는, 그렇게 하면 결과 화면의 "다시하기" 버튼도 같은 씬에 속해 있어서 함께 눌리지 않게 되기 때문이다 (실제로 이 방식으로 처음 구현했다가 다시하기 버튼이 안 눌리는 버그를 겪고 지금 방식으로 바꿨다).

"다시하기" 버튼(`Hud.createRestartButton`)을 누르면 `GameScene.onRestartButtonClick`이 `this.scene.restart()`를 호출해 씬을 완전히 새로 시작한다 — 점수/무기/보스 위치 등 모든 상태가 `create()`가 처음 실행됐을 때와 동일하게 초기화된다.

결과 화면을 띄운 직후 `GameScene.onGameEnd(overlay, score)`가 `vscodeBridge.js`의 `gameContext.mode`를 보고 분기한다 (실제 구현은 `GameScene.onGameEnd` / `Hud.setEndOverlayStatus`):

```js
async function onGameEnd(overlay, score) {
  if (gameContext.mode === 'online' && gameContext.groupId) {
    hud.setEndOverlayStatus(overlay, '리더보드 불러오는 중...');
    try {
      await submitScore(gameContext.groupId, gameContext.userName, score);
      const leaderboard = await fetchLeaderboard(gameContext.groupId);
      hud.setEndOverlayStatus(overlay, formatLeaderboard(leaderboard)); // 상위 5명
    } catch (e) {
      console.warn('서버 연결 실패, 로컬 표시로 전환', e);
      hud.setEndOverlayStatus(overlay, '리더보드를 불러오지 못했습니다 (서버 연결 실패)');
    }
  } else {
    const bestScore = Math.max(gameContext.bestScore, score);
    hud.setEndOverlayStatus(overlay, `내 최고 기록: ${bestScore}`);
    postToExtension({ type: 'saveLocalScore', score });
  }
}
```

- `online`: webview(`frontend/src/api.js`)가 서버로 직접 `POST /api/scores` 호출 후 `GET /api/leaderboard` 조회 ([API 스펙](./API.md)). 요청 실패 시 크래시 없이 콘솔 경고 후 "리더보드를 불러오지 못했습니다" 텍스트로 폴백한다 ([API.md의 fallback](./API.md#클라이언트-측-fallback)).
- `local`: 서버 요청 없이 extension에 `saveLocalScore` 메시지만 보낸다. 화면에 바로 보여주는 "내 최고 기록"은 서버 응답을 기다리지 않고 `init` 때 받은 `gameContext.bestScore`와 이번 판 점수 중 큰 값을 클라이언트에서 계산한 것 — extension은 그 값을 `globalState`에 저장만 하고 별도로 되돌려주지 않는다.
- "종료" 버튼은 [일시정지 오버레이](#일시정지-오버레이)와 별개의 UI로, 포커스 이탈로 인한 자동 정지(`setPaused`)와 혼동되지 않도록 구분해서 표시한다. 종료 후에는 재개 대신 결과 화면(최종 점수 + 리더보드/최고기록)을 보여준다.

## extension ↔ webview 메시지 프로토콜

모든 메시지는 `type` 필드로 구분하고, webview 쪽 단일 `message` 리스너(`frontend/src/vscodeBridge.js`)에서 분기한다. extension 쪽 발신 코드는 `extension/src/extension.ts` 참고.

| 방향 | type | payload | 처리 |
|---|---|---|---|
| ext → webview | `init` | `{ mode, groupId, userName, bestScore }` | `vscodeBridge.gameContext`에 저장, 웹뷰 생성 직후 1회 전달. `bestScore`는 local 모드 결과 화면 비교용(online에서는 무시) |
| ext → webview | `setPaused` | `{ paused: boolean }` | [일시정지](#일시정지-오버레이) 참고 |
| webview → ext | `saveLocalScore` | `{ score }` | local 모드에서 종료 버튼 클릭 시 최고점수 저장 요청 |

```js
// frontend/src/vscodeBridge.js
window.addEventListener('message', (event) => {
  const msg = event.data;
  switch (msg.type) {
    case 'init':
      Object.assign(gameContext, { mode: msg.mode, groupId: msg.groupId, userName: msg.userName, bestScore: msg.bestScore ?? 0 });
      initListeners.forEach((cb) => cb(gameContext));
      break;
    case 'setPaused':
      pauseListeners.forEach((cb) => cb(msg.paused));
      break;
  }
});
```

`setPaused`는 두 소스(탭 전환, 창 포커스 아웃)에서 올 수 있지만 webview 입장에서는 동일하게 처리한다. 실제 처리(씬 pause/resume + 오버레이 토글)는 `frontend/src/main.js`의 `onPause` 콜백. 자세한 발신 측 로직은 [ARCHITECTURE.md 포커스 감지](./ARCHITECTURE.md#포커스-감지--pauseresume) 참고.

## 모드별 UI 분기 (online / local)

`gameContext.mode` 값에 따라 종료 버튼을 누른 뒤 보여줄 화면이 다르다 ([게임 종료 → onGameEnd](#게임-종료--ongameend) 참고).

- `online`: 결과 화면 상태 텍스트에 리더보드 상위 5명. 응답 대기 중엔 "리더보드 불러오는 중...", 실패 시 에러 문구
- `local`: 리더보드 대신 "내 최고 기록: XXX점" 텍스트만 표시

두 모드 모두 `mode` 판별 자체는 webview가 아니라 extension이 git remote 유무로 미리 계산해 `init` 메시지로 내려준 값을 그대로 신뢰한다 ([ARCHITECTURE.md 모드 분기](./ARCHITECTURE.md#모드-분기-local--online)).

## 일시정지 오버레이

`setPaused` 처리와 함께 오버레이를 표시/해제해 사용자가 "왜 드래그가 안 되는지" 헷갈리지 않도록 한다 (`frontend/src/main.js`).

```js
onPause((paused) => {
  const game = window.__game;
  if (paused) {
    game.scene.pause('GameScene');
    game.input.enabled = false;
  } else {
    game.scene.resume('GameScene');
    game.input.enabled = true;
  }
  document.getElementById('pause-overlay').style.display = paused ? 'flex' : 'none';
});
```

- 오버레이(`#pause-overlay`)는 게임 캔버스 위에 겹치는 DOM 엘리먼트로, Phaser 씬과 별개로 순수 HTML/CSS로 관리 (`frontend/index.html`, `extension.ts`의 webview HTML 양쪽에 동일하게 존재)
- `game.input.enabled = false`만으로 드래그/클릭 자체는 막히지만 오버레이가 없으면 사용자가 "안 눌리는 버그"로 오인할 수 있음
- 종료 버튼을 눌러 나오는 결과 화면과는 별개의 오버레이다 — 일시정지는 재개 가능, 종료는 재개 없이 결과만 보여준다

## 리소스/번들링 제약

- 개발은 일반 브라우저에서, 최종 산출물은 `vite build`로 `bundle.js` 하나로 번들링해 webview에 로드
- webview는 `vscode-webview://` 스킴 외 리소스를 신뢰하지 않으므로 정적 에셋(이미지/사운드) 경로는 extension이 `asWebviewUri()`로 변환한 값을 `bundle.js`에 주입하거나, 빌드 시 상대경로로 포함시켜야 함
- CSP `connect-src`에 서버 주소가 없으면 online 모드에서 `fetch`가 조용히 실패하므로, 네트워크 탭에서 CSP 위반 여부를 우선 확인 ([ARCHITECTURE.md 리소스 로딩](./ARCHITECTURE.md#리소스-로딩-webview-제약))
