import { weddingConfig as w } from '../config/wedding';
import { Icon } from './Icon';
import { GardenPreview } from './GardenPreview';
import { Countdown } from './Countdown';
export function StartScreen({
  onEnter,
  onInvitation,
  music,
  onMusic,
}: {
  onEnter: () => void;
  onInvitation: () => void;
  music: boolean;
  onMusic: () => void;
}) {
  return (
    <div className="landing">
      <header className="site-header">
        <a className="brand" href="#">
          <span className="brand-icon">
            <Icon name="sprout" size={25} />
          </span>
          <span>
            {w.title}
            <small>A WEDDING CELEBRATION</small>
          </span>
        </a>
        <div className="header-right">
          <span className="header-date">{w.wedding.shortDate}</span>
          <button className="text-button" onClick={onMusic}>
            <Icon name={music ? 'volume' : 'muted'} size={17} />
            <span>Music {music ? 'on' : 'off'}</span>
          </button>
        </div>
      </header>
      <main className="landing-main">
        <div className="landing-heading">
          <span className="eyebrow">
            <span /> TWO HEARTS. ONE BEAUTIFUL JOURNEY. <span />
          </span>
          <p>A little world, a lifetime of love.</p>
        </div>
        <section className="invitation-hero">
          <div className="hero-copy">
            <div className="hero-flourish">
              <Icon name="sprout" size={38} />
              <Icon name="heart" size={19} />
              <Icon name="sprout" size={38} />
            </div>
            <span className="eyebrow">YOU’RE INVITED</span>
            <h1>
              {w.groom.name}
              <span>&</span>
              {w.bride.name}
            </h1>
            <p className="hero-greeting">Assalamualaikum & welcome</p>
            <p className="hero-description">
              With grateful hearts, we invite you into
              <br className="desktop-break" /> our little world to celebrate the
              <br className="desktop-break" /> beginning of our forever.
            </p>
            <div className="hero-date">
              <span /> <Icon name="flower" size={18} /> <span />
            </div>
            <p className="date-line">
              {w.wedding.day}, {w.wedding.shortDate}
            </p>
            <p className="venue-line">
              {w.venue.name} <span>·</span>{' '}
              {w.venue.address.split(',').slice(-2, -1)[0]?.trim() || w.venue.address}
            </p>
            <button className="primary enter-button" onClick={onEnter}>
              <Icon name="play" size={17} />
              Enter Wedding
              <Icon name="arrow" size={18} />
            </button>
            <span className="hero-footnote">Jemput hadir · An interactive wedding invitation</span>
            <button className="invitation-link" onClick={onInvitation}>
              Just here for the details? View invitation <Icon name="arrow" size={13} />
            </button>
          </div>
          <div className="hero-world">
            <GardenPreview className="preview-canvas" />
            <div className="world-badge">
              <span className="live-dot" /> A WORLD MADE WITH LOVE
            </div>
            <div className="pixel-hearts" aria-hidden="true">
              ♥ <span>♥</span> ♥
            </div>
            <div className="world-caption">
              <span className="caption-icon">
                <Icon name="map" size={23} />
              </span>
              <div>
                <strong>Your invitation is an adventure.</strong>
                <p>Wander a little. Discover our story. Leave some love.</p>
              </div>
              <Icon name="sparkles" size={23} />
            </div>
          </div>
        </section>
        <div className="below-hero">
          <div className="journey-note">
            <Icon name="heart" size={19} />
            <div>
              <strong>Every moment is sweeter with you.</strong>
              <p>Counting down to our happily ever after.</p>
            </div>
          </div>
          <Countdown />
        </div>
        <div className="feature-strip">
          <span>
            <Icon name="map" size={17} /> Explore our wedding village
          </span>
          <i />
          <span>
            <Icon name="heart" size={17} /> Discover our story
          </span>
          <i />
          <span>
            <Icon name="mail" size={17} /> Leave a wish & RSVP
          </span>
        </div>
      </main>
      <footer className="site-footer">
        <span>Made with love, for the people we love.</span>
        <span>
          {w.groom.name} & {w.bride.name} <Icon name="heart" size={12} />{' '}
          {new Date(w.wedding.isoDate).getUTCFullYear()}
        </span>
      </footer>
    </div>
  );
}
