import Phaser from 'phaser';
import {
  HIT_COOLDOWN,
  BASE_DAMAGE_MIN,
  BASE_DAMAGE_MAX,
  BOSS_PANEL_PUSH_DAMAGE_MULTIPLIER,
  WEAPON_CATEGORIES,
  WEAPON_IDS,
  PET_COOLDOWN,
  HEAL_MIN,
  HEAL_MAX,
} from '../config/constants.js';

export default class CombatSystem {
  constructor(scene, boss, onHit) {
    this.scene = scene;
    this.boss = boss;
    this.onHit = onHit;
    this.onPet = null; // GameScene이 생성 후 설정 (weaponManager와 같은 방식)
    this.weaponManager = null;
    this.score = 0;
    this.lastHitTime = 0;
    this.lastPetTime = 0;
  }

  // triggerWeapon: 이 히트를 유발한 실제 무기/투사체. 빠르게 움직이는 투사체는 overlap 콜백이 발생한 시점과
  // 여기서 겹침을 다시 계산하는 시점 사이에 이미 경계를 지나쳐 있어 getOverlappingDamageDealers()가 못 찾을 수 있는데,
  // 그 경우 보스 자신의 좌표를 쓰면 방향이 0벡터가 되어 넉백 방향이 항상 고정돼 버리므로 triggerWeapon으로 대체한다.
  handleHit(triggerWeapon) {
    const now = this.scene.time.now;
    if (now - this.lastHitTime < HIT_COOLDOWN) return;
    this.lastHitTime = now;

    // HIT_COOLDOWN을 통과해 실제로 데미지 틱이 발생하는 순간에만 재생 — overlap 콜백 자체는 겹쳐있는
    // 동안 매 프레임 불려서 여기서 안 거르면 효과음이 끊임없이 겹쳐 재생된다.
    // 야구공 타격음은 방망이와 동일한 효과음을 그대로 쓴다.
    const isBatOrBall = triggerWeapon.category === WEAPON_CATEGORIES.PORTABLE
      || triggerWeapon.weaponId === WEAPON_IDS.BALL;
    if (isBatOrBall) {
      this.scene.sound.play('bat_hit');
    } else if (triggerWeapon.category === WEAPON_CATEGORIES.STATIC) {
      this.scene.sound.play('taser_shock');
    }

    // weaponId를 같이 넘겨서 GameScene.onHit이 무기별로 다른 이펙트(전기충격기 감전 등)를 고를 수 있게 한다.
    const overlappingWeapons = this.weaponManager.getOverlappingDamageDealers();
    const hits = overlappingWeapons.length > 0
      ? overlappingWeapons.map((weapon) => ({
        amount: this.rollDamage(),
        weaponId: weapon.weaponId,
        ...this.weaponManager.getHitPoint(weapon),
      }))
      : [{ amount: this.rollDamage(), weaponId: triggerWeapon.weaponId, ...this.weaponManager.getHitPoint(triggerWeapon) }];

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

  // 쓰다듬기(힐링) 전용 경로 — 데미지 계산(handleHit)과 완전히 분리한다. 점수/넉백/피격 표정 등
  // 전투 반응은 안 건드리고 체력만 회복시킨 뒤 GameScene이 하트/회복 팝업을 띄우게 콜백만 알려준다.
  handlePet(weapon) {
    const now = this.scene.time.now;
    if (now - this.lastPetTime < PET_COOLDOWN) return;
    this.lastPetTime = now;

    const amount = Phaser.Math.Between(HEAL_MIN, HEAL_MAX);
    this.boss.heal(amount);
    this.onPet?.(amount, this.weaponManager.getHitPoint(weapon));
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
