import Phaser from 'phaser';
import { WeddingScene } from './scenes/WeddingScene';
export function createGame(parent: HTMLElement) {
  // CSS size and backing resolution are separate: Retina screens get a crisp
  // canvas without changing world units, movement speed, or collision sizes.
  const density = Math.min(
    2,
    Math.max(1, window.devicePixelRatio || 1),
    Math.max(1, 2560 / parent.clientWidth),
  );
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#aabb82',
    pixelArt: true,
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.NONE,
      width: Math.round(parent.clientWidth * density),
      height: Math.round(parent.clientHeight * density),
      zoom: 1 / density,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: 'arcade',
      arcade: { gravity: { x: 0, y: 0 }, debug: false, fixedStep: false },
    },
    scene: [WeddingScene],
    render: { antialias: false },
    callbacks: {
      postBoot: (bootedGame) => {
        // Keep nearest texture sampling while letting the browser resolve the
        // high-density canvas to its CSS size without a second pixel zoom.
        bootedGame.canvas.style.imageRendering = 'auto';
      },
    },
    input: { keyboard: { capture: [] } },
  });
  const observer = new ResizeObserver(() => {
    if (game.isBooted && parent.clientWidth && parent.clientHeight) {
      game.scale.resize(
        Math.round(parent.clientWidth * density),
        Math.round(parent.clientHeight * density),
      );
    }
  });
  observer.observe(parent);
  game.events.once(Phaser.Core.Events.DESTROY, () => observer.disconnect());
  return game;
}
