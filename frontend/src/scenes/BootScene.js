import Phaser from 'phaser';
import {
  BOSS_TYPES, PORTABLE_WEAPON_SIZE, WAND_WEAPON_SIZE, GOLF_CLUB_WEAPON_SIZE, SPOON_WEAPON_SIZE, THROW_WEAPON_SIZE, TASER_WEAPON_SIZE, HAND_WEAPON_SIZE, BAD_HAND_WEAPON_SIZE,
  LIPS_WEAPON_SIZE,
  KEYBOARD_WEAPON_SIZE, MEGAPHONE_WEAPON_SIZE, PISTOL_WEAPON_SIZE, MACHINE_GUN_WEAPON_SIZE, BULLET_SIZE,
  SHOTGUN_WEAPON_SIZE, SNIPER_WEAPON_SIZE, REVOLVER_WEAPON_SIZE, PELLET_SIZE,
  SOUND_WAVE_PROJECTILE_SIZE, WHIP_WEAPON_SIZE, DEBUGGER_WEAPON_SIZE, DART_COLOR_VARIANTS, DART_PROJECTILE_TEXTURES,
  BAMBOO_CANE_WEAPON_SIZE, SQUISHY_WEAPON_SIZE,
  RUBBER_DUCK_WEAPON_SIZE, TEDDY_BEAR_WEAPON_SIZE, CHEESE_SQUISHY_WEAPON_SIZE, FRYING_PAN_WEAPON_SIZE,
  SLIPPER_WEAPON_SIZE, BOXING_GLOVE_WEAPON_SIZE, WATERMELON_WEAPON_SIZE, TOMATO_WEAPON_SIZE, BEACH_BALL_WEAPON_SIZE, BOOMERANG_WEAPON_SIZE,
  GRENADE_WEAPON_SIZE, DYNAMITE_WEAPON_SIZE,
  BOSS_SHIELD_SIZE, BORED_BUBBLE_WEAPON_SIZE, HAIR_DRYER_WEAPON_SIZE,
  WASHING_MACHINE_WIDTH, WASHING_MACHINE_HEIGHT,
  BOSS_BUMP_MAX_LEVEL,
  SLINGSHOT_FRAME_SIZE,
} from '../config/constants.js';
import { BACKGROUND_STYLES, createBackgroundCanvas } from '../config/backgrounds.js';
import {
  createBossCanvas, createBossHurtCanvas, createBossFireCanvas, createBossHappyCanvas, createBossBlinkCanvas,
  createBossShieldCanvas, createBossSmirkCanvas, createBossSleepCanvas, createBumpCanvas,
  createBossVomitCanvas, MAX_DAMAGE_STAGE,
} from '../entities/bossSprite.js';
import {
  createBaseballCanvas, createBasketballCanvas, createSlingshotFrameCanvas, createBaseballBatCanvas, createMagicWandCanvas, createGolfClubCanvas, createSpoonCanvas, createDartCanvas, createTaserCanvas, createHandCanvas,
  createKeyboardCanvas, createMegaphoneCanvas, createPistolCanvas, createMachineGunCanvas, createBulletCanvas,
  createShotgunCanvas, createSniperCanvas, createRevolverCanvas, createPelletCanvas,
  createSoundWaveProjectileCanvas, createWhipCanvas, createDeveloperCanvas,
  createBambooCaneCanvas, createSquishyToyCanvas,
  createRubberDuckCanvas, createTeddyBearCanvas, createCheeseSquishyCanvas, createTomatoCanvas,
  createWatermelonCanvas, createWatermelonSliceCanvas, createWaterBalloonCanvas, createUreaSolutionCanvas, createFryingPanCanvas, createSlipperCanvas,
  createBoxingGloveCanvas, createBeachBallCanvas, createBoomerangCanvas,
  createGrenadeCanvas, createDynamiteCanvas, createLipsCanvas, createBoredGirlCanvas, createWashingMachineCanvas, createHairDryerCanvas,
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
    // 날아가다 벽에 처박힐 때 전용 — fire_roar와 같은 소스지만 키를 분리해 의미 구분(권투장갑 hit_wall 벽 타격음과는 별개).
    this.load.audio('boss_wall_slam_scream', assetUrl('audio/boss_wall_slam_scream.mp3'));
    // 패널에 밀려 왼쪽 벽에 부딪힐 때 전용(Boss.flyOutToLeftWall) — 비명이 아니라 순수 충돌음.
    this.load.audio('sound_of_hitting_a_wall', assetUrl('audio/sound_of_hitting_a_wall.mp3'));
    this.load.audio('laptop_slam', assetUrl('audio/laptop_slam.mp3'));
    this.load.audio('developer_shout', assetUrl('audio/developer_shout.mp3'));
    this.load.audio('bamboo_whoosh', assetUrl('audio/bamboo_whoosh.mp3'));
    this.load.audio('hair_dryer_wind', assetUrl('audio/hair_dryer_wind.mp3'));
    this.load.audio('boss_defeated', assetUrl('audio/boss_defeated.mp3'));
    this.load.audio('bat_hit', assetUrl('audio/hit.mp3'));
    this.load.audio('spoon_hit', assetUrl('audio/spoon.mp3'));
    this.load.audio('wand_hit', assetUrl('audio/wand.mp3'));
    this.load.audio('dart_throw', assetUrl('audio/dart_throw.mp3'));
    this.load.audio('taser_shock', assetUrl('audio/taser_shock.mp3'));
    this.load.audio('baseball_throw', assetUrl('audio/baseball.mp3'));
    this.load.audio('basketball_bounce', assetUrl('audio/basketball.mp3'));
    this.load.audio('hit_wall', assetUrl('audio/sound_of_hitting_a_wall.mp3'));
    this.load.audio('keyboard_smash', assetUrl('audio/keyboard_smash.mp3'));
    this.load.audio('pistol_shot', assetUrl('audio/pistol_shot.mp3'));
    this.load.audio('machine_gun_shot', assetUrl('audio/machinegun.mp3'));
    this.load.audio('shotgun_blast', assetUrl('audio/shotgun_blast.mp3'));
    this.load.audio('sniper_shot', assetUrl('audio/sniper_shot.mp3'));
    this.load.audio('revolver_shot', assetUrl('audio/revolver_shot.mp3'));
    this.load.audio('megaphone_feedback', assetUrl('audio/megaphone_feedback.mp3'));
    this.load.audio('tomato_squish', assetUrl('audio/tomato_squish.mp3'));
    this.load.audio('watermelon_splat', assetUrl('audio/watermelon_splat.mp3'));
    this.load.audio('watermelon_eating', assetUrl('audio/watermelon_eating.mp3'));
    this.load.audio('water_balloon_pop', assetUrl('audio/water_balloon_pop.mp3'));
    this.load.audio('panel_open', assetUrl('audio/pannel_open.mp3'));
    this.load.audio('exit_button', assetUrl('audio/exit_button.mp3'));
    this.load.audio('boss_vomit', assetUrl('audio/obite.mp3'));
    this.load.audio('duck_quack', assetUrl('audio/duck_quack.mp3'));
    this.load.audio('seoyoon_bored', assetUrl('audio/seoyoon.wav'));
    this.load.audio('washing_machine_spin', assetUrl('audio/washing.mp3'));
    this.load.audio('good_hand', assetUrl('audio/good_hand.mp3'));
    this.load.audio('bad_hand_hit', assetUrl('audio/bad_hand.mp3'));
    this.load.audio('frying_pan_hit', assetUrl('audio/frying_pan.mp3'));
    this.load.audio('whip_hit', assetUrl('audio/whip.mp3'));
    this.load.audio('washing_machine_sparkle', assetUrl('audio/sparkle.mp3'));
    this.load.audio('squishy_hit', assetUrl('audio/squishy_hit.mp3'));
    this.load.audio('shield_block', assetUrl('audio/shield_block.mp3'));
    this.load.audio('shield_bounce', assetUrl('audio/shield_bounce.mp3'));
    this.load.audio('hair_dryer_hit', assetUrl('audio/hair_dryer_hit.mp3'));
    this.load.audio('teddy_bear_hit', assetUrl('audio/teddy_bear_squeak.mp3'));
    this.load.audio('cheese_squishy_hit', assetUrl('audio/cheese_squishy_hit.mp3'));
    this.load.audio('thud_impact_hit', assetUrl('audio/thud_impact_hit.mp3'));
    this.load.svg('icon_menu', assetUrl('icons/menu.svg'), { width: 64, height: 64 });
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
        this.textures.addCanvas(`boss_vomit_${id}_d${damageStage}`, createBossVomitCanvas(color, undefined, damageStage));
      }
      // 웃는 표정은 HP 단계와 무관해서(항상 같은 눈/입) 단계별로 안 만들고 보스 타입마다 하나씩만 둔다.
      this.textures.addCanvas(`boss_happy_${id}`, createBossHappyCanvas(color));
      // 방패 들 때 짓는 썩소도 웃는 표정과 마찬가지로 HP 단계와 무관한 단일 텍스처.
      this.textures.addCanvas(`boss_smirk_${id}`, createBossSmirkCanvas(color));
      // 방치 중 잠깐 자는 척하는 표정도 마찬가지로 단일 텍스처.
      this.textures.addCanvas(`boss_sleep_${id}`, createBossSleepCanvas(color));
    });
    // 체력 최저 단계에서 가끔 뜨는 방패(Boss.activateShield) — 보스 타입/데미지 단계와 무관한 단일 텍스처.
    this.textures.addCanvas('boss_shield', createBossShieldCanvas(BOSS_SHIELD_SIZE));
    // 숟가락에 맞을 때마다 자라는 혹(1~3단계) — 보스 타입/데미지 단계와 무관한 단일 오버레이 텍스처라
    // 방패와 마찬가지로 여기서 한 번만 만들어 둔다.
    for (let level = 1; level <= BOSS_BUMP_MAX_LEVEL; level += 1) {
      this.textures.addCanvas(`boss_bump_${level}`, createBumpCanvas(level));
    }
  }

  createPlaceholderTextures() {
    this.textures.addCanvas('weapon_portable', createBaseballBatCanvas(PORTABLE_WEAPON_SIZE));
    this.textures.addCanvas('weapon_spoon', createSpoonCanvas(SPOON_WEAPON_SIZE));
    this.textures.addCanvas('weapon_wand', createMagicWandCanvas(WAND_WEAPON_SIZE));
    this.textures.addCanvas('weapon_golf_club', createGolfClubCanvas(GOLF_CLUB_WEAPON_SIZE));
    this.textures.addCanvas('weapon_taser', createTaserCanvas(TASER_WEAPON_SIZE));
    this.textures.addCanvas('weapon_hand', createHandCanvas(HAND_WEAPON_SIZE));
    this.textures.addCanvas('weapon_bad_hand', createHandCanvas(BAD_HAND_WEAPON_SIZE, { skinColor: '#e0574a', skinStroke: '#8f2e24' }));
    this.textures.addCanvas('weapon_lips', createLipsCanvas(LIPS_WEAPON_SIZE));
    this.textures.addCanvas('weapon_bored_bubble', createBoredGirlCanvas(BORED_BUBBLE_WEAPON_SIZE));
    this.textures.addCanvas('weapon_hair_dryer', createHairDryerCanvas(HAIR_DRYER_WEAPON_SIZE));
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
    this.textures.addCanvas('weapon_grenade', createGrenadeCanvas(GRENADE_WEAPON_SIZE));
    this.textures.addCanvas('weapon_dynamite', createDynamiteCanvas(DYNAMITE_WEAPON_SIZE));
    // 문 닫힘/열림 두 상태를 미리 각각 텍스처로 만들어두고, 실제로는 WeaponManager.toggleWashingMachineDoor가
    // setTexture로 갈아끼우기만 한다(재렌더링 없음).
    this.textures.addCanvas('weapon_washing_machine_closed', createWashingMachineCanvas(WASHING_MACHINE_WIDTH, WASHING_MACHINE_HEIGHT, { doorOpen: false }));
    this.textures.addCanvas('weapon_washing_machine_open', createWashingMachineCanvas(WASHING_MACHINE_WIDTH, WASHING_MACHINE_HEIGHT, { doorOpen: true }));

    this.createThrowWeaponTexture();
  }

  // 투척형 무기(addThrowWeapon): 야구공/다트/권총/기관총/확성기. 무기 자체와 던져지는 투사체를 같은
  // 크기로 맞춘다(총알만 예외 — BULLET_SIZE로 훨씬 작게). 다트는 색 조합(DART_COLOR_VARIANTS)마다
  // 투사체 텍스처를 따로 만들어서 발사할 때 랜덤으로 골라 쓴다(WeaponManager.fireProjectile) —
  // 패널 아이콘은 대표로 첫 번째 색 조합 하나만 쓴다.
  createThrowWeaponTexture() {
    this.textures.addCanvas('weapon_throw', createBaseballCanvas(THROW_WEAPON_SIZE));
    this.textures.addCanvas('weapon_throw_projectile', createBaseballCanvas(THROW_WEAPON_SIZE));
    this.textures.addCanvas('weapon_basketball', createBasketballCanvas(THROW_WEAPON_SIZE));
    this.textures.addCanvas('weapon_slingshot_frame', createSlingshotFrameCanvas(SLINGSHOT_FRAME_SIZE));
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
    this.textures.addCanvas('weapon_urea_solution', createUreaSolutionCanvas(THROW_WEAPON_SIZE));
    this.textures.addCanvas('weapon_urea_solution_projectile', createUreaSolutionCanvas(THROW_WEAPON_SIZE));
    this.textures.addCanvas('weapon_beach_ball', createBeachBallCanvas(BEACH_BALL_WEAPON_SIZE));
    this.textures.addCanvas('weapon_beach_ball_projectile', createBeachBallCanvas(BEACH_BALL_WEAPON_SIZE));
  }
}
