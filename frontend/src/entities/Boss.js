import Phaser from 'phaser';
import {
  BOSS_SPAWN,
  BOSS_KNOCKBACK_DISTANCE,
  BOSS_KNOCKBACK_OUT_DURATION,
  BOSS_PANEL_PUSH_DURATION,
  BOSS_FLASH_DURATION,
  BOSS_HURT_FACE_DURATION,
  BOSS_HAPPY_FACE_DURATION,
  BOSS_BLINK_DURATION,
  BOSS_BLINK_MIN_INTERVAL,
  BOSS_BLINK_MAX_INTERVAL,
  COMBO_WINDOW_MS,
  COMBO_HIT_THRESHOLD,
  BOSS_FIRE_BREATH_DURATION,
  BOSS_FIRE_BREATH_COOLDOWN_MS,
  FIRE_BREATH_MIN_DAMAGE_STAGE,
  DEBUGGER_FREEZE_DURATION,
  BOSS_SHIELD_CHECK_MIN_INTERVAL,
  BOSS_SHIELD_CHECK_MAX_INTERVAL,
  BOSS_SHIELD_BREACH_LIMIT,
  BOSS_SHIELD_REARM_COOLDOWN_MS,
  SHAKE_VOMIT_TRIGGER_MS,
  SHAKE_MIN_MOVE_PX,
  SHAKE_REVERSAL_WINDOW_MS,
  SHAKE_MIN_REVERSALS_IN_WINDOW,
  BOSS_VOMIT_DURATION,
  WAND_TELEPORT_OUT_DURATION,
  WAND_TELEPORT_IN_DURATION,
} from '../config/constants.js';
import { MAX_DAMAGE_STAGE, BOSS_MARGIN_TOP, BOSS_MARGIN_LEFT } from './bossSprite.js';

// HP 비율이 이 값들 이하로 떨어질 때마다 데미지 단계가 하나씩 올라간다 (개수 = MAX_DAMAGE_STAGE).
// 1단계(<=0.7): 두 눈 처짐 + 입 살짝. 2단계(<=0.3): 눈 더 처짐 + 입 더 벌어짐 + 스파크 표시.
const DAMAGE_RATIO_BREAKPOINTS = [0.7, 0.3];

function computeDamageStage(ratio) {
  const stage = DAMAGE_RATIO_BREAKPOINTS.filter((breakpoint) => ratio <= breakpoint).length;
  return Math.min(stage, MAX_DAMAGE_STAGE);
}

export default class Boss {
  constructor(scene, bossTypeId) {
    this.scene = scene;
    this.bossTypeId = bossTypeId;
    this.damageStage = 0;
    this.sprite = scene.physics.add.image(BOSS_SPAWN.x, BOSS_SPAWN.y, `boss_${bossTypeId}_d0`);
    this.maxHp = 1000;
    this.hp = this.maxHp;
    this.recentHitTimestamps = [];
    this.fireBreathEvent = null;
    this.happyFaceEvent = null;
    this.blinkEvent = null;
    this.lastFireBreathTime = -Infinity;
    this.isFrozen = false;
    this.freezeEvent = null;
    this.isPushingPanel = false;
    this.isShielded = false;
    this.shieldSprite = null;
    this.shieldCheckEvent = null;
    this.shieldAngle = Math.PI; // 기본은 왼쪽 — 공격 방향(aimPoint)이 들어오기 전까지의 초기값
    this.lastShieldAimPoint = null;
    this.shieldBreachCount = 0; // 막기 확률에 실패해 실제로 맞은 횟수 — BOSS_SHIELD_BREACH_LIMIT번 쌓이면 방패가 사라진다
    this.lastShieldEndTime = -Infinity; // 방패가 깨진 시각 — BOSS_SHIELD_REARM_COOLDOWN_MS 안에는 재발동 안 함
    this.onShieldActivate = null; // GameScene이 생성 후 설정 — 방패 뜰 때 대사 팝업을 띄우는 용도(onPet과 같은 방식)
    this.isSleeping = false; // 방치(idle) 중 걷기 전에 먼저 자는 척하는 단계 — GameScene.updateIdleDrift가 관리
    this.vomitEvent = null;
    this.onVomit = null; // GameScene이 생성 후 설정 (onPet과 같은 방식) — 구토 데미지/팝업 처리용 콜백
    this.resetShakeTracking();

    // 기본 물리 바디는 텍스처 전체(캔버스, 왼쪽/위 상태표시 여백 포함) 크기라 무기 overlap 판정 자체가
    // 그 여백까지 "몸통"으로 잡는다 — 방망이/투사체가 실제 그림에 닿기도 전에 먼저 겹침이 발생해서,
    // 특히 왼쪽·위에서 오는 다트가 몸에서 먼 자리에서 박히는 원인이었다. 바디를 실제 몸통 크기/위치로 줄인다.
    this.sprite.body.setSize(this.bodyWidth, this.bodyHeight, false);
    this.sprite.body.setOffset(BOSS_MARGIN_LEFT, BOSS_MARGIN_TOP);

    this.sprite.setCollideWorldBounds(true);
    this.sprite.setInteractive({ draggable: true });
    scene.input.setDraggable(this.sprite);

    // 가만히 있어도 살아있는 느낌을 주는 랜덤 눈 깜빡임 — 다른 표정(피격/불뿜기/웃음)보다 우선순위가
    // 가장 낮아서 그것들이 떠 있는 동안엔 그냥 건너뛰고 다음 깜빡임을 다시 예약한다.
    this.scheduleNextBlink();
    this.scheduleNextShieldCheck();
  }

  // 현재 데미지 단계에 맞는 평상시 기본 텍스처 키 (히트 시 X_X 표정에서 복귀할 때도 사용)
  getBaseTextureKey() {
    return `boss_${this.bossTypeId}_d${this.damageStage}`;
  }

  get displayWidth() {
    return this.sprite.displayWidth;
  }

  get displayHeight() {
    return this.sprite.displayHeight;
  }

  // 텍스처 캔버스 왼쪽/위쪽 여백(BOSS_MARGIN_LEFT/TOP, bossSprite.js)에는 느낌표/분노 마크 같은 상태
  // 표시만 있고 실제 몸통이 없다. displayWidth/Height(=캔버스 전체) 그대로 판정하면 그 여백 — 즉 상태
  // 표시 아이콘 자리 — 을 때려도 데미지가 들어가 버려서, 히트/오버랩 판정은 여백을 뺀 이 값들을 써야 한다.
  get bodyWidth() {
    return this.displayWidth - BOSS_MARGIN_LEFT;
  }

  get bodyHeight() {
    return this.displayHeight - BOSS_MARGIN_TOP;
  }

  get bodyCenterX() {
    return this.sprite.x + BOSS_MARGIN_LEFT / 2;
  }

  get bodyCenterY() {
    return this.sprite.y + BOSS_MARGIN_TOP / 2;
  }

  // 히트/오버랩 판정 전용 몸통 사각형 (world 좌표). PORTABLE 무기 캡슐(portableOverlapsBoss)과 투사체 원
  // (projectileOverlapsBoss) 판정에 쓴다 — 자세한 이유는 위 getter들 주석 참고.
  getHitRect() {
    return new Phaser.Geom.Rectangle(
      this.bodyCenterX - this.bodyWidth / 2,
      this.bodyCenterY - this.bodyHeight / 2,
      this.bodyWidth,
      this.bodyHeight,
    );
  }

  setPosition(x, y) {
    this.scene.tweens.killTweensOf(this.sprite);
    this.isPanelBounceActive = false;
    this.sprite.setAngle(0);
    this.sprite.setPosition(x, y);
  }

  takeDamage(amount) {
    this.hp -= amount;
    this.updateVisualState();
  }

  // 쓰다듬기(힐링) 무기 전용. maxHp를 넘지 않게 클램프하고, 단계가 낮아지면(덜 처진 눈 등)
  // updateVisualState가 그것도 그대로 반영한다 — 데미지 단계 계산은 방향과 무관하게 현재 ratio만 본다.
  heal(amount) {
    this.hp = Math.min(this.hp + amount, this.maxHp);
    this.updateVisualState();
  }

  // HP 변화에 따라 데미지 단계를 갱신. 히트 직후라 X_X 표정이 잠깐 떠 있는 중이면(hurtFaceEvent 존재)
  // 텍스처는 건드리지 않고 상태값만 갱신해둔다 — X_X가 끝나고 복귀할 때 getBaseTextureKey()가 반영한다.
  updateVisualState() {
    const ratio = Math.max(this.hp, 0) / this.maxHp;
    const stage = computeDamageStage(ratio);
    if (stage === this.damageStage) return;

    this.damageStage = stage;
    // 랜덤 폴링(scheduleNextShieldCheck)만 믿으면 최저 단계에 머무는 시간이 짧을 때(공격을 계속
    // 몰아붙여 금방 처치해버리는 경우) 다음 확인 주기(6~12초)가 오기 전에 죽어버려 방패가 한 번도
    // 안 뜰 수 있다 — 방금 막 최저 단계에 진입한 이 순간 바로 한 번 시도해서 그 문제를 없앤다.
    // (재발동 쿨다운은 canActivateShield 안에서 같이 체크한다.)
    if (this.canActivateShield()) this.activateShield();
    // 방금 activateShield()가 썩소 텍스처를 그려놨다면 아래에서 base 텍스처로 덮어쓰면 안 된다.
    if (!this.hurtFaceEvent && !this.isShielded) this.sprite.setTexture(this.getBaseTextureKey());
  }

  isDead() {
    return this.hp <= 0;
  }

  respawn() {
    this.hp = this.maxHp;
    this.damageStage = 0;
    this.setPosition(BOSS_SPAWN.x, BOSS_SPAWN.y);
    this.hurtFaceEvent?.remove();
    this.hurtFaceEvent = null;
    this.fireBreathEvent?.remove();
    this.fireBreathEvent = null;
    this.happyFaceEvent?.remove();
    this.happyFaceEvent = null;
    this.blinkEvent?.remove();
    this.blinkEvent = null;
    this.freezeEvent?.remove();
    this.freezeEvent = null;
    this.vomitEvent?.remove();
    this.vomitEvent = null;
    this.resetShakeTracking();
    this.isFrozen = false;
    this.isPushingPanel = false;
    this.recentHitTimestamps = [];
    this.lastFireBreathTime = -Infinity;
    // 전신 회복이라 최저 체력 단계 전용 방패도 같이 정리한다 — 다음 발동 여부 확인 루프(shieldCheckEvent)는
    // 그대로 두고 방패 자체만 끈다.
    this.isShielded = false;
    this.shieldSprite?.setVisible(false);
    this.shieldAngle = Math.PI;
    this.lastShieldAimPoint = null;
    this.shieldBreachCount = 0;
    this.lastShieldEndTime = -Infinity;
    this.isSleeping = false;
    this.sprite.setTexture(this.getBaseTextureKey());
  }

  // 보스 선택 패널에서 다른 캐릭터를 고르면 호출 — HP/위치는 그대로 두고 텍스처만 교체.
  // 방패를 두른 채(isShielded) 캐릭터를 바꾸는 드문 경우에도 썩소가 갑자기 화난 표정으로 안 바뀌게,
  // 그 상태면 새 타입의 썩소 텍스처로 다시 그려준다.
  setBossType(bossTypeId) {
    this.bossTypeId = bossTypeId;
    this.hurtFaceEvent?.remove();
    this.hurtFaceEvent = null;
    this.fireBreathEvent?.remove();
    this.fireBreathEvent = null;
    this.happyFaceEvent?.remove();
    this.happyFaceEvent = null;
    this.blinkEvent?.remove();
    this.blinkEvent = null;
    this.vomitEvent?.remove();
    this.vomitEvent = null;
    this.resetShakeTracking();
    this.isPushingPanel = false;
    this.sprite.setTexture(this.isShielded ? `boss_smirk_${bossTypeId}` : this.getBaseTextureKey());
  }

  // 타격 지점(hitX,hitY) 반대 방향으로 보스를 실제로 밀어낸다. 원위치로 돌아오지 않고 그 자리가 새 위치가 된다.
  // 드래그 중이면 다음 드래그 좌표가 곧바로 덮어써서 자연히 묻힌다. 화면 밖으로는 나가지 않도록 clamp.
  knockback(hitX, hitY) {
    // 연타로 이전 knockback이 끝나기 전에 다시 호출되면, 진행 중이던 트윈을 끊고 그 시점의 실제 위치부터 이어서 밀린다.
    this.scene.tweens.killTweensOf(this.sprite);
    this.isPanelBounceActive = false;
    this.sprite.setAngle(0); // 패널 충돌 회전이 끝나기 전에 끊겼을 경우를 대비해 기준 각도로 정리
    const originX = this.sprite.x;
    const originY = this.sprite.y;

    const angle = Phaser.Math.Angle.Between(hitX, hitY, originX, originY);
    const halfW = this.displayWidth / 2;
    const halfH = this.displayHeight / 2;
    const { width, height } = this.scene.scale;
    const targetX = Phaser.Math.Clamp(originX + Math.cos(angle) * BOSS_KNOCKBACK_DISTANCE, halfW, width - halfW);
    const targetY = Phaser.Math.Clamp(originY + Math.sin(angle) * BOSS_KNOCKBACK_DISTANCE, halfH, height - halfH);

    this.scene.tweens.add({
      targets: this.sprite,
      x: targetX,
      y: targetY,
      duration: BOSS_KNOCKBACK_OUT_DURATION,
      ease: 'Quad.easeOut',
    });
  }

  // 마술봉(WAND)에 맞으면 넉백 대신 호출된다(GameScene.onHit) — 데미지는 이미 CombatSystem.handleHit이
  // 다른 PORTABLE 무기와 같은 파이프라인으로 처리했고, 여기서는 그 자리에서 작아지며 사라졌다가 화면 안
  // 랜덤한 위치에서 다시 커지며 나타나는 순간이동 연출만 담당한다. halfW/halfH는 축소 트윈이 시작되기
  // 전(스케일 1일 때)에 미리 구해둬야 한다 — displayWidth/Height는 현재 스케일에 비례해서, 트윈이 끝난
  // onComplete 시점(스케일 0)에 계산하면 0이 나와버린다.
  teleportRandom() {
    this.scene.tweens.killTweensOf(this.sprite);
    this.isPanelBounceActive = false;
    this.sprite.setAngle(0);

    const halfW = this.displayWidth / 2;
    const halfH = this.displayHeight / 2;
    const { width, height } = this.scene.scale;

    this.scene.tweens.add({
      targets: this.sprite,
      scale: 0,
      alpha: 0,
      duration: WAND_TELEPORT_OUT_DURATION,
      ease: 'Back.easeIn',
      onComplete: () => {
        const x = Phaser.Math.Between(halfW, width - halfW);
        const y = Phaser.Math.Between(halfH, height - halfH);
        this.sprite.setPosition(x, y);

        this.scene.tweens.add({
          targets: this.sprite,
          scale: 1,
          alpha: 1,
          duration: WAND_TELEPORT_IN_DURATION,
          ease: 'Back.easeOut',
        });
      },
    });
  }

  // 무기/배경 패널이 화면 오른쪽에서 슬라이드로 열리며 보스와 겹치면(=패널에 부딪히면) 왼쪽 벽까지 날려보내
  // 패널에 가려지지 않게 한다. onComplete(x,y): 왼쪽 벽 도착 지점 좌표와 함께 호출되는 콜백 (호출부에서 보너스 데미지 적용).
  // isPanelBounceActive: 트윈이 진행되는 동안 호출부(GameScene)가 매 프레임 겹침을 다시 감지해 트윈을
  // 계속 재시작하지 않도록 막는 가드. setPosition/knockback으로 도중에 끊기면 그쪽에서 다시 false로 되돌린다.
  flyOutToLeftWall(onComplete) {
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.setAngle(0);
    const halfW = this.displayWidth / 2;

    this.isPanelBounceActive = true;
    this.scene.tweens.add({
      targets: this.sprite,
      x: halfW,
      angle: 360,
      duration: BOSS_PANEL_PUSH_DURATION,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        this.sprite.setAngle(0);
        this.isPanelBounceActive = false;
        this.scene.sound.play('hit_wall');
        onComplete?.(this.sprite.x, this.sprite.y);
      },
    });
  }

  // 나가기 버튼으로 걸어가다(GameScene.updateIdleDrift) 열린 패널을 만나면 멈춰서, 실제 데미지 단계와
  // 무관하게 2단계(30% 이하)의 더 처진 눈/큰 입 텍스처를 "화난 표정"으로 잠깐 띄운다 — GameScene이
  // BOSS_IDLE_PANEL_PUSH_HOLD_MS 뒤에 endPanelPush()로 되돌리고 패널을 닫는다. 더 급한 반응
  // (피격 X_X/불뿜기/방패 썩소)이 떠 있는 동안엔 덮어쓰지 않는다 — 방패를 든 채 방치돼 나가기 버튼으로
  // 걸어가도 썩소가 화난 표정으로 안 바뀌게.
  // GameScene.checkBossAgainstPanel은 isPushingPanel이 true인 동안 flyOutToLeftWall 호출을 건너뛴다.
  startPanelPush() {
    if (this.isPushingPanel) return;
    if (this.fireBreathEvent || this.hurtFaceEvent || this.isShielded) return;
    this.isPushingPanel = true;
    this.happyFaceEvent?.remove();
    this.happyFaceEvent = null;
    this.blinkEvent?.remove();
    this.blinkEvent = null;
    this.sprite.setTexture(`boss_${this.bossTypeId}_d${MAX_DAMAGE_STAGE}`);
  }

  // 미는 연출이 끝나거나(패널 닫힘), 상호작용으로 드리프트 자체가 취소되면 실제 데미지 단계에 맞는 표정으로 되돌린다.
  endPanelPush() {
    if (!this.isPushingPanel) return;
    this.isPushingPanel = false;
    if (!this.hurtFaceEvent && !this.fireBreathEvent) this.sprite.setTexture(this.getBaseTextureKey());
  }

  // 방치(idle)로 나가기 버튼 쪽으로 걷기 시작하기 전, GameScene.updateIdleDrift가 잠깐 자는 척하는
  // 단계에서 호출한다. Zzz 텍스트/하품 방울 같은 부가 연출은 GameScene이 맡고, 여기서는 표정(감은
  // 눈)만 담당한다. 더 급한 반응(피격/불뿜기/방패)이 떠 있으면 잠들지 않는다.
  startSleeping() {
    if (this.isSleeping) return;
    if (this.fireBreathEvent || this.hurtFaceEvent || this.isShielded) return;
    this.isSleeping = true;
    this.happyFaceEvent?.remove();
    this.happyFaceEvent = null;
    this.blinkEvent?.remove();
    this.blinkEvent = null;
    this.sprite.setTexture(`boss_sleep_${this.bossTypeId}`);
  }

  // 상호작용이 돌아오거나(GameScene.markInteraction) 실제로 걷기 시작할 때 호출해 깨운다.
  endSleeping() {
    if (!this.isSleeping) return;
    this.isSleeping = false;
    if (!this.hurtFaceEvent && !this.fireBreathEvent && !this.isShielded) this.sprite.setTexture(this.getBaseTextureKey());
  }

  flash(color) {
    this.sprite.setTintFill(color);
    this.scene.time.delayedCall(BOSS_FLASH_DURATION, () => this.sprite.clearTint());
  }

  // 디버거(브레이크포인트) 전용 CC — 이 게임은 보스가 자체 행동을 안 해서 "기절"은 의미가 없어,
  // 대신 GameScene의 drag 리스너가 isFrozen을 보고 드래그 이동을 막는 "위치 고정"으로 구현했다.
  // 연타로 다시 맞으면 기존 타이머를 새로 잡아 시간을 갱신한다(showHurtFace와 같은 패턴).
  freeze(duration = DEBUGGER_FREEZE_DURATION) {
    this.isFrozen = true;
    this.freezeEvent?.remove();
    this.freezeEvent = this.scene.time.delayedCall(duration, () => {
      this.isFrozen = false;
      this.freezeEvent = null;
    });
  }

  // 체력 최저 단계(damageStage === MAX_DAMAGE_STAGE)에서만 가끔 한 번씩 발동하는 무적 방패 — 정확한
  // 확률 대신 랜덤 간격마다 그 순간 조건을 만족하는지만 확인하는 방식으로 "가끔"을 구현한다.
  // 조건을 못 만족해도(체력을 회복했거나 이미 방패 중이거나) 다음 확인은 항상 다시 예약해서 루프가 안 끊기게 한다.
  scheduleNextShieldCheck() {
    const delay = Phaser.Math.Between(BOSS_SHIELD_CHECK_MIN_INTERVAL, BOSS_SHIELD_CHECK_MAX_INTERVAL);
    this.shieldCheckEvent = this.scene.time.delayedCall(delay, () => this.tryActivateShield());
  }

  tryActivateShield() {
    if (this.canActivateShield()) this.activateShield();
    this.scheduleNextShieldCheck();
  }

  // 방패를 다시 띄워도 되는지 — 최저 체력 단계 + 이미 방패 중이 아님 + 살아있음 + 마지막으로 깨진 뒤
  // BOSS_SHIELD_REARM_COOLDOWN_MS가 지났는지까지 본다. 이 쿨다운이 없으면 최저 체력에서 계속
  // 공격을 몰아붙일 때 방패가 깨졌다 금방 다시 뜨기를 반복해서 "막기!" 대사가 너무 자주 떴다.
  canActivateShield() {
    return this.damageStage >= MAX_DAMAGE_STAGE
      && !this.isShielded
      && !this.isDead()
      && (this.scene.time.now - this.lastShieldEndTime) >= BOSS_SHIELD_REARM_COOLDOWN_MS;
  }

  // 방패를 두르는 동안 CombatSystem.handleHit이 막기 확률(BOSS_SHIELD_BLOCK_CHANCE)을 굴려 대부분의
  // 데미지를 무효 처리한다 (boss.isShielded 참고). 지속시간 타이머가 따로 없고, 확률에 실패해 실제로
  // 맞은 횟수(shieldBreachCount)가 BOSS_SHIELD_BREACH_LIMIT에 도달할 때까지(registerShieldBreach)
  // 그대로 유지된다. 텍스처는 보스 타입/데미지 단계와 무관한 단일 이미지라 한 번만 생성해두고 재사용한다.
  activateShield() {
    this.isShielded = true;
    this.shieldBreachCount = 0;
    if (!this.shieldSprite) {
      this.shieldSprite = this.scene.add.image(0, 0, 'boss_shield').setDepth(this.sprite.depth + 1);
    }
    this.shieldSprite.setVisible(true);
    this.updateShieldPosition(this.lastShieldAimPoint);
    this.showSmirkFace();
    this.onShieldActivate?.();
  }

  // 막기 확률에 실패해 실제로 몸통을 맞을 때마다(CombatSystem.handleHit) 호출 — 그 히트 자체는
  // 그대로 데미지 처리되고, 이 카운트가 BOSS_SHIELD_BREACH_LIMIT에 도달해야 방패가 완전히 사라진다.
  // 그 전까지는 방패가 계속 남아 있어서 이후 히트도 다시 확률대로 막을 수 있다.
  registerShieldBreach() {
    this.shieldBreachCount += 1;
    if (this.shieldBreachCount >= BOSS_SHIELD_BREACH_LIMIT) this.deactivateShield();
  }

  // 방패를 완전히 정리한다 — 확률 실패가 임계치까지 쌓였을 때(registerShieldBreach)만 호출된다.
  // isShielded를 직접 보고 가드하는 tryBlink/showHappyFace/startPanelPush가 이 시점부터 다시 정상 동작한다.
  deactivateShield() {
    if (!this.isShielded) return;
    this.isShielded = false;
    this.shieldBreachCount = 0;
    this.lastShieldEndTime = this.scene.time.now;
    this.shieldSprite?.setVisible(false);
    this.sprite.setTexture(this.getBaseTextureKey());
  }

  // 방패를 두르는 동안 짓는 "썩소". 자체 타이머 없이 isShielded가 살아있는 동안 계속 유지되다가
  // deactivateShield()가 텍스처를 되돌린다 — tryBlink/showHappyFace/startPanelPush는 isShielded를
  // 직접 보고 이 표정을 덮어쓰지 않게 가드한다.
  showSmirkFace() {
    this.happyFaceEvent?.remove();
    this.happyFaceEvent = null;
    this.blinkEvent?.remove();
    this.blinkEvent = null;
    this.sprite.setTexture(`boss_smirk_${this.bossTypeId}`);
  }

  // 드래그(잡기)를 새로 시작할 때 흔들기 판정 상태를 초기화한다. GameScene의 'dragstart'에서 호출.
  resetShakeTracking() {
    this.shakeRefDx = null;
    this.shakeRefDy = null;
    this.shakeReversalTimestamps = [];
    this.shakeActiveSince = null;
    this.shakeTriggered = false;
  }

  // 드래그 중 매 이동(dx,dy)을 받아 "흔들기"인지 판정한다.
  // 기준 방향(shakeRefDx/Dy)은 매 이동마다 갱신하지 않고 실제로 방향이 뒤집힐 때만 갱신한다 — 한
  // 스윙(예: 왼쪽 끝까지 갔다가 되돌아오는 한쪽 이동) 안에는 같은 방향 샘플이 여러 번 들어오는데,
  // 기준을 매번 최신 샘플로 갱신해버리면 그 샘플들끼리도 "반전"처럼 보여 흔들기 판정이 거의 항상
  // 상쇄돼 버린다(실측 버그) — 반전은 스윙이 꺾이는 순간에만 한 번 세야 한다.
  // 최근 SHAKE_REVERSAL_WINDOW_MS 안에 반전이 SHAKE_MIN_REVERSALS_IN_WINDOW번 이상 쌓이면 "흔드는 중"으로
  // 보고, 그 상태가 SHAKE_VOMIT_TRIGGER_MS만큼 끊기지 않고 이어지면 구토 연출을 1회 띄운다.
  registerDragMovement(dx, dy) {
    // 너무 작은 이동은 손떨림/드래그 잡음이라 무시하고 기준 방향도 그대로 둔다.
    if (dx * dx + dy * dy < SHAKE_MIN_MOVE_PX * SHAKE_MIN_MOVE_PX) return;

    const now = this.scene.time.now;
    if (this.shakeRefDx == null) {
      this.shakeRefDx = dx;
      this.shakeRefDy = dy;
      return;
    }

    const dot = dx * this.shakeRefDx + dy * this.shakeRefDy;
    if (dot >= 0) return; // 기준 방향과 같은 쪽으로 계속 이어지는 중 — 아직 반전이 아니다.

    // 방향이 실제로 뒤집혔다 — 반전 1회로 기록하고, 다음 반전 판정 기준을 이 방향으로 새로 잡는다.
    this.shakeRefDx = dx;
    this.shakeRefDy = dy;
    this.shakeReversalTimestamps.push(now);
    this.shakeReversalTimestamps = this.shakeReversalTimestamps.filter(
      (t) => now - t <= SHAKE_REVERSAL_WINDOW_MS,
    );

    if (this.shakeReversalTimestamps.length < SHAKE_MIN_REVERSALS_IN_WINDOW) {
      this.shakeActiveSince = null; // 반전 빈도가 떨어짐 — 흔드는 흐름이 끊겼다고 보고 리셋.
      return;
    }
    if (this.shakeActiveSince == null) this.shakeActiveSince = now;
    if (!this.shakeTriggered && now - this.shakeActiveSince >= SHAKE_VOMIT_TRIGGER_MS) {
      this.shakeTriggered = true;
      this.showVomit();
    }
  }

  // 흔들기 트리거로 뜨는 구토 연출. 다른 표정 반응(피격/불뿜기/웃음/깜빡임)보다 우선하며,
  // 유지 시간이 끝나면 현재 데미지 단계의 평상시 텍스처로 복귀한다.
  showVomit() {
    this.hurtFaceEvent?.remove();
    this.hurtFaceEvent = null;
    this.fireBreathEvent?.remove();
    this.fireBreathEvent = null;
    this.happyFaceEvent?.remove();
    this.happyFaceEvent = null;
    this.blinkEvent?.remove();
    this.blinkEvent = null;
    this.sprite.setTexture(`boss_smirk_${this.bossTypeId}`);
  }

  // 방패가 떠 있는 동안 지금 공격이 들어오는 방향(플레이어가 들고 있는 무기의 실제 타격 지점,
  // GameScene.update이 weaponManager.getHitPoint(activeWeapon)를 넘겨준다)을 바라보며 그쪽 옆구리에
  // 붙어 막는다. 무기를 놓아서 aimPoint가 없는 프레임에는 방향을 그대로 유지해서(shieldAngle), 방패가
  // 갑자기 원위치로 튀지 않게 한다.
  // 보스는 사각형(폭≠높이)이라 반지름 하나로는 몸통 실루엣에 안 맞아서, 폭/높이를 각각 축으로 쓰는
  // 타원 경로로 근사해 몸통 겉을 두른다 — margin을 작게 잡아 몸통에 바짝 붙여서 무기와 몸통 사이를
  // 실제로 가로막는 것처럼 보이게 한다.
  updateShieldPosition(aimPoint) {
    if (!this.shieldSprite?.visible) return;
    if (aimPoint) {
      this.lastShieldAimPoint = aimPoint;
      this.shieldAngle = Phaser.Math.Angle.Between(this.bodyCenterX, this.bodyCenterY, aimPoint.x, aimPoint.y);
    }
    const angle = this.shieldAngle ?? Math.PI;
    const margin = 2;
    const x = this.bodyCenterX + Math.cos(angle) * (this.bodyWidth / 2 + margin);
    const y = this.bodyCenterY + Math.sin(angle) * (this.bodyHeight / 2 + margin);
    this.shieldSprite.setPosition(x, y);
    this.vomitEvent?.remove();
    this.sprite.setTexture(`boss_vomit_${this.bossTypeId}_d${this.damageStage}`);
    this.scene.sound.play('boss_vomit');
    // 구토 자체가 데미지 이벤트 — GameScene이 combat.applyVomitDamage()로 실제 데미지/점수를 처리하고
    // 여기서는 팝업/스파크가 뜰 위치(입 근처)만 알려준다.
    this.onVomit?.(this.bodyCenterX, this.bodyCenterY);
    this.vomitEvent = this.scene.time.delayedCall(BOSS_VOMIT_DURATION, () => {
      this.vomitEvent = null;
      this.sprite.setTexture(this.getBaseTextureKey());
    });
  }

  // 피격 시 잠깐 눈이 X_X로 바뀜. 연타 중에는 매번 타이머를 새로 잡아 원래 표정으로 너무 빨리 돌아오지 않게 한다.
  // 불 뿜는 연출이 떠 있는 동안은 X_X로 덮어쓰지 않는다 (불 뿜기가 우선). 웃는 표정 중에 맞으면 그건 덮어써도 된다.
  showHurtFace() {
    if (this.fireBreathEvent || this.isShielded || this.vomitEvent) return;
    this.hurtFaceEvent?.remove();
    this.happyFaceEvent?.remove();
    this.happyFaceEvent = null;
    this.blinkEvent?.remove();
    this.blinkEvent = null;
    this.sprite.setTexture(`boss_hurt_${this.bossTypeId}_d${this.damageStage}`);
    this.hurtFaceEvent = this.scene.time.delayedCall(BOSS_HURT_FACE_DURATION, () => {
      this.hurtFaceEvent = null;
      this.sprite.setTexture(this.getBaseTextureKey());
    });
  }

  // 최근 COMBO_WINDOW_MS 안에 쌓인 히트 수가 COMBO_HIT_THRESHOLD를 넘으면 불 뿜기 연출을 띄운다.
  // 순수 비주얼 트리거라 데미지 계산에는 관여하지 않는다 — hitCount는 이번 프레임에 동시에 겹친 히트 수.
  // 체력이 FIRE_BREATH_MIN_DAMAGE_STAGE 단계 이상 깎이기 전에는(=풀피에 가까우면) 콤보를 채워도 무시한다.
  // 계속 연타하면 조건을 곧바로 다시 채우므로, BOSS_FIRE_BREATH_COOLDOWN_MS가 지나기 전엔 재발동을 막는다.
  registerHits(hitCount) {
    const now = this.scene.time.now;
    for (let i = 0; i < hitCount; i += 1) this.recentHitTimestamps.push(now);
    this.recentHitTimestamps = this.recentHitTimestamps.filter((t) => now - t <= COMBO_WINDOW_MS);

    const lowEnoughHp = this.damageStage >= FIRE_BREATH_MIN_DAMAGE_STAGE;
    const cooledDown = now - this.lastFireBreathTime >= BOSS_FIRE_BREATH_COOLDOWN_MS;
    if (lowEnoughHp && cooledDown && this.recentHitTimestamps.length >= COMBO_HIT_THRESHOLD) {
      this.recentHitTimestamps = [];
      this.lastFireBreathTime = now;
      this.showFireBreath();
    }
  }

  // 콤보로 터지는 "불 뿜기" 표정 + 효과음. X_X 표정보다 우선하며, 끝나면 현재 데미지 단계의 평상시 텍스처로 복귀한다.
  // 구토 연출이 떠 있는 동안은 덮어쓰지 않는다(구토가 우선).
  showFireBreath() {
    if (this.vomitEvent) return;
    this.hurtFaceEvent?.remove();
    this.hurtFaceEvent = null;
    this.happyFaceEvent?.remove();
    this.happyFaceEvent = null;
    this.blinkEvent?.remove();
    this.blinkEvent = null;
    this.fireBreathEvent?.remove();
    this.sprite.setTexture(`boss_fire_${this.bossTypeId}_d${this.damageStage}`);
    this.scene.sound.play('boss_fire_roar');
    this.fireBreathEvent = this.scene.time.delayedCall(BOSS_FIRE_BREATH_DURATION, () => {
      this.fireBreathEvent = null;
      this.sprite.setTexture(this.getBaseTextureKey());
    });
  }

  // 쓰다듬을 때 잠깐 보여주는 웃는 표정. 맞아서 뜨는 X_X/불뿜기보다는 우선순위가 낮아서, 둘 중
  // 하나라도 떠 있으면(더 급한 반응이 진행 중이면) 무시한다. HP 단계와 무관한 표정이라
  // boss_happy_${id} 텍스처엔 데미지 단계 구분이 없다(createBossHappyCanvas 참고).
  showHappyFace() {
    if (this.fireBreathEvent || this.hurtFaceEvent || this.isShielded || this.isSleeping || this.vomitEvent) return;
    this.happyFaceEvent?.remove();
    this.blinkEvent?.remove();
    this.blinkEvent = null;
    this.sprite.setTexture(`boss_happy_${this.bossTypeId}`);
    this.happyFaceEvent = this.scene.time.delayedCall(BOSS_HAPPY_FACE_DURATION, () => {
      this.happyFaceEvent = null;
      this.sprite.setTexture(this.getBaseTextureKey());
    });
  }

  // 다음 깜빡임을 랜덤 간격 뒤로 예약한다 — 실제 눈 깜빡임처럼 일정 주기가 아니라 불규칙하게.
  scheduleNextBlink() {
    const delay = Phaser.Math.Between(BOSS_BLINK_MIN_INTERVAL, BOSS_BLINK_MAX_INTERVAL);
    this.scene.time.delayedCall(delay, () => this.tryBlink());
  }

  // 더 급한 표정(피격/불뿜기/웃음/썩소)이 떠 있지 않을 때만 깜빡이고, 그 여부와 상관없이 항상 다음
  // 깜빡임을 다시 예약해서 깜빡임 루프 자체는 끊기지 않게 한다.
  tryBlink() {
    if (!this.fireBreathEvent && !this.hurtFaceEvent && !this.happyFaceEvent && !this.isShielded && !this.isSleeping && !this.vomitEvent) {
      this.sprite.setTexture(`boss_blink_${this.bossTypeId}_d${this.damageStage}`);
      this.blinkEvent = this.scene.time.delayedCall(BOSS_BLINK_DURATION, () => {
        this.blinkEvent = null;
        this.sprite.setTexture(this.getBaseTextureKey());
      });
    }
    this.scheduleNextBlink();
  }
}
