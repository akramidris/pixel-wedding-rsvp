import { useEffect, useState } from 'react';
import { bridge } from '../game/bridge';
import { areas, WORLD, type AreaId } from '../game/world';
import { GardenPreview } from './GardenPreview';
import { Icon } from './Icon';
export function MiniMap({
  expanded = false,
  visited,
  open,
}: {
  expanded?: boolean;
  visited: Set<AreaId>;
  open: (area?: AreaId) => void;
}) {
  const [compactOpen, setCompactOpen] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number }>(WORLD.start);
  useEffect(() => bridge.on('position', setPosition), []);
  return (
    <div
      className={expanded ? 'map-expanded' : `minimap ${compactOpen ? 'mini-open' : 'mini-closed'}`}
    >
      {!expanded && (
        <button
          className="minimap-toggle"
          onClick={() => setCompactOpen((value) => !value)}
          aria-expanded={compactOpen}
          aria-label={compactOpen ? 'Hide minimap' : 'Show minimap'}
        >
          <Icon name="map" size={16} /> Map
        </button>
      )}
      <div className="map-image">
        <GardenPreview />
        {areas.map((area, i) =>
          expanded ? (
            <button
              key={area.id}
              className={`map-marker ${visited.has(area.id) ? 'visited' : ''}`}
              style={{
                left: `${(area.x / WORLD.width) * 100}%`,
                top: `${(area.y / WORLD.height) * 100}%`,
              }}
              onClick={() => open(area.id)}
              aria-label={`View ${area.name}`}
            >
              {i + 1}
            </button>
          ) : (
            <span
              key={area.id}
              className="map-dot"
              style={{
                left: `${(area.x / WORLD.width) * 100}%`,
                top: `${(area.y / WORLD.height) * 100}%`,
              }}
            />
          ),
        )}
        <span
          className="player-dot"
          style={{
            left: `${(position.x / WORLD.width) * 100}%`,
            top: `${(position.y / WORLD.height) * 100}%`,
          }}
          aria-label="Your position"
        />
        {!expanded && (
          <button
            className="minimap-overlay"
            onClick={() => open()}
            aria-label="Open village map"
          />
        )}
      </div>
      {expanded ? (
        <div className="map-legend">
          {areas.map((area, i) => (
            <button key={area.id} onClick={() => open(area.id)}>
              <span>{i + 1}</span>
              <Icon name={area.icon} size={17} />
              {area.name}
              {visited.has(area.id) && <Icon name="check" size={15} />}
            </button>
          ))}
          <p>
            <span className="legend-player" /> You are here{' '}
            <span>· Tap a place to read its details</span>
          </p>
        </div>
      ) : (
        <div className="minimap-label">
          <Icon name="map" size={13} />
          Village map<kbd>M</kbd>
        </div>
      )}
    </div>
  );
}
