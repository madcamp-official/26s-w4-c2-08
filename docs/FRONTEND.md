# 프론트엔드 (Phaser) 구현

webview 안에서 실행되는 보스 클리커 게임 **Hit the Agent**의 씬 구성, 무기/전투 시스템, extension과의 메시지 프로토콜을 정리한다. 전체 구조는 [ARCHITECTURE.md](./ARCHITECTURE.md), 서버 API는 [API.md](./API.md), 일정은 [PLAN.md](./PLAN.md) 참고.

> 이 문서는 최초 설계(드래그한 무기가 보스와 부딪히면 데미지) 대비 실제 구현이 크게 달라진 뒤의 현재 상태를 기준으로 작성됐다. 무기를 필드에 두고 드래그로 부딪히는 방식은 더 이상 존재하지 않는다 — 아래 [무기 시스템](#무기-시스템) 참고.

## 구현 현황

| 항목 | 상태 |
|---|---|
| [무기 시스템](#무기-시스템) — 사이드 패널에서 무기를 고르고 필드를 누르고 있는 동안 사용 | ✅ 구현됨 |
| [무기 종류](#무기-종류) 30여 종 (총기/투척/부메랑/폭탄/설치형/근접/말랑이/손 8개 카테고리) | ✅ 구현됨 |
| [전투 파이프라인](#전투-파이프라인) (히트 쿨다운, 다중 겹침 합산, 방패 확률 판정, 저격 스코프) | ✅ 구현됨 |
| [보스 메커닉](#보스-메커닉) (HP/리스폰, 유휴 3단계, 방패, 3종 넉백, CC(빙결/텔레포트), 구토·파이어브레스 반응) | ✅ 구현됨 — 최초 설계에는 없던 기능 |
| [UI](#ui-hud) — WEAPON/AGENT/MAP 사이드 패널, HP바, 종료/재시작(드래그 타격 미니게임) | ✅ 구현됨 |
| [사운드](#사운드) 18개 효과음 | ✅ 구현됨 |
| [유저네임 모달](#유저네임-모달) | ✅ 구현됨 — 최초 설계에는 없던 기능 |
| [게임 종료 → onGameEnd](#게임-종료--ongameend) — online: 유저네임 확보 후 점수 제출 + 리더보드 조회(실패 시 로컬 표시로 폴백), local: `saveLocalScore`로 최고기록 저장 | ✅ 구현됨 |
| extension ↔ webview 연동 | ✅ 구현됨 — `extension/src/extension.ts`, `frontend/src/vscodeBridge.js` |
| Stop 훅 기반 실시간 캐릭터 대사(`agentTaunt`) | ✅ 구현됨 — 기본 off, `hitTheAgent.enableTokenWatchHook` 설정으로 토글. [ARCHITECTURE.md](./ARCHITECTURE.md#stop-훅-토큰-사용량-기반-실시간-캐릭터-대사) 참고 |

콤보 시스템/크리티컬 히트는 원래 설계에서 제외하기로 했었으나, 실제로는 [파이어브레스 콤보](#보스-메커닉)라는 형태로 유사한 개념이 다시 들어왔다(순수 비주얼, 데미지 배율에는 영향 없음).

## 씬 구성

| 씬 | 역할 |
|---|---|
| `BootScene` | 스프라이트/사운드/배경 텍스처 등 에셋을 전부 로드한 뒤 `GameScene`으로 전환. 배경 4종([MAP 탭](#ui-hud))은 여기서 캔버스에 미리 렌더링해 텍스처로 등록해둔다 |
| `GameScene` | 보스/무기/HUD, 입력 처리, 전투·보스 상태 머신, 점수/리스폰, 씬 종료·재시작 처리 |

`GameScene`은 `preload` 없이 `BootScene`이 로드해둔 에셋만 사용한다 (씬 전환 시 재로딩 방지). 렌더러는 VSCode webview(Electron)에서의 GPU 가속 이슈를 피하려고 `Phaser.CANVAS`로 고정한다.

### 화면 크기 대응

게임 내부 좌표계(HP바/보스 스폰 위치 등 `constants.js`의 절대값)는 항상 800×600 기준이고 바뀌지 않는다. 대신 `main.js`의 Phaser `scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }` 설정이 웹뷰 패널 크기에 맞춰 800×600 비율을 유지한 채 캔버스 표시 크기만 확대/축소한다. `#game-container`/`#game-stage`(`frontend/index.html`, `extension.ts`의 webview HTML 둘 다 동일하게)는 뷰포트를 꽉 채우도록 `width/height: 100%`, `overflow: hidden`으로 되어 있어 패널이 좁아져도 스크롤이 생기지 않고, 비율이 안 맞는 방향엔 배경색(`#111`)의 레터박스가 생긴다. 무기/보스 판정 좌표는 이 스케일과 무관하게 800×600 기준 그대로 계산되므로 별도 보정이 필요 없다.

## 무기 시스템

**필드에 무기를 드래그로 놓고 부딪히는 방식이 아니다.** 실제 동작:

1. 화면 우상단 톱니바퀴 버튼으로 [사이드 패널](#ui-hud)을 열고 **WEAPON 탭**에서 무기 아이콘 하나를 고른다 (`Hud` `onWeaponSelect` → `GameScene.selectedWeaponId`, 고르면 패널이 자동으로 닫힌다).
2. UI나 보스 스프라이트가 아닌 필드를 **누르고 있으면** 그 지점에 선택한 무기가 생기고(`WeaponManager.spawnAt`), 포인터를 움직이면 무기가 따라간다(`moveActiveWeapon`, 보스 몸통을 완전히 뚫고 지나가지는 못하게 보정).
3. **손을 떼면**(`releaseActiveWeapon`) 카테고리에 따라 다르게 처리된다 — 사라짐(즉시 destroy), 날아감(부메랑), 그 자리에 무장(폭탄/세탁기).
4. 보스 자체는 항상 별도로 드래그 가능하다(`sprite.setInteractive({ draggable: true })`). 보스를 빠르게 방향을 바꿔가며 흔들면(구토 반응) [보스 메커닉](#보스-메커닉) 참고.
5. 동시에 존재하는 무기는 `activeWeapon` 1개뿐 — 다른 무기를 새로 고르면 이전 것이 자동 해제된다.

### 카테고리별 판정 방식

`WEAPON_CATEGORIES`(`constants.js`) 6종, 카테고리가 겹침 판정/해제 시 동작을 결정한다:

| 카테고리 | 판정 방식 | 손을 떼면 |
|---|---|---|
| `PORTABLE` (방망이류) | 대각선 캡슐(`getPortableAxis` + `geometry.js`의 `capsuleIntersectsRect`), 항상 헤드가 보스를 향하도록 회전 | 즉시 사라짐 |
| `STATIC` (전기충격기류) | 단순 사각 겹침(`rectOverlapsBoss`) | 즉시 사라짐 |
| `THROW` (총기/투척류) | 누르고 있는 동안 `fireInterval`마다 자동 발사(`startFiring`/`fireProjectile`), 투사체가 보스와 원형 겹침 판정 | 발사 중지, 발사대 자체는 사라짐 |
| `BOOMERANG` | 들고 있는 동안 판정 없음 | 놓은 자리에서 날아갔다 곡선으로 되돌아오며 1회 판정(`throwBoomerang`) |
| `BOMB` | 들고 있는 동안 판정 없음 | 그 자리에 무장(`armBomb`), 퓨즈가 다 타면 거리 기준으로 폭발 판정(`detonateBomb`) — 보스가 반경 밖이면 허탕 |
| `MACHINE` (세탁기) | 들고 있는 동안 판정 없음 | 그 자리에 영구 설치(`armWashingMachine`), 클릭으로 문 여닫기, 문이 열린 채 보스를 가까이 끌고 가면 자동으로 빨려들어가 데미지 |

### 무기 종류

무기 패널에 뜨는 순서(총 → 투척 → 부메랑 → 폭탄 → 설치형 → 근접 → 말랑이 → 손/기타) 그대로. 전체 정의는 `frontend/src/config/constants.js`의 `WEAPON_DEFINITIONS`.

**총기 (THROW)**

| id | 특징 |
|---|---|
| `pistol` | 느린 연사·강한 한 방(×1.6), 큰 타격 이펙트 |
| `machine_gun` | 빠른 연사·약한 데미지(×0.5), 발사 시 반동 |
| `shotgun` | 한 번에 펠릿 5발이 30° 부채꼴로 나감(×0.55/발) |
| `sniper` | 가장 느리고 강한 한 방(×3), [저격 스코프](#전투-파이프라인) 활성화, 총구가 항상 보스를 향함 |
| `revolver` | 셋 중 가장 무난한 중간 스펙 |

**투척형 (THROW, 발사대=투사체 성격)**

| id | 특징 |
|---|---|
| `ball` | 야구공, 방망이와 같은 타격음, ×0.9 |
| `dart` | 무작위 색상, 날아가는 방향으로 회전, **맞으면 보스에 박혀 8초간 따라다님**(`stickOnHit`) |
| `megaphone` | 클릭 위치와 무관하게 보스 쪽으로 자동 발사, 소리 파동 이펙트, 무음(타격음 없음), 가장 약함(×0.7) |
| `tomato` | 맞으면 터지는 이펙트, ×0.6 |
| `watermelon` | 맞으면 반으로 쪼개져 날아감 + 씨 파티클, `bigImpact`, ×1.5 |
| `water_balloon` | 물풍선 터짐 + 물방울, 가장 약함(×0.5) |
| `beach_ball` | 통통 튀는 이펙트, ×0.5 |

**부메랑**

| id | 특징 |
|---|---|
| `boomerang` | 놓으면 보스 반대쪽으로 나갔다가 베지어 곡선으로 되돌아와 1회 타격, 비행 중 3바퀴 회전 |

**폭탄**

| id | 특징 |
|---|---|
| `grenade` | 퓨즈 1.8초, 폭발 반경 100px, ×2.2 |
| `dynamite` | 퓨즈 2.6초, 반경 190px, ×3.2, **90px 안의 다른 다이너마이트와 연쇄 폭발**(`collectDynamiteChain`) — 묶인 개수당 반경 +60%/데미지 +90% |

**설치형**

| id | 특징 |
|---|---|
| `washing_machine`(`세탁 by 경원`) | 어디든 설치, 클릭으로 문 개폐, 문 연 채 보스를 100px 안으로 끌고 가면 자동 흡입 → 4초간 500ms마다 데미지(×1.1) 후 자동 배출, 1회 소모품 |

**근접 (PORTABLE/STATIC, 스윙 모션)**

| id | 카테고리 | 특징 |
|---|---|---|
| `bat` | PORTABLE | 캡슐 판정, ×1.3 |
| `wand`(`WAND by 재준`) | PORTABLE | 맞으면 넉백 대신 **보스를 화면 랜덤 위치로 텔레포트**(`teleportsBoss`) |
| `whip` | STATIC | 휘두르는 스윙 애니메이션(`meleeSwing`), ×0.9 |
| `bamboo_cane` | STATIC | 스윙, ×1.15 |
| `frying_pan` | STATIC | 스윙, 근접 중 가장 무거움(×1.4), 전용 타격음(`hit_wall`) |
| `slipper` | STATIC | 스윙, ×0.8 |
| `boxing_glove` | STATIC | 스윙, `bigImpact`, ×1.2 |
| `debugger`(`DEVELOPER`) | STATIC | 스윙, ×1.1, 맞으면 **보스를 2초간 드래그 못 하게 고정**(`freezesBoss`) |

**말랑이 (STATIC, 찌부 모션)**

| id | 특징 |
|---|---|
| `squishy` | 기본 찌부 모션, ×0.6 |
| `rubber_duck` | 찌부 + 꽥 소리(`duck_quack`), ×0.6 |
| `teddy_bear` | 찌부, ×0.6 |
| `cheese_squishy` | 찌부, ×0.6 |

**손/기타**

| id | 특징 |
|---|---|
| `hand`(`GOOD HAND`) | `heals: true` — 데미지 대신 [힐링](#전투-파이프라인) 처리 |
| `bad_hand`(`BAD HAND`) | 평범한 데미지, ×0.9 |
| `lips`(`LIPS by 서윤`) | 찌부 모션, ×0.5, **5연타 시 [구토 반응](#보스-메커닉)** 트리거 |
| `taser` | 총구가 보스를 향함(`rotateToBoss`), 감전 이펙트, ×0.8 |
| `keyboard` | 평범한 STATIC, ×1(기본값) |

## 전투 파이프라인

`CombatSystem.js`가 담당.

- **`handleHit(triggerWeapon)`**: `HIT_COOLDOWN`(300ms) 동안 한 번만 실제 데미지를 적용한다. 이 시점에 겹쳐 있는 **모든 데미지 판정 대상**(`WeaponManager.getOverlappingDamageDealers()` — 들고 있는 무기 + 겹쳐 있는 모든 투사체)을 모아 각각 `rollDamage()`를 굴려 합산한다.
- **`rollDamage(multiplier)`**: `round(random(5, 15) * multiplier)`. `multiplier`는 무기의 `damageMultiplier`가 기본이지만, 다이너마이트 연쇄처럼 그 순간 계산된 `damageMultiplierOverride`가 있으면 그 값이 우선한다.
- **[보스 방패](#보스-메커닉)가 떠 있으면** 히트마다 먼저 차단 확률을 굴린다 — 막히면 데미지 0 + "BLOCKED!" 팝업, 막히지 않으면 방패의 실패 횟수(`shieldBreachCount`)가 누적되고 데미지는 정상 적용된다.
- **`handlePet(weapon)`**: `hand`(`heals: true`) 전용 경로. 별도 쿨다운(`PET_COOLDOWN`, 500ms)으로 `HEAL_MIN~MAX`(20~40)만큼 회복시킨다. 점수/넉백/피격 표정에는 영향 없음.
- **쿨다운 예외(이벤트성 1회 데미지)**: 패널에 부딪힌 넉백(`applyPanelPushDamage`, ×2), [구토 반응](#보스-메커닉)(`applyVomitDamage`, ×1.5), 세탁기 도는 중(`applyWashingMachineDamage`, ×1.1)은 `HIT_COOLDOWN`과 무관하게 그 순간 바로 적용된다.
- **저격 스코프**: `sniper`(`zoomOnAim`)를 들고 있는 동안만, 메인 카메라는 그대로 두고 화면 좌상단에 별도 카메라(`GameScene.createSniperScope`)로 보스 주변을 2.3배 확대해 원형(190px)으로 보여준다. HUD 요소는 이 카메라에서 `ignore()` 처리해 확대되지 않는다.

## 보스 메커닉

`Boss.js` + `GameScene`의 상태 갱신 로직. 최초 설계에는 없던, 이후 추가된 기능들이다.

- **HP/데미지 단계**: `maxHp = 1000`, HP 비율에 따라 3단계(0/1/2)로 표정·텍스처가 슬퍼진다(70% 이하 1단계, 30% 이하 2단계). HP 0 이하가 되면 즉시 `respawn()` — HP/위치(`BOSS_SPAWN`)/CC/방패 상태를 전부 초기화하고 게임은 끊기지 않는다.
- **유휴 3단계** (`GameScene.updateIdleDrift`, 마지막 상호작용 이후 경과 시간 기준):
  1. 0~10초: 평상시 그대로.
  2. 10~30초: **잠듦** — 전용 텍스처 + Zzz 파티클.
  3. 30초 초과: **종료 버튼 쪽으로 걸어감**(28px/s, 좌우로 갸우뚱). 클릭이 들어오면 즉시 1단계로 리셋되고 "걷다 걸린" 대사가 뜬다. 걷는 도중 열린 사이드 패널을 만나면 멈춰서 화난 표정으로 1초간 미는 연출 후 패널이 닫히고 다시 걷는다.
  - 필드를 누르고 있는 동안은 어떤 단계든 유휴 판정이 정지된다.
- **방패**: 최저 체력 단계(2단계)에서만 활성화 후보가 되며, 6~12초마다 무작위로 활성화 여부를 체크한다. 뜨면 히트당 70% 확률로 차단, 차단 실패가 5회 쌓이면 방패가 사라지고 20초 재정비 쿨다운이 붙는다.
- **넉백 — 3가지**:
  - 기본: 맞은 방향 반대로 26px 밀림(70ms).
  - **구석 튕김**: 두 벽에서 동시에 60px 이내(구석)에 있을 때 맞으면, 대각선 반대쪽 구석까지 거리의 35%만큼 베지어 곡선으로 크게 튕겨나간다(회전 + 착지 시 붉은 플래시 + `hit_wall` 사운드 + 카메라 흔들림). 착지 연출은 원래 스쿼시(scaleX/Y) 트윈이었는데, 연타로 `knockback()`이 그 도중에 끼어들면 `killTweensOf`에 트윈이 끊겨 늘어난 스케일이 안 돌아오는 버그가 있어 패널 밀림과 같은 플래시 방식으로 교체했다.
  - **패널 밀림**: 사이드 패널이 열려 보스 위치를 덮고 있으면 왼쪽 벽까지 날아가며(`flyOutToLeftWall`) 보너스 데미지(×2)가 들어간다.
- **CC(상태이상)**: `debugger`에 맞으면 2초간 드래그 이동이 막히는 **빙결**(`freeze`). `wand`에 맞으면 넉백 대신 화면 랜덤 위치로 **텔레포트**(`teleportRandom`).
- **구토 반응** (`showVomit` → `applyVomitDamage`, ×1.5, 쿨다운 무관 1회 데미지): 보스를 드래그하며 800ms 안에 방향을 3회 이상 반전시켜 4초 이상 유지하거나, `lips`로 5연타하면 발동.
- **파이어브레스 콤보**: 3초 안에 8회 이상 히트가 들어가고 데미지 1단계 이상이면 0.5초간 불을 뿜는다(사운드만, 데미지 배율에는 영향 없음). 6초 재사용 대기.
- **표정 우선순위**: 구토 > 파이어브레스 > 피격(X_X, 300ms) > 방패-썩소 > 수면 > 힐링-웃음(700ms) > 평상시 깜빡임(2~5초 간격, 180ms).

## UI (Hud)

- **사이드 패널**: 우상단 톱니바퀴로 여닫는 단일 패널(오른쪽에서 슬라이드). **WEAPON / AGENT / MAP** 세 탭이 전부 같은 2열 아이콘 격자(`createGridTabContent`)를 공유한다.
  - WEAPON: [무기 종류](#무기-종류) 선택.
  - AGENT: 보스 캐릭터 5종(`BOSS_TYPES`: `null_pointer`, `segfault`, `stack_overflow`, `memory_leak`, `merge_conflict`) 중 선택 — HP/위치는 유지한 채 텍스처만 교체.
  - MAP: 배경 4종(`classic`/`diff`/`matrix`/`error`, 기본값 `matrix`) 중 선택, `BootScene`에서 캔버스로 미리 렌더링해둔 텍스처를 즉시 전환.
- **HP바**: 화면 하단 중앙, 점수 텍스트는 그 위.
- **종료 버튼**: 우하단 빨간 필 버튼. 유휴 3단계에서 보스가 걸어가는 목적지이기도 하다.
- **종료 오버레이**: 점수 표시 + 상태 텍스트(리더보드/최고기록 비동기 채움) + **"다시하기" 버튼**. 재시작은 단순 클릭이 아니라 버튼을 드래그해서 위에 떠 있는 작은 타겟(현재 선택된 보스 텍스처)에 부딪혀야 확정되는 타격형 미니게임이다 — 맞히지 못하고 놓으면 버튼이 원위치로 튕겨 돌아간다.

## 유저네임 모달

`frontend/src/ui/usernameModal.js` — VSCode 팝업이 아니라 webview DOM 오버레이. `GameScene.onGameEnd`에서 `mode === 'online' && !gameContext.hasUserName`일 때만 뜬다. 확인/Enter로 확정(입력값 trim, 비었으면 현재 이름 유지), Esc로 취소(현재 이름 유지) — 어느 쪽이든 게임 흐름을 막지 않는다. 확정된 이름은 `saveUserName`으로 extension에 전달되어 `globalState('userName')`에 저장되고, 이후 판부터는 `hasUserName`이 `true`가 되어 다시 뜨지 않는다.

## 사운드

`BootScene.preload()`에서 `frontend/public/audio/*.mp3`를 로드해 Phaser Sound Manager로 재생한다. `audio.pauseOnBlur: false`로 webview가 포커스를 잃어도 소리가 끊기지 않게 한다.

| 키 | 파일 | 트리거 |
|---|---|---|
| `boss_fire_roar` | boss_fire_roar.mp3 | 파이어브레스 콤보 |
| `bat_hit` | hit.mp3 | 방망이/야구공/회초리/슬리퍼/디버거/부메랑 등 기본 근접·투척 타격음, 재시작 버튼 타격 |
| `wand_hit` | wand.mp3 | 마술봉 타격 |
| `dart_throw` | dart_throw.mp3 | 다트 발사 |
| `taser_shock` | taser_shock.mp3 | 전기충격기 타격 |
| `baseball_throw` | baseball.mp3 | 야구공/토마토/수박/물풍선/비치볼/부메랑/수류탄/다이너마이트 발사 |
| `hit_wall` | sound_of_hitting_a_wall.mp3 | 권투 글러브 타격, 구석 튕김·패널 밀림 착지음 |
| `keyboard_smash` | keyboard_smash.mp3 | 키보드 타격 |
| `pistol_impact` | pistol_impact.mp3 | 모든 총기(권총/기관총/산탄총/저격총/리볼버) 타격음 |
| `panel_open` | pannel_open.mp3 | 사이드 패널 여닫기 |
| `exit_button` | exit_button.mp3 | 종료 버튼 클릭 |
| `boss_vomit` | obite.mp3 | 구토 반응 |
| `duck_quack` | duck_quack.mp3 | 러버덕 타격 |
| `washing_machine_spin` | washing.mp3 | 세탁기 회전 중 반복 재생 |
| `good_hand` | good_hand.mp3 | 착한 손 쓰다듬기(힐링, handlePet) |
| `bad_hand_hit` | bad_hand.mp3 | 나쁜 손 타격 |
| `frying_pan_hit` | frying_pan.mp3 | 프라이팬 타격 |
| `whip_hit` | whip.mp3 | 채찍 타격 |

다트, 확성기, 말랑이 계열(러버덕 제외)은 전용 타격음이 없다(무음).

## 게임 종료 → onGameEnd

플레이어가 화면의 "종료" 버튼을 눌러야 세션이 끝난다(HP 0은 리스폰 트리거일 뿐 종료 조건이 아님). 실제 구현은 `GameScene.onGameEnd` / `Hud.setEndOverlayStatus`:

```js
async function onGameEnd(overlay, score) {
  if (gameContext.mode === 'online' && gameContext.groupId) {
    let { userName } = gameContext;
    if (!gameContext.hasUserName) {
      userName = await showUsernameModal(userName);
      gameContext.userName = userName;
      gameContext.hasUserName = true;
      postToExtension({ type: 'saveUserName', userName }); // 다음 판부터 모달 없이 이 이름을 쓰도록 저장
    }
    hud.setEndOverlayStatus(overlay, '리더보드 불러오는 중...');
    try {
      await submitScore(gameContext.groupId, userName, score);
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

- `online`: 이름을 모르면([유저네임 모달](#유저네임-모달) 참고) 먼저 확보한 뒤 `frontend/src/api.js`로 서버에 직접 `POST /api/scores` → `GET /api/leaderboard` 조회 ([API 스펙](./API.md)). 실패해도 크래시 없이 "리더보드를 불러오지 못했습니다"로 폴백 ([fallback](./API.md#클라이언트-측-fallback)).
- `local`: 서버 요청 없이 `saveLocalScore`만 전송. 화면에 보여주는 "내 최고 기록"은 `init` 때 받은 `bestScore`와 이번 점수 중 큰 값을 클라이언트에서 계산한 것 — extension은 저장만 하고 값을 되돌려주지 않는다.

## extension ↔ webview 메시지 프로토콜

모든 메시지는 `type` 필드로 구분하고, webview 쪽 단일 `message` 리스너(`frontend/src/vscodeBridge.js`)에서 분기한다. extension 쪽 발신/수신 코드는 `extension/src/extension.ts` 참고.

| 방향 | type | payload | 처리 |
|---|---|---|---|
| ext → webview | `init` | `{ mode, groupId, userName, hasUserName, bestScore }` | `vscodeBridge.gameContext`에 저장, 웹뷰 생성 직후 1회 전달. `hasUserName`이 `false`면 online 모드 종료 시 [유저네임 모달](#유저네임-모달)을 띄운다. `bestScore`는 local 모드 결과 화면 비교용(online에서는 무시) |
| ext → webview | `agentTaunt` | `{ tokenCount }` | Stop 훅이 토큰 임계치를 넘겨 발동했을 때 전달 — 패널이 열려 있으면 실시간으로, 닫혀 있었으면 다음 게임 시작 시 전달, 보스 대사 팝업 ([ARCHITECTURE.md](./ARCHITECTURE.md#stop-훅-토큰-사용량-기반-실시간-캐릭터-대사) 참고) |
| webview → ext | `saveLocalScore` | `{ score }` | local 모드에서 종료 버튼 클릭 시 최고점수 저장 요청 |
| webview → ext | `saveUserName` | `{ userName }` | 유저네임 모달에서 이름 확정 시 전송, extension이 `globalState('userName')`에 저장해 다음 판부터 `hasUserName: true`가 되게 함 |

```js
// frontend/src/vscodeBridge.js
window.addEventListener('message', (event) => {
  const msg = event.data;
  switch (msg.type) {
    case 'init':
      Object.assign(gameContext, {
        mode: msg.mode, groupId: msg.groupId, userName: msg.userName,
        hasUserName: msg.hasUserName, bestScore: msg.bestScore ?? 0,
      });
      initListeners.forEach((cb) => cb(gameContext));
      break;
    case 'agentTaunt':
      agentTauntListeners.forEach((cb) => cb(msg.tokenCount));
      break;
  }
});
```

## 모드별 UI 분기 (online / local)

`gameContext.mode` 값에 따라 종료 버튼을 누른 뒤 보여줄 화면이 다르다 ([게임 종료 → onGameEnd](#게임-종료--ongameend) 참고).

- `online`: 이름이 없으면 먼저 [유저네임 모달](#유저네임-모달)이 뜬 뒤, 결과 화면 상태 텍스트에 리더보드 상위 5명. 응답 대기 중엔 "리더보드 불러오는 중...", 실패 시 에러 문구
- `local`: 리더보드/모달 없이 "내 최고 기록: XXX점" 텍스트만 표시

두 모드 모두 `mode` 판별 자체는 webview가 아니라 extension이 git remote 유무로 미리 계산해 `init` 메시지로 내려준 값을 그대로 신뢰한다 ([ARCHITECTURE.md 모드 분기](./ARCHITECTURE.md#모드-분기-local--online)).

## 리소스/번들링 제약

- 개발은 일반 브라우저에서, 최종 산출물은 `vite build`로 `bundle.js` 하나로 번들링해 webview에 로드
- webview는 `vscode-webview://` 스킴 외 리소스를 신뢰하지 않으므로 정적 에셋(이미지/사운드) 경로는 extension이 `asWebviewUri()`로 변환한 값을 `bundle.js`에 주입하거나, 빌드 시 상대경로로 포함시켜야 함
- CSP `connect-src`에 서버 주소가 없으면 online 모드에서 `fetch`가 조용히 실패하므로, 네트워크 탭에서 CSP 위반 여부를 우선 확인 ([ARCHITECTURE.md 리소스 로딩](./ARCHITECTURE.md#리소스-로딩-webview-제약))
