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

// 투척형 무기 두 번째 디자인: 다트. 은색 뾰족한 촉 + 색깔 있는 샤프트 + 깃(flight) 실루엣.
// 방망이(대각선 baked)와 달리 다트는 항상 "오른쪽(각도 0)"을 향하게 그려서, 날아가는 방향으로
// 돌릴 때 baked 보정 없이 그냥 projectile.rotation = 이동 각도만 대입하면 되게 한다 (WeaponManager 참고).
// shaftColor/finColor를 인자로 받아 색만 다른 여러 텍스처를 찍어낼 수 있게 한다 (BootScene 참고) —
// 실제로 다트를 여러 개 던지면 같은 모양이 계속 반복돼 단조로우니 색만 섞어서 다양해 보이게 한다.
export function createDartCanvas(size, { shaftColor = '#d1483f', shaftStrokeColor = '#8a2f28', finColor = '#3f7fe0' } = {}) {
  const tipColor = '#d7dce0';

  const canvas = createCanvas(size);
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;
  const halfLen = size * 0.42;
  const shaftHalfWidth = size * 0.035;
  const tipLength = size * 0.2;
  const finLength = size * 0.24;
  const finHalfWidth = size * 0.13;
  const tipX = cx + halfLen;
  const tailX = cx - halfLen;
  const shaftEndX = tipX - tipLength;
  const shaftStartX = tailX + finLength;

  // 꼬리 깃(flight) — 샤프트보다 넓게 벌어졌다가 끝에서 뾰족하게 모이는 실루엣
  ctx.fillStyle = finColor;
  ctx.beginPath();
  ctx.moveTo(tailX, cy);
  ctx.lineTo(tailX + finLength * 0.55, cy - finHalfWidth);
  ctx.lineTo(shaftStartX, cy - shaftHalfWidth);
  ctx.lineTo(shaftStartX, cy + shaftHalfWidth);
  ctx.lineTo(tailX + finLength * 0.55, cy + finHalfWidth);
  ctx.closePath();
  ctx.fill();

  // 샤프트(몸통)
  ctx.fillStyle = shaftColor;
  ctx.strokeStyle = shaftStrokeColor;
  ctx.lineWidth = Math.max(1, size * 0.01);
  ctx.fillRect(shaftStartX, cy - shaftHalfWidth, shaftEndX - shaftStartX, shaftHalfWidth * 2);
  ctx.strokeRect(shaftStartX, cy - shaftHalfWidth, shaftEndX - shaftStartX, shaftHalfWidth * 2);

  // 촉(tip) — 은색 뾰족한 삼각형
  ctx.fillStyle = tipColor;
  ctx.beginPath();
  ctx.moveTo(tipX, cy);
  ctx.lineTo(shaftEndX, cy - shaftHalfWidth * 2.4);
  ctx.lineTo(shaftEndX, cy + shaftHalfWidth * 2.4);
  ctx.closePath();
  ctx.fill();

  return canvas;
}

// 휴대형 무기 세 번째 디자인: 전기충격기. 검은 손잡이/몸체 + 앞쪽 은색 프롱(전극) 2개 + 그 사이에서
// 튀는 노란 번개 스파크. 방망이와 달리 대각선이 아니라 수평(그립 왼쪽, 프롱 오른쪽)으로 그린다 —
// STATIC 카테고리는 방망이 전용 캡슐 판정을 안 타고 그냥 사각 판정을 쓰므로 baked 회전이 필요 없다.
export function createTaserCanvas(size) {
  const bodyColor = '#2b2b2b';
  const bodyStrokeColor = '#111111';
  const prongColor = '#c9ced3';
  const sparkColor = '#ffe066';

  const canvas = createCanvas(size);
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;

  const bodyWidth = size * 0.5;
  const bodyHeight = size * 0.22;
  const bodyLeft = cx - size * 0.32;
  const gripWidth = size * 0.14;
  const gripHeight = size * 0.32;
  const prongLength = size * 0.16;
  const prongHalfWidth = size * 0.03;
  const prongGap = size * 0.14;

  // 손잡이(그립) — 몸체 아래로 튀어나온 부분
  ctx.fillStyle = bodyColor;
  ctx.fillRect(bodyLeft, cy, gripWidth, gripHeight);

  // 몸체(본체)
  ctx.fillStyle = bodyColor;
  ctx.strokeStyle = bodyStrokeColor;
  ctx.lineWidth = Math.max(1, size * 0.015);
  ctx.fillRect(bodyLeft, cy - bodyHeight / 2, bodyWidth, bodyHeight);
  ctx.strokeRect(bodyLeft, cy - bodyHeight / 2, bodyWidth, bodyHeight);

  // 전극(prong) 2개 — 몸체 오른쪽 끝에서 앞으로 뻗은 얇은 은색 막대
  const prongStartX = bodyLeft + bodyWidth;
  ctx.fillStyle = prongColor;
  ctx.fillRect(prongStartX, cy - prongGap / 2 - prongHalfWidth, prongLength, prongHalfWidth * 2);
  ctx.fillRect(prongStartX, cy + prongGap / 2 - prongHalfWidth, prongLength, prongHalfWidth * 2);

  // 두 전극 사이에서 튀는 지그재그 스파크
  const sparkX = prongStartX + prongLength;
  ctx.strokeStyle = sparkColor;
  ctx.lineWidth = Math.max(1, size * 0.025);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(sparkX, cy - prongGap / 2);
  ctx.lineTo(sparkX + prongLength * 0.5, cy - prongGap * 0.15);
  ctx.lineTo(sparkX, cy + prongGap * 0.15);
  ctx.lineTo(sparkX + prongLength * 0.5, cy + prongGap / 2);
  ctx.stroke();

  return canvas;
}

// 휴대형 무기 네 번째 디자인: 쓰다듬는 손. 손바닥(사각) + 손가락 4개 + 엄지, 전부 각진 블록으로
// 그려서 다른 무기들의 픽셀풍 톤과 맞춘다. STATIC 카테고리라 방망이 캡슐 판정 없이 사각 판정만 쓴다.
export function createHandCanvas(size) {
  const skinColor = '#f0b892';
  const skinStroke = '#c98a5e';

  const canvas = createCanvas(size);
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;

  ctx.fillStyle = skinColor;
  ctx.strokeStyle = skinStroke;
  ctx.lineWidth = Math.max(1, size * 0.02);

  // 손바닥
  const palmWidth = size * 0.5;
  const palmHeight = size * 0.4;
  const palmLeft = cx - palmWidth / 2;
  const palmTop = cy - palmHeight * 0.2;
  ctx.fillRect(palmLeft, palmTop, palmWidth, palmHeight);
  ctx.strokeRect(palmLeft, palmTop, palmWidth, palmHeight);

  // 손가락 4개 — 손바닥 위쪽 가장자리에 나란히 붙은 짧은 막대
  const fingerCount = 4;
  const fingerWidth = (palmWidth / fingerCount) * 0.65;
  const fingerHeight = size * 0.24;
  const slot = palmWidth / fingerCount;
  for (let i = 0; i < fingerCount; i += 1) {
    const fx = palmLeft + slot * i + (slot - fingerWidth) / 2;
    const fy = palmTop - fingerHeight + size * 0.03;
    ctx.fillRect(fx, fy, fingerWidth, fingerHeight);
    ctx.strokeRect(fx, fy, fingerWidth, fingerHeight);
  }

  // 엄지 — 손바닥 옆으로 튀어나온 짧은 막대
  const thumbWidth = size * 0.22;
  const thumbHeight = size * 0.16;
  const thumbX = palmLeft - thumbWidth + size * 0.05;
  const thumbY = palmTop + palmHeight * 0.15;
  ctx.fillRect(thumbX, thumbY, thumbWidth, thumbHeight);
  ctx.strokeRect(thumbX, thumbY, thumbWidth, thumbHeight);

  return canvas;
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
