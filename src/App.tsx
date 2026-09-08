import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { StartScreen } from './components/StartScreen';
import { Icon } from './components/Icon';
import { Modal } from './components/Modal';
import { WeddingInvitation } from './components/WeddingInvitation';
import { VenueModal } from './components/VenueModal';
import { WishModal } from './components/WishModal';
import { RSVPModal } from './components/RSVPModal';
import { MiniMap } from './components/MiniMap';
import { MobileControls } from './components/MobileControls';
import { MusicControls, useMusic } from './components/MusicControls';
import { Countdown } from './components/Countdown';
import { bridge, type Panel } from './game/bridge';
import { areas, type Area, type AreaId } from './game/world';
import { weddingConfig as w } from './config/wedding';
import { drawCharacter } from './game/art/characters';

const GameView = lazy(() => import('./components/GameView'));
const panelTitles: Record<string, [string, string, string]> = {
  welcome: ['Assalamualaikum & Welcome!', 'YOUR LITTLE ADVENTURE BEGINS', 'flower'],
  invitation: ['An invitation, with love', 'TOGETHER WITH OUR FAMILIES', 'mail'],
  story: ['Our Story', 'THE CHAPTERS THAT LED TO US', 'book'],
  schedule: ['A day to remember', 'SAVE THE DATE', 'calendar'],
  venue: ['Meet us here', 'THE WEDDING VENUE', 'home'],
  pelamin: ['Our forever begins', 'MEET THE BRIDE & GROOM', 'heart'],
  wishes: ['Wishes for the Bride & Groom', 'THE WISHING TREE', 'tree'],
  rsvp: ['Will you be joining us?', 'A SEAT AT OUR CELEBRATION', 'check'],
  menu: ['Wedding Menu', 'MAKE YOURSELF AT HOME', 'sprout'],
  controls: ['A little guide', 'WELCOME TO OUR WORLD', 'map'],
  music: ['The sound of our garden', 'A MOMENT OF PEACE', 'music'],
  map: ['Find your way', 'OUR WEDDING VILLAGE', 'map'],
  photo: ['A moment to keep', 'FROM OUR GARDEN, WITH LOVE', 'camera'],
};
function CoupleSprites() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!.getContext('2d')!;
    c.clearRect(0, 0, 256, 144);
    drawCharacter(c, 48, 0, 'groom', 0, 0, 3);
    drawCharacter(c, 132, 0, 'bride', 0, 0, 3);
  }, []);
  return (
    <canvas
      width="256"
      height="144"
      ref={ref}
      className="couple-sprites"
      role="img"
      aria-label="Groom in Baju Melayu and songkok, and bride in a modest hijab and wedding gown"
    />
  );
}
function Controls({ onDone }: { onDone: () => void }) {
  return (
    <div className="tutorial">
      <p>There’s a little piece of our celebration around every corner.</p>
      <div>
        <span className="tutorial-number">01</span>
        <section>
          <h3>Wander at your own pace</h3>
          <p>
            Use <kbd>W</kbd>
            <kbd>A</kbd>
            <kbd>S</kbd>
            <kbd>D</kbd> or the arrow keys to move. On mobile, use the directional pad.
          </p>
        </section>
      </div>
      <div>
        <span className="tutorial-number">02</span>
        <section>
          <h3>A little hello goes a long way</h3>
          <p>
            Walk near a person or place. Press <kbd>E</kbd>, <kbd>Enter</kbd>, or <kbd>Space</kbd>{' '}
            to interact. On mobile, tap <kbd>A</kbd>.
          </p>
        </section>
      </div>
      <div>
        <span className="tutorial-number">03</span>
        <section>
          <h3>Follow your curiosity</h3>
          <p>
            Press <kbd>M</kbd> for the village map, or <kbd>Esc</kbd> for the menu. All wedding
            details are also available there.
          </p>
        </section>
      </div>
      <button className="primary full-width" onClick={onDone}>
        Let’s explore
        <Icon name="arrow" size={17} />
      </button>
    </div>
  );
}
function Schedule() {
  const calendar = () => {
    const stamp = (s: string) => new Date(s).toISOString().replace(/[-:]/g, '').replace('.000', '');
    const escape = (s: string) =>
      s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//A Garden of Us//Wedding//EN',
      'BEGIN:VEVENT',
      `UID:${w.storageKey}@garden-of-us`,
      `DTSTAMP:${stamp(new Date().toISOString())}`,
      `DTSTART:${stamp(w.wedding.isoDate)}`,
      `DTEND:${stamp(w.wedding.endDate)}`,
      `SUMMARY:${escape(`${w.groom.name} & ${w.bride.name} — Wedding`)}`,
      `LOCATION:${escape(`${w.venue.name}, ${w.venue.address}`)}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'our-wedding.ics';
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <>
      <div className="schedule-date">
        <span>{w.wedding.day}</span>
        <h3>{w.wedding.shortDate}</h3>
        <p>
          {w.wedding.reception} · {w.wedding.time}
        </p>
        <small>{w.wedding.timezoneLabel}</small>
      </div>
      <Countdown />
      <div className="timeline">
        {w.schedule.map((item) => (
          <article key={item.time}>
            <time>{item.time}</time>
            <div>
              <h3>{item.title}</h3>
              <p>{item.detail}</p>
            </div>
          </article>
        ))}
      </div>
      <button className="secondary full-width" onClick={calendar}>
        <Icon name="calendar" size={17} />
        Add to calendar
      </button>
    </>
  );
}
export default function App() {
  const [entered, setEntered] = useState(false),
    [ready, setReady] = useState(false),
    [panel, setPanel] = useState<Panel>(null);
  const [nearby, setNearby] = useState<Area | null>(null),
    [visited, setVisited] = useState<Set<AreaId>>(new Set());
  const [dialogue, setDialogue] = useState({ name: '', message: '' }),
    [photo, setPhoto] = useState('');
  const [gameError, setGameError] = useState(''),
    [fullscreen, setFullscreen] = useState(false),
    [notice, setNotice] = useState('');
  const music = useMusic();
  const close = useCallback(() => setPanel(null), []);
  const open = useCallback((next: Panel) => {
    bridge.resetInput();
    setPanel(next);
    if (areas.some((a) => a.id === next))
      setVisited((previous) => new Set([...previous, next as AreaId]));
  }, []);
  const onGameError = useCallback((message: string) => setGameError(message), []);
  useEffect(() => {
    bridge.paused = !entered || !ready || panel !== null || document.hidden;
    bridge.resetInput();
  }, [entered, ready, panel]);
  useEffect(() => {
    const unsubscribers = [
      bridge.on('ready', () => {
        setReady(true);
        let seen = false;
        try {
          seen = localStorage.getItem(`${w.storageKey}:tutorial`) === 'seen';
        } catch {
          /* The tutorial remains available without storage. */
        }
        if (!seen) setPanel('controls');
      }),
      bridge.on('nearby', setNearby),
      bridge.on('interact', open),
      bridge.on('dialogue', (value) => {
        setDialogue(value);
        open('dialogue');
      }),
      bridge.on('photo', (data) => {
        setPhoto(data);
        open('photo');
      }),
    ];
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [open]);
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
        !entered ||
        !ready ||
        event.repeat
      )
        return;
      if (event.key === 'Escape' && !panel) {
        event.preventDefault();
        open('menu');
      }
      if (event.key.toLowerCase() === 'm' && (!panel || panel === 'map')) {
        event.preventDefault();
        open(panel === 'map' ? null : 'map');
      }
    };
    const visibility = () => {
      bridge.resetInput();
      bridge.paused = document.hidden || !!panel || !ready;
    };
    const blur = () => {
      bridge.resetInput();
      if (entered && ready && !panel) setPanel('menu');
    };
    window.addEventListener('keydown', keyboard);
    window.addEventListener('blur', blur);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('keydown', keyboard);
      window.removeEventListener('blur', blur);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [entered, ready, panel, open]);
  useEffect(() => {
    const change = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', change);
    return () => document.removeEventListener('fullscreenchange', change);
  }, []);
  const enter = () => {
    music.enter();
    setEntered(true);
  };
  const finishTutorial = () => {
    try {
      localStorage.setItem(`${w.storageKey}:tutorial`, 'seen');
    } catch {
      /* Storage is optional. */
    }
    close();
  };
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen)
        await document.documentElement.requestFullscreen();
      else
        setNotice(
          'Fullscreen isn’t supported by this browser. You can still explore the entire garden.',
        );
    } catch {
      setNotice('Fullscreen is unavailable. The garden will continue in this window.');
    }
  };
  const title = panel ? panelTitles[panel] : null;
  return (
    <>
      {!entered ? (
        <StartScreen
          onEnter={enter}
          onInvitation={() => open('invitation')}
          music={music.enabled}
          onMusic={music.toggle}
        />
      ) : (
        <main className="game-shell">
          <Suspense fallback={null}>
            <GameView onError={onGameError} />
          </Suspense>
          {(!ready || gameError) && (
            <div className="loading-screen">
              <Icon name="sprout" size={40} />
              <h2>{gameError ? 'A little pause' : 'A little world is blooming…'}</h2>
              <p>{gameError || 'Setting the table. Tying the ribbons. Waiting for you.'}</p>
              {gameError ? (
                <button className="primary" onClick={() => window.location.reload()}>
                  Try again
                </button>
              ) : (
                <span className="loading-track">
                  <i />
                </span>
              )}
            </div>
          )}
          <header className="game-header">
            <button className="game-brand" onClick={() => open('menu')}>
              <Icon name="sprout" size={25} />
              <span>
                {w.groom.name} <i>&</i> {w.bride.name}
                <small>{w.title}</small>
              </span>
            </button>
            <div className="game-toolbar">
              <button
                className="icon-button"
                aria-label="Open village map"
                onClick={() => open('map')}
              >
                <Icon name="map" />
              </button>
              <button
                className="icon-button"
                aria-label="Music settings"
                onClick={() => open('music')}
              >
                <Icon name={music.enabled ? 'volume' : 'muted'} />
              </button>
              <button
                className="icon-button fullscreen-button"
                aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                onClick={toggleFullscreen}
              >
                <Icon name={fullscreen ? 'minimize' : 'fullscreen'} />
              </button>
              <button
                className="icon-button"
                aria-label="Open wedding menu"
                onClick={() => open('menu')}
              >
                <Icon name="menu" />
              </button>
            </div>
          </header>
          <div className="location-card">
            <span className="location-icon">
              <Icon name={nearby?.icon || 'flower'} size={20} />
            </span>
            <div>
              <span>YOU’RE EXPLORING</span>
              <h2>{nearby?.name || 'The Wedding Garden'}</h2>
              <span className="discovery-inline">{visited.size} / 8 moments discovered</span>
            </div>
          </div>
          <div className="discovery-card">
            <Icon name="sparkles" size={16} />
            <span>{visited.size} / 8 moments discovered</span>
          </div>
          <MiniMap visited={visited} open={() => open('map')} />
          {!panel && ready && (
            <>
              <div className="game-bottom">
                <div className="control-hints">
                  <span>
                    <kbd>W A S D</kbd> or <kbd>↑ ← ↓ →</kbd> to wander
                  </span>
                  <span>
                    <kbd>E</kbd> to interact
                  </span>
                  <span>
                    <kbd>Esc</kbd> menu
                  </span>
                </div>
                {nearby && (
                  <button className="nearby-action" onClick={() => bridge.interact()}>
                    <Icon name={nearby.icon} size={17} />
                    <span>{nearby.subtitle}</span>
                    <kbd>E</kbd>
                  </button>
                )}
              </div>
              <MobileControls />
            </>
          )}
          {notice && (
            <div className="notice" role="status">
              {notice}
              <button onClick={() => setNotice('')} aria-label="Dismiss notice">
                <Icon name="close" size={16} />
              </button>
            </div>
          )}
        </main>
      )}
      {panel && panel !== 'dialogue' && title && (
        <Modal
          title={title[0]}
          subtitle={title[1]}
          icon={title[2]}
          onClose={close}
          wide={panel === 'map'}
        >
          {panel === 'welcome' && (
            <div className="welcome-content">
              <CoupleSprites />
              <h3>
                {w.groom.name} & {w.bride.name}
              </h3>
              <p>{w.invitation.welcome}</p>
              <p className="serif-note">Explore the wedding world to discover our invitation!</p>
              <button className="primary" onClick={() => open('invitation')}>
                Read our invitation
                <Icon name="arrow" size={17} />
              </button>
            </div>
          )}
          {panel === 'invitation' && <WeddingInvitation open={open} />}
          {panel === 'venue' && <VenueModal />}
          {panel === 'wishes' && <WishModal />}
          {panel === 'rsvp' && <RSVPModal />}
          {panel === 'schedule' && <Schedule />}
          {panel === 'story' && (
            <>
              <p className="modal-intro">A few small moments that led us to forever.</p>
              <div className="timeline story-timeline">
                {w.story.map((item) => (
                  <article key={item.year}>
                    <time>{item.year}</time>
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                    </div>
                  </article>
                ))}
              </div>
              <p className="serif-note centered">And now, we get to write the rest together.</p>
            </>
          )}
          {panel === 'pelamin' && (
            <div className="welcome-content">
              <CoupleSprites />
              <h3>
                {w.groom.name} & {w.bride.name}
              </h3>
              <p>Thank you for being part of our special day ♡</p>
              <p className="serif-note">Come a little closer. Let’s make a memory.</p>
              <button
                className="primary"
                onClick={() => {
                  if (entered && ready) bridge.takePhoto();
                  else {
                    close();
                    enter();
                  }
                }}
              >
                <Icon name="camera" size={18} />
                {entered ? 'Take Photo' : 'Enter the garden for a photo'}
              </button>
              <p className="storage-note">A framed pixel keepsake with you and the happy couple.</p>
            </div>
          )}
          {panel === 'photo' && (
            <div className="photo-content">
              <div className="photo-frame">
                <img
                  src={photo}
                  alt="A pixel photo of you with the bride and groom at the pelamin"
                />
              </div>
              <a className="primary full-width" href={photo} download="our-garden-memory.png">
                <Icon name="camera" size={17} />
                Save our memory
              </a>
              <p className="storage-note">An illustrated keepsake from the wedding garden.</p>
            </div>
          )}
          {panel === 'map' && (
            <MiniMap expanded visited={visited} open={(area) => open(area || 'map')} />
          )}
          {panel === 'controls' && <Controls onDone={finishTutorial} />}
          {panel === 'music' && <MusicControls music={music} />}
          {panel === 'menu' && (
            <div className="pause-menu">
              <button className="primary full-width" onClick={close}>
                <Icon name="play" size={17} />
                Resume your stroll
              </button>
              <div className="menu-grid">
                {(
                  [
                    ['invitation', 'mail', 'Invitation'],
                    ['schedule', 'calendar', 'Wedding Details'],
                    ['venue', 'pin', 'Venue'],
                    ['schedule', 'calendar', 'Schedule'],
                    ['story', 'book', 'Our Story'],
                    ['wishes', 'tree', 'Guestbook'],
                    ['rsvp', 'check', 'RSVP'],
                    ['map', 'map', 'Village Map'],
                    ['music', 'music', 'Music'],
                    ['controls', 'sparkles', 'Controls'],
                  ] as const
                ).map(([id, icon, name]) => (
                  <button key={name} onClick={() => open(id)}>
                    <Icon name={icon} size={19} />
                    {name}
                    <Icon name="arrow" size={15} />
                  </button>
                ))}
              </div>
              <p className="serif-note centered">Take your time. You’re among loved ones.</p>
            </div>
          )}
        </Modal>
      )}
      {panel === 'dialogue' && (
        <Modal dialogue title={dialogue.name} subtitle="A LITTLE HELLO" onClose={close}>
          <p className="rpg-message">{dialogue.message}</p>
          <button className="text-button rpg-continue" onClick={close}>
            Continue
            <Icon name="down" size={15} />
          </button>
        </Modal>
      )}
    </>
  );
}
