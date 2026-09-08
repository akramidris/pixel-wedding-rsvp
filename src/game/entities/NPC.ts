import Phaser from 'phaser';
import type { NPCData } from '../../data/npcDialogue';
export class NPC extends Phaser.Physics.Arcade.Sprite {
  dataRecord: NPCData;
  private bubble?: Phaser.GameObjects.Text;
  constructor(scene: Phaser.Scene, data: NPCData) {
    super(scene, data.x, data.y, data.kind, 0);
    this.dataRecord = data;
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.setScale(1).setDepth(100 + data.y);
    const body = this.body as Phaser.Physics.Arcade.StaticBody;
    body.setSize(20, 14).setOffset(6, 33);
    if (data.bubble)
      this.bubble = scene.add
        .text(data.x, data.y - 36, data.bubble, {
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '11px',
          fontStyle: '500',
          resolution: 3,
          color: '#435947',
          backgroundColor: '#fffaf0',
          padding: { x: 9, y: 6 },
        })
        .setOrigin(0.5)
        .setDepth(1000)
        .setVisible(false);
  }
  updateBubble(player: Phaser.GameObjects.Sprite, paused: boolean) {
    // Only nearby greetings are shown, keeping architecture and faces visible.
    this.bubble?.setVisible(
      !paused && Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y) < 100,
    );
  }
}
