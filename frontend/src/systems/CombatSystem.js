import Phaser from 'phaser';
import { HIT_COOLDOWN, BASE_DAMAGE_MIN, BASE_DAMAGE_MAX } from '../config/constants.js';

export default class CombatSystem {
  constructor(scene, boss, onHit) {
    this.scene = scene;
    this.boss = boss;
    this.onHit = onHit;
    this.score = 0;
    this.lastHitTime = 0;
  }

  handleHit() {
    const now = this.scene.time.now;
    if (now - this.lastHitTime < HIT_COOLDOWN) return;
    this.lastHitTime = now;

    const damage = this.rollDamage();
    this.boss.takeDamage(damage);
    this.score += damage;

    if (this.boss.isDead()) {
      this.boss.respawn();
    }

    this.onHit();
  }

  rollDamage() {
    return Phaser.Math.Between(BASE_DAMAGE_MIN, BASE_DAMAGE_MAX);
  }
}
