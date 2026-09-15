import Phaser from 'phaser';
import { bridge } from '../bridge';
export class Player extends Phaser.Physics.Arcade.Sprite {
  private direction = 0;
  private keys: Record<string, Phaser.Input.Keyboard.Key>;
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'guest', 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setScale(1).setCollideWorldBounds(true);
    (this.body as Phaser.Physics.Arcade.Body).setSize(18, 14).setOffset(8, 34);
    this.keys = scene.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT') as Record<
      string,
      Phaser.Input.Keyboard.Key
    >;
    for (let d = 0; d < 4; d++)
      if (!scene.anims.exists(`walk-${d}`))
        scene.anims.create({
          key: `walk-${d}`,
          frames: scene.anims.generateFrameNumbers('guest', {
            frames: [d * 3, d * 3 + 1, d * 3, d * 3 + 2],
          }),
          frameRate: 9,
          repeat: -1,
        });
    const stopOnReset = bridge.on('inputreset', () => {
      Object.values(this.keys).forEach((key) => key.reset());
      this.stopMovement();
    });
    const stopOnRelease = bridge.on('joystickchange', (state) => {
      // Stop before the next physics step, while respecting held keyboard input.
      if (!state.isActive || state.magnitude === 0) this.updateMovement();
    });
    this.once(Phaser.GameObjects.Events.DESTROY, () => {
      stopOnReset();
      stopOnRelease();
    });
  }

  private digitalInput() {
    const k = this.keys,
      v = bridge.input;
    const right = k.D.isDown || k.RIGHT.isDown || v.right;
    const left = k.A.isDown || k.LEFT.isDown || v.left;
    const down = k.S.isDown || k.DOWN.isDown || v.down;
    const up = k.W.isDown || k.UP.isDown || v.up;
    return {
      x: Number(right) - Number(left),
      y: Number(down) - Number(up),
      active: right || left || down || up,
    };
  }

  private stopMovement() {
    if (!this.body) return;
    this.setVelocity(0, 0);
    this.anims.stop();
    this.anims.timeScale = 1;
    this.setFrame(this.direction * 3);
  }

  updateMovement() {
    let x = 0,
      y = 0;
    if (!bridge.paused) {
      const digital = this.digitalInput();
      if (digital.active) {
        const length = Math.hypot(digital.x, digital.y);
        if (length > 0) {
          x = digital.x / length;
          y = digital.y / length;
        }
      } else if (bridge.joystick.isActive) {
        const { directionX, directionY, magnitude } = bridge.joystick;
        x = directionX * magnitude;
        y = directionY * magnitude;
      }
    }
    this.setVelocity(x * 150, y * 150);
    if (x || y) {
      this.direction = Math.abs(x) >= Math.abs(y) ? (x < 0 ? 1 : 2) : y < 0 ? 3 : 0;
      this.play(`walk-${this.direction}`, true);
      this.anims.timeScale = Math.max(0.25, Math.hypot(x, y));
    } else this.stopMovement();
    this.setDepth(100 + this.y);
  }
}
