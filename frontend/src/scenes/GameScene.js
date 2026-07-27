import Phaser from 'phaser';
import {
  DAMAGE_POPUP_DURATION,
  DEFEAT_POPUP_DURATION,
  DEFEAT_POPUP_COLOR,
  BOSS_PANEL_PUSH_POPUP_COLOR,
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
    this.selectedWeaponCategory = null;

    this.currentBackgroundStyle = BACKGROUND_STYLE;
    this.backgroundImage = this.add.image(0, 0, `battleBackground_${this.currentBackgroundStyle}`).setOrigin(0, 0);

    this.boss = new Boss(this);
    this.hud = new Hud(this, {
      onWeaponSelect: (category) => this.onWeaponSelect(category),
      onEndButtonClick: () => this.onEndButtonClick(),
      currentBackgroundStyle: this.currentBackgroundStyle,
      onBackgroundSelect: (style) => this.onBackgroundSelect(style),
    });
    this.combat = new CombatSystem(this, this.boss, (hits, defeated, deathPosition) => this.onHit(hits, defeated, deathPosition));
    this.weaponManager = new WeaponManager(this, this.boss, (weapon) => this.combat.handleHit(weapon));
    this.combat.weaponManager = this.weaponManager;

    // 보스는 무기를 고른 뒤에도 항상 드래그로 옮길 수 있다 — 보스 위를 직접 누르면 드래그가 우선.
    this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
      if (this.isEnded) return;
      const x = Phaser.Math.Clamp(dragX, 40, this.scale.width - 40);
      const y = Phaser.Math.Clamp(dragY, 40, this.scale.height - 40);
      this.boss.setPosition(x, y);
    });

    // 카테고리를 고른 뒤 필드(UI도, 보스 위도 아님)를 누르고 있는 동안에만 그 자리에 무기가 나타나 보스를 때리고,
    // 손을 떼면 사라진다. 보스 위를 직접 누르면 위 'drag' 리스너가 대신 처리하므로 여기서는 건너뛴다.
    this.input.on('pointerdown', (pointer) => {
      if (this.isEnded) return;
      if (!this.selectedWeaponCategory) return;
      if (this.hud.isPointerOnUI(pointer)) return;
      if (Phaser.Geom.Rectangle.Contains(this.boss.sprite.getBounds(), pointer.x, pointer.y)) return;

      const x = Phaser.Math.Clamp(pointer.x, 40, this.scale.width - 40);
      const y = Phaser.Math.Clamp(pointer.y, 40, this.scale.height - 40);
      this.weaponManager.spawnAt(this.selectedWeaponCategory, x, y);
    });

    this.input.on('pointermove', (pointer) => {
      if (this.isEnded) return;
      if (!pointer.isDown) return;
      const x = Phaser.Math.Clamp(pointer.x, 40, this.scale.width - 40);
      const y = Phaser.Math.Clamp(pointer.y, 40, this.scale.height - 40);
      this.weaponManager.moveActiveWeapon(x, y);
    });

    this.input.on('pointerup', () => {
      this.weaponManager.releaseActiveWeapon();
    });
  }

  update() {
    this.weaponManager.updateProjectiles();
    this.checkBossAgainstPanel();
  }

  // 무기/배경 패널이 열려 화면 오른쪽을 덮는 동안 그 영역에 보스가 있으면(패널이 슬라이드로 덮거나, 드래그로
  // 그 안에 밀어넣거나) 왼쪽 벽까지 날려보내 패널에 가려지지 않게 하고, 도착 시 보너스 데미지도 입힌다.
  checkBossAgainstPanel() {
    if (this.isEnded) return;
    if (this.boss.isPanelBounceActive) return;

    const panelBoundaryX = this.hud.getOpenPanelBoundaryX();
    if (panelBoundaryX == null) return;
    if (this.boss.sprite.getBounds().right <= panelBoundaryX) return;

    this.boss.flyOutToLeftWall((x, y) => this.onPanelPushLanding(x, y));
  }

  onWeaponSelect(category) {
    this.selectedWeaponCategory = category;
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

    if (hits.length > 0) {
      const hitX = hits.reduce((sum, hit) => sum + hit.x, 0) / hits.length;
      const hitY = hits.reduce((sum, hit) => sum + hit.y, 0) / hits.length;
      this.boss.knockback(hitX, hitY);
      this.boss.flash(0xffffff);
      this.boss.showHurtFace();
      hits.forEach((hit) => this.spawnDamagePopup(hit));
    }
    if (defeated) {
      this.spawnDefeatPopup(deathPosition);
    }
  }

  // 패널 충돌로 왼쪽 벽까지 날아간 뒤(Boss.flyOutToLeftWall의 onComplete) 호출되는 보너스 데미지 처리.
  onPanelPushLanding(x, y) {
    if (this.isEnded) return;

    const { amount, defeated, deathPosition } = this.combat.applyPanelPushDamage();
    this.hud.updateHpBar(this.boss);
    this.hud.updateScoreText(this.combat.score);
    this.spawnDamagePopup({ amount, x, y, color: BOSS_PANEL_PUSH_POPUP_COLOR });
    this.boss.flash(0xff3333);
    this.cameras.main.shake(120, 0.008);

    if (defeated) {
      this.spawnDefeatPopup(deathPosition);
    }
  }

  spawnDamagePopup({ amount, x, y, color = '#ffffff' }) {
    const text = this.add.text(x + Phaser.Math.Between(-10, 10), y - 20, `${amount}`, {
      fontSize: '18px',
      color,
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
