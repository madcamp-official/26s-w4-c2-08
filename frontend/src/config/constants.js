// Phaser 기본 폰트(Courier)는 한글 글리프가 없어 텍스트가 잘려 보임 — 한글이 있는 모든 텍스트에 명시적으로 지정
export const UI_FONT_FAMILY = '"Malgun Gothic", "Apple SD Gothic Neo", sans-serif';

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
export const THROW_PROJECTILE_SPEED = 400; // px/s
export const PORTABLE_WEAPON_SIZE = 160; // 야구 방망이 텍스처 크기 — WeaponManager의 캡슐 히트박스 계산도 이 값을 같이 씀
export const THROW_WEAPON_SIZE = 40; // 야구공(투척형) 텍스처 크기 — 무기 자체와 던져지는 투사체가 같은 크기를 쓴다 (기존 50에서 20% 축소)
// 투사체는 정사각 캔버스에 그린 둥근 이모지라, 사각 히트박스 그대로 쓰면 실제 공 그림이 없는 네 모서리까지
// 보스와의 판정에 끼어들어 히트박스가 커 보인다. 실제 그림 크기에 맞춰 원형으로 판정한다.
export const THROW_PROJECTILE_HIT_RADIUS = THROW_WEAPON_SIZE * 0.4;

// 무기 뽑기 카테고리 — 배경 선택 패널과 같은 방식으로 Hud의 무기 패널에서 종류를 직접 고른다
export const WEAPON_CATEGORIES = {
  PORTABLE: 'portable',
  THROW: 'throw',
};

// 무기 패널에 표시할 미리보기 텍스처 (BootScene에서 등록한 텍스처 키)
export const WEAPON_CATEGORY_TEXTURES = {
  [WEAPON_CATEGORIES.PORTABLE]: 'weapon_portable',
  [WEAPON_CATEGORIES.THROW]: 'weapon_throw',
};

// 타격 이펙트
export const BOSS_KNOCKBACK_DISTANCE = 26; // px, 타격당 타격 반대 방향으로 밀려나는 거리 (누적됨)
export const BOSS_KNOCKBACK_OUT_DURATION = 70; // ms, 밀려나는 트윈 시간
export const BOSS_PANEL_PUSH_DURATION = 260; // ms, 무기/배경 패널에 부딪혀 왼쪽 벽까지 날아가는 트윈 시간
export const BOSS_PANEL_PUSH_DAMAGE_MULTIPLIER = 2; // 패널에 부딪혀 왼쪽 벽까지 날아갈 때 추가로 받는 데미지 배율
export const BOSS_PANEL_PUSH_POPUP_COLOR = '#ff5050'; // 패널 충돌 보너스 데미지 팝업 색 (일반 데미지와 구분)
export const BOSS_FLASH_DURATION = 120; // ms
export const BOSS_HURT_FACE_DURATION = 300; // ms, 피격 시 눈이 X_X로 바뀌어 있는 시간
export const DAMAGE_POPUP_DURATION = 700; // ms
export const DEFEAT_POPUP_DURATION = 900; // ms
export const DEFEAT_POPUP_COLOR = '#ffaa00'; // "처치!" 팝업 색 — 뽑기 버튼과 동일 계열
