import Phaser from 'phaser';
import { BOSS_TYPES, PORTABLE_WEAPON_SIZE, THROW_WEAPON_SIZE } from '../config/constants.js';
import { BACKGROUND_STYLES, createBackgroundCanvas } from '../config/backgrounds.js';
import { createBossCanvas, createBossHurtCanvas, MAX_DAMAGE_STAGE } from '../entities/bossSprite.js';
import { createBaseballCanvas, createBaseballBatCanvas } from '../entities/weaponSprites.js';

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

  // 보스 선택 패널 미리보기 + 실제 전투용 텍스처를 캐릭터 x 표정(평상/피격) x 데미지 단계(0~MAX_DAMAGE_STAGE)
  // 조합으로 전부 미리 렌더링해 둔다. HP가 깎일수록 Boss.js가 데미지 단계를 올려 텍스처만 갈아끼운다.
  createBossTexture() {
    BOSS_TYPES.forEach(({ id, color }) => {
      for (let damageStage = 0; damageStage <= MAX_DAMAGE_STAGE; damageStage += 1) {
        this.textures.addCanvas(`boss_${id}_d${damageStage}`, createBossCanvas(color, undefined, damageStage));
        this.textures.addCanvas(`boss_hurt_${id}_d${damageStage}`, createBossHurtCanvas(color, undefined, damageStage));
      }
    });
  }

  createPlaceholderTextures() {
    this.textures.addCanvas('weapon_portable', createBaseballBatCanvas(PORTABLE_WEAPON_SIZE));

    this.createThrowWeaponTexture();
  }

  // 투척형 무기(addThrowWeapon): 첫 번째 디자인은 야구공. 무기 자체와 던져지는 투사체를 같은 크기로 맞춘다.
  createThrowWeaponTexture() {
    this.textures.addCanvas('weapon_throw', createBaseballCanvas(THROW_WEAPON_SIZE));
    this.textures.addCanvas('weapon_throw_projectile', createBaseballCanvas(THROW_WEAPON_SIZE));
  }
}
