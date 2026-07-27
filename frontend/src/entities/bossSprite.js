// 보스 스프라이트도 배경과 같은 방식(오프스크린 캔버스 → Phaser 텍스처)으로 만든다.
// 격자는 디자인 후보 비교안의 "Classic Coral" 실루엣을 그대로 옮긴 것 — 몸통 7x5, 좌우 팔 1칸씩,
// 바깥쪽 다리 2개(1칸)와 안쪽 다리 2개(2칸)로 구성된 13x8 격자 중 실제로 칠해지는 부분만 잘라냈다.
const CELL = 10;

// 느낌표/분노 표시가 머리 옆 캔버스 바깥 여백에 들어갈 자리를 확보한다 (표시가 커서 여유 있게 잡음).
// 여백은 왼쪽에 두고 몸통 전체를 그만큼 오른쪽으로 밀어서 그린다.
// export하는 이유: 이 여백엔 실제 몸통이 없어서 Boss.js가 히트 판정 사각형을 몸통 크기만큼만
// 잡을 때(=여백/상태표시 아이콘을 때려도 데미지가 안 들어가게) 같은 값을 써야 한다.
const TOP_MARGIN = 24;
const SIDE_MARGIN = 20;
export const BOSS_MARGIN_TOP = TOP_MARGIN;
export const BOSS_MARGIN_LEFT = SIDE_MARGIN;

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

// row2(항상 칠해진 구간) 중앙, 입 네모의 공통 위치/크기 계산. drawMouth와 불 뿜는 강제로 벌린 입이 같이 쓴다.
function mouthRect(width, height) {
  const mouthY = 2 * CELL + TOP_MARGIN + CELL * 0.25;
  const x = SIDE_MARGIN + (COLS * CELL) / 2 - width / 2;
  return { x, y: mouthY, width, height };
}

// 입: 70% 이하부터 네모지고 두꺼운 "벌어진 입"으로 바뀌고, 30% 이하는 더 크게 벌어진다.
function drawMouth(ctx, damageStage) {
  if (damageStage < 1) return;

  const width = damageStage >= 2 ? 30 : 22;
  const height = damageStage >= 2 ? 8 : 6;
  const { x, y } = mouthRect(width, height);

  ctx.fillStyle = '#000000';
  ctx.fillRect(x, y, width, height);
}

// 불 뿜을 땐 데미지 단계와 무관하게 입을 제일 크게 벌린 모양으로 고정한다.
function drawOpenMouth(ctx) {
  const { x, y, width, height } = mouthRect(30, 8);
  ctx.fillStyle = '#000000';
  ctx.fillRect(x, y, width, height);
  return { x, y, width, height };
}

// 불꽃 한 겹 — 입 바로 아래에서 시작하는 뾰족한 점에서 아래로 갈수록 넓어지는 물방울 모양.
// 세 겹(바깥 빨강 → 가운데 주황 → 안쪽 노랑)을 겹쳐 그리면 불꽃 특유의 그라데이션 느낌이 난다.
function drawFlameLobe(ctx, cx, topY, height, width, color) {
  const halfW = width / 2;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, topY);
  ctx.quadraticCurveTo(cx - halfW * 0.25, topY + height * 0.3, cx - halfW * 0.75, topY + height * 0.5);
  ctx.quadraticCurveTo(cx - halfW * 0.35, topY + height * 0.72, cx - halfW, topY + height);
  ctx.quadraticCurveTo(cx, topY + height * 1.18, cx + halfW, topY + height);
  ctx.quadraticCurveTo(cx + halfW * 0.35, topY + height * 0.72, cx + halfW * 0.75, topY + height * 0.5);
  ctx.quadraticCurveTo(cx + halfW * 0.25, topY + height * 0.3, cx, topY);
  ctx.closePath();
  ctx.fill();
}

// 연타 콤보 임계치를 넘으면 잠깐 뜨는 "불 뿜기" 연출. 벌어진 입 아래로 불꽃 세 겹을 그린다.
function drawFireBreath(ctx) {
  const { x, y, width, height } = drawOpenMouth(ctx);
  const cx = x + width / 2;
  const topY = y + height;
  drawFlameLobe(ctx, cx, topY, 36, 40, '#e6402f');
  drawFlameLobe(ctx, cx, topY + 3, 27, 28, '#ff9a3c');
  drawFlameLobe(ctx, cx, topY + 6, 16, 14, '#ffe066');
}

// 머리 옆에 크게 뜨는 상태 표시. 1단계는 빨간 느낌표(놀람), 2단계는 빨간 소용돌이 분노 마크로 바뀐다.
// 캔버스 왼쪽 여백(SIDE_MARGIN)에 그려서 몸통 실루엣을 가리지 않는다.
// 분노 마크 반지름(size*0.85)이 SIDE_MARGIN(20)보다 커서 중심을 여백 한가운데 두면 캔버스 밖으로
// 잘려나간다 — 중심을 캔버스 안쪽으로 살짝 밀어 넣어 잘리지 않게 한다(몸통 쪽으로 약간 겹치는 건 위에 그려져 괜찮음).
const MARK_CENTER = { x: 21, y: 22 };
const MARK_SIZE = 24;

function drawExclamationMark(ctx, cx, cy, size) {
  ctx.fillStyle = '#e6402f';
  const barW = size * 0.26;
  const barH = size * 0.58;
  ctx.fillRect(cx - barW / 2, cy - size * 0.5, barW, barH);
  const dotSize = size * 0.28;
  ctx.fillRect(cx - dotSize / 2, cy + size * 0.16, dotSize, dotSize);
}

// 분노 마크 원본 벡터(508x516 viewBox)의 4개 갈고리 윤곽선. 좌표/모양은 디자인 원본 그대로 옮기고
// 색만 기존 팔레트(#e6402f)를 쓴다. ANGER_MARK_RADIUS는 이 좌표들의 중심(ANGER_MARK_CENTER) 기준
// 최대 반지름 — drawAngerMark에서 목표 size에 맞게 스케일할 때 기준값으로 쓴다.
const ANGER_MARK_CENTER = { x: 254, y: 258 };
const ANGER_MARK_RADIUS = 255;
const ANGER_MARK_PATHS = [
  [[69, 426], [93, 455], [101, 462], [132, 436], [156, 420], [185, 408], [211, 407], [231, 416], [250, 434], [271, 465], [292, 505], [334, 483], [328, 469], [304, 426], [281, 396], [261, 378], [250, 371], [222, 360], [192, 358], [170, 362], [150, 369], [113, 390]],
  [[169, 49], [198, 103], [222, 135], [246, 156], [262, 165], [290, 173], [317, 173], [350, 164], [376, 151], [393, 140], [434, 106], [403, 69], [375, 93], [345, 113], [321, 123], [312, 125], [294, 125], [273, 116], [253, 97], [238, 76], [212, 27]],
  [[469, 183], [421, 208], [387, 232], [370, 249], [361, 261], [353, 275], [346, 296], [344, 325], [347, 344], [353, 363], [362, 382], [377, 406], [411, 448], [413, 448], [448, 417], [419, 382], [400, 350], [393, 329], [393, 306], [401, 288], [422, 266], [452, 246], [491, 226]],
  [[92, 83], [55, 115], [86, 152], [104, 183], [111, 207], [110, 227], [100, 247], [81, 266], [61, 280], [13, 306], [34, 348], [43, 345], [85, 322], [118, 298], [133, 283], [144, 268], [151, 255], [158, 234], [158, 194], [149, 165], [139, 145], [124, 122]],
];

// 만화식 "분노 마크". 원본 벡터 좌표를 (cx,cy) 중심으로 옮기고 size에 맞게 스케일해서 그대로 채운다.
function drawAngerMark(ctx, cx, cy, size) {
  const scale = (size * 0.85) / ANGER_MARK_RADIUS;
  ctx.fillStyle = '#e6402f';

  ANGER_MARK_PATHS.forEach((points) => {
    ctx.beginPath();
    points.forEach(([px, py], i) => {
      const x = cx + (px - ANGER_MARK_CENTER.x) * scale;
      const y = cy + (py - ANGER_MARK_CENTER.y) * scale;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();
  });
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

// 평상시(쉬고 있을 때) 텍스처. 느낌표/분노 마크는 여기 안 그린다 — 계속 떠 있으면 그 자리가 항상
// 히트박스 바깥의 "죽은 공간"으로 보여 어색해서, 맞는 순간에만 잠깐 뜨도록 createBossHurtCanvas /
// createBossFireCanvas 쪽에서만 그린다 (둘 다 일정 시간 뒤 이 텍스처로 자동 복귀함).
export function createBossCanvas(bodyColor, eyeColor = '#000000', damageStage = 0) {
  const canvas = createCanvas();
  const ctx = canvas.getContext('2d');

  drawBody(ctx, bodyColor);
  drawEyes(ctx, bodyColor, eyeColor, { droopStage: damageStage, forceBothEyesX: false });
  drawMouth(ctx, damageStage);

  return canvas;
}

// 짧은 시간에 연타(콤보)가 몰리면 잠깐 보여주는 "불 뿜기" 표정. 눈/상태 마크는 현재 데미지 단계 그대로 두고
// 입만 강제로 크게 벌려 불꽃을 뿜는 모습으로 덮어씌운다 — HP 단계와는 무관한 별개의 연출이라 항상 최대로 벌린다.
export function createBossFireCanvas(bodyColor, eyeColor = '#000000', damageStage = 0) {
  const canvas = createCanvas();
  const ctx = canvas.getContext('2d');

  drawBody(ctx, bodyColor);
  drawEyes(ctx, bodyColor, eyeColor, { droopStage: damageStage, forceBothEyesX: false });
  drawDamageMark(ctx, damageStage);
  drawFireBreath(ctx);

  return canvas;
}

// 피격 시 잠깐 보여주는 부드러운 "X_X" 표정. 눈을 X로 덮어씌우고 느낌표/분노 마크도 같이 반짝 띄운다 —
// hurtFaceEvent 타이머가 끝나면 평상시 텍스처(createBossCanvas, 마크 없음)로 돌아가면서 마크도 같이 사라진다.
export function createBossHurtCanvas(bodyColor, eyeColor = '#000000', damageStage = 0) {
  const canvas = createCanvas();
  const ctx = canvas.getContext('2d');

  drawBody(ctx, bodyColor);
  drawEyes(ctx, bodyColor, eyeColor, { droopStage: damageStage, forceBothEyesX: true });
  drawMouth(ctx, damageStage);
  drawDamageMark(ctx, damageStage, { forceExclamation: true });

  return canvas;
}
