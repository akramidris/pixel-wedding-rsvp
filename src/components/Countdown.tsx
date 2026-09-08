import { useEffect, useState } from 'react';
import { weddingConfig } from '../config/wedding';
export function Countdown() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const remaining = Math.max(0, new Date(weddingConfig.wedding.isoDate).getTime() - now);
  const values = [
    Math.floor(remaining / 86400000),
    Math.floor(remaining / 3600000) % 24,
    Math.floor(remaining / 60000) % 60,
    Math.floor(remaining / 1000) % 60,
  ];
  if (!remaining)
    return (
      <p className="celebration-note">
        {now <= new Date(weddingConfig.wedding.endDate).getTime()
          ? 'Today, our forever begins ♡'
          : 'A beautiful day, a forever memory ♡'}
      </p>
    );
  return (
    <div className="countdown" aria-label="Countdown to the wedding">
      {values.map((value, i) => (
        <div key={i}>
          <strong>{String(value).padStart(2, '0')}</strong>
          <span>{['days', 'hours', 'minutes', 'seconds'][i]}</span>
        </div>
      ))}
    </div>
  );
}
