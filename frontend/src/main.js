import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import GameScene from './scenes/GameScene.js';
import { onPause } from './vscodeBridge.js';

// webview에서 devtools 콘솔에 접근하기 번거로운 경우를 위한 임시 진단 장치 —
// 원인 확인되면 지워도 된다. 캔버스 자리에 에러 스택을 그대로 찍는다.
function showFatalError(err) {
  const el = document.getElementById('game-container');
  if (!el) return;
  const message = (err && err.stack) || (err && err.message) || String(err);
  el.innerHTML = `<pre style="color:#ff6b6b;background:#111;padding:16px;margin:0;white-space:pre-wrap;font-size:13px;">${message}</pre>`;
}
window.addEventListener('error', (e) => showFatalError(e.error || e.message));
window.addEventListener('unhandledrejection', (e) => showFatalError(e.reason));

const config = {
  // WebGL은 VSCode webview(Electron)처럼 GPU 가속이 제한된 환경에서 프레임버퍼 생성이
  // 실패해 렌더러가 통째로 죽는 경우가 있다 — 이 게임은 스프라이트/캔버스 텍스처뿐이라
  // WebGL이 굳이 필요 없으므로 Canvas 렌더러를 강제해 그런 환경 의존성을 없앤다.
  type: Phaser.CANVAS,
  width: 800,
  height: 600,
  parent: 'game-stage',
  backgroundColor: '#222222',
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  scene: [BootScene, GameScene],
};

try {
  window.__game = new Phaser.Game(config);
} catch (err) {
  showFatalError(err);
}

// scene.pause()만으로는 클릭 자체가 안 막힐 수 있어 input.enabled도 같이 꺼야
// 정지 중 드래그로 데미지가 들어가거나 서버 요청이 트리거되지 않는다 (CLAUDE.md 불변 조건).
onPause((paused) => {
  const game = window.__game;
  if (paused) {
    game.scene.pause('GameScene');
    game.input.enabled = false;
  } else {
    game.scene.resume('GameScene');
    game.input.enabled = true;
  }

  const overlay = document.getElementById('pause-overlay');
  if (overlay) overlay.style.display = paused ? 'flex' : 'none';
});
