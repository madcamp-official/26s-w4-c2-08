import Phaser from 'phaser';

const HIT_COOLDOWN = 300; // ms
const BASE_DAMAGE_MIN = 5;
const BASE_DAMAGE_MAX = 15;
const HP_BAR_WIDTH = 200;
const HP_BAR_X = 400;
const HP_BAR_Y = 30;
const BOSS_SPAWN = { x: 200, y: 300 };
const DRAW_SCORE_STEP = 100;
const CONTACT_OVERLAP = 4; // px of intentional overlap left at contact so overlap detection still fires

// 1일차 범위: 보스 드래그 이동 → 무기와 충돌 시 데미지 → HP바/점수 갱신 → HP 0 시 즉시 리스폰.
// 무기 종류(설치형/투척형/휴대형), 콤보, 크리티컬, 사운드는 2일차 이후 범위(docs/FRONTEND.md 참고).
export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    this.score = 0;
    this.lastHitTime = 0;
    this.drawsUsed = 0;

    this.weapon = this.physics.add.staticImage(600, 300, 'weapon');
    this.weapons = [this.weapon];

    this.boss = this.physics.add.image(BOSS_SPAWN.x, BOSS_SPAWN.y, 'boss');
    this.boss.maxHp = 1000;
    this.boss.hp = this.boss.maxHp;
    this.boss.setCollideWorldBounds(true);
    this.boss.setInteractive({ draggable: true });
    this.input.setDraggable(this.boss);

    this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
      let x = Phaser.Math.Clamp(dragX, 40, this.scale.width - 40);
      let y = Phaser.Math.Clamp(dragY, 40, this.scale.height - 40);
      ({ x, y } = this.resolveWeaponOverlap(x, y));
      gameObject.setPosition(x, y);
    });

    this.hpBarBg = this.add.rectangle(HP_BAR_X, HP_BAR_Y, HP_BAR_WIDTH, 16, 0x444444);
    this.hpBar = this.add.rectangle(HP_BAR_X, HP_BAR_Y, HP_BAR_WIDTH, 16, 0x33cc33);

    this.scoreText = this.add.text(16, 16, '0', {
      fontSize: '20px',
      color: '#ffffff',
    });

    this.physics.add.overlap(this.boss, this.weapon, this.onBossHitWeapon, null, this);

    this.drawButton = this.createDrawButton();
    this.updateDrawButton();
  }

  createDrawButton() {
    const width = 120;
    const height = 40;
    const x = this.scale.width - width / 2 - 16;
    const y = HP_BAR_Y;

    const bg = this.add.rectangle(x, y, width, height, 0xffaa00).setStrokeStyle(2, 0xffffff);
    const label = this.add.text(x, y, 'Weapon', {
      fontSize: '16px',
      color: '#ffffff',
    }).setOrigin(0.5);

    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerdown', () => this.onDrawButtonClick());

    return { bg, label };
  }

  getAvailableDraws() {
    return Math.floor(this.score / DRAW_SCORE_STEP) - this.drawsUsed;
  }

  updateDrawButton() {
    const active = this.getAvailableDraws() > 0;
    this.drawButton.bg.setAlpha(active ? 1 : 0.35);
    this.drawButton.label.setAlpha(active ? 1 : 0.35);
  }

  onDrawButtonClick() {
    if (this.getAvailableDraws() <= 0) return;
    this.drawsUsed += 1;
    this.spawnRandomWeapon();
    this.updateDrawButton();
  }

  spawnRandomWeapon() {
    const x = Phaser.Math.Between(60, this.scale.width - 60);
    const y = Phaser.Math.Between(80, this.scale.height - 60);
    const weapon = this.physics.add.staticImage(x, y, 'weapon');
    this.weapons.push(weapon);
    this.physics.add.overlap(this.boss, weapon, this.onBossHitWeapon, null, this);
  }

  resolveWeaponOverlap(x, y) {
    const bossHalf = this.boss.displayWidth / 2;
    for (const weapon of this.weapons) {
      const weaponHalf = weapon.displayWidth / 2;
      const dx = x - weapon.x;
      const dy = y - weapon.y;
      const overlapX = bossHalf + weaponHalf - Math.abs(dx);
      const overlapY = bossHalf + weaponHalf - Math.abs(dy);

      if (overlapX > 0 && overlapY > 0) {
        if (overlapX < overlapY) {
          x = weapon.x + Math.sign(dx || 1) * (bossHalf + weaponHalf - CONTACT_OVERLAP);
        } else {
          y = weapon.y + Math.sign(dy || 1) * (bossHalf + weaponHalf - CONTACT_OVERLAP);
        }
      }
    }
    return { x, y };
  }

  onBossHitWeapon() {
    const now = this.time.now;
    if (now - this.lastHitTime < HIT_COOLDOWN) return;
    this.lastHitTime = now;

    const damage = this.rollDamage();
    this.boss.hp -= damage;
    this.score += damage;

    this.updateHpBar();
    this.updateScoreText();
    this.updateDrawButton();

    if (this.boss.hp <= 0) {
      this.respawnBoss();
    }
  }

  rollDamage() {
    return Phaser.Math.Between(BASE_DAMAGE_MIN, BASE_DAMAGE_MAX);
  }

  updateHpBar() {
    const ratio = Phaser.Math.Clamp(this.boss.hp / this.boss.maxHp, 0, 1);
    this.hpBar.width = HP_BAR_WIDTH * ratio;
  }

  updateScoreText() {
    this.scoreText.setText(`${this.score}`);
  }

  respawnBoss() {
    this.boss.hp = this.boss.maxHp;
    this.boss.setPosition(BOSS_SPAWN.x, BOSS_SPAWN.y);
    this.updateHpBar();
  }
}
