import { bridge } from '../game/bridge';
import { MobileJoystick } from './MobileJoystick';
export function MobileControls({ hasNearby = false }: { hasNearby?: boolean }) {
  return (
    <div className="mobile-controls">
      <MobileJoystick />
      <button
        className="interact-mobile"
        data-ready={hasNearby}
        aria-label="Interact"
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          bridge.interact();
        }}
        onClick={(event) => {
          if (event.detail === 0) bridge.interact();
        }}
      >
        A<small>INTERACT</small>
      </button>
    </div>
  );
}
