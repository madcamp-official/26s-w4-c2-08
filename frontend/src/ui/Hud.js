import Phaser from 'phaser';
import { HP_BAR_WIDTH, HP_BAR_X, HP_BAR_Y, TOP_HUD_Y, UI_FONT_FAMILY } from '../config/constants.js';

export default class Hud {
  constructor(scene, { onDrawButtonClick, onEndButtonClick } = {}) {
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

  createDrawButton(onClick) {
    const size = 40;
    const x = this.scene.scale.width - size / 2 - 16;
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
