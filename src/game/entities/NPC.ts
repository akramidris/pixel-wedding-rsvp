import Phaser from 'phaser';
import type { NPCData } from '../../data/npcDialogue';
export class NPC extends Phaser.Physics.Arcade.Sprite {
  dataRecord: NPCData;
  constructor(scene: Phaser.Scene, data: NPCData) {
    super(scene, data.x, data.y, data.kind, 0);
    this.dataRecord = data;
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.setScale(2).setDepth(100 + data.y);
    const body = this.body as Phaser.Physics.Arcade.StaticBody;
    body.setSize(20, 15).setOffset(6, 28);
    if (data.bubble)
      scene.add
        .text(data.x, data.y - 36, data.bubble, {
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '9px',
          color: '#59694f',
          backgroundColor: '#fff7e5',
          padding: { x: 7, y: 5 },
        })
        .setOrigin(0.5)
        .setDepth(1000);
  }
}
