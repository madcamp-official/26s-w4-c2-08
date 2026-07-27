// Phaser 기본 폰트(Courier)는 한글 글리프가 없어 텍스트가 잘려 보임 — 한글이 있는 모든 텍스트에 명시적으로 지정
// Galmuri11(도트 폰트, OFL) 웹폰트를 우선 사용 — @font-face는 index.html(dev)과 extension.ts(패키징)에서
// 각각 선언하고 main.js가 document.fonts.load()로 미리 로드해둔다. 로드 실패/미지원 시 시스템 고딕으로 폴백.
export const UI_FONT_FAMILY = '"Galmuri11", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';

// 전투 배경 스타일 — backgrounds.js의 BACKGROUND_STYLES 참고 ('classic' | 'diff' | 'matrix' | 'error')
export const BACKGROUND_STYLE = 'matrix';

export const HIT_COOLDOWN = 300; // ms
export const BASE_DAMAGE_MIN = 5;
export const BASE_DAMAGE_MAX = 15;
export const HP_BAR_WIDTH = 200;
export const HP_BAR_X = 400; // 보스와 같은 x(화면 중앙)를 유지
export const HP_BAR_Y = 560; // 화면 하단으로 이동 — 보스 체력바를 화면 아래에 두는 보스전 UI 컨벤션
export const TOP_HUD_Y = 30; // Weapon/End 버튼 상단 y 기준 (HP바가 하단으로 빠지면서 별도 상수로 분리)
export const BOSS_SPAWN = { x: 400, y: 400 };
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
// PORTABLE(휴대형)은 들고 부딪혀서 데미지, THROW(투척형)는 들고 있는 동안 자동으로 연사한다.
export const WEAPON_CATEGORIES = {
  PORTABLE: 'portable',
  THROW: 'throw',
};

// 무기 패널에 실제로 보이는 개별 무기. category가 동작 방식을 정하고, 같은 category를 여러 무기가
// 공유할 수 있다 — 야구공/다트 둘 다 투척형(THROW)이지만 그림(texture/projectileTexture)만 다르다.
export const WEAPON_IDS = {
  BAT: 'bat',
  BALL: 'ball',
  DART: 'dart',
};

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
// fireSound: 발사 시 재생할 사운드 키 (없으면 무음).
export const WEAPON_DEFINITIONS = {
  [WEAPON_IDS.BAT]: { category: WEAPON_CATEGORIES.PORTABLE, texture: 'weapon_portable' },
  [WEAPON_IDS.BALL]: {
    category: WEAPON_CATEGORIES.THROW,
    texture: 'weapon_throw',
    projectileTexture: 'weapon_throw_projectile',
    projectileSpeed: BALL_PROJECTILE_SPEED,
  },
  [WEAPON_IDS.DART]: {
    category: WEAPON_CATEGORIES.THROW,
    texture: 'weapon_dart',
    projectileTextures: DART_PROJECTILE_TEXTURES,
    rotateToTravel: true,
    stickOnHit: true,
    fireSound: 'dart_throw',
  },
};

export const DART_STICK_DURATION = 8000; // ms, 다트가 맞은 자리에 박힌 채로 남아 있다가 사라지기까지 시간
export const DART_EMBED_DEPTH = 10; // px, 맞은 지점에서 날아가던 방향으로 더 파고들어가 보이게 미는 거리

// 타격 이펙트
export const BOSS_KNOCKBACK_DISTANCE = 26; // px, 타격당 타격 반대 방향으로 밀려나는 거리 (누적됨)
export const BOSS_KNOCKBACK_OUT_DURATION = 70; // ms, 밀려나는 트윈 시간
export const BOSS_PANEL_PUSH_DURATION = 260; // ms, 무기/배경 패널에 부딪혀 왼쪽 벽까지 날아가는 트윈 시간
export const BOSS_PANEL_PUSH_DAMAGE_MULTIPLIER = 2; // 패널에 부딪혀 왼쪽 벽까지 날아갈 때 추가로 받는 데미지 배율
export const BOSS_PANEL_PUSH_POPUP_COLOR = '#ff5050'; // 패널 충돌 보너스 데미지 팝업 색 (일반 데미지와 구분)
export const BOSS_FLASH_DURATION = 120; // ms
export const BOSS_HURT_FACE_DURATION = 300; // ms, 피격 시 눈이 X_X로 바뀌어 있는 시간
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
  'ㅎㅇ',
  '수준 ㅋ',
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
