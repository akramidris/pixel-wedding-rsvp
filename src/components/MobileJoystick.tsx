import { useEffect, useRef } from 'react';
import { bridge } from '../game/bridge';
import { JOYSTICK_DEAD_ZONE, neutralJoystick, sampleJoystick } from '../game/controls/joystick';

/** Fixed-center analog input. Pointer ownership and thumb motion stay outside
 * React's render loop; the game consumes the latest vector on its own frame. */
export function MobileJoystick({ deadZone = JOYSTICK_DEAD_ZONE }: { deadZone?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const base = ref.current!;
    const thumb = base.querySelector<HTMLElement>('.joystick-thumb')!;
    let owner: { id: number; x: number; y: number; radius: number } | null = null;

    const reset = (publish = true) => {
      const previous = owner;
      owner = null;
      base.dataset.active = 'false';
      base.style.setProperty('--stick-x', '0px');
      base.style.setProperty('--stick-y', '0px');
      if (previous && base.hasPointerCapture(previous.id)) base.releasePointerCapture(previous.id);
      if (publish) bridge.setJoystick(neutralJoystick());
    };
    const move = (event: PointerEvent) => {
      if (!owner || event.pointerId !== owner.id) return;
      event.preventDefault();
      if (bridge.paused) {
        reset();
        return;
      }
      const dx = event.clientX - owner.x,
        dy = event.clientY - owner.y;
      const length = Math.hypot(dx, dy);
      const clamp = length > owner.radius ? owner.radius / length : 1;
      base.style.setProperty('--stick-x', `${dx * clamp}px`);
      base.style.setProperty('--stick-y', `${dy * clamp}px`);
      bridge.setJoystick(sampleJoystick(dx, dy, owner.radius, deadZone));
    };
    const down = (event: PointerEvent) => {
      // A second finger may already be on A: isPrimary is deliberately not used.
      if (owner || bridge.paused || (event.pointerType === 'mouse' && event.button !== 0)) return;
      event.preventDefault();
      const box = base.getBoundingClientRect();
      owner = {
        id: event.pointerId,
        x: box.left + box.width / 2,
        y: box.top + box.height / 2,
        radius: Math.max(1, (box.width - thumb.offsetWidth) / 2 - 4),
      };
      base.dataset.active = 'true';
      base.setPointerCapture(event.pointerId);
      move(event);
    };
    const end = (event: PointerEvent) => {
      if (event.pointerId !== owner?.id) return;
      event.preventDefault();
      reset();
    };
    const interrupted = () => reset();
    const visibility = () => {
      if (document.hidden) reset();
    };
    const preventMenu = (event: Event) => event.preventDefault();
    base.addEventListener('pointerdown', down);
    base.addEventListener('pointermove', move);
    base.addEventListener('pointerup', end);
    base.addEventListener('pointercancel', end);
    base.addEventListener('lostpointercapture', end);
    base.addEventListener('contextmenu', preventMenu);
    window.addEventListener('blur', interrupted);
    window.addEventListener('resize', interrupted);
    window.addEventListener('orientationchange', interrupted);
    document.addEventListener('visibilitychange', visibility);
    const off = bridge.on('inputreset', () => reset(false));
    return () => {
      off();
      base.removeEventListener('pointerdown', down);
      base.removeEventListener('pointermove', move);
      base.removeEventListener('pointerup', end);
      base.removeEventListener('pointercancel', end);
      base.removeEventListener('lostpointercapture', end);
      base.removeEventListener('contextmenu', preventMenu);
      window.removeEventListener('blur', interrupted);
      window.removeEventListener('resize', interrupted);
      window.removeEventListener('orientationchange', interrupted);
      document.removeEventListener('visibilitychange', visibility);
      reset();
    };
  }, [deadZone]);

  return (
    <div
      ref={ref}
      className="mobile-joystick"
      data-active="false"
      role="group"
      aria-label="Movement joystick"
      aria-describedby="joystick-guide"
      tabIndex={0}
    >
      <span className="joystick-orbit" aria-hidden="true" />
      <span className="joystick-thumb" aria-hidden="true">
        <span />
      </span>
      <span id="joystick-guide" className="sr-only">
        Drag to walk in any direction. Drag farther to walk faster. Release to stop. You can also
        use WASD or the arrow keys.
      </span>
    </div>
  );
}
