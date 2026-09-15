import { useEffect, useRef } from 'react';
import type Phaser from 'phaser';
import { bridge } from '../game/bridge';
export default function GameView({ onError }: { onError: (message: string) => void }) {
  const parent = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let cancelled = false,
      game: Phaser.Game | undefined;
    import('../game/createGame')
      .then(({ createGame }) => {
        if (!cancelled && parent.current) game = createGame(parent.current);
      })
      .catch(() => onError('The garden couldn’t load. Please refresh the page and try again.'));
    return () => {
      cancelled = true;
      bridge.resetInput();
      game?.destroy(true);
    };
  }, [onError]);
  return (
    <div
      className="game-canvas"
      ref={parent}
      aria-label="Wedding garden game. Use the touch joystick or arrow keys and WASD to move. Tap A or press E to interact, and use M for the map."
    />
  );
}
