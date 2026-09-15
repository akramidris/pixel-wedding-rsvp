import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useWedding } from '../context/WeddingContext';
import { Icon } from './Icon';
export function RSVPModal() {
  const { config, repository } = useWedding();
  const demo = repository.mode === 'demo';
  const submitting = useRef(false);
  const mounted = useRef(true);
  const [name, setName] = useState(''),
    [attending, setAttending] = useState(true),
    [guests, setGuests] = useState(1),
    [phone, setPhone] = useState(''),
    [message, setMessage] = useState('');
  const [saved, setSaved] = useState(false),
    [error, setError] = useState(''),
    [saving, setSaving] = useState(false),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    mounted.current = true;
    repository
      .getRSVP()
      .then((r) => {
        if (active && r) {
          setName(r.name);
          setAttending(r.attending);
          setGuests(Math.min(r.guests || 1, config.settings.maxGuests));
          setPhone(r.phone || '');
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
      mounted.current = false;
    };
  }, [repository, config.settings.maxGuests]);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting.current || loading) return;
    submitting.current = true;
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      if (!name.trim()) throw new Error('Please add your name.');
      if (
        attending &&
        (!Number.isInteger(guests) || guests < 1 || guests > config.settings.maxGuests)
      )
        throw new Error(`Please choose 1 to ${config.settings.maxGuests} guests.`);
      await repository.saveRSVP({ name, attending, guests, phone, message });
      if (mounted.current) setSaved(true);
    } catch (e) {
      if (mounted.current)
        setError(e instanceof Error ? e.message : 'Your RSVP could not be saved.');
    } finally {
      submitting.current = false;
      if (mounted.current) setSaving(false);
    }
  };
  return (
    <>
      <p className="modal-intro">We’d love to save a place for you.</p>
      {loading && (
        <p className="storage-note" role="status">
          Loading your response…
        </p>
      )}
      <form className="wedding-form" onSubmit={submit} aria-busy={loading || saving}>
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
                {Array.from({ length: config.settings.maxGuests }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? 'guest' : 'guests'}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            Phone <span className="label-note">Optional</span>
            <input
              type="tel"
              autoComplete="tel"
              maxLength={30}
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setSaved(false);
              }}
              placeholder="For a wedding-related update"
            />
          </label>
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
              {demo
                ? attending
                  ? 'Your place is saved on this device. We can’t wait to celebrate with you!'
                  : 'Your response is saved. Thank you for keeping us in your prayers.'
                : attending
                  ? 'Your RSVP has been sent to the couple. We can’t wait to celebrate with you!'
                  : 'Your response has been sent to the couple. Thank you for keeping us in your prayers.'}
            </span>
          </div>
        )}
      </form>
      <p className="storage-note">
        {demo
          ? 'Your response is saved on this device. It isn’t sent to the couple yet. You can return here to update it.'
          : 'Your response is shared privately with the couple. No guest account is needed.'}
      </p>
    </>
  );
}
