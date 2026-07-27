// 무기 텍스처를 오프스크린 캔버스로 그려 Phaser 텍스처로 등록하는 파일.
// bossSprite.js와 같은 방식 — 무기 종류가 늘어날 때마다 이 파일에 create*Canvas 함수를 추가하고
// BootScene에서 textures.addCanvas(...)로 등록해서 쓴다.

function createCanvas(size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  return canvas;
}

// 이모지 하나를 정사각 캔버스 중앙에 그려 텍스처로 쓴다. 무기 아이콘을 새로 추가할 때 재사용
export function createEmojiCanvas(emoji, size) {
  const canvas = createCanvas(size);
  const ctx = canvas.getContext('2d');

  ctx.font = `${Math.round(size * 0.85)}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, size / 2, size / 2 + size * 0.05);

  return canvas;
}

// 투척형 무기(addThrowWeapon)의 첫 번째 디자인: 야구공
export function createBaseballCanvas(size) {
  return createEmojiCanvas('⚾', size);
}

// 휴대형 무기(addPortableWeapon)의 디자인: 알루미늄 야구 방망이 (검은 그립 + 손잡이 끝 손잡이 캡 + 은색 배럴)
// 실제 배트 실루엣 참고 — 그립에서 배럴까지 완만한 곡선으로 두꺼워지다 배럴 구간은 거의 일정한 두께를 유지하고
// 끝만 둥글게 마감된다. 손잡이 끝에는 작은 캡(knob)이 그립보다 살짝 더 튀어나와 있다.
// 좌하단(손잡이)→우상단(배럴) 대각선으로 배치.
// 캔버스는 정사각(size×size)이 아니라 45도로 눕힌 실루엣을 딱 감싸는 크기로 잡는다 — 겹침/드래그 판정이
// displayWidth·displayHeight(=캔버스 크기) 기준이라, 정사각으로 두면 그려지지 않는 네 귀퉁이 여백까지
// 히트박스에 포함되어 실제 그림보다 판정 범위가 커지는 문제가 있었다.
// createBaseballBatCanvas와 WeaponManager의 정밀 히트박스(캡슐) 계산이 같은 치수를 써야 하므로 분리해 둔다.
// size 하나 바꾸면 그림과 히트박스가 항상 같이 맞도록.
export function getBaseballBatDimensions(size) {
  const totalLength = size * 0.92;
  const halfLen = totalLength / 2;
  const handleHalfWidth = size * 0.045;
  const knobRadius = size * 0.075; // knob이 옆으로 튀어나온 폭 (배트 축과 수직 방향)
  const knobAxialRadius = size * 0.03; // knob이 배트 길이 방향으로 차지하는 두께 — 그립을 많이 가리지 않도록 얇게
  const barrelHalfWidth = size * 0.115;
  const gripLength = totalLength * 0.22;
  const barrelStraightLen = totalLength * 0.16;

  const knobCenterX = -halfLen + knobAxialRadius;
  const gripEndX = -halfLen + gripLength;
  const tipCenterX = halfLen - barrelHalfWidth; // 반원 중심 — 반지름만큼 안쪽에 둬야 끝점이 halfLen에 맞음
  const barrelStartX = tipCenterX - barrelStraightLen;
  const taperControlX = gripEndX + (barrelStartX - gripEndX) * 0.5;

  // 45도 회전한 막대의 축정렬 경계 상자 한 변 길이 (+2px는 안티에일리어싱 여백). knob<배럴 반두께라 배럴 쪽이 기준.
  const canvasSize = Math.ceil(Math.SQRT2 * (halfLen + barrelHalfWidth)) + 2;

  return {
    halfLen,
    handleHalfWidth,
    knobRadius,
    knobAxialRadius,
    barrelHalfWidth,
    gripLength,
    knobCenterX,
    gripEndX,
    tipCenterX,
    barrelStartX,
    taperControlX,
    canvasSize,
  };
}

export function createBaseballBatCanvas(size) {
  const gripColor = '#1c1c1c';
  const barrelColor = '#c9ced3';
  const barrelStrokeColor = '#8a9096';

  const {
    handleHalfWidth,
    knobRadius,
    knobAxialRadius,
    barrelHalfWidth,
    gripLength,
    knobCenterX,
    gripEndX,
    tipCenterX,
    barrelStartX,
    taperControlX,
    canvasSize,
    halfLen,
  } = getBaseballBatDimensions(size);

  const canvas = createCanvas(canvasSize);
  const ctx = canvas.getContext('2d');

  ctx.save();
  ctx.translate(canvasSize / 2, canvasSize / 2);
  ctx.rotate(-Math.PI / 4);

  // 배럴 + 완만한 테이퍼 (실루엣)
  ctx.fillStyle = barrelColor;
  ctx.strokeStyle = barrelStrokeColor;
  ctx.lineWidth = Math.max(1, size * 0.01);
  ctx.beginPath();
  ctx.moveTo(gripEndX, -handleHalfWidth);
  ctx.quadraticCurveTo(taperControlX, -barrelHalfWidth, barrelStartX, -barrelHalfWidth);
  ctx.lineTo(tipCenterX, -barrelHalfWidth);
  ctx.arc(tipCenterX, 0, barrelHalfWidth, -Math.PI / 2, Math.PI / 2, false);
  ctx.lineTo(barrelStartX, barrelHalfWidth);
  ctx.quadraticCurveTo(taperControlX, barrelHalfWidth, gripEndX, handleHalfWidth);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 그립 (검은 손잡이 밴드)
  ctx.fillStyle = gripColor;
  ctx.fillRect(-halfLen, -handleHalfWidth, gripLength, handleHalfWidth * 2);

  // 손잡이 끝 캡(knob) — 길이 방향으로는 얇고 옆으로만 살짝 튀어나온 은색 디스크
  ctx.fillStyle = barrelColor;
  ctx.strokeStyle = barrelStrokeColor;
  ctx.beginPath();
  ctx.ellipse(knobCenterX, 0, knobAxialRadius, knobRadius, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
  return canvas;
}
