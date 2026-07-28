import Phaser from 'phaser';
import {
  BOSS_TYPES, PORTABLE_WEAPON_SIZE, THROW_WEAPON_SIZE, TASER_WEAPON_SIZE, HAND_WEAPON_SIZE, BAD_HAND_WEAPON_SIZE,
  KEYBOARD_WEAPON_SIZE, MEGAPHONE_WEAPON_SIZE, PISTOL_WEAPON_SIZE, MACHINE_GUN_WEAPON_SIZE, BULLET_SIZE,
  SHOTGUN_WEAPON_SIZE, SNIPER_WEAPON_SIZE, REVOLVER_WEAPON_SIZE, PELLET_SIZE,
  SOUND_WAVE_PROJECTILE_SIZE, WHIP_WEAPON_SIZE, DEBUGGER_WEAPON_SIZE, DART_COLOR_VARIANTS, DART_PROJECTILE_TEXTURES,
  BAMBOO_CANE_WEAPON_SIZE, SQUISHY_WEAPON_SIZE,
  RUBBER_DUCK_WEAPON_SIZE, TEDDY_BEAR_WEAPON_SIZE, CHEESE_SQUISHY_WEAPON_SIZE, FRYING_PAN_WEAPON_SIZE,
  SLIPPER_WEAPON_SIZE, BOXING_GLOVE_WEAPON_SIZE, WATERMELON_WEAPON_SIZE, TOMATO_WEAPON_SIZE, BOOMERANG_WEAPON_SIZE,
} from '../config/constants.js';
import { BACKGROUND_STYLES, createBackgroundCanvas } from '../config/backgrounds.js';
import {
  createBossCanvas, createBossHurtCanvas, createBossFireCanvas, createBossHappyCanvas, createBossBlinkCanvas, MAX_DAMAGE_STAGE,
} from '../entities/bossSprite.js';
import {
  createBaseballCanvas, createBaseballBatCanvas, createDartCanvas, createTaserCanvas, createHandCanvas,
  createKeyboardCanvas, createMegaphoneCanvas, createPistolCanvas, createMachineGunCanvas, createBulletCanvas,
  createShotgunCanvas, createSniperCanvas, createRevolverCanvas, createPelletCanvas,
  createSoundWaveProjectileCanvas, createWhipCanvas, createDeveloperCanvas,
  createBambooCaneCanvas, createSquishyToyCanvas,
  createRubberDuckCanvas, createTeddyBearCanvas, createCheeseSquishyCanvas, createTomatoCanvas,
  createWatermelonCanvas, createWatermelonSliceCanvas, createWaterBalloonCanvas, createFryingPanCanvas, createSlipperCanvas,
  createBoxingGloveCanvas, createBeachBallCanvas, createBoomerangCanvas,
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
    this.load.audio('bat_hit', assetUrl('audio/hit.mp3'));
    this.load.audio('dart_throw', assetUrl('audio/dart_throw.mp3'));
    this.load.audio('taser_shock', assetUrl('audio/taser_shock.mp3'));
    this.load.audio('baseball_throw', assetUrl('audio/baseball.mp3'));
    this.load.audio('hit_wall', assetUrl('audio/sound_of_hitting_a_wall.mp3'));
    this.load.audio('keyboard_smash', assetUrl('audio/keyboard_smash.mp3'));
    this.load.audio('pistol_impact', assetUrl('audio/pistol_impact.mp3'));
    this.load.audio('panel_open', assetUrl('audio/pannel_open.mp3'));
    this.load.audio('exit_button', assetUrl('audio/exit_button.mp3'));
    this.load.svg('icon_gear', assetUrl('icons/settings.svg'), { width: 64, height: 64 });
    this.load.svg('icon_logout', assetUrl('icons/log-out.svg'), { width: 64, height: 64 });
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
    this.textures.addCanvas('weapon_bad_hand', createHandCanvas(BAD_HAND_WEAPON_SIZE, { skinColor: '#e0574a', skinStroke: '#8f2e24' }));
    this.textures.addCanvas('weapon_keyboard', createKeyboardCanvas(KEYBOARD_WEAPON_SIZE));
    this.textures.addCanvas('weapon_whip', createWhipCanvas(WHIP_WEAPON_SIZE));
    this.textures.addCanvas('weapon_bamboo_cane', createBambooCaneCanvas(BAMBOO_CANE_WEAPON_SIZE));
    this.textures.addCanvas('weapon_squishy', createSquishyToyCanvas(SQUISHY_WEAPON_SIZE));
    this.textures.addCanvas('weapon_debugger', createDeveloperCanvas(DEBUGGER_WEAPON_SIZE));
    this.textures.addCanvas('weapon_rubber_duck', createRubberDuckCanvas(RUBBER_DUCK_WEAPON_SIZE));
    this.textures.addCanvas('weapon_teddy_bear', createTeddyBearCanvas(TEDDY_BEAR_WEAPON_SIZE));
    this.textures.addCanvas('weapon_cheese_squishy', createCheeseSquishyCanvas(CHEESE_SQUISHY_WEAPON_SIZE));
    this.textures.addCanvas('weapon_frying_pan', createFryingPanCanvas(FRYING_PAN_WEAPON_SIZE));
    this.textures.addCanvas('weapon_slipper', createSlipperCanvas(SLIPPER_WEAPON_SIZE));
    this.textures.addCanvas('weapon_boxing_glove', createBoxingGloveCanvas(BOXING_GLOVE_WEAPON_SIZE));
    this.textures.addCanvas('weapon_boomerang', createBoomerangCanvas(BOOMERANG_WEAPON_SIZE));

    this.createThrowWeaponTexture();
  }

  // 투척형 무기(addThrowWeapon): 야구공/다트/권총/기관총/확성기. 무기 자체와 던져지는 투사체를 같은
  // 크기로 맞춘다(총알만 예외 — BULLET_SIZE로 훨씬 작게). 다트는 색 조합(DART_COLOR_VARIANTS)마다
  // 투사체 텍스처를 따로 만들어서 발사할 때 랜덤으로 골라 쓴다(WeaponManager.fireProjectile) —
  // 패널 아이콘은 대표로 첫 번째 색 조합 하나만 쓴다.
  createThrowWeaponTexture() {
    this.textures.addCanvas('weapon_throw', createBaseballCanvas(THROW_WEAPON_SIZE));
    this.textures.addCanvas('weapon_throw_projectile', createBaseballCanvas(THROW_WEAPON_SIZE));
    this.textures.addCanvas('weapon_dart', createDartCanvas(THROW_WEAPON_SIZE, DART_COLOR_VARIANTS[0]));
    DART_COLOR_VARIANTS.forEach((colors, i) => {
      this.textures.addCanvas(DART_PROJECTILE_TEXTURES[i], createDartCanvas(THROW_WEAPON_SIZE, colors));
    });
    this.textures.addCanvas('weapon_pistol', createPistolCanvas(PISTOL_WEAPON_SIZE));
    this.textures.addCanvas('weapon_pistol_bullet', createBulletCanvas(BULLET_SIZE, '#c9ced3'));
    this.textures.addCanvas('weapon_machine_gun', createMachineGunCanvas(MACHINE_GUN_WEAPON_SIZE));
    this.textures.addCanvas('weapon_machine_gun_bullet', createBulletCanvas(BULLET_SIZE, '#b5844a'));
    this.textures.addCanvas('weapon_shotgun', createShotgunCanvas(SHOTGUN_WEAPON_SIZE));
    this.textures.addCanvas('weapon_pellet', createPelletCanvas(PELLET_SIZE, '#2b2d30'));
    this.textures.addCanvas('weapon_sniper', createSniperCanvas(SNIPER_WEAPON_SIZE));
    this.textures.addCanvas('weapon_sniper_bullet', createBulletCanvas(BULLET_SIZE, '#e0574a'));
    this.textures.addCanvas('weapon_revolver', createRevolverCanvas(REVOLVER_WEAPON_SIZE));
    this.textures.addCanvas('weapon_revolver_bullet', createBulletCanvas(BULLET_SIZE, '#d7dce0'));
    this.textures.addCanvas('weapon_megaphone', createMegaphoneCanvas(MEGAPHONE_WEAPON_SIZE));
    this.textures.addCanvas('weapon_sound_wave', createSoundWaveProjectileCanvas(SOUND_WAVE_PROJECTILE_SIZE, '#e0a63f'));
    this.textures.addCanvas('weapon_tomato', createTomatoCanvas(TOMATO_WEAPON_SIZE));
    this.textures.addCanvas('weapon_tomato_projectile', createTomatoCanvas(TOMATO_WEAPON_SIZE));
    this.textures.addCanvas('weapon_watermelon', createWatermelonCanvas(WATERMELON_WEAPON_SIZE));
    this.textures.addCanvas('weapon_watermelon_projectile', createWatermelonCanvas(WATERMELON_WEAPON_SIZE));
    // 수박이 "쪼개지는" 타격 이펙트(GameScene.spawnWatermelonSplitEffect) 전용 반원 단면 텍스처.
    this.textures.addCanvas('effect_watermelon_slice', createWatermelonSliceCanvas(WATERMELON_WEAPON_SIZE));
    this.textures.addCanvas('weapon_water_balloon', createWaterBalloonCanvas(THROW_WEAPON_SIZE));
    this.textures.addCanvas('weapon_water_balloon_projectile', createWaterBalloonCanvas(THROW_WEAPON_SIZE));
    this.textures.addCanvas('weapon_beach_ball', createBeachBallCanvas(THROW_WEAPON_SIZE));
    this.textures.addCanvas('weapon_beach_ball_projectile', createBeachBallCanvas(THROW_WEAPON_SIZE));
  }
}
