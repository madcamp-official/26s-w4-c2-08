import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import GameScene from './scenes/GameScene.js';

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
  // webview가 다른 에디터/터미널 클릭으로 포커스만 잃어도(iframe blur) Phaser가
  // 기본적으로 재생 중인 사운드를 멈추므로, 포커스와 무관하게 계속 재생되게 끈다.
  audio: {
    pauseOnBlur: false,
  },
  scene: [BootScene, GameScene],
};

// Canvas 렌더러는 fillText 시점에 폰트가 이미 로드돼 있어야 한다 — @font-face만 선언해두면
// 첫 프레임엔 아직 안 받아져 있어 폴백 폰트로 그려질 수 있으므로 미리 받아둔다.
// 실패해도 UI_FONT_FAMILY의 시스템 폰트 폴백으로 게임은 정상 동작해야 하므로 그냥 무시한다.
async function preloadFonts() {
  try {
    await Promise.all([
      document.fonts.load('16px "Galmuri11"'),
      document.fonts.load('bold 16px "Galmuri11"'),
    ]);
  } catch {
    /* 폰트 로드 실패 시 시스템 폰트로 폴백 */
  }
}

// pauseOnBlur: false로 Phaser 자체의 블러 시 정지 로직은 껐지만, Chromium이 webview iframe이
// 포커스를 잃은 동안 AudioContext를 자체적으로(브라우저 레벨에서) suspend시키는 경우까지는 못 막는다.
// 게다가 pauseOnBlur를 껐기 때문에 포커스가 돌아와도 Phaser가 자동으로 resume()을 호출하지 않아,
// 한 번 suspend되면 그대로 무음 상태가 유지될 수 있다 — 포커스 복귀 시점마다 직접 resume을 걸어준다.
// suspend되기 직전 재생 중이던 효과음은 그대로 resume하면 화면상 이미 지나간 타격의 소리 꼬리가
// 뜬금없이 이어 나와 위화감이 크다 — 다 짧은 1회성 효과음이라 이어 붙일 가치가 없으므로, resume 전에
// stopAll()로 그 소리는 버리고 그 이후 새로 나는 소리부터 정상 재생되게 한다.
function resumeAudioContext() {
  const sound = window.__game?.sound;
  const context = sound?.context;
  if (context && context.state === 'suspended') {
    sound.stopAll();
    context.resume();
  }
}
window.addEventListener('focus', resumeAudioContext);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') resumeAudioContext();
});

preloadFonts().finally(() => {
  try {
    window.__game = new Phaser.Game(config);
  } catch (err) {
    showFatalError(err);
  }
});
