import { useEffect, useState, type FormEvent } from 'react';
import { weddingRepository, type Wish } from '../services/storage';
import { Icon } from './Icon';
export function WishModal() {
  const [wishes, setWishes] = useState<Wish[]>([]),
    [name, setName] = useState(''),
    [message, setMessage] = useState('');
  const [error, setError] = useState(''),
    [success, setSuccess] = useState(false),
    [saving, setSaving] = useState(false);
  useEffect(() => {
    let active = true;
    weddingRepository
      .getWishes()
      .then((data) => {
        if (active) setWishes(data);
      })
      .catch(() => {
        if (active) setError('Saved wishes are unavailable. Please allow browser storage.');
      });
    return () => {
      active = false;
    };
  }, []);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess(false);
    setSaving(true);
    try {
      const wish = await weddingRepository.addWish(name, message);
      setWishes((previous) => [wish, ...previous]);
      setMessage('');
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Your wish could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <p className="modal-intro">
        A prayer, a memory, a little note of love.
        <br />
        We’ll treasure every word.
      </p>
      <form onSubmit={submit} className="wedding-form">
        <label>
          Your name
          <input
            autoComplete="name"
            required
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="The name we know and love"
          />
        </label>
        <label>
          Your wish
          <textarea
            required
            maxLength={600}
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="May your next chapter be filled with…"
          />
        </label>
        <div className="form-bottom">
          <span>{message.length} / 600</span>
          <button className="primary" disabled={saving}>
            <Icon name="send" size={16} />
            {saving ? 'Saving…' : 'Send Wish'}
          </button>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className="success" role="status">
            <Icon name="heart" size={16} />
            Thank you for your beautiful wish ♡
          </p>
        )}
      </form>
      <div className="wish-board">
        <h3>
          A little love, left here <span>{wishes.length}</span>
        </h3>
        {wishes.length ? (
          wishes.slice(0, 8).map((wish) => (
            <article className="wish" key={wish.id}>
              <Icon name="heart" size={16} />
              <div>
                <p>{wish.message}</p>
                <span>— {wish.name}</span>
              </div>
            </article>
          ))
        ) : (
          <p className="empty-note">The first ribbon on our wishing tree could be yours.</p>
        )}
      </div>
      <p className="storage-note">
        Wishes are saved on this device. They aren’t sent to the couple yet.
      </p>
    </>
  );
}
