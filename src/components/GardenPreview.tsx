import { useEffect, useRef } from 'react';
import { drawGarden, ART_SCALE } from '../game/art/garden';
import { drawCharacter } from '../game/art/characters';
import { npcPlacements } from '../data/npcDialogue';

// Keep one deterministic composite for the page. Opening a map should copy a
// bitmap, not redraw the garden's thousands of foliage and architectural marks.
let previewSource: HTMLCanvasElement | undefined;
function getPreviewSource() {
  if (previewSource) return previewSource;
  const canvas = document.createElement('canvas');
  drawGarden(canvas);
  const c = canvas.getContext('2d')!;
  c.save();
  c.setTransform(ART_SCALE, 0, 0, ART_SCALE, 0, 0);
  for (const npc of npcPlacements) drawCharacter(c, npc.x - 16, npc.y - 24, npc.kind);
  drawCharacter(c, 467, 664, 'guest');
  c.restore();
  previewSource = canvas;
  return canvas;
}

export function GardenPreview({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const source = getPreviewSource();
    const aspect = source.width / source.height;
    const draw = () => {
      const box = canvas.getBoundingClientRect();
      if (!box.width || !box.height) return;
      const density = Math.min(2, window.devicePixelRatio || 1);
      // Cover-mode hero previews may be taller than the map aspect ratio.
      const needed = Math.max(box.width, box.height * aspect) * density;
      const width = [192, 320, 640, 960].find((size) => size >= needed) ?? 960;
      const height = Math.round(width / aspect);
      if (canvas.width === width && canvas.height === height) return;
      canvas.width = width;
      canvas.height = height;
      const c = canvas.getContext('2d')!;
      c.imageSmoothingEnabled = true;
      c.imageSmoothingQuality = 'high';
      c.drawImage(source, 0, 0, width, height);
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => {
      observer.disconnect();
      // Release each small display buffer; the shared source lives for the page.
      canvas.width = 1;
      canvas.height = 1;
    };
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
