import Phaser from 'phaser';
import {
  DAMAGE_POPUP_DURATION,
  DEFEAT_POPUP_DURATION,
  DEFEAT_POPUP_COLOR,
  BOSS_PANEL_PUSH_POPUP_COLOR,
  AGENT_TAUNT_POPUP_DURATION,
  AGENT_TAUNT_TYPING_SPEED,
  getAgentTauntLines,
  UI_FONT_FAMILY,
  BACKGROUND_STYLE,
  BOSS_TYPES,
  HIT_SPARK_DURATION,
  HIT_SPARK_COLOR,
  WEAPON_IDS,
  WEAPON_DEFINITIONS,
  SNIPER_SCOPE_DIAMETER,
  SNIPER_SCOPE_ZOOM,
  SNIPER_SCOPE_MARGIN,
} from '../config/constants.js';
import Boss from '../entities/Boss.js';
import WeaponManager from '../entities/WeaponManager.js';
import CombatSystem from '../systems/CombatSystem.js';
import Hud from '../ui/Hud.js';
import { gameContext, postToExtension, onAgentTaunt } from '../vscodeBridge.js';
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
    this.selectedWeaponId = null;

    this.currentBackgroundStyle = BACKGROUND_STYLE;
    this.backgroundImage = this.add.image(0, 0, `battleBackground_${this.currentBackgroundStyle}`).setOrigin(0, 0);

    this.currentBossType = BOSS_TYPES[0].id;
    this.boss = new Boss(this, this.currentBossType);
    this.hud = new Hud(this, {
      onWeaponSelect: (weaponId) => this.onWeaponSelect(weaponId),
      onEndButtonClick: () => this.onEndButtonClick(),
      currentBackgroundStyle: this.currentBackgroundStyle,
      onBackgroundSelect: (style) => this.onBackgroundSelect(style),
      currentBossType: this.currentBossType,
      onBossSelect: (bossTypeId) => this.onBossSelect(bossTypeId),
    });
    this.combat = new CombatSystem(this, this.boss, (hits, defeated, deathPosition) => this.onHit(hits, defeated, deathPosition));
    this.combat.onPet = (amount, point) => this.onPet(amount, point);
    // heals 무기(착한 손)는 데미지가 아니라 힐링이라 combat.handleHit이 아니라 handlePet으로 따로 보낸다.
    // weaponId를 하드코딩하지 않고 WEAPON_DEFINITIONS[id].heals로 판단해서 힐링 무기가 늘어나도 여기 안 고쳐도 되게 한다.
    this.weaponManager = new WeaponManager(this, this.boss, (weapon) => {
      if (WEAPON_DEFINITIONS[weapon.weaponId]?.heals) this.combat.handlePet(weapon);
      else this.combat.handleHit(weapon);
    });
    this.combat.weaponManager = this.weaponManager;

    this.sniperScope = this.createSniperScope();

    // 보스는 무기를 고른 뒤에도 항상 드래그로 옮길 수 있다 — 보스 위를 직접 누르면 드래그가 우선.
    this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
      if (this.isEnded) return;
      if (this.boss.isFrozen) return; // 디버거(브레이크포인트)에 맞은 동안은 드래그로 못 옮긴다.
      const x = Phaser.Math.Clamp(dragX, 40, this.scale.width - 40);
      const y = Phaser.Math.Clamp(dragY, 40, this.scale.height - 40);
      this.boss.setPosition(x, y);
    });

    // 무기를 고른 뒤 필드(UI도, 보스 위도 아님)를 누르고 있는 동안에만 그 자리에 무기가 나타나 보스를 때리고,
    // 손을 떼면 사라진다. 보스 위를 직접 누르면 위 'drag' 리스너가 대신 처리하므로 여기서는 건너뛴다.
    this.input.on('pointerdown', (pointer) => {
      if (this.isEnded) return;
      if (!this.selectedWeaponId) return;
      if (this.hud.isPointerOnUI(pointer)) return;
      if (Phaser.Geom.Rectangle.Contains(this.boss.sprite.getBounds(), pointer.x, pointer.y)) return;

      const x = Phaser.Math.Clamp(pointer.x, 40, this.scale.width - 40);
      const y = Phaser.Math.Clamp(pointer.y, 40, this.scale.height - 40);
      this.weaponManager.spawnAt(this.selectedWeaponId, x, y);
      // 저격총(zoomOnAim)을 들고 있는 동안만 왼쪽 위에 확대 스코프 뷰를 띄운다.
      if (WEAPON_DEFINITIONS[this.selectedWeaponId]?.zoomOnAim) this.setSniperScopeVisible(true);
    });

    this.input.on('pointermove', (pointer) => {
      if (this.isEnded) return;
      if (!pointer.isDown) return;
      const x = Phaser.Math.Clamp(pointer.x, 40, this.scale.width - 40);
      const y = Phaser.Math.Clamp(pointer.y, 40, this.scale.height - 40);
      this.weaponManager.moveActiveWeapon(x, y);
    });

    this.input.on('pointerup', () => {
      // releaseActiveWeapon()이 activeWeapon을 지우기 전에 무기 종류를 먼저 봐둬야
      // 저격총이었는지 판단해서 스코프를 꺼줄 수 있다.
      const releasedWeaponId = this.weaponManager.activeWeapon?.weaponId;
      this.weaponManager.releaseActiveWeapon();
      if (WEAPON_DEFINITIONS[releasedWeaponId]?.zoomOnAim) this.setSniperScopeVisible(false);
    });

    // SessionEnd 훅(토큰 임계치 초과, extension/scripts/session-end-hook.js)이 발동했을 때 게임 시작 직후 1회 전달됨
    onAgentTaunt((tokenCount) => this.spawnTauntPopup(tokenCount));
  }

  update() {
    this.weaponManager.updateProjectiles();
    this.weaponManager.updateStuckProjectiles();
    this.checkBossAgainstPanel();
    // 보스가 넉백/패널 충돌 등으로 계속 움직이는 동안에도 스코프가 계속 보스를 따라가게 매 프레임 갱신.
    if (this.sniperScope.camera.visible) {
      this.sniperScope.camera.centerOn(this.boss.bodyCenterX, this.boss.bodyCenterY);
    }
  }

  // 저격총을 들고 있는 동안(pointerdown~pointerup)만 화면 왼쪽 위에 뜨는 원형 확대 렌즈.
  // 메인 카메라는 절대 확대/이동하지 않는다 — HUD(체력바/버튼/무기 패널)가 같이 확대되면 클릭 좌표가
  // 화면 좌표와 어긋나 무기 조준·드래그 판정이 깨지므로, 별도 카메라 하나를 추가해서 그 카메라만 확대하고
  // 원형 마스크로 잘라 작은 렌즈처럼 보이게 한다. HUD 고정 UI와 스코프 테두리(reticle) 자체는
  // camera.ignore()로 빼서 스코프 안에 이중으로 확대되어 보이지 않게 한다.
  createSniperScope() {
    const radius = SNIPER_SCOPE_DIAMETER / 2;
    const cx = SNIPER_SCOPE_MARGIN;
    const cy = SNIPER_SCOPE_MARGIN;

    const reticle = this.add.graphics().setDepth(2500).setVisible(false);
    reticle.lineStyle(4, 0x000000, 0.85);
    reticle.strokeCircle(cx, cy, radius + 2);
    reticle.lineStyle(2, 0xff3b3b, 1);
    reticle.strokeCircle(cx, cy, radius);

    // 십자선 — 중앙에 공백을 두고 네 방향 짧은 선만 그려서 완전히 이어진 십자가보다 스코프 레티클답게 보이게 한다.
    const gap = 14;
    const armLen = radius - 18;
    reticle.lineStyle(1.5, 0xff3b3b, 0.9);
    [
      [0, -gap, 0, -gap - armLen],
      [0, gap, 0, gap + armLen],
      [-gap, 0, -gap - armLen, 0],
      [gap, 0, gap + armLen, 0],
    ].forEach(([x1, y1, x2, y2]) => {
      reticle.beginPath();
      reticle.moveTo(cx + x1, cy + y1);
      reticle.lineTo(cx + x2, cy + y2);
      reticle.strokePath();
    });

    const camera = this.cameras.add(cx - radius, cy - radius, radius * 2, radius * 2)
      .setZoom(SNIPER_SCOPE_ZOOM)
      .setBackgroundColor(0x000000)
      .setVisible(false);

    // Hud.createSidePanel의 maskShape와 같은 패턴 — 마스크 소스는 항상 숨겨두고 모양만 빌려 쓴다.
    const maskShape = this.add.graphics().fillStyle(0xffffff).fillCircle(cx, cy, radius).setVisible(false);
    camera.setMask(maskShape.createGeometryMask());

    camera.ignore([
      reticle,
      this.hud.scoreText, this.hud.hpBarBg, this.hud.hpBar,
      this.hud.settingsButton.bg, this.hud.settingsButton.icon,
      this.hud.sidePanel.container,
      this.hud.endButton.bg, this.hud.endButton.icon,
    ]);

    return { camera, reticle };
  }

  setSniperScopeVisible(visible) {
    this.sniperScope.camera.setVisible(visible);
    this.sniperScope.reticle.setVisible(visible);
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

  onWeaponSelect(weaponId) {
    this.selectedWeaponId = weaponId;
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
    this.setSniperScopeVisible(false);

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
      // 전기충격기에 맞았으면 흰색 대신 시안색으로 살짝 다르게 번쩍여서 "감전됐다"는 느낌을 준다.
      const isTaserHit = hits.some((hit) => hit.weaponId === WEAPON_IDS.TASER);
      this.boss.knockback(hitX, hitY);
      this.boss.flash(isTaserHit ? 0x66e0ff : 0xffffff);
      this.boss.registerHits(hits.length);
      this.boss.showHurtFace();
      hits.forEach((hit) => {
        this.spawnDamagePopup(hit);
        const bigImpact = WEAPON_DEFINITIONS[hit.weaponId]?.bigImpact;
        if (hit.weaponId === WEAPON_IDS.TASER) this.spawnElectrocuteEffect();
        else if (hit.weaponId === WEAPON_IDS.MEGAPHONE) this.spawnSoundWaveEffect(hit.x, hit.y);
        // 토마토/수박: 빨간 스플래터. 물풍선: 파란 스플래시. 전용 이펙트 함수 없이 spawnHitSpark 색만 바꿔 재사용한다.
        else if (hit.weaponId === WEAPON_IDS.TOMATO || hit.weaponId === WEAPON_IDS.WATERMELON) {
          this.spawnHitSpark(hit.x, hit.y, 0xc0392b, bigImpact ? 1.8 : 1);
        } else if (hit.weaponId === WEAPON_IDS.WATER_BALLOON) this.spawnHitSpark(hit.x, hit.y, 0x4fc3f7, bigImpact ? 1.8 : 1);
        else this.spawnHitSpark(hit.x, hit.y, undefined, bigImpact ? 1.8 : 1);
      });
    }
    if (defeated) {
      this.spawnDefeatPopup(deathPosition);
    }
  }

  // 쓰다듬기(힐링) 반응. 공격 반응(넉백/피격 표정/스파크)은 전혀 안 건드리고, 부드러운 분홍 틴트 +
  // 회복량 팝업 + 하트 몇 개만 띄운다 — 때리는 것과 확실히 다른 느낌을 주려는 의도.
  onPet(amount, { x, y }) {
    this.hud.updateHpBar(this.boss);
    this.boss.flash(0xffb6d9);
    this.boss.showHappyFace();
    this.spawnDamagePopup({ amount: `+${amount}`, x, y, color: '#ff8fc7' });
    this.spawnHeartBurst(x, y);
  }

  // 손으로 쓰다듬을 때 위로 둥실 떠오르며 사라지는 하트 몇 개.
  spawnHeartBurst(x, y) {
    const heartCount = 3;
    for (let i = 0; i < heartCount; i += 1) {
      const heart = this.add.text(x + Phaser.Math.Between(-14, 14), y + Phaser.Math.Between(-6, 6), '♥', {
        fontSize: `${Phaser.Math.Between(14, 20)}px`,
        color: '#ff8fc7',
      }).setOrigin(0.5).setDepth(1000);

      this.tweens.add({
        targets: heart,
        y: heart.y - Phaser.Math.Between(30, 45),
        alpha: 0,
        duration: 500,
        delay: i * 60,
        ease: 'Cubic.easeOut',
        onComplete: () => heart.destroy(),
      });
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
  // scale: 무기가 강할수록(bigImpact) 코어 플래시/조각 크기·거리를 다 키워서 임팩트를 더 세게 보이게 한다.
  spawnHitSpark(x, y, color = HIT_SPARK_COLOR, scale = 1) {
    const flash = this.add.circle(x, y, 16 * scale, 0xffffff, 0.9)
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

    const shardCount = scale > 1 ? 11 : 8;
    const shardColors = [color, 0xffffff, 0xffb347];
    for (let i = 0; i < shardCount; i += 1) {
      const angle = (Math.PI * 2 * i) / shardCount + Phaser.Math.FloatBetween(-0.35, 0.35);
      const distance = Phaser.Math.Between(28, 56) * scale;
      const size = Phaser.Math.Between(7, 13) * scale;
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

  // 전기충격기 전용 "감전" 이펙트. 짧은 스파크 대신 보스 몸통(getHitRect)을 위에서 아래로 가로지르는
  // 길고 삐죽삐죽한 번개 줄기로 그려서 실제로 전류가 몸을 관통하는 느낌을 준다. 여러 조각이 따로
  // 깜빡이던 이전 버전은 산만했어서, 그래픽스 객체 하나에 한 번에 그리고 통째로 한 번만 페이드아웃한다.
  // Boss.flash의 시안색 틴트와 같이 쓰인다.
  spawnElectrocuteEffect() {
    const bodyRect = this.boss.getHitRect();
    const graphics = this.add.graphics().setDepth(1000);
    graphics.lineStyle(2, 0xaeefff, 1);

    const boltCount = 3;
    const segments = 6;
    for (let i = 0; i < boltCount; i += 1) {
      const startX = Phaser.Math.Between(bodyRect.x, bodyRect.right);
      const endX = Phaser.Math.Between(bodyRect.x, bodyRect.right);

      graphics.beginPath();
      graphics.moveTo(startX, bodyRect.y);
      for (let s = 1; s <= segments; s += 1) {
        const t = s / segments;
        const px = Phaser.Math.Linear(startX, endX, t) + (s === segments ? 0 : Phaser.Math.Between(-9, 9));
        const py = Phaser.Math.Linear(bodyRect.y, bodyRect.bottom, t);
        graphics.lineTo(px, py);
      }
      graphics.strokePath();
    }

    this.tweens.add({
      targets: graphics,
      alpha: 0,
      duration: 220,
      ease: 'Cubic.easeOut',
      onComplete: () => graphics.destroy(),
    });
  }

  // 확성기 전용 "소리 충격" 이펙트. 타격 지점에서 동심원 파동 3개가 시간차를 두고 부풀며 사라진다 —
  // 별 조각/번개 대신 순수하게 "소리가 퍼져나간다"는 느낌만 주는 단순한 링 형태로 구분한다.
  spawnSoundWaveEffect(x, y) {
    const ringCount = 3;
    for (let i = 0; i < ringCount; i += 1) {
      const ring = this.add.circle(x, y, 6, undefined, 0)
        .setStrokeStyle(3, 0xe0a63f, 1)
        .setDepth(1000);

      this.tweens.add({
        targets: ring,
        radius: 30,
        alpha: 0,
        delay: i * 90,
        duration: 260,
        ease: 'Cubic.easeOut',
        onComplete: () => ring.destroy(),
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

  // 보스 머리 위에 대사 팝업을 잠깐 띄운다. 데미지 팝업과 달리 위치가 고정돼 있고 더 오래 유지된다.
  // tokenCount(세션 누적 토큰)에 따라 1000/10000 임계치로 대사 톤이 달라진다.
  spawnTauntPopup(tokenCount) {
    const line = Phaser.Utils.Array.GetRandom(getAgentTauntLines(tokenCount));
    const x = this.boss.bodyCenterX;
    const y = this.boss.sprite.y - this.boss.displayHeight / 2 - 20;
    const style = {
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold',
      fontFamily: UI_FONT_FAMILY,
      backgroundColor: '#000000cc',
      padding: { x: 10, y: 6 },
    };

    // 완성된 문장의 폭을 미리 재서 왼쪽 끝을 고정해야, 글자가 늘어나도
    // 타이핑처럼 오른쪽으로만 자라고 좌우로 흔들리지 않는다.
    const measure = this.add.text(0, 0, line, style).setVisible(false);
    const fullWidth = measure.width;
    measure.destroy();

    const text = this.add
      .text(x - fullWidth / 2, y, '', style)
      .setOrigin(0, 0.5)
      .setDepth(2000);

    let charIndex = 0;
    const typingTimer = this.time.addEvent({
      delay: AGENT_TAUNT_TYPING_SPEED,
      repeat: line.length - 1,
      callback: () => {
        charIndex += 1;
        text.setText(line.slice(0, charIndex));
      },
    });

    this.tweens.add({
      targets: text,
      y: text.y - 20,
      alpha: 0,
      duration: AGENT_TAUNT_POPUP_DURATION,
      delay: line.length * AGENT_TAUNT_TYPING_SPEED + 800,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        typingTimer.remove();
        text.destroy();
      },
    });
  }
}
