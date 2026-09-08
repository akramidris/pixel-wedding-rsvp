import { useEffect, useState, type FormEvent } from 'react';
import { weddingRepository } from '../services/storage';
import { Icon } from './Icon';
export function RSVPModal() {
  const [name, setName] = useState(''),
    [attending, setAttending] = useState(true),
    [guests, setGuests] = useState(1),
    [message, setMessage] = useState('');
  const [saved, setSaved] = useState(false),
    [error, setError] = useState(''),
    [saving, setSaving] = useState(false),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    weddingRepository
      .getRSVP()
      .then((r) => {
        if (active && r) {
          setName(r.name);
          setAttending(r.attending);
          setGuests(r.guests || 1);
          setMessage(r.message);
        }
      })
      .catch(() => {
        if (active) setError('Your previous response could not be loaded.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await weddingRepository.saveRSVP({ name, attending, guests, message });
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Your RSVP could not be saved.');
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <p className="modal-intro">We’d love to save a place for you.</p>
      <form className="wedding-form" onSubmit={submit}>
        <fieldset disabled={loading || saving}>
          <label>
            Guest name
            <input
              required
              autoComplete="name"
              maxLength={80}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSaved(false);
              }}
              placeholder="Your full name"
            />
          </label>
          <fieldset className="attendance">
            <legend>Will you be joining us?</legend>
            <label className={attending ? 'selected' : ''}>
              <input
                type="radio"
                name="attendance"
                checked={attending}
                onChange={() => {
                  setAttending(true);
                  setSaved(false);
                }}
              />
              <Icon name="heart" size={18} />
              Yes, InsyaAllah
            </label>
            <label className={!attending ? 'selected' : ''}>
              <input
                type="radio"
                name="attendance"
                checked={!attending}
                onChange={() => {
                  setAttending(false);
                  setSaved(false);
                }}
              />
              Sorry, I cannot attend
            </label>
          </fieldset>
          {attending && (
            <label>
              Number of guests <span className="label-note">Including yourself</span>
              <select
                value={guests}
                onChange={(e) => {
                  setGuests(Number(e.target.value));
                  setSaved(false);
                }}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? 'guest' : 'guests'}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            A little note <span className="label-note">Optional</span>
            <textarea
              rows={3}
              maxLength={600}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setSaved(false);
              }}
              placeholder="Anything you’d like us to know?"
            />
          </label>
          <button className="primary full-width">
            <Icon name="check" size={17} />
            {saving ? 'Saving…' : 'Submit RSVP'}
          </button>
        </fieldset>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {saved && (
          <div className="success" role="status">
            <Icon name="checks" size={20} />
            <span>
              {attending
                ? 'Your place is saved on this device. We can’t wait to celebrate with you!'
                : 'Your response is saved. Thank you for keeping us in your prayers.'}
            </span>
          </div>
        )}
      </form>
      <p className="storage-note">
        Your response is saved on this device. It isn’t sent to the couple yet. You can return here
        to update it.
      </p>
    </>
  );
}
