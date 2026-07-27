import Phaser from 'phaser';
import {
  HP_BAR_WIDTH, HP_BAR_X, HP_BAR_Y, TOP_HUD_Y, UI_FONT_FAMILY, BOSS_TYPES,
  WEAPON_DEFINITIONS,
} from '../config/constants.js';
import { BACKGROUND_STYLES } from '../config/backgrounds.js';

// 배경 스타일(backgrounds.js)에는 표시용 이름이 없어서 패널 라벨용으로 여기서만 따로 붙인다.
const BACKGROUND_STYLE_LABELS = {
  [BACKGROUND_STYLES.CLASSIC]: 'CLASSIC',
  [BACKGROUND_STYLES.DIFF]: 'DIFF',
  [BACKGROUND_STYLES.MATRIX]: 'MATRIX',
  [BACKGROUND_STYLES.ERROR]: 'ERROR',
};

// WEAPON/AGENT/MAP 세 탭이 전부 같은 격자(createGridTabContent)를 쓰므로, 각 목록을
// {id, name, texture} 모양으로 미리 맞춰둔다 — 항목을 추가/변경해도 Hud 쪽 그리드 코드는 그대로다.
const WEAPON_OPTIONS = Object.entries(WEAPON_DEFINITIONS).map(([id, { texture, name }]) => ({
  id,
  name,
  texture,
}));
const BOSS_OPTIONS = BOSS_TYPES.map(({ id, name }) => ({ id, name, texture: `boss_${id}_d0` }));
const BACKGROUND_OPTIONS = Object.values(BACKGROUND_STYLES).map((style) => ({
  id: style,
  name: BACKGROUND_STYLE_LABELS[style],
  texture: `battleBackground_${style}`,
}));

// 예전엔 무기/보스/배경이 각자 슬라이드 패널이었고 서로 겹치지 않게 열고 닫는 로직만 따로 맞춰줬는데,
// 지금은 패널 하나(sidePanel)를 공유하고 상단 텍스트 탭으로 내용만 바꿔 끼운다.
// "보스"는 게임 이름(Hit the Agent)에 맞춰 AGENT로, 배경은 MAP으로 표기한다.
const TAB_ORDER = ['weapon', 'boss', 'background'];
const TAB_LABELS = { weapon: 'WEAPON', boss: 'AGENT', background: 'MAP' };

// 패널 안 선택/활성 상태를 나타내는 액센트 색. 라임 계열 형광 그린(기존보다 밝게).
const PANEL_ACCENT = 0x99ff33;
const PANEL_ACCENT_CSS = '#99ff33';
// 패널을 헤더(탭 바)/본문 두 톤으로 살짝 나눠 깊이감을 준다. 무채색 회색 계열로 되돌림.
const PANEL_BG = 0x1e1e1e;
const PANEL_HEADER_BG = 0x161616;
const PANEL_CONTENT_BG = 0x242424;

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

    this.panelOpen = false;
    this.activeTab = 'weapon';

    this.settingsButton = this.createSettingsButton(() => this.togglePanel());

    this.sidePanel = this.createSidePanel({
      currentBossTypeId: currentBossType,
      currentBackgroundStyle,
      onWeaponSelect: (weaponId) => {
        if (onWeaponSelect) onWeaponSelect(weaponId);
        this.setActiveWeaponOption(weaponId);
        this.togglePanel(false);
      },
      onBossSelect: (bossTypeId) => {
        if (onBossSelect) onBossSelect(bossTypeId);
        this.setActiveBossOption(bossTypeId);
        this.togglePanel(false);
      },
      onBackgroundSelect: (style) => {
        if (onBackgroundSelect) onBackgroundSelect(style);
        this.setActiveBackgroundOption(style);
        this.togglePanel(false);
      },
    });

    this.endButton = this.createEndButton(onEndButtonClick);
  }

  // 패널이 열려있을 때, 상단 버튼들 위 클릭인지 판단. 필드 클릭(무기를 들어 보이기)과 UI 클릭을 구분하는 데 쓴다.
  // Phaser 자체 히트테스트를 쓰는 이유: 탭/옵션의 pointerdown이 먼저 실행되며 그 자리에서 바로 panelOpen을
  // 바꿔버리기 때문에, 같은 클릭을 뒤이어 처리하는 씬 레벨 pointerdown에서 panelOpen 값만 보면 "패널이 이미
  // 닫혔다"고 잘못 판단해 같은 좌표에 필드 무기가 또 스폰되는 버그가 있었다.
  // hitTestPointer는 그 순간 실제로 그 자리에 있는 인터랙티브 오브젝트를 다시 계산하므로 이 타이밍 문제가 없다.
  isPointerOnUI(pointer) {
    return this.scene.input.hitTestPointer(pointer).length > 0;
  }

  // 패널이 열려 있으면(슬라이드된 상태) 그 왼쪽 경계 x를 반환. 닫혀 있으면 null.
  // GameScene이 매 프레임 이 경계를 보스와 겹치는지 검사해 패널에 부딪혔는지 판단하는 데 쓴다.
  getOpenPanelBoundaryX() {
    return this.panelOpen ? this.sidePanel.openX : null;
  }

  // 체력바 근처, 화면 오른쪽 끝에 배치 — 톱니바퀴 버튼과 같은 x축(오른쪽 끝)이라 그 아래쪽에 놓인다.
  // 아이콘은 public/icons/log-out.svg(검은색 선 아이콘)를 BootScene에서 'icon_logout' 텍스처로 미리 로드해 둔 것 —
  // 원래 색(검정)은 빨강 배경 위에서 잘 안 보여서 흰색으로 tint한다.
  createEndButton(onClick) {
    const size = 40;
    const x = this.scene.scale.width - size / 2 - 16;
    const y = HP_BAR_Y + 15;

    // 톱니바퀴 버튼(위쪽, PANEL_ACCENT처럼 채도 높은 색)과 나란히 있을 때 칙칙해 보이지 않도록
    // 어두운 톤(0x883333) 대신 채도를 끌어올린 선명한 빨강을 쓴다.
    const bg = this.createPillBackground(x, y, size, 0xff3b3b, onClick);
    const icon = this.scene.add.image(x, y, 'icon_logout').setDisplaySize(20, 20).setTint(0xffffff);

    return { bg, icon };
  }

  // 둥근 배경 + 히트 영역만 만드는 하부 헬퍼. 아이콘(텍스트/이미지)은 호출부가 알아서 얹는다.
  createPillBackground(x, y, size, bgColor, onClick) {
    const radius = size / 2;

    const bg = this.scene.add.graphics();
    bg.fillStyle(bgColor, 1);
    bg.fillRoundedRect(x - size / 2, y - size / 2, size, size, radius);

    const hitArea = new Phaser.Geom.Rectangle(x - size / 2, y - size / 2, size, size);
    bg.setInteractive({ hitArea, hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true });
    if (onClick) bg.on('pointerdown', onClick);

    return bg;
  }

  // 무기/보스/배경 패널을 여는 유일한 진입점. 화면 오른쪽 가장자리에 붙는 톱니바퀴(설정) 버튼.
  // 아이콘은 public/icons/settings.svg(검은색 선 아이콘)를 BootScene에서 'icon_gear' 텍스처로 미리 로드해 둔 것.
  // 배경은 패널이 열렸을 때(활성 탭) 쓰는 액센트 색과 동일하게 맞춘다 — 밝은 색이라 검은 아이콘도 잘 보인다.
  createSettingsButton(onClick) {
    const size = 40;
    const x = this.scene.scale.width - size / 2 - 16;
    const y = TOP_HUD_Y;

    const bg = this.createPillBackground(x, y, size, PANEL_ACCENT, onClick);
    const icon = this.scene.add.image(x, y, 'icon_gear').setDisplaySize(22, 22);

    return { bg, icon };
  }

  // 패널 왼쪽 가장자리(로컬 x=0)에서 게임 화면 쪽으로 튀어나오는 닫기 손잡이.
  // 로컬 좌표가 음수(-handleWidth~0)라서 패널 bg 바깥, 화면이 보이는 쪽에 걸쳐 그려진다.
  createPanelHandle(panelHeight) {
    const handleWidth = 30;
    const handleHeight = 36;
    const y = panelHeight / 5;

    // 손잡이가 걸치는 y 위치(panelHeight/5)는 헤더(0~40px)를 지난 본문 영역이라 PANEL_CONTENT_BG와 맞춘다.
    const bg = this.scene.add.graphics();
    bg.fillStyle(PANEL_CONTENT_BG, 0.96);
    bg.fillRoundedRect(-handleWidth, y - handleHeight / 2, handleWidth, handleHeight, {
      tl: 12, bl: 12, tr: 0, br: 0,
    });

    // 패널을 오른쪽(화면 바깥)으로 밀어 닫는다는 방향성을 나타내는 오른쪽 화살표.
    // 색은 탭 선택 액센트와 맞춰서 "지금 열려있는 패널"과 시각적으로 묶어준다.
    const icon = this.scene.add.text(-handleWidth / 2, y, '▶', {
      fontSize: '14px',
      color: PANEL_ACCENT_CSS,
      fontFamily: UI_FONT_FAMILY,
    }).setOrigin(0.5);

    const hitArea = new Phaser.Geom.Rectangle(-handleWidth, y - handleHeight / 2, handleWidth, handleHeight);
    bg.setInteractive({ hitArea, hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true });
    bg.on('pointerdown', () => this.togglePanel(false));

    // 패널이 닫힌 위치(startX)에 있어도 손잡이가 자체 너비만큼 화면 오른쪽 끝을 넘어와 살짝 보이던 문제가 있어,
    // 위치가 아니라 panelOpen 상태로 직접 보이기/숨기기를 맞춘다 (초기 상태는 닫힘이므로 숨김).
    bg.setVisible(false);
    icon.setVisible(false);

    return { bg, icon };
  }

  // 화면 오른쪽 바깥에 미리 만들어두고, 열릴 때 왼쪽으로 슬라이드시키는 단일 패널.
  // 예전엔 무기/보스/배경이 각각 자기만의 컨테이너를 슬라이드시켰지만, 지금은 이 컨테이너 하나를 공유하고
  // 상단 탭 바로 활성 탭(내용물 컨테이너)만 보이거나 숨겨서 바꿔 끼운다.
  createSidePanel({
    currentBossTypeId, currentBackgroundStyle, onWeaponSelect, onBossSelect, onBackgroundSelect,
  }) {
    const panelWidth = 220;
    const height = this.scene.scale.height;
    // 닫힌 상태에서 패널 테두리(stroke)가 화면 오른쪽 끝에 1px씩 비쳐 보이는 것을 막기 위해
    // 캔버스 경계보다 여유 있게 더 바깥에서 시작한다.
    const startX = this.scene.scale.width + 16;
    const openX = this.scene.scale.width - panelWidth;

    const container = this.scene.add.container(startX, 0).setDepth(1000);

    const bg = this.scene.add.rectangle(0, 0, panelWidth, height, PANEL_BG, 0.96)
      .setOrigin(0, 0)
      .setInteractive();
    container.add(bg);

    // 헤더(탭 바)와 본문을 톤 두 단계로 나눠 패널에 단조롭지 않은 깊이감을 준다
    const headerHeight = 40;
    const header = this.scene.add.rectangle(0, 0, panelWidth, headerHeight, PANEL_HEADER_BG)
      .setOrigin(0, 0);
    container.add(header);
    const contentBg = this.scene.add.rectangle(0, headerHeight, panelWidth, height - headerHeight, PANEL_CONTENT_BG)
      .setOrigin(0, 0);
    container.add(contentBg);

    // 탭 바: WEAPON / AGENT(보스) / MAP(배경) 세 칸을 균등하게 나눠 텍스트 탭으로 표시
    const tabW = panelWidth / TAB_ORDER.length;
    const tabY = 20;

    this.tabEls = {};
    TAB_ORDER.forEach((tab, index) => {
      const cx = tabW * index + tabW / 2;
      const highlight = this.scene.add.rectangle(cx, tabY, tabW - 4, 30, PANEL_ACCENT, 0)
        .setInteractive({ useHandCursor: true });
      const label = this.scene.add.text(cx, tabY, TAB_LABELS[tab], {
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#ffffff',
        fontFamily: UI_FONT_FAMILY,
      }).setOrigin(0.5);
      highlight.on('pointerdown', () => this.setActiveTab(tab));
      container.add([highlight, label]);
      this.tabEls[tab] = { highlight, label };
    });

    const divider = this.scene.add.rectangle(0, headerHeight, panelWidth, 2, PANEL_ACCENT, 0.5).setOrigin(0, 0.5);
    container.add(divider);

    // 닫기(X)는 탭 바 안이 아니라 패널 왼쪽 바깥으로 튀어나온 별도 손잡이 버튼으로 뺀다.
    // container의 자식이라 패널 슬라이드 tween을 따로 안 붙여도 패널과 같이 움직인다.
    const handle = this.createPanelHandle(height);
    container.add([handle.bg, handle.icon]);

    const weaponContent = this.createWeaponTabContent(panelWidth, onWeaponSelect);
    const bossContent = this.createBossTabContent(panelWidth, currentBossTypeId, onBossSelect);
    const backgroundContent = this.createBackgroundTabContent(panelWidth, currentBackgroundStyle, onBackgroundSelect);
    container.add([weaponContent.container, bossContent.container, backgroundContent.container]);

    this.tabContents = { weapon: weaponContent, boss: bossContent, background: backgroundContent };
    this.setActiveTab('weapon');

    return {
      container, openX, startX, handle,
    };
  }

  setActiveTab(tab) {
    this.activeTab = tab;
    Object.entries(this.tabEls).forEach(([key, { highlight, label }]) => {
      const isActive = key === tab;
      // 활성 탭은 액센트로 꽉 채워서 그 위 글자를 검정으로, 나머지는 흰 글자로 대비를 준다.
      highlight.setFillStyle(PANEL_ACCENT, isActive ? 1 : 0);
      label.setColor(isActive ? '#000000' : '#ffffff');
    });
    Object.entries(this.tabContents).forEach(([key, content]) => {
      content.container.setVisible(key === tab);
    });
  }

  togglePanel(forceOpen) {
    const shouldOpen = forceOpen === undefined ? !this.panelOpen : forceOpen;
    if (shouldOpen === this.panelOpen) return;
    this.panelOpen = shouldOpen;

    // 손잡이(X)는 패널이 열렸을 때만, 톱니바퀴 버튼은 반대로 패널이 닫혔을 때만 보인다 —
    // 열려있는 동안 톱니바퀴가 패널 반투명 배경 뒤로 희미하게 비쳐 보이던 문제를 막는다.
    this.sidePanel.handle.bg.setVisible(shouldOpen);
    this.sidePanel.handle.icon.setVisible(shouldOpen);
    this.settingsButton.bg.setVisible(!shouldOpen);
    this.settingsButton.icon.setVisible(!shouldOpen);

    const { container, openX, startX } = this.sidePanel;
    this.scene.tweens.add({
      targets: container,
      x: shouldOpen ? openX : startX,
      duration: 280,
      ease: 'Cubic.easeOut',
    });
  }

  // WEAPON/AGENT/MAP 세 탭이 전부 같은 격자 레이아웃을 쓴다: 2열, 아이콘 바로 밑에 이름,
  // 칸 사이 여백으로 분리감을 준다 (예전엔 세로로 한 줄씩 나열해 아이콘이 필요 이상으로 크게 보였다).
  // 항목 수가 적어(각 탭 4개 안팎) 세로 스크롤 없이도 패널 안에 다 들어온다.
  createGridTabContent(panelWidth, items, currentId, onSelect) {
    const container = this.scene.add.container(0, 0);

    const columns = 2;
    const iconSize = 64;
    const colGap = 40;
    const labelGap = 8; // 아이콘 바로 밑 이름 텍스트까지의 간격
    const labelHeight = 14;
    const rowGap = 26; // 칸(아이콘+이름)끼리 분리감을 주는 줄 간격
    const gridWidth = columns * iconSize + (columns - 1) * colGap;
    const gridStartX = (panelWidth - gridWidth) / 2;
    const rowStep = iconSize + labelGap + labelHeight + rowGap;
    const top = 56;

    const optionEls = [];

    items.forEach(({ id, name, texture }, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const cx = gridStartX + col * (iconSize + colGap) + iconSize / 2;
      const cy = top + row * rowStep + iconSize / 2;

      const icon = this.scene.add.image(cx, cy, texture)
        .setDisplaySize(iconSize, iconSize)
        .setInteractive({ useHandCursor: true });
      const border = this.scene.add.rectangle(cx, cy, iconSize + 8, iconSize + 8)
        .setStrokeStyle(3, PANEL_ACCENT, id === currentId ? 1 : 0);
      const label = this.scene.add.text(cx, cy + iconSize / 2 + labelGap, name, {
        fontSize: '11px',
        color: '#ffffff',
        fontFamily: UI_FONT_FAMILY,
        letterSpacing: 0.7,
      }).setOrigin(0.5, 0);

      icon.on('pointerdown', () => onSelect(id));
      container.add([icon, border, label]);
      optionEls.push({ id, border });
    });

    return { container, optionEls };
  }

  createWeaponTabContent(panelWidth, onSelect) {
    const { container, optionEls } = this.createGridTabContent(panelWidth, WEAPON_OPTIONS, null, onSelect);
    this.weaponOptionEls = optionEls;
    return { container };
  }

  setActiveWeaponOption(weaponId) {
    this.weaponOptionEls.forEach(({ id, border }) => {
      border.setStrokeStyle(3, PANEL_ACCENT, id === weaponId ? 1 : 0);
    });
  }

  createBossTabContent(panelWidth, currentBossTypeId, onSelect) {
    const { container, optionEls } = this.createGridTabContent(panelWidth, BOSS_OPTIONS, currentBossTypeId, onSelect);
    this.bossOptionEls = optionEls;
    return { container };
  }

  setActiveBossOption(bossTypeId) {
    this.bossOptionEls.forEach(({ id, border }) => {
      border.setStrokeStyle(3, PANEL_ACCENT, id === bossTypeId ? 1 : 0);
    });
  }

  createBackgroundTabContent(panelWidth, currentStyle, onSelect) {
    const { container, optionEls } = this.createGridTabContent(panelWidth, BACKGROUND_OPTIONS, currentStyle, onSelect);
    this.backgroundOptionEls = optionEls;
    return { container };
  }

  setActiveBackgroundOption(style) {
    this.backgroundOptionEls.forEach(({ id, border }) => {
      border.setStrokeStyle(3, PANEL_ACCENT, id === style ? 1 : 0);
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

  // 게임 전체 톤(그라디언트/외곽선 없는 플랫 스타일)에 맞춰 단색 주황빛 배경 + 단색 글자로 단순하게 구성.
  createRestartButton(x, y, onClick) {
    const width = 160;
    const height = 52;
    const radius = height / 2;

    const bg = this.scene.add.graphics();
    bg.fillStyle(0xffb84d, 1);
    bg.fillRoundedRect(x - width / 2, y - height / 2, width, height, radius);

    const label = this.scene.add.text(x, y, '다시하기', {
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#000000',
      fontFamily: UI_FONT_FAMILY,
    }).setOrigin(0.5);

    const hitArea = new Phaser.Geom.Rectangle(x - width / 2, y - height / 2, width, height);
    bg.setInteractive({ hitArea, hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true });
    if (onClick) bg.on('pointerdown', onClick);

    return { bg, label };
  }

  updateHpBar(boss) {
    const ratio = Phaser.Math.Clamp(boss.hp / boss.maxHp, 0, 1);
    this.hpBar.width = HP_BAR_WIDTH * ratio;
  }

  updateScoreText(score) {
    this.scoreText.setText(`${score}`);
  }
}
