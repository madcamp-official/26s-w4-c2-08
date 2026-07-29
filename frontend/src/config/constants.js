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
// 방치 상태는 "가만히(무반응)" → "자거나" → "돌아다니거나" 순서의 3단계다(GameScene.updateIdleDrift).
// 마우스가 눌려있는 동안(실제로 조작 중)은 셋 다 아니고 그 자리에 멈춰 있는다. 손을 뗀 뒤
// BOSS_IDLE_SLEEP_DELAY_MS(10초)가 지나기 전까지는 평상시 모습 그대로 가만히 있다가, 10초~
// BOSS_IDLE_WALK_DELAY_MS(30초) 사이에는 자고, 30초가 지나면 클릭이 들어올 때까지 계속 종료
// 버튼 쪽으로 걸어간다 — 클릭이 들어오는 순간 곧장 처음(무반응 상태)부터 다시 센다.
export const BOSS_IDLE_SLEEP_DELAY_MS = 10000;
export const BOSS_IDLE_WALK_DELAY_MS = 30000;
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
  { id: 'merge_conflict', name: 'MERGE_CONFLICT', color: '#d4a017' }, // git 컨플릭트 마커(<<<<<<<) 색인 앰버
];
export const DRAW_SCORE_STEP = 100;
export const INITIAL_FREE_DRAWS = 1; // 필드에 무기가 하나도 없는 상태로 시작하므로 시작 시 무기 뽑기 1회를 무료로 제공
export const CONTACT_OVERLAP = 4; // px of intentional overlap left at contact so overlap detection still fires
export const THROW_FIRE_INTERVAL = 400; // ms between auto-fired projectiles while holding the throw weapon
export const THROW_PROJECTILE_SPEED = 400; // px/s, 기본값 — 무기별로 다르면 WEAPON_DEFINITIONS[id].projectileSpeed로 덮어씀
export const BALL_PROJECTILE_SPEED = 640; // px/s, 야구공은 기본보다 빠르게
export const BASKETBALL_MAX_ACTIVE = 15; // 벽에 튕기며 화면 밖으로 안 나가고 계속 남기 때문에, 필드에 동시에 존재할 수 있는 개수를 직접 제한한다
export const SLINGSHOT_MAX_PULL = 150; // px, 이 이상 당겨도 더 세지지 않는 최대 당김 거리(=최대 속도 지점)
export const SLINGSHOT_MIN_PULL = 20; // px, 이보다 적게 당기고 놓으면 그냥 클릭으로 취급해 발사하지 않는다
export const SLINGSHOT_FRAME_SIZE = 90; // 새총 프레임(Y자 몸체) 텍스처 크기 — 갈래 끝 좌표(weaponSprites.getSlingshotFrameMetrics)도 이 값을 기준으로 계산
export const SLINGSHOT_BAND_COLOR = 0x6b4423; // 고무줄(Graphics) 색 — 프레임과 같은 나무/가죽 계열 갈색
export const SLINGSHOT_BAND_WIDTH = 4; // px, 고무줄 두께
export const PORTABLE_WEAPON_SIZE = 160; // 야구 방망이 텍스처 크기 — WeaponManager의 캡슐 히트박스 계산도 이 값을 같이 씀
export const WAND_WEAPON_SIZE = 150; // 마술봉 텍스처 크기 — 방망이와 같은 캡슐 판정 파이프라인을 공유(PORTABLE)
export const SPOON_WEAPON_SIZE = 105; // 숟가락 텍스처 크기 — 방망이보다 작은 소품이라 PORTABLE_WEAPON_SIZE보다 줄임
export const THROW_WEAPON_SIZE = 40; // 야구공(투척형) 텍스처 크기 — 무기 자체와 던져지는 투사체가 같은 크기를 쓴다 (기존 50에서 20% 축소)
// 투사체는 정사각 캔버스에 그린 둥근 이모지라, 사각 히트박스 그대로 쓰면 실제 공 그림이 없는 네 모서리까지
// 보스와의 판정에 끼어들어 히트박스가 커 보인다. 실제 그림 크기에 맞춰 원형으로 판정한다.
export const THROW_PROJECTILE_HIT_RADIUS = THROW_WEAPON_SIZE * 0.4;

// 무기 동작 방식 — 배경 선택 패널과 같은 방식으로 Hud의 무기 패널에서 종류를 직접 고른다.
// PORTABLE(휴대형)은 대각선 캡슐 판정으로 들고 부딪혀서 데미지 — WeaponManager의 getPortableAxis/
// portableOverlapsBoss가 PORTABLE_AXIS_CONFIG에서 weaponId별 치수(길이/반지름)를 조회해서 쓰므로,
// 방망이(BAT)처럼 새 PORTABLE 무기를 추가할 때는 그 설정도 같이 추가해야 한다(방망이/마술봉 등).
// STATIC은 그냥 사각 판정으로 들고 부딪히는 무기(전기충격기 등), THROW는 들고 있는 동안 자동 연사.
// BOOMERANG: 들고 있는 동안은 판정 없이 그냥 따라다니기만 하다가(보스에 갖다 댈 필요 없음), 손을 떼는
// 순간(WeaponManager.throwBoomerang) 놓은 자리에서 보스 반대쪽으로 살짝 날아갔다가 보스 쪽으로 곡선을
// 그리며 되돌아와 부딪히는 1회성 투사체가 된다. THROW(들고 있는 동안 자동 연사)와는 완전히 다른 동작.
// BOMB: 어디든 놓을 수 있는(보스에 안 닿아도 됨) 투척형 — 손을 떼면 그 자리에 놓이고(WeaponManager.armBomb),
// 자체 퓨즈 타이머가 다 돼야 터진다. 터지는 순간 보스가 폭발 반경(blastRadius) 안에 있으면 그때만
// 데미지가 들어간다 — BOOMERANG처럼 든 사람 손을 떠난 뒤 자기 혼자 판정을 관리하는 무기라는 점은 같지만,
// 판정 방식이 오버랩이 아니라 "터지는 순간의 거리"라는 점이 다르다.
// MACHINE: 세탁기 — BOMB처럼 어디든 놓을 수 있고(들고 있는 동안 판정 없음) 손을 떼면 그 자리에
// 고정된다(WeaponManager.armWashingMachine). 퓨즈로 자동 폭발하는 BOMB과 달리 영구 설치물이라
// 터지지 않고, 대신 직접 클릭하면 문이 열리고(WeaponManager.toggleWashingMachineDoor) 문이 열린
// 상태에서 보스를 가까이 끌고 가면 자동으로 빨려들어가 일정 시간 돌면서 데미지를 받는다
// (GameScene.checkWashingMachineSuckIn/startWashingMachineSpin) — 오버랩이 아니라 "문이 열린 채
// 근접"이 트리거인 완전히 새로운 판정 방식이라 별도 카테고리로 둔다. 동시에 1개만 존재할 수 있고
// 새로 설치하면 기존 것을 교체한다.
// SLINGSHOT: 농구공 — 누른 자리(anchor)에서 포인터를 뒤로 당긴 채 놓으면, 당긴 방향의 반대쪽으로
// 당긴 거리에 비례한 속도로 날아가는 새총형 무기. BOOMERANG/BOMB처럼 들고 있는 동안(조준 중)은
// 판정이 없고, 손을 뗀 그 오브젝트 자체가 그대로 투사체가 된다(WeaponManager.throwSlingshot) —
// 다만 놓는 방향/속도가 anchor 대비 상대 위치로 매번 달라진다는 점이 고정 궤적인 BOOMERANG과 다르다.
export const WEAPON_CATEGORIES = {
  PORTABLE: 'portable',
  STATIC: 'static',
  THROW: 'throw',
  BOOMERANG: 'boomerang',
  BOMB: 'bomb',
  MACHINE: 'machine',
  SLINGSHOT: 'slingshot',
};

// 무기 패널에 실제로 보이는 개별 무기. category가 동작 방식을 정하고, 같은 category를 여러 무기가
// 공유할 수 있다 — 야구공/다트 둘 다 투척형(THROW)이지만 그림(texture/projectileTexture)만 다르다.
// 무기 패널에 뜨는 순서 그대로 카테고리별로 묶어서 나열한다(총 → 투척 → 부메랑 → 폭탄 → 근접 → 말랑이 → 손/기타).
// WEAPON_DEFINITIONS도 같은 순서로 맞춰 둬서, 여기 순서를 바꾸면 패널 순서도 그대로 따라간다.
export const WEAPON_IDS = {
  // 총기류
  PISTOL: 'pistol',
  MACHINE_GUN: 'machine_gun',
  SHOTGUN: 'shotgun',
  SNIPER: 'sniper',
  REVOLVER: 'revolver',
  // 투척형(공/과일/소리 등)
  BALL: 'ball',
  BASKETBALL: 'basketball',
  DART: 'dart',
  MEGAPHONE: 'megaphone',
  TOMATO: 'tomato',
  WATERMELON: 'watermelon',
  WATER_BALLOON: 'water_balloon',
  BEACH_BALL: 'beach_ball',
  // 부메랑
  BOOMERANG: 'boomerang',
  // 폭탄
  GRENADE: 'grenade',
  DYNAMITE: 'dynamite',
  // 설치형(맵에 고정)
  WASHING_MACHINE: 'washing_machine',
  // 근접 타격
  BAT: 'bat',
  SPOON: 'spoon',
  WAND: 'wand',
  WHIP: 'whip',
  BAMBOO_CANE: 'bamboo_cane',
  FRYING_PAN: 'frying_pan',
  SLIPPER: 'slipper',
  BOXING_GLOVE: 'boxing_glove',
  DEBUGGER: 'debugger',
  // 말랑이(찌부 모션)
  SQUISHY: 'squishy',
  RUBBER_DUCK: 'rubber_duck',
  TEDDY_BEAR: 'teddy_bear',
  CHEESE_SQUISHY: 'cheese_squishy',
  // 손/기타
  HAND: 'hand',
  BAD_HAND: 'bad_hand',
  LIPS: 'lips',
  TASER: 'taser',
  KEYBOARD: 'keyboard',
};

export const TASER_WEAPON_SIZE = 70; // 전기충격기 텍스처 크기 — 방망이보다 작은 소형 휴대 도구
export const HAND_WEAPON_SIZE = 70; // 쓰다듬는 손(착한 손) 텍스처 크기
export const BAD_HAND_WEAPON_SIZE = 70; // 주먹(나쁜 손) 텍스처 크기
export const LIPS_WEAPON_SIZE = 70; // 입술 텍스처 크기
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
// 세탁기 — 실물 세탁기처럼 폭보다 세로로 긴 텍스처. 문(드럼)은 몸통 중심보다 아래쪽에 있어서
// weaponSprites.getWashingMachineDoorMetrics(width, height)가 그 반지름/오프셋을 계산해준다
// (그리기와 판정이 항상 같은 값을 쓰도록 하나의 함수로 통일 — PORTABLE_AXIS_CONFIG와 같은 이유).
export const WASHING_MACHINE_WIDTH = 200;
export const WASHING_MACHINE_HEIGHT = 230;
// 문이 열려 있을 때 보스 몸통 중심이 문 중심으로부터 이 거리 안으로 드래그되면 자동으로 빨려들어간다.
export const WASHING_MACHINE_SUCK_RADIUS = 100;
// 빨려들어간 뒤 자동으로 튀어나오기까지 도는 전체 시간 — 이 시간 동안은 드래그로 꺼낼 수 없다(Boss.isInWashingMachine).
export const WASHING_MACHINE_SPIN_DURATION = 4000;
export const WASHING_MACHINE_SPIN_ROTATION_MS = 260; // ms, 도는 동안 한 바퀴 회전에 걸리는 시간
export const WASHING_MACHINE_DAMAGE_TICK_INTERVAL = 500; // ms, 도는 동안 데미지가 들어가는 간격
export const WASHING_MACHINE_DAMAGE_MULTIPLIER = 1.1;
// 도는 동안 캐릭터가 문 중심 기준 상하좌우로 흔들리는 폭(px)과 그 위치를 새로 뽑는 간격 —
// 매 프레임 다시 뽑으면 너무 정신없어 보여서, 짧은 간격으로 스텝처럼 움직이게 한다.
export const WASHING_MACHINE_JITTER_RANGE = 10;
export const WASHING_MACHINE_JITTER_INTERVAL_MS = 70;
// 세탁기 몸체 자체도 같은 간격(WASHING_MACHINE_JITTER_INTERVAL_MS)마다 상하좌우로 짧게 흔들려 역동성을
// 준다 — 안에서 도는 캐릭터(WASHING_MACHINE_JITTER_RANGE, 10px)보다 절반 정도(5px)로 작게 흔들어
// 몸체가 캐릭터보다 무겁게 흔들리는 느낌을 준다.
export const WASHING_MACHINE_BODY_JITTER_RANGE = 5;
// 도는 동안 보스 위(depth 기준 더 높은 자리)를 덮는 검은 원의 불투명도 — 완전히 안 보이게 가리지는
// 않고, 도는 실루엣이 흐릿하게 비치는 정도로만 어둡게 한다.
export const WASHING_MACHINE_OVERLAY_ALPHA = 0.8;
export const WASHING_MACHINE_POPUP_COLOR = '#4aa3df'; // 물빨래를 연상시키는 파란 계열로 다른 데미지 팝업과 구분
// 다 돌고 튀어나올 때 문 바로 밖(안 겹치는 자리)까지 밀어내는 여유 거리
export const WASHING_MACHINE_EJECT_MARGIN = 20;

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
// 아래부터 damageMultiplier는 총기류(연사/한방 트레이드오프)처럼 명시적으로 튜닝된 것들 말고는
// 대부분 기본값 1이었는데, 실제 무기가 무엇으로 만들어졌는지("물성")와 안 맞는 경우가 많았다
// (예: 물풍선이 야구 방망이랑 데미지가 같음). 무겁고 단단한 재질일수록 배율을 올리고, 가볍거나
// 무른(천/고무/물 등) 재질일수록 내려서 무기별로 "맞는 느낌"이 다르게 조정했다.
// 무기 패널에 뜨는 순서 = 이 객체의 키 순서. WEAPON_IDS와 같은 카테고리 묶음 순서(총 → 투척 →
// 부메랑 → 폭탄 → 근접 → 말랑이 → 손/기타)로 맞춰서 패널을 쭉 훑었을 때 종류별로 모여 보이게 한다.
export const WEAPON_DEFINITIONS = {
  // ── 총기류 ──
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
    hitSound: 'pistol_impact', // 다른 총기(PISTOL/SHOTGUN/SNIPER/REVOLVER)와 같은 탄환 충격음
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

  // ── 투척형(공/과일/소리 등) ──
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
  // 새총형(SLINGSHOT) — 잡은 자리(anchor)에서 뒤로 당긴 채 놓으면 당긴 반대 방향으로, 당긴 거리에
  // 비례한 속도(최대 projectileSpeed)로 날아간다(WeaponManager.throwSlingshot). 당구공처럼 벽(화면
  // 가장자리)에서 입사각=반사각으로 튕기고(bounceOffWalls) 다른 투척형과 달리 화면 밖으로 나가서
  // 사라지지 않으므로, 계속 쌓이지 않도록 maxActive로 필드에 동시에 존재 가능한 개수를 제한한다.
  [WEAPON_IDS.BASKETBALL]: {
    name: '농구공 by 건희',
    category: WEAPON_CATEGORIES.SLINGSHOT,
    texture: 'weapon_basketball',
    projectileSpeed: BALL_PROJECTILE_SPEED,
    fireSound: 'baseball_throw',
    hitSound: 'bat_hit',
    damageMultiplier: 0.9,
    bounceOffWalls: true,
    wallBounceSound: 'basketball_bounce', // 벽 튕길 때(WeaponManager의 'worldbounds' 리스너) 재생
    maxActive: BASKETBALL_MAX_ACTIVE,
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
  // 토마토/수박은 GameScene.onHit에서 weaponId로 분기해 전용 터짐/쪼개짐 이펙트를 낸다.
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

  // ── 부메랑 ──
  // 놓는 순간 던져지는 1회성 무기 — fireSound는 다른 THROW 무기처럼 발사 시점(WeaponManager.throwBoomerang)에
  // 재생한다.
  [WEAPON_IDS.BOOMERANG]: {
    name: 'BOOMERANG', category: WEAPON_CATEGORIES.BOOMERANG, texture: 'weapon_boomerang', fireSound: 'baseball_throw', damageMultiplier: 1.1, hitSound: 'bat_hit', // 단단한 나무/플라스틱 재질
  },

  // ── 폭탄 ──
  // 어디든 놓아두면(WeaponManager.armBomb) 퓨즈가 다 탈 때까지 기다렸다 터진다. 터지는 순간
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

  // ── 설치형(맵에 고정) ──
  // 폭탄류처럼 어디든 놓을 수 있지만(WeaponManager.armWashingMachine) 자동으로 터지지 않고 그 자리에
  // 영구히 남는다 — 데미지는 오버랩이 아니라 문을 연 채 보스를 가까이 끌고 가면 자동으로 빨려들어가
  // 도는 동안 주기적으로 들어간다(GameScene.startWashingMachineSpin). damageMultiplier 없음 —
  // CombatSystem.applyWashingMachineDamage가 WASHING_MACHINE_DAMAGE_MULTIPLIER를 직접 쓴다.
  [WEAPON_IDS.WASHING_MACHINE]: {
    name: '세탁 by 경원', category: WEAPON_CATEGORIES.MACHINE, texture: 'weapon_washing_machine_closed',
  },

  // ── 근접 타격 ──
  [WEAPON_IDS.BAT]: {
    // 알루미늄 배트 — 무기 패널에서 가장 단단한 재질 축에 속해서 직접 휘두르는 PORTABLE답게 세게 잡는다.
    name: 'BAT', category: WEAPON_CATEGORIES.PORTABLE, texture: 'weapon_portable', hitSound: 'bat_hit', damageMultiplier: 1.3,
  },
  // 은색 숟가락 — 방망이와 같은 PORTABLE 로직(대각선 캡슐 판정, WeaponManager의 PORTABLE_AXIS_CONFIG
  // 참고)을 그대로 쓰지만, 실제로 때리는 무기가 아니라는 컨셉이라 damageMultiplier를 0으로 둬서
  // 데미지는 전혀 들어가지 않는다(맞아도 카메라 흔들림/스파크/사운드 같은 타격 연출만 그대로 남음).
  [WEAPON_IDS.SPOON]: {
    name: 'SPOON by 도현', category: WEAPON_CATEGORIES.PORTABLE, texture: 'weapon_spoon', hitSound: 'spoon_hit', damageMultiplier: 0,
  },
  // 방망이와 같은 PORTABLE 카테고리 — 검은 봉 + 양 끝 흰 캡 실루엣이라 방망이보다 얇은 균일한 두께의
  // 캡슐로 판정한다(WeaponManager의 PORTABLE_AXIS_CONFIG 참고). 들고 있는 동안 항상 끝(캡)이 보스 쪽을
  // 향하도록 회전한다. teleportsBoss: 데미지는 다른 PORTABLE 무기와 같은 파이프라인으로 그대로 들어가고,
  // 맞는 순간 GameScene.onHit이 넉백 대신 Boss.teleportRandom()을 트리거해 화면 안 랜덤한 위치로
  // 순간이동시킨다(마술봉다운 연출).
  [WEAPON_IDS.WAND]: {
    name: 'WAND by 재준', category: WEAPON_CATEGORIES.PORTABLE, texture: 'weapon_wand', hitSound: 'wand_hit',
    teleportsBoss: true,
  },
  // 방망이처럼 휘두르는 느낌이지만 캡슐(BAT_DIMENSIONS)은 채찍의 지그재그 실루엣과 안 맞아서
  // STATIC(사각 판정)으로 둔다 — 다른 STATIC 무기보다 텍스처가 넓어서 판정 범위도 자연히 더 넉넉하다.
  // meleeSwing: 맞는 순간 보스 쪽으로 홱 겨눴다가 원위치로 스프링백하는 스윙 모션을 튼다
  // (WeaponManager.playMeleeSwing) — 가만히 들고만 있는 다른 STATIC 무기와 달리 채찍답게 후려치는
  // 느낌을 준다.
  [WEAPON_IDS.WHIP]: {
    name: 'WHIP', category: WEAPON_CATEGORIES.STATIC, texture: 'weapon_whip', meleeSwing: true, damageMultiplier: 0.9, hitSound: 'bat_hit', // 얇은 가죽끈 — 후려치지만 뭉개는 무게감은 없다
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
  [WEAPON_IDS.FRYING_PAN]: {
    name: 'FRYING PAN', category: WEAPON_CATEGORIES.STATIC, texture: 'weapon_frying_pan', meleeSwing: true, damageMultiplier: 1.4, hitSound: 'hit_wall', // 무쇠 프라이팬 — 이 게임에서 가장 무거운 근접 재질이라 다른 근접보다 묵직한 충격음(hit_wall)을 쓴다
  },
  [WEAPON_IDS.SLIPPER]: {
    name: 'SLIPPER', category: WEAPON_CATEGORIES.STATIC, texture: 'weapon_slipper', meleeSwing: true, damageMultiplier: 0.8, hitSound: 'bat_hit', // 등짝 스매싱 밈이지 실제로 단단한 물건은 아니다
  },
  // 직선 펀치답게 다른 STATIC 무기보다 한 방이 더 아프도록 damageMultiplier를 살짝 높게 잡는다.
  // bigImpact: 히트 스파크를 다른 STATIC 무기보다 크게(spawnHitSpark scale) + GameScene.onHit에서 카메라
  // shake까지 추가로 겹쳐서 데미지 배율이 높은 무기다운 타격감을 준다. hitSound도 총기(pistol_impact)나
  // 다른 근접(bat_hit)과 겹치지 않게 더 묵직한 hit_wall로 차별화한다.
  [WEAPON_IDS.BOXING_GLOVE]: {
    name: 'BOXING GLOVE', category: WEAPON_CATEGORIES.STATIC, texture: 'weapon_boxing_glove', meleeSwing: true, damageMultiplier: 1.2, bigImpact: true, hitSound: 'hit_wall',
  },
  // freezesBoss: 데미지 자체는 평범하지만, 맞으면 GameScene의 drag 리스너가 잠깐 boss.isFrozen을
  // 보고 드래그 이동을 막는다(Boss.freeze) — 보스가 자체 행동이 없는 게임이라 "기절"보다
  // "위치 고정"이 실제로 의미 있는 CC라고 판단해서 그렇게 구현했다.
  // meleeSwing: 노트북을 실제로 휘둘러서 때리는 느낌을 주는 스윙 모션 (WHIP과 같은 메커니즘 재사용).
  [WEAPON_IDS.DEBUGGER]: {
    name: 'DEVELOPER', category: WEAPON_CATEGORIES.STATIC, texture: 'weapon_debugger', freezesBoss: true, meleeSwing: true, damageMultiplier: 1.1, hitSound: 'bat_hit', // 노트북 — 딱딱한 편
  },

  // ── 말랑이(찌부 모션) ──
  // squishHit: 스윙 대신 맞는 순간 말랑하게 눌렸다 되돌아오는 찌부 모션을 튼다 (WeaponManager.playSquish) —
  // 이름 그대로 "말랑말랑"한 장난감다운 타격감을 주려는 의도. 말랑이 계열은 전부 부드러운 재질이라
  // 다른 STATIC 무기보다 데미지를 낮게 잡는다.
  [WEAPON_IDS.SQUISHY]: {
    name: 'SQUISHY', category: WEAPON_CATEGORIES.STATIC, texture: 'weapon_squishy', squishHit: true, damageMultiplier: 0.6,
  },
  // 모양만 다르고 동작(찌부 모션)은 SQUISHY와 동일. 오리답게 hitSound만 꽥 소리로 차별화한다.
  [WEAPON_IDS.RUBBER_DUCK]: {
    name: 'RUBBER DUCK', category: WEAPON_CATEGORIES.STATIC, texture: 'weapon_rubber_duck', squishHit: true, damageMultiplier: 0.6, hitSound: 'duck_quack',
  },
  [WEAPON_IDS.TEDDY_BEAR]: {
    name: 'TEDDY BEAR', category: WEAPON_CATEGORIES.STATIC, texture: 'weapon_teddy_bear', squishHit: true, damageMultiplier: 0.6,
  },
  [WEAPON_IDS.CHEESE_SQUISHY]: {
    name: 'CHEESE SQUISHY', category: WEAPON_CATEGORIES.STATIC, texture: 'weapon_cheese_squishy', squishHit: true, damageMultiplier: 0.6,
  },

  // ── 손/기타 ──
  // heals: 데미지 대신 보스 체력을 회복시키는 무기라는 표시 — GameScene이 이 무기는
  // handleHit(데미지) 대신 handlePet(힐링)으로 따로 처리한다(heals 플래그로 판단, weaponId 하드코딩 아님).
  [WEAPON_IDS.HAND]: {
    name: 'GOOD HAND', category: WEAPON_CATEGORIES.STATIC, texture: 'weapon_hand', heals: true,
  },
  // 나쁜 손: 착한 손이랑 짝 — 힐링 없이 그냥 주먹으로 때리는 평범한 데미지 무기.
  [WEAPON_IDS.BAD_HAND]: {
    name: 'BAD HAND', category: WEAPON_CATEGORIES.STATIC, texture: 'weapon_bad_hand', hitSound: 'bat_hit', damageMultiplier: 0.9,
  },
  // 입술: 뽀뽀 공격 — 말랑이(squishHit)처럼 눌렸다 돌아오는 모션 재사용. 부드러운 살이라 데미지는 낮게.
  [WEAPON_IDS.LIPS]: {
    name: 'LIPS by 서윤', category: WEAPON_CATEGORIES.STATIC, texture: 'weapon_lips', squishHit: true, damageMultiplier: 0.5,
  },
  [WEAPON_IDS.TASER]: {
    name: 'TASER', category: WEAPON_CATEGORIES.STATIC, texture: 'weapon_taser', hitSound: 'taser_shock',
    rotateToBoss: true,
    damageMultiplier: 0.8, // 감전 CC가 본체 역할이라 물리 데미지는 가볍게
  },
  [WEAPON_IDS.KEYBOARD]: {
    name: 'KEYBOARD', category: WEAPON_CATEGORIES.STATIC, texture: 'weapon_keyboard', hitSound: 'keyboard_smash',
  },
};

export const DART_STICK_DURATION = 8000; // ms, 다트가 맞은 자리에 박힌 채로 남아 있다가 사라지기까지 시간
export const DART_EMBED_DEPTH = 10; // px, 맞은 지점에서 날아가던 방향으로 더 파고들어가 보이게 미는 거리

// 타격 이펙트
export const BOSS_KNOCKBACK_DISTANCE = 26; // px, 타격당 타격 반대 방향으로 밀려나는 거리 (누적됨)
export const BOSS_KNOCKBACK_OUT_DURATION = 70; // ms, 밀려나는 트윈 시간
// 보스가 화면 구석(두 벽이 만나는 자리)에 있을 때 맞으면, 그 자리에서 찔끔 밀려나는 평소 knockback
// 대신 반대쪽 방향으로 살짝 더 크게 튕긴다(Boss.flyToOppositeCorner) — 화면을 완전히 가로지르면
// 너무 멀리 날아가 보여서, 대각선 반대쪽 구석까지 가는 거리 중 일부만 이동한다.
export const BOSS_CORNER_MARGIN = 60; // px, 이 거리 안에 두 벽이 동시에 있으면 "구석"으로 본다
export const BOSS_CORNER_BOUNCE_DISTANCE_RATIO = 0.35; // 반대쪽 구석까지 거리 중 이만큼만 이동
export const BOSS_CORNER_BOUNCE_DURATION = 220; // ms
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

// 숟가락(SPOON, damageMultiplier 0 — 데미지 없이 이 반응만 있는 무기)에 맞을 때마다 자라는 "혹".
// 맞을 때마다 지금 자라는 중인 혹 하나가 1→2→3단계로 커지고, 3단계까지 다 자란 뒤에 또 맞으면 그 옆에
// 새 혹이 하나 더 생긴다 — BOSS_BUMP_MAX_COUNT개가 전부 3단계로 다 차면 더 이상 반응하지 않는다.
export const BOSS_BUMP_MAX_LEVEL = 3;
export const BOSS_BUMP_MAX_COUNT = 3;
// 숟가락으로 안 맞은 채 이 시간이 지날 때마다 가장 최근 혹이 한 단계씩 줄어든다 — 1단계에서 또 줄면
// 그 혹 자체가 사라진다(Boss.decayBump). 맞을 때마다(registerSpoonHit) 타이머가 다시 처음부터 시작된다.
export const BOSS_BUMP_DECAY_MS = 3000;
// 지금 자라는 중인 혹이 다음 단계로 넘어가는 데 필요한 누적 히트 수 — index는 혹의 "현재" 레벨
// (0=아직 안 생김, 1, 2)에 대응한다. 즉 0→1단계는 5대, 1→2단계는 15대, 2→3단계는 25대를 맞아야 한다.
export const BOSS_BUMP_LEVEL_HIT_THRESHOLDS = [3, 7, 15];

// 연타 콤보: 최근 COMBO_WINDOW_MS 안에 히트가 COMBO_HIT_THRESHOLD번 이상 쌓이면 불 뿜는 연출.
// 체력 단계(damageStage)와는 무관하게 얼마나 빠르게 연타하느냐만 본다 — 비주얼 전용, 데미지/판정에는 영향 없음.
// 히트 자체가 HIT_COOLDOWN(300ms)에 걸려 초당 최대 ~3.3번이라, COMBO_WINDOW_MS는 그 한계를 감안해서 잡아야 한다
// (예: 1000ms 안에 10번은 물리적으로 불가능 — 최대치보다 여유 있게 못 미치는 값으로).
export const COMBO_WINDOW_MS = 3000;
export const COMBO_HIT_THRESHOLD = 8;
export const BOSS_FIRE_BREATH_DURATION = 500; // ms, 불 뿜는 표정이 유지되는 시간
// 계속 연타하면 콤보가 매번 다시 차서 곧바로 재발동되는 게 시끄러워서, 발동 자체에 최소 간격을 둔다.
export const BOSS_FIRE_BREATH_COOLDOWN_MS = 6000;

// 입술 무기로 연속으로(다른 무기가 안 끼고) 맞은 횟수 — 이만큼 쌓이면 평소 X_X 대신 흔들기와 같은
// 구토 반응(Boss.showVomit)으로 바뀐다(Boss.registerLipsHit). 중간에 다른 무기로 맞으면
// Boss.resetLipsStreak으로 리셋된다.
export const LIPS_VOMIT_STREAK_THRESHOLD = 5;
// 체력이 이 정도는 깎여야("좀 더 낮아졌을 때") 콤보를 채워도 불을 뿜는다. Boss.js DAMAGE_RATIO_BREAKPOINTS
// 기준 1단계(70% 이하)부터. 풀피 상태에서 그냥 연타만 빨리해도 뿜는 게 어색해서 넣은 조건.
export const FIRE_BREATH_MIN_DAMAGE_STAGE = 1;

// 흔들기(구토): 보스를 잡고(드래그) 방향을 계속 뒤집으며(=반전) 흔드는 상태가 SHAKE_VOMIT_TRIGGER_MS만큼
// 이어지면 구토 연출을 띄운다. "흔드는 상태"는 최근 SHAKE_REVERSAL_WINDOW_MS 안에 방향 반전이
// SHAKE_MIN_REVERSALS_IN_WINDOW번 이상 쌓였는지로 판단한다 — 반전 판정 기준 방향은 매 이동마다 갱신하지
// 않고 실제로 반전이 확인될 때만 갱신한다(한 스윙 안의 같은 방향 샘플들끼리 상쇄되어 버리는 걸 방지).
// 자세한 판정은 Boss.registerDragMovement 참고.
export const SHAKE_VOMIT_TRIGGER_MS = 4000;
// 이보다 작은 이동은 손떨림/드래그 잡음으로 보고 방향 판정에서 무시한다.
export const SHAKE_MIN_MOVE_PX = 6;
// 최근 이 시간 안에 쌓인 방향 반전 횟수로 "지금 흔들고 있는지"를 판단한다.
export const SHAKE_REVERSAL_WINDOW_MS = 800;
export const SHAKE_MIN_REVERSALS_IN_WINDOW = 3;
export const BOSS_VOMIT_DURATION = 1200; // ms, 구토 표정이 유지되는 시간
// 구토 데미지 — 패널 충돌 보너스 데미지(applyPanelPushDamage)와 같은 방식으로 HIT_COOLDOWN과 무관한
// 1회성 이벤트 데미지로 취급한다. rollDamage(BASE_DAMAGE_MIN~MAX)에 곱해진다.
export const VOMIT_DAMAGE_MULTIPLIER = 1.5;
export const VOMIT_POPUP_COLOR = '#7cb342'; // 구토 이펙트와 같은 초록 계열로 데미지 팝업 색을 맞춘다

// 마술봉(WAND)에 맞으면 그 자리에서 작아지며 사라졌다가 화면 안 랜덤한 위치에서 다시 커지며 나타난다
// (Boss.teleportRandom). 데미지 자체는 다른 PORTABLE 무기와 같은 파이프라인(CombatSystem.handleHit)을
// 그대로 타므로 별도 배율/색은 없다 — GameScene.onHit이 넉백 대신 이 연출을 트리거하고 스파크 색만 바꾼다.
export const WAND_TELEPORT_OUT_DURATION = 200; // ms, 작아지며 사라지는 시간
export const WAND_TELEPORT_IN_DURATION = 260; // ms, 랜덤 위치에서 커지며 나타나는 시간
export const WAND_TELEPORT_SPARK_COLOR = 0xb388ff; // 마술봉 히트 스파크 색 (연보라)

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
