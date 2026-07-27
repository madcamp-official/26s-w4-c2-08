import Phaser from 'phaser';
import {
  DAMAGE_POPUP_DURATION,
  DEFEAT_POPUP_DURATION,
  DEFEAT_POPUP_COLOR,
  BOSS_PANEL_PUSH_POPUP_COLOR,
  UI_FONT_FAMILY,
  BACKGROUND_STYLE,
  BOSS_TYPES,
  HIT_SPARK_DURATION,
  HIT_SPARK_COLOR,
} from '../config/constants.js';
import Boss from '../entities/Boss.js';
import WeaponManager from '../entities/WeaponManager.js';
import CombatSystem from '../systems/CombatSystem.js';
import Hud from '../ui/Hud.js';
import { gameContext, postToExtension } from '../vscodeBridge.js';
import { submitScore, fetchLeaderboard } from '../api.js';

// 리더보드는 결과 화면 한 화면에 다 넣기엔 길어질 수 있어 상위 5명만 텍스트로 보여준다.
function formatLeaderboard(rows) {
  if (!rows || rows.length === 0) return '리더보드에 아직 기록이 없습니다';
  return rows.slice(0, 5).map((row, i) => `${i + 1}. ${row.userName} - ${row.score}`).join('\n');
}

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

    this.currentBossType = BOSS_TYPES[0].id;
    this.boss = new Boss(this, this.currentBossType);
    this.hud = new Hud(this, {
      onWeaponSelect: (category) => this.onWeaponSelect(category),
      onEndButtonClick: () => this.onEndButtonClick(),
      currentBackgroundStyle: this.currentBackgroundStyle,
      onBackgroundSelect: (style) => this.onBackgroundSelect(style),
      currentBossType: this.currentBossType,
      onBossSelect: (bossTypeId) => this.onBossSelect(bossTypeId),
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

  onEndButtonClick() {
    if (this.isEnded) return;
    this.isEnded = true;

    // scene.pause()는 씬 전체의 입력 처리까지 멈춰서 결과 화면의 "다시하기" 버튼도 눌리지 않게 되므로 쓰지 않는다.
    // 대신 물리 시뮬레이션만 멈추고(투사체 이동·overlap 판정 정지), 투척형 자동 연사 타이머도 따로 끈다.
    // 드래그/뽑기 등 나머지 게임플레이 입력은 각 핸들러에서 isEnded로 개별 차단한다.
    const overlay = this.hud.showGameEndOverlay(this.combat.score, () => this.onRestartButtonClick());
    this.physics.world.pause();
    this.weaponManager.stopAllFiring();

    this.onGameEnd(overlay, this.combat.score);
  }

  // online: 서버에 점수 제출 후 리더보드 조회. 실패해도 게임이 죽으면 안 되므로 try/catch로 감싸고
  // 콘솔 경고 후 로컬 표시로 폴백한다 (docs/API.md 클라이언트 fallback).
  // local: 서버 통신 없이 extension에 saveLocalScore만 보내고, 최고기록은 init 때 받은 값과 이번 점수 중 큰 쪽을 바로 보여준다.
  async onGameEnd(overlay, score) {
    if (gameContext.mode === 'online' && gameContext.groupId) {
      this.hud.setEndOverlayStatus(overlay, '리더보드 불러오는 중...');
      try {
        await submitScore(gameContext.groupId, gameContext.userName, score);
        const leaderboard = await fetchLeaderboard(gameContext.groupId);
        this.hud.setEndOverlayStatus(overlay, formatLeaderboard(leaderboard));
      } catch (e) {
        console.warn('서버 연결 실패, 로컬 표시로 전환', e);
        this.hud.setEndOverlayStatus(overlay, '리더보드를 불러오지 못했습니다 (서버 연결 실패)');
      }
    } else {
      const bestScore = Math.max(gameContext.bestScore, score);
      this.hud.setEndOverlayStatus(overlay, `내 최고 기록: ${bestScore}`);
      postToExtension({ type: 'saveLocalScore', score });
    }
  }

  onRestartButtonClick() {
    this.scene.restart();
  }

  onBackgroundSelect(style) {
    if (style === this.currentBackgroundStyle) return;
    this.currentBackgroundStyle = style;
    this.backgroundImage.setTexture(`battleBackground_${style}`);
  }

  onBossSelect(bossTypeId) {
    if (bossTypeId === this.currentBossType) return;
    this.currentBossType = bossTypeId;
    this.boss.setBossType(bossTypeId);
  }

  onHit(hits = [], defeated = false, deathPosition = null) {
    this.hud.updateHpBar(this.boss);
    this.hud.updateScoreText(this.combat.score);

    if (hits.length > 0) {
      const hitX = hits.reduce((sum, hit) => sum + hit.x, 0) / hits.length;
      const hitY = hits.reduce((sum, hit) => sum + hit.y, 0) / hits.length;
      this.boss.knockback(hitX, hitY);
      this.boss.flash(0xffffff);
      this.boss.registerHits(hits.length);
      this.boss.showHurtFace();
      hits.forEach((hit) => {
        this.spawnDamagePopup(hit);
        this.spawnHitSpark(hit.x, hit.y);
      });
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
    this.spawnHitSpark(x, y, 0xff5050);
    this.boss.flash(0xff3333);
    this.cameras.main.shake(120, 0.008);

    if (defeated) {
      this.spawnDefeatPopup(deathPosition);
    }
  }

  // 타격 지점 이펙트. 이미지 에셋 없이 Phaser 내장 도형(Circle/Star)만 써서 다른 이펙트(팝업 텍스트 등)와
  // 같은 방식으로 tween + destroy on complete로 처리한다. depth를 높게 둬서 보스/무기 뒤로 안 숨는다.
  // 실제 타격감을 위해 세 가지를 겹친다:
  //  1) 코어 플래시 — 맞는 순간 확 밝아졌다 사라지는 흰 빛(가산 블렌드)으로 순간적인 "펑" 느낌
  //  2) 조각별 버스트 — 크기/색을 조각마다 다르게 섞고, 튀어나가기 전에 짧게 팝(overshoot)한 뒤 날아가며
  //     아주 살짝 중력처럼 아래로 처지게 해서 정적인 방사형보다 훨씬 물리적으로 튀는 느낌을 준다
  spawnHitSpark(x, y, color = HIT_SPARK_COLOR) {
    const flash = this.add.circle(x, y, 16, 0xffffff, 0.9)
      .setDepth(999)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: flash,
      scale: 1.8,
      alpha: 0,
      duration: HIT_SPARK_DURATION * 0.5,
      ease: 'Cubic.easeOut',
      onComplete: () => flash.destroy(),
    });

    const shardCount = 8;
    const shardColors = [color, 0xffffff, 0xffb347];
    for (let i = 0; i < shardCount; i += 1) {
      const angle = (Math.PI * 2 * i) / shardCount + Phaser.Math.FloatBetween(-0.35, 0.35);
      const distance = Phaser.Math.Between(28, 56);
      const size = Phaser.Math.Between(7, 13);
      const shardColor = Phaser.Utils.Array.GetRandom(shardColors);
      const shard = this.add.star(x, y, 4, size * 0.4, size, shardColor)
        .setStrokeStyle(2, 0xffffff)
        .setDepth(1000)
        .setScale(0.3)
        .setAngle(Phaser.Math.Between(0, 360));

      this.tweens.add({
        targets: shard,
        scale: 1,
        duration: 60,
        ease: 'Back.easeOut',
        onComplete: () => {
          this.tweens.add({
            targets: shard,
            x: x + Math.cos(angle) * distance,
            y: y + Math.sin(angle) * distance + 10,
            scale: 0.15,
            alpha: 0,
            angle: shard.angle + Phaser.Math.Between(-180, 180),
            duration: HIT_SPARK_DURATION,
            ease: 'Cubic.easeOut',
            onComplete: () => shard.destroy(),
          });
        },
      });
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
