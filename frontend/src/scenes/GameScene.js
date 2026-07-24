import Phaser from 'phaser';
import {
  TRASH_SCORE_BONUS,
  DAMAGE_POPUP_DURATION,
  DEFEAT_POPUP_DURATION,
  BOOSTED_POPUP_COLOR,
  DEFEAT_POPUP_COLOR,
  UI_FONT_FAMILY,
  BACKGROUND_STYLE,
} from '../config/constants.js';
import Boss from '../entities/Boss.js';
import WeaponManager from '../entities/WeaponManager.js';
import CombatSystem from '../systems/CombatSystem.js';
import Hud from '../ui/Hud.js';

// 구현 현황은 docs/FRONTEND.md#구현-현황 참고. 콤보 시스템/크리티컬 히트는 구현하지 않기로 결정, 사운드는 아직 미구현.
export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    this.isEnded = false;

    this.currentBackgroundStyle = BACKGROUND_STYLE;
    this.backgroundImage = this.add.image(0, 0, `battleBackground_${this.currentBackgroundStyle}`).setOrigin(0, 0);

    this.boss = new Boss(this);
    this.hud = new Hud(this, {
      onBuyWeapon: (typeId, cost) => this.onBuyWeapon(typeId, cost),
      onEndButtonClick: () => this.onEndButtonClick(),
      currentBackgroundStyle: this.currentBackgroundStyle,
      onBackgroundSelect: (style) => this.onBackgroundSelect(style),
    });
    this.combat = new CombatSystem(this, this.boss, (hits, defeated, deathPosition) => this.onHit(hits, defeated, deathPosition));
    this.weaponManager = new WeaponManager(this, this.boss, () => this.combat.handleHit());
    this.combat.weaponManager = this.weaponManager;

    this.weaponManager.spawnRandomWeapon(); // 필드가 비어있으면 구매 자체가 불가능하므로 시작 시 무료로 하나 배치

    this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
      if (this.isEnded) return;

      let x = Phaser.Math.Clamp(dragX, 40, this.scale.width - 40);
      let y = Phaser.Math.Clamp(dragY, 40, this.scale.height - 40);

      if (this.weaponManager.isWeapon(gameObject) || this.weaponManager.isPortableWeapon(gameObject)) {
        ({ x, y } = this.weaponManager.resolveOverlapForDraggedWeapon(gameObject, x, y));
      } else if (this.weaponManager.isThrowWeapon(gameObject)) {
        // 투척형은 데미지를 투사체가 담당하므로 보스와의 충돌 차단이 필요 없이 위치만 옮기면 된다
      } else {
        ({ x, y } = this.weaponManager.resolveOverlapForBoss(x, y));
      }

      gameObject.setPosition(x, y);
    });

    this.input.on('dragend', (pointer, gameObject) => {
      if (this.isEnded) return;
      if (!this.weaponManager.isAnyWeapon(gameObject)) return;

      const droppedOnTrash = Phaser.Geom.Intersects.RectangleToRectangle(gameObject.getBounds(), this.hud.getTrashBounds());
      if (droppedOnTrash && this.weaponManager.getTotalWeaponCount() > 1) {
        this.weaponManager.destroyWeapon(gameObject);
        this.combat.score += TRASH_SCORE_BONUS;
        this.onHit();
        return;
      }
      if (droppedOnTrash) return; // 남은 무기가 1개뿐이면 버릴 수 없음

      this.weaponManager.tryMergeWeapon(gameObject);
    });

    this.hud.updateShopPanel(this.combat.score);
  }

  update() {
    this.weaponManager.updateProjectiles();
  }

  onBuyWeapon(typeId, cost) {
    if (this.isEnded) return;
    if (this.combat.score < cost) return;
    this.combat.score -= cost;
    this.weaponManager.spawnWeapon(typeId);
    this.hud.updateScoreText(this.combat.score);
    this.hud.updateShopPanel(this.combat.score);
  }

  // 온라인/로컬 분기(점수 제출, 리더보드 조회)는 webview 연동 이후 붙일 예정 — 지금은 세션을 멈추고 최종 점수만 보여준다
  onEndButtonClick() {
    if (this.isEnded) return;
    this.isEnded = true;

    // scene.pause()는 씬 전체의 입력 처리까지 멈춰서 결과 화면의 "다시하기" 버튼도 눌리지 않게 되므로 쓰지 않는다.
    // 대신 물리 시뮬레이션만 멈추고(투사체 이동·overlap 판정 정지), 투척형 자동 연사 타이머도 따로 끈다.
    // 드래그/뽑기 등 나머지 게임플레이 입력은 각 핸들러에서 isEnded로 개별 차단한다.
    this.hud.showGameEndOverlay(this.combat.score, () => this.onRestartButtonClick());
    this.physics.world.pause();
    this.weaponManager.stopAllFiring();
  }

  onRestartButtonClick() {
    this.scene.restart();
  }

  onBackgroundSelect(style) {
    if (style === this.currentBackgroundStyle) return;
    this.currentBackgroundStyle = style;
    this.backgroundImage.setTexture(`battleBackground_${style}`);
  }

  onHit(hits = [], defeated = false, deathPosition = null) {
    this.hud.updateHpBar(this.boss);
    this.hud.updateScoreText(this.combat.score);
    this.hud.updateShopPanel(this.combat.score);

    if (hits.length > 0) {
      this.boss.shake();
      this.boss.flash(0xffffff);
      this.boss.showHurtFace();
      hits.forEach((hit) => this.spawnDamagePopup(hit));
    }
    if (defeated) {
      this.spawnDefeatPopup(deathPosition);
    }
  }

  spawnDamagePopup({ amount, isBoosted, x, y }) {
    const text = this.add.text(x + Phaser.Math.Between(-10, 10), y - 20, `${amount}`, {
      fontSize: isBoosted ? '26px' : '18px',
      color: isBoosted ? BOOSTED_POPUP_COLOR : '#ffffff',
      fontStyle: 'bold',
      fontFamily: UI_FONT_FAMILY,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: text,
      y: text.y - 40,
      alpha: 0,
      duration: DAMAGE_POPUP_DURATION,
      ease: 'Cubic.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  spawnDefeatPopup(position) {
    const text = this.add.text(position.x, position.y - 60, '처치!', {
      fontSize: '30px',
      color: DEFEAT_POPUP_COLOR,
      fontStyle: 'bold',
      fontFamily: UI_FONT_FAMILY,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: text,
      y: text.y - 30,
      alpha: 0,
      duration: DEFEAT_POPUP_DURATION,
      ease: 'Cubic.easeOut',
      onComplete: () => text.destroy(),
    });
  }
}
