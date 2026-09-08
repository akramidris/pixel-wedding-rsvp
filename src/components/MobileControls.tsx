import { bridge } from '../game/bridge';
type Direction = 'up' | 'down' | 'left' | 'right';
export function MobileControls() {
  const arrows: [Direction, string][] = [
    ['up', '▲'],
    ['left', '◀'],
    ['right', '▶'],
    ['down', '▼'],
  ];
  return (
    <div className="mobile-controls">
      <div className="direction-pad">
        {arrows.map(([direction, symbol]) => (
          <button
            key={direction}
            className={`direction ${direction}`}
            aria-label={`Move ${direction}`}
            onPointerDown={(e) => {
              e.preventDefault();
              e.currentTarget.setPointerCapture(e.pointerId);
              bridge.input[direction] = true;
            }}
            onPointerUp={() => {
              bridge.input[direction] = false;
            }}
            onPointerCancel={() => {
              bridge.input[direction] = false;
            }}
            onLostPointerCapture={() => {
              bridge.input[direction] = false;
            }}
          >
            {symbol}
          </button>
        ))}
        <span className="pad-center" />
      </div>
      <button className="interact-mobile" aria-label="Interact" onClick={() => bridge.interact()}>
        A<small>INTERACT</small>
      </button>
    </div>
  );
}
