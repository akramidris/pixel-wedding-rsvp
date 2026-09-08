import Phaser from 'phaser';
import { drawGarden, makeSprites } from '../art/garden';
import { WORLD } from '../world';
import { Player } from '../entities/Player';
import { NPC } from '../entities/NPC';
import { npcDialogue } from '../../data/npcDialogue';
import { InteractionSystem } from '../systems/InteractionSystem';
import { bridge } from '../bridge';
import { weddingConfig } from '../../config/wedding';

export class WeddingScene extends Phaser.Scene {
  private player!: Player;
  private interactions!: InteractionSystem;
  private hint!: Phaser.GameObjects.Text;
  private lastPosition = 0;
  constructor() {
    super('Wedding');
  }
  create() {
    const canvas = document.createElement('canvas');
    const obstacles = drawGarden(canvas);
    this.textures.addCanvas('garden', canvas);
    this.add.image(0, 0, 'garden').setOrigin(0);
    for (const kind of [
      'guest',
      'bride',
      'groom',
      'father',
      'mother',
      'host',
      'photographer',
      'staff',
    ] as const) {
      const source = this.textures.addCanvas(kind, makeSprites(kind));
      if (source) this.textures.addSpriteSheet(kind, source, { frameWidth: 16, frameHeight: 24 });
    }
    this.physics.world.setBounds(12, 12, WORLD.width - 24, WORLD.height - 24);
    this.player = new Player(this, WORLD.start.x, WORLD.start.y);
    const walls = this.physics.add.staticGroup();
    for (const obstacle of obstacles) {
      const wall = this.add.rectangle(
        obstacle.x,
        obstacle.y,
        obstacle.width,
        obstacle.height,
        0,
        0,
      );
      walls.add(wall);
    }
    this.physics.add.collider(this.player, walls);
    const npcs = npcDialogue.map((data) => new NPC(this, data));
    npcs.forEach((npc) => this.physics.add.collider(this.player, npc));
    this.interactions = new InteractionSystem(this.player, npcs);
    this.hint = this.add
      .text(0, 0, 'E · Interact', {
        fontFamily: 'DM Sans',
        fontSize: '10px',
        color: '#fff8e7',
        backgroundColor: '#4e6654',
        padding: { x: 8, y: 5 },
      })
      .setOrigin(0.5)
      .setDepth(2000);
    const camera = this.cameras.main;
    camera.setBounds(0, 0, WORLD.width, WORLD.height);
    const zoomFor = (width: number, height: number) =>
      Math.max(width < 600 ? 1.15 : 1.25, width / WORLD.width, height / WORLD.height);
    camera.setZoom(zoomFor(this.scale.width, this.scale.height));
    camera.startFollow(this.player, true, 0.09, 0.09);
    camera.fadeIn(600, 244, 241, 229);
    this.input.keyboard!.addCapture(['UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE']);
    const interact = () => this.interactions.interact();
    this.input.keyboard!.on('keydown-E', interact);
    this.input.keyboard!.on('keydown-ENTER', interact);
    this.input.keyboard!.on('keydown-SPACE', interact);
    bridge.interact = interact;
    bridge.takePhoto = () => {
      // Draw a keepsake from local assets, including the actual guest character.
      const photo = document.createElement('canvas');
      photo.width = 800;
      photo.height = 700;
      const c = photo.getContext('2d')!;
      c.imageSmoothingEnabled = false;
      c.fillStyle = '#f8f2e4';
      c.fillRect(0, 0, 800, 700);
      c.drawImage(canvas, 614, 139, 229, 235, 30, 30, 740, 570);
      const draw = (kind: 'groom' | 'bride' | 'guest', x: number, y: number) => {
        c.drawImage(makeSprites(kind), 0, 0, 16, 24, x, y, 64, 96);
      };
      draw('groom', 304, 345);
      draw('bride', 410, 345);
      draw('guest', 520, 363);
      c.fillStyle = '#607453';
      c.textAlign = 'center';
      c.font = '42px "Cormorant Garamond", Georgia, serif';
      c.fillText(`${weddingConfig.groom.name} & ${weddingConfig.bride.name}`, 400, 644);
      c.fillStyle = '#92957b';
      c.font = '13px "DM Sans", sans-serif';
      c.fillText(`${weddingConfig.wedding.shortDate} · A little moment, forever ours`, 400, 674);
      bridge.emit('photo', photo.toDataURL('image/png'));
    };
    let wasPaused = false;
    const pauseKeys = () => {
      if (wasPaused === bridge.paused) return;
      wasPaused = bridge.paused;
      // Keep listeners alive so a key pressed immediately after closing a card
      // is received. Only browser shortcut capture and movement are suspended.
      if (bridge.paused) {
        this.input.keyboard!.resetKeys();
        this.input.keyboard!.disableGlobalCapture();
      } else this.input.keyboard!.enableGlobalCapture();
    };
    this.events.on('preupdate', pauseKeys);
    const resize = (size: Phaser.Structs.Size) => camera.setZoom(zoomFor(size.width, size.height));
    this.scale.on('resize', resize);
    this.events.once('shutdown', () => {
      this.scale.off('resize', resize);
      bridge.interact = () => {};
      bridge.takePhoto = () => {};
    });
    // Ambient drifting petals; animation stays inside Phaser.
    for (let i = 0; i < 22; i++) {
      const petal = this.add
        .rectangle(Phaser.Math.Between(50, 910), Phaser.Math.Between(70, 730), 4, 3, 0xf6dcc4, 0.7)
        .setDepth(1500);
      this.tweens.add({
        targets: petal,
        x: petal.x + 45,
        y: petal.y + 70,
        alpha: 0,
        duration: 4500 + i * 200,
        repeat: -1,
        delay: i * 180,
      });
    }
    bridge.emit('ready', undefined);
  }
  update(time: number) {
    if (!this.player) return;
    this.player.updateMovement();
    this.interactions.update();
    this.hint
      .setPosition(this.player.x, this.player.y - 46)
      .setVisible(this.interactions.hasTarget && !bridge.paused);
    if (time - this.lastPosition > 120) {
      bridge.emit('position', { x: this.player.x, y: this.player.y });
      this.lastPosition = time;
    }
  }
}
