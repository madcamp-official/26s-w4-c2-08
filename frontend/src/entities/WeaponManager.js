import Phaser from 'phaser';
import { CONTACT_OVERLAP } from '../config/constants.js';

export default class WeaponManager {
  constructor(scene, boss, onOverlap) {
    this.scene = scene;
    this.boss = boss;
    this.onOverlap = onOverlap;
    this.weapons = [];
    this.portableWeapons = [];

    this.addWeapon(600, 300);
    this.addPortableWeapon(150, 480);
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

  spawnRandomWeapon() {
    const x = Phaser.Math.Between(60, this.scene.scale.width - 60);
    const y = Phaser.Math.Between(80, this.scene.scale.height - 60);
    return this.addWeapon(x, y);
  }

  isPortableWeapon(gameObject) {
    return this.portableWeapons.includes(gameObject);
  }

  // 보스 드래그 시 설치형 무기를 뚫고 지나가지 않도록 막되, 히트 판정용 여백(CONTACT_OVERLAP)은 남긴다
  resolveOverlapForBoss(x, y) {
    return this.resolveOverlap(x, y, this.boss.displayWidth / 2, this.weapons);
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
