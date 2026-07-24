// Phaser 기본 폰트(Courier)는 한글 글리프가 없어 텍스트가 잘려 보임 — 한글이 있는 모든 텍스트에 명시적으로 지정
export const UI_FONT_FAMILY = '"Malgun Gothic", "Apple SD Gothic Neo", sans-serif';

export const HIT_COOLDOWN = 300; // ms
export const BASE_DAMAGE_MIN = 5;
export const BASE_DAMAGE_MAX = 15;
export const HP_BAR_WIDTH = 200;
export const HP_BAR_X = 400;
export const HP_BAR_Y = 30;
export const BOSS_SPAWN = { x: 400, y: 400 };
export const DRAW_SCORE_STEP = 100;
export const INITIAL_FREE_DRAWS = 1; // 필드에 무기가 하나도 없는 상태로 시작하므로 시작 시 무기 뽑기 1회를 무료로 제공
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
export const DAMAGE_POPUP_DURATION = 700; // ms
export const DEFEAT_POPUP_DURATION = 900; // ms
export const BOOSTED_POPUP_COLOR = '#33cc33'; // 스택된(초록) 무기가 준 데미지 팝업 색 — STACK_TINT_COLOR와 동일 계열
export const DEFEAT_POPUP_COLOR = '#ffaa00'; // "처치!" 팝업 색 — 뽑기 버튼과 동일 계열
