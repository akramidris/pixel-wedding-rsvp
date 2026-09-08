import { useEffect, useRef } from 'react';
import { drawGarden, drawCharacter } from '../game/art/garden';
import { npcDialogue } from '../data/npcDialogue';
export function GardenPreview({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    drawGarden(canvas);
    const c = canvas.getContext('2d')!;
    for (const npc of npcDialogue) drawCharacter(c, npc.x - 16, npc.y - 24, npc.kind);
    drawCharacter(c, 467, 664, 'guest');
  }, []);
  return (
    <canvas
      ref={ref}
      className={className}
      aria-label="An original pixel art garden with a wedding pavilion, fountain, wishing tree, and Malay bride and groom"
      role="img"
    />
  );
}
