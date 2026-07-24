import Phaser from 'phaser';
import { HP_BAR_WIDTH, HP_BAR_X, HP_BAR_Y } from '../config/constants.js';

export default class Hud {
  constructor(scene, { onDrawButtonClick } = {}) {
    this.scene = scene;

    this.hpBarBg = scene.add.rectangle(HP_BAR_X, HP_BAR_Y, HP_BAR_WIDTH, 16, 0x444444);
    this.hpBar = scene.add.rectangle(HP_BAR_X, HP_BAR_Y, HP_BAR_WIDTH, 16, 0x33cc33);

    this.scoreText = scene.add.text(16, 16, '0', {
      fontSize: '20px',
      color: '#ffffff',
    });

    this.drawButton = this.createDrawButton(onDrawButtonClick);
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
