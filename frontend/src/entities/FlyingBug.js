import Phaser from 'phaser';
import {
  FLYING_BUG_WIDTH, FLYING_BUG_HEIGHT, FLYING_BUG_SPAWN_DELAY_MIN, FLYING_BUG_SPAWN_DELAY_MAX,
  FLYING_BUG_FLIGHT_Y_MIN, FLYING_BUG_FLIGHT_Y_MAX, FLYING_BUG_SPEED,
  FLYING_BUG_BOB_AMPLITUDE, FLYING_BUG_BOB_PERIOD_MS,
  FLYING_BUG_PROPELLER_OFFSET_RATIO, FLYING_BUG_PROPELLER_SPIN_SPEED,
  FLYING_BUG_BONUS_SCORE_MIN, FLYING_BUG_BONUS_SCORE_MAX, FLYING_BUG_CATCH_COOLDOWN_MS,
  FLYING_BUG_DROP_FALL_DURATION, FLYING_BUG_DROP_LIFESPAN,
} from '../config/constants.js';

const BUG_DEPTH = 1200; // 대사 팝업(1500)보다는 낮고 무기/보스(0)보다는 위 — 화면 위쪽을 가로지르는 동안 항상 보이게
const DROP_DEPTH = 5; // 배경(-100)보다는 위, 보스/무기(0)보다는 아래 — 바닥에 남는 아이템이라 다른 오브젝트에 가려져도 자연스럽다

// 화면 위쪽 띠를 게임 세션당 딱 한 번, 랜덤한 시점에 가로질러 날아가는 보너스 버그(프로펠러 모자 개발자가
// 노트북을 안고 나는 모습) — scheduleNext는 생성자에서 딱 한 번만 불리고 그 뒤로는 다시 예약하지 않는다.
// 클릭하면(GameScene의 pointerdown이 tryCatch를 호출) 그 자리에서 바로 보너스 점수 + 커피 한 잔을
// 떨어뜨리지만 캐릭터 자체는 사라지지 않고 계속 날아간다 — 화면 밖으로 나가야 진짜로 없어진다. 한 번
// 잡힌 뒤 화면 밖으로 나갈 때는 이미 보상을 줬으니 조용히 사라지고, 아예 못 잡고 나가면(놓침) 그때
// 반대쪽 끝에서 놀라서 쏟은 커피를 떨어뜨린다. 무기 판정(CombatSystem)과 완전히 무관한 독립 미니게임이라
// onCatch/onMiss 콜백으로 GameScene에만 알린다(Boss.onShieldActivate와 같은 패턴).
//
// body(개발자+노트북)와 propeller(날개)를 텍스처 하나로 합치지 않고 Container로 겹쳐 그리는 이유는
// 프로펠러만 계속 회전시켜야 해서다 — 하나의 정적 텍스처로는 애니메이션을 줄 수 없다.
export default class FlyingBug {
  constructor(scene, { onCatch, onMiss } = {}) {
    this.scene = scene;
    this.onCatch = onCatch;
    this.onMiss = onMiss;
    this.container = null;
    this.propeller = null;
    this.direction = 1; // 1: 왼→오, -1: 오→왼
    this.baseY = 0;
    this.everCaught = false; // 한 번이라도 잡힌 적 있는지 — 화면 밖으로 나갈 때 놓친 걸로 칠지 판단하는 용도
    this.lastCatchTime = -Infinity; // 연타로 계속 잡을 수 있되, 같은 클릭이 중복 적립되는 것만 쿨다운으로 막는다
    this.spawnEvent = null;
    this.scheduleNext();
  }

  scheduleNext() {
    const delay = Phaser.Math.Between(FLYING_BUG_SPAWN_DELAY_MIN, FLYING_BUG_SPAWN_DELAY_MAX);
    this.spawnEvent = this.scene.time.delayedCall(delay, () => this.spawn());
  }

  spawn() {
    if (this.scene.isEnded) return;
    this.everCaught = false;
    this.lastCatchTime = -Infinity;
    this.direction = Phaser.Math.Between(0, 1) === 0 ? 1 : -1;
    this.baseY = Phaser.Math.Between(FLYING_BUG_FLIGHT_Y_MIN, FLYING_BUG_FLIGHT_Y_MAX);
    const startX = this.direction === 1 ? -FLYING_BUG_WIDTH : this.scene.scale.width + FLYING_BUG_WIDTH;

    const body = this.scene.add.image(0, 0, 'flying_bug_body');
    this.propeller = this.scene.add.image(0, FLYING_BUG_HEIGHT * FLYING_BUG_PROPELLER_OFFSET_RATIO, 'flying_bug_propeller');
    this.container = this.scene.add.container(startX, this.baseY, [body, this.propeller])
      .setDepth(BUG_DEPTH)
      .setScale(this.direction === -1 ? -1 : 1, 1);
  }

  // 좌표가 지금 떠 있는 버그 위면 잡은 걸로 처리 — GameScene의 pointerdown 핸들러가 매 클릭마다 먼저 호출한다.
  // 잡아도 사라지지 않는다 — 계속 클릭하는 만큼 계속 보상(점수+커피 드롭)을 주고 화면 밖으로 나갈 때까지
  // 날아가게 둔다. 쿨다운 안에서는 범위 판정은 그대로 true(무기 스폰은 막아야 하니)를 주되 보상만 건너뛴다.
  tryCatch(x, y) {
    if (!this.container) return false;
    if (!Phaser.Geom.Rectangle.Contains(this.container.getBounds(), x, y)) return false;
    const now = this.scene.time.now;
    if (now - this.lastCatchTime < FLYING_BUG_CATCH_COOLDOWN_MS) return true;
    this.lastCatchTime = now;
    this.everCaught = true;
    const bonus = Phaser.Math.Between(FLYING_BUG_BONUS_SCORE_MIN, FLYING_BUG_BONUS_SCORE_MAX);
    const { x: bugX, y: bugY } = this.container;
    this.onCatch?.(bonus, bugX, bugY);
    this.spawnDrop(bugX, 'flying_bug_catch_drop');

    // 잡혔다는 걸 보여주는 작은 반동(통통 튀는 스케일 펄스) — 컨테이너는 flash를 못 쓰니 스케일로 표현.
    // 연타로 쿨다운 끝나자마자 다시 트리거될 수 있어 "현재 스케일 기준"이 아니라 항상 같은 목표값(방향
    // 부호 * 1.25)을 줘야 겹쳐 눌러도 점점 커지는 드리프트가 안 생긴다.
    this.scene.tweens.add({
      targets: this.container,
      scaleX: (this.direction === -1 ? -1 : 1) * 1.25,
      scaleY: 1.25,
      duration: 120,
      yoyo: true,
      ease: 'Sine.easeOut',
    });
    return true;
  }

  // 매 프레임 GameScene.update가 호출 — 가로로 흘러가며 사인파로 위아래 까딱거리고, 프로펠러는 계속 자체
  // 회전시킨다. 화면 밖으로 나가면 한 번도 안 잡혔을 때만 놓친 걸로 처리(잡힌 적 있으면 이미 보상을 줬으니 조용히 사라진다).
  update(time, delta) {
    if (!this.container) return;
    this.container.x += (this.direction * FLYING_BUG_SPEED * delta) / 1000;
    this.container.y = this.baseY + Math.sin((time / FLYING_BUG_BOB_PERIOD_MS) * Math.PI * 2) * FLYING_BUG_BOB_AMPLITUDE;
    this.propeller.rotation += (FLYING_BUG_PROPELLER_SPIN_SPEED * delta) / 1000;

    const offScreen = this.direction === 1
      ? this.container.x > this.scene.scale.width + FLYING_BUG_WIDTH
      : this.container.x < -FLYING_BUG_WIDTH;
    if (offScreen) {
      if (this.everCaught) {
        this.destroy();
      } else {
        this.miss();
      }
    }
  }

  // 세션당 한 번뿐이라 놓쳐도 다시 예약하지 않는다 — scheduleNext는 여기서 부르지 않는다.
  miss() {
    const { x } = this.container;
    this.destroy();
    this.onMiss?.();
    this.spawnDrop(x, 'flying_bug_drop');
  }

  // 화면 아래쪽 바닥에 아이템 하나를 떨어뜨린다 — 놓쳤을 때(쏟은 커피)와 잡았을 때(커피 한 잔) 둘 다
  // 이 낙하 연출을 그대로 쓰고 texture만 다르다. 순수 비주얼이라 데미지/HP와는 무관.
  spawnDrop(nearX, texture) {
    const x = Phaser.Math.Clamp(nearX + Phaser.Math.Between(-40, 40), 30, this.scene.scale.width - 30);
    const landingY = Phaser.Math.Between(460, 540);
    const drop = this.scene.add.image(x, landingY - 40, texture).setDepth(DROP_DEPTH).setAlpha(0);
    this.scene.tweens.add({
      targets: drop,
      y: landingY,
      alpha: 1,
      duration: FLYING_BUG_DROP_FALL_DURATION,
      ease: 'Bounce.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: drop,
          alpha: 0,
          duration: 500,
          delay: FLYING_BUG_DROP_LIFESPAN,
          onComplete: () => drop.destroy(),
        });
      },
    });
  }

  destroy() {
    // Container.destroy()는 기본적으로 자식(body/propeller)까지 같이 destroy한다.
    this.container?.destroy();
    this.container = null;
    this.propeller = null;
  }

  // 게임 종료(GameScene.onEndButtonClick)/씬 재시작 시 남은 스폰 타이머와 떠 있는 버그를 정리한다.
  shutdown() {
    this.spawnEvent?.remove();
    this.spawnEvent = null;
    this.destroy();
  }
}
