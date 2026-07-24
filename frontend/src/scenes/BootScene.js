import Phaser from 'phaser';
import { BACKGROUND_STYLE, BOSS_COLOR } from '../config/constants.js';
import { createBackgroundCanvas } from '../config/backgrounds.js';
import { createBossCanvas, createBossHurtCanvas } from '../entities/bossSprite.js';
import { createBaseballCanvas } from '../entities/weaponSprites.js';

// 실제 스프라이트/사운드 에셋이 준비되기 전까지 사용하는 placeholder 텍스처.
// 에셋 파일이 추가되면 이 생성 로직 대신 this.load.image(...) / this.load.audio(...)로 교체한다.
export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create() {
    this.createBossTexture();
    this.createPlaceholderTextures();
    this.createBackgroundTexture();
    this.scene.start('GameScene');
  }

  createBackgroundTexture() {
    this.textures.addCanvas('battleBackground', createBackgroundCanvas(BACKGROUND_STYLE));
  }

  createBossTexture() {
    this.textures.addCanvas('boss', createBossCanvas(BOSS_COLOR));
    this.textures.addCanvas('boss_hurt', createBossHurtCanvas(BOSS_COLOR));
  }

  createPlaceholderTextures() {
    const g = this.add.graphics();

    g.fillStyle(0x3366cc, 1);
    g.fillRect(0, 0, 50, 50);
    g.generateTexture('weapon', 50, 50);

    g.clear();
    g.fillStyle(0x3366cc, 1);
    g.fillTriangle(25, 0, 0, 50, 50, 50);
    g.generateTexture('weapon_portable', 50, 50);

    g.destroy();

    this.createThrowWeaponTexture();
  }

  // 투척형 무기(addThrowWeapon): 첫 번째 디자인은 야구공
  createThrowWeaponTexture() {
    this.textures.addCanvas('weapon_throw', createBaseballCanvas(50));
    this.textures.addCanvas('weapon_throw_projectile', createBaseballCanvas(16));
  }
}
