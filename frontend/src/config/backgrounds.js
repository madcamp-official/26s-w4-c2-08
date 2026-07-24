// 전투 배경은 스프라이트 이미지 대신 800x600 오프스크린 캔버스에 직접 그려서
// Phaser 텍스처로 등록한다 (Graphics만으로는 한글이 아닌 코드/터미널 텍스트를 자유롭게 배치하기 어려움).
// 스타일 선택은 constants.js의 BACKGROUND_STYLE 값으로 한다.
const W = 800;
const H = 600;
const MONO = '"Cascadia Code", "SF Mono", Consolas, "Courier New", monospace';

const ACT_W = 44;
const SIDE_W = 180;
const TAB_H = 34;
const STATUS_H = 24;
const MINI_W = 16;
const CONTENT_X = ACT_W + SIDE_W;

const FILES = ['config/', 'constants.js', 'entities/', 'Boss.js', 'WeaponManager.js', 'systems/', 'CombatSystem.js', 'scenes/', 'GameScene.js'];

const CODE_LINES = [
  [['// boss.js — 최종 결전 로직', 'com']],
  [],
  [['class', 'kw'], [' ', 'plain'], ['Boss', 'type'], [' {', 'punct']],
  [['  constructor', 'func'], ['(hp = ', 'punct'], ['300', 'num'], [') {', 'punct']],
  [['    this', 'kw'], ['.', 'punct'], ['hp', 'prop'], [' = hp;', 'punct']],
  [['    this', 'kw'], ['.', 'punct'], ['rage', 'prop'], [' = ', 'punct'], ['false', 'kw'], [';', 'punct']],
  [['  }', 'punct']],
  [],
  [['  takeDamage', 'func'], ['(amount) {', 'punct']],
  [['    this', 'kw'], ['.', 'punct'], ['hp', 'prop'], [' -= amount;', 'punct']],
  [['    if', 'kw'], [' (this.hp <= ', 'punct'], ['0', 'num'], [') {', 'punct']],
  [['      this', 'kw'], ['.', 'punct'], ['defeat', 'func'], ['();', 'punct']],
  [['    }', 'punct']],
  [['  }', 'punct']],
  [],
  [['  enterRageMode', 'func'], ['() {', 'punct']],
  [['    ', 'plain'], ['// hp 30% 이하일 때 발동', 'com']],
  [['    this', 'kw'], ['.', 'punct'], ['rage', 'prop'], [' = ', 'punct'], ['true', 'kw'], [';', 'punct']],
  [['  }', 'punct']],
  [['}', 'punct']],
];

const DIFF_LINES = [
  { t: '@@ -8,7 +8,11 @@ class Boss {', type: 'hunk' },
  { t: '   takeDamage(amount) {', type: 'ctx' },
  { t: '-    this.hp -= amount;', type: 'del' },
  { t: '+    const reduced = this.rage ? amount * 0.5 : amount;', type: 'add' },
  { t: '+    this.hp -= reduced;', type: 'add' },
  { t: '     if (this.hp <= 0) {', type: 'ctx' },
  { t: '       this.defeat();', type: 'ctx' },
  { t: '     }', type: 'ctx' },
  { t: '+    if (this.hp / this.maxHp < 0.3) {', type: 'add' },
  { t: '+      this.enterRageMode();', type: 'add' },
  { t: '+    }', type: 'add' },
  { t: '   }', type: 'ctx' },
  { t: '}', type: 'ctx' },
];

const TERMINAL_LOG = [
  ['$ node boss_battle.js --seed=0724', '#e6e6e6'],
  ['[BOOT] arena kernel v2.3 loaded', '#5dffa0'],
  ['[BOOT] loading entities/Boss.js ... OK', '#5dffa0'],
  ['[BOOT] loading entities/WeaponManager.js ... OK', '#5dffa0'],
  ['[BOOT] loading systems/CombatSystem.js ... OK', '#5dffa0'],
  ['[SPAWN] Boss "NULL_POINTER" hp=300/300', '#7ee0ff'],
  ['[INFO] rage_threshold=0.30 armor=0', '#7ee0ff'],
  ['[INFO] draw_weapon() unlocked at score>=100', '#7ee0ff'],
  ['[WARN] connection to arena.local unstable', '#ffd866'],
  ['[WARN] retrying handshake... ok', '#ffd866'],
  ['[INFO] listening for drag/drop input...', '#7ee0ff'],
  ['[INFO] hit_cooldown=300ms', '#7ee0ff'],
  ['> summon_boss --hp=300 --rage_threshold=0.3', '#5dffa0'],
  ['> awaiting player input', '#5dffa0'],
];

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawChrome(ctx, pal, opts = {}) {
  ctx.fillStyle = pal.activityBar;
  ctx.fillRect(0, 0, ACT_W, H);
  ctx.fillStyle = pal.activityIcon;
  [26, 76, 126, 176].forEach((y, i) => {
    ctx.globalAlpha = i === 0 ? 1 : 0.45;
    roundRect(ctx, 12, y, 20, 20, 4);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
  ctx.fillStyle = pal.accent;
  ctx.fillRect(0, 10, 3, 30);

  ctx.fillStyle = pal.sidebar;
  ctx.fillRect(ACT_W, 0, SIDE_W, H);
  ctx.font = `12px ${MONO}`;
  let fy = 34;
  FILES.forEach((name) => {
    const isFolder = name.endsWith('/');
    const isActive = name === 'Boss.js';
    if (isActive) {
      ctx.fillStyle = pal.sidebarActiveText;
      ctx.fillRect(ACT_W, fy - 14, SIDE_W, 18);
    }
    ctx.fillStyle = isFolder ? pal.sidebarText : (isActive ? '#e8a33d' : '#7ecbe0');
    ctx.globalAlpha = isFolder ? 0.7 : 0.95;
    ctx.beginPath();
    ctx.arc(ACT_W + 18, fy - 4, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = isActive ? pal.selectionText : pal.sidebarText;
    ctx.fillText(name, ACT_W + 30, fy);
    fy += 22;
  });

  const tabs = opts.tabs || ['Boss.js', 'CombatSystem.js', 'GameScene.js'];
  ctx.fillStyle = pal.tabBarBg;
  ctx.fillRect(CONTENT_X, 0, W - CONTENT_X, TAB_H);
  let tx = CONTENT_X;
  tabs.forEach((label, i) => {
    const tw = 150;
    const active = i === 0;
    ctx.fillStyle = active ? pal.tabActiveBg : pal.tabInactiveBg;
    ctx.fillRect(tx, 0, tw, TAB_H);
    if (active) {
      ctx.fillStyle = pal.accent;
      ctx.fillRect(tx, 0, tw, 2);
    }
    ctx.fillStyle = active ? pal.tabActiveText : pal.tabText;
    ctx.font = `12px ${MONO}`;
    ctx.fillText(label, tx + 14, 21);
    tx += tw;
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.moveTo(tx, 6); ctx.lineTo(tx, TAB_H - 6); ctx.stroke();
  });

  ctx.fillStyle = pal.statusBg;
  ctx.fillRect(0, H - STATUS_H, W, STATUS_H);
  ctx.fillStyle = pal.statusText;
  ctx.font = `11px ${MONO}`;
  ctx.fillText(opts.statusLeft || '⎇ main    ⊘ 0  ⚠ 0', 10, H - 8);
  const right = opts.statusRight || 'UTF-8   LF   JavaScript';
  ctx.fillText(right, W - ctx.measureText(right).width - 12, H - 8);
}

function drawTokenCode(ctx, pal, lines, startY, lineHeight, fontSize) {
  const gutterRight = CONTENT_X + 42;
  const codeX = CONTENT_X + 56;
  ctx.font = `${fontSize}px ${MONO}`;
  ctx.textBaseline = 'alphabetic';
  lines.forEach((line, i) => {
    const y = startY + i * lineHeight;
    ctx.fillStyle = pal.gutterText;
    ctx.textAlign = 'right';
    ctx.fillText(String(i + 1), gutterRight, y);
    ctx.textAlign = 'left';
    let x = codeX;
    line.forEach(([text, role]) => {
      ctx.fillStyle = pal.roles[role] || pal.roles.plain;
      ctx.fillText(text, x, y);
      x += ctx.measureText(text).width;
    });
  });
}

function drawMinimap(ctx, pal, lines) {
  const x = W - MINI_W;
  ctx.fillStyle = pal.minimapBg;
  ctx.fillRect(x, TAB_H, MINI_W, H - TAB_H - STATUS_H);
  lines.forEach((line, i) => {
    let len = 0;
    line.forEach(([t]) => (len += t.length));
    const w = Math.min(MINI_W - 4, len * 1.1);
    if (w <= 0) return;
    ctx.fillStyle = pal.minimapLine;
    ctx.fillRect(x + 2, TAB_H + 6 + i * 3, w, 1.4);
  });
}

function drawVignette(ctx, cx, cy, color, r0, r1) {
  const g = ctx.createRadialGradient(cx, cy, r0, cx, cy, r1);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, color);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function drawClassic(ctx) {
  const pal = {
    activityBar: '#333333', activityIcon: '#c5c5c5',
    sidebar: '#252526', sidebarText: '#cccccc', sidebarActiveText: '#ffffff', selectionText: '#ffffff',
    tabBarBg: '#252526', tabActiveBg: '#1e1e1e', tabInactiveBg: '#2d2d2d', tabText: '#8a8a8a', tabActiveText: '#ffffff',
    statusBg: '#007acc', statusText: '#ffffff',
    gutterText: '#6e7681', minimapBg: '#1e1e1e', minimapLine: 'rgba(255,255,255,0.10)',
    accent: '#007acc',
    roles: { com: '#6a9955', kw: '#569cd6', type: '#4ec9b0', func: '#dcdcaa', prop: '#9cdcfe', str: '#ce9178', num: '#b5cea8', punct: '#d4d4d4', plain: '#d4d4d4' },
  };
  ctx.fillStyle = '#1e1e1e'; ctx.fillRect(0, 0, W, H);
  drawChrome(ctx, pal);
  drawTokenCode(ctx, pal, CODE_LINES, 66, 22, 15);
  drawMinimap(ctx, pal, CODE_LINES);
  drawVignette(ctx, 400, 400, 'rgba(0,0,0,0.45)', 120, 420);
}

function drawDiff(ctx) {
  const pal = {
    activityBar: '#0d1117', activityIcon: '#8b949e',
    sidebar: '#161b22', sidebarText: '#8b949e', sidebarActiveText: '#f0f6fc', selectionText: '#f0f6fc',
    tabBarBg: '#161b22', tabActiveBg: '#0d1117', tabInactiveBg: '#161b22', tabText: '#8b949e', tabActiveText: '#f0f6fc',
    statusBg: '#f85149', statusText: '#0d1117',
    gutterText: '#6e7681', accent: '#f85149',
  };
  ctx.fillStyle = '#0d1117'; ctx.fillRect(0, 0, W, H);
  drawChrome(ctx, pal, {
    tabs: ['Boss.js (편집됨)', 'CombatSystem.js', 'GameScene.js'],
    statusLeft: '⎇ main ⇆ fix/rage-mode',
    statusRight: '⚠ CONFLICT   Boss.js',
  });

  const startY = 66, lh = 23, fontSize = 14;
  const codeX = CONTENT_X + 56;
  ctx.font = `${fontSize}px ${MONO}`;
  DIFF_LINES.forEach((line, i) => {
    const y = startY + i * lh;
    let bg = null, color = '#c9d1d9';
    if (line.type === 'add') { bg = 'rgba(46,160,67,0.18)'; color = '#3fb950'; }
    else if (line.type === 'del') { bg = 'rgba(248,81,73,0.18)'; color = '#f85149'; }
    else if (line.type === 'hunk') { color = '#a5d6ff'; }
    if (bg) { ctx.fillStyle = bg; ctx.fillRect(CONTENT_X, y - lh + 7, W - CONTENT_X - MINI_W, lh); }
    ctx.fillStyle = color;
    ctx.fillText(line.t, codeX, y);
  });
  drawVignette(ctx, 400, 400, 'rgba(0,0,0,0.4)', 120, 420);
}

function drawMatrix(ctx) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);

  const chars = 'アイウエオカキクケコ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ$+-*/=<>{}[]();';
  ctx.font = `14px ${MONO}`;
  ctx.textAlign = 'center';
  const cols = Math.floor(W / 16);
  for (let c = 0; c < cols; c++) {
    const x = c * 16 + 8;
    const dropLen = 6 + Math.floor(Math.random() * 14);
    const startY = -Math.floor(Math.random() * 400);
    for (let k = 0; k < dropLen; k++) {
      const y = startY + k * 16;
      if (y < 30 || y > H - 10) continue;
      const ch = chars[Math.floor(Math.random() * chars.length)];
      const head = k === dropLen - 1;
      ctx.fillStyle = head ? '#d6ffe0' : `rgba(30, ${170 + Math.floor(Math.random() * 60)}, 70, ${0.15 + (k / dropLen) * 0.75})`;
      ctx.fillText(ch, x, y);
    }
  }
  ctx.textAlign = 'left';

  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 2);

  ctx.fillStyle = 'rgba(10,10,10,0.92)';
  ctx.fillRect(0, 0, W, 30);
  ['#ff5f56', '#ffbd2e', '#27c93f'].forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.arc(20 + i * 20, 15, 6, 0, Math.PI * 2); ctx.fill();
  });
  ctx.fillStyle = '#8fbf9f';
  ctx.font = `12px ${MONO}`;
  ctx.textAlign = 'center';
  ctx.fillText('boss@arena: ~/battle', W / 2, 19);
  ctx.textAlign = 'left';

  const panelX = 14, panelY = 38, panelW = 460, panelH = 306;
  ctx.fillStyle = 'rgba(0,10,4,0.72)';
  ctx.fillRect(panelX, panelY, panelW, panelH);
  ctx.strokeStyle = 'rgba(93,255,160,0.25)';
  ctx.strokeRect(panelX, panelY, panelW, panelH);
  ctx.font = `13px ${MONO}`;
  let ly = panelY + 20;
  TERMINAL_LOG.forEach(([text, color]) => {
    ctx.fillStyle = color;
    ctx.fillText(text, panelX + 12, ly);
    ly += 19;
  });
  const lastText = TERMINAL_LOG[TERMINAL_LOG.length - 1][0];
  const cursorX = panelX + 12 + ctx.measureText(lastText).width + 6;
  ctx.fillStyle = '#5dffa0';
  ctx.fillRect(cursorX, ly - 19 - 11, 8, 13);

  drawVignette(ctx, 400, 400, 'rgba(0,10,3,0.55)', 130, 430);
}

function drawErrorChaos(ctx) {
  const pal = {
    activityBar: '#333333', activityIcon: '#c5c5c5',
    sidebar: '#252526', sidebarText: '#cccccc', sidebarActiveText: '#ffffff', selectionText: '#ffffff',
    tabBarBg: '#252526', tabActiveBg: '#1e1e1e', tabInactiveBg: '#2d2d2d', tabText: '#8a8a8a', tabActiveText: '#ffffff',
    statusBg: '#f14c4c', statusText: '#1e1e1e',
    gutterText: '#6e7681', minimapBg: '#1e1e1e', minimapLine: 'rgba(255,255,255,0.10)',
    accent: '#f14c4c',
    roles: { com: '#6a9955', kw: '#569cd6', type: '#4ec9b0', func: '#dcdcaa', prop: '#9cdcfe', str: '#ce9178', num: '#b5cea8', punct: '#d4d4d4', plain: '#d4d4d4' },
  };
  ctx.fillStyle = '#1e1e1e'; ctx.fillRect(0, 0, W, H);
  drawChrome(ctx, pal, { statusLeft: '⎇ main    ⊗ 3  ⚠ 7', statusRight: 'UTF-8   LF   JavaScript' });
  const startY = 66, lh = 22, fontSize = 15;
  drawTokenCode(ctx, pal, CODE_LINES, startY, lh, fontSize);
  drawMinimap(ctx, pal, CODE_LINES);

  ctx.strokeStyle = '#f14c4c';
  ctx.lineWidth = 1.4;
  [4, 9, 16].forEach((row) => {
    const y = startY + row * lh + 4;
    const x0 = CONTENT_X + 56, x1 = x0 + 140;
    ctx.beginPath();
    for (let x = x0; x < x1; x += 4) ctx.lineTo(x, y + (Math.sin(x * 0.9) > 0 ? 2 : 0));
    ctx.stroke();
    ctx.fillStyle = '#f14c4c';
    ctx.beginPath(); ctx.arc(CONTENT_X + 20, startY + row * lh - 5, 3, 0, Math.PI * 2); ctx.fill();
  });

  const tx = 470, ty = 130, tw = 300, th = 54;
  ctx.fillStyle = 'rgba(30,10,10,0.95)';
  roundRect(ctx, tx, ty, tw, th, 6); ctx.fill();
  ctx.strokeStyle = '#f14c4c';
  roundRect(ctx, tx, ty, tw, th, 6); ctx.stroke();
  ctx.fillStyle = '#f14c4c';
  ctx.font = `12px ${MONO}`;
  ctx.fillText('TypeError: boss.hp is not a number', tx + 12, ty + 22);
  ctx.fillStyle = '#d4d4d4';
  ctx.fillText('at takeDamage (Boss.js:10)', tx + 12, ty + 40);

  drawVignette(ctx, 400, 400, 'rgba(60,0,0,0.35)', 110, 420);
}

export const BACKGROUND_STYLES = {
  CLASSIC: 'classic',
  DIFF: 'diff',
  MATRIX: 'matrix',
  ERROR: 'error',
};

// 배경 선택 패널에 표시할 한글 라벨
export const BACKGROUND_LABELS = {
  [BACKGROUND_STYLES.CLASSIC]: 'Classic Dark',
  [BACKGROUND_STYLES.DIFF]: 'Git Diff',
  [BACKGROUND_STYLES.MATRIX]: 'Matrix Terminal',
  [BACKGROUND_STYLES.ERROR]: 'Error Chaos',
};

const RENDERERS = {
  [BACKGROUND_STYLES.CLASSIC]: drawClassic,
  [BACKGROUND_STYLES.DIFF]: drawDiff,
  [BACKGROUND_STYLES.MATRIX]: drawMatrix,
  [BACKGROUND_STYLES.ERROR]: drawErrorChaos,
};

export function createBackgroundCanvas(style) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  (RENDERERS[style] || drawClassic)(ctx);
  return canvas;
}
