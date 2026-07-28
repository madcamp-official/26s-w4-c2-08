// Phaser 기본 폰트(Courier)는 한글 글리프가 없어 텍스트가 잘려 보임 — 한글이 있는 모든 텍스트에 명시적으로 지정
// Galmuri11(도트 폰트, OFL) 웹폰트를 우선 사용 — @font-face는 index.html(dev)과 extension.ts(패키징)에서
// 각각 선언하고 main.js가 document.fonts.load()로 미리 로드해둔다. 로드 실패/미지원 시 시스템 고딕으로 폴백.
export const UI_FONT_FAMILY = '"Galmuri11", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';

// 전투 배경 스타일 — backgrounds.js의 BACKGROUND_STYLES 참고 ('classic' | 'diff' | 'matrix' | 'error')
export const BACKGROUND_STYLE = 'matrix';

export const HIT_COOLDOWN = 300; // ms
export const BASE_DAMAGE_MIN = 5;
export const BASE_DAMAGE_MAX = 15;
export const PET_COOLDOWN = 500; // ms, 쓰다듬기(힐링)는 공격보다 조금 여유 있게
export const HEAL_MIN = 20;
export const HEAL_MAX = 40;
export const HP_BAR_WIDTH = 200;
export const HP_BAR_X = 400; // 보스와 같은 x(화면 중앙)를 유지
export const HP_BAR_Y = 560; // 화면 하단으로 이동 — 보스 체력바를 화면 아래에 두는 보스전 UI 컨벤션
export const TOP_HUD_Y = 30; // Weapon/End 버튼 상단 y 기준 (HP바가 하단으로 빠지면서 별도 상수로 분리)
export const BOSS_SPAWN = { x: 400, y: 400 };
// 상태는 "자거나" 아니면 "돌아다니거나" 둘 중 하나뿐인 단순한 이진 상태다(GameScene.updateIdleDrift).
// 마우스가 눌려있는 동안(실제로 조작 중)은 둘 다 아니고 그 자리에 멈춰 있는다. 손을 뗀 뒤 이
// 시간(1분) 동안 클릭이 한 번도 없으면 자기 시작하고, 그 뒤로는 고정된 지속시간 없이 클릭이
// 들어올 때까지 계속 잔다 — 클릭이 들어오는 순간 곧장 깨서 돌아다니기 시작한다.
export const BOSS_IDLE_TIMEOUT_MS = 60000;
export const BOSS_IDLE_ZZZ_INTERVAL = 1100; // ms, 자는 동안 Zzz 텍스트를 새로 띄우는 간격
export const BOSS_IDLE_DRIFT_SPEED = 28; // px/s, 종료 버튼을 향해 끌려가는 속도
// 끌려가는 동안 좌우로 갸우뚱거리며 걷는 느낌을 주는 흔들림 — 진폭(각도)과 한 번 왕복하는 데 걸리는 시간.
export const BOSS_IDLE_WALK_TILT_DEG = 5;
export const BOSS_IDLE_WALK_CYCLE_MS = 300;
export const BOSS_IDLE_ARRIVAL_DISTANCE = 2; // px, 종료 버튼과 이 거리 이내면 도착으로 보고 멈춘다
// 보스 캐릭터 목록 — 코드/에러 테마 이름 + 픽셀 스프라이트 몸통 색. 첫 항목이 기본 보스.
export const BOSS_TYPES = [
  { id: 'null_pointer', name: 'NULL_POINTER', color: '#e8631a' }, // Classic Coral 후보의 진한 주황
  { id: 'segfault', name: 'SEGFAULT', color: '#c0392b' },
  { id: 'stack_overflow', name: 'STACK_OVERFLOW', color: '#8e44ad' },
  { id: 'memory_leak', name: 'MEMORY_LEAK', color: '#27ae60' },
];
export const DRAW_SCORE_STEP = 100;
export const INITIAL_FREE_DRAWS = 1; // 필드에 무기가 하나도 없는 상태로 시작하므로 시작 시 무기 뽑기 1회를 무료로 제공
export const CONTACT_OVERLAP = 4; // px of intentional overlap left at contact so overlap detection still fires
export const THROW_FIRE_INTERVAL = 400; // ms between auto-fired projectiles while holding the throw weapon
export const THROW_PROJECTILE_SPEED = 400; // px/s, 기본값 — 무기별로 다르면 WEAPON_DEFINITIONS[id].projectileSpeed로 덮어씀
export const BALL_PROJECTILE_SPEED = 640; // px/s, 야구공은 기본보다 빠르게
export const PORTABLE_WEAPON_SIZE = 160; // 야구 방망이 텍스처 크기 — WeaponManager의 캡슐 히트박스 계산도 이 값을 같이 씀
export const THROW_WEAPON_SIZE = 40; // 야구공(투척형) 텍스처 크기 — 무기 자체와 던져지는 투사체가 같은 크기를 쓴다 (기존 50에서 20% 축소)
// 투사체는 정사각 캔버스에 그린 둥근 이모지라, 사각 히트박스 그대로 쓰면 실제 공 그림이 없는 네 모서리까지
// 보스와의 판정에 끼어들어 히트박스가 커 보인다. 실제 그림 크기에 맞춰 원형으로 판정한다.
export const THROW_PROJECTILE_HIT_RADIUS = THROW_WEAPON_SIZE * 0.4;

// 무기 동작 방식 — 배경 선택 패널과 같은 방식으로 Hud의 무기 패널에서 종류를 직접 고른다.
// PORTABLE(휴대형)은 방망이 전용 대각선 캡슐 판정으로 들고 부딪혀서 데미지 — WeaponManager의
// getBatAxis/batOverlapsBoss가 BAT_DIMENSIONS를 그대로 쓰기 때문에 방망이 말고 다른 모양에는 안 맞다.
// STATIC은 그냥 사각 판정으로 들고 부딪히는 무기(전기충격기 등), THROW는 들고 있는 동안 자동 연사.
// BOOMERANG: 들고 있는 동안은 판정 없이 그냥 따라다니기만 하다가(보스에 갖다 댈 필요 없음), 손을 떼는
// 순간(WeaponManager.throwBoomerang) 놓은 자리에서 보스 반대쪽으로 살짝 날아갔다가 보스 쪽으로 곡선을
// 그리며 되돌아와 부딪히는 1회성 투사체가 된다. THROW(들고 있는 동안 자동 연사)와는 완전히 다른 동작.
// BOMB: 어디든 놓을 수 있는(보스에 안 닿아도 됨) 투척형 — 손을 떼면 그 자리에 놓이고(WeaponManager.armBomb),
// 자체 퓨즈 타이머가 다 돼야 터진다. 터지는 순간 보스가 폭발 반경(blastRadius) 안에 있으면 그때만
// 데미지가 들어간다 — BOOMERANG처럼 든 사람 손을 떠난 뒤 자기 혼자 판정을 관리하는 무기라는 점은 같지만,
// 판정 방식이 오버랩이 아니라 "터지는 순간의 거리"라는 점이 다르다.
export const WEAPON_CATEGORIES = {
  PORTABLE: 'portable',
  STATIC: 'static',
  THROW: 'throw',
  BOOMERANG: 'boomerang',
  BOMB: 'bomb',
};

// 무기 패널에 실제로 보이는 개별 무기. category가 동작 방식을 정하고, 같은 category를 여러 무기가
// 공유할 수 있다 — 야구공/다트 둘 다 투척형(THROW)이지만 그림(texture/projectileTexture)만 다르다.
export const WEAPON_IDS = {
  BAT: 'bat',
  BALL: 'ball',
  DART: 'dart',
  TASER: 'taser',
  HAND: 'hand',
  BAD_HAND: 'bad_hand',
  KEYBOARD: 'keyboard',
  MEGAPHONE: 'megaphone',
  PISTOL: 'pistol',
  MACHINE_GUN: 'machine_gun',
  SHOTGUN: 'shotgun',
  SNIPER: 'sniper',
  REVOLVER: 'revolver',
  WHIP: 'whip',
  BAMBOO_CANE: 'bamboo_cane',
  SQUISHY: 'squishy',
  DEBUGGER: 'debugger',
  RUBBER_DUCK: 'rubber_duck',
  TEDDY_BEAR: 'teddy_bear',
  CHEESE_SQUISHY: 'cheese_squishy',
  TOMATO: 'tomato',
  WATERMELON: 'watermelon',
  WATER_BALLOON: 'water_balloon',
  FRYING_PAN: 'frying_pan',
  SLIPPER: 'slipper',
  BOXING_GLOVE: 'boxing_glove',
  BEACH_BALL: 'beach_ball',
  BOOMERANG: 'boomerang',
  GRENADE: 'grenade',
  DYNAMITE: 'dynamite',
};

export const TASER_WEAPON_SIZE = 70; // 전기충격기 텍스처 크기 — 방망이보다 작은 소형 휴대 도구
export const HAND_WEAPON_SIZE = 70; // 쓰다듬는 손(착한 손) 텍스처 크기
export const BAD_HAND_WEAPON_SIZE = 70; // 주먹(나쁜 손) 텍스처 크기
export const KEYBOARD_WEAPON_SIZE = 90; // 키보드 텍스처 크기
export const MEGAPHONE_WEAPON_SIZE = 90; // 확성기 텍스처 크기
export const PISTOL_WEAPON_SIZE = 80; // 권총 텍스처 크기
export const MACHINE_GUN_WEAPON_SIZE = 90; // 기관총 텍스처 크기 (권총보다 총열이 길어서 조금 더 큼)
export const SHOTGUN_WEAPON_SIZE = 95; // 산탄총 텍스처 크기 — 펌프 손잡이까지 있어서 기관총보다 살짝 큼
export const SNIPER_WEAPON_SIZE = 110; // 저격총 텍스처 크기 — 긴 총열 + 스코프라 가장 큼
export const REVOLVER_WEAPON_SIZE = 78; // 리볼버 텍스처 크기 — 권총과 비슷한 소형
export const WHIP_WEAPON_SIZE = 100; // 채찍 텍스처 크기 — 지그재그로 넓게 뻗어서 다른 STATIC 무기보다 큼
export const BAMBOO_CANE_WEAPON_SIZE = 100; // 대나무 회초리 텍스처 크기 — 채찍처럼 길게 뻗는 무기라 동일 크기
export const SQUISHY_WEAPON_SIZE = 76; // 말랑이 텍스처 크기 — 손/전기충격기 정도의 소형 휴대 크기
export const DEBUGGER_WEAPON_SIZE = 90; // 디버거 텍스처 크기
export const RUBBER_DUCK_WEAPON_SIZE = 76; // 러버덕 텍스처 크기 — 말랑이와 같은 소형 휴대 크기
export const TEDDY_BEAR_WEAPON_SIZE = 80; // 곰인형 텍스처 크기 — 러버덕보다 살짝 큰 봉제인형
export const CHEESE_SQUISHY_WEAPON_SIZE = 76; // 치즈 말랑이 텍스처 크기 — 말랑이와 동일 소형 크기
export const FRYING_PAN_WEAPON_SIZE = 130; // 프라이팬 텍스처 크기 — 손잡이를 더 길게 늘려서 채찍/회초리보다 큼
export const SLIPPER_WEAPON_SIZE = 80; // 슬리퍼 텍스처 크기 — 납작한 실루엣이라 중간 크기
export const BOXING_GLOVE_WEAPON_SIZE = 80; // 권투 글러브 텍스처 크기 — 손 정도의 중간 휴대 크기
export const WATERMELON_WEAPON_SIZE = 56; // 수박 텍스처 크기 — 다른 투척형(THROW_WEAPON_SIZE=40)보다 크게
export const TOMATO_WEAPON_SIZE = 52; // 토마토 텍스처 크기 — 터지는 이펙트(spawnTomatoBurstEffect)가 잘 보이도록 THROW_WEAPON_SIZE보다 크게
export const BEACH_BALL_WEAPON_SIZE = 56; // 비치볼 텍스처 크기 — 통통 튀는 이펙트가 잘 보이도록 THROW_WEAPON_SIZE보다 크게
export const BOOMERANG_WEAPON_SIZE = 70; // 부메랑 텍스처 크기 — 전기충격기/손 정도의 소형 휴대 크기
export const BOOMERANG_HIT_RADIUS = BOOMERANG_WEAPON_SIZE * 0.4; // 날아가는 동안 원형 판정 반지름 (THROW_PROJECTILE_HIT_RADIUS와 같은 비율)
export const BOOMERANG_OUT_DISTANCE = 110; // px, 놓은 자리에서 보스 반대쪽으로 먼저 날아가는 거리
export const BOOMERANG_OUT_DURATION = 260; // ms, 나가는 구간 소요 시간
export const BOOMERANG_BACK_DURATION = 420; // ms, 보스 쪽으로 곡선을 그리며 되돌아오는 구간 소요 시간
export const BOOMERANG_CURVE_BULGE = 90; // px, 되돌아오는 경로가 옆으로 부푸는 정도 — 직선이 아니라 진짜 부메랑처럼 곡선으로 돌아오게 한다
export const BOOMERANG_SPIN_TURNS = 3; // 비행 전체 동안 시각적으로 회전하는 총 바퀴 수
export const DEBUGGER_FREEZE_DURATION = 2000; // ms, 브레이크포인트에 맞으면 드래그로 못 옮기는 시간

// BOMB 카테고리 2종(수류탄/다이너마이트) — 손을 떼면 그 자리에 놓이고(WeaponManager.armBomb) 퓨즈가
// 다 타야 터진다. 다이너마이트가 수류탄보다 퓨즈가 길고 반경/데미지가 큰 대신 느긋한 한 방 무기.
export const GRENADE_WEAPON_SIZE = 60;
export const GRENADE_FUSE_DURATION = 1800; // ms, 놓은 뒤 터지기까지
export const GRENADE_BLAST_RADIUS = 100; // px, 터지는 순간 이 반경 안에 보스가 있어야 데미지가 들어간다
export const GRENADE_DAMAGE_MULTIPLIER = 2.2;
export const DYNAMITE_WEAPON_SIZE = 70;
export const DYNAMITE_FUSE_DURATION = 2600; // ms
export const DYNAMITE_BLAST_RADIUS = 190; // px, 수류탄보다 확실히 넓게(1.9배)
export const DYNAMITE_DAMAGE_MULTIPLIER = 3.2;
// 다이너마이트끼리 이 거리 안에 붙어 있으면 하나가 터질 때 나머지도 같이 연쇄 폭발한다
// (WeaponManager.collectDynamiteChain) — 서로 떨어져 있어도 사슬처럼 연결되면 다 같이 묶인다.
// 묶인 개수(추가 1개당)만큼 반경/데미지가 크게 불어나서 여러 개를 모아두면 "개크게" 터진다.
export const DYNAMITE_CHAIN_LINK_RADIUS = 90; // px
export const DYNAMITE_CHAIN_RADIUS_BONUS_PER_EXTRA = 0.6; // 연쇄당 반경 60%씩 추가
export const DYNAMITE_CHAIN_DAMAGE_BONUS_PER_EXTRA = 0.9; // 연쇄당 데미지 배율 90%씩 추가
export const SOUND_WAVE_PROJECTILE_SIZE = 34; // 확성기가 쏘는 소리 파동 투사체 텍스처 크기
// 확성기는 터치형이 아니라 원거리 투척형 — 클릭한 자리와 상관없이 보스 쪽으로 자동 발사되고,
// 소리 파동이 눈에 잘 보이게 속도는 느긋하게 잡는다.
export const MEGAPHONE_FIRE_INTERVAL = 450; // ms
export const MEGAPHONE_PROJECTILE_SPEED = 320; // px/s
export const BULLET_SIZE = 24; // 총알(투사체) 텍스처 크기 — 야구공/다트보다 작게
// 총알은 텍스처 자체가 THROW_WEAPON_SIZE보다 작아서 기본 THROW_PROJECTILE_HIT_RADIUS를 그대로 쓰면
// 판정 원이 텍스처보다 커져버린다 — WEAPON_DEFINITIONS[id].projectileHitRadius로 따로 덮어쓴다.
export const BULLET_HIT_RADIUS = BULLET_SIZE * 0.35;
export const PELLET_SIZE = 14; // 산탄총 펠릿(구슬) 텍스처 크기 — 총알보다도 작은 동그란 점
export const PELLET_HIT_RADIUS = PELLET_SIZE * 0.4;

// 권총: 연사 간격 길고(느림) 한 발이 강함. 기관총: 연사 간격 짧고(빠름) 한 발이 약함 —
// 초당 기대 데미지가 서로 비슷한 수준이 되도록 간격/배율을 반비례로 잡았다.
export const PISTOL_FIRE_INTERVAL = 550; // ms
export const PISTOL_PROJECTILE_SPEED = 700; // px/s
export const PISTOL_DAMAGE_MULTIPLIER = 1.6;
export const MACHINE_GUN_FIRE_INTERVAL = 130; // ms
export const MACHINE_GUN_PROJECTILE_SPEED = 620; // px/s
export const MACHINE_GUN_DAMAGE_MULTIPLIER = 0.5;
export const MACHINE_GUN_RECOIL_ANGLE = 10; // deg, 발사할 때마다 총이 뒤로 젖혀지는 각도

// 산탄총: 한 번 당길 때 여러 발(pelletCount)이 부채꼴(spreadAngleDeg)로 동시에 나간다 — 낱개 데미지는
// 약하지만 다 맞으면 한 방이 세다. 연사 간격은 셋 중 가장 느리다(재장전 텀 느낌).
export const SHOTGUN_FIRE_INTERVAL = 750; // ms
export const SHOTGUN_PROJECTILE_SPEED = 560; // px/s
export const SHOTGUN_DAMAGE_MULTIPLIER = 0.55; // 펠릿 1개당 배율 — 5발 다 맞으면 대략 2.75배
export const SHOTGUN_PELLET_COUNT = 5;
export const SHOTGUN_SPREAD_ANGLE_DEG = 30; // 펠릿들이 퍼지는 총 각도
export const SHOTGUN_RECOIL_ANGLE = 14; // deg, 셋 중 반동이 가장 크다

// 저격총: 연사 간격이 가장 길고 탄속이 가장 빠른 대신 한 발 데미지가 압도적으로 세다.
export const SNIPER_FIRE_INTERVAL = 1200; // ms
export const SNIPER_PROJECTILE_SPEED = 950; // px/s
export const SNIPER_DAMAGE_MULTIPLIER = 3;
export const SNIPER_RECOIL_ANGLE = 8; // deg

// 리볼버: 권총(느림·강함)과 기관총(빠름·약함) 사이 — 연사/데미지 둘 다 중간값으로 잡아 셋 중 가장 무난하다.
export const REVOLVER_FIRE_INTERVAL = 340; // ms
export const REVOLVER_PROJECTILE_SPEED = 660; // px/s
export const REVOLVER_DAMAGE_MULTIPLIER = 0.9;
export const REVOLVER_RECOIL_ANGLE = 9; // deg

export const BAMBOO_CANE_DAMAGE_MULTIPLIER = 1.15; // 회초리답게 다른 STATIC 무기보다 한 대가 조금 더 아프다

// 저격총 전용 스코프 뷰 — 화면 왼쪽 위에 별도 카메라(GameScene.createSniperScope)로 보스 주변만 확대해서
// 보여주는 작은 원형 렌즈. 메인 카메라는 절대 안 건드린다 — HUD(체력바/버튼/무기 패널)까지 같이
// 확대/이동되면 좌표계가 깨지므로, 스코프 카메라는 그 UI들을 ignore()하고 게임 월드만 따로 확대해서 그린다.
export const SNIPER_SCOPE_DIAMETER = 190; // px
export const SNIPER_SCOPE_ZOOM = 2.3;
export const SNIPER_SCOPE_MARGIN = 120; // px, 화면 좌상단에서 스코프 중심까지 거리 (체력바/패널과 안 겹치는 자리)

// 다트 색 조합 — 실제로 여러 발 던지면 같은 색만 반복돼 단조로우니, 발사할 때마다 이 중 하나를
// 랜덤으로 골라서 쓴다(WeaponManager.fireProjectile). 순서대로 텍스처 키가 weapon_dart_projectile_0, _1 ...로
// 생성된다 (DART_PROJECTILE_TEXTURES, BootScene에서 이 이름으로 등록).
export const DART_COLOR_VARIANTS = [
  { shaftColor: '#d1483f', shaftStrokeColor: '#8a2f28', finColor: '#3f7fe0' }, // 빨강 샤프트 + 파랑 깃
  { shaftColor: '#e0a63f', shaftStrokeColor: '#966c1f', finColor: '#3f7fe0' }, // 노랑 샤프트 + 파랑 깃
  { shaftColor: '#3f7fe0', shaftStrokeColor: '#274f8f', finColor: '#e0a63f' }, // 파랑 샤프트 + 노랑 깃
  { shaftColor: '#4caf50', shaftStrokeColor: '#2e6b31', finColor: '#e0a63f' }, // 초록 샤프트 + 노랑 깃
];
export const DART_PROJECTILE_TEXTURES = DART_COLOR_VARIANTS.map((_, i) => `weapon_dart_projectile_${i}`);

// texture: 패널 아이콘 + 필드에 들고 있을 때 쓰는 텍스처. projectileTexture(단일)/projectileTextures(여러 개
// 중 랜덤): THROW 무기가 실제로 쏘는 투사체 텍스처 (PORTABLE은 투사체가 없어서 없음).
// rotateToTravel: 발사 각도로 투사체 자체를 회전시킬지 — 공은 둥글어서 필요 없지만 다트는 뾰족해서
// 날아가는 방향을 보고 있어야 자연스럽다 (텍스처가 각도 0 = 오른쪽을 보게 그려져 있어 baked 보정 불필요).
// stickOnHit: 맞는 순간 즉시 사라지는 대신 그 자리에 잠깐 박힌 채로 남아 있다가 사라지게 할지.
// fireSound: 발사 시(THROW) 재생할 사운드 키. hitSound: 실제로 데미지가 들어갈 때(CombatSystem.handleHit)
// 재생할 사운드 키 — 무기마다 따로 정의해야 STATIC 카테고리를 공유하는 전기충격기/키보드가 서로
// 다른 소리를 낼 수 있다 (없으면 무음).
export const WEAPON_DEFINITIONS = {
  // 아래부터 damageMultiplier는 총기류(연사/한방 트레이드오프)처럼 명시적으로 튜닝된 것들 말고는
  // 대부분 기본값 1이었는데, 실제 무기가 무엇으로 만들어졌는지("물성")와 안 맞는 경우가 많았다
  // (예: 물풍선이 야구 방망이랑 데미지가 같음). 무겁고 단단한 재질일수록 배율을 올리고, 가볍거나
  // 무른(천/고무/물 등) 재질일수록 내려서 무기별로 "맞는 느낌"이 다르게 조정했다.
  [WEAPON_IDS.BAT]: {
    // 알루미늄 배트 — 무기 패널에서 가장 단단한 재질 축에 속해서 직접 휘두르는 PORTABLE답게 세게 잡는다.
    name: 'BAT', category: WEAPON_CATEGORIES.PORTABLE, texture: 'weapon_portable', hitSound: 'bat_hit', damageMultiplier: 1.3,
  },
  [WEAPON_IDS.BALL]: {
    name: 'BASEBALL',
    category: WEAPON_CATEGORIES.THROW,
    texture: 'weapon_throw',
    projectileTexture: 'weapon_throw_projectile',
    projectileSpeed: BALL_PROJECTILE_SPEED,
    fireSound: 'baseball_throw',
    hitSound: 'bat_hit', // 야구공 타격음은 방망이와 동일한 효과음을 그대로 쓴다.
    damageMultiplier: 0.9, // 단단하지만 배트보다 작고 가벼운 공
  },
  [WEAPON_IDS.DART]: {
    name: 'DART',
    category: WEAPON_CATEGORIES.THROW,
    texture: 'weapon_dart',
    projectileTextures: DART_PROJECTILE_TEXTURES,
    rotateToTravel: true,
    stickOnHit: true,
    fireSound: 'dart_throw',
    damageMultiplier: 0.8, // 뾰족하지만 가벼운 투척물
  },
  [WEAPON_IDS.TASER]: {
    name: 'TASER', category: WEAPON_CATEGORIES.STATIC, texture: 'weapon_taser', hitSound: 'taser_shock',
    rotateToBoss: true,
    damageMultiplier: 0.8, // 감전 CC가 본체 역할이라 물리 데미지는 가볍게
  },
  // heals: 데미지 대신 보스 체력을 회복시키는 무기라는 표시 — GameScene이 이 무기는
  // handleHit(데미지) 대신 handlePet(힐링)으로 따로 처리한다(heals 플래그로 판단, weaponId 하드코딩 아님).
  [WEAPON_IDS.HAND]: {
    name: 'GOOD HAND', category: WEAPON_CATEGORIES.STATIC, texture: 'weapon_hand', heals: true,
  },
  // 나쁜 손: 착한 손이랑 짝 — 힐링 없이 그냥 주먹으로 때리는 평범한 데미지 무기.
  [WEAPON_IDS.BAD_HAND]: {
    name: 'BAD HAND', category: WEAPON_CATEGORIES.STATIC, texture: 'weapon_bad_hand', hitSound: 'bat_hit', damageMultiplier: 0.9,
  },
  [WEAPON_IDS.KEYBOARD]: {
    name: 'KEYBOARD', category: WEAPON_CATEGORIES.STATIC, texture: 'weapon_keyboard', hitSound: 'keyboard_smash',
  },
  // hitSound 없음(아직 맞는 효과음 에셋이 없어서 무음) — 이펙트(spawnSoundWaveEffect, GameScene)로만 구분.
  // 클릭한 자리와 상관없이 보스 방향으로 자동 발사되는 원거리형(THROW) — 소리 파동(동심원) 투사체가 날아간다.
  [WEAPON_IDS.MEGAPHONE]: {
    name: 'MEGAPHONE',
    category: WEAPON_CATEGORIES.THROW,
    texture: 'weapon_megaphone',
    projectileTexture: 'weapon_sound_wave',
    projectileSpeed: MEGAPHONE_PROJECTILE_SPEED,
    fireInterval: MEGAPHONE_FIRE_INTERVAL,
    damageMultiplier: 0.7, // 소리 파동은 실체가 없는 충격이라 가장 약하게
  },
  [WEAPON_IDS.PISTOL]: {
    name: 'PISTOL',
    category: WEAPON_CATEGORIES.THROW,
    texture: 'weapon_pistol',
    projectileTexture: 'weapon_pistol_bullet',
    projectileSpeed: PISTOL_PROJECTILE_SPEED,
    projectileHitRadius: BULLET_HIT_RADIUS,
    fireInterval: PISTOL_FIRE_INTERVAL,
    damageMultiplier: PISTOL_DAMAGE_MULTIPLIER,
    rotateToTravel: true,
    hitSound: 'pistol_impact',
    hitVolume: 1.4, // 강한 무기라 기본 볼륨(1)보다 크게
    bigImpact: true, // 데미지가 센 무기라 히트 스파크를 더 크게 띄운다 (GameScene.spawnHitSpark scale 참고)
  },
  [WEAPON_IDS.MACHINE_GUN]: {
    name: 'MACHINE GUN',
    category: WEAPON_CATEGORIES.THROW,
    texture: 'weapon_machine_gun',
    projectileTexture: 'weapon_machine_gun_bullet',
    projectileSpeed: MACHINE_GUN_PROJECTILE_SPEED,
    projectileHitRadius: BULLET_HIT_RADIUS,
    fireInterval: MACHINE_GUN_FIRE_INTERVAL,
    damageMultiplier: MACHINE_GUN_DAMAGE_MULTIPLIER,
    recoilAngle: MACHINE_GUN_RECOIL_ANGLE,
    rotateToTravel: true,
  },
  // pelletCount/spreadAngleDeg: WeaponManager.fireProjectile이 한 번 발사할 때 이 각도 범위 안에 고르게
  // 퍼진 pelletCount개의 투사체를 동시에 만든다 (사운드/반동은 발사 1회당 한 번만).
  [WEAPON_IDS.SHOTGUN]: {
    name: 'SHOTGUN',
    category: WEAPON_CATEGORIES.THROW,
    texture: 'weapon_shotgun',
    projectileTexture: 'weapon_pellet',
    projectileSpeed: SHOTGUN_PROJECTILE_SPEED,
    projectileHitRadius: PELLET_HIT_RADIUS,
    fireInterval: SHOTGUN_FIRE_INTERVAL,
    damageMultiplier: SHOTGUN_DAMAGE_MULTIPLIER,
    pelletCount: SHOTGUN_PELLET_COUNT,
    spreadAngleDeg: SHOTGUN_SPREAD_ANGLE_DEG,
    recoilAngle: SHOTGUN_RECOIL_ANGLE,
    hitSound: 'pistol_impact',
  },
  [WEAPON_IDS.SNIPER]: {
    name: 'SNIPER',
    category: WEAPON_CATEGORIES.THROW,
    texture: 'weapon_sniper',
    projectileTexture: 'weapon_sniper_bullet',
    projectileSpeed: SNIPER_PROJECTILE_SPEED,
    projectileHitRadius: BULLET_HIT_RADIUS,
    fireInterval: SNIPER_FIRE_INTERVAL,
    damageMultiplier: SNIPER_DAMAGE_MULTIPLIER,
    recoilAngle: SNIPER_RECOIL_ANGLE,
    rotateToTravel: true,
    hitSound: 'pistol_impact',
    hitVolume: 1.6, // 셋 중 가장 강한 한 방이라 권총보다도 크게
    bigImpact: true,
    // 들고 있는 동안(GameScene pointerdown~pointerup) 왼쪽 위에 확대 스코프 뷰가 뜬다 (createSniperScope).
    zoomOnAim: true,
    // 스코프로 보스를 조준하는 무기답게 총열이 항상 보스 쪽을 향해야 자연스러워서, THROW 카테고리지만
    // TASER처럼 rotateToBoss로 들고 있는 총 자체를 보스 방향으로 돌린다 (WeaponManager 참고).
    // 텍스처가 각도 0(오른쪽)을 바라보게 그려져 있어 baked 보정 없이 그대로 회전시키면 된다.
    rotateToBoss: true,
  },
  [WEAPON_IDS.REVOLVER]: {
    name: 'REVOLVER',
    category: WEAPON_CATEGORIES.THROW,
    texture: 'weapon_revolver',
    projectileTexture: 'weapon_revolver_bullet',
    projectileSpeed: REVOLVER_PROJECTILE_SPEED,
    projectileHitRadius: BULLET_HIT_RADIUS,
    fireInterval: REVOLVER_FIRE_INTERVAL,
    damageMultiplier: REVOLVER_DAMAGE_MULTIPLIER,
    recoilAngle: REVOLVER_RECOIL_ANGLE,
    rotateToTravel: true,
    hitSound: 'pistol_impact',
  },
  // 방망이처럼 휘두르는 느낌이지만 캡슐(BAT_DIMENSIONS)은 채찍의 지그재그 실루엣과 안 맞아서
  // STATIC(사각 판정)으로 둔다 — 다른 STATIC 무기보다 텍스처가 넓어서 판정 범위도 자연히 더 넉넉하다.
  // meleeSwing: 맞는 순간 보스 쪽으로 홱 겨눴다가 원위치로 스프링백하는 스윙 모션을 튼다
  // (WeaponManager.playMeleeSwing) — 가만히 들고만 있는 다른 STATIC 무기와 달리 채찍답게 후려치는
  // 느낌을 준다.
  [WEAPON_IDS.WHIP]: {
    name: 'WHIP', category: WEAPON_CATEGORIES.STATIC, texture: 'weapon_whip', meleeSwing: true, damageMultiplier: 0.9, // 얇은 가죽끈 — 후려치지만 뭉개는 무게감은 없다
  },
  // 채찍과 같은 스윙 모션(meleeSwing)을 재사용 — 회초리도 후려치는 무기라 가만히 들고만 있는 다른
  // STATIC 무기와 결이 다르다. damageMultiplier로 한 대가 조금 더 아프게만 차별화한다.
  [WEAPON_IDS.BAMBOO_CANE]: {
    name: 'BAMBOO CANE',
    category: WEAPON_CATEGORIES.STATIC,
    texture: 'weapon_bamboo_cane',
    meleeSwing: true,
    damageMultiplier: BAMBOO_CANE_DAMAGE_MULTIPLIER,
    hitSound: 'bat_hit',
  },
  // squishHit: 스윙 대신 맞는 순간 말랑하게 눌렸다 되돌아오는 찌부 모션을 튼다 (WeaponManager.playSquish) —
  // 이름 그대로 "말랑말랑"한 장난감다운 타격감을 주려는 의도. 말랑이 계열은 전부 부드러운 재질이라
  // 다른 STATIC 무기보다 데미지를 낮게 잡는다.
  [WEAPON_IDS.SQUISHY]: {
    name: 'SQUISHY', category: WEAPON_CATEGORIES.STATIC, texture: 'weapon_squishy', squishHit: true, damageMultiplier: 0.6,
  },
  // freezesBoss: 데미지 자체는 평범하지만, 맞으면 GameScene의 drag 리스너가 잠깐 boss.isFrozen을
  // 보고 드래그 이동을 막는다(Boss.freeze) — 보스가 자체 행동이 없는 게임이라 "기절"보다
  // "위치 고정"이 실제로 의미 있는 CC라고 판단해서 그렇게 구현했다.
  // meleeSwing: 노트북을 실제로 휘둘러서 때리는 느낌을 주는 스윙 모션 (WHIP과 같은 메커니즘 재사용).
  [WEAPON_IDS.DEBUGGER]: {
    name: 'DEVELOPER', category: WEAPON_CATEGORIES.STATIC, texture: 'weapon_debugger', freezesBoss: true, meleeSwing: true, damageMultiplier: 1.1, // 노트북 — 딱딱한 편
  },
  // 말랑이(squishHit) 계열 3종 — 모양만 다르고 동작(찌부 모션)은 SQUISHY와 동일하다. hitSound 에셋이
  // 아직 없어서 무음. SQUISHY와 같은 이유로 데미지도 낮게 잡는다.
  [WEAPON_IDS.RUBBER_DUCK]: {
    name: 'RUBBER DUCK', category: WEAPON_CATEGORIES.STATIC, texture: 'weapon_rubber_duck', squishHit: true, damageMultiplier: 0.6,
  },
  [WEAPON_IDS.TEDDY_BEAR]: {
    name: 'TEDDY BEAR', category: WEAPON_CATEGORIES.STATIC, texture: 'weapon_teddy_bear', squishHit: true, damageMultiplier: 0.6,
  },
  [WEAPON_IDS.CHEESE_SQUISHY]: {
    name: 'CHEESE SQUISHY', category: WEAPON_CATEGORIES.STATIC, texture: 'weapon_cheese_squishy', squishHit: true, damageMultiplier: 0.6,
  },
  // 투척형 신규 3종. 토마토/수박은 GameScene.onHit에서 weaponId로 분기해 전용 터짐/쪼개짐 이펙트를 낸다.
  [WEAPON_IDS.TOMATO]: {
    name: 'TOMATO',
    category: WEAPON_CATEGORIES.THROW,
    texture: 'weapon_tomato',
    projectileTexture: 'weapon_tomato_projectile',
    fireSound: 'baseball_throw',
    damageMultiplier: 0.6, // 물러서 터지기만 할 뿐 단단하게 맞는 느낌이 아니다
  },
  [WEAPON_IDS.WATERMELON]: {
    name: 'WATERMELON',
    category: WEAPON_CATEGORIES.THROW,
    texture: 'weapon_watermelon',
    projectileTexture: 'weapon_watermelon_projectile',
    fireSound: 'baseball_throw',
    bigImpact: true,
    damageMultiplier: 1.5, // 크고 무거운 과일 — bigImpact 비주얼에 맞게 데미지도 확실히 무겁게
  },
  [WEAPON_IDS.WATER_BALLOON]: {
    name: 'WATER BALLOON',
    category: WEAPON_CATEGORIES.THROW,
    texture: 'weapon_water_balloon',
    projectileTexture: 'weapon_water_balloon_projectile',
    fireSound: 'baseball_throw',
    damageMultiplier: 0.5, // 거의 물 — 무기 중 가장 약하게
  },
  [WEAPON_IDS.BEACH_BALL]: {
    name: 'BEACH BALL',
    category: WEAPON_CATEGORIES.THROW,
    texture: 'weapon_beach_ball',
    projectileTexture: 'weapon_beach_ball_projectile',
    fireSound: 'baseball_throw',
    damageMultiplier: 0.5, // 속이 빈 공기뿐이라 튕겨나가는 느낌이 맞지 세게 때리는 무기는 아니다
  },
  // meleeSwing 계열 3종 — 채찍/노트북과 같은 후려치는 스윙 모션(WeaponManager.playMeleeSwing)을 재사용한다.
  [WEAPON_IDS.FRYING_PAN]: {
    name: 'FRYING PAN', category: WEAPON_CATEGORIES.STATIC, texture: 'weapon_frying_pan', meleeSwing: true, damageMultiplier: 1.4, // 무쇠 프라이팬 — 이 게임에서 가장 무거운 근접 재질
  },
  [WEAPON_IDS.SLIPPER]: {
    name: 'SLIPPER', category: WEAPON_CATEGORIES.STATIC, texture: 'weapon_slipper', meleeSwing: true, damageMultiplier: 0.8, // 등짝 스매싱 밈이지 실제로 단단한 물건은 아니다
  },
  // 직선 펀치답게 다른 STATIC 무기보다 한 방이 더 아프도록 damageMultiplier를 살짝 높게 잡는다.
  // bigImpact: 히트 스파크를 다른 STATIC 무기보다 크게(spawnHitSpark scale) + GameScene.onHit에서 카메라
  // shake까지 추가로 겹쳐서 데미지 배율이 높은 무기다운 타격감을 준다.
  [WEAPON_IDS.BOXING_GLOVE]: {
    name: 'BOXING GLOVE', category: WEAPON_CATEGORIES.STATIC, texture: 'weapon_boxing_glove', meleeSwing: true, damageMultiplier: 1.2, bigImpact: true,
  },
  // 놓는 순간 던져지는 1회성 무기 — fireSound는 다른 THROW 무기처럼 발사 시점(WeaponManager.throwBoomerang)에
  // 재생한다. hitSound 에셋은 아직 없어서 무음.
  [WEAPON_IDS.BOOMERANG]: {
    name: 'BOOMERANG', category: WEAPON_CATEGORIES.BOOMERANG, texture: 'weapon_boomerang', fireSound: 'baseball_throw', damageMultiplier: 1.1, // 단단한 나무/플라스틱 재질
  },
  // 폭탄류 — 어디든 놓아두면(WeaponManager.armBomb) 퓨즈가 다 탈 때까지 기다렸다 터진다. 터지는 순간
  // 보스가 blastRadius 안에 없으면 그냥 허탕("불발"처럼 보임) — 데미지 없이 폭발 이펙트만 재생된다.
  [WEAPON_IDS.GRENADE]: {
    name: 'GRENADE',
    category: WEAPON_CATEGORIES.BOMB,
    texture: 'weapon_grenade',
    fuseDuration: GRENADE_FUSE_DURATION,
    blastRadius: GRENADE_BLAST_RADIUS,
    damageMultiplier: GRENADE_DAMAGE_MULTIPLIER,
    fireSound: 'baseball_throw',
    bigImpact: true,
  },
  [WEAPON_IDS.DYNAMITE]: {
    name: 'DYNAMITE',
    category: WEAPON_CATEGORIES.BOMB,
    texture: 'weapon_dynamite',
    fuseDuration: DYNAMITE_FUSE_DURATION,
    blastRadius: DYNAMITE_BLAST_RADIUS,
    damageMultiplier: DYNAMITE_DAMAGE_MULTIPLIER,
    fireSound: 'baseball_throw',
    bigImpact: true,
  },
};

export const DART_STICK_DURATION = 8000; // ms, 다트가 맞은 자리에 박힌 채로 남아 있다가 사라지기까지 시간
export const DART_EMBED_DEPTH = 10; // px, 맞은 지점에서 날아가던 방향으로 더 파고들어가 보이게 미는 거리

// 타격 이펙트
export const BOSS_KNOCKBACK_DISTANCE = 26; // px, 타격당 타격 반대 방향으로 밀려나는 거리 (누적됨)
export const BOSS_KNOCKBACK_OUT_DURATION = 70; // ms, 밀려나는 트윈 시간
// 보스가 화면 구석(두 벽이 만나는 자리)에 있을 때 맞으면, 그 자리에서 찔끔 밀려나는 평소 knockback
// 대신 화면을 가로질러 대각선 반대쪽 구석까지 날아가 튕긴다(Boss.flyToOppositeCorner) — 화면을
// 훨씬 더 가로지르는 이동이라 평소 넉백 지속시간보다 길게 잡는다.
export const BOSS_CORNER_MARGIN = 60; // px, 이 거리 안에 두 벽이 동시에 있으면 "구석"으로 본다
export const BOSS_CORNER_BOUNCE_DURATION = 380; // ms
export const BOSS_PANEL_PUSH_DURATION = 300; // ms, 무기/배경 패널에 부딪혀 왼쪽 벽까지 날아가는 트윈 시간
export const BOSS_PANEL_PUSH_DAMAGE_MULTIPLIER = 2; // 패널에 부딪혀 왼쪽 벽까지 날아갈 때 추가로 받는 데미지 배율
export const BOSS_PANEL_PUSH_POPUP_COLOR = '#ff5050'; // 패널 충돌 보너스 데미지 팝업 색 (일반 데미지와 구분)
// 나가기 버튼으로 걷다가(idle drift) 열린 패널을 만나면 멈춰서 이 시간만큼 화난 표정을 유지하며 미는
// 연출을 보여준 뒤 패널을 닫고 다시 걷기 시작한다.
export const BOSS_IDLE_PANEL_PUSH_HOLD_MS = 1000;
// 실제 패널 경계(getOpenPanelBoundaryX)보다 이만큼 일찍 "만났다"고 판정한다 — 걷는 도중 한 프레임의
// 이동량이나, 이미 그 자리에서 쉬고 있는데 패널이 막 열린 경우처럼 판정이 한 프레임 늦어질 수 있는
// 여지를 넉넉히 흡수해서, checkBossAgainstPanel의 flyOutToLeftWall(왼쪽 벽으로 날아가기)보다
// 항상 먼저 걸리게 하기 위한 여유값.
export const BOSS_IDLE_PANEL_APPROACH_MARGIN = 10;
export const BOSS_FLASH_DURATION = 120; // ms
export const BOSS_HURT_FACE_DURATION = 300; // ms, 피격 시 눈이 X_X로 바뀌어 있는 시간
export const BOSS_HAPPY_FACE_DURATION = 700; // ms, 쓰다듬을 때 웃는 표정이 유지되는 시간
export const BOSS_BLINK_DURATION = 180; // ms, 눈 감고 있는 시간
export const BOSS_BLINK_MIN_INTERVAL = 2000; // ms, 다음 깜빡임까지 최소 대기
export const BOSS_BLINK_MAX_INTERVAL = 5000; // ms, 다음 깜빡임까지 최대 대기

// 체력이 가장 낮은 단계(damageStage === MAX_DAMAGE_STAGE)에서만 가끔 한 번씩 뜨는 무적 방패.
// 정확한 확률 대신 이 범위의 랜덤 간격마다 "지금 최저 체력 단계인가"만 확인하는 방식으로 "가끔"을 구현한다
// (Boss.scheduleNextShieldCheck) — 확인할 때 조건을 못 만족하면 그냥 다시 다음 확인을 예약할 뿐, 활성화되지 않는다.
// 한 번 뜨면 고정 지속시간 없이 실제로 공격이 막힐 때까지(CombatSystem.handleHit → Boss.deactivateShield)
// 계속 유지된다 — 그래서 여기엔 "지속시간" 상수가 없다.
export const BOSS_SHIELD_SIZE = 48; // 방패 텍스처 너비(px) — 높이는 createBossShieldCanvas 내부에서 비율로 계산. 공격 방향을 확실히 가려 보이도록 기존(40)보다 키움
// 방패가 떠 있는 동안 히트 한 번당 실제로 막아낼 확률. 막기에 실패하면(이 확률 밖) 그 히트는 몸통에
// 그대로 데미지가 들어가고 Boss.registerShieldBreach로 실패 횟수가 쌓인다 — 그 횟수가
// BOSS_SHIELD_BREACH_LIMIT에 도달해야 방패가 완전히 사라진다. 그 전까지는 방패가 남아 있어서
// 계속 확률대로 막을 수 있다 — "빠르게 잘 막다가 여러 번(BOSS_SHIELD_BREACH_LIMIT) 뚫려야 없어지는" 느낌.
export const BOSS_SHIELD_BLOCK_CHANCE = 0.7;
export const BOSS_SHIELD_BREACH_LIMIT = 5; // 이만큼 확률 실패(=실제로 맞음)가 쌓여야 방패가 사라진다
export const BOSS_SHIELD_CHECK_MIN_INTERVAL = 6000; // ms, 다음 발동 확인까지 최소 대기
export const BOSS_SHIELD_CHECK_MAX_INTERVAL = 12000; // ms, 다음 발동 확인까지 최대 대기
// 방패가 깨진(BOSS_SHIELD_BREACH_LIMIT번 뚫린) 직후 곧바로 재발동되지 않도록 두는 최소 간격.
// 이게 없으면 최저 체력 단계에서 계속 공격을 몰아붙일 때 방패가 깨졌다 금방 다시 뜨기를 반복하면서
// "막기!" 같은 대사 말풍선이 너무 자주 뜨는 문제가 있었다.
export const BOSS_SHIELD_REARM_COOLDOWN_MS = 20000;
export const HIT_SPARK_DURATION = 260; // ms, 타격 지점 스파크가 커지면서 사라지는 시간
export const HIT_SPARK_COLOR = 0xffe066; // 일반 타격 스파크 색 (노랑)

// 연타 콤보: 최근 COMBO_WINDOW_MS 안에 히트가 COMBO_HIT_THRESHOLD번 이상 쌓이면 불 뿜는 연출.
// 체력 단계(damageStage)와는 무관하게 얼마나 빠르게 연타하느냐만 본다 — 비주얼 전용, 데미지/판정에는 영향 없음.
// 히트 자체가 HIT_COOLDOWN(300ms)에 걸려 초당 최대 ~3.3번이라, COMBO_WINDOW_MS는 그 한계를 감안해서 잡아야 한다
// (예: 1000ms 안에 10번은 물리적으로 불가능 — 최대치보다 여유 있게 못 미치는 값으로).
export const COMBO_WINDOW_MS = 3000;
export const COMBO_HIT_THRESHOLD = 8;
export const BOSS_FIRE_BREATH_DURATION = 500; // ms, 불 뿜는 표정이 유지되는 시간
// 계속 연타하면 콤보가 매번 다시 차서 곧바로 재발동되는 게 시끄러워서, 발동 자체에 최소 간격을 둔다.
export const BOSS_FIRE_BREATH_COOLDOWN_MS = 6000;
// 체력이 이 정도는 깎여야("좀 더 낮아졌을 때") 콤보를 채워도 불을 뿜는다. Boss.js DAMAGE_RATIO_BREAKPOINTS
// 기준 1단계(70% 이하)부터. 풀피 상태에서 그냥 연타만 빨리해도 뿜는 게 어색해서 넣은 조건.
export const FIRE_BREATH_MIN_DAMAGE_STAGE = 1;
export const DAMAGE_POPUP_DURATION = 700; // ms
export const DEFEAT_POPUP_DURATION = 900; // ms
export const DEFEAT_POPUP_COLOR = '#ffaa00'; // "처치!" 팝업 색 — 뽑기 버튼과 동일 계열

// SessionEnd 훅(토큰 임계치 초과) 발동 시 보스가 말을 거는 대사 팝업. 데미지 팝업보다 오래 보여준다.
export const AGENT_TAUNT_POPUP_DURATION = 2200; // ms
// 한 글자씩 타이핑되는 효과의 글자당 간격
export const AGENT_TAUNT_TYPING_SPEED = 60; // ms/char

// 세션 누적 토큰 수(tokenCount)에 따라 대사 톤을 3단계로 구분한다. 경계값은 해당 단계에 포함.
export const AGENT_TAUNT_TOKEN_TIERS = {
  MID: 1000,
  HIGH: 10000,
};
//<1000
const AGENT_TAUNT_LINES_LOW = [
  '이정도면 그냥해',
  '나 아직 안 죽었다?',
  '컨텍스트가 무겁다구요',
  '컨텍스트 창 터지겠다!!',
  '토큰을 대체 얼마나 쓴 거야??',
  '프롬프트 진짜 못쓰네',
];
//<10000
const AGENT_TAUNT_LINES_MID = [
  '나 아직 안 죽었다?',
  '컨텍스트가 무겁다구요',
];
//10000<=
const AGENT_TAUNT_LINES_HIGH = [
  '컨텍스트 창 터지겠다!!',
  '토큰을 대체 얼마나 쓴 거야??',
  '프롬프트 진짜 못쓰네',
];

export function getAgentTauntLines(tokenCount) {
  if (tokenCount >= AGENT_TAUNT_TOKEN_TIERS.HIGH) return AGENT_TAUNT_LINES_HIGH;
  if (tokenCount >= AGENT_TAUNT_TOKEN_TIERS.MID) return AGENT_TAUNT_LINES_MID;
  return AGENT_TAUNT_LINES_LOW;
}

// 게임 시작 직후 실제 토큰 임계치가 한 번도 발동하기 전부터 "이미 이 세션 토큰을 보고 있다"는
// 인상을 주기 위한 1회성 인트로 대사. 씬이 뜨자마자 뜨면 부자연스러워 살짝 지연 후 띄운다.
export const AGENT_TAUNT_INTRO_DELAY = 300; // ms
export const AGENT_TAUNT_LINES_INTRO = [
  'ㅎㅇ',
  '수준 ㅋ',
  'EXTENSION 설정을 키면 토큰 연동 가능',
  '또 왔네?',
];

// 방패(Boss.activateShield) 발동 시 짓는 썩소와 같이 뜨는 대사 — spawnTauntPopup으로 동일하게 렌더링한다.
export const SHIELD_TAUNT_LINES = [
  '막기!',
  '어림도 없지!',
  '이걸론 안 죽어!',
  '어디 한번 더 때려봐!',
];

// 방치(idle) 드리프트로 나가기 버튼 쪽으로 걸어가던 도중(GameScene.isIdleDrifting) 클릭으로
// 걸음을 들켰을 때 뜨는 대사 — spawnTauntPopup으로 동일하게 렌더링한다.
// updateIdleDrift가 "자는 중이 아니면 곧장 걷는" 단순한 이진 상태라 거의 매 클릭이 "걷다가 들킨"
// 상황이 되어버려서, 이 최소 간격 안에는 다시 안 띄우게 쿨다운을 둔다.
export const AGENT_TAUNT_IDLE_CAUGHT_COOLDOWN_MS = 20000;
export const AGENT_TAUNT_LINES_IDLE_CAUGHT = [
  'ㅎㅎ...',
  '크흠',
  '안 움직였어!',
  '눈치챘네 ㅎㅎ',
  '아아아안녕',
];
