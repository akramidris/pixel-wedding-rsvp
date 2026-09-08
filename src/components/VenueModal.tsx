import { useState } from 'react';
import { weddingConfig as w } from '../config/wedding';
import { Icon } from './Icon';
export function VenueModal() {
  const [copied, setCopied] = useState(false),
    [error, setError] = useState('');
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${w.venue.name}, ${w.venue.address}`);
      setCopied(true);
    } catch {
      setError('Copy is unavailable in this browser. You can select and copy the address above.');
    }
  };
  return (
    <>
      <div className="venue-card">
        <Icon name="home" size={40} />
        <h3>{w.venue.name}</h3>
        <p>{w.venue.address}</p>
      </div>
      <div className="button-row wrap">
        {w.venue.googleMaps && (
          <a className="primary" href={w.venue.googleMaps} target="_blank" rel="noreferrer">
            <Icon name="pin" size={16} />
            Google Maps
          </a>
        )}
        {w.venue.waze && (
          <a className="secondary" href={w.venue.waze} target="_blank" rel="noreferrer">
            <Icon name="navigation" size={16} />
            Waze
          </a>
        )}
        <button className="secondary" onClick={copy}>
          <Icon name={copied ? 'check' : 'copy'} size={16} />
          {copied ? 'Copied' : 'Copy address'}
        </button>
      </div>
      {error && (
        <p role="status" className="form-error">
          {error}
        </p>
      )}
      <div className="facilities">
        {w.venue.facilities.map((f, i) => (
          <div key={f.title}>
            <Icon name={['navigation', 'flower', 'home', 'users'][i]} size={20} />
            <div>
              <strong>{f.title}</strong>
              <p>{f.detail}</p>
            </div>
          </div>
        ))}
      </div>
      {(w.contact.groom || w.contact.bride) && (
        <p className="contact-line">
          Need a hand?{' '}
          {w.contact.groom && <a href={`tel:${w.contact.groom}`}>Contact {w.groom.name}</a>}{' '}
          {w.contact.bride && <a href={`tel:${w.contact.bride}`}>Contact {w.bride.name}</a>}
        </p>
      )}
    </>
  );
}
