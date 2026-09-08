import Phaser from 'phaser';
import { bridge } from '../bridge';
export class Player extends Phaser.Physics.Arcade.Sprite {
  private direction = 0;
  private keys: Record<string, Phaser.Input.Keyboard.Key>;
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'guest', 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setScale(2).setCollideWorldBounds(true);
    (this.body as Phaser.Physics.Arcade.Body).setSize(9, 7).setOffset(4, 17);
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
  }
  updateMovement() {
    const k = this.keys,
      v = bridge.input;
    let x = 0,
      y = 0;
    if (!bridge.paused) {
      x =
        Number(k.D.isDown || k.RIGHT.isDown || v.right) -
        Number(k.A.isDown || k.LEFT.isDown || v.left);
      y = Number(k.S.isDown || k.DOWN.isDown || v.down) - Number(k.W.isDown || k.UP.isDown || v.up);
    }
    this.setVelocity(x * 150, y * 150);
    if (x && y) (this.body as Phaser.Physics.Arcade.Body).velocity.normalize().scale(150);
    if (x || y) {
      this.direction = x < 0 ? 1 : x > 0 ? 2 : y < 0 ? 3 : 0;
      this.play(`walk-${this.direction}`, true);
    } else {
      this.anims.stop();
      this.setFrame(this.direction * 3);
    }
    this.setDepth(100 + this.y);
  }
}
