import Phaser from 'phaser';
import { drawGarden, ART_SCALE } from '../art/garden';
import { drawCharacter, makeSprites, SPRITE_WIDTH, SPRITE_HEIGHT } from '../art/characters';
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
  private npcs: NPC[] = [];
  constructor() {
    super('Wedding');
  }
  create() {
    const canvas = document.createElement('canvas');
    const obstacles = drawGarden(canvas);
    this.textures.addCanvas('garden', canvas);
    this.add.image(0, 0, 'garden').setOrigin(0).setDisplaySize(WORLD.width, WORLD.height);
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
      if (source)
        this.textures.addSpriteSheet(kind, source, {
          frameWidth: SPRITE_WIDTH,
          frameHeight: SPRITE_HEIGHT,
        });
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
    this.npcs = npcs;
    npcs.forEach((npc) => this.physics.add.collider(this.player, npc));
    this.interactions = new InteractionSystem(this.player, npcs);
    this.hint = this.add
      .text(
        0,
        0,
        window.matchMedia('(pointer: coarse)').matches ? 'A · Interact' : 'E · Interact',
        {
          fontFamily: 'DM Sans',
          fontSize: '10px',
          resolution: 3,
          color: '#fff8e7',
          backgroundColor: '#4e6654',
          padding: { x: 7, y: 4 },
        },
      )
      .setOrigin(0.5)
      .setDepth(2000);
    const camera = this.cameras.main;
    camera.setBounds(0, 0, WORLD.width, WORLD.height);
    const density = 1 / this.scale.zoom;
    const zoomFor = (width: number, height: number) =>
      Math.max(
        width / density < 600 ? 1.1 : 1.15,
        width / density / WORLD.width,
        height / density / WORLD.height,
      ) * density;
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
      photo.height = 840;
      const portrait = document.createElement('canvas');
      drawGarden(portrait, { portrait: true });
      const c = photo.getContext('2d')!;
      c.imageSmoothingEnabled = false;
      c.fillStyle = '#f8f2e4';
      c.fillRect(0, 0, 800, 840);
      c.drawImage(
        portrait,
        634 * ART_SCALE,
        144 * ART_SCALE,
        190 * ART_SCALE,
        176 * ART_SCALE,
        20,
        20,
        760,
        704,
      );
      // A closer portrait grouping, with integer pixels and aligned stage feet.
      drawCharacter(c, 234, 420, 'groom', 0, 0, 5);
      drawCharacter(c, 374, 420, 'bride', 0, 0, 5);
      drawCharacter(c, 514, 432, 'guest', 0, 0, 5);
      c.fillStyle = '#607453';
      c.textAlign = 'center';
      c.font = '42px "Cormorant Garamond", Georgia, serif';
      c.fillText(`${weddingConfig.groom.name} & ${weddingConfig.bride.name}`, 400, 776);
      c.fillStyle = '#92957b';
      c.font = '13px "DM Sans", sans-serif';
      c.fillText(`${weddingConfig.wedding.shortDate} · A little moment, forever ours`, 400, 809);
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
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    for (let i = 0; i < (reducedMotion ? 0 : 12); i++) {
      const petal = this.add
        .rectangle(Phaser.Math.Between(50, 910), Phaser.Math.Between(70, 730), 2, 1, 0xf6dcc4, 0.65)
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
    const speaker = this.npcs
      .filter((npc) => npc.dataRecord.bubble)
      .sort(
        (a, b) =>
          Phaser.Math.Distance.Between(this.player.x, this.player.y, a.x, a.y) -
          Phaser.Math.Distance.Between(this.player.x, this.player.y, b.x, b.y),
      )[0];
    this.interactions.update();
    this.npcs.forEach((npc) =>
      npc.updateBubble(
        this.player,
        bridge.paused || npc !== speaker || this.interactions.hasTarget,
      ),
    );
    this.hint
      .setPosition(
        this.player.x,
        Math.min(this.player.y + 36, this.cameras.main.worldView.bottom - 14),
      )
      .setVisible(this.interactions.hasTarget && !bridge.paused);
    if (time - this.lastPosition > 120) {
      bridge.emit('position', { x: this.player.x, y: this.player.y });
      this.lastPosition = time;
    }
  }
}
