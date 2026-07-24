// 보스 스프라이트도 배경과 같은 방식(오프스크린 캔버스 → Phaser 텍스처)으로 만든다.
// 격자는 디자인 후보 비교안의 "Classic Coral" 실루엣을 그대로 옮긴 것 — 몸통 7x5, 좌우 팔 1칸씩,
// 바깥쪽 다리 2개(1칸)와 안쪽 다리 2개(2칸)로 구성된 13x8 격자 중 실제로 칠해지는 부분만 잘라냈다.
const CELL = 10;

const BODY_CELLS = [
  [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7],
  [1, 1], [1, 3], [1, 4], [1, 5], [1, 7],
  [2, 0], [2, 1], [2, 2], [2, 3], [2, 4], [2, 5], [2, 6], [2, 7], [2, 8],
  [3, 1], [3, 2], [3, 3], [3, 4], [3, 5], [3, 6], [3, 7],
  [4, 1], [4, 2], [4, 3], [4, 4], [4, 5], [4, 6], [4, 7],
  [5, 1], [5, 3], [5, 5], [5, 7],
];
const EYE_CELLS = [[1, 2], [1, 6]];

const COLS = 9; // col 0~8
const ROWS = 7; // row 0~6

export const BOSS_TEXTURE_WIDTH = COLS * CELL;
export const BOSS_TEXTURE_HEIGHT = ROWS * CELL;

function createCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = BOSS_TEXTURE_WIDTH;
  canvas.height = BOSS_TEXTURE_HEIGHT;
  return canvas;
}

function drawBody(ctx, bodyColor) {
  BODY_CELLS.forEach(([r, c]) => {
    ctx.fillStyle = bodyColor;
    ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
  });
}

export function createBossCanvas(bodyColor, eyeColor = '#000000') {
  const canvas = createCanvas();
  const ctx = canvas.getContext('2d');

  drawBody(ctx, bodyColor);
  EYE_CELLS.forEach(([r, c]) => {
    ctx.fillStyle = eyeColor;
    ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
  });

  return canvas;
}

// 피격 시 잠깐 보여주는 "X_X" 표정 — 눈 칸을 채우는 대신 몸통 색 위에 X를 그린다.
export function createBossHurtCanvas(bodyColor, eyeColor = '#000000') {
  const canvas = createCanvas();
  const ctx = canvas.getContext('2d');

  drawBody(ctx, bodyColor);
  EYE_CELLS.forEach(([r, c]) => {
    ctx.fillStyle = bodyColor;
    ctx.fillRect(c * CELL, r * CELL, CELL, CELL);

    const pad = CELL * 0.22;
    const x0 = c * CELL + pad, x1 = c * CELL + CELL - pad;
    const y0 = r * CELL + pad, y1 = r * CELL + CELL - pad;
    ctx.strokeStyle = eyeColor;
    ctx.lineWidth = CELL * 0.22;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
    ctx.moveTo(x1, y0); ctx.lineTo(x0, y1);
    ctx.stroke();
  });

  return canvas;
}
