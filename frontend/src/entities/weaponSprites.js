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
