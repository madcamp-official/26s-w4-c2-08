import Phaser from 'phaser';
import {
  CONTACT_OVERLAP,
  THROW_FIRE_INTERVAL,
  THROW_PROJECTILE_SPEED,
  THROW_PROJECTILE_HIT_RADIUS,
  PORTABLE_WEAPON_SIZE,
  WEAPON_CATEGORIES,
  WEAPON_DEFINITIONS,
  DART_STICK_DURATION,
  DART_EMBED_DEPTH,
} from '../config/constants.js';
import { getBaseballBatDimensions } from './weaponSprites.js';
import { capsuleIntersectsRect, pushRectOutOfCapsule } from '../systems/geometry.js';

// 방망이 텍스처는 로컬 기준 -45도로 미리 그려져 있다(그림→히트박스 좌표 변환은 weaponSprites.js 주석 참고).
// weapon.rotation으로 이 baked 각도를 상쇄해 배럴(헤드)이 항상 보스 쪽을 향하도록 돌리고,
// 히트박스(캡슐)도 같은 보스 방향 각도로 계산해서 그림과 판정이 항상 같이 움직이게 한다.
// PORTABLE_WEAPON_SIZE가 바뀌면 그림과 히트박스가 항상 같이 맞도록 getBaseballBatDimensions()에서 계산한다.
const BAT_DIMENSIONS = getBaseballBatDimensions(PORTABLE_WEAPON_SIZE);
const BAT_BAKED_ROTATION = -Math.PI / 4;
const BAT_AXIS_RADIUS = BAT_DIMENSIONS.barrelHalfWidth;

// 필드에 여러 개를 놓아두고 드래그/합체/버리기 하던 예전 방식 대신, 무기 패널에서 카테고리를 고른 뒤
// 필드를 누르고 있는 동안에만 그 자리에 무기 1개(activeWeapon)가 나타나 데미지를 주고, 손을 떼면 사라진다.
export default class WeaponManager {
  constructor(scene, boss, onOverlap) {
    this.scene = scene;
    this.boss = boss;
    this.onOverlap = onOverlap;
    this.activeWeapon = null;
    this.projectiles = [];
    this.stuckProjectiles = [];
  }

  // 선택된 무기(WEAPON_IDS)를 pointer 위치에 만들어 화면에 보이게 한다. 투척형은 즉시 자동 연사를 시작한다.
  spawnAt(weaponId, x, y) {
    this.releaseActiveWeapon();

    const { category, texture } = WEAPON_DEFINITIONS[weaponId];
    const weapon = this.scene.physics.add.image(x, y, texture);
    weapon.weaponId = weaponId;
    weapon.category = category;
    this.activeWeapon = weapon;

    if (category === WEAPON_CATEGORIES.THROW) {
      this.startFiring(weapon);
    } else {
      weapon.overlapCollider = this.scene.physics.add.overlap(this.boss.sprite, weapon, () => this.handleOverlap(weapon), null, this.scene);
      if (category === WEAPON_CATEGORIES.PORTABLE) this.updateBatRotation(weapon);
    }

    return weapon;
  }

  handleOverlap(weapon) {
    if (weapon.category === WEAPON_CATEGORIES.PORTABLE && !this.batOverlapsBoss(weapon)) return;
    this.onOverlap(weapon);
  }

  // 들고 있는 무기를 pointer 위치로 옮기되, 보스를 완전히 뚫고 지나가지 않도록 막는다 (히트 판정용 여백은 남김).
  moveActiveWeapon(x, y) {
    if (!this.activeWeapon) return;
    const resolved = this.resolveAgainstBoss(this.activeWeapon, x, y);
    this.activeWeapon.setPosition(resolved.x, resolved.y);
    if (this.activeWeapon.category === WEAPON_CATEGORIES.PORTABLE) this.updateBatRotation(this.activeWeapon);
  }

  // 보스(고정된 사각형)를 완전히 뚫고 지나가지 않도록 후보 좌표 (x,y)를 보정.
  // 방망이는 사각 프레임이 아니라 실제 대각선 실루엣(캡슐) 기준으로, 나머지는 사각 히트박스 기준으로 판정한다.
  // 어느 쪽이든 몸통 전용 사각형(Boss.bodyWidth/Height, 여백 제외)을 써서 상태 표시가 뜬 여백까지
  // 뚫지 못하는 벽처럼 취급하지 않는다 — 그 자리는 원래 빈 캔버스라 막을 이유가 없다. 이걸 캔버스
  // 전체(this.boss.sprite) 기준으로 하면 위/왼쪽 여백에서 무기가 진짜 몸통까지 다가가지도 못해서
  // (STATIC/THROW 아이콘) 정작 데미지 판정(getHitRect, 몸통 기준)엔 절대 안 닿는 문제가 있었다.
  resolveAgainstBoss(weapon, x, y) {
    const bossCenterX = this.boss.bodyCenterX;
    const bossCenterY = this.boss.bodyCenterY;
    const bossHalfW = this.boss.bodyWidth / 2;
    const bossHalfH = this.boss.bodyHeight / 2;

    if (weapon.category === WEAPON_CATEGORIES.PORTABLE) {
      const { x1, y1, x2, y2, radius } = this.getBatAxis({ x, y });
      const pushed = pushRectOutOfCapsule(bossCenterX, bossCenterY, bossHalfW, bossHalfH, x1, y1, x2, y2, radius, CONTACT_OVERLAP);
      return { x: x - (pushed.x - bossCenterX), y: y - (pushed.y - bossCenterY) };
    }
    const bossBody = { x: bossCenterX, y: bossCenterY, displayWidth: bossHalfW * 2, displayHeight: bossHalfH * 2 };
    return this.resolveOverlap(x, y, weapon.displayWidth / 2, weapon.displayHeight / 2, bossBody);
  }

  // 보스가 폭(90)보다 높이(70)가 짧은 비정사각형이라 x/y를 같은 half값으로 계산하면
  // 위아래 방향에서 실제 겹침 판정 범위보다 더 멀리 밀려나 데미지가 안 들어가는 문제가 있었다 —
  // 축마다 자신의 displayWidth/displayHeight를 각각 써서 계산한다.
  resolveOverlap(x, y, movingHalfW, movingHalfH, target) {
    const targetHalfW = target.displayWidth / 2;
    const targetHalfH = target.displayHeight / 2;
    const dx = x - target.x;
    const dy = y - target.y;
    const overlapX = movingHalfW + targetHalfW - Math.abs(dx);
    const overlapY = movingHalfH + targetHalfH - Math.abs(dy);

    if (overlapX > 0 && overlapY > 0) {
      if (overlapX < overlapY) {
        x = target.x + Math.sign(dx || 1) * (movingHalfW + targetHalfW - CONTACT_OVERLAP);
      } else {
        y = target.y + Math.sign(dy || 1) * (movingHalfH + targetHalfH - CONTACT_OVERLAP);
      }
    }
    return { x, y };
  }

  // 손을 떼면 들고 있던 무기를 화면에서 지운다 (투척형이면 연사도 같이 멈춤).
  releaseActiveWeapon() {
    const weapon = this.activeWeapon;
    if (!weapon) return;

    if (weapon.category === WEAPON_CATEGORIES.THROW) this.stopFiring(weapon);
    if (weapon.overlapCollider) weapon.overlapCollider.destroy();
    weapon.destroy();
    this.activeWeapon = null;
  }

  // 방망이 위치에서 보스를 바라보는 각도. 투사체 발사 각도 계산과 같은 패턴.
  getAngleToBoss(x, y) {
    return Phaser.Math.Angle.Between(x, y, this.boss.sprite.x, this.boss.sprite.y);
  }

  // 화면에 보이는 방망이가 항상 이 각도를 바라보도록 회전시킨다. 텍스처가 로컬 -45도로 baked되어 있어
  // 그만큼 보정해줘야 실제로 그려지는 배럴(헤드)이 목표 각도를 향한다.
  updateBatRotation(weapon) {
    weapon.rotation = this.getAngleToBoss(weapon.x, weapon.y) - BAT_BAKED_ROTATION;
  }

  // 방망이의 손잡이 끝→배럴 끝을 잇는 중심축 (world 좌표). 배럴(헤드)이 항상 보스를 향하도록 그리므로
  // 히트박스 축도 같은 보스 방향 각도로 계산해서 그림과 판정이 어긋나지 않게 한다.
  getBatAxis(weapon) {
    const angle = this.getAngleToBoss(weapon.x, weapon.y);
    const dx = Math.cos(angle) * BAT_DIMENSIONS.halfLen;
    const dy = Math.sin(angle) * BAT_DIMENSIONS.halfLen;
    return {
      x1: weapon.x - dx,
      y1: weapon.y - dy,
      x2: weapon.x + dx,
      y2: weapon.y + dy,
      radius: BAT_AXIS_RADIUS,
    };
  }

  // 이펙트(스파크/데미지 팝업)를 실제 맞은 자리에 띄우기 위한 좌표. weapon.x/y는 방망이의 회전 중심이라
  // 배럴(보스 쪽으로 항상 향하는 끝)과 멀리 떨어져 있을 수 있어서, 방망이는 배럴 끝(getBatAxis의 x2,y2)을
  // 쓰고 공처럼 그 자체가 이미 타격 지점인 투사체는 자기 좌표를 그대로 쓴다.
  getHitPoint(weapon) {
    if (weapon.category === WEAPON_CATEGORIES.PORTABLE) {
      const { x2, y2 } = this.getBatAxis(weapon);
      return { x: x2, y: y2 };
    }
    return { x: weapon.x, y: weapon.y };
  }

  // 방망이는 대각선 실루엣이라 사각 히트박스 전체 대신, 실제 그림에 맞춘 캡슐(축+두께)로 보스와의 겹침을 판정한다.
  // getBounds()(캔버스 전체) 대신 Boss.getHitRect()(여백 제외 몸통)를 써서 느낌표/분노 마크가 뜬
  // 여백을 때려도 히트로 안 잡히게 한다.
  batOverlapsBoss(weapon) {
    const { x1, y1, x2, y2, radius } = this.getBatAxis(weapon);
    return capsuleIntersectsRect(x1, y1, x2, y2, radius, this.boss.getHitRect());
  }

  // 야구공/총알 등 투사체는 둥근(또는 작은) 그림이라 사각 히트박스 대신 원(길이 0인 캡슐)으로 보스와의
  // 겹침을 판정한다. 반지름은 spawn 시 저장해둔 projectile.hitRadius(무기별 크기, 기본값 아래) 사용.
  projectileOverlapsBoss(projectile) {
    return capsuleIntersectsRect(
      projectile.x, projectile.y, projectile.x, projectile.y, projectile.hitRadius, this.boss.getHitRect(),
    );
  }

  // 전기충격기처럼 대각선/원이 아니라 그냥 네모난 휴대형 무기(STATIC)는 방망이 캡슐도, 투사체 원도
  // 안 맞아서 자기 표시 영역(getBounds) 그대로 사각-사각 겹침만 본다.
  rectOverlapsBoss(weapon) {
    const boss = this.boss.getHitRect();
    const bounds = weapon.getBounds();
    return bounds.x < boss.right && bounds.right > boss.x && bounds.y < boss.bottom && bounds.bottom > boss.y;
  }

  startFiring(launcher) {
    this.fireProjectile(launcher);
    const { fireInterval } = WEAPON_DEFINITIONS[launcher.weaponId];
    launcher.fireTimer = this.scene.time.addEvent({
      delay: fireInterval ?? THROW_FIRE_INTERVAL,
      loop: true,
      callback: () => this.fireProjectile(launcher),
    });
  }

  stopFiring(launcher) {
    if (launcher.fireTimer) {
      launcher.fireTimer.remove();
      launcher.fireTimer = null;
    }
  }

  // pelletCount/spreadAngleDeg(산탄총)가 있으면 이 각도 범위 안에 고르게 퍼진 여러 발을 동시에 만든다.
  // 사운드/반동은 발사 1회당 한 번만 나야 해서(펠릿 5개라고 5번 울리면 시끄럽다) 루프 밖에서 처리한다.
  fireProjectile(launcher) {
    const definition = WEAPON_DEFINITIONS[launcher.weaponId];
    const baseAngle = Phaser.Math.Angle.Between(launcher.x, launcher.y, this.boss.sprite.x, this.boss.sprite.y);
    const pelletCount = definition.pelletCount ?? 1;
    const spreadRad = Phaser.Math.DegToRad(definition.spreadAngleDeg ?? 0);

    for (let i = 0; i < pelletCount; i += 1) {
      const angleOffset = pelletCount > 1 ? spreadRad * (i / (pelletCount - 1) - 0.5) : 0;
      this.spawnProjectile(launcher, definition, baseAngle + angleOffset);
    }

    if (definition.fireSound) this.scene.sound.play(definition.fireSound);
    if (definition.recoilAngle) this.recoilKick(launcher, definition.recoilAngle);
  }

  // 투사체 한 발 생성 — angle은 fireProjectile이 계산해서 넘겨준 발사 각도(펠릿마다 다를 수 있음).
  spawnProjectile(launcher, definition, angle) {
    // projectileTextures(여러 색 중 랜덤, 다트)가 있으면 그중 하나, 없으면 단일 projectileTexture(공) 사용.
    const projectileTexture = definition.projectileTextures
      ? Phaser.Utils.Array.GetRandom(definition.projectileTextures)
      : definition.projectileTexture;
    const projectile = this.scene.physics.add.image(launcher.x, launcher.y, projectileTexture);
    // 히트 사운드 등에서 어떤 무기가 쐈는지 구분해야 해서(CombatSystem.handleHit) launcher의 무기 종류를 그대로 옮겨둔다.
    projectile.weaponId = launcher.weaponId;
    // 기본 물리 바디는 텍스처 전체(정사각)를 그대로 쓰는데, 그림은 둥글거나(공) 작게 그려져(총알) 네 모서리가
    // 비어있다. Arcade의 자체 겹침 판정부터 원형으로 잡아야 실제 그림 크기에 맞게 히트가 들어간다.
    // 총알처럼 텍스처 자체가 THROW_WEAPON_SIZE보다 작은 무기는 projectileHitRadius로 반지름을 따로 정의하고,
    // 오프셋도 그 무기의 실제 텍스처 크기(projectile.width) 기준으로 다시 계산해야 원이 텍스처 안에 맞게 들어간다.
    const hitRadius = definition.projectileHitRadius ?? THROW_PROJECTILE_HIT_RADIUS;
    const bodyOffset = (projectile.width - hitRadius * 2) / 2;
    projectile.hitRadius = hitRadius;
    projectile.body.setCircle(hitRadius, bodyOffset, bodyOffset);
    this.projectiles.push(projectile);

    const collider = this.scene.physics.add.overlap(this.boss.sprite, projectile, () => {
      this.onOverlap(projectile);
      if (definition.stickOnHit) this.stickProjectile(projectile);
      else this.destroyProjectile(projectile);
    }, null, this.scene);
    projectile.overlapCollider = collider;

    const speed = definition.projectileSpeed ?? THROW_PROJECTILE_SPEED;
    this.scene.physics.velocityFromRotation(angle, speed, projectile.body.velocity);
    // 다트처럼 뾰족한 투사체는 텍스처가 각도 0(오른쪽)을 보게 그려져 있어, baked 보정 없이
    // 이 발사 각도를 그대로 대입하면 날아가는 방향을 보게 된다.
    if (definition.rotateToTravel) projectile.rotation = angle;

    return projectile;
  }

  // 발사할 때마다 총 자체가 살짝 뒤로 젖혀졌다가 돌아오는 반동. position이 아니라 angle만 건드려서
  // moveActiveWeapon(드래그 중 매 프레임 setPosition)과 부딪히지 않게 한다. 연사 중 다음 발사가
  // 이전 반동이 끝나기 전에 겹치면 이전 트윈을 끊고 새로 시작해서 각도가 꼬이지 않게 한다.
  recoilKick(launcher, angleDeg) {
    this.scene.tweens.killTweensOf(launcher);
    launcher.angle = 0;
    this.scene.tweens.add({
      targets: launcher,
      angle: -angleDeg,
      duration: 45,
      yoyo: true,
      ease: 'Sine.easeOut',
    });
  }

  // 채찍/노트북처럼 "휘둘러서 때리는" STATIC 무기가 실제로 맞을 때(CombatSystem.handleHit, 쿨다운을
  // 통과한 순간)마다 재생하는 스윙 모션: 보스 반대쪽으로 먼저 홱 넘겼다가(windup) 보스 쪽으로 후려친 뒤
  // 원래 각도로 스프링백한다. handleOverlap(겹쳐있는 동안 매 프레임 호출)에서 하면 계속 재시작돼
  // 덜덜 떨리므로, 쿨다운이 걸린 실제 히트 시점에만 트리거해야 한다.
  playMeleeSwing(weapon) {
    this.scene.tweens.killTweensOf(weapon);
    const original = weapon.rotation;
    const toBoss = this.getAngleToBoss(weapon.x, weapon.y);
    const windup = original - (toBoss - original); // 때리는 방향(toBoss) 반대쪽으로 먼저 넘긴 각도

    this.scene.tweens.add({
      targets: weapon,
      rotation: windup,
      duration: 70,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: weapon,
          rotation: toBoss,
          duration: 90,
          ease: 'Back.easeIn',
          onComplete: () => {
            this.scene.tweens.add({
              targets: weapon,
              rotation: original,
              duration: 120,
              ease: 'Sine.easeOut',
            });
          },
        });
      },
    });
  }

  // 말랑이(squishHit)가 맞는 순간 재생하는 찌부 모션: 가로로 눌리고 세로로 부푼 뒤 원래 스케일로
  // 튕겨 돌아온다. 스윙(playMeleeSwing)과 달리 각도가 아니라 스케일만 건드려서 "말랑말랑" 눌리는
  // 느낌을 준다 — yoyo 트윈이라 별도 복원 없이 시작 스케일로 자동 복귀한다.
  playSquish(weapon) {
    this.scene.tweens.killTweensOf(weapon);
    const baseScaleX = weapon.scaleX;
    const baseScaleY = weapon.scaleY;
    this.scene.tweens.add({
      targets: weapon,
      scaleX: baseScaleX * 1.3,
      scaleY: baseScaleY * 0.7,
      duration: 80,
      yoyo: true,
      ease: 'Sine.easeOut',
    });
  }

  destroyProjectile(projectile) {
    this.projectiles = this.projectiles.filter((p) => p !== projectile);
    projectile.overlapCollider.destroy();
    projectile.destroy();
  }

  // stickOnHit 무기(다트)는 맞는 순간 사라지는 대신 그 자리에 박힌 채 잠깐 남는다. overlap은 겹쳐있는
  // 동안 매 프레임 다시 불리므로, 데미지가 중복으로 안 들어가게 콜라이더부터 바로 없애고 물리 이동만 멈춘 뒤
  // 일정 시간 후에 완전히 지운다 (화면 밖 이탈 정리 대상인 this.projectiles 목록에서도 즉시 뺀다).
  // 보스는 드래그로 계속 움직일 수 있어서, 박힌 순간의 world 좌표를 그대로 두면 보스가 움직인 뒤엔
  // 허공에 남아 보인다 — 보스 기준 상대 오프셋으로 저장해두고 매 프레임(updateStuckProjectiles) 따라가게 한다.
  stickProjectile(projectile) {
    this.projectiles = this.projectiles.filter((p) => p !== projectile);
    projectile.overlapCollider.destroy();

    // 맞은 자리에 그대로 멈추면 보스 표면 바로 바깥에 떠 보여서, 날아가던 방향(보스 쪽)으로
    // DART_EMBED_DEPTH만큼 더 밀어 넣어 실제로 몸에 박힌 것처럼 보이게 한다.
    // boss.sprite.x/y는 캔버스 중심이라 실제 몸통 중심과 다르다(왼쪽/위 여백 때문에 몸통이 오른쪽/아래로
    // 치우쳐 그려짐, bossSprite.js 참고) — sprite 중심을 쓰면 위/왼쪽에서 오는 다트가 덜 파고든 것처럼
    // 보여서 bodyCenterX/Y(Boss.js, 여백 제외한 실제 몸통 중심)를 기준으로 한다.
    const embedAngle = Phaser.Math.Angle.Between(projectile.x, projectile.y, this.boss.bodyCenterX, this.boss.bodyCenterY);
    projectile.x += Math.cos(embedAngle) * DART_EMBED_DEPTH;
    projectile.y += Math.sin(embedAngle) * DART_EMBED_DEPTH;

    projectile.body.stop();
    projectile.body.enable = false;

    const stuck = {
      projectile,
      offsetX: projectile.x - this.boss.sprite.x,
      offsetY: projectile.y - this.boss.sprite.y,
    };
    this.stuckProjectiles.push(stuck);

    this.scene.time.delayedCall(DART_STICK_DURATION, () => {
      this.stuckProjectiles = this.stuckProjectiles.filter((s) => s !== stuck);
      projectile.destroy();
    });
  }

  // 박힌 다트들을 보스 위치 변화에 맞춰 같이 옮긴다 (GameScene.update에서 매 프레임 호출).
  updateStuckProjectiles() {
    this.stuckProjectiles.forEach(({ projectile, offsetX, offsetY }) => {
      projectile.setPosition(this.boss.sprite.x + offsetX, this.boss.sprite.y + offsetY);
    });
  }

  // 화면 밖으로 나간 투사체를 정리 (매 프레임 GameScene.update()에서 호출)
  updateProjectiles() {
    const { width, height } = this.scene.scale;
    const margin = 20;
    for (const projectile of [...this.projectiles]) {
      if (projectile.x < -margin || projectile.x > width + margin || projectile.y < -margin || projectile.y > height + margin) {
        this.destroyProjectile(projectile);
      }
    }
  }

  // 게임 종료 시 자동 연사를 멈추고 들고 있던 무기도 정리한다.
  stopAllFiring() {
    this.releaseActiveWeapon();
  }

  // 데미지 판정 대상: 지금 들고 있는 무기(투척형 발사대 자체는 제외) + 날아가는 투사체들 중 보스와 겹쳐 있는 것만.
  // 방망이(휴대형)는 대각선 캡슐로, 투사체(공)는 원으로 — 둘 다 사각 히트박스보다 실제 그림에 가깝게 판정한다.
  getOverlappingDamageDealers() {
    const dealers = [...this.projectiles];
    if (this.activeWeapon && this.activeWeapon.category !== WEAPON_CATEGORIES.THROW) {
      dealers.push(this.activeWeapon);
    }
    return dealers.filter((weapon) => {
      if (weapon.category === WEAPON_CATEGORIES.PORTABLE) return this.batOverlapsBoss(weapon);
      if (weapon.category === WEAPON_CATEGORIES.STATIC) return this.rectOverlapsBoss(weapon);
      return this.projectileOverlapsBoss(weapon);
    });
  }
}
