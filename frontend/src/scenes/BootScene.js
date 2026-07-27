import Phaser from 'phaser';
import {
  BOSS_TYPES, PORTABLE_WEAPON_SIZE, THROW_WEAPON_SIZE, TASER_WEAPON_SIZE, HAND_WEAPON_SIZE, DART_COLOR_VARIANTS, DART_PROJECTILE_TEXTURES,
} from '../config/constants.js';
import { BACKGROUND_STYLES, createBackgroundCanvas } from '../config/backgrounds.js';
import {
  createBossCanvas, createBossHurtCanvas, createBossFireCanvas, createBossHappyCanvas, createBossBlinkCanvas, MAX_DAMAGE_STAGE,
} from '../entities/bossSprite.js';
import {
  createBaseballCanvas, createBaseballBatCanvas, createDartCanvas, createTaserCanvas, createHandCanvas,
} from '../entities/weaponSprites.js';
import { assetUrl } from '../assetBase.js';

// 실제 스프라이트 에셋이 준비되기 전까지 사용하는 placeholder 텍스처.
// 에셋 파일이 추가되면 이 생성 로직 대신 this.load.image(...)로 교체한다.
export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  // preload에서 등록한 로드가 끝나면 Phaser가 알아서 create()를 호출한다.
  preload() {
    this.load.audio('boss_fire_roar', assetUrl('audio/boss_fire_roar.mp3'));
    this.load.audio('bat_hit', assetUrl('audio/bat_hit.mp3'));
    this.load.audio('dart_throw', assetUrl('audio/dart_throw.mp3'));
    this.load.audio('taser_shock', assetUrl('audio/taser_shock.mp3'));
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
        this.textures.addCanvas(`boss_fire_${id}_d${damageStage}`, createBossFireCanvas(color, undefined, damageStage));
        this.textures.addCanvas(`boss_blink_${id}_d${damageStage}`, createBossBlinkCanvas(color, undefined, damageStage));
      }
      // 웃는 표정은 HP 단계와 무관해서(항상 같은 눈/입) 단계별로 안 만들고 보스 타입마다 하나씩만 둔다.
      this.textures.addCanvas(`boss_happy_${id}`, createBossHappyCanvas(color));
    });
  }

  createPlaceholderTextures() {
    this.textures.addCanvas('weapon_portable', createBaseballBatCanvas(PORTABLE_WEAPON_SIZE));
    this.textures.addCanvas('weapon_taser', createTaserCanvas(TASER_WEAPON_SIZE));
    this.textures.addCanvas('weapon_hand', createHandCanvas(HAND_WEAPON_SIZE));

    this.createThrowWeaponTexture();
  }

  // 투척형 무기(addThrowWeapon): 야구공/다트. 무기 자체와 던져지는 투사체를 같은 크기로 맞춘다.
  // 다트는 색 조합(DART_COLOR_VARIANTS)마다 투사체 텍스처를 따로 만들어서, 발사할 때 랜덤으로 골라 쓴다
  // (WeaponManager.fireProjectile) — 패널 아이콘은 대표로 첫 번째 색 조합 하나만 쓴다.
  createThrowWeaponTexture() {
    this.textures.addCanvas('weapon_throw', createBaseballCanvas(THROW_WEAPON_SIZE));
    this.textures.addCanvas('weapon_throw_projectile', createBaseballCanvas(THROW_WEAPON_SIZE));
    this.textures.addCanvas('weapon_dart', createDartCanvas(THROW_WEAPON_SIZE, DART_COLOR_VARIANTS[0]));
    DART_COLOR_VARIANTS.forEach((colors, i) => {
      this.textures.addCanvas(DART_PROJECTILE_TEXTURES[i], createDartCanvas(THROW_WEAPON_SIZE, colors));
    });
  }
}
