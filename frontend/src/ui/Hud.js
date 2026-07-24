import Phaser from 'phaser';
import { HP_BAR_WIDTH, HP_BAR_X, HP_BAR_Y, UI_FONT_FAMILY } from '../config/constants.js';

export default class Hud {
  constructor(scene, { onDrawButtonClick, onEndButtonClick } = {}) {
    this.scene = scene;

    this.hpBarBg = scene.add.rectangle(HP_BAR_X, HP_BAR_Y, HP_BAR_WIDTH, 16, 0x444444);
    this.hpBar = scene.add.rectangle(HP_BAR_X, HP_BAR_Y, HP_BAR_WIDTH, 16, 0x33cc33);

    this.scoreText = scene.add.text(16, 16, '0', {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: UI_FONT_FAMILY,
    });

    this.drawButton = this.createDrawButton(onDrawButtonClick);
    this.trashCan = this.createTrashCan();
    this.endButton = this.createEndButton(onEndButtonClick);
  }

  createEndButton(onClick) {
    const width = 90;
    const height = 40;
    const x = this.scene.scale.width - width / 2 - 16;
    const y = HP_BAR_Y + height + 12;

    const bg = this.scene.add.rectangle(x, y, width, height, 0x555555)
    const label = this.scene.add.text(x, y, 'End', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: UI_FONT_FAMILY,
    }).setOrigin(0.5);

    bg.setInteractive({ useHandCursor: true });
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

  createTrashCan() {
    const width = 90;
    const height = 40;
    const x = this.scene.scale.width - width / 2 - 16;
    const y = this.scene.scale.height - height / 2 - 16;

    const bg = this.scene.add.rectangle(x, y, width, height, 0x882222)
    const label = this.scene.add.text(x, y, 'Trash', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: UI_FONT_FAMILY,
    }).setOrigin(0.5);

    return { bg, label };
  }

  getTrashBounds() {
    return this.trashCan.bg.getBounds();
  }

  createDrawButton(onClick) {
    const width = 120;
    const height = 40;
    const x = this.scene.scale.width - width / 2 - 16;
    const y = HP_BAR_Y;

    const bg = this.scene.add.rectangle(x, y, width, height, 0xffaa00)
    const label = this.scene.add.text(x, y, 'Weapon', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: UI_FONT_FAMILY,
    }).setOrigin(0.5);

    bg.setInteractive({ useHandCursor: true });
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

  updateDrawButton(active) {
    this.drawButton.bg.setAlpha(active ? 1 : 0.35);
    this.drawButton.label.setAlpha(active ? 1 : 0.35);
  }
}
