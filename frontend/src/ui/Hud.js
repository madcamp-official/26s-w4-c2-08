import Phaser from 'phaser';
import {
  HP_BAR_WIDTH, HP_BAR_X, HP_BAR_Y, TOP_HUD_Y, UI_FONT_FAMILY, BOSS_TYPES,
  WEAPON_DEFINITIONS, HIT_SPARK_COLOR,
} from '../config/constants.js';
import { BACKGROUND_STYLES } from '../config/backgrounds.js';
import { BOSS_MARGIN_LEFT, BOSS_TEXTURE_WIDTH } from '../entities/bossSprite.js';

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

// 보스 텍스처(bossSprite.js)는 왼쪽에 상태 마크(느낌표/분노) 자리를 위한 여백(SIDE_MARGIN)이 있어서,
// 그 텍스처를 그대로 정사각형 아이콘에 채우면 몸통 실루엣이 오른쪽으로 치우쳐 보인다.
// 아이콘을 이 비율(아이콘 크기 대비)만큼 왼쪽으로 당겨서 시각적으로 가운데에 오게 맞춘다.
const BOSS_ICON_OFFSET_X_RATIO = -(BOSS_MARGIN_LEFT / 2) / BOSS_TEXTURE_WIDTH;

export default class Hud {
  constructor(scene, {
    onWeaponSelect, onEndButtonClick, currentBackgroundStyle, onBackgroundSelect,
    currentBossType, onBossSelect,
  } = {}) {
    this.scene = scene;

    // isPointerOnUI가 "UI 위"를 판단할 때 currentlyOver를 걸러내는 기준. 보스 스프라이트도
    // (드래그 때문에) 인터랙티브라 currentlyOver에 같이 잡힐 수 있어서, 길이만 보면 안 되고
    // 실제로 Hud가 만든 인터랙티브 오브젝트인지 이 Set으로 확인해야 한다.
    this.uiElements = new Set();

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
  // currentlyOver: 씬 레벨 pointerdown/pointermove 리스너에 Phaser가 같이 넘겨주는, 클릭/이동이
  // 시작된 그 순간의 히트테스트 스냅샷. 이걸 그대로 써야 하는 이유 — 탭/옵션/패널 닫기 손잡이 같은
  // 오브젝트 자신의 pointerdown 핸들러가 씬 레벨 리스너보다 먼저 실행되면서 그 자리에서 바로 panelOpen을
  // 바꾸거나(패널 열기/닫기) 자기 자신을 숨겨버리는데(닫기 손잡이, togglePanel의 setVisible(false)),
  // 그 뒤에 새로 hitTestPointer를 다시 돌리면 이미 상태가 바뀌거나 사라진 걸 못 잡아 "패널 닫기 버튼을
  // 눌렀는데 그 자리에 필드 무기가 스폰되는" 버그가 생긴다. currentlyOver는 그런 변경이 일어나기 전에
  // 계산된 스냅샷이라 이 타이밍 문제가 없다.
  // currentlyOver.length만 보면 안 되는 이유 — 보스 스프라이트도 드래그 때문에 인터랙티브라 무기를
  // 들고 커서가 보스 위를 지나가기만 해도 currentlyOver에 잡힌다. uiElements(Hud가 만든 인터랙티브
  // 오브젝트만 모아둔 Set)에 실제로 속하는지로 걸러야 "보스 위를 지나가면 들고 있던 무기가 사라지는" 오판을 막는다.
  isPointerOnUI(currentlyOver) {
    return currentlyOver.some((obj) => this.uiElements.has(obj));
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

    // GameScene의 방치(idle) 드리프트가 보스를 이 버튼 쪽으로 끌고 가는 목표 좌표로 쓴다.
    this.endButtonPosition = { x, y };

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
    this.uiElements.add(bg);

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
    this.uiElements.add(bg);

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
    this.uiElements.add(bg);

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
      this.uiElements.add(highlight);
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

    // 무기가 늘어나 격자가 헤더 아래 본문 높이(contentAreaHeight)를 넘어가면 스크롤이 필요하다 —
    // 탭 바/구분선 아래쪽만 보이도록 사각 마스크로 잘라낸다.
    // 주의: Phaser의 GeometryMask는 Canvas 렌더러에서 마스크용 Graphics를 부모 컨테이너의 transform 없이
    // (parentMatrix=null) 그린다 — 그래서 이 마스크를 슬라이드되는 container의 자식으로 넣으면 마스크
    // 위치가 실제 패널 위치와 어긋나 전부 잘려나간다. container 밖의 독립 객체로 두고, 아래
    // togglePanel 트윈에서 container.x와 같이 움직이게 해서 슬라이드 중에도 위치가 맞게 한다.
    const contentAreaHeight = height - headerHeight;
    const maskShape = this.scene.add.graphics().fillStyle(0xffffff).fillRect(0, headerHeight, panelWidth, contentAreaHeight);
    maskShape.setPosition(startX, 0);
    maskShape.setVisible(false); // 마스크 소스로만 쓰고 화면엔 안 그린다 — 안 숨기면 흰 사각형이 그대로 패널을 덮어버린다.
    const contentMask = maskShape.createGeometryMask();
    [weaponContent, bossContent, backgroundContent].forEach(({ container: c }) => c.setMask(contentMask));
    this.maskShape = maskShape;

    this.tabContents = { weapon: weaponContent, boss: bossContent, background: backgroundContent };
    this.contentAreaHeight = contentAreaHeight;
    this.setActiveTab('weapon');

    // 패널이 열려 있는 동안만 휠로 활성 탭을 스크롤한다. 콘텐츠가 본문보다 짧으면 minY가 0 이상이라
    // 클램프 결과 항상 0으로 고정돼 스크롤이 안 먹는 것처럼(=필요 없으므로) 자연스럽게 동작한다.
    this.scene.input.on('wheel', (pointer, currentlyOver, dx, dy) => {
      if (!this.panelOpen) return;
      const content = this.tabContents[this.activeTab];
      const minY = Math.min(0, this.contentAreaHeight - content.contentHeight);
      content.container.y = Phaser.Math.Clamp(content.container.y - dy, minY, 0);
    });

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

    // 열 때마다 스크롤 위치를 맨 위로 되돌려서, 스크롤해 둔 채 닫았다가 다시 열었을 때
    // 첫 줄이 안 보여 패널이 비어 보이는 혼란을 막는다.
    if (shouldOpen) {
      Object.values(this.tabContents).forEach((content) => { content.container.y = 0; });
    }
    this.scene.sound.play('panel_open');

    // 손잡이(X)는 패널이 열렸을 때만, 톱니바퀴 버튼은 반대로 패널이 닫혔을 때만 보인다 —
    // 열려있는 동안 톱니바퀴가 패널 반투명 배경 뒤로 희미하게 비쳐 보이던 문제를 막는다.
    this.sidePanel.handle.bg.setVisible(shouldOpen);
    this.sidePanel.handle.icon.setVisible(shouldOpen);
    this.settingsButton.bg.setVisible(!shouldOpen);
    this.settingsButton.icon.setVisible(!shouldOpen);

    const { container, openX, startX } = this.sidePanel;
    // maskShape는 container 밖의 독립 객체라(위 createSidePanel 주석 참고) 같이 슬라이드되도록
    // 트윈 타깃에 같이 넣어준다 — 안 그러면 패널만 움직이고 마스크는 그대로 남아 다시 어긋난다.
    this.scene.tweens.add({
      targets: [container, this.maskShape],
      x: shouldOpen ? openX : startX,
      duration: 280,
      ease: 'Cubic.easeOut',
    });
  }

  // WEAPON/AGENT/MAP 세 탭이 전부 같은 격자 레이아웃을 쓴다: 2열, 아이콘 바로 밑에 이름,
  // 칸 사이 여백으로 분리감을 준다 (예전엔 세로로 한 줄씩 나열해 아이콘이 필요 이상으로 크게 보였다).
  // 무기가 늘어나 패널 높이를 넘어가면 createSidePanel이 이 contentHeight로 스크롤 가능 범위를 계산한다.
  // showLabel: false면 아이콘 밑 이름 텍스트를 안 그린다(AGENT/MAP 탭 — 아이콘만으로 구분 가능해서 글자 없이 간결하게).
  // iconOffsetXRatio: 아이콘 크기 대비 비율로 아이콘만 좌우로 살짝 밀어준다(테두리 박스는 그대로 중앙) —
  // 보스 텍스처처럼 이미지 자체 여백 때문에 시각적으로 안 맞는 경우 보정하는 용도(BOSS_ICON_OFFSET_X_RATIO 참고).
  createGridTabContent(panelWidth, items, currentId, onSelect, { showLabel = true, iconOffsetXRatio = 0 } = {}) {
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
    const rows = Math.ceil(items.length / columns);
    const contentHeight = top + rows * rowStep;

    const optionEls = [];

    items.forEach(({ id, name, texture }, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const cx = gridStartX + col * (iconSize + colGap) + iconSize / 2;
      const cy = top + row * rowStep + iconSize / 2;

      const icon = this.scene.add.image(cx + iconOffsetXRatio * iconSize, cy, texture)
        .setDisplaySize(iconSize, iconSize)
        .setInteractive({ useHandCursor: true });
      const border = this.scene.add.rectangle(cx, cy, iconSize + 8, iconSize + 8)
        .setStrokeStyle(3, PANEL_ACCENT, id === currentId ? 1 : 0);

      icon.on('pointerdown', () => onSelect(id));
      this.uiElements.add(icon);
      const elements = [icon, border];
      if (showLabel) {
        const label = this.scene.add.text(cx, cy + iconSize / 2 + labelGap, name, {
          fontSize: '11px',
          color: '#ffffff',
          fontFamily: UI_FONT_FAMILY,
          letterSpacing: 0.7,
        }).setOrigin(0.5, 0);
        elements.push(label);
      }
      container.add(elements);
      optionEls.push({ id, border });
    });

    return { container, optionEls, contentHeight };
  }

  createWeaponTabContent(panelWidth, onSelect) {
    const { container, optionEls, contentHeight } = this.createGridTabContent(panelWidth, WEAPON_OPTIONS, null, onSelect);
    this.weaponOptionEls = optionEls;
    return { container, contentHeight };
  }

  setActiveWeaponOption(weaponId) {
    this.weaponOptionEls.forEach(({ id, border }) => {
      border.setStrokeStyle(3, PANEL_ACCENT, id === weaponId ? 1 : 0);
    });
  }

  createBossTabContent(panelWidth, currentBossTypeId, onSelect) {
    const { container, optionEls, contentHeight } = this.createGridTabContent(panelWidth, BOSS_OPTIONS, currentBossTypeId, onSelect, {
      showLabel: false,
      iconOffsetXRatio: BOSS_ICON_OFFSET_X_RATIO,
    });
    this.bossOptionEls = optionEls;
    return { container, contentHeight };
  }

  setActiveBossOption(bossTypeId) {
    this.bossOptionEls.forEach(({ id, border }) => {
      border.setStrokeStyle(3, PANEL_ACCENT, id === bossTypeId ? 1 : 0);
    });
  }

  createBackgroundTabContent(panelWidth, currentStyle, onSelect) {
    const { container, optionEls, contentHeight } = this.createGridTabContent(panelWidth, BACKGROUND_OPTIONS, currentStyle, onSelect, {
      showLabel: false,
    });
    this.backgroundOptionEls = optionEls;
    return { container, contentHeight };
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
    const restartButton = this.createRestartButton(width / 2, height / 2 + 180, onRestartClick);

    return { dim, title, scoreText, statusText, restartButton };
  }

  // onGameEnd(리더보드 로딩/결과, 로컬 최고기록)이 결과 화면에 텍스트를 채워 넣을 때 쓴다.
  setEndOverlayStatus(overlay, text) {
    overlay.statusText.setText(text);
  }

  // 게임 전체 톤(그라디언트/외곽선 없는 플랫 스타일)에 맞춰 단색 주황빛 배경 + 단색 글자로 단순하게 구성.
  // 클릭으로 바로 재시작하지 않는다 — 버튼 자체를 무기처럼 들어서(드래그) 버튼 바로 위에 떠 있는
  // 작은 에이전트에 부딪혀야("타격") 재시작이 실행된다. bg를 무기/보스처럼 x,y에 위치시키고
  // 도형은 그 로컬 원점(0,0) 기준으로 그려야, 드래그 중 bg.x/y를 옮기는 것만으로 그림과 히트 영역이
  // 같이 따라온다 (예전처럼 fillRoundedRect에 절대좌표를 그대로 구워버리면 object.x/y가 항상 0으로
  // 남아 드래그를 걸 수 없다).
  createRestartButton(x, y, onClick) {
    // 캐릭터(agent)는 30% 키우고 버튼은 30% 줄여서, 화면에서 "작은 버튼으로 큰 상대를 맞히는" 느낌을 강조한다.
    const width = 160 * 0.7;
    const height = 52 * 0.7;
    const radius = height / 2;

    const bg = this.scene.add.graphics().setPosition(x, y);
    bg.fillStyle(0xffb84d, 1);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, radius);

    const label = this.scene.add.text(x, y, '다시하기', {
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#000000',
      fontFamily: UI_FONT_FAMILY,
    }).setOrigin(0.5);

    const hitArea = new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height);
    bg.setInteractive({ hitArea, hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true });
    this.scene.input.setDraggable(bg);
    this.uiElements.add(bg);

    const agent = this.createRestartTargetAgent(x, y - height / 2);

    let hasHit = false;

    // GameScene 전역 'drag' 리스너(this.input.on('drag', ...))도 같이 발동하지만 isEnded일 때
    // markInteraction() 후 곧바로 return하므로 여기 로직과 충돌하지 않는다 — 이 오브젝트 전용
    // 'drag' 이벤트만으로 위치/충돌 판정을 전부 처리한다.
    bg.on('drag', (pointer, dragX, dragY) => {
      if (hasHit) return;
      bg.x = dragX;
      bg.y = dragY;
      label.setPosition(bg.x, bg.y);

      const buttonRect = new Phaser.Geom.Rectangle(bg.x - width / 2, bg.y - height / 2, width, height);
      if (Phaser.Geom.Intersects.RectangleToRectangle(buttonRect, agent.image.getBounds())) {
        hasHit = true;
        this.onRestartHit(agent, () => onClick?.());
      }
    });

    // 못 맞히고 손을 뗐으면 다음 시도를 위해 원래 자리로 되돌아온다.
    bg.on('dragend', () => {
      if (hasHit) return;
      this.scene.tweens.add({
        targets: [bg, label],
        x,
        y,
        duration: 200,
        ease: 'Back.easeOut',
      });
    });

    return {
      bg, label, agent,
    };
  }

  // 다시하기 버튼 위에 떠 있는 작은 타격 대상. 현재 선택된 보스 타입 텍스처를 그대로 재사용해서
  // "다시하기 = 이 에이전트를 한 번 더 때려잡기"라는 게임 톤을 유지한다.
  createRestartTargetAgent(x, y) {
    const size = 48 * 1.3;
    const gap = 30;
    const centerY = y - size / 2 - gap;
    const image = this.scene.add.image(x - 4, centerY, `boss_${this.scene.currentBossType}_d0`).setDisplaySize(size, size);

    const bob = this.scene.tweens.add({
      targets: image,
      y: centerY - 8,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    return { image, bob };
  }

  // 에이전트에 버튼이 부딪힌 순간의 연출(스파크/플래시/축소소멸) 후 실제 재시작 콜백을 호출한다.
  // 다른 타격 이펙트(spawnHitSpark)는 GameScene에만 있어서 this.scene을 통해 그대로 재사용한다.
  onRestartHit(agent, onDone) {
    agent.bob.remove();
    this.scene.sound.play('bat_hit');
    this.scene.spawnHitSpark(agent.image.x, agent.image.y, HIT_SPARK_COLOR, 1.4);
    agent.image.setTintFill(0xffffff);

    this.scene.tweens.add({
      targets: agent.image,
      scaleX: agent.image.scaleX * 1.3,
      scaleY: agent.image.scaleY * 1.3,
      alpha: 0,
      duration: 260,
      ease: 'Back.easeIn',
      onComplete: () => agent.image.destroy(),
    });

    this.scene.time.delayedCall(220, onDone);
  }

  updateHpBar(boss) {
    const ratio = Phaser.Math.Clamp(boss.hp / boss.maxHp, 0, 1);
    this.hpBar.width = HP_BAR_WIDTH * ratio;
  }

  updateScoreText(score) {
    this.scoreText.setText(`${score}`);
  }
}
