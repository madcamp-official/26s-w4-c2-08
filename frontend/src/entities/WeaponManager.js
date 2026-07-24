import Phaser from 'phaser';
import {
  CONTACT_OVERLAP,
  THROW_FIRE_INTERVAL,
  THROW_PROJECTILE_SPEED,
  STACK_DAMAGE_MULTIPLIER,
  STACK_TINT_COLOR,
} from '../config/constants.js';

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

  // 설치형/휴대형 공통: 플레이어가 직접 드래그해서 옮길 수 있고, 보스와 부딪히면 데미지가 들어간다
  // (두 타입은 텍스처와 소속 배열만 다를 뿐 동작이 동일해 생성 로직을 공유한다)
  createDraggableWeapon(x, y, textureKey) {
    const weapon = this.scene.physics.add.image(x, y, textureKey);
    weapon.setInteractive({ draggable: true });
    this.scene.input.setDraggable(weapon);
    this.initStack(weapon);
    weapon.overlapCollider = this.scene.physics.add.overlap(this.boss.sprite, weapon, this.onOverlap, null, this.scene);
    return weapon;
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

  // 실제로 데미지를 주는 대상(설치형/휴대형/투척형 투사체)이 현재 보스와 겹쳐 있는지 모아서 반환
  // (투척형 발사대 본체는 스스로 데미지를 주지 않으므로 제외)
  getOverlappingWeapons() {
    const bossBounds = this.boss.sprite.getBounds();
    const damageDealers = [...this.weapons, ...this.portableWeapons, ...this.projectiles];
    return damageDealers.filter((weapon) => Phaser.Geom.Intersects.RectangleToRectangle(bossBounds, weapon.getBounds()));
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
  tryMergeWeapon(weapon) {
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

  // 보스 드래그 시 설치형/휴대형 무기를 뚫고 지나가지 않도록 막되, 히트 판정용 여백(CONTACT_OVERLAP)은 남긴다
  resolveOverlapForBoss(x, y) {
    return this.resolveOverlap(x, y, this.boss.displayWidth / 2, [...this.weapons, ...this.portableWeapons]);
  }

  // 설치형/휴대형 무기 드래그 시 고정된 보스를 뚫고 지나가지 않도록 막되, 히트 판정용 여백은 남긴다
  resolveOverlapForDraggedWeapon(weapon, x, y) {
    return this.resolveOverlap(x, y, weapon.displayWidth / 2, [this.boss.sprite]);
  }

  resolveOverlap(x, y, movingHalf, targets) {
    for (const target of targets) {
      const targetHalf = target.displayWidth / 2;
      const dx = x - target.x;
      const dy = y - target.y;
      const overlapX = movingHalf + targetHalf - Math.abs(dx);
      const overlapY = movingHalf + targetHalf - Math.abs(dy);

      if (overlapX > 0 && overlapY > 0) {
        if (overlapX < overlapY) {
          x = target.x + Math.sign(dx || 1) * (movingHalf + targetHalf - CONTACT_OVERLAP);
        } else {
          y = target.y + Math.sign(dy || 1) * (movingHalf + targetHalf - CONTACT_OVERLAP);
        }
      }
    }
    return { x, y };
  }
}
