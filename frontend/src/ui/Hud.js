import Phaser from 'phaser';
import { HP_BAR_WIDTH, HP_BAR_X, HP_BAR_Y, TOP_HUD_Y, UI_FONT_FAMILY } from '../config/constants.js';
import { BACKGROUND_STYLES, BACKGROUND_LABELS } from '../config/backgrounds.js';

const BACKGROUND_OPTIONS = Object.values(BACKGROUND_STYLES).map((style) => ({
  style,
  label: BACKGROUND_LABELS[style],
}));

export default class Hud {
  constructor(scene, { onDrawButtonClick, onEndButtonClick, currentBackgroundStyle, onBackgroundSelect } = {}) {
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

    this.drawButton = this.createDrawButton(onDrawButtonClick);
    this.backgroundPanelOpen = false;
    this.backgroundButton = this.createBackgroundButton(() => this.toggleBackgroundPanel());
    this.backgroundPanel = this.createBackgroundPanel(currentBackgroundStyle, (style) => {
      if (onBackgroundSelect) onBackgroundSelect(style);
      this.setActiveBackgroundOption(style);
      this.toggleBackgroundPanel(false);
    });
    this.trashCan = this.createTrashCan();
    this.endButton = this.createEndButton(onEndButtonClick);
  }

  // 체력바 옆 trash와 같은 y에 배치
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
    const rowStep = thumbH + 30 + rowGap;
    let y = listTop + 6;

    this.backgroundOptionEls = [];

    BACKGROUND_OPTIONS.forEach(({ style, label }) => {
      const cx = panelWidth / 2;
      const cy = y + thumbH / 2;

      const thumb = this.scene.add.image(cx, cy, `battleBackground_${style}`)
        .setDisplaySize(thumbW, thumbH)
        .setInteractive({ useHandCursor: true });
      const border = this.scene.add.rectangle(cx, cy, thumbW + 6, thumbH + 6)
        .setStrokeStyle(3, 0xffaa00, style === currentStyle ? 1 : 0);
      const labelText = this.scene.add.text(cx, y + thumbH + 12, label, {
        fontSize: '12px',
        color: '#ffffff',
        fontFamily: UI_FONT_FAMILY,
      }).setOrigin(0.5);

      thumb.on('pointerdown', () => onSelect(style));

      listContainer.add([thumb, border, labelText]);
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

  // 종료 버튼 클릭 시 표시하는 결과 화면. online/local 분기 및 리더보드는 webview 연동(3~5일차) 이후 붙일 예정
  showGameEndOverlay(score, onRestartClick) {
    const { width, height } = this.scene.scale;

    const dim = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.75);
    const title = this.scene.add.text(width / 2, height / 2 - 30, '게임 종료', {
      fontSize: '30px',
      color: '#ffffff',
      fontStyle: 'bold',
      fontFamily: UI_FONT_FAMILY,
    }).setOrigin(0.5);
    const scoreText = this.scene.add.text(width / 2, height / 2 + 20, `최종 점수: ${score}`, {
      fontSize: '22px',
      color: '#ffaa00',
      fontFamily: UI_FONT_FAMILY,
    }).setOrigin(0.5);
    const restartButton = this.createRestartButton(width / 2, height / 2 + 75, onRestartClick);

    return { dim, title, scoreText, restartButton };
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

  // 체력바와 같은 y, 체력바 왼쪽에 붙는 위치에 배치
  createTrashCan() {
    const width = 50;
    const height = 50;
    const gap = 10;
    const x = 25;
    const y = HP_BAR_Y-10;

    const bg = this.scene.add.rectangle(x, y, width, height, 0x000000, 0);
    bg.setInteractive({ useHandCursor: true });

    const icon = this.drawTrashIcon(x, y, width, height);

    return { bg, icon };
  }

  // 쓰레기통 실루엣: 손잡이 + 뚜껑 + 사다리꼴 몸통 + 세로줄
  drawTrashIcon(x, y, width, height) {
    const bodyColor = 0x882222;
    const lineColor = 0xffffff;

    const bodyTop = -height * 0.25;
    const bodyBottom = height * 0.45;
    const bodyTopWidth = width * 0.6;
    const bodyBottomWidth = width * 0.42;
    const lidWidth = width * 0.8;
    const lidHeight = height * 0.12;

    const g = this.scene.add.graphics({ x, y });

    g.fillStyle(bodyColor, 1);
    g.fillRect(-width * 0.15, -height * 0.42, width * 0.3, height * 0.12);
    g.fillRect(-lidWidth / 2, bodyTop - lidHeight, lidWidth, lidHeight);

    g.beginPath();
    g.moveTo(-bodyTopWidth / 2, bodyTop);
    g.lineTo(bodyTopWidth / 2, bodyTop);
    g.lineTo(bodyBottomWidth / 2, bodyBottom);
    g.lineTo(-bodyBottomWidth / 2, bodyBottom);
    g.closePath();
    g.fillPath();

    g.lineStyle(2, lineColor, 0.8);
    [-0.15, 0, 0.15].forEach((fx) => {
      g.beginPath();
      g.moveTo(width * fx, bodyTop + 4);
      g.lineTo(width * fx * 0.75, bodyBottom - 4);
      g.strokePath();
    });

    return g;
  }

  getTrashBounds() {
    return this.trashCan.bg.getBounds();
  }

  // 배경 버튼 왼쪽에 붙는 뽑기(무기) 버튼
  createDrawButton(onClick) {
    const size = 40;
    const gap = 10;
    const x = this.scene.scale.width - size - 16 - gap - size / 2;
    const y = TOP_HUD_Y;

    return this.createPillButton(x, y, size, 0xffaa00, '🗡', onClick);
  }

  updateHpBar(boss) {
    const ratio = Phaser.Math.Clamp(boss.hp / boss.maxHp, 0, 1);
    this.hpBar.width = HP_BAR_WIDTH * ratio;
  }

  updateScoreText(score) {
    this.scoreText.setText(`${score}`);
  }

  updateDrawButton(active) {
    this.drawButton.bg.setAlpha(active ? 1 : 0.35);
    this.drawButton.label.setAlpha(active ? 1 : 0.35);
  }
}
