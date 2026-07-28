import Phaser from 'phaser';
import {
  DAMAGE_POPUP_DURATION,
  DEFEAT_POPUP_DURATION,
  DEFEAT_POPUP_COLOR,
  BOSS_PANEL_PUSH_POPUP_COLOR,
  VOMIT_POPUP_COLOR,
  WAND_TELEPORT_SPARK_COLOR,
  AGENT_TAUNT_POPUP_DURATION,
  AGENT_TAUNT_TYPING_SPEED,
  AGENT_TAUNT_INTRO_DELAY,
  AGENT_TAUNT_LINES_INTRO,
  AGENT_TAUNT_LINES_IDLE_CAUGHT,
  AGENT_TAUNT_IDLE_CAUGHT_COOLDOWN_MS,
  SHIELD_TAUNT_LINES,
  getAgentTauntLines,
  UI_FONT_FAMILY,
  BACKGROUND_STYLE,
  BOSS_TYPES,
  HIT_SPARK_DURATION,
  HIT_SPARK_COLOR,
  WEAPON_IDS,
  WEAPON_DEFINITIONS,
  SNIPER_SCOPE_DIAMETER,
  SNIPER_SCOPE_ZOOM,
  SNIPER_SCOPE_MARGIN,
  BOSS_IDLE_TIMEOUT_MS,
  BOSS_IDLE_ZZZ_INTERVAL,
  BOSS_IDLE_DRIFT_SPEED,
  BOSS_IDLE_WALK_TILT_DEG,
  BOSS_IDLE_WALK_CYCLE_MS,
  BOSS_IDLE_ARRIVAL_DISTANCE,
  BOSS_IDLE_PANEL_PUSH_HOLD_MS,
  BOSS_IDLE_PANEL_APPROACH_MARGIN,
} from '../config/constants.js';
import Boss from '../entities/Boss.js';
import WeaponManager from '../entities/WeaponManager.js';
import CombatSystem from '../systems/CombatSystem.js';
import Hud from '../ui/Hud.js';
import { showUsernameModal } from '../ui/usernameModal.js';
import { gameContext, postToExtension, onAgentTaunt } from '../vscodeBridge.js';
import { submitScore, fetchLeaderboard } from '../api.js';

// 리더보드는 결과 화면 한 화면에 다 넣기엔 길어질 수 있어 상위 5명만 텍스트로 보여준다.
function formatLeaderboard(rows) {
  if (!rows || rows.length === 0) return '리더보드에 아직 기록이 없습니다';
  return rows.slice(0, 5).map((row, i) => `${i + 1}. ${row.userName} - ${row.score}`).join('\n');
}

// 구현 현황은 docs/FRONTEND.md#구현-현황 참고. 콤보 시스템/크리티컬 히트는 구현하지 않기로 결정, 사운드는 아직 미구현.
export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    this.isEnded = false;
    this.selectedWeaponId = null;
    // 방치(idle) 드리프트 판단 기준 시각 — 상호작용이 있을 때마다 markInteraction()으로 갱신된다.
    this.lastInteractionTime = this.time.now;
    // 나가기 버튼으로 걷다가 패널을 만나 멈춰서 미는 중일 때의 대기 타이머 — startPanelPush/cancelPanelPush 참고.
    this.panelPushEvent = null;
    // updateIdleDrift가 이번 프레임에 실제로 걷고 있는 중인지 — pointerdown 핸들러가 클릭 순간
    // "걷다가 들켰는지" 판단하는 데 쓴다(walking 중 클릭 → AGENT_TAUNT_LINES_IDLE_CAUGHT 팝업).
    this.isIdleDrifting = false;
    // "걷다가 들켰다" 대사가 마지막으로 뜬 시각 — 거의 항상 걷는 중인 상태라 매 클릭마다 뜨지
    // 않도록 AGENT_TAUNT_IDLE_CAUGHT_COOLDOWN_MS 안에는 다시 안 띄운다.
    this.lastIdleCaughtTauntTime = -Infinity;
    // 걷기 전 잠깐 자는 척(Boss.isSleeping)하는 동안 Zzz 텍스트를 반복 생성하는 타이머 + 입가 하품 방울.
    this.sleepZzzEvent = null;
    this.sleepBubble = null;
    this.sleepBubbleTween = null;
    // 보스를 드래그 중인 포인터 — 구토 트리거 시 releaseBossDrag()가 이 포인터의 드래그를 강제로 끝낸다.
    this.activeDragPointer = null;

    this.currentBackgroundStyle = BACKGROUND_STYLE;
    this.backgroundImage = this.add.image(0, 0, `battleBackground_${this.currentBackgroundStyle}`).setOrigin(0, 0);

    this.currentBossType = BOSS_TYPES[0].id;
    this.boss = new Boss(this, this.currentBossType);
    this.hud = new Hud(this, {
      onWeaponSelect: (weaponId) => this.onWeaponSelect(weaponId),
      onEndButtonClick: () => this.onEndButtonClick(),
      currentBackgroundStyle: this.currentBackgroundStyle,
      onBackgroundSelect: (style) => this.onBackgroundSelect(style),
      currentBossType: this.currentBossType,
      onBossSelect: (bossTypeId) => this.onBossSelect(bossTypeId),
    });
    this.combat = new CombatSystem(this, this.boss, (hits, defeated, deathPosition) => this.onHit(hits, defeated, deathPosition));
    this.combat.onPet = (amount, point) => this.onPet(amount, point);
    this.combat.onBlocked = (point) => this.onBlocked(point);
    // 방패가 뜨는 순간(Boss.activateShield) 썩소 표정과 같이 "막기!" 계열 대사를 띄운다.
    this.boss.onShieldActivate = () => this.spawnTauntPopup(Phaser.Utils.Array.GetRandom(SHIELD_TAUNT_LINES));
    // 흔들려서 구토가 트리거되면(Boss.showVomit) 데미지/점수/팝업을 여기서 처리한다.
    this.boss.onVomit = (x, y) => this.onVomit(x, y);
    // heals 무기(착한 손)는 데미지가 아니라 힐링이라 combat.handleHit이 아니라 handlePet으로 따로 보낸다.
    // weaponId를 하드코딩하지 않고 WEAPON_DEFINITIONS[id].heals로 판단해서 힐링 무기가 늘어나도 여기 안 고쳐도 되게 한다.
    this.weaponManager = new WeaponManager(this, this.boss, (weapon) => {
      if (WEAPON_DEFINITIONS[weapon.weaponId]?.heals) this.combat.handlePet(weapon);
      else this.combat.handleHit(weapon);
    });
    this.combat.weaponManager = this.weaponManager;
    // 폭탄류(수류탄/다이너마이트)는 손을 뗀 뒤 한참 지나 혼자 터진다 — 그 순간 무기별 폭발 이펙트를
    // 고르고, 실제로 보스를 맞혔을 때만 카메라를 흔든다(onOverlap 경로와 별개 훅).
    this.weaponManager.onBombDetonate = (weaponId, x, y, hitBoss, chainCount) => this.onBombDetonate(weaponId, x, y, hitBoss, chainCount);

    this.sniperScope = this.createSniperScope();

    // 보스를 잡을 때마다(dragstart) 흔들기 누적치를 새로 시작한다 — 이전에 잡았을 때의 흔들림이 이어지지 않게.
    this.input.on('dragstart', (pointer) => {
      this.activeDragPointer = pointer;
      this.boss.resetShakeTracking();
    });
    this.input.on('dragend', () => {
      this.activeDragPointer = null;
    });

    // 보스는 무기를 고른 뒤에도 항상 드래그로 옮길 수 있다 — 보스 위를 직접 누르면 드래그가 우선.
    // 계속 방향을 바꾸며(=흔들며) 잡고 있으면 Boss.registerDragMovement가 누적 시간을 재서 구토 연출을 띄운다.
    this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
      this.markInteraction();
      if (this.isEnded) return;
      if (this.boss.isFrozen) return; // 디버거(브레이크포인트)에 맞은 동안은 드래그로 못 옮긴다.
      const prevX = this.boss.sprite.x;
      const prevY = this.boss.sprite.y;
      const x = Phaser.Math.Clamp(dragX, 40, this.scale.width - 40);
      const y = Phaser.Math.Clamp(dragY, 40, this.scale.height - 40);
      this.boss.setPosition(x, y);
      this.boss.registerDragMovement(x - prevX, y - prevY);
    });

    // 무기를 고른 뒤 필드(UI도, 보스 위도 아님)를 누르고 있는 동안에만 그 자리에 무기가 나타나 보스를 때리고,
    // 손을 떼면 사라진다. 보스 위를 직접 누르면 위 'drag' 리스너가 대신 처리하므로 여기서는 건너뛴다.
    this.input.on('pointerdown', (pointer, currentlyOver) => {
      // 웹뷰가 캔버스(800x600)보다 넓으면 그 바깥 여백도 같은 iframe 문서라 Phaser의 MouseManager가
      // window 레벨로 mousedown을 그대로 잡아버린다(target !== canvas). 그 결과 게임 화면 밖을
      // 클릭해도 이 'pointerdown'이 발생해 방치 드리프트가 풀려버리므로, 실제 캔버스 범위 안의
      // 클릭만 상호작용으로 인정한다.
      if (!this.isPointerWithinGameBounds(pointer)) return;
      // markInteraction()이 드리프트를 즉시 멈추므로, "걷던 중이었는지"는 그 전에 먼저 봐둬야 한다.
      const wasIdleDrifting = this.isIdleDrifting;
      this.markInteraction();
      if (this.isEnded) return;
      // 나가기 버튼 쪽으로 몰래 걸어가던 도중 클릭에 걸리면 들킨 반응 대사를 띄운다 — 거의 항상
      // 걷는 중인 상태라 쿨다운 안에는 다시 띄우지 않는다.
      if (wasIdleDrifting && this.time.now - this.lastIdleCaughtTauntTime >= AGENT_TAUNT_IDLE_CAUGHT_COOLDOWN_MS) {
        this.lastIdleCaughtTauntTime = this.time.now;
        this.spawnTauntPopup(Phaser.Utils.Array.GetRandom(AGENT_TAUNT_LINES_IDLE_CAUGHT));
      }
      // 패널이 열려 있을 때 패널 바깥(게임 화면)을 클릭하면 패널을 닫고, 그 클릭 자체도
      // 같은 핸들러에서 이어서 처리해 무기 공격/조준이 바로 적용되게 한다(닫기용 클릭을 따로 낭비하지 않음).
      if (this.hud.panelOpen && !this.hud.isPointerOnUI(currentlyOver)) {
        this.hud.togglePanel(false);
      }
      if (!this.selectedWeaponId) return;
      if (this.hud.isPointerOnUI(currentlyOver)) return;
      if (Phaser.Geom.Rectangle.Contains(this.boss.sprite.getBounds(), pointer.x, pointer.y)) return;

      const x = Phaser.Math.Clamp(pointer.x, 40, this.scale.width - 40);
      const y = Phaser.Math.Clamp(pointer.y, 40, this.scale.height - 40);
      this.weaponManager.spawnAt(this.selectedWeaponId, x, y);
      // 저격총(zoomOnAim)을 들고 있는 동안만 왼쪽 위에 확대 스코프 뷰를 띄운다.
      if (WEAPON_DEFINITIONS[this.selectedWeaponId]?.zoomOnAim) this.setSniperScopeVisible(true);
    });

    this.input.on('pointermove', (pointer, currentlyOver) => {
      if (this.isEnded) return;
      if (!pointer.isDown) return;
      // 필드를 누른 채로 패널 위까지 드래그해 들어가는 경우 — pointerdown 시점엔 필드였으므로
      // 그때의 UI 체크만으론 못 걸러진다. 여기서도 걸러주지 않으면 투척형은 연사가 계속되고
      // 근접 무기는 마지막으로 겹쳤던 자리에 그대로 남아 계속 데미지가 들어간다.
      // 패널 위로 올라가는 순간 손을 뗀 것처럼 무기를 치워 공격을 멈춘다.
      if (this.hud.isPointerOnUI(currentlyOver)) {
        this.stopActiveWeapon();
        return;
      }
      const x = Phaser.Math.Clamp(pointer.x, 40, this.scale.width - 40);
      const y = Phaser.Math.Clamp(pointer.y, 40, this.scale.height - 40);
      this.weaponManager.moveActiveWeapon(x, y);
    });

    this.input.on('pointerup', () => {
      this.stopActiveWeapon();
    });

    // webview가 다른 에디터 탭 등으로 포커스를 잃었다 돌아오면, 실제로는 마우스 버튼이 떼어졌는데도
    // Phaser의 activePointer.isDown이 stale하게 true로 남는 경우가 있다(mouseup이 webview 밖에서
    // 일어나 못 받음). 그 상태로 재포커스되면 update()의 "누르는 중이면 매 프레임 상호작용"
    // 체크(isDown 검사)가 실제 클릭 없이도 markInteraction()을 불러 방치 드리프트가 풀려버린다.
    // blur 시점에 포인터/드래그/무기 상태를 강제로 정리해, 방치 모드는 오직 재클릭으로만 풀리게 한다.
    this.handleWindowBlur = () => {
      this.input.activePointer.isDown = false;
      this.releaseBossDrag();
      this.stopActiveWeapon();
    };
    window.addEventListener('blur', this.handleWindowBlur);
    this.events.once('shutdown', () => {
      window.removeEventListener('blur', this.handleWindowBlur);
    });

    // SessionEnd 훅(토큰 임계치 초과, extension/scripts/session-end-hook.js)이 발동했을 때 게임 시작 직후 1회 전달됨
    onAgentTaunt((tokenCount) => this.spawnTauntPopup(Phaser.Utils.Array.GetRandom(getAgentTauntLines(tokenCount))));

    // 실제 토큰 임계치 훅과 별개로, 게임을 켤 때마다 "이미 이 세션을 보고 있다"는 인상을 주는 1회성 인트로 대사.
    // 씬이 뜨자마자 바로 뜨면 어색해서 살짝 지연 후 띄운다.
    this.time.delayedCall(AGENT_TAUNT_INTRO_DELAY, () => {
      this.spawnTauntPopup(Phaser.Utils.Array.GetRandom(AGENT_TAUNT_LINES_INTRO));
    });
  }

  update(time, delta) {
    this.weaponManager.updateProjectiles();
    this.weaponManager.updateStuckProjectiles();
    // 무기를 든 채 가만히 누르고 있거나(투척형 자동 연사), 커서를 멈춘 채 계속 때리는 중에는
    // pointerdown 이후 pointermove가 안 오거나 와도 markInteraction()을 안 불러서 idle 타이머가
    // 갱신되지 않았다 — 전투 중인데도 2초 뒤 보스가 나가기 버튼 쪽으로 걸어가버리는 원인.
    // 포인터가 눌려있는 동안은 매 프레임 상호작용 중으로 취급해 이를 막는다. 단, 캔버스 밖에서
    // 눌린 채 시작된 경우(게임 화면 바깥 클릭)까지 상호작용으로 치면 안 되므로 범위도 같이 본다.
    if (this.input.activePointer.isDown && this.isPointerWithinGameBounds(this.input.activePointer)) {
      this.markInteraction();
    }
    // updateIdleDrift가 이번 프레임에 패널을 만났는지(isPushingPanel) 먼저 정해야, 뒤이은
    // checkBossAgainstPanel이 같은 프레임에 그 상태를 보고 flyOutToLeftWall을 건너뛸 수 있다.
    this.updateIdleDrift(time, delta);
    this.checkBossAgainstPanel();
    // 방패가 떠 있는 동안 지금 들고 있는 무기(=공격이 들어오는 쪽) 방향을 막도록 위치 갱신.
    // 무기를 안 들고 있는 프레임엔 aimPoint가 없어 Boss 내부에서 마지막 방향을 그대로 유지한다.
    // weapon.x/y 자체가 아니라 실제 타격 지점(getHitPoint)을 써야 한다 — 방망이(PORTABLE)는 회전
    // 중심(weapon.x/y)과 실제로 맞닿는 배럴 끝이 멀리 떨어져 있어서, 그냥 x/y를 쓰면 방패가 엉뚱한
    // 방향을 보고 있어 막는 것처럼 안 보이는 문제가 있었다.
    const activeWeapon = this.weaponManager.activeWeapon;
    this.boss.updateShieldPosition(activeWeapon ? this.weaponManager.getHitPoint(activeWeapon) : null);
    // 보스가 넉백/패널 충돌 등으로 계속 움직이는 동안에도 스코프가 계속 보스를 따라가게 매 프레임 갱신.
    if (this.sniperScope.camera.visible) {
      this.sniperScope.camera.centerOn(this.boss.bodyCenterX, this.boss.bodyCenterY);
    }
    // 자는 동안 입가 하품 방울도 보스 위치를 따라가게 갱신 (보통은 안 움직이지만 방어적으로).
    if (this.sleepBubble) this.sleepBubble.setPosition(this.boss.bodyCenterX, this.boss.sprite.y);
  }

  // pointer 좌표가 실제 캔버스(게임 화면) 범위 안인지. Phaser의 transformPointer는 canvas 바깥
  // 클릭(webview 여백 등)도 canvas 기준 상대좌표로 변환해버려서, 값 자체는 나오지만 범위를 벗어난다.
  isPointerWithinGameBounds(pointer) {
    return pointer.x >= 0 && pointer.x < this.scale.width && pointer.y >= 0 && pointer.y < this.scale.height;
  }

  // 화면 클릭(pointerdown)/드래그가 있을 때마다 호출해 idle 타이머를 리셋한다.
  // 흔들리는 도중에 상호작용이 들어와 드리프트가 멈추면, 기울어진 채로 멈춰 보이지 않도록 각도도 원위치로 되돌린다.
  markInteraction() {
    this.lastInteractionTime = this.time.now;
    this.boss.sprite.setAngle(0);
    this.cancelPanelPush(); // 미는 도중 상호작용이 들어오면 어정쩡하게 화난 표정으로 멈춰 있지 않게 취소한다.
  }

  // 보스는 "돌아다니거나(종료 버튼 쪽으로 끌려감) 자거나(Boss.isSleeping)" 둘 중 하나의 단순한
  // 이진 상태만 가진다 — 실제로 포인터를 누르고 있는 동안(조작 중)만 예외로 그 자리에 멈춘다.
  // 손을 뗀 뒤 BOSS_IDLE_TIMEOUT_MS(1분) 동안 클릭이 한 번도 없으면 잠들고, 그 뒤로는 고정
  // 지속시간 없이 클릭이 들어올 때까지 계속 잔다 — 클릭 즉시 깨서 다시 돌아다니기 시작한다.
  // 넉백/패널 충돌 트윈이 진행 중일 때 끼어들면 그 트윈과 위치를 두고 다투게 되므로 그동안은 쉰다.
  // 밋밋하게 미끄러지면 부자연스러워서, 이동 방향과 무관하게 좌우로 갸우뚱거리는 걸음 흔들림을 각도에 더한다.
  updateIdleDrift(time, delta) {
    // 아래에서 실제로 걷는 프레임에만 true로 다시 켠다 — 이 함수를 벗어나는 모든 경로(조작 중,
    // 얼음/패널 충돌/미는 중, 자는 중, 목표 도착)는 "걷는 중"이 아니므로 기본값 false로 시작한다.
    this.isIdleDrifting = false;
    if (this.isEnded) { this.exitSleep(); return; }
    if (this.boss.isFrozen) { this.exitSleep(); return; }
    if (this.boss.isPanelBounceActive) { this.exitSleep(); return; }
    // 실제로 포인터를 누르고 있는 동안엔 자지도 돌아다니지도 않는다 — 안 그러면 플레이어가 무기를
    // 들고 있는 자리로 매 프레임 setPosition하는 것과 자동 이동이 서로 위치를 두고 다투게 된다.
    if (this.input.activePointer.isDown) { this.exitSleep(); return; }

    const idleFor = time - this.lastInteractionTime;
    if (idleFor >= BOSS_IDLE_TIMEOUT_MS) {
      this.enterSleep();
      return;
    }
    this.exitSleep();

    // 패널을 미는 중(화난 표정 유지, startPanelPush의 대기 타이머가 도는 동안)에는 제자리에 멈춰
    // 있는다 — 타이머가 끝나면 panelPushEvent가 패널을 닫고, 다음 프레임부터 이 함수가 이어서 걷는다.
    if (this.panelPushEvent) return;
    this.isIdleDrifting = true;

    // collideWorldBounds가 켜져 있어서(생성자) 보스 중심은 화면 가장자리에서 최소 half폭/높이만큼은
    // 못 벗어난다. 종료 버튼은 화면 오른쪽 아래 모서리에 바짝 붙어 있어 그 범위 밖(도달 불가능한 좌표)이라,
    // 목표를 원래 위치 그대로 두면 보스가 영원히 몇 픽셀 못 미친 채 멈추지 못하고 계속 뒤뚱거린다.
    // knockback()과 같은 clamp 공식으로 목표를 "실제로 도달 가능한" 좌표로 당겨와야 arrival 판정이 맞는다.
    const halfW = this.boss.displayWidth / 2;
    const halfH = this.boss.displayHeight / 2;

    // 패널 경계는 실제 경계보다 BOSS_IDLE_PANEL_APPROACH_MARGIN만큼 당겨서(더 넓게) 판정한다.
    // "이미 그 자리에 서 있는" 경우까지 여기서 바로 잡아낸다 — 목표(종료 버튼)에 도착해서 쉬고 있던
    // 도중에 패널이 열리는 경우, 아래 도착(arrival) 분기가 그보다 먼저 return해버려서 패널 판정
    // 자체가 한 번도 안 도는 구멍이 있었다(만나자마자 바로 반대쪽 벽으로 날아가던 원인 중 하나).
    // 여기서 도착 여부와 무관하게 먼저 확인해 그 구멍을 막는다.
    const panelBoundaryX = this.hud.getOpenPanelBoundaryX();
    const approachBoundaryX = panelBoundaryX == null ? null : panelBoundaryX - BOSS_IDLE_PANEL_APPROACH_MARGIN;
    if (approachBoundaryX != null && this.boss.sprite.x + halfW > approachBoundaryX) {
      this.boss.sprite.setAngle(0);
      this.startPanelPush();
      return;
    }

    const target = {
      x: Phaser.Math.Clamp(this.hud.endButtonPosition.x, halfW, this.scale.width - halfW),
      y: Phaser.Math.Clamp(this.hud.endButtonPosition.y, halfH, this.scale.height - halfH),
    };
    const dx = target.x - this.boss.sprite.x;
    const dy = target.y - this.boss.sprite.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= BOSS_IDLE_ARRIVAL_DISTANCE) {
      this.boss.sprite.setAngle(0);
      this.isIdleDrifting = false;
      return;
    }

    // 이번 프레임에 이동한 "뒤"의 위치로도 한 번 더 내다본다 — 이동 전(현재) 위치만 보고 판단하면,
    // 경계를 넘기는 바로 그 프레임엔 아직 isPushingPanel이 안 켜진 채로 몸통이 이미 경계를 넘어버려서
    // checkBossAgainstPanel이 같은 프레임에 먼저 flyOutToLeftWall로 튕겨내는 경합이 생긴다.
    // 넘는 프레임엔 그만큼만 이동해 경계에 딱 맞춰 세우고 그 자리에서 바로 미는 연출을 시작한다.
    const step = Math.min(distance, (BOSS_IDLE_DRIFT_SPEED * delta) / 1000);
    const angle = Math.atan2(dy, dx);
    const nextRight = this.boss.sprite.x + Math.cos(angle) * step + halfW;
    if (approachBoundaryX != null && nextRight > approachBoundaryX) {
      this.boss.sprite.x = approachBoundaryX - halfW;
      this.boss.sprite.setAngle(0);
      this.startPanelPush();
      return;
    }

    this.boss.sprite.x += Math.cos(angle) * step;
    this.boss.sprite.y += Math.sin(angle) * step;

    const wobble = Math.sin((time / BOSS_IDLE_WALK_CYCLE_MS) * Math.PI * 2) * BOSS_IDLE_WALK_TILT_DEG;
    this.boss.sprite.setAngle(wobble);
  }

  // 걷다가 열린 패널에 부딪히면 멈춰서 화난 표정(2단계 텍스처)을 BOSS_IDLE_PANEL_PUSH_HOLD_MS 동안
  // 띄워 미는 연출을 보여준 뒤, 패널을 닫고(togglePanel(false)) 표정을 되돌린다 — 그러면 다음 프레임부터
  // updateIdleDrift가 막힘 없이 나머지 구간을 걸어간다. 이미 미는 중이면 타이머를 또 잡지 않는다.
  startPanelPush() {
    if (this.panelPushEvent) return;
    this.boss.startPanelPush();
    this.panelPushEvent = this.time.delayedCall(BOSS_IDLE_PANEL_PUSH_HOLD_MS, () => {
      this.panelPushEvent = null;
      this.boss.endPanelPush();
      this.hud.togglePanel(false);
    });
  }

  // 미는 도중 플레이어가 상호작용하면(markInteraction) 대기 중이던 타이머와 화난 표정을 취소해서
  // 패널은 열어둔 채 어정쩡한 표정으로 멈춰 있지 않게 한다.
  cancelPanelPush() {
    if (!this.panelPushEvent) return;
    this.panelPushEvent.remove();
    this.panelPushEvent = null;
    this.boss.endPanelPush();
  }

  // 걷기 전 잠깐 자는 척하는 단계(updateIdleDrift) 진입 — 표정은 Boss.startSleeping이 맡고,
  // 여기서는 Zzz 텍스트 반복 타이머 + 입가 하품 방울을 띄운다. 이미 자는 중이면 아무것도 다시 안 만든다.
  enterSleep() {
    if (this.boss.isSleeping) return;
    this.boss.startSleeping();
    if (!this.boss.isSleeping) return; // 더 급한 반응(피격/방패 등)이 떠 있어 잠들지 못한 경우
    this.spawnZzzText();
    this.sleepZzzEvent = this.time.addEvent({ delay: BOSS_IDLE_ZZZ_INTERVAL, loop: true, callback: () => this.spawnZzzText() });

    // 얼굴 폭의 대략 절반 지름이 되도록 반지름을 얼굴 폭에 비례해서 잡는다 — 고정 픽셀 값은
    // 보스 타입/크기가 달라져도 항상 같은 크기라 어색해서, boss.bodyWidth 기준으로 계산한다.
    const bubbleRadius = this.boss.bodyWidth * 0.25;
    this.sleepBubble = this.add.circle(this.boss.bodyCenterX, this.boss.sprite.y, bubbleRadius, 0xd8ecff, 0.55)
      .setStrokeStyle(Math.max(1.5, bubbleRadius * 0.06), 0xffffff, 0.8)
      .setDepth(1500)
      .setScale(0.2);
    this.sleepBubbleTween = this.tweens.add({
      targets: this.sleepBubble,
      scale: 1,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  // 상호작용이 돌아오거나 실제로 걷기 시작하면 호출해 잠자는 연출을 전부 정리한다.
  exitSleep() {
    if (!this.boss.isSleeping) return;
    this.boss.endSleeping();
    this.sleepZzzEvent?.remove();
    this.sleepZzzEvent = null;
    this.sleepBubbleTween?.remove();
    this.sleepBubbleTween = null;
    this.sleepBubble?.destroy();
    this.sleepBubble = null;
  }

  // 자는 동안 위로 둥실 떠오르며 사라지는 "Z" 하나. spawnHeartBurst와 같은 방식.
  spawnZzzText() {
    const x = this.boss.bodyCenterX + this.boss.bodyWidth * 0.3;
    const y = this.boss.sprite.y - this.boss.displayHeight / 2;
    const text = this.add.text(x, y, 'Z', {
      fontSize: `${Phaser.Math.Between(14, 20)}px`,
      color: '#ffffff',
      fontStyle: 'bold',
      fontFamily: UI_FONT_FAMILY,
    }).setOrigin(0.5).setDepth(1500);

    this.tweens.add({
      targets: text,
      x: text.x + 18,
      y: text.y - 34,
      alpha: 0,
      duration: 1400,
      ease: 'Sine.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  // 들고 있던 무기를 손을 뗀 것처럼 치운다 — releaseActiveWeapon()이 activeWeapon을 지우기 전에
  // 무기 종류를 먼저 봐둬야 저격총이었는지 판단해서 스코프를 꺼줄 수 있다.
  // pointerup과, 패널 위로 드래그해 들어가 공격을 강제로 멈춰야 하는 pointermove 양쪽에서 같이 쓴다.
  stopActiveWeapon() {
    const releasedWeaponId = this.weaponManager.activeWeapon?.weaponId;
    this.weaponManager.releaseActiveWeapon();
    if (WEAPON_DEFINITIONS[releasedWeaponId]?.zoomOnAim) this.setSniperScopeVisible(false);
  }

  // 저격총을 들고 있는 동안(pointerdown~pointerup)만 화면 왼쪽 위에 뜨는 원형 확대 렌즈.
  // 메인 카메라는 절대 확대/이동하지 않는다 — HUD(체력바/버튼/무기 패널)가 같이 확대되면 클릭 좌표가
  // 화면 좌표와 어긋나 무기 조준·드래그 판정이 깨지므로, 별도 카메라 하나를 추가해서 그 카메라만 확대하고
  // 원형 마스크로 잘라 작은 렌즈처럼 보이게 한다. HUD 고정 UI와 스코프 테두리(reticle) 자체는
  // camera.ignore()로 빼서 스코프 안에 이중으로 확대되어 보이지 않게 한다.
  createSniperScope() {
    const radius = SNIPER_SCOPE_DIAMETER / 2;
    const cx = SNIPER_SCOPE_MARGIN;
    const cy = SNIPER_SCOPE_MARGIN;

    const reticle = this.add.graphics().setDepth(2500).setVisible(false);
    reticle.lineStyle(4, 0x000000, 0.85);
    reticle.strokeCircle(cx, cy, radius + 2);
    reticle.lineStyle(2, 0xff3b3b, 1);
    reticle.strokeCircle(cx, cy, radius);

    // 십자선 — 중앙에 공백을 두고 네 방향 짧은 선만 그려서 완전히 이어진 십자가보다 스코프 레티클답게 보이게 한다.
    const gap = 14;
    const armLen = radius - 18;
    reticle.lineStyle(1.5, 0xff3b3b, 0.9);
    [
      [0, -gap, 0, -gap - armLen],
      [0, gap, 0, gap + armLen],
      [-gap, 0, -gap - armLen, 0],
      [gap, 0, gap + armLen, 0],
    ].forEach(([x1, y1, x2, y2]) => {
      reticle.beginPath();
      reticle.moveTo(cx + x1, cy + y1);
      reticle.lineTo(cx + x2, cy + y2);
      reticle.strokePath();
    });

    const camera = this.cameras.add(cx - radius, cy - radius, radius * 2, radius * 2)
      .setZoom(SNIPER_SCOPE_ZOOM)
      .setBackgroundColor(0x000000)
      .setVisible(false);

    // Hud.createSidePanel의 maskShape와 같은 패턴 — 마스크 소스는 항상 숨겨두고 모양만 빌려 쓴다.
    const maskShape = this.add.graphics().fillStyle(0xffffff).fillCircle(cx, cy, radius).setVisible(false);
    camera.setMask(maskShape.createGeometryMask());

    camera.ignore([
      reticle,
      this.hud.scoreText, this.hud.hpBarBg, this.hud.hpBar,
      this.hud.settingsButton.bg, this.hud.settingsButton.icon,
      this.hud.sidePanel.container,
      this.hud.endButton.bg, this.hud.endButton.icon,
    ]);

    return { camera, reticle };
  }

  setSniperScopeVisible(visible) {
    this.sniperScope.camera.setVisible(visible);
    this.sniperScope.reticle.setVisible(visible);
  }

  // 무기/배경 패널이 열려 화면 오른쪽을 덮는 동안 그 영역에 보스가 있으면(패널이 슬라이드로 덮거나, 드래그로
  // 그 안에 밀어넣거나) 왼쪽 벽까지 날려보내 패널에 가려지지 않게 하고, 도착 시 보너스 데미지도 입힌다.
  checkBossAgainstPanel() {
    if (this.isEnded) return;
    if (this.boss.isPanelBounceActive) return;
    // 나가기 버튼으로 걸어가다 패널을 만난 경우(updateIdleDrift)는 튕겨나가지 않고 밀고 들어가야 하므로
    // 여기서는 건너뛴다 — 드래그/넉백으로 패널 안까지 밀려 들어간 경우에만 왼쪽 벽으로 날려보낸다.
    if (this.boss.isPushingPanel) return;

    const panelBoundaryX = this.hud.getOpenPanelBoundaryX();
    if (panelBoundaryX == null) return;
    if (this.boss.sprite.getBounds().right <= panelBoundaryX) return;

    this.boss.flyOutToLeftWall((x, y) => this.onPanelPushLanding(x, y));
  }

  onWeaponSelect(weaponId) {
    this.selectedWeaponId = weaponId;
  }

  onEndButtonClick() {
    if (this.isEnded) return;
    this.isEnded = true;
    this.sound.play('exit_button');

    // scene.pause()는 씬 전체의 입력 처리까지 멈춰서 결과 화면의 "다시하기" 버튼도 눌리지 않게 되므로 쓰지 않는다.
    // 대신 물리 시뮬레이션만 멈추고(투사체 이동·overlap 판정 정지), 투척형 자동 연사 타이머도 따로 끈다.
    // 드래그/뽑기 등 나머지 게임플레이 입력은 각 핸들러에서 isEnded로 개별 차단한다.
    const overlay = this.hud.showGameEndOverlay(this.combat.score, () => this.onRestartButtonClick());
    this.physics.world.pause();
    this.weaponManager.stopAllFiring();
    this.setSniperScopeVisible(false);

    this.onGameEnd(overlay, this.combat.score);
  }

  // online + 이름 있음(hasUserName): 모달 없이 바로 서버에 등록.
  // online + 이름 없음(git remote는 있는데 globalState/git user.name 둘 다 없어 'player'로 폴백된 경우):
  //   게임 화면 안(webview DOM 오버레이, usernameModal.js)에서 이름을 받아온 뒤에 등록 — 이후 판부터는
  //   그 이름이 globalState에 저장되어 있으니 hasUserName이 true가 되어 모달이 다시 뜨지 않는다.
  // 실패해도 게임이 죽으면 안 되므로 try/catch로 감싸고 콘솔 경고 후 로컬 표시로 폴백한다 (docs/API.md 클라이언트 fallback).
  // local: 서버 통신 없이 extension에 saveLocalScore만 보내고, 최고기록은 init 때 받은 값과 이번 점수 중 큰 쪽을 바로 보여준다.
  async onGameEnd(overlay, score) {
    if (gameContext.mode === 'online' && gameContext.groupId) {
      let { userName } = gameContext;
      if (!gameContext.hasUserName) {
        userName = await showUsernameModal(userName);
        gameContext.userName = userName;
        gameContext.hasUserName = true;
        postToExtension({ type: 'saveUserName', userName }); // 다음 판부터 모달 없이 이 이름을 쓰도록 extension globalState에 저장
      }
      this.hud.setEndOverlayStatus(overlay, '리더보드 불러오는 중...');
      try {
        await submitScore(gameContext.groupId, userName, score);
        const leaderboard = await fetchLeaderboard(gameContext.groupId);
        this.hud.setEndOverlayStatus(overlay, formatLeaderboard(leaderboard));
      } catch (e) {
        console.warn('서버 연결 실패, 로컬 표시로 전환', e);
        this.hud.setEndOverlayStatus(overlay, '리더보드를 불러오지 못했습니다 (서버 연결 실패)');
      }
    } else {
      const bestScore = Math.max(gameContext.bestScore, score);
      this.hud.setEndOverlayStatus(overlay, `내 최고 기록: ${bestScore}`);
      postToExtension({ type: 'saveLocalScore', score });
    }
  }

  onRestartButtonClick() {
    this.scene.restart();
  }

  onBackgroundSelect(style) {
    if (style === this.currentBackgroundStyle) return;
    this.currentBackgroundStyle = style;
    this.backgroundImage.setTexture(`battleBackground_${style}`);
  }

  onBossSelect(bossTypeId) {
    if (bossTypeId === this.currentBossType) return;
    this.currentBossType = bossTypeId;
    this.boss.setBossType(bossTypeId);
  }

  onHit(hits = [], defeated = false, deathPosition = null) {
    this.hud.updateHpBar(this.boss);
    this.hud.updateScoreText(this.combat.score);

    if (hits.length > 0) {
      const hitX = hits.reduce((sum, hit) => sum + hit.x, 0) / hits.length;
      const hitY = hits.reduce((sum, hit) => sum + hit.y, 0) / hits.length;
      // 전기충격기에 맞았으면 흰색 대신 시안색으로 살짝 다르게 번쩍여서 "감전됐다"는 느낌을 준다.
      const isTaserHit = hits.some((hit) => hit.weaponId === WEAPON_IDS.TASER);
      // 마술봉(teleportsBoss)에 맞으면 넉백 대신 화면 안 랜덤한 위치로 순간이동시킨다(Boss.teleportRandom) —
      // 데미지는 다른 PORTABLE 무기와 동일하게 이미 CombatSystem.handleHit에서 처리됐다.
      const isWandHit = hits.some((hit) => WEAPON_DEFINITIONS[hit.weaponId]?.teleportsBoss);
      if (isWandHit) this.boss.teleportRandom();
      else this.boss.knockback(hitX, hitY);
      this.boss.flash(isTaserHit ? 0x66e0ff : (isWandHit ? WAND_TELEPORT_SPARK_COLOR : 0xffffff));
      this.boss.registerHits(hits.length);
      this.boss.showHurtFace();
      hits.forEach((hit) => {
        this.spawnDamagePopup(hit);
        const bigImpact = WEAPON_DEFINITIONS[hit.weaponId]?.bigImpact;
        if (hit.weaponId === WEAPON_IDS.TASER) this.spawnElectrocuteEffect();
        else if (hit.weaponId === WEAPON_IDS.MEGAPHONE) this.spawnSoundWaveEffect(hit.x, hit.y);
        else if (hit.weaponId === WEAPON_IDS.TOMATO) this.spawnTomatoBurstEffect(hit.x, hit.y);
        else if (hit.weaponId === WEAPON_IDS.WATERMELON) this.spawnWatermelonSplitEffect(hit.x, hit.y);
        else if (hit.weaponId === WEAPON_IDS.WATER_BALLOON) this.spawnWaterSplashEffect(hit.x, hit.y);
        else if (hit.weaponId === WEAPON_IDS.BEACH_BALL) this.spawnBeachBallBounceEffect(hit.x, hit.y);
        else if (hit.weaponId === WEAPON_IDS.FRYING_PAN) this.spawnMetalClangEffect(hit.x, hit.y);
        else if (hit.weaponId === WEAPON_IDS.SLIPPER) this.spawnSlipperSmackEffect(hit.x, hit.y);
        // 폭탄류는 스파크 대신 터지는 순간(onBombDetonate)에 이미 폭발 이펙트를 띄웠으니 여기서는 생략한다.
        else if (hit.weaponId === WEAPON_IDS.GRENADE || hit.weaponId === WEAPON_IDS.DYNAMITE) { /* no-op */ }
        // 토마토/수박: 빨간 스플래터. 물풍선: 파란 스플래시. 마술봉: 연보라 스파크. 전용 이펙트 함수 없이
        // spawnHitSpark 색만 바꿔 재사용한다.
        else if (hit.weaponId === WEAPON_IDS.WAND) this.spawnHitSpark(hit.x, hit.y, WAND_TELEPORT_SPARK_COLOR, bigImpact ? 1.8 : 1);
        else this.spawnHitSpark(hit.x, hit.y, undefined, bigImpact ? 1.8 : 1);

        // 말랑이 계열 3종 — 기존 찌부 모션(WeaponManager.playSquish)은 그대로 두고, 그 위에 얹는
        // 오브젝트별 부가 파편 효과로만 서로 구분한다.
        if (hit.weaponId === WEAPON_IDS.RUBBER_DUCK) this.spawnDuckSqueakEffect(hit.x, hit.y);
        else if (hit.weaponId === WEAPON_IDS.TEDDY_BEAR) this.spawnTeddyFluffEffect(hit.x, hit.y);
        else if (hit.weaponId === WEAPON_IDS.CHEESE_SQUISHY) this.spawnCheeseCrumbEffect(hit.x, hit.y);

        // 권투 글러브: damageMultiplier가 높은 무기답게 화면이 살짝 더 흔들리는 카메라 shake를 겹친다
        // (applyPanelPushDamage의 패널 충돌 shake보다는 약하게 — 매 히트마다 나는 연출이라 과하면 시끄럽다).
        if (hit.weaponId === WEAPON_IDS.BOXING_GLOVE) this.cameras.main.shake(90, 0.005);
      });
    }
    if (defeated) {
      this.spawnDefeatPopup(deathPosition);
    }
  }

  // 방패(Boss.isShielded)에 막힌 반응. 데미지가 안 들어갔으니 넉백/피격 표정/점수는 전혀 안 건드리고,
  // 옅은 보라색 스파크 + "BLOCKED!" 팝업만 띄워서 맞긴 맞았지만 안 통했다는 걸 보여준다.
  onBlocked({ x, y }) {
    this.spawnHitSpark(x, y, 0xaeb6ff, 0.7);
    this.spawnDamagePopup({ amount: 'BLOCKED!', x, y, color: '#aeb6ff' });
  }

  // 쓰다듬기(힐링) 반응. 공격 반응(넉백/피격 표정/스파크)은 전혀 안 건드리고, 부드러운 분홍 틴트 +
  // 회복량 팝업 + 하트 몇 개만 띄운다 — 때리는 것과 확실히 다른 느낌을 주려는 의도.
  onPet(amount, { x, y }) {
    this.hud.updateHpBar(this.boss);
    this.boss.flash(0xffb6d9);
    this.boss.showHappyFace();
    this.spawnDamagePopup({ amount: `+${amount}`, x, y, color: '#ff8fc7' });
    this.spawnHeartBurst(x, y);
  }

  // 손으로 쓰다듬을 때 위로 둥실 떠오르며 사라지는 하트 몇 개.
  spawnHeartBurst(x, y) {
    const heartCount = 3;
    for (let i = 0; i < heartCount; i += 1) {
      const heart = this.add.text(x + Phaser.Math.Between(-14, 14), y + Phaser.Math.Between(-6, 6), '♥', {
        fontSize: `${Phaser.Math.Between(14, 20)}px`,
        color: '#ff8fc7',
      }).setOrigin(0.5).setDepth(1000);

      this.tweens.add({
        targets: heart,
        y: heart.y - Phaser.Math.Between(30, 45),
        alpha: 0,
        duration: 500,
        delay: i * 60,
        ease: 'Cubic.easeOut',
        onComplete: () => heart.destroy(),
      });
    }
  }

  // 패널 충돌로 왼쪽 벽까지 날아간 뒤(Boss.flyOutToLeftWall의 onComplete) 호출되는 보너스 데미지 처리.
  onPanelPushLanding(x, y) {
    if (this.isEnded) return;

    const { amount, defeated, deathPosition } = this.combat.applyPanelPushDamage();
    this.hud.updateHpBar(this.boss);
    this.hud.updateScoreText(this.combat.score);
    this.spawnDamagePopup({ amount, x, y, color: BOSS_PANEL_PUSH_POPUP_COLOR });
    this.spawnHitSpark(x, y, 0xff5050);
    this.boss.flash(0xff3333);
    this.cameras.main.shake(120, 0.008);

    if (defeated) {
      this.spawnDefeatPopup(deathPosition);
    }
  }

  // Phaser는 진행 중인 드래그를 코드로 취소하는 공식 API가 없다 — 실제 pointerup 때 내부적으로 호출되는
  // processDragUpEvent(@private로 문서화돼 있지만 실제로는 그냥 public 메서드)를 직접 호출해서 dragState를
  // 정리하고 DRAG_END/GAMEOBJECT_DRAG_END까지 정상적으로 발생시킨다. 실제 마우스 버튼은 그대로 눌려 있어도
  // 이 포인터는 놓았다 다시 잡기 전까지 보스를 끌고 다닐 수 없게 된다 — "손을 놓친" 것과 같은 효과.
  releaseBossDrag() {
    if (!this.activeDragPointer) return;
    this.input.processDragUpEvent(this.activeDragPointer);
    this.activeDragPointer = null;
  }

  // 흔들려서 구토가 트리거됐을 때(Boss.showVomit) 호출되는 데미지 처리. 무기 히트가 아니라 흔들기
  // 자체가 유발한 반응이라 combat.handleHit이 아니라 applyPanelPushDamage와 같은 1회성 이벤트로 처리한다.
  // 구토하는 순간 손을 놓친 것처럼 드래그도 강제로 풀어준다.
  onVomit(x, y) {
    if (this.isEnded) return;

    this.releaseBossDrag();
    const { amount, defeated, deathPosition } = this.combat.applyVomitDamage();
    this.hud.updateHpBar(this.boss);
    this.hud.updateScoreText(this.combat.score);
    this.spawnDamagePopup({ amount, x, y, color: VOMIT_POPUP_COLOR });
    this.spawnHitSpark(x, y, 0x7cb342);

    if (defeated) {
      this.spawnDefeatPopup(deathPosition);
    }
  }

  // 타격 지점 이펙트. 이미지 에셋 없이 Phaser 내장 도형(Circle/Star)만 써서 다른 이펙트(팝업 텍스트 등)와
  // 같은 방식으로 tween + destroy on complete로 처리한다. depth를 높게 둬서 보스/무기 뒤로 안 숨는다.
  // 실제 타격감을 위해 세 가지를 겹친다:
  //  1) 코어 플래시 — 맞는 순간 확 밝아졌다 사라지는 흰 빛(가산 블렌드)으로 순간적인 "펑" 느낌
  //  2) 조각별 버스트 — 크기/색을 조각마다 다르게 섞고, 튀어나가기 전에 짧게 팝(overshoot)한 뒤 날아가며
  //     아주 살짝 중력처럼 아래로 처지게 해서 정적인 방사형보다 훨씬 물리적으로 튀는 느낌을 준다
  // scale: 무기가 강할수록(bigImpact) 코어 플래시/조각 크기·거리를 다 키워서 임팩트를 더 세게 보이게 한다.
  spawnHitSpark(x, y, color = HIT_SPARK_COLOR, scale = 1) {
    const flash = this.add.circle(x, y, 16 * scale, 0xffffff, 0.9)
      .setDepth(999)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: flash,
      scale: 1.8,
      alpha: 0,
      duration: HIT_SPARK_DURATION * 0.5,
      ease: 'Cubic.easeOut',
      onComplete: () => flash.destroy(),
    });

    const shardCount = scale > 1 ? 11 : 8;
    const shardColors = [color, 0xffffff, 0xffb347];
    for (let i = 0; i < shardCount; i += 1) {
      const angle = (Math.PI * 2 * i) / shardCount + Phaser.Math.FloatBetween(-0.35, 0.35);
      const distance = Phaser.Math.Between(28, 56) * scale;
      const size = Phaser.Math.Between(7, 13) * scale;
      const shardColor = Phaser.Utils.Array.GetRandom(shardColors);
      const shard = this.add.star(x, y, 4, size * 0.4, size, shardColor)
        .setStrokeStyle(2, 0xffffff)
        .setDepth(1000)
        .setScale(0.3)
        .setAngle(Phaser.Math.Between(0, 360));

      this.tweens.add({
        targets: shard,
        scale: 1,
        duration: 60,
        ease: 'Back.easeOut',
        onComplete: () => {
          this.tweens.add({
            targets: shard,
            x: x + Math.cos(angle) * distance,
            y: y + Math.sin(angle) * distance + 10,
            scale: 0.15,
            alpha: 0,
            angle: shard.angle + Phaser.Math.Between(-180, 180),
            duration: HIT_SPARK_DURATION,
            ease: 'Cubic.easeOut',
            onComplete: () => shard.destroy(),
          });
        },
      });
    }
  }

  // 전기충격기 전용 "감전" 이펙트. 짧은 스파크 대신 보스 몸통(getHitRect)을 위에서 아래로 가로지르는
  // 길고 삐죽삐죽한 번개 줄기로 그려서 실제로 전류가 몸을 관통하는 느낌을 준다. 여러 조각이 따로
  // 깜빡이던 이전 버전은 산만했어서, 그래픽스 객체 하나에 한 번에 그리고 통째로 한 번만 페이드아웃한다.
  // Boss.flash의 시안색 틴트와 같이 쓰인다.
  spawnElectrocuteEffect() {
    const bodyRect = this.boss.getHitRect();
    const graphics = this.add.graphics().setDepth(1000);
    graphics.lineStyle(2, 0xaeefff, 1);

    const boltCount = 3;
    const segments = 6;
    for (let i = 0; i < boltCount; i += 1) {
      const startX = Phaser.Math.Between(bodyRect.x, bodyRect.right);
      const endX = Phaser.Math.Between(bodyRect.x, bodyRect.right);

      graphics.beginPath();
      graphics.moveTo(startX, bodyRect.y);
      for (let s = 1; s <= segments; s += 1) {
        const t = s / segments;
        const px = Phaser.Math.Linear(startX, endX, t) + (s === segments ? 0 : Phaser.Math.Between(-9, 9));
        const py = Phaser.Math.Linear(bodyRect.y, bodyRect.bottom, t);
        graphics.lineTo(px, py);
      }
      graphics.strokePath();
    }

    this.tweens.add({
      targets: graphics,
      alpha: 0,
      duration: 220,
      ease: 'Cubic.easeOut',
      onComplete: () => graphics.destroy(),
    });
  }

  // 확성기 전용 "소리 충격" 이펙트. 타격 지점에서 동심원 파동 3개가 시간차를 두고 부풀며 사라진다 —
  // 별 조각/번개 대신 순수하게 "소리가 퍼져나간다"는 느낌만 주는 단순한 링 형태로 구분한다.
  spawnSoundWaveEffect(x, y) {
    const ringCount = 3;
    for (let i = 0; i < ringCount; i += 1) {
      const ring = this.add.circle(x, y, 6, undefined, 0)
        .setStrokeStyle(3, 0xe0a63f, 1)
        .setDepth(1000);

      this.tweens.add({
        targets: ring,
        radius: 30,
        alpha: 0,
        delay: i * 90,
        duration: 260,
        ease: 'Cubic.easeOut',
        onComplete: () => ring.destroy(),
      });
    }
  }

  // 만화적인 "펑" 폭발 버스트 모양 — 원형 플래시 대신 뾰족뾰족한 불규칙 스파이크 윤곽으로 그려서
  // "터진다"는 느낌을 훨씬 날카롭게 준다. 튀어나오듯 팝(overshoot)한 뒤 살짝 더 부풀며 사라진다.
  // spikeCount/radius를 무기별로 조절해 토마토/물풍선 등 "터지는" 계열 이펙트가 공유해서 쓴다.
  spawnBurstShape(x, y, color = 0xffffff, { radius = 26, spikeCount = 12, alpha = 0.9 } = {}) {
    const points = [];
    for (let i = 0; i < spikeCount * 2; i += 1) {
      const angle = (Math.PI * 2 * i) / (spikeCount * 2);
      const isSpike = i % 2 === 0;
      const r = isSpike
        ? radius * Phaser.Math.FloatBetween(0.85, 1.2)
        : radius * Phaser.Math.FloatBetween(0.32, 0.5);
      points.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
    }

    const graphics = this.add.graphics({ x, y }).setDepth(999).setScale(0.3);
    graphics.fillStyle(color, alpha);
    graphics.fillPoints(points, true);

    this.tweens.add({
      targets: graphics,
      scale: 1,
      duration: 130,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: graphics,
          scale: 1.2,
          alpha: 0,
          duration: 220,
          ease: 'Cubic.easeOut',
          onComplete: () => graphics.destroy(),
        });
      },
    });

    return graphics;
  }

  // 토마토 전용 "터진다" 이펙트. 맞은 자리에 찌부러진 얼룩(자국)이 잠깐 부풀었다 사라지고,
  // 그 위로 즙 방울 여러 개가 사방으로 튀며 중력을 받아 아래로 처지듯 떨어진다.
  spawnTomatoBurstEffect(x, y) {
    // 코어 플래시 — 원형 대신 뾰족한 버스트 모양으로 터지는 순간의 "펑" 느낌을 낸다.
    this.spawnBurstShape(x, y, 0xffffff, { radius: 32, spikeCount: 10 });

    const stain = this.add.ellipse(x, y + 4, 22, 12, 0xc0392b, 0.55).setDepth(998).setScale(0.4);
    this.tweens.add({
      targets: stain,
      scaleX: 4.8,
      scaleY: 2.6,
      duration: 180,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: stain, alpha: 0, duration: 500, delay: 220, onComplete: () => stain.destroy(),
        });
      },
    });

    // 즙 방울 — 둥근 원 대신 끝이 뾰족한 별(star) 모양 파편으로 그려서 "터진다"는 느낌을 더 날카롭게 낸다.
    // innerRadius를 outerRadius의 1/3 정도로 얇게 잡아 물방울보다는 튀는 파편에 가까운 실루엣을 만든다.
    const dropletCount = 16;
    for (let i = 0; i < dropletCount; i += 1) {
      const angle = (Math.PI * 2 * i) / dropletCount + Phaser.Math.FloatBetween(-0.3, 0.3);
      const distance = Phaser.Math.Between(50, 100);
      const size = Phaser.Math.Between(6, 13);
      const droplet = this.add.star(x, y, 5, size * 0.35, size, 0xc0392b)
        .setDepth(1000)
        .setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2));
      this.tweens.add({
        targets: droplet,
        x: x + Math.cos(angle) * distance,
        // 사방으로 퍼지되 y는 항상 아래로 더 밀어서 중력 받아 떨어지는 느낌을 준다
        y: y + Math.sin(angle) * distance * 0.4 + 64,
        angle: droplet.angle + Phaser.Math.Between(-160, 160),
        alpha: 0,
        duration: 480,
        ease: 'Cubic.easeIn',
        onComplete: () => droplet.destroy(),
      });
    }
  }

  // 수박 전용 "쪼개진다" 이펙트. 반원 단면 텍스처(effect_watermelon_slice, weaponSprites.js) 두 장을
  // 하나는 그대로, 하나는 좌우 반전(setFlipX)해서 좌우로 회전하며 갈라져 날아가게 하고, 씨 파편도 같이 튄다.
  spawnWatermelonSplitEffect(x, y) {
    // 원본 텍스처(WATERMELON_WEAPON_SIZE)보다 확대해서 던 조각째 튀는 느낌이 확실히 보이게 한다.
    const sliceScale = 1.5;
    const sliceA = this.add.image(x, y, 'effect_watermelon_slice').setDepth(1000).setScale(sliceScale);
    const sliceB = this.add.image(x, y, 'effect_watermelon_slice').setDepth(1000).setScale(sliceScale).setFlipX(true);

    [{ target: sliceA, dir: -1 }, { target: sliceB, dir: 1 }].forEach(({ target, dir }) => {
      this.tweens.add({
        targets: target,
        x: x + dir * Phaser.Math.Between(46, 70),
        y: y + Phaser.Math.Between(50, 76),
        angle: dir * Phaser.Math.Between(50, 80),
        alpha: 0,
        duration: 520,
        ease: 'Cubic.easeIn',
        onComplete: () => target.destroy(),
      });
    });

    const seedCount = 9;
    for (let i = 0; i < seedCount; i += 1) {
      const angle = Math.PI * Phaser.Math.FloatBetween(0, 1) + Math.PI; // 아래쪽 절반 위주로 튐
      const distance = Phaser.Math.Between(30, 56);
      const seed = this.add.ellipse(x, y, 6, 9, 0x2b2d30).setDepth(1001);
      this.tweens.add({
        targets: seed,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance + 30,
        angle: Phaser.Math.Between(-180, 180),
        alpha: 0,
        duration: 420,
        ease: 'Cubic.easeIn',
        onComplete: () => seed.destroy(),
      });
    }
  }

  // 물풍선 전용 "터져서 물이 쏟아진다" 이펙트. 파문 링 하나 + 물방울 여러 개가 튀었다가 중력을 받아
  // 아래로 떨어진다. 기존에는 spawnHitSpark 색만 파랑으로 바꿔 재사용했는데, 스파크(별 조각) 모양이라
  // 물보다는 불꽃에 가까워 보여서 전용 이펙트로 교체한다.
  spawnWaterSplashEffect(x, y) {
    // 터지는 순간 뾰족한 버스트 모양(spawnBurstShape) — 토마토와 같은 방식으로 "펑" 느낌을 준다.
    this.spawnBurstShape(x, y, 0x4fc3f7, { radius: 26, spikeCount: 10, alpha: 0.75 });

    const dropletCount = 10;
    for (let i = 0; i < dropletCount; i += 1) {
      const angle = Phaser.Math.FloatBetween(-Math.PI * 0.9, -Math.PI * 0.1); // 위쪽으로 튀었다가
      const distance = Phaser.Math.Between(18, 40);
      const droplet = this.add.circle(x, y, Phaser.Math.Between(3, 6), 0x4fc3f7, 0.85).setDepth(1000);
      this.tweens.add({
        targets: droplet,
        x: x + Math.cos(angle) * distance,
        y: y + Phaser.Math.Between(40, 60), // 중력 받아 떨어지는 낙하
        alpha: 0,
        duration: 480,
        ease: 'Cubic.easeIn',
        onComplete: () => droplet.destroy(),
      });
    }
  }

  // 비치볼 전용 "통통 튄다" 이펙트. 데미지보다 튕겨나가는 느낌이 맞는 무기라, 실제 공 그림을 임팩트
  // 지점에 잠깐 띄워 찌그러졌다(squash) 원래 모양으로 돌아오며(stretch) 임의 방향으로 살짝 튕겨나간 뒤
  // 사라지게 한다. 원본 스케일(baseScale)을 따로 저장해둬야 찌그러진 스케일 위에 또 곱해지지 않는다.
  spawnBeachBallBounceEffect(x, y) {
    const baseScale = 0.85;
    const ball = this.add.image(x, y, 'weapon_beach_ball_projectile').setDepth(1000).setScale(baseScale);
    const bounceAngle = Phaser.Math.FloatBetween(0, Math.PI * 2);

    this.tweens.add({
      targets: ball,
      scaleX: baseScale * 1.35,
      scaleY: baseScale * 0.6,
      duration: 90,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: ball,
          scaleX: baseScale,
          scaleY: baseScale,
          x: ball.x + Math.cos(bounceAngle) * 22,
          y: ball.y + Math.sin(bounceAngle) * 22,
          duration: 160,
          ease: 'Back.easeOut',
          onComplete: () => {
            this.tweens.add({
              targets: ball, alpha: 0, duration: 220, onComplete: () => ball.destroy(),
            });
          },
        });
      },
    });
  }

  // 러버덕 전용 부가 효과 — "삑삑" 소리 나는 느낌으로 별/음표가 작게 튀어 오른다.
  // squishHit(playSquish, WeaponManager)이 이미 찌부 모션을 담당하므로 이 위에 얹기만 한다.
  spawnDuckSqueakEffect(x, y) {
    const symbols = ['★', '♪'];
    const count = 3;
    for (let i = 0; i < count; i += 1) {
      const symbol = Phaser.Utils.Array.GetRandom(symbols);
      const text = this.add.text(x + Phaser.Math.Between(-12, 12), y - Phaser.Math.Between(0, 6), symbol, {
        fontSize: `${Phaser.Math.Between(12, 18)}px`,
        color: '#ffd43b',
      }).setOrigin(0.5).setDepth(1000);

      this.tweens.add({
        targets: text,
        y: text.y - Phaser.Math.Between(24, 36),
        alpha: 0,
        duration: 380,
        delay: i * 50,
        ease: 'Cubic.easeOut',
        onComplete: () => text.destroy(),
      });
    }
  }

  // 곰인형 전용 부가 효과 — 솜(하얀 조각)이 살짝 날린다. squishHit 위에 얹는 방식은 러버덕과 동일.
  spawnTeddyFluffEffect(x, y) {
    const fluffCount = 5;
    for (let i = 0; i < fluffCount; i += 1) {
      const angle = Phaser.Math.FloatBetween(-Math.PI, 0);
      const distance = Phaser.Math.Between(14, 30);
      const fluff = this.add.circle(x, y, Phaser.Math.Between(3, 5), 0xffffff, 0.9)
        .setStrokeStyle(1, 0xe8c9a0)
        .setDepth(1000);
      this.tweens.add({
        targets: fluff,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance - Phaser.Math.Between(10, 20),
        alpha: 0,
        duration: 500,
        delay: i * 30,
        ease: 'Sine.easeOut',
        onComplete: () => fluff.destroy(),
      });
    }
  }

  // 치즈 말랑이 전용 부가 효과 — 부스러기(작은 노란 조각)가 튄다. squishHit 위에 얹는 방식은 동일.
  spawnCheeseCrumbEffect(x, y) {
    const crumbCount = 6;
    for (let i = 0; i < crumbCount; i += 1) {
      const angle = (Math.PI * 2 * i) / crumbCount + Phaser.Math.FloatBetween(-0.4, 0.4);
      const distance = Phaser.Math.Between(16, 32);
      const crumbSize = Phaser.Math.Between(4, 7);
      const crumb = this.add.rectangle(x, y, crumbSize, crumbSize, 0xf5cf3d, 0.95)
        .setStrokeStyle(1, 0xc9971f)
        .setDepth(1000)
        .setAngle(Phaser.Math.Between(0, 360));
      this.tweens.add({
        targets: crumb,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance * 0.5 + 24, // 부스러기라 살짝 아래로 떨어지듯
        angle: crumb.angle + Phaser.Math.Between(-120, 120),
        alpha: 0,
        duration: 400,
        ease: 'Cubic.easeIn',
        onComplete: () => crumb.destroy(),
      });
    }
  }

  // 프라이팬 전용 "쨍" 금속 타격 이펙트. 기본 spawnHitSpark보다 더 밝은 코어 플래시 + 더 얇고 뾰족한
  // 별(needle-like) 스파크를 짧은 지속시간으로 튀겨서 둥글고 느린 기본 스파크와 확실히 구분한다.
  spawnMetalClangEffect(x, y) {
    const flash = this.add.circle(x, y, 20, 0xffffff, 0.95)
      .setDepth(999)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: flash,
      scale: 2.2,
      alpha: 0,
      duration: 140,
      ease: 'Cubic.easeOut',
      onComplete: () => flash.destroy(),
    });

    const sparkCount = 10;
    const sparkColors = [0xffffff, 0xffe066];
    for (let i = 0; i < sparkCount; i += 1) {
      const angle = (Math.PI * 2 * i) / sparkCount + Phaser.Math.FloatBetween(-0.2, 0.2);
      const distance = Phaser.Math.Between(36, 64);
      const color = Phaser.Utils.Array.GetRandom(sparkColors);
      // innerRadius(2)를 outerRadius(10)보다 훨씬 작게 잡아 기본 스파크보다 뾰족한 바늘 모양으로 만든다.
      const spark = this.add.star(x, y, 4, 2, 10, color).setDepth(1000).setRotation(angle);
      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        scale: 0.2,
        alpha: 0,
        duration: 180,
        ease: 'Cubic.easeOut',
        onComplete: () => spark.destroy(),
      });
    }
  }

  // 슬리퍼 전용 "등짝 스매싱" 이펙트. 만화적인 먼지 뭉게구름이 부풀었다 빠르게 사라지고, 그 사이로
  // 별이 튀어나가는 과장된 임팩트로 그린다.
  spawnSlipperSmackEffect(x, y) {
    const puffCount = 4;
    for (let i = 0; i < puffCount; i += 1) {
      const offsetAngle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const offsetDist = Phaser.Math.Between(0, 14);
      const puff = this.add.circle(
        x + Math.cos(offsetAngle) * offsetDist,
        y + Math.sin(offsetAngle) * offsetDist,
        10,
        0xcfcfcf,
        0.55,
      ).setDepth(998).setScale(0.3);
      this.tweens.add({
        targets: puff,
        scale: 2.4,
        alpha: 0,
        duration: 320,
        delay: i * 25,
        ease: 'Cubic.easeOut',
        onComplete: () => puff.destroy(),
      });
    }

    const starCount = 4;
    for (let i = 0; i < starCount; i += 1) {
      const angle = (Math.PI * 2 * i) / starCount + Phaser.Math.FloatBetween(-0.3, 0.3);
      const distance = Phaser.Math.Between(30, 50);
      const star = this.add.star(x, y, 5, 4, 9, 0xffe066).setStrokeStyle(1.5, 0xffffff).setDepth(1000).setScale(0.3);
      this.tweens.add({
        targets: star,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        scale: 1,
        angle: Phaser.Math.Between(0, 360),
        alpha: 0,
        duration: 380,
        ease: 'Cubic.easeOut',
        onComplete: () => star.destroy(),
      });
    }
  }

  // 폭탄류(WeaponManager.detonateBomb)가 실제로 터지는 순간 호출된다. hitBoss가 false면 보스가
  // 폭발 반경 밖에 있었다는 뜻 — 데미지/카메라 흔들림 없이 폭발 이펙트만 보여줘 "허탕"임을 알려준다.
  // 다이너마이트가 수류탄보다 훨씬 큰 폭발이라 카메라 흔들림도 그만큼 세게 준다. chainCount(다이너마이트
  // 여러 개를 붙여놔서 한 번에 연쇄 폭발한 개수, 기본 1)만큼 이펙트/흔들림 규모를 더 키운다.
  onBombDetonate(weaponId, x, y, hitBoss, chainCount = 1) {
    if (weaponId === WEAPON_IDS.GRENADE) this.spawnGrenadeExplosionEffect(x, y);
    else if (weaponId === WEAPON_IDS.DYNAMITE) this.spawnDynamiteExplosionEffect(x, y, chainCount);
    if (!hitBoss) return;
    if (weaponId === WEAPON_IDS.DYNAMITE) this.cameras.main.shake(240 + (chainCount - 1) * 60, Math.min(0.02 + (chainCount - 1) * 0.008, 0.05));
    else this.cameras.main.shake(120, 0.008);
  }

  // 수류탄 전용 폭발 이펙트 — 뾰족한 버스트 코어(spawnBurstShape) + 회색 금속 파편(별 모양) +
  // 잿빛 연기 뭉게구름. 다이너마이트보다 규모를 작게 잡아 "한 손에 들고 던지는" 무기다운 폭발로 그린다.
  spawnGrenadeExplosionEffect(x, y) {
    this.spawnBurstShape(x, y, 0xffb347, { radius: 40, spikeCount: 12, alpha: 0.9 });

    const shardCount = 10;
    for (let i = 0; i < shardCount; i += 1) {
      const angle = (Math.PI * 2 * i) / shardCount + Phaser.Math.FloatBetween(-0.3, 0.3);
      const distance = Phaser.Math.Between(50, 90);
      const size = Phaser.Math.Between(6, 11);
      const shard = this.add.star(x, y, 4, size * 0.3, size, 0x6b6f75)
        .setStrokeStyle(1.5, 0x2b2d30)
        .setDepth(1000)
        .setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2));
      this.tweens.add({
        targets: shard,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance + 20,
        angle: shard.angle + Phaser.Math.Between(-180, 180),
        alpha: 0,
        duration: 460,
        ease: 'Cubic.easeOut',
        onComplete: () => shard.destroy(),
      });
    }

    const smokeCount = 4;
    for (let i = 0; i < smokeCount; i += 1) {
      const offsetAngle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const offsetDist = Phaser.Math.Between(0, 16);
      const smoke = this.add.circle(x + Math.cos(offsetAngle) * offsetDist, y + Math.sin(offsetAngle) * offsetDist, 12, 0x888888, 0.45)
        .setDepth(998)
        .setScale(0.3);
      this.tweens.add({
        targets: smoke,
        scale: 2.2,
        y: smoke.y - 20,
        alpha: 0,
        duration: 600,
        delay: i * 40,
        ease: 'Cubic.easeOut',
        onComplete: () => smoke.destroy(),
      });
    }
  }

  // 다이너마이트 전용 폭발 이펙트 — 수류탄(빠르고 뾰족한 파편 위주)과 확실히 다른 "느긋하지만 훨씬
  // 크게 터지는" 느낌을 준다: 1) 하얀 섬광이 먼저 확 터지고 2) 살짝 늦게(delay) 훨씬 큰 주황 버스트가
  // 뒤따라와 2단계로 부풀어 오르는 것처럼 보이게 하고 3) 충격파 링을 3겹, 훨씬 넓게 퍼뜨리고
  // 4) 짙고 큼직한 연기 기둥을 더 오래 피어오르게 한다. 파편(별 조각)은 안 쓴다 — 금속 파편이 튀는
  // 수류탄과 달리 다이너마이트는 화약 폭발 자체의 규모로 승부한다.
  // chainCount: 여러 다이너마이트를 붙여놔서 한 번에 연쇄 폭발한 개수(WeaponManager.detonateBomb,
  // 기본 1). 개당 규모를 키워서 여러 개를 모아두면 확실히 "개크게" 터지는 걸 보여준다 — 다만
  // 무한정 커지면 화면을 가득 채워버리니 최대 3배로 캡을 둔다.
  spawnDynamiteExplosionEffect(x, y, chainCount = 1) {
    const scale = Math.min(1 + (chainCount - 1) * 0.5, 3);

    // 1단계 — 하얀 섬광 (즉시)
    this.spawnBurstShape(x, y, 0xffffff, { radius: 30 * scale, spikeCount: 10, alpha: 0.95 });

    // 2단계 — 살짝 늦게 뒤따라오는 훨씬 큰 주황/노랑 버스트 (섬광 → 본폭발의 2단 타이밍)
    this.time.delayedCall(90, () => {
      this.spawnBurstShape(x, y, 0xff9a3c, { radius: 78 * scale, spikeCount: 16, alpha: 0.95 });
      this.spawnBurstShape(x, y, 0xffe066, { radius: 46 * scale, spikeCount: 12, alpha: 0.85 });
    });

    const ringCount = Math.min(3 + (chainCount - 1), 6);
    for (let i = 0; i < ringCount; i += 1) {
      const ring = this.add.circle(x, y, 12, undefined, 0).setStrokeStyle(4, 0xffb347, 0.85).setDepth(998);
      this.tweens.add({
        targets: ring,
        radius: 110 * scale,
        alpha: 0,
        delay: 100 + i * 110,
        duration: 480,
        ease: 'Cubic.easeOut',
        onComplete: () => ring.destroy(),
      });
    }

    const smokeCount = Math.min(8 + (chainCount - 1) * 3, 20);
    for (let i = 0; i < smokeCount; i += 1) {
      const offsetAngle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const offsetDist = Phaser.Math.Between(0, 30 * scale);
      const smoke = this.add.circle(x + Math.cos(offsetAngle) * offsetDist, y + Math.sin(offsetAngle) * offsetDist, 20 * scale, 0x3a3d42, 0.55)
        .setDepth(998)
        .setScale(0.3);
      this.tweens.add({
        targets: smoke,
        scale: 3.2,
        y: smoke.y - Phaser.Math.Between(60, 90) * scale,
        alpha: 0,
        duration: 950,
        delay: 120 + i * 45,
        ease: 'Cubic.easeOut',
        onComplete: () => smoke.destroy(),
      });
    }
  }

  spawnDamagePopup({ amount, x, y, color = '#ffffff' }) {
    const text = this.add.text(x + Phaser.Math.Between(-10, 10), y - 20, `${amount}`, {
      fontSize: '18px',
      color,
      fontStyle: 'bold',
      fontFamily: UI_FONT_FAMILY,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: text,
      y: text.y - 40,
      alpha: 0,
      duration: DAMAGE_POPUP_DURATION,
      ease: 'Cubic.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  spawnDefeatPopup(position) {
    const text = this.add.text(position.x, position.y - 60, '처치!', {
      fontSize: '30px',
      color: DEFEAT_POPUP_COLOR,
      fontStyle: 'bold',
      fontFamily: UI_FONT_FAMILY,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: text,
      y: text.y - 30,
      alpha: 0,
      duration: DEFEAT_POPUP_DURATION,
      ease: 'Cubic.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  // 보스 머리 위에 대사 팝업을 잠깐 띄운다. 데미지 팝업과 달리 위치가 고정돼 있고 더 오래 유지된다.
  // line은 호출부에서 고른다 — 실제 토큰 임계치 대사(tokenCount 기반 tier)와 게임 시작 인트로 대사가
  // 서로 다른 대사 풀을 쓰지만 팝업 렌더링 자체는 공유한다.
  spawnTauntPopup(line) {
    const x = this.boss.bodyCenterX;
    const y = this.boss.sprite.y - this.boss.displayHeight / 2 - 20;
    const style = {
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold',
      fontFamily: UI_FONT_FAMILY,
      backgroundColor: '#000000cc',
      padding: { x: 10, y: 6 },
    };

    // 완성된 문장의 폭을 미리 재서 왼쪽 끝을 고정해야, 글자가 늘어나도
    // 타이핑처럼 오른쪽으로만 자라고 좌우로 흔들리지 않는다.
    const measure = this.add.text(0, 0, line, style).setVisible(false);
    const fullWidth = measure.width;
    measure.destroy();

    const text = this.add
      .text(x - fullWidth / 2, y, '', style)
      .setOrigin(0, 0.5)
      .setDepth(2000);

    let charIndex = 0;
    const typingTimer = this.time.addEvent({
      delay: AGENT_TAUNT_TYPING_SPEED,
      repeat: line.length - 1,
      callback: () => {
        charIndex += 1;
        text.setText(line.slice(0, charIndex));
      },
    });

    this.tweens.add({
      targets: text,
      y: text.y - 20,
      alpha: 0,
      duration: AGENT_TAUNT_POPUP_DURATION,
      delay: line.length * AGENT_TAUNT_TYPING_SPEED + 800,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        typingTimer.remove();
        text.destroy();
      },
    });
  }
}
