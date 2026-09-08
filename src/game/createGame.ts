import Phaser from 'phaser';
import { WeddingScene } from './scenes/WeddingScene';
export function createGame(parent: HTMLElement) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#aabb82',
    pixelArt: true,
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: parent.clientWidth,
      height: parent.clientHeight,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: 'arcade',
      arcade: { gravity: { x: 0, y: 0 }, debug: false, fixedStep: false },
    },
    scene: [WeddingScene],
    render: { antialias: false },
    input: { keyboard: { capture: [] } },
  });
}
