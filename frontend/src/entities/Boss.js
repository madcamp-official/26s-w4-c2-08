import Phaser from 'phaser';
import { BOSS_SPAWN, BOSS_SHAKE_MAGNITUDE, BOSS_SHAKE_SEGMENT_DURATION, BOSS_FLASH_DURATION } from '../config/constants.js';

export default class Boss {
  constructor(scene) {
    this.scene = scene;
    this.sprite = scene.physics.add.image(BOSS_SPAWN.x, BOSS_SPAWN.y, 'boss');
    this.maxHp = 1000;
    this.hp = this.maxHp;

    this.sprite.setCollideWorldBounds(true);
    this.sprite.setInteractive({ draggable: true });
    scene.input.setDraggable(this.sprite);
  }

  get displayWidth() {
    return this.sprite.displayWidth;
  }

  setPosition(x, y) {
    this.sprite.setPosition(x, y);
  }

  takeDamage(amount) {
    this.hp -= amount;
  }

  isDead() {
    return this.hp <= 0;
  }

  respawn() {
    this.hp = this.maxHp;
    this.setPosition(BOSS_SPAWN.x, BOSS_SPAWN.y);
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
}
