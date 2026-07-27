import Phaser from 'phaser';
import {
  BOSS_SPAWN,
  BOSS_KNOCKBACK_DISTANCE,
  BOSS_KNOCKBACK_OUT_DURATION,
  BOSS_PANEL_PUSH_DURATION,
  BOSS_FLASH_DURATION,
  BOSS_HURT_FACE_DURATION,
} from '../config/constants.js';

export default class Boss {
  constructor(scene) {
    this.scene = scene;
    this.sprite = scene.physics.add.image(BOSS_SPAWN.x, BOSS_SPAWN.y, 'boss');
    this.maxHp = 1000;
    this.hp = this.maxHp;

    this.sprite.setCollideWorldBounds(true);
    this.sprite.setInteractive({ draggable: true });
    scene.input.setDraggable(this.sprite);
  }

  get displayWidth() {
    return this.sprite.displayWidth;
  }

  get displayHeight() {
    return this.sprite.displayHeight;
  }

  setPosition(x, y) {
    this.scene.tweens.killTweensOf(this.sprite);
    this.isPanelBounceActive = false;
    this.sprite.setAngle(0);
    this.sprite.setPosition(x, y);
  }

  takeDamage(amount) {
    this.hp -= amount;
  }

  isDead() {
    return this.hp <= 0;
  }

  respawn() {
    this.hp = this.maxHp;
    this.setPosition(BOSS_SPAWN.x, BOSS_SPAWN.y);
    this.hurtFaceEvent?.remove();
    this.sprite.setTexture('boss');
  }

  // 타격 지점(hitX,hitY) 반대 방향으로 보스를 실제로 밀어낸다. 원위치로 돌아오지 않고 그 자리가 새 위치가 된다.
  // 드래그 중이면 다음 드래그 좌표가 곧바로 덮어써서 자연히 묻힌다. 화면 밖으로는 나가지 않도록 clamp.
  knockback(hitX, hitY) {
    // 연타로 이전 knockback이 끝나기 전에 다시 호출되면, 진행 중이던 트윈을 끊고 그 시점의 실제 위치부터 이어서 밀린다.
    this.scene.tweens.killTweensOf(this.sprite);
    this.isPanelBounceActive = false;
    this.sprite.setAngle(0); // 패널 충돌 회전이 끝나기 전에 끊겼을 경우를 대비해 기준 각도로 정리
    const originX = this.sprite.x;
    const originY = this.sprite.y;

    const angle = Phaser.Math.Angle.Between(hitX, hitY, originX, originY);
    const halfW = this.displayWidth / 2;
    const halfH = this.displayHeight / 2;
    const { width, height } = this.scene.scale;
    const targetX = Phaser.Math.Clamp(originX + Math.cos(angle) * BOSS_KNOCKBACK_DISTANCE, halfW, width - halfW);
    const targetY = Phaser.Math.Clamp(originY + Math.sin(angle) * BOSS_KNOCKBACK_DISTANCE, halfH, height - halfH);

    this.scene.tweens.add({
      targets: this.sprite,
      x: targetX,
      y: targetY,
      duration: BOSS_KNOCKBACK_OUT_DURATION,
      ease: 'Quad.easeOut',
    });
  }

  // 무기/배경 패널이 화면 오른쪽에서 슬라이드로 열리며 보스와 겹치면(=패널에 부딪히면) 왼쪽 벽까지 날려보내
  // 패널에 가려지지 않게 한다. onComplete(x,y): 왼쪽 벽 도착 지점 좌표와 함께 호출되는 콜백 (호출부에서 보너스 데미지 적용).
  // isPanelBounceActive: 트윈이 진행되는 동안 호출부(GameScene)가 매 프레임 겹침을 다시 감지해 트윈을
  // 계속 재시작하지 않도록 막는 가드. setPosition/knockback으로 도중에 끊기면 그쪽에서 다시 false로 되돌린다.
  flyOutToLeftWall(onComplete) {
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.setAngle(0);
    const halfW = this.displayWidth / 2;

    this.isPanelBounceActive = true;
    this.scene.tweens.add({
      targets: this.sprite,
      x: halfW,
      angle: 360,
      duration: BOSS_PANEL_PUSH_DURATION,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        this.sprite.setAngle(0);
        this.isPanelBounceActive = false;
        onComplete?.(this.sprite.x, this.sprite.y);
      },
    });
  }

  flash(color) {
    this.sprite.setTintFill(color);
    this.scene.time.delayedCall(BOSS_FLASH_DURATION, () => this.sprite.clearTint());
  }

  // 피격 시 잠깐 눈이 X_X로 바뀜. 연타 중에는 매번 타이머를 새로 잡아 원래 표정으로 너무 빨리 돌아오지 않게 한다.
  showHurtFace() {
    this.hurtFaceEvent?.remove();
    this.sprite.setTexture('boss_hurt');
    this.hurtFaceEvent = this.scene.time.delayedCall(BOSS_HURT_FACE_DURATION, () => this.sprite.setTexture('boss'));
  }
}
