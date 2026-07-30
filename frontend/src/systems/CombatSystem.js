import Phaser from 'phaser';
import {
  HIT_COOLDOWN,
  BASE_DAMAGE_MIN,
  BASE_DAMAGE_MAX,
  BOSS_PANEL_PUSH_DAMAGE_MULTIPLIER,
  WEAPON_DEFINITIONS,
  WEAPON_IDS,
  PET_COOLDOWN,
  HEAL_MIN,
  HEAL_MAX,
  BOSS_SHIELD_BLOCK_CHANCE,
  SHIELD_TAUNT_COOLDOWN,
  VOMIT_DAMAGE_MULTIPLIER,
  UREA_SOLUTION_EXPLOSION_DAMAGE_MULTIPLIER,
  UREA_IGNITE_STREAK_THRESHOLD,
  WASHING_MACHINE_DAMAGE_MULTIPLIER,
} from '../config/constants.js';

export default class CombatSystem {
  constructor(scene, boss, onHit) {
    this.scene = scene;
    this.boss = boss;
    this.onHit = onHit;
    this.onPet = null; // GameScene이 생성 후 설정 (weaponManager와 같은 방식)
    this.onBlocked = null; // 방패(Boss.isShielded)에 막혔을 때 GameScene이 설정 (onPet과 같은 방식)
    this.weaponManager = null;
    this.score = 0;
    this.lastHitTime = 0;
    this.lastPetTime = 0;
    this.lastShieldTauntTime = -Infinity; // "허 ㅋ" 조롱 사운드 마지막 재생 시각 — SHIELD_TAUNT_COOLDOWN 간격 유지용
    // 요소수를 다른 무기 안 섞고 연속으로(UREA_IGNITE_STREAK_THRESHOLD번) 맞히면 마찰로 자체 인화되는
    // 스트릭 카운터 — 보스 불 뿜기(fireBreathEvent)에 우연히 맞아야만 터지던 것과 별개로, 플레이어가
    // 직접 노려서 터뜨릴 수 있는 경로. LIPS_VOMIT_STREAK_THRESHOLD(Boss.registerLipsHit)와 같은 결의
    // "연속 판정"이지만 데미지 배율 자체를 바꿔야 해서 Boss가 아니라 여기(CombatSystem)에서 관리한다.
    this.ureaStreak = 0;
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
    // 무기별 타격음은 WEAPON_DEFINITIONS[id].hitSound로 정의 (야구공은 방망이와 같은 소리를 재사용).
    // hitVolume(기본 1)으로 권총처럼 센 무기만 더 크게 재생할 수 있다.
    const definition = WEAPON_DEFINITIONS[triggerWeapon.weaponId];
    // 채찍 등 회전 스윙 모션도 실제 히트 시점에만 — handleOverlap은 매 프레임 불려서 여기서 해야 한다.
    // 노트북(thrustSwing)은 제자리에서 도는 대신 뒤로 당겼다 내려찍는 위치 이동형 모션을 쓴다.
    if (definition?.thrustSwing) this.weaponManager.playThrustSwing(triggerWeapon);
    else if (definition?.meleeSwing) this.weaponManager.playMeleeSwing(triggerWeapon);
    // 말랑이 찌부 모션도 같은 이유로 여기서만 트리거한다.
    if (definition?.squishHit) this.weaponManager.playSquish(triggerWeapon);

    // 방패(Boss.isShielded)가 떠 있는 동안은 히트마다 BOSS_SHIELD_BLOCK_CHANCE 확률로 막아낸다 —
    // 막히면 무기 모션(스윙/찌부)만 재생하고 데미지 없이 GameScene.onBlocked로 "막힘" 반응만 보여주며
    // 방패는 그대로 유지된다. 막기에 실패하면(확률 밖) registerShieldBreach로 실패 횟수만 쌓고(방패는
    // BOSS_SHIELD_BREACH_LIMIT번 뚫려야 완전히 사라짐), 이번 히트는 return 없이 아래로 흘려보내
    // 진짜 몸통을 맞은 것처럼 정상 데미지 처리를 계속한다.
    // 숟가락은 애초에 damageMultiplier 0(데미지 없음, 혹만 자람)이라 막을 데미지 자체가 없으므로
    // 방패 확률 체크 자체를 건너뛴다 — 방패 중에도 혹은 항상 자란다.
    if (this.boss.isShielded && triggerWeapon.weaponId !== WEAPON_IDS.SPOON) {
      const blocked = Phaser.Math.FloatBetween(0, 1) < BOSS_SHIELD_BLOCK_CHANCE;
      if (blocked) {
        // 막을 때마다 매번 "허 ㅋ"를 틀면 겹쳐서 탕탕거리므로, SHIELD_TAUNT_COOLDOWN 간격을 두고
        // 그 사이는 튕기는 소리(shield_bounce)만 재생 — 조롱 사운드가 주기적으로 섞여 나오게 한다.
        if (now - this.lastShieldTauntTime >= SHIELD_TAUNT_COOLDOWN) {
          this.scene.sound.play('shield_block');
          this.lastShieldTauntTime = now;
        } else {
          this.scene.sound.play('shield_bounce');
        }
        this.onBlocked?.(this.weaponManager.getHitPoint(triggerWeapon));
        return;
      }
      this.boss.registerShieldBreach();
    }

    // hitSound가 배열이면(무기별 타격음 여러 개 등록) 매번 랜덤으로 하나 골라 재생 — 같은 소리 반복 방지.
    if (definition?.hitSound) {
      const hitSound = Array.isArray(definition.hitSound)
        ? Phaser.Utils.Array.GetRandom(definition.hitSound)
        : definition.hitSound;
      this.scene.sound.play(hitSound, { volume: definition.hitVolume ?? 1 });
    }
    // voiceSound: 타격음(hitSound)과 별개로 같이 재생하는 부가 사운드(기합, 바람 소리 등) — developer(기합), hair dryer(바람) 등.
    // 이미 재생 중이면(voiceSoundOnGrab로 집자마자 틀었거나, 직전 히트의 소리가 아직 안 끝났으면) 다시 안 틀어서
    // 헤어드라이기 바람 소리 같은 긴 클립이 HIT_COOLDOWN마다 겹쳐 쌓이지 않게 한다.
    if (definition?.voiceSound && !this.scene.sound.sounds.some((s) => s.key === definition.voiceSound && s.isPlaying)) {
      this.scene.sound.play(definition.voiceSound);
    }

    // weaponId를 같이 넘겨서 GameScene.onHit이 무기별로 다른 이펙트(전기충격기 감전 등)를 고를 수 있게 한다.
    // damageMultiplierOverride: WEAPON_DEFINITIONS의 고정 배율 대신 이 히트만 특별히 쓸 배율 —
    // 다이너마이트 연쇄 폭발(WeaponManager.detonateBomb)이 묶인 개수만큼 불어난 배율을 여기 실어 보낸다.
    // 요소수는 두 경로 중 하나로 인화되면 물풍선 배율 대신 UREA_SOLUTION_EXPLOSION_DAMAGE_MULTIPLIER로
    // 크게 터진다 — ①보스가 마침 불 뿜기 중(Boss.fireBreathEvent)일 때 맞음(우연) ②요소수로만 연속
    // UREA_IGNITE_STREAK_THRESHOLD번 맞혀서 자체 인화(플레이어가 직접 노려서 터뜨림). ignited 플래그로
    // GameScene에 넘겨서 스플래시 대신 폭발 이펙트(spawnGrenadeExplosionEffect)를 고르게 한다.
    const isUreaTrigger = triggerWeapon.weaponId === WEAPON_IDS.UREA_SOLUTION;
    this.ureaStreak = isUreaTrigger ? this.ureaStreak + 1 : 0;
    const streakIgnited = isUreaTrigger && this.ureaStreak >= UREA_IGNITE_STREAK_THRESHOLD;
    if (streakIgnited) this.ureaStreak = 0; // 터진 뒤엔 다시 처음부터 연타해야 재점화
    const isIgnitedUrea = (weaponId) => weaponId === WEAPON_IDS.UREA_SOLUTION && (!!this.boss.fireBreathEvent || streakIgnited);
    const overlappingWeapons = this.weaponManager.getOverlappingDamageDealers();
    const hits = overlappingWeapons.length > 0
      ? overlappingWeapons.map((weapon) => {
        const ignited = isIgnitedUrea(weapon.weaponId);
        return {
          amount: this.rollDamage(weapon.damageMultiplierOverride
            ?? (ignited ? UREA_SOLUTION_EXPLOSION_DAMAGE_MULTIPLIER : WEAPON_DEFINITIONS[weapon.weaponId]?.damageMultiplier)),
          weaponId: weapon.weaponId,
          ignited,
          ...this.weaponManager.getHitPoint(weapon),
        };
      })
      : [{
        amount: this.rollDamage(triggerWeapon.damageMultiplierOverride
          ?? (isIgnitedUrea(triggerWeapon.weaponId) ? UREA_SOLUTION_EXPLOSION_DAMAGE_MULTIPLIER : definition?.damageMultiplier)),
        weaponId: triggerWeapon.weaponId,
        ignited: isIgnitedUrea(triggerWeapon.weaponId),
        ...this.weaponManager.getHitPoint(triggerWeapon),
      }];

    const damage = hits.reduce((sum, hit) => sum + hit.amount, 0);
    this.boss.takeDamage(damage);
    this.score += damage;

    // 디버거(브레이크포인트)에 맞았으면 데미지와 별개로 잠깐 드래그 이동을 막는다 (Boss.freeze 주석 참고).
    if (hits.some((hit) => WEAPON_DEFINITIONS[hit.weaponId]?.freezesBoss)) {
      this.boss.freeze();
    }

    const defeated = this.boss.isDead();
    const deathPosition = defeated ? { x: this.boss.sprite.x, y: this.boss.sprite.y } : null;
    if (defeated) {
      this.boss.respawn();
    }

    this.onHit(hits, defeated, deathPosition);
  }

  // multiplier: 무기별 데미지 배율 (WEAPON_DEFINITIONS[id].damageMultiplier, 기본 1) — 기관총처럼
  // 연사가 빠른 대신 한 발이 약하거나, 권총처럼 느린 대신 한 발이 강한 무기를 표현하는 데 쓴다.
  rollDamage(multiplier = 1) {
    return Math.round(Phaser.Math.Between(BASE_DAMAGE_MIN, BASE_DAMAGE_MAX) * multiplier);
  }

  // 쓰다듬기(힐링) 전용 경로 — 데미지 계산(handleHit)과 완전히 분리한다. 점수/넉백/피격 표정 등
  // 전투 반응은 안 건드리고 체력만 회복시킨 뒤 GameScene이 하트/회복 팝업을 띄우게 콜백만 알려준다.
  handlePet(weapon) {
    const now = this.scene.time.now;
    if (now - this.lastPetTime < PET_COOLDOWN) return;
    this.lastPetTime = now;

    const definition = WEAPON_DEFINITIONS[weapon.weaponId];
    // 웃음소리처럼 재생 시간이 쿨다운(PET_COOLDOWN)보다 긴 petSound는 연타 시 여러 인스턴스가
    // 겹쳐 재생될 수 있어서, 같은 키가 이미 재생 중이면 새로 틀지 않고 넘어간다.
    if (definition?.petSound && !this.scene.sound.sounds.some((s) => s.key === definition.petSound && s.isPlaying)) {
      this.scene.sound.play(definition.petSound, { volume: definition.petVolume ?? 1 });
    }

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

  // 흔들어서 구토를 유발했을 때 주는 데미지. applyPanelPushDamage와 같은 방식으로 HIT_COOLDOWN과
  // 무관한 1회성 이벤트 데미지로 취급한다 — 무기로 때린 게 아니라 흔들기 자체가 유발한 반응이라서.
  applyVomitDamage() {
    const amount = this.rollDamage(VOMIT_DAMAGE_MULTIPLIER);
    this.boss.takeDamage(amount);
    this.score += amount;

    const defeated = this.boss.isDead();
    const deathPosition = defeated ? { x: this.boss.sprite.x, y: this.boss.sprite.y } : null;
    if (defeated) {
      this.boss.respawn();
    }

    return { amount, defeated, deathPosition };
  }

  // 세탁기 안에서 도는 동안 일정 간격(GameScene.applyWashingMachineDamageTick)으로 주는 데미지 —
  // 무기 오버랩이 아니라 흔들기/패널충돌과 같은 1회성 이벤트 데미지로 취급한다.
  applyWashingMachineDamage() {
    const amount = this.rollDamage(WASHING_MACHINE_DAMAGE_MULTIPLIER);
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
