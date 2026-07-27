import Phaser from 'phaser';
import {
  CONTACT_OVERLAP,
  THROW_FIRE_INTERVAL,
  THROW_PROJECTILE_SPEED,
  THROW_WEAPON_SIZE,
  THROW_PROJECTILE_HIT_RADIUS,
  PORTABLE_WEAPON_SIZE,
  WEAPON_CATEGORIES,
  WEAPON_CATEGORY_TEXTURES,
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

// 원형 물리 바디를 텍스처(정사각) 프레임 한가운데 오도록 하는 오프셋
const PROJECTILE_BODY_OFFSET = (THROW_WEAPON_SIZE - THROW_PROJECTILE_HIT_RADIUS * 2) / 2;

// 필드에 여러 개를 놓아두고 드래그/합체/버리기 하던 예전 방식 대신, 무기 패널에서 카테고리를 고른 뒤
// 필드를 누르고 있는 동안에만 그 자리에 무기 1개(activeWeapon)가 나타나 데미지를 주고, 손을 떼면 사라진다.
export default class WeaponManager {
  constructor(scene, boss, onOverlap) {
    this.scene = scene;
    this.boss = boss;
    this.onOverlap = onOverlap;
    this.activeWeapon = null;
    this.projectiles = [];
  }

  // 선택된 카테고리의 무기를 pointer 위치에 만들어 화면에 보이게 한다. 투척형은 즉시 자동 연사를 시작한다.
  spawnAt(category, x, y) {
    this.releaseActiveWeapon();

    const weapon = this.scene.physics.add.image(x, y, WEAPON_CATEGORY_TEXTURES[category]);
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
  resolveAgainstBoss(weapon, x, y) {
    const boss = this.boss.sprite;
    if (weapon.category === WEAPON_CATEGORIES.PORTABLE) {
      const bossHalfW = boss.displayWidth / 2;
      const bossHalfH = boss.displayHeight / 2;
      const { x1, y1, x2, y2, radius } = this.getBatAxis({ x, y });
      const pushed = pushRectOutOfCapsule(boss.x, boss.y, bossHalfW, bossHalfH, x1, y1, x2, y2, radius, CONTACT_OVERLAP);
      return { x: x - (pushed.x - boss.x), y: y - (pushed.y - boss.y) };
    }
    return this.resolveOverlap(x, y, weapon.displayWidth / 2, weapon.displayHeight / 2, boss);
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

  // 방망이는 대각선 실루엣이라 사각 히트박스 전체 대신, 실제 그림에 맞춘 캡슐(축+두께)로 보스와의 겹침을 판정한다.
  batOverlapsBoss(weapon) {
    const { x1, y1, x2, y2, radius } = this.getBatAxis(weapon);
    return capsuleIntersectsRect(x1, y1, x2, y2, radius, this.boss.sprite.getBounds());
  }

  // 야구공 투사체는 둥근 그림이라 사각 히트박스 대신 원(길이 0인 캡슐)으로 보스와의 겹침을 판정한다.
  projectileOverlapsBoss(projectile) {
    return capsuleIntersectsRect(
      projectile.x, projectile.y, projectile.x, projectile.y, THROW_PROJECTILE_HIT_RADIUS, this.boss.sprite.getBounds(),
    );
  }

  startFiring(launcher) {
    this.fireProjectile(launcher);
    launcher.fireTimer = this.scene.time.addEvent({
      delay: THROW_FIRE_INTERVAL,
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

  fireProjectile(launcher) {
    const projectile = this.scene.physics.add.image(launcher.x, launcher.y, 'weapon_throw_projectile');
    // 기본 물리 바디는 텍스처 전체(정사각)를 그대로 쓰는데, 그림은 둥근 이모지라 네 모서리가 비어있다.
    // Arcade의 자체 겹침 판정부터 원형으로 잡아야 실제 공 크기에 맞게 히트가 들어간다.
    projectile.body.setCircle(THROW_PROJECTILE_HIT_RADIUS, PROJECTILE_BODY_OFFSET, PROJECTILE_BODY_OFFSET);
    this.projectiles.push(projectile);

    const collider = this.scene.physics.add.overlap(this.boss.sprite, projectile, () => {
      this.onOverlap(projectile);
      this.destroyProjectile(projectile);
    }, null, this.scene);
    projectile.overlapCollider = collider;

    const angle = Phaser.Math.Angle.Between(launcher.x, launcher.y, this.boss.sprite.x, this.boss.sprite.y);
    this.scene.physics.velocityFromRotation(angle, THROW_PROJECTILE_SPEED, projectile.body.velocity);

    return projectile;
  }

  destroyProjectile(projectile) {
    this.projectiles = this.projectiles.filter((p) => p !== projectile);
    projectile.overlapCollider.destroy();
    projectile.destroy();
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
      return this.projectileOverlapsBoss(weapon);
    });
  }
}
