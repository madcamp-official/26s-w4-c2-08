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

// "착한 손"(쓰다듬기, 힐링)과 "나쁜 손"(싸대기, 데미지) 한 쌍 — 모양(펼친 손바닥)은 똑같이 두고
// 색만 살구색/붉은색으로 구분한다. 나쁜 손도 주먹이 아니라 똑같이 편 손으로 찰싹 때리는 손이다.

// 손바닥(사각) + 손가락 4개 + 엄지, 전부 각진 블록으로 그려서 다른 무기들의 픽셀풍 톤과 맞춘다.
// STATIC 카테고리라 방망이 캡슐 판정 없이 사각 판정만 쓴다. colors로 착한/나쁜 손 색만 바꿔 재사용한다.
export function createHandCanvas(size, { skinColor = '#f0b892', skinStroke = '#c98a5e' } = {}) {
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

// 휴대형 무기 다섯 번째 디자인: 키보드. 회색 본체 사각형 위에 작은 키캡 격자를 그린다.
// STATIC 카테고리라 방망이 캡슐 판정 없이 사각 판정만 쓴다 — 전기충격기/손과 같은 방식.
export function createKeyboardCanvas(size) {
  const bodyColor = '#4a4d52';
  const bodyStroke = '#2b2d30';
  const keyColor = '#d7dce0';
  const keyStroke = '#9aa0a6';

  const canvas = createCanvas(size);
  const ctx = canvas.getContext('2d');

  const bodyWidth = size * 0.8;
  const bodyHeight = size * 0.5;
  const bodyLeft = (size - bodyWidth) / 2;
  const bodyTop = (size - bodyHeight) / 2;

  ctx.fillStyle = bodyColor;
  ctx.strokeStyle = bodyStroke;
  ctx.lineWidth = Math.max(1, size * 0.015);
  ctx.fillRect(bodyLeft, bodyTop, bodyWidth, bodyHeight);
  ctx.strokeRect(bodyLeft, bodyTop, bodyWidth, bodyHeight);

  // 키캡 격자 — 본체 안쪽 여백을 두고 촘촘히 배치
  const pad = size * 0.06;
  const cols = 7;
  const rows = 3;
  const gridWidth = bodyWidth - pad * 2;
  const gridHeight = bodyHeight - pad * 2;
  const keyGap = size * 0.015;
  const keyWidth = (gridWidth - keyGap * (cols - 1)) / cols;
  const keyHeight = (gridHeight - keyGap * (rows - 1)) / rows;

  ctx.fillStyle = keyColor;
  ctx.strokeStyle = keyStroke;
  ctx.lineWidth = Math.max(1, size * 0.008);
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const kx = bodyLeft + pad + c * (keyWidth + keyGap);
      const ky = bodyTop + pad + r * (keyHeight + keyGap);
      ctx.fillRect(kx, ky, keyWidth, keyHeight);
      ctx.strokeRect(kx, ky, keyWidth, keyHeight);
    }
  }

  return canvas;
}

// 휴대형 무기 여섯 번째 디자인: 확성기(메가폰). 손잡이 + 좁은 목에서 넓어지는 나팔 몸통 + 입구 앞
// 소리 파동 호선 2개. STATIC 카테고리라 방망이 캡슐 판정 없이 사각 판정만 쓴다.
export function createMegaphoneCanvas(size) {
  const bodyColor = '#e0a63f';
  const bodyStroke = '#966c1f';
  const gripColor = '#2b2b2b';
  const waveColor = '#e0a63f';

  const canvas = createCanvas(size);
  const ctx = canvas.getContext('2d');
  const cy = size / 2;

  const throatX = size * 0.28;
  const bellX = size * 0.62;
  const throatHalfWidth = size * 0.08;
  const bellHalfWidth = size * 0.26;

  // 나팔 몸통 — 목에서 입구로 갈수록 넓어지는 사다리꼴
  ctx.fillStyle = bodyColor;
  ctx.strokeStyle = bodyStroke;
  ctx.lineWidth = Math.max(1, size * 0.015);
  ctx.beginPath();
  ctx.moveTo(throatX, cy - throatHalfWidth);
  ctx.lineTo(bellX, cy - bellHalfWidth);
  ctx.lineTo(bellX, cy + bellHalfWidth);
  ctx.lineTo(throatX, cy + throatHalfWidth);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 손잡이 — 목 아래로 짧게 튀어나온 막대
  const gripWidth = size * 0.1;
  const gripHeight = size * 0.22;
  ctx.fillStyle = gripColor;
  ctx.fillRect(throatX - gripWidth / 2, cy + throatHalfWidth, gripWidth, gripHeight);

  // 입구 앞으로 퍼지는 소리 파동 호선 2개
  ctx.strokeStyle = waveColor;
  ctx.lineWidth = Math.max(1, size * 0.025);
  ctx.lineCap = 'round';
  [size * 0.08, size * 0.16].forEach((offset) => {
    ctx.beginPath();
    ctx.arc(bellX, cy, bellHalfWidth * 0.75 + offset, -Math.PI * 0.3, Math.PI * 0.3);
    ctx.stroke();
  });

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

// 투척형 무기 세 번째/네 번째 디자인: 권총/기관총. 총알(투사체)이 뾰족한 방향을 향해야 자연스러워서
// 다트와 같은 규칙으로 각도 0(오른쪽)을 바라보게 그린다 — WeaponManager가 rotateToTravel로 그대로 회전시킨다.

// 권총: 짧은 총열 + 아래로 내려온 손잡이 + 방아쇠울(고리).
export function createPistolCanvas(size) {
  const bodyColor = '#3a3d42';
  const bodyStroke = '#1c1e21';

  const canvas = createCanvas(size);
  const ctx = canvas.getContext('2d');
  const cy = size / 2;

  ctx.fillStyle = bodyColor;
  ctx.strokeStyle = bodyStroke;
  ctx.lineWidth = Math.max(1, size * 0.015);

  // 총열(슬라이드)
  const barrelLeft = size * 0.18;
  const barrelRight = size * 0.86;
  const barrelHalfH = size * 0.09;
  ctx.fillRect(barrelLeft, cy - barrelHalfH, barrelRight - barrelLeft, barrelHalfH * 2);
  ctx.strokeRect(barrelLeft, cy - barrelHalfH, barrelRight - barrelLeft, barrelHalfH * 2);

  // 손잡이 — 총열 뒤쪽(왼쪽)에서 아래로 내려온 사각
  const gripWidth = size * 0.18;
  const gripHeight = size * 0.32;
  const gripX = barrelLeft + size * 0.02;
  const gripY = cy + barrelHalfH;
  ctx.fillRect(gripX, gripY, gripWidth, gripHeight);
  ctx.strokeRect(gripX, gripY, gripWidth, gripHeight);

  // 방아쇠울 — 손잡이와 총열 사이 작은 고리
  ctx.beginPath();
  ctx.arc(gripX + gripWidth + size * 0.05, gripY + size * 0.03, size * 0.055, 0, Math.PI * 2);
  ctx.stroke();

  return canvas;
}

// 기관총: 권총보다 총열이 길고, 뒤쪽에 개머리판 + 몸통 아래 탄창이 붙는다.
export function createMachineGunCanvas(size) {
  const bodyColor = '#4a4d52';
  const bodyStroke = '#25272a';

  const canvas = createCanvas(size);
  const ctx = canvas.getContext('2d');
  const cy = size / 2;

  ctx.fillStyle = bodyColor;
  ctx.strokeStyle = bodyStroke;
  ctx.lineWidth = Math.max(1, size * 0.015);

  // 총열 — 얇고 길게, 오른쪽 끝까지
  const barrelHalfH = size * 0.05;
  const barrelLeft = size * 0.42;
  const barrelRight = size * 0.92;
  ctx.fillRect(barrelLeft, cy - barrelHalfH, barrelRight - barrelLeft, barrelHalfH * 2);
  ctx.strokeRect(barrelLeft, cy - barrelHalfH, barrelRight - barrelLeft, barrelHalfH * 2);

  // 몸통(리시버) — 총열보다 두껍고 짧게
  const bodyHalfH = size * 0.1;
  const bodyLeft = size * 0.16;
  const bodyRight = barrelLeft + size * 0.05;
  ctx.fillRect(bodyLeft, cy - bodyHalfH, bodyRight - bodyLeft, bodyHalfH * 2);
  ctx.strokeRect(bodyLeft, cy - bodyHalfH, bodyRight - bodyLeft, bodyHalfH * 2);

  // 개머리판 — 몸통 뒤쪽(왼쪽)에서 뒤로 뻗은 낮은 사각
  const stockHalfH = size * 0.05;
  const stockLeft = size * 0.02;
  ctx.fillRect(stockLeft, cy - stockHalfH * 0.3, bodyLeft - stockLeft, stockHalfH * 2);
  ctx.strokeRect(stockLeft, cy - stockHalfH * 0.3, bodyLeft - stockLeft, stockHalfH * 2);

  // 탄창 — 몸통 아래로 늘어진 사각
  const magWidth = size * 0.12;
  const magHeight = size * 0.26;
  const magX = bodyLeft + size * 0.1;
  ctx.fillRect(magX, cy + bodyHalfH, magWidth, magHeight);
  ctx.strokeRect(magX, cy + bodyHalfH, magWidth, magHeight);

  return canvas;
}

// 산탄총: 위쪽 총열 + 아래쪽 펌프 손잡이(foregrip) + 뒤쪽 개머리판. 기관총보다 총열이 굵고 짧다.
export function createShotgunCanvas(size) {
  const bodyColor = '#5a3a22';
  const bodyStroke = '#3a2414';
  const metalColor = '#3a3d42';
  const metalStroke = '#1c1e21';

  const canvas = createCanvas(size);
  const ctx = canvas.getContext('2d');
  const cy = size / 2;

  // 총열 — 굵고 짧게
  const barrelHalfH = size * 0.07;
  const barrelLeft = size * 0.3;
  const barrelRight = size * 0.92;
  ctx.fillStyle = metalColor;
  ctx.strokeStyle = metalStroke;
  ctx.lineWidth = Math.max(1, size * 0.015);
  ctx.fillRect(barrelLeft, cy - barrelHalfH, barrelRight - barrelLeft, barrelHalfH * 2);
  ctx.strokeRect(barrelLeft, cy - barrelHalfH, barrelRight - barrelLeft, barrelHalfH * 2);

  // 몸통(리시버)
  const bodyHalfH = size * 0.11;
  const bodyLeft = size * 0.2;
  const bodyRight = barrelLeft + size * 0.04;
  ctx.fillStyle = bodyColor;
  ctx.strokeStyle = bodyStroke;
  ctx.fillRect(bodyLeft, cy - bodyHalfH, bodyRight - bodyLeft, bodyHalfH * 2);
  ctx.strokeRect(bodyLeft, cy - bodyHalfH, bodyRight - bodyLeft, bodyHalfH * 2);

  // 개머리판 — 몸통 뒤로 낮게 뻗은 사각
  const stockHalfH = size * 0.06;
  const stockLeft = size * 0.04;
  ctx.fillRect(stockLeft, cy - stockHalfH * 0.4, bodyLeft - stockLeft, stockHalfH * 2);
  ctx.strokeRect(stockLeft, cy - stockHalfH * 0.4, bodyLeft - stockLeft, stockHalfH * 2);

  // 펌프 손잡이 — 총열 아래 매달린 짧은 사각
  const pumpWidth = size * 0.16;
  const pumpHeight = size * 0.09;
  const pumpX = barrelLeft + size * 0.08;
  ctx.fillStyle = metalColor;
  ctx.strokeStyle = metalStroke;
  ctx.fillRect(pumpX, cy + barrelHalfH, pumpWidth, pumpHeight);
  ctx.strokeRect(pumpX, cy + barrelHalfH, pumpWidth, pumpHeight);

  return canvas;
}

// 저격총: 얇고 긴 총열 + 위에 얹힌 스코프(원통+렌즈) + 뒤쪽 개머리판 + 아래쪽 그립.
export function createSniperCanvas(size) {
  const bodyColor = '#2b2d30';
  const bodyStroke = '#111214';
  const scopeColor = '#1c1e21';
  const lensColor = '#8fd6ff';

  const canvas = createCanvas(size);
  const ctx = canvas.getContext('2d');
  const cy = size / 2;

  // 총열 — 셋 중 가장 얇고 길게
  const barrelHalfH = size * 0.035;
  const barrelLeft = size * 0.34;
  const barrelRight = size * 0.95;
  ctx.fillStyle = bodyColor;
  ctx.strokeStyle = bodyStroke;
  ctx.lineWidth = Math.max(1, size * 0.012);
  ctx.fillRect(barrelLeft, cy - barrelHalfH, barrelRight - barrelLeft, barrelHalfH * 2);
  ctx.strokeRect(barrelLeft, cy - barrelHalfH, barrelRight - barrelLeft, barrelHalfH * 2);

  // 몸통 + 개머리판
  const bodyHalfH = size * 0.065;
  const bodyLeft = size * 0.06;
  const bodyRight = barrelLeft + size * 0.03;
  ctx.fillRect(bodyLeft, cy - bodyHalfH, bodyRight - bodyLeft, bodyHalfH * 2);
  ctx.strokeRect(bodyLeft, cy - bodyHalfH, bodyRight - bodyLeft, bodyHalfH * 2);

  // 그립 — 몸통 아래로 짧게 내려온 사각
  const gripWidth = size * 0.09;
  const gripHeight = size * 0.16;
  ctx.fillRect(bodyLeft + size * 0.03, cy + bodyHalfH, gripWidth, gripHeight);
  ctx.strokeRect(bodyLeft + size * 0.03, cy + bodyHalfH, gripWidth, gripHeight);

  // 스코프 — 몸통 위에 얹힌 원통(사각) + 앞뒤 렌즈(작은 원)
  const scopeWidth = size * 0.22;
  const scopeHeight = size * 0.06;
  const scopeX = bodyLeft + size * 0.14;
  const scopeY = cy - bodyHalfH - scopeHeight;
  ctx.fillStyle = scopeColor;
  ctx.strokeStyle = bodyStroke;
  ctx.fillRect(scopeX, scopeY, scopeWidth, scopeHeight);
  ctx.strokeRect(scopeX, scopeY, scopeWidth, scopeHeight);

  ctx.fillStyle = lensColor;
  ctx.beginPath();
  ctx.arc(scopeX + scopeWidth, scopeY + scopeHeight / 2, scopeHeight * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(scopeX, scopeY + scopeHeight / 2, scopeHeight * 0.4, 0, Math.PI * 2);
  ctx.fill();

  return canvas;
}

// 리볼버: 권총과 비슷하지만 총열과 손잡이 사이에 탄창 대신 회전 실린더(원통)가 튀어나와 있다.
export function createRevolverCanvas(size) {
  const bodyColor = '#3a3d42';
  const bodyStroke = '#1c1e21';
  const cylinderColor = '#4a4d52';

  const canvas = createCanvas(size);
  const ctx = canvas.getContext('2d');
  const cy = size / 2;

  ctx.fillStyle = bodyColor;
  ctx.strokeStyle = bodyStroke;
  ctx.lineWidth = Math.max(1, size * 0.015);

  // 총열 — 권총보다 짧게
  const barrelLeft = size * 0.44;
  const barrelRight = size * 0.86;
  const barrelHalfH = size * 0.06;
  ctx.fillRect(barrelLeft, cy - barrelHalfH, barrelRight - barrelLeft, barrelHalfH * 2);
  ctx.strokeRect(barrelLeft, cy - barrelHalfH, barrelRight - barrelLeft, barrelHalfH * 2);

  // 실린더 — 총열 뒤 튀어나온 원
  const cylinderRadius = size * 0.13;
  const cylinderX = size * 0.36;
  ctx.fillStyle = cylinderColor;
  ctx.beginPath();
  ctx.arc(cylinderX, cy, cylinderRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // 실린더 약실 자국(작은 점 4개)으로 회전 실린더 느낌
  ctx.fillStyle = bodyStroke;
  [-0.55, -0.15, 0.15, 0.55].forEach((t) => {
    ctx.beginPath();
    ctx.arc(cylinderX + Math.cos(t * Math.PI) * cylinderRadius * 0.55, cy + Math.sin(t * Math.PI) * cylinderRadius * 0.55, size * 0.02, 0, Math.PI * 2);
    ctx.fill();
  });

  // 손잡이 — 실린더 아래로 비스듬히 내려온 사각
  const gripWidth = size * 0.16;
  const gripHeight = size * 0.3;
  const gripX = cylinderX - gripWidth * 0.3;
  const gripY = cy + cylinderRadius * 0.5;
  ctx.fillStyle = bodyColor;
  ctx.fillRect(gripX, gripY, gripWidth, gripHeight);
  ctx.strokeRect(gripX, gripY, gripWidth, gripHeight);

  return canvas;
}

// 산탄총 펠릿(투사체) — 작고 동그란 점. 무기마다 색만 다르게 재사용하는 총알(createBulletCanvas)과
// 달리 방향성이 없는 둥근 실루엣이라 rotateToTravel 없이도 어색하지 않다.
export function createPelletCanvas(size, color) {
  const canvas = createCanvas(size);
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.4, 0, Math.PI * 2);
  ctx.fill();

  return canvas;
}

// 총알 — 뒤는 평평하고 앞은 둥글게 모이는 실루엣. 무기마다 색만 바꿔서 재사용(권총=은색, 기관총=놋쇠색).
export function createBulletCanvas(size, color) {
  const canvas = createCanvas(size);
  const ctx = canvas.getContext('2d');
  const cy = size / 2;
  const startX = size * 0.28;
  const len = size * 0.46;
  const halfW = size * 0.12;

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(startX, cy - halfW);
  ctx.lineTo(startX + len * 0.65, cy - halfW);
  ctx.quadraticCurveTo(startX + len, cy - halfW * 0.3, startX + len, cy);
  ctx.quadraticCurveTo(startX + len, cy + halfW * 0.3, startX + len * 0.65, cy + halfW);
  ctx.lineTo(startX, cy + halfW);
  ctx.closePath();
  ctx.fill();

  return canvas;
}

// 확성기가 쏘는 소리 파동 투사체. 방향에 상관없이 똑같이 보여야 해서(rotateToTravel 불필요) 동심원
// 3개로만 그린다 — 날아가는 동안에도, 어느 각도로 발사돼도 항상 같은 모양으로 보인다.
export function createSoundWaveProjectileCanvas(size, color) {
  const canvas = createCanvas(size);
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;

  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  [0.16, 0.28, 0.4].forEach((r, i) => {
    ctx.lineWidth = Math.max(1, size * (0.1 - i * 0.02));
    ctx.beginPath();
    ctx.arc(cx, cy, size * r, 0, Math.PI * 2);
    ctx.stroke();
  });

  return canvas;
}

// 3차 베지어 곡선 위의 한 점(t=0~1) 좌표.
function cubicBezierPoint(p0, p1, p2, p3, t) {
  const mt = 1 - t;
  return {
    x: mt ** 3 * p0.x + 3 * mt ** 2 * t * p1.x + 3 * mt * t ** 2 * p2.x + t ** 3 * p3.x,
    y: mt ** 3 * p0.y + 3 * mt ** 2 * t * p1.y + 3 * mt * t ** 2 * p2.y + t ** 3 * p3.y,
  };
}

// 채찍: 왼쪽 아래 손잡이 + 손잡이에서 부드럽게 휘어 올라가 끝으로 갈수록 가늘어지는 채찍 몸통.
// 지그재그 직선 이어붙이기 대신 3차 베지어 곡선을 촘촘히 샘플링해서 매끄러운 곡선으로 그리고,
// 구간마다 lineWidth를 조금씩 줄여가며 그 위를 따라 그려서 자연스러운 테이퍼를 흉내낸다.
// STATIC 카테고리라 방망이 캡슐 판정 없이 사각 판정만 쓴다.
export function createWhipCanvas(size) {
  const handleColor = '#5a3a22';
  const handleStroke = '#3a2414';
  const cordColor = '#8a5a3a';

  const canvas = createCanvas(size);
  const ctx = canvas.getContext('2d');

  // 손잡이
  const handleWidth = size * 0.14;
  const handleHeight = size * 0.28;
  const handleX = size * 0.12;
  const handleY = size * 0.6;
  ctx.fillStyle = handleColor;
  ctx.strokeStyle = handleStroke;
  ctx.lineWidth = Math.max(1, size * 0.02);
  ctx.fillRect(handleX, handleY, handleWidth, handleHeight);
  ctx.strokeRect(handleX, handleY, handleWidth, handleHeight);

  // 손잡이 끝에서 위로 크게 휘었다가 끝이 살짝 말리는(채찍 특유의) 곡선
  const p0 = { x: handleX + handleWidth / 2, y: handleY };
  const p1 = { x: size * 0.12, y: size * 0.18 };
  const p2 = { x: size * 0.72, y: size * 0.04 };
  const p3 = { x: size * 0.94, y: size * 0.34 };

  const steps = 28;
  ctx.strokeStyle = cordColor;
  ctx.lineCap = 'round';
  let prev = p0;
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    const point = cubicBezierPoint(p0, p1, p2, p3, t);
    ctx.lineWidth = size * (0.09 * (1 - t) + 0.012 * t);
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    prev = point;
  }

  return canvas;
}

// 대나무 회초리: 손잡이(천으로 감은 그립)에서 끝으로 갈수록 가늘어지는 곧은 대나무 줄기 + 마디(knot) 3개.
// 채찍(곡선 코드)과 달리 곧은 직선 실루엣이라 사다리꼴 하나로 그린다. STATIC 카테고리라 방망이 캡슐
// 판정 없이 사각 판정만 쓴다 — 다른 STATIC 무기와 같은 방식.
export function createBambooCaneCanvas(size) {
  const caneColor = '#cddc7a';
  const caneStroke = '#8a9c4a';
  const gripColor = '#5a3a22';
  const gripStroke = '#3a2414';

  const canvas = createCanvas(size);
  const ctx = canvas.getContext('2d');

  const startX = size * 0.16; // 손잡이 쪽 (그립 끝)
  const startY = size * 0.82;
  const endX = size * 0.88; // 회초리 끝 (가늘어지는 쪽)
  const endY = size * 0.14;
  const baseHalfWidth = size * 0.035;
  const tipHalfWidth = size * 0.014;

  const angle = Math.atan2(endY - startY, endX - startX);
  const nx = Math.cos(angle + Math.PI / 2);
  const ny = Math.sin(angle + Math.PI / 2);

  // 줄기 — 손잡이 쪽은 두껍고 끝으로 갈수록 가늘어지는 사다리꼴 실루엣
  ctx.fillStyle = caneColor;
  ctx.strokeStyle = caneStroke;
  ctx.lineWidth = Math.max(1, size * 0.01);
  ctx.beginPath();
  ctx.moveTo(startX + nx * baseHalfWidth, startY + ny * baseHalfWidth);
  ctx.lineTo(endX + nx * tipHalfWidth, endY + ny * tipHalfWidth);
  ctx.lineTo(endX - nx * tipHalfWidth, endY - ny * tipHalfWidth);
  ctx.lineTo(startX - nx * baseHalfWidth, startY - ny * baseHalfWidth);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 마디(knot) 3개 — 줄기를 가로지르는 짧은 밴드로 대나무 특유의 마디를 표현
  ctx.strokeStyle = caneStroke;
  ctx.lineWidth = Math.max(1, size * 0.018);
  [0.32, 0.56, 0.78].forEach((t) => {
    const kx = startX + (endX - startX) * t;
    const ky = startY + (endY - startY) * t;
    const halfWidth = (baseHalfWidth + (tipHalfWidth - baseHalfWidth) * t) * 1.3;
    ctx.beginPath();
    ctx.moveTo(kx + nx * halfWidth, ky + ny * halfWidth);
    ctx.lineTo(kx - nx * halfWidth, ky - ny * halfWidth);
    ctx.stroke();
  });

  // 손잡이 — 줄기 아래쪽 끝을 감싼 천 그립(작은 사각)
  const gripLength = size * 0.16;
  const gripHalfWidth = baseHalfWidth * 1.6;
  const gripBackX = startX - Math.cos(angle) * gripLength;
  const gripBackY = startY - Math.sin(angle) * gripLength;
  ctx.fillStyle = gripColor;
  ctx.strokeStyle = gripStroke;
  ctx.lineWidth = Math.max(1, size * 0.012);
  ctx.beginPath();
  ctx.moveTo(startX + nx * gripHalfWidth, startY + ny * gripHalfWidth);
  ctx.lineTo(gripBackX + nx * gripHalfWidth, gripBackY + ny * gripHalfWidth);
  ctx.lineTo(gripBackX - nx * gripHalfWidth, gripBackY - ny * gripHalfWidth);
  ctx.lineTo(startX - nx * gripHalfWidth, startY - ny * gripHalfWidth);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  return canvas;
}

// 말랑이: 살짝 눌린 타원 몸통 + 뭉툭한 발 2개 + 점 눈·볼터치·웃는 입이 있는 마이腦풍 말랑말랑한 장난감.
// STATIC 카테고리라 방망이 캡슐 판정 없이 사각 판정만 쓴다. WeaponManager.playSquish(찌부 모션)과 짝을 이룬다.
export function createSquishyToyCanvas(size) {
  const bodyColor = '#b8e8d8';
  const bodyStroke = '#7fc9b0';
  const faceColor = '#2b2d30';
  const cheekColor = '#ffb6c1';

  const canvas = createCanvas(size);
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const cy = size * 0.54;

  // 몸통 — 살짝 눌린 타원
  const bodyRadiusX = size * 0.36;
  const bodyRadiusY = size * 0.3;
  ctx.fillStyle = bodyColor;
  ctx.strokeStyle = bodyStroke;
  ctx.lineWidth = Math.max(1, size * 0.02);
  ctx.beginPath();
  ctx.ellipse(cx, cy, bodyRadiusX, bodyRadiusY, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 아래쪽 뭉툭한 발 2개
  const footRadius = size * 0.09;
  [-1, 1].forEach((side) => {
    ctx.beginPath();
    ctx.ellipse(cx + side * bodyRadiusX * 0.45, cy + bodyRadiusY * 0.75, footRadius, footRadius * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });

  // 눈 2개(점)
  ctx.fillStyle = faceColor;
  const eyeOffsetX = size * 0.13;
  const eyeY = cy - size * 0.04;
  [-1, 1].forEach((side) => {
    ctx.beginPath();
    ctx.arc(cx + side * eyeOffsetX, eyeY, size * 0.025, 0, Math.PI * 2);
    ctx.fill();
  });

  // 웃는 입
  ctx.strokeStyle = faceColor;
  ctx.lineWidth = Math.max(1, size * 0.015);
  ctx.beginPath();
  ctx.arc(cx, eyeY + size * 0.05, size * 0.07, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();

  // 볼터치 2개
  ctx.fillStyle = cheekColor;
  [-1, 1].forEach((side) => {
    ctx.beginPath();
    ctx.ellipse(cx + side * eyeOffsetX * 1.7, eyeY + size * 0.06, size * 0.035, size * 0.02, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  return canvas;
}

// 개발자(디버거 무기): 노트북 앞에 앉은 사람 — 머리(원) + 몸통(사각) + 열린 노트북(베이스+화면).
// "맞으면 잠깐 못 움직이게 고정"하는 효과(freezesBoss, Boss.freeze)를 쓰는 무기라 개발자 본인을
// 아이콘으로 삼았다. STATIC 카테고리라 방망이 캡슐 판정 없이 사각 판정만 쓴다.
export function createDeveloperCanvas(size) {
  const skinColor = '#f0b892';
  const skinStroke = '#c98a5e';
  const shirtColor = '#3f7fe0';
  const shirtStroke = '#274f8f';
  const laptopColor = '#4a4d52';
  const laptopStroke = '#2b2d30';
  const screenColor = '#8fd6ff';

  const canvas = createCanvas(size);
  const ctx = canvas.getContext('2d');
  const cx = size / 2;

  // 몸(셔츠)
  const bodyWidth = size * 0.5;
  const bodyHeight = size * 0.32;
  const bodyTop = size * 0.42;
  ctx.fillStyle = shirtColor;
  ctx.strokeStyle = shirtStroke;
  ctx.lineWidth = Math.max(1, size * 0.02);
  ctx.fillRect(cx - bodyWidth / 2, bodyTop, bodyWidth, bodyHeight);
  ctx.strokeRect(cx - bodyWidth / 2, bodyTop, bodyWidth, bodyHeight);

  // 머리
  const headRadius = size * 0.16;
  const headCenterY = size * 0.24;
  ctx.fillStyle = skinColor;
  ctx.strokeStyle = skinStroke;
  ctx.beginPath();
  ctx.arc(cx, headCenterY, headRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 노트북 — 베이스(키보드, 평평한 사각) + 화면(뒤로 기운 사다리꼴)
  const laptopWidth = size * 0.42;
  const baseHeight = size * 0.05;
  const baseY = bodyTop + bodyHeight - size * 0.02;
  const baseX = cx - laptopWidth / 2;
  ctx.fillStyle = laptopColor;
  ctx.strokeStyle = laptopStroke;
  ctx.fillRect(baseX, baseY, laptopWidth, baseHeight);
  ctx.strokeRect(baseX, baseY, laptopWidth, baseHeight);

  const screenHeight = size * 0.22;
  const screenTopInset = size * 0.05;
  ctx.beginPath();
  ctx.moveTo(baseX, baseY);
  ctx.lineTo(baseX + screenTopInset, baseY - screenHeight);
  ctx.lineTo(baseX + laptopWidth - screenTopInset, baseY - screenHeight);
  ctx.lineTo(baseX + laptopWidth, baseY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 화면 안쪽 밝은 부분(코드 화면 느낌)
  ctx.fillStyle = screenColor;
  const inset = size * 0.03;
  ctx.beginPath();
  ctx.moveTo(baseX + inset, baseY - inset);
  ctx.lineTo(baseX + screenTopInset + inset * 0.6, baseY - screenHeight + inset);
  ctx.lineTo(baseX + laptopWidth - screenTopInset - inset * 0.6, baseY - screenHeight + inset);
  ctx.lineTo(baseX + laptopWidth - inset, baseY - inset);
  ctx.closePath();
  ctx.fill();

  return canvas;
}
