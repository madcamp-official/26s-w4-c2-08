import Phaser from 'phaser';
import { CONTACT_OVERLAP, THROW_FIRE_INTERVAL, THROW_PROJECTILE_SPEED } from '../config/constants.js';

export default class WeaponManager {
  constructor(scene, boss, onOverlap) {
    this.scene = scene;
    this.boss = boss;
    this.onOverlap = onOverlap;
    this.weapons = [];
    this.portableWeapons = [];
    this.throwWeapons = [];
    this.projectiles = [];

    this.addWeapon(600, 300);
    this.addPortableWeapon(150, 480);
    this.addThrowWeapon(650, 480);
  }

  // 설치형: 필드에 고정, 보스를 드래그해서 부딪히는 방식
  addWeapon(x, y) {
    const weapon = this.scene.physics.add.staticImage(x, y, 'weapon');
    this.weapons.push(weapon);
    this.scene.physics.add.overlap(this.boss.sprite, weapon, this.onOverlap, null, this.scene);
    return weapon;
  }

  // 휴대형: 플레이어가 직접 드래그해서 고정된 보스에 부딪히는 방식
  addPortableWeapon(x, y) {
    const weapon = this.scene.physics.add.image(x, y, 'weapon_portable');
    weapon.setInteractive({ draggable: true });
    this.scene.input.setDraggable(weapon);
    this.portableWeapons.push(weapon);
    this.scene.physics.add.overlap(this.boss.sprite, weapon, this.onOverlap, null, this.scene);
    return weapon;
  }

  // 투척형: 플레이어가 직접 드래그해서 옮길 수 있고, 누르고 있는 동안 그 순간의 보스 위치를 향해 작은 투사체가 주기적으로 자동 발사된다
  addThrowWeapon(x, y) {
    const launcher = this.scene.physics.add.image(x, y, 'weapon_throw');
    launcher.setInteractive({ draggable: true, useHandCursor: true });
    this.scene.input.setDraggable(launcher);
    this.throwWeapons.push(launcher);

    let timer = null;
    const startFiring = () => {
      if (timer) return;
      this.fireProjectile(launcher);
      timer = this.scene.time.addEvent({
        delay: THROW_FIRE_INTERVAL,
        loop: true,
        callback: () => this.fireProjectile(launcher),
      });
    };
    const stopFiring = () => {
      if (timer) {
        timer.remove();
        timer = null;
      }
    };

    launcher.on('pointerdown', startFiring);
    this.scene.input.on('pointerup', stopFiring);

    return launcher;
  }

  fireProjectile(launcher) {
    const projectile = this.scene.physics.add.image(launcher.x, launcher.y, 'weapon_throw_projectile');
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

  spawnRandomWeapon() {
    const x = Phaser.Math.Between(60, this.scene.scale.width - 60);
    const y = Phaser.Math.Between(80, this.scene.scale.height - 60);
    const spawners = [this.addWeapon.bind(this), this.addPortableWeapon.bind(this), this.addThrowWeapon.bind(this)];
    const spawn = Phaser.Utils.Array.GetRandom(spawners);
    return spawn(x, y);
  }

  isPortableWeapon(gameObject) {
    return this.portableWeapons.includes(gameObject);
  }

  isThrowWeapon(gameObject) {
    return this.throwWeapons.includes(gameObject);
  }

  // 보스 드래그 시 설치형/휴대형 무기를 뚫고 지나가지 않도록 막되, 히트 판정용 여백(CONTACT_OVERLAP)은 남긴다
  resolveOverlapForBoss(x, y) {
    return this.resolveOverlap(x, y, this.boss.displayWidth / 2, [...this.weapons, ...this.portableWeapons]);
  }

  // 휴대형 무기 드래그 시 고정된 보스를 뚫고 지나가지 않도록 막되, 히트 판정용 여백은 남긴다
  resolveOverlapForPortableWeapon(weapon, x, y) {
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
