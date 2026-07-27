import Phaser from 'phaser';
import {
  BOSS_SPAWN,
  BOSS_KNOCKBACK_DISTANCE,
  BOSS_KNOCKBACK_OUT_DURATION,
  BOSS_PANEL_PUSH_DURATION,
  BOSS_FLASH_DURATION,
  BOSS_HURT_FACE_DURATION,
  COMBO_WINDOW_MS,
  COMBO_HIT_THRESHOLD,
  BOSS_FIRE_BREATH_DURATION,
  BOSS_FIRE_BREATH_COOLDOWN_MS,
  FIRE_BREATH_MIN_DAMAGE_STAGE,
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
    this.lastFireBreathTime = -Infinity;

    // 기본 물리 바디는 텍스처 전체(캔버스, 왼쪽/위 상태표시 여백 포함) 크기라 무기 overlap 판정 자체가
    // 그 여백까지 "몸통"으로 잡는다 — 방망이/투사체가 실제 그림에 닿기도 전에 먼저 겹침이 발생해서,
    // 특히 왼쪽·위에서 오는 다트가 몸에서 먼 자리에서 박히는 원인이었다. 바디를 실제 몸통 크기/위치로 줄인다.
    this.sprite.body.setSize(this.bodyWidth, this.bodyHeight, false);
    this.sprite.body.setOffset(BOSS_MARGIN_LEFT, BOSS_MARGIN_TOP);

    this.sprite.setCollideWorldBounds(true);
    this.sprite.setInteractive({ draggable: true });
    scene.input.setDraggable(this.sprite);
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

  // 히트/오버랩 판정 전용 몸통 사각형 (world 좌표). 방망이 캡슐(batOverlapsBoss)과 투사체 원
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

  // HP 변화에 따라 데미지 단계를 갱신. 히트 직후라 X_X 표정이 잠깐 떠 있는 중이면(hurtFaceEvent 존재)
  // 텍스처는 건드리지 않고 상태값만 갱신해둔다 — X_X가 끝나고 복귀할 때 getBaseTextureKey()가 반영한다.
  updateVisualState() {
    const ratio = Math.max(this.hp, 0) / this.maxHp;
    const stage = computeDamageStage(ratio);
    if (stage === this.damageStage) return;

    this.damageStage = stage;
    if (!this.hurtFaceEvent) this.sprite.setTexture(this.getBaseTextureKey());
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
    this.recentHitTimestamps = [];
    this.lastFireBreathTime = -Infinity;
    this.sprite.setTexture(this.getBaseTextureKey());
  }

  // 보스 선택 패널에서 다른 캐릭터를 고르면 호출 — HP/위치는 그대로 두고 텍스처만 교체
  setBossType(bossTypeId) {
    this.bossTypeId = bossTypeId;
    this.hurtFaceEvent?.remove();
    this.hurtFaceEvent = null;
    this.fireBreathEvent?.remove();
    this.fireBreathEvent = null;
    this.sprite.setTexture(this.getBaseTextureKey());
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

  flash(color) {
    this.sprite.setTintFill(color);
    this.scene.time.delayedCall(BOSS_FLASH_DURATION, () => this.sprite.clearTint());
  }

  // 피격 시 잠깐 눈이 X_X로 바뀜. 연타 중에는 매번 타이머를 새로 잡아 원래 표정으로 너무 빨리 돌아오지 않게 한다.
  // 불 뿜는 연출이 떠 있는 동안은 X_X로 덮어쓰지 않는다 (불 뿜기가 우선).
  showHurtFace() {
    if (this.fireBreathEvent) return;
    this.hurtFaceEvent?.remove();
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
  showFireBreath() {
    this.hurtFaceEvent?.remove();
    this.hurtFaceEvent = null;
    this.fireBreathEvent?.remove();
    this.sprite.setTexture(`boss_fire_${this.bossTypeId}_d${this.damageStage}`);
    this.scene.sound.play('boss_fire_roar');
    this.fireBreathEvent = this.scene.time.delayedCall(BOSS_FIRE_BREATH_DURATION, () => {
      this.fireBreathEvent = null;
      this.sprite.setTexture(this.getBaseTextureKey());
    });
  }
}
