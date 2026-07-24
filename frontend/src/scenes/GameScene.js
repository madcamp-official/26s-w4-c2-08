import Phaser from 'phaser';
import { DRAW_SCORE_STEP } from '../config/constants.js';
import Boss from '../entities/Boss.js';
import WeaponManager from '../entities/WeaponManager.js';
import CombatSystem from '../systems/CombatSystem.js';
import Hud from '../ui/Hud.js';

// 1일차 범위: 보스 드래그 이동 → 무기와 충돌 시 데미지 → HP바/점수 갱신 → HP 0 시 즉시 리스폰.
// 무기 종류 중 설치형/휴대형/투척형은 구현됨. 콤보, 크리티컬, 사운드는 2일차 이후 범위(docs/FRONTEND.md 참고).
export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    this.drawsUsed = 0;

    this.boss = new Boss(this);
    this.hud = new Hud(this, { onDrawButtonClick: () => this.onDrawButtonClick() });
    this.combat = new CombatSystem(this, this.boss, () => this.onHit());
    this.weaponManager = new WeaponManager(this, this.boss, () => this.combat.handleHit());

    this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
      let x = Phaser.Math.Clamp(dragX, 40, this.scale.width - 40);
      let y = Phaser.Math.Clamp(dragY, 40, this.scale.height - 40);

      if (this.weaponManager.isPortableWeapon(gameObject)) {
        ({ x, y } = this.weaponManager.resolveOverlapForPortableWeapon(gameObject, x, y));
      } else if (this.weaponManager.isThrowWeapon(gameObject)) {
        // 투척형은 데미지를 투사체가 담당하므로 보스와의 충돌 차단이 필요 없이 위치만 옮기면 된다
      } else {
        ({ x, y } = this.weaponManager.resolveOverlapForBoss(x, y));
      }

      gameObject.setPosition(x, y);
    });

    this.hud.updateDrawButton(this.getAvailableDraws() > 0);
  }

  update() {
    this.weaponManager.updateProjectiles();
  }

  getAvailableDraws() {
    return Math.floor(this.combat.score / DRAW_SCORE_STEP) - this.drawsUsed;
  }

  onDrawButtonClick() {
    if (this.getAvailableDraws() <= 0) return;
    this.drawsUsed += 1;
    this.weaponManager.spawnRandomWeapon();
    this.hud.updateDrawButton(this.getAvailableDraws() > 0);
  }

  onHit() {
    this.hud.updateHpBar(this.boss);
    this.hud.updateScoreText(this.combat.score);
    this.hud.updateDrawButton(this.getAvailableDraws() > 0);
  }
}
