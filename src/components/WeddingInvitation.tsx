import { useWeddingConfig } from '../context/WeddingContext';
import { Icon } from './Icon';
export function WeddingInvitation({
  open,
}: {
  open: (panel: 'venue' | 'schedule' | 'rsvp') => void;
}) {
  const w = useWeddingConfig();
  return (
    <div className="formal-invitation">
      <p className="bismillah" lang="ar" dir="rtl">
        {w.invitation.bismillah}
      </p>
      <p className="formal-greeting">{w.invitation.greeting}</p>
      <p>{w.invitation.introduction}</p>
      <div className="couple-names">
        {w.groom.fullName}
        <span>&</span>
        {w.bride.fullName}
      </div>
      <p>{w.invitation.families}</p>
      {(w.groom.father || w.groom.mother || w.bride.father || w.bride.mother) && (
        <div className="families">
          <span>
            {w.groom.father}
            {w.groom.father && w.groom.mother && (
              <>
                <br />&{' '}
              </>
            )}
            {w.groom.mother}
          </span>
          <Icon name="sprout" />
          <span>
            {w.bride.father}
            {w.bride.father && w.bride.mother && (
              <>
                <br />&{' '}
              </>
            )}
            {w.bride.mother}
          </span>
        </div>
      )}
      <div className="invitation-details">
        <strong>{w.wedding.date}</strong>
        <span>{w.wedding.time}</span>
        <span>{w.venue.name}</span>
      </div>
      <p className="serif-note">{w.invitation.closing}</p>
      <div className="button-row">
        <button className="secondary" onClick={() => open('venue')}>
          <Icon name="pin" size={16} />
          Venue
        </button>
        <button className="secondary" onClick={() => open('schedule')}>
          <Icon name="calendar" size={16} />
          Schedule
        </button>
        <button className="primary" onClick={() => open('rsvp')}>
          RSVP
          <Icon name="arrow" size={16} />
        </button>
      </div>
    </div>
  );
}
