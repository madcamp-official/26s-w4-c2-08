import Phaser from 'phaser';
import { HIT_COOLDOWN, BASE_DAMAGE_MIN, BASE_DAMAGE_MAX } from '../config/constants.js';

export default class CombatSystem {
  constructor(scene, boss, onHit) {
    this.scene = scene;
    this.boss = boss;
    this.onHit = onHit;
    this.weaponManager = null;
    this.score = 0;
    this.lastHitTime = 0;
  }

  handleHit() {
    const now = this.scene.time.now;
    if (now - this.lastHitTime < HIT_COOLDOWN) return;
    this.lastHitTime = now;

    const overlappingWeapons = this.weaponManager.getOverlappingWeapons();
    const hits = overlappingWeapons.length > 0
      ? overlappingWeapons.map((weapon) => ({
        amount: Math.round(this.rollDamage() * weapon.damageMultiplier),
        isBoosted: weapon.stackLevel > 1,
        x: weapon.x,
        y: weapon.y,
      }))
      : [{ amount: this.rollDamage(), isBoosted: false, x: this.boss.sprite.x, y: this.boss.sprite.y }];

    const damage = hits.reduce((sum, hit) => sum + hit.amount, 0);
    this.boss.takeDamage(damage);
    this.score += damage;

    const defeated = this.boss.isDead();
    const deathPosition = defeated ? { x: this.boss.sprite.x, y: this.boss.sprite.y } : null;
    if (defeated) {
      this.boss.respawn();
    }

    this.onHit(hits, defeated, deathPosition);
  }

  rollDamage() {
    return Phaser.Math.Between(BASE_DAMAGE_MIN, BASE_DAMAGE_MAX);
  }
}
