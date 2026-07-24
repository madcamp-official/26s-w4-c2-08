import Phaser from 'phaser';
import { BOSS_COLOR } from '../config/constants.js';
import { BACKGROUND_STYLES, createBackgroundCanvas } from '../config/backgrounds.js';
import { createBossCanvas, createBossHurtCanvas } from '../entities/bossSprite.js';
import { createBaseballCanvas, createBugCanvas, createKeyboardCanvas } from '../entities/weaponSprites.js';

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

  // 배경 선택 패널에서 즉시 미리보기/전환할 수 있도록 모든 스타일을 미리 캔버스로 렌더링해 둔다
  createBackgroundTexture() {
    Object.values(BACKGROUND_STYLES).forEach((style) => {
      this.textures.addCanvas(`battleBackground_${style}`, createBackgroundCanvas(style));
    });
  }

  createBossTexture() {
    this.textures.addCanvas('boss', createBossCanvas(BOSS_COLOR));
    this.textures.addCanvas('boss_hurt', createBossHurtCanvas(BOSS_COLOR));
  }

  createPlaceholderTextures() {
    // 설치형: 버그, 휴대형: 키보드
    this.textures.addCanvas('weapon', createBugCanvas(50));
    this.textures.addCanvas('weapon_portable', createKeyboardCanvas(50));

    this.createThrowWeaponTexture();
  }

  // 투척형 무기(addThrowWeapon): 야구공
  createThrowWeaponTexture() {
    this.textures.addCanvas('weapon_throw', createBaseballCanvas(50));
    this.textures.addCanvas('weapon_throw_projectile', createBaseballCanvas(16));
  }
}
