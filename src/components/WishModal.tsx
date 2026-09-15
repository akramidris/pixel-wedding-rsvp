import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Wish } from '../services/storage';
import { useWedding } from '../context/WeddingContext';
import { Icon } from './Icon';
export function WishModal() {
  const { repository } = useWedding();
  const demo = repository.mode === 'demo';
  const submitting = useRef(false);
  const mounted = useRef(true);
  const [wishes, setWishes] = useState<Wish[]>([]),
    [name, setName] = useState(''),
    [message, setMessage] = useState('');
  const [error, setError] = useState(''),
    [success, setSuccess] = useState(false),
    [pendingApproval, setPendingApproval] = useState(false),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false);
  useEffect(() => {
    let active = true;
    mounted.current = true;
    repository
      .getWishes()
      .then((data) => {
        if (active)
          setWishes(
            data.filter((wish) => (demo ? wish.approved !== false : wish.approved === true)),
          );
      })
      .catch(() => {
        if (active)
          setError(
            demo
              ? 'Saved wishes are unavailable. Please allow browser storage.'
              : 'Wishes could not be loaded. Please try again shortly.',
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      mounted.current = false;
    };
  }, [repository, demo]);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting.current || loading) return;
    submitting.current = true;
    setError('');
    setSuccess(false);
    setSaving(true);
    try {
      if (!name.trim() || !message.trim()) throw new Error('Please add your name and a wish.');
      const wish = await repository.addWish(name, message);
      if (mounted.current) {
        const visible = demo ? wish.approved !== false : wish.approved === true;
        if (visible) setWishes((previous) => [wish, ...previous]);
        setPendingApproval(!visible);
        setMessage('');
        setSuccess(true);
      }
    } catch (e) {
      if (mounted.current)
        setError(
          e instanceof Error ? e.message : 'Your wish could not be saved. Please try again.',
        );
    } finally {
      submitting.current = false;
      if (mounted.current) setSaving(false);
    }
  };
  return (
    <>
      <p className="modal-intro">
        A prayer, a memory, a little note of love.
        <br />
        We’ll treasure every word.
      </p>
      <form onSubmit={submit} className="wedding-form" aria-busy={loading || saving}>
        <fieldset disabled={loading || saving}>
          <label>
            Your name
            <input
              autoComplete="name"
              required
              maxLength={80}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSuccess(false);
              }}
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
              onChange={(e) => {
                setMessage(e.target.value);
                setSuccess(false);
              }}
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
        </fieldset>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className="success" role="status">
            <Icon name="heart" size={16} />
            {pendingApproval
              ? 'Your wish has been sent to the couple and is waiting for approval. Thank you ♡'
              : 'Thank you for your beautiful wish ♡'}
          </p>
        )}
      </form>
      <div className="wish-board">
        <h3>
          A little love, left here <span>{wishes.length}</span>
        </h3>
        {loading ? (
          <p className="empty-note" role="status">
            Loading wishes…
          </p>
        ) : wishes.length ? (
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
        {demo
          ? 'Wishes are saved on this device. They aren’t sent to the couple yet.'
          : 'Wishes are sent to the couple. Approved wishes appear on the wishing tree.'}
      </p>
    </>
  );
}
