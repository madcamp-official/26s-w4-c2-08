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
export const BOSS_COLOR = '#e8631a'; // 보스 픽셀 스프라이트 몸통 색 (Classic Coral 후보의 진한 주황 버전)
// 무기 구매 상점: score를 "커밋" 재화로 재사용해서 타입별 가격으로 직접 골라 구매한다
export const WEAPON_TYPES = [
  { id: 'installed', icon: '🐛', cost: 80 },
  { id: 'portable', icon: '⌨️', cost: 100 },
  { id: 'throw', icon: '⚾', cost: 150 },
];
export const CONTACT_OVERLAP = 4; // px of intentional overlap left at contact so overlap detection still fires
export const THROW_FIRE_INTERVAL = 400; // ms between auto-fired projectiles while holding the throw weapon
export const THROW_PROJECTILE_SPEED = 400; // px/s
export const STACK_DAMAGE_MULTIPLIER = 1.5; // 동일 타입 무기를 겹쳐 합칠 때마다 데미지 배율에 곱해지는 값
export const STACK_TINT_COLOR = 0x33cc33; // 합쳐진(스택된) 무기를 표시하는 초록색
export const TRASH_SCORE_BONUS = 5; // 쓰레기통에 무기를 버렸을 때 오르는 점수

// 타격 이펙트
export const BOSS_SHAKE_MAGNITUDE = 8; // px
export const BOSS_SHAKE_SEGMENT_DURATION = 60; // ms, yoyo 1왕복 기준
export const BOSS_FLASH_DURATION = 120; // ms
export const BOSS_HURT_FACE_DURATION = 300; // ms, 피격 시 눈이 X_X로 바뀌어 있는 시간
export const DAMAGE_POPUP_DURATION = 700; // ms
export const DEFEAT_POPUP_DURATION = 900; // ms
export const BOOSTED_POPUP_COLOR = '#33cc33'; // 스택된(초록) 무기가 준 데미지 팝업 색 — STACK_TINT_COLOR와 동일 계열
export const DEFEAT_POPUP_COLOR = '#ffaa00'; // "처치!" 팝업 색 — 뽑기 버튼과 동일 계열
