import { useEffect, useState } from 'react';
import { supportsTouchControls } from '../game/controls/touch';

export function useTouchControls() {
  const [enabled, setEnabled] = useState(supportsTouchControls);
  useEffect(() => {
    const media = window.matchMedia('(any-pointer: coarse)');
    const update = () => setEnabled(supportsTouchControls());
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return enabled;
}
