import Phaser from 'phaser';
import {
  HP_BAR_WIDTH, HP_BAR_X, HP_BAR_Y, TOP_HUD_Y, UI_FONT_FAMILY, BOSS_TYPES,
  WEAPON_DEFINITIONS,
} from '../config/constants.js';
import { BACKGROUND_STYLES } from '../config/backgrounds.js';

const BACKGROUND_OPTIONS = Object.values(BACKGROUND_STYLES).map((style) => ({ style }));

// 무기 패널에 뜨는 개별 무기 목록(방망이/야구공/다트 등) — WEAPON_DEFINITIONS(constants.js)에 새 무기를
// 추가하면 여기 코드 변경 없이 패널에 자동으로 한 칸 더 생긴다 (createWeaponPanel의 grid가 개수에 맞춰 줄바꿈).
const WEAPON_OPTIONS = Object.entries(WEAPON_DEFINITIONS).map(([id, { texture }]) => ({
  id,
  texture,
}));

export default class Hud {
  constructor(scene, {
    onWeaponSelect, onEndButtonClick, currentBackgroundStyle, onBackgroundSelect,
    currentBossType, onBossSelect,
  } = {}) {
    this.scene = scene;

    // 보스 체력바: 화면 하단 중앙. 코드 배경 위에서도 잘 보이도록 골드 테두리로 프레임을 주고,
    // 배경(hpBarBg)에만 테두리를 둬서 안의 초록 fill(hpBar)이 줄어들어도 프레임은 고정된 채 유지된다.
    // 체력바 위 라벨 자리에 "BOSS" 대신 점수를 표시한다.
    this.scoreText = scene.add.text(HP_BAR_X, HP_BAR_Y - 22, '0', {
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold',
      fontFamily: UI_FONT_FAMILY,
    }).setOrigin(0.5);
    this.hpBarBg = scene.add.rectangle(HP_BAR_X, HP_BAR_Y, HP_BAR_WIDTH + 4, 20, 0x444444).setStrokeStyle(2, 0xffaa00);
    this.hpBar = scene.add.rectangle(HP_BAR_X, HP_BAR_Y, HP_BAR_WIDTH, 16, 0x33cc33);

    this.weaponPanelOpen = false;
    this.drawButton = this.createDrawButton(() => this.toggleWeaponPanel());
    this.weaponPanel = this.createWeaponPanel((weaponId) => {
      if (onWeaponSelect) onWeaponSelect(weaponId);
      this.setActiveWeaponOption(weaponId);
      this.toggleWeaponPanel(false);
    });

    this.bossPanelOpen = false;
    this.bossButton = this.createBossButton(() => this.toggleBossPanel());
    this.bossPanel = this.createBossPanel(currentBossType, (bossTypeId) => {
      if (onBossSelect) onBossSelect(bossTypeId);
      this.setActiveBossOption(bossTypeId);
      this.toggleBossPanel(false);
    });

    this.backgroundPanelOpen = false;
    this.backgroundButton = this.createBackgroundButton(() => this.toggleBackgroundPanel());
    this.backgroundPanel = this.createBackgroundPanel(currentBackgroundStyle, (style) => {
      if (onBackgroundSelect) onBackgroundSelect(style);
      this.setActiveBackgroundOption(style);
      this.toggleBackgroundPanel(false);
    });
    this.endButton = this.createEndButton(onEndButtonClick);
  }

  // 무기 패널이나 배경 패널(열려있을 때), 상단 버튼들 위 클릭인지 판단. 필드 클릭(무기를 들어 보이기)과
  // UI 클릭을 구분하는 데 쓴다.
  // Phaser 자체 히트테스트를 쓰는 이유: 패널 아이콘의 pointerdown(onSelect)이 먼저 실행되며 toggleWeaponPanel(false)로
  // weaponPanelOpen을 그 자리에서 바로 false로 바꿔버리기 때문에, 같은 클릭을 뒤이어 처리하는 씬 레벨 pointerdown에서
  // weaponPanelOpen 값만 보면 "패널이 이미 닫혔다"고 잘못 판단해 같은 좌표에 필드 무기가 또 스폰되는 버그가 있었다.
  // hitTestPointer는 그 순간 실제로 그 자리에 있는 인터랙티브 오브젝트를 다시 계산하므로 이 타이밍 문제가 없다.
  isPointerOnUI(pointer) {
    return this.scene.input.hitTestPointer(pointer).length > 0;
  }

  // 무기/보스/배경 패널 중 지금 열려 있는(슬라이드된) 패널이 있으면 그 왼쪽 경계 x를 반환. 다 닫혀 있으면 null.
  // GameScene이 매 프레임 이 경계를 보스와 겹치는지 검사해 패널에 부딪혔는지 판단하는 데 쓴다.
  getOpenPanelBoundaryX() {
    if (this.weaponPanelOpen) return this.weaponPanel.openX;
    if (this.bossPanelOpen) return this.bossPanel.openX;
    if (this.backgroundPanelOpen) return this.backgroundPanel.openX;
    return null;
  }

  // 체력바와 같은 y, 화면 오른쪽 끝에 배치
  createEndButton(onClick) {
    const size = 40;
    const x = this.scene.scale.width - size / 2 - 16;
    const y = HP_BAR_Y - 10;

    return this.createPillButton(x, y, size, 0x883333, '✕', onClick);
  }

  // 아이콘만 담은 둥근 버튼. Weapon/Exit 버튼이 공유하는 스타일
  createPillButton(x, y, size, bgColor, iconChar, onClick) {
    const width = size;
    const height = size;
    const radius = height / 2;

    const bg = this.scene.add.graphics();
    bg.fillStyle(bgColor, 1);
    bg.fillRoundedRect(x - width / 2, y - height / 2, width, height, radius);

    const label = this.scene.add.text(x, y, iconChar, {
      fontSize: '22px',
      color: '#ffffff',
      fontFamily: UI_FONT_FAMILY,
    }).setOrigin(0.5);

    const hitArea = new Phaser.Geom.Rectangle(x - width / 2, y - height / 2, width, height);
    bg.setInteractive({ hitArea, hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true });
    if (onClick) bg.on('pointerdown', onClick);

    return { bg, label };
  }

  // 뽑기(무기) 버튼 오른쪽, 화면 가장자리에 붙는 배경 변경 버튼
  createBackgroundButton(onClick) {
    const size = 40;
    const x = this.scene.scale.width - size / 2 - 16;
    const y = TOP_HUD_Y;

    return this.createPillButton(x, y, size, 0x1f8a3d, '🗂️', onClick);
  }

  // 화면 오른쪽 바깥에 미리 만들어두고, 열릴 때 왼쪽으로 슬라이드시키는 배경 선택 패널
  createBackgroundPanel(currentStyle, onSelect) {
    const panelWidth = 200;
    const height = this.scene.scale.height;
    // 닫힌 상태에서 패널 테두리(stroke)가 화면 오른쪽 끝에 1px씩 비쳐 보이는 것을 막기 위해
    // 캔버스 경계보다 여유 있게 더 바깥에서 시작한다.
    const startX = this.scene.scale.width + 16;
    const openX = this.scene.scale.width - panelWidth;

    const container = this.scene.add.container(startX, 0).setDepth(1000);

    const bg = this.scene.add.rectangle(0, 0, panelWidth, height, 0x1e1e1e, 0.96)
      .setOrigin(0, 0)
      .setInteractive();
    container.add(bg);

    const title = this.scene.add.text(panelWidth / 2, 22, 'BACKGROUND', {
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold',
      fontFamily: UI_FONT_FAMILY,
    }).setOrigin(0.5);
    container.add(title);

    const closeButton = this.scene.add.text(panelWidth - 18, 20, '✕', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: UI_FONT_FAMILY,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeButton.on('pointerdown', () => this.toggleBackgroundPanel(false));
    container.add(closeButton);

    // 목록 영역: 항목이 많아 화면 높이를 넘어가면 이 안에서만 위아래로 스크롤한다
    const listTop = 50;
    const listBottom = height - 10;
    const listContainer = this.scene.add.container(0, 0);
    container.add(listContainer);

    const thumbW = 140;
    const thumbH = 105;
    const rowGap = 18;
    const rowStep = thumbH + rowGap;
    let y = listTop + 6;

    this.backgroundOptionEls = [];

    BACKGROUND_OPTIONS.forEach(({ style }) => {
      const cx = panelWidth / 2;
      const cy = y + thumbH / 2;

      const thumb = this.scene.add.image(cx, cy, `battleBackground_${style}`)
        .setDisplaySize(thumbW, thumbH)
        .setInteractive({ useHandCursor: true });
      const border = this.scene.add.rectangle(cx, cy, thumbW + 6, thumbH + 6)
        .setStrokeStyle(3, 0xffaa00, style === currentStyle ? 1 : 0);

      thumb.on('pointerdown', () => onSelect(style));

      listContainer.add([thumb, border]);
      this.backgroundOptionEls.push({ style, border });

      y += rowStep;
    });

    const contentHeight = BACKGROUND_OPTIONS.length * rowStep - rowGap + listTop;
    const visibleHeight = listBottom - listTop;
    const maxScroll = Math.max(0, contentHeight - visibleHeight);

    // 목록이 listTop 위(타이틀/닫기 버튼 영역)로 스크롤되어 겹쳐 보이지 않도록 마스크로 잘라낸다.
    // 마스크 도형은 화면에 그려지지 않고(make.graphics는 displayList에 추가 안 됨) 슬라이드 tween 때 container와 같이 움직인다.
    const maskShape = this.scene.make.graphics({ x: startX, y: 0 });
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(0, listTop, panelWidth, visibleHeight);
    listContainer.setMask(maskShape.createGeometryMask());

    this.scene.input.on('wheel', (pointer, _over, _dx, dy) => {
      if (!this.backgroundPanelOpen) return;
      if (pointer.x < this.backgroundPanel.openX) return;
      const next = Phaser.Math.Clamp(listContainer.y - dy * 0.5, -maxScroll, 0);
      listContainer.y = next;
    });

    return { container, listContainer, maskShape, openX, startX, maxScroll };
  }

  toggleBackgroundPanel(forceOpen) {
    const shouldOpen = forceOpen === undefined ? !this.backgroundPanelOpen : forceOpen;
    if (shouldOpen === this.backgroundPanelOpen) return;
    this.backgroundPanelOpen = shouldOpen;
    if (shouldOpen) this.toggleBossPanel(false);

    if (shouldOpen) this.toggleWeaponPanel(false); // 두 슬라이드 패널이 같은 자리에서 겹치지 않도록

    const { container, maskShape, openX, startX } = this.backgroundPanel;
    this.scene.tweens.add({
      targets: [container, maskShape],
      x: shouldOpen ? openX : startX,
      duration: 280,
      ease: 'Cubic.easeOut',
    });
  }

  setActiveBackgroundOption(style) {
    this.backgroundOptionEls.forEach(({ style: s, border }) => {
      border.setStrokeStyle(3, 0xffaa00, s === style ? 1 : 0);
    });
  }

  // 배경 패널과 같은 자리(화면 오른쪽)에서 슬라이드되는 무기 카테고리 패널.
  // 무기는 배경처럼 "현재 상태"가 없는 일회성 뽑기라 스크롤/선택 테두리는 필요 없다 — 항목이 늘 화면 안에 들어온다.
  // 한 줄에 2개씩 격자로 배치한다 (예전엔 세로로 한 줄씩 나열해 아이콘이 필요 이상으로 크게 보였다).
  createWeaponPanel(onSelect) {
    const panelWidth = 200;
    const height = this.scene.scale.height;
    const startX = this.scene.scale.width + 16;
    const openX = this.scene.scale.width - panelWidth;

    const container = this.scene.add.container(startX, 0).setDepth(1000);

    const bg = this.scene.add.rectangle(0, 0, panelWidth, height, 0x1e1e1e, 0.96)
      .setOrigin(0, 0)
      .setInteractive();
    container.add(bg);

    const title = this.scene.add.text(panelWidth / 2, 22, 'WEAPON', {
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold',
      fontFamily: UI_FONT_FAMILY,
    }).setOrigin(0.5);
    container.add(title);

    const closeButton = this.scene.add.text(panelWidth - 18, 20, '✕', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: UI_FONT_FAMILY,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeButton.on('pointerdown', () => this.toggleWeaponPanel(false));
    container.add(closeButton);

    const columns = 2;
    const iconSize = 78;
    const colGap = 14;
    const rowGap = 26;
    const gridWidth = columns * iconSize + (columns - 1) * colGap;
    const gridStartX = (panelWidth - gridWidth) / 2;
    const rowStep = iconSize + rowGap;
    const top = 56;

    this.weaponOptionEls = [];

    WEAPON_OPTIONS.forEach(({ id, texture }, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const cx = gridStartX + col * (iconSize + colGap) + iconSize / 2;
      const cy = top + row * rowStep + iconSize / 2;

      const icon = this.scene.add.image(cx, cy, texture)
        .setDisplaySize(iconSize, iconSize)
        .setInteractive({ useHandCursor: true });
      const border = this.scene.add.rectangle(cx, cy, iconSize + 8, iconSize + 8)
        .setStrokeStyle(3, 0xffaa00, 0);

      icon.on('pointerdown', () => onSelect(id));
      container.add([icon, border]);
      this.weaponOptionEls.push({ id, border });
    });

    return { container, openX, startX };
  }

  setActiveWeaponOption(weaponId) {
    this.weaponOptionEls.forEach(({ id, border }) => {
      border.setStrokeStyle(3, 0xffaa00, id === weaponId ? 1 : 0);
    });
  }

  toggleWeaponPanel(forceOpen) {
    const shouldOpen = forceOpen === undefined ? !this.weaponPanelOpen : forceOpen;
    if (shouldOpen === this.weaponPanelOpen) return;
    this.weaponPanelOpen = shouldOpen;

    if (shouldOpen) this.toggleBackgroundPanel(false);
    if (shouldOpen) this.toggleBossPanel(false);

    const { container, openX, startX } = this.weaponPanel;
    this.scene.tweens.add({
      targets: container,
      x: shouldOpen ? openX : startX,
      duration: 280,
      ease: 'Cubic.easeOut',
    });
  }

  // 종료 버튼 클릭 시 표시하는 결과 화면. online/local 분기 내용(리더보드/최고기록)은 비동기로 나중에
  // setEndOverlayStatus()가 채워 넣는다 — 서버 응답을 기다리는 동안에도 화면은 먼저 뜨게 하기 위함.
  showGameEndOverlay(score, onRestartClick) {
    const { width, height } = this.scene.scale;

    const dim = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.75);
    const title = this.scene.add.text(width / 2, height / 2 - 110, '게임 종료', {
      fontSize: '30px',
      color: '#ffffff',
      fontStyle: 'bold',
      fontFamily: UI_FONT_FAMILY,
    }).setOrigin(0.5);
    const scoreText = this.scene.add.text(width / 2, height / 2 - 60, `최종 점수: ${score}`, {
      fontSize: '22px',
      color: '#ffaa00',
      fontFamily: UI_FONT_FAMILY,
    }).setOrigin(0.5);
    const statusText = this.scene.add.text(width / 2, height / 2 - 20, '', {
      fontSize: '14px',
      color: '#dddddd',
      fontFamily: UI_FONT_FAMILY,
      align: 'center',
      lineSpacing: 6,
    }).setOrigin(0.5, 0);
    const restartButton = this.createRestartButton(width / 2, height / 2 + 140, onRestartClick);

    return { dim, title, scoreText, statusText, restartButton };
  }

  // onGameEnd(리더보드 로딩/결과, 로컬 최고기록)이 결과 화면에 텍스트를 채워 넣을 때 쓴다.
  setEndOverlayStatus(overlay, text) {
    overlay.statusText.setText(text);
  }

  createRestartButton(x, y, onClick) {
    const width = 130;
    const height = 44;

    const bg = this.scene.add.rectangle(x, y, width, height, 0x3366cc);
    const label = this.scene.add.text(x, y, '다시하기', {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: UI_FONT_FAMILY,
    }).setOrigin(0.5);

    bg.setInteractive({ useHandCursor: true });
    if (onClick) bg.on('pointerdown', onClick);

    return { bg, label };
  }

  // 보스 버튼 왼쪽에 붙는 뽑기(무기) 버튼
  createDrawButton(onClick) {
    const size = 40;
    const gap = 10;
    const x = this.scene.scale.width - size * 2 - 16 - gap * 2 - size / 2;
    const y = TOP_HUD_Y;

    return this.createPillButton(x, y, size, 0xffaa00, '🗡', onClick);
  }

  // 배경 버튼 왼쪽, 뽑기 버튼 오른쪽에 붙는 보스 선택 버튼
  createBossButton(onClick) {
    const size = 40;
    const gap = 10;
    const x = this.scene.scale.width - size - 16 - gap - size / 2;
    const y = TOP_HUD_Y;

    return this.createPillButton(x, y, size, 0x8e44ad, '👹', onClick);
  }

  // 화면 오른쪽 바깥에 미리 만들어두고, 열릴 때 왼쪽으로 슬라이드시키는 보스 선택 패널
  createBossPanel(currentBossTypeId, onSelect) {
    const panelWidth = 200;
    const height = this.scene.scale.height;
    const startX = this.scene.scale.width + 16;
    const openX = this.scene.scale.width - panelWidth;

    const container = this.scene.add.container(startX, 0).setDepth(1000);

    const bg = this.scene.add.rectangle(0, 0, panelWidth, height, 0x1e1e1e, 0.96)
      .setOrigin(0, 0)
      .setInteractive();
    container.add(bg);

    const title = this.scene.add.text(panelWidth / 2, 22, 'BOSS', {
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold',
      fontFamily: UI_FONT_FAMILY,
    }).setOrigin(0.5);
    container.add(title);

    const closeButton = this.scene.add.text(panelWidth - 18, 20, '✕', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: UI_FONT_FAMILY,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeButton.on('pointerdown', () => this.toggleBossPanel(false));
    container.add(closeButton);

    const thumbW = 140;
    const thumbH = 90;
    const rowGap = 14;
    const rowStep = thumbH + 26 + rowGap;
    let y = 50 + 6;

    this.bossOptionEls = [];

    BOSS_TYPES.forEach(({ id, name }) => {
      const cx = panelWidth / 2;
      const cy = y + thumbH / 2;

      const thumb = this.scene.add.image(cx, cy, `boss_${id}_d0`)
        .setDisplaySize(thumbW, thumbH)
        .setInteractive({ useHandCursor: true });
      const border = this.scene.add.rectangle(cx, cy, thumbW + 6, thumbH + 6)
        .setStrokeStyle(3, 0xffaa00, id === currentBossTypeId ? 1 : 0);
      const labelText = this.scene.add.text(cx, y + thumbH + 12, name, {
        fontSize: '11px',
        color: '#ffffff',
        fontFamily: UI_FONT_FAMILY,
      }).setOrigin(0.5);

      thumb.on('pointerdown', () => onSelect(id));

      container.add([thumb, border, labelText]);
      this.bossOptionEls.push({ id, border });

      y += rowStep;
    });

    return { container, openX, startX };
  }

  toggleBossPanel(forceOpen) {
    const shouldOpen = forceOpen === undefined ? !this.bossPanelOpen : forceOpen;
    if (shouldOpen === this.bossPanelOpen) return;
    this.bossPanelOpen = shouldOpen;
    if (shouldOpen) this.toggleBackgroundPanel(false);
    if (shouldOpen) this.toggleWeaponPanel(false);

    const { container, openX, startX } = this.bossPanel;
    this.scene.tweens.add({
      targets: container,
      x: shouldOpen ? openX : startX,
      duration: 280,
      ease: 'Cubic.easeOut',
    });
  }

  setActiveBossOption(bossTypeId) {
    this.bossOptionEls.forEach(({ id, border }) => {
      border.setStrokeStyle(3, 0xffaa00, id === bossTypeId ? 1 : 0);
    });
  }

  updateHpBar(boss) {
    const ratio = Phaser.Math.Clamp(boss.hp / boss.maxHp, 0, 1);
    this.hpBar.width = HP_BAR_WIDTH * ratio;
  }

  updateScoreText(score) {
    this.scoreText.setText(`${score}`);
  }
}
