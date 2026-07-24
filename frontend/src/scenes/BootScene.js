import Phaser from 'phaser';

// 실제 스프라이트/사운드 에셋이 준비되기 전까지 사용하는 placeholder 텍스처.
// 에셋 파일이 추가되면 이 생성 로직 대신 this.load.image(...) / this.load.audio(...)로 교체한다.
export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create() {
    this.createPlaceholderTextures();
    this.scene.start('GameScene');
  }

  createPlaceholderTextures() {
    const g = this.add.graphics();

    g.fillStyle(0xcc3333, 1);
    g.fillCircle(40, 40, 40);
    g.generateTexture('boss', 80, 80);

    g.clear();
    g.fillStyle(0x3366cc, 1);
    g.fillRect(0, 0, 50, 50);
    g.generateTexture('weapon', 50, 50);

    g.clear();
    g.fillStyle(0x3366cc, 1);
    g.fillTriangle(25, 0, 0, 50, 50, 50);
    g.generateTexture('weapon_portable', 50, 50);

    g.destroy();
  }
}
