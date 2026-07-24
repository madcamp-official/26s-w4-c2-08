import { BOSS_SPAWN } from '../config/constants.js';

export default class Boss {
  constructor(scene) {
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
}
