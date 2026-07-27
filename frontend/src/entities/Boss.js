import Phaser from 'phaser';
import {
  BOSS_SPAWN,
  BOSS_SHAKE_MAGNITUDE,
  BOSS_SHAKE_SEGMENT_DURATION,
  BOSS_FLASH_DURATION,
  BOSS_HURT_FACE_DURATION,
} from '../config/constants.js';
import { MAX_DAMAGE_STAGE } from './bossSprite.js';

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

  setPosition(x, y) {
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
    this.sprite.setTexture(this.getBaseTextureKey());
  }

  // 보스 선택 패널에서 다른 캐릭터를 고르면 호출 — HP/위치는 그대로 두고 텍스처만 교체
  setBossType(bossTypeId) {
    this.bossTypeId = bossTypeId;
    this.hurtFaceEvent?.remove();
    this.hurtFaceEvent = null;
    this.sprite.setTexture(this.getBaseTextureKey());
  }

  // 히트 시 짧게 흔들렸다가 원위치. 드래그 중이면 다음 드래그 좌표가 곧바로 덮어써서 자연히 묻힌다.
  shake() {
    const originX = this.sprite.x;
    const originY = this.sprite.y;
    this.scene.tweens.add({
      targets: this.sprite,
      x: originX + Phaser.Math.Between(-BOSS_SHAKE_MAGNITUDE, BOSS_SHAKE_MAGNITUDE),
      y: originY + Phaser.Math.Between(-BOSS_SHAKE_MAGNITUDE, BOSS_SHAKE_MAGNITUDE),
      duration: BOSS_SHAKE_SEGMENT_DURATION,
      yoyo: true,
      repeat: 1,
      onComplete: () => this.sprite.setPosition(originX, originY),
    });
  }

  flash(color) {
    this.sprite.setTintFill(color);
    this.scene.time.delayedCall(BOSS_FLASH_DURATION, () => this.sprite.clearTint());
  }

  // 피격 시 잠깐 눈이 X_X로 바뀜. 연타 중에는 매번 타이머를 새로 잡아 원래 표정으로 너무 빨리 돌아오지 않게 한다.
  showHurtFace() {
    this.hurtFaceEvent?.remove();
    this.sprite.setTexture(`boss_hurt_${this.bossTypeId}_d${this.damageStage}`);
    this.hurtFaceEvent = this.scene.time.delayedCall(BOSS_HURT_FACE_DURATION, () => {
      this.hurtFaceEvent = null;
      this.sprite.setTexture(this.getBaseTextureKey());
    });
  }
}
