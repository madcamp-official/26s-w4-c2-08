// 보스 스프라이트도 배경과 같은 방식(오프스크린 캔버스 → Phaser 텍스처)으로 만든다.
// 격자는 디자인 후보 비교안의 "Classic Coral" 실루엣을 그대로 옮긴 것 — 몸통 7x5, 좌우 팔 1칸씩,
// 바깥쪽 다리 2개(1칸)와 안쪽 다리 2개(2칸)로 구성된 13x8 격자 중 실제로 칠해지는 부분만 잘라냈다.
const CELL = 10;

// 느낌표/분노 표시가 머리 옆 캔버스 바깥 여백에 들어갈 자리를 확보한다 (표시가 커서 여유 있게 잡음).
// 여백은 왼쪽에 두고 몸통 전체를 그만큼 오른쪽으로 밀어서 그린다.
const TOP_MARGIN = 24;
const SIDE_MARGIN = 20;

const BODY_CELLS = [
  [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7],
  [1, 1], [1, 3], [1, 4], [1, 5], [1, 7],
  [2, 0], [2, 1], [2, 2], [2, 3], [2, 4], [2, 5], [2, 6], [2, 7], [2, 8],
  [3, 1], [3, 2], [3, 3], [3, 4], [3, 5], [3, 6], [3, 7],
  [4, 1], [4, 2], [4, 3], [4, 4], [4, 5], [4, 6], [4, 7],
  [5, 1], [5, 3], [5, 5], [5, 7],
];
const EYE_CELLS = [[1, 2], [1, 6]]; // [왼쪽 눈, 오른쪽 눈]

const COLS = 9; // col 0~8
const ROWS = 7; // row 0~6

export const BOSS_TEXTURE_WIDTH = COLS * CELL + SIDE_MARGIN;
export const BOSS_TEXTURE_HEIGHT = ROWS * CELL + TOP_MARGIN;

// 보스 데미지 단계: 0=평상시, 1=70% 이하(처진 눈 + 입 + 느낌표), 2=30% 이하(더 처진 눈 + 입 더 벌어짐 + 분노 마크)
export const MAX_DAMAGE_STAGE = 2;

function createCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = BOSS_TEXTURE_WIDTH;
  canvas.height = BOSS_TEXTURE_HEIGHT;
  return canvas;
}

function cellRect(r, c) {
  return { x: c * CELL + SIDE_MARGIN, y: r * CELL + TOP_MARGIN, w: CELL, h: CELL };
}

function drawBody(ctx, bodyColor) {
  BODY_CELLS.forEach(([r, c]) => {
    const { x, y, w, h } = cellRect(r, c);
    ctx.fillStyle = bodyColor;
    ctx.fillRect(x, y, w, h);
  });
}

// 평상시엔 양쪽 다 사각형 눈. forceBothEyesX면(피격 직후 짧게 뜨는 X_X) 두 눈 다 부드러운 X.
// droopStage(1~2)면 두 눈 다 처진(tired) 사선으로 바뀌고, 단계가 올라갈수록 더 굵고 더 처진다.
function drawEyes(ctx, bodyColor, eyeColor, { droopStage, forceBothEyesX }) {
  EYE_CELLS.forEach(([r, c], index) => {
    const { x, y, w, h } = cellRect(r, c);
    const isLeftEye = index === 0;

    if (forceBothEyesX) {
      drawSmoothX(ctx, bodyColor, eyeColor, x, y, w, h);
      return;
    }
    if (droopStage >= 1) {
      drawDroopyEye(ctx, bodyColor, eyeColor, x, y, w, h, isLeftEye, droopStage);
      return;
    }
    ctx.fillStyle = eyeColor;
    ctx.fillRect(x, y, w, h);
  });
}

// 피격 시 잠깐 보여주는 부드러운 X_X 표정
function drawSmoothX(ctx, bodyColor, eyeColor, x, y, w, h) {
  ctx.fillStyle = bodyColor;
  ctx.fillRect(x, y, w, h);

  const pad = CELL * 0.22;
  ctx.strokeStyle = eyeColor;
  ctx.lineWidth = CELL * 0.22;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + pad, y + pad); ctx.lineTo(x + w - pad, y + h - pad);
  ctx.moveTo(x + w - pad, y + pad); ctx.lineTo(x + pad, y + h - pad);
  ctx.stroke();
}

// 70% 이하부터 계속 떠 있는 처진(tired/sad) 눈 — 바깥쪽은 높고 안쪽은 낮은 사선 하나로 표현.
// 2단계에서는 선이 더 굵어지고 더 아래로 처져서 지친 인상이 강해진다.
function drawDroopyEye(ctx, bodyColor, eyeColor, x, y, w, h, isLeftEye, stage) {
  ctx.fillStyle = bodyColor;
  ctx.fillRect(x, y, w, h);

  const thickness = stage >= 2 ? CELL * 0.4 : CELL * 0.22;
  const droop = stage >= 2 ? h * 0.75 : h * 0.55;
  const pad = CELL * 0.12;

  ctx.strokeStyle = eyeColor;
  ctx.lineWidth = thickness;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (isLeftEye) {
    ctx.moveTo(x + pad, y + h * 0.25);
    ctx.lineTo(x + w - pad, y + droop);
  } else {
    ctx.moveTo(x + w - pad, y + h * 0.25);
    ctx.lineTo(x + pad, y + droop);
  }
  ctx.stroke();
}

// 입: 70% 이하부터 네모지고 두꺼운 "벌어진 입"으로 바뀌고, 30% 이하는 더 크게 벌어진다.
// row2(항상 칠해진 구간) 중앙에 배치.
function drawMouth(ctx, damageStage) {
  if (damageStage < 1) return;

  const mouthY = 2 * CELL + TOP_MARGIN + CELL * 0.25;
  const width = damageStage >= 2 ? 30 : 22;
  const height = damageStage >= 2 ? 8 : 6;
  const x = SIDE_MARGIN + (COLS * CELL) / 2 - width / 2;

  ctx.fillStyle = '#000000';
  ctx.fillRect(x, mouthY, width, height);
}

// 머리 옆에 크게 뜨는 상태 표시. 1단계는 빨간 느낌표(놀람), 2단계는 빨간 소용돌이 분노 마크로 바뀐다.
// 캔버스 왼쪽 여백(SIDE_MARGIN)에 그려서 몸통 실루엣을 가리지 않는다.
const MARK_CENTER = { x: SIDE_MARGIN / 2, y: TOP_MARGIN * 0.55 };
const MARK_SIZE = 24;

function drawExclamationMark(ctx, cx, cy, size) {
  ctx.fillStyle = '#e6402f';
  const barW = size * 0.26;
  const barH = size * 0.58;
  ctx.fillRect(cx - barW / 2, cy - size * 0.5, barW, barH);
  const dotSize = size * 0.28;
  ctx.fillRect(cx - dotSize / 2, cy + size * 0.16, dotSize, dotSize);
}

// 중심에서 살짝 떨어진 채 따로 떠 있는, 부드럽게 90도로 굽은 획 4개를 90도씩 돌려 그려서
// 만화식 "분노 마크"를 흉내낸다. 중심에서 모두 만나면 바람개비처럼 뭉쳐 보이므로
// 시작점을 중심에서 띄워 서로 떨어진 개별 획으로 보이게 한다. arcTo로 꺾이는 부분을 둥글게 굴린다.
function drawAngerMark(ctx, cx, cy, size) {
  ctx.strokeStyle = '#e6402f';
  ctx.lineWidth = size * 0.26;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let i = 0; i < 4; i += 1) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((Math.PI / 2) * i + Math.PI / 4);
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.28);
    ctx.arcTo(size * 0.5, -size * 0.28, size * 0.5, -size * 0.85, size * 0.3);
    ctx.lineTo(size * 0.5, -size * 0.85);
    ctx.stroke();
    ctx.restore();
  }
}

// forceExclamation: 아직 데미지 단계가 0(평상시)이어도 맞은 직후(hurt) 잠깐 느낌표를 띄우기 위한 플래그.
function drawDamageMark(ctx, damageStage, { forceExclamation = false } = {}) {
  if (damageStage >= 2) {
    drawAngerMark(ctx, MARK_CENTER.x, MARK_CENTER.y, MARK_SIZE);
    return;
  }
  if (damageStage >= 1 || forceExclamation) {
    drawExclamationMark(ctx, MARK_CENTER.x, MARK_CENTER.y, MARK_SIZE);
  }
}

export function createBossCanvas(bodyColor, eyeColor = '#000000', damageStage = 0) {
  const canvas = createCanvas();
  const ctx = canvas.getContext('2d');

  drawBody(ctx, bodyColor);
  drawEyes(ctx, bodyColor, eyeColor, { droopStage: damageStage, forceBothEyesX: false });
  drawMouth(ctx, damageStage);
  drawDamageMark(ctx, damageStage);

  return canvas;
}

// 피격 시 잠깐 보여주는 부드러운 "X_X" 표정. 현재 데미지 단계(처진 눈/입/상태 마크)의 눈만 일시적으로
// 덮어 X로 바꾸고, 입/상태 마크 등 나머지 데미지 표시는 그대로 유지한다.
export function createBossHurtCanvas(bodyColor, eyeColor = '#000000', damageStage = 0) {
  const canvas = createCanvas();
  const ctx = canvas.getContext('2d');

  drawBody(ctx, bodyColor);
  drawEyes(ctx, bodyColor, eyeColor, { droopStage: damageStage, forceBothEyesX: true });
  drawMouth(ctx, damageStage);
  drawDamageMark(ctx, damageStage, { forceExclamation: true });

  return canvas;
}
