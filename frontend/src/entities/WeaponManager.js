import Phaser from 'phaser';
import {
  CONTACT_OVERLAP,
  THROW_FIRE_INTERVAL,
  THROW_PROJECTILE_SPEED,
  STACK_DAMAGE_MULTIPLIER,
  STACK_TINT_COLOR,
  PORTABLE_WEAPON_SIZE,
} from '../config/constants.js';
import { getBaseballBatDimensions } from './weaponSprites.js';
import { capsuleIntersectsRect } from '../systems/geometry.js';

// 방망이 텍스처는 -45도로 회전된 채 미리 그려져 있어(그림→히트박스 좌표 변환은 weaponSprites.js 주석 참고),
// 손잡이 끝/배럴 끝이 weapon.x,y로부터 이 오프셋만큼씩 대각선으로 떨어져 있다. PORTABLE_WEAPON_SIZE가 바뀌면
// 그림과 항상 같이 맞도록 getBaseballBatDimensions()에서 계산한다.
const BAT_DIMENSIONS = getBaseballBatDimensions(PORTABLE_WEAPON_SIZE);
const BAT_AXIS_OFFSET = BAT_DIMENSIONS.halfLen / Math.SQRT2;
const BAT_AXIS_RADIUS = BAT_DIMENSIONS.barrelHalfWidth;

export default class WeaponManager {
  constructor(scene, boss, onOverlap) {
    this.scene = scene;
    this.boss = boss;
    this.onOverlap = onOverlap;
    this.weapons = [];
    this.portableWeapons = [];
    this.throwWeapons = [];
    this.projectiles = [];
  }

  // 설치형/휴대형 공통: 플레이어가 직접 드래그해서 옮길 수 있다
  // (두 타입은 텍스처와 소속 배열, canDealDamage()의 드래그 조건만 다를 뿐 나머지 동작이 동일해 생성 로직을 공유한다)
  createDraggableWeapon(x, y, textureKey) {
    const weapon = this.scene.physics.add.image(x, y, textureKey);
    weapon.setInteractive({ draggable: true });
    this.scene.input.setDraggable(weapon);
    this.initStack(weapon);
    weapon.isDragging = false;
    weapon.overlapCollider = this.scene.physics.add.overlap(this.boss.sprite, weapon, () => this.handleWeaponOverlap(weapon), null, this.scene);
    return weapon;
  }

  // 보스와 겹친 무기가 지금 데미지를 줘도 되는 상태인지 판단.
  // 설치형: 들고 옮기는 중엔 안 터짐(내려놓고 가만히 있을 때만 터짐) / 휴대형(방망이): 반대로 휘두르는(드래그 중인) 동안만 터짐
  canDealDamage(weapon) {
    if (this.isWeapon(weapon)) return !weapon.isDragging;
    if (this.isPortableWeapon(weapon)) return !!weapon.isDragging;
    return true;
  }

  handleWeaponOverlap(weapon) {
    if (!this.canDealDamage(weapon)) return;
    if (this.isPortableWeapon(weapon) && !this.batOverlapsBoss(weapon)) return;
    this.onOverlap();
  }

  // 방망이의 손잡이 끝→배럴 끝을 잇는 중심축 (world 좌표). 텍스처가 -45도로 고정 회전되어 있어 오프셋이 항상 같다.
  getBatAxis(weapon) {
    return {
      x1: weapon.x - BAT_AXIS_OFFSET,
      y1: weapon.y + BAT_AXIS_OFFSET,
      x2: weapon.x + BAT_AXIS_OFFSET,
      y2: weapon.y - BAT_AXIS_OFFSET,
      radius: BAT_AXIS_RADIUS,
    };
  }

  // 방망이는 대각선 실루엣이라 사각 히트박스 전체 대신, 실제 그림에 맞춘 캡슐(축+두께)로 보스와의 겹침을 판정한다.
  batOverlapsBoss(weapon) {
    const { x1, y1, x2, y2, radius } = this.getBatAxis(weapon);
    return capsuleIntersectsRect(x1, y1, x2, y2, radius, this.boss.sprite.getBounds());
  }

  // 설치형
  addWeapon(x, y) {
    const weapon = this.createDraggableWeapon(x, y, 'weapon');
    this.weapons.push(weapon);
    return weapon;
  }

  // 휴대형
  addPortableWeapon(x, y) {
    const weapon = this.createDraggableWeapon(x, y, 'weapon_portable');
    this.portableWeapons.push(weapon);
    return weapon;
  }

  // 투척형: 플레이어가 직접 드래그해서 옮길 수 있고, 누르고 있는 동안 그 순간의 보스 위치를 향해 작은 투사체가 주기적으로 자동 발사된다
  addThrowWeapon(x, y) {
    const launcher = this.scene.physics.add.image(x, y, 'weapon_throw');
    launcher.setInteractive({ draggable: true, useHandCursor: true });
    this.scene.input.setDraggable(launcher);
    this.initStack(launcher);
    this.throwWeapons.push(launcher);
    launcher.fireTimer = null;

    const startFiring = () => {
      if (launcher.fireTimer) return;
      this.fireProjectile(launcher);
      launcher.fireTimer = this.scene.time.addEvent({
        delay: THROW_FIRE_INTERVAL,
        loop: true,
        callback: () => this.fireProjectile(launcher),
      });
    };
    const stopFiring = () => {
      if (launcher.fireTimer) {
        launcher.fireTimer.remove();
        launcher.fireTimer = null;
      }
    };

    launcher.on('pointerdown', startFiring);
    this.scene.input.on('pointerup', stopFiring);

    return launcher;
  }

  fireProjectile(launcher) {
    const projectile = this.scene.physics.add.image(launcher.x, launcher.y, 'weapon_throw_projectile');
    projectile.damageMultiplier = launcher.damageMultiplier;
    this.projectiles.push(projectile);

    const collider = this.scene.physics.add.overlap(this.boss.sprite, projectile, () => {
      this.onOverlap();
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

  // 게임 종료 시 발사 중인 투척형 발사대의 자동 연사를 모두 멈춘다
  stopAllFiring() {
    for (const launcher of this.throwWeapons) {
      if (launcher.fireTimer) {
        launcher.fireTimer.remove();
        launcher.fireTimer = null;
      }
    }
  }

  spawnRandomWeapon() {
    const x = Phaser.Math.Between(60, this.scene.scale.width - 60);
    const y = Phaser.Math.Between(80, this.scene.scale.height - 60);
    const spawners = [this.addWeapon.bind(this), this.addPortableWeapon.bind(this), this.addThrowWeapon.bind(this)];
    const spawn = Phaser.Utils.Array.GetRandom(spawners);
    return spawn(x, y);
  }

  getTotalWeaponCount() {
    return this.weapons.length + this.portableWeapons.length + this.throwWeapons.length;
  }

  isWeapon(gameObject) {
    return this.weapons.includes(gameObject);
  }

  isPortableWeapon(gameObject) {
    return this.portableWeapons.includes(gameObject);
  }

  isThrowWeapon(gameObject) {
    return this.throwWeapons.includes(gameObject);
  }

  isAnyWeapon(gameObject) {
    return this.isWeapon(gameObject) || this.isPortableWeapon(gameObject) || this.isThrowWeapon(gameObject);
  }

  // 실제로 데미지를 주는 대상(설치형/휴대형/투척형 투사체)중 지금 데미지를 줄 수 있는 상태(canDealDamage)이면서
  // 보스와 겹쳐 있는 것만 모아서 반환 (투척형 발사대 본체는 스스로 데미지를 주지 않으므로 제외).
  // 방망이(휴대형)만 사각 히트박스 대신 실제 실루엣에 맞춘 캡슐 판정(batOverlapsBoss)을 쓴다.
  getOverlappingWeapons() {
    const bossBounds = this.boss.sprite.getBounds();
    const damageDealers = [...this.weapons, ...this.portableWeapons, ...this.projectiles];
    return damageDealers.filter((weapon) => {
      if (!this.canDealDamage(weapon)) return false;
      if (this.isPortableWeapon(weapon)) return this.batOverlapsBoss(weapon);
      return Phaser.Geom.Intersects.RectangleToRectangle(bossBounds, weapon.getBounds());
    });
  }

  countOverlappingWeapons() {
    return this.getOverlappingWeapons().length;
  }

  initStack(weapon) {
    weapon.stackLevel = 1;
    weapon.damageMultiplier = 1;
  }

  getSameTypeList(weapon) {
    if (this.isWeapon(weapon)) return this.weapons;
    if (this.isPortableWeapon(weapon)) return this.portableWeapons;
    if (this.isThrowWeapon(weapon)) return this.throwWeapons;
    return [];
  }

  // 쓰레기통에 버려진 무기를 정리 (타이머/충돌 콜라이더 등 종류별 뒷정리 포함)
  destroyWeapon(weapon) {
    const list = this.getSameTypeList(weapon);
    const index = list.indexOf(weapon);
    if (index !== -1) list.splice(index, 1);

    if (weapon.fireTimer) weapon.fireTimer.remove();
    if (weapon.overlapCollider) weapon.overlapCollider.destroy();
    weapon.destroy();
  }

  // 드래그로 옮긴 무기가 같은 타입의 다른 무기와 겹치면 하나로 합쳐서 초록색 강화 무기로 만든다
  // (투척형/야구공은 겹쳐 쌓이지 않고 각자 따로 발사대로 동작하고, 휴대형/야구 방망이는 스윙감을 위해 합치기 대상에서 제외)
  tryMergeWeapon(weapon) {
    if (this.isThrowWeapon(weapon)) return;
    if (this.isPortableWeapon(weapon)) return;

    const siblings = this.getSameTypeList(weapon).filter((other) => other !== weapon);
    const weaponBounds = weapon.getBounds();
    const target = siblings.find((sibling) => Phaser.Geom.Intersects.RectangleToRectangle(weaponBounds, sibling.getBounds()));
    if (!target) return;

    weapon.stackLevel += target.stackLevel;
    weapon.damageMultiplier = STACK_DAMAGE_MULTIPLIER ** (weapon.stackLevel - 1);
    weapon.setTintFill(STACK_TINT_COLOR);

    this.getSameTypeList(target).splice(this.getSameTypeList(target).indexOf(target), 1);
    if (target.overlapCollider) target.overlapCollider.destroy();
    target.destroy();
  }

  // 보스 드래그 시 어떤 무기(설치형/휴대형/투척형)도 뚫고 지나가지 않도록 막되, 히트 판정용 여백(CONTACT_OVERLAP)은 남긴다
  resolveOverlapForBoss(x, y) {
    return this.resolveOverlap(x, y, this.boss.displayWidth / 2, this.boss.displayHeight / 2, [...this.weapons, ...this.portableWeapons, ...this.throwWeapons]);
  }

  // 무기 드래그 시 고정된 보스를 뚫고 지나가지 않도록 막되, 히트 판정용 여백은 남긴다 (설치형/휴대형/투척형 공통)
  resolveOverlapForDraggedWeapon(weapon, x, y) {
    return this.resolveOverlap(x, y, weapon.displayWidth / 2, weapon.displayHeight / 2, [this.boss.sprite]);
  }

  // 보스가 폭(90)보다 높이(70)가 짧은 비정사각형이라 x/y를 같은 half값으로 계산하면
  // 위아래 방향에서 실제 겹침 판정 범위보다 더 멀리 밀려나 데미지가 안 들어가는 문제가 있었다 —
  // 축마다 자신의 displayWidth/displayHeight를 각각 써서 계산한다.
  resolveOverlap(x, y, movingHalfW, movingHalfH, targets) {
    for (const target of targets) {
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
    }
    return { x, y };
  }
}
