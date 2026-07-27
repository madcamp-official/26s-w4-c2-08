import Phaser from 'phaser';
import {
  HIT_COOLDOWN,
  BASE_DAMAGE_MIN,
  BASE_DAMAGE_MAX,
  BOSS_PANEL_PUSH_DAMAGE_MULTIPLIER,
} from '../config/constants.js';

export default class CombatSystem {
  constructor(scene, boss, onHit) {
    this.scene = scene;
    this.boss = boss;
    this.onHit = onHit;
    this.weaponManager = null;
    this.score = 0;
    this.lastHitTime = 0;
  }

  // triggerWeapon: 이 히트를 유발한 실제 무기/투사체. 빠르게 움직이는 투사체는 overlap 콜백이 발생한 시점과
  // 여기서 겹침을 다시 계산하는 시점 사이에 이미 경계를 지나쳐 있어 getOverlappingDamageDealers()가 못 찾을 수 있는데,
  // 그 경우 보스 자신의 좌표를 쓰면 방향이 0벡터가 되어 넉백 방향이 항상 고정돼 버리므로 triggerWeapon으로 대체한다.
  handleHit(triggerWeapon) {
    const now = this.scene.time.now;
    if (now - this.lastHitTime < HIT_COOLDOWN) return;
    this.lastHitTime = now;

    const overlappingWeapons = this.weaponManager.getOverlappingDamageDealers();
    const hits = overlappingWeapons.length > 0
      ? overlappingWeapons.map((weapon) => ({
        amount: this.rollDamage(),
        x: weapon.x,
        y: weapon.y,
      }))
      : [{ amount: this.rollDamage(), x: triggerWeapon.x, y: triggerWeapon.y }];

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

  // 무기/배경 패널에 부딪혀 왼쪽 벽까지 날아갈 때 추가로 주는 보너스 데미지.
  // 연타 쿨다운(HIT_COOLDOWN)과 무관하게, 무기 히트와는 별개인 UI 충돌 이벤트로 취급한다.
  applyPanelPushDamage() {
    const amount = this.rollDamage() * BOSS_PANEL_PUSH_DAMAGE_MULTIPLIER;
    this.boss.takeDamage(amount);
    this.score += amount;

    const defeated = this.boss.isDead();
    const deathPosition = defeated ? { x: this.boss.sprite.x, y: this.boss.sprite.y } : null;
    if (defeated) {
      this.boss.respawn();
    }

    return { amount, defeated, deathPosition };
  }
}
