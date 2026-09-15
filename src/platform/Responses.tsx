import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Download, EyeOff, MessageSquare } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { platformService } from '../services/platform';
import { downloadRsvpCsv } from '../lib/csv';
import type { RSVPRecord, WeddingRecord, WishRecord } from '../types/wedding';
import {
  errorMessage,
  formatTimestamp,
  LoadError,
  PlatformFrame,
  StatsGrid,
  summarizeRsvps,
  weddingTitle,
} from './Dashboard';

export function RsvpPage() {
  const { weddingId } = useParams<{ weddingId: string }>();
  const { profile } = useAuth();
  const [wedding, setWedding] = useState<WeddingRecord | null>(null);
  const [records, setRecords] = useState<RSVPRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [query, setQuery] = useState('');
  const [attendance, setAttendance] = useState('all');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!weddingId) {
      setError('Choose a wedding to view its responses.');
      setLoading(false);
      return;
    }
    let current = true;
    setLoading(true);
    setError('');
    setWedding(null);
    setRecords([]);
    Promise.all([platformService.getWedding(weddingId), platformService.listRsvps(weddingId)])
      .then(([details, rows]) => {
        if (current) {
          setWedding(details);
          setRecords(rows);
        }
      })
      .catch((reason: unknown) => {
        if (current) setError(errorMessage(reason));
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [weddingId, attempt]);
  const visible = useMemo(
    () =>
      records.filter(
        (record) =>
          (attendance === 'all' || record.attendance === attendance) &&
          record.guest_name.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [records, attendance, query],
  );
  const summary = summarizeRsvps(records);
  const filtered = attendance !== 'all' || query.trim() !== '';
  return (
    <PlatformFrame
      eyebrow="Guest responses"
      title={wedding ? weddingTitle(wedding) : 'RSVP responses'}
      description="See who is joining you and plan a place for every guest."
      actions={
        <Link
          className="platform-button quiet"
          to={profile?.role === 'admin' ? '/admin' : '/dashboard'}
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to weddings
        </Link>
      }
    >
      {loading ? (
        <p className="platform-loading" role="status">
          Loading guest responses…
        </p>
      ) : error ? (
        <LoadError message={error} retry={() => setAttempt((value) => value + 1)} />
      ) : (
        <>
          <StatsGrid
            items={[
              { label: 'Total responses', value: summary.total },
              { label: 'Attending responses', value: summary.attending },
              { label: 'Not attending', value: summary.declined },
              { label: 'Expected guests', value: summary.guests },
            ]}
          />
          <section className="platform-card">
            <div className="platform-section-heading">
              <div>
                <h2>RSVP list</h2>
                <p className="platform-muted">Summary totals include all responses.</p>
              </div>
              <button
                className="platform-button"
                disabled={!visible.length || !wedding}
                onClick={() => {
                  if (wedding) {
                    downloadRsvpCsv(visible, wedding.slug);
                    setFeedback(
                      `${visible.length} response${visible.length === 1 ? '' : 's'} exported.`,
                    );
                  }
                }}
              >
                <Download size={16} aria-hidden="true" />
                {filtered ? 'Export filtered CSV' : 'Export RSVP CSV'}
              </button>
            </div>
            <div className="platform-toolbar">
              <label className="platform-field">
                <span>Search guest names</span>
                <input
                  type="search"
                  placeholder="Find a guest"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <label className="platform-field">
                <span>Attendance</span>
                <select value={attendance} onChange={(event) => setAttendance(event.target.value)}>
                  <option value="all">All responses</option>
                  <option value="attending">Attending</option>
                  <option value="not_attending">Not attending</option>
                </select>
              </label>
            </div>
            {feedback && (
              <p className="platform-feedback" role="status">
                {feedback}
              </p>
            )}
            <p className="platform-result-count" aria-live="polite">
              {visible.length} of {records.length} responses
            </p>
            {!visible.length ? (
              <div className="platform-empty">
                <h3>{records.length ? 'No matching guests' : 'Your guest list is taking shape'}</h3>
                <p>
                  {records.length
                    ? 'Try another name or attendance filter.'
                    : 'Share your invitation. Responses will appear here as guests reply.'}
                </p>
              </div>
            ) : (
              <div
                className="platform-table-wrap"
                role="region"
                aria-label="Guest responses"
                tabIndex={0}
              >
                <table className="platform-table">
                  <thead>
                    <tr>
                      <th>Guest name</th>
                      <th>Attendance</th>
                      <th>Guest count</th>
                      <th>Phone</th>
                      <th>Message</th>
                      <th>Submitted at</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((record) => (
                      <tr key={record.id}>
                        <td>
                          <strong>{record.guest_name}</strong>
                        </td>
                        <td>
                          <span
                            className={`platform-badge ${record.attendance === 'attending' ? 'status-active' : 'status-archived'}`}
                          >
                            {record.attendance === 'attending' ? 'Attending' : 'Not attending'}
                          </span>
                        </td>
                        <td>{record.guest_count}</td>
                        <td className="platform-nowrap">{record.phone || '—'}</td>
                        <td className="platform-message-cell">{record.message || '—'}</td>
                        <td>{formatTimestamp(record.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </PlatformFrame>
  );
}

export function WishesPage() {
  const { weddingId } = useParams<{ weddingId: string }>();
  const { profile } = useAuth();
  const [wedding, setWedding] = useState<WeddingRecord | null>(null);
  const [records, setRecords] = useState<WishRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState<Set<string>>(() => new Set());
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!weddingId) {
      setError('Choose a wedding to view its wishes.');
      setLoading(false);
      return;
    }
    let current = true;
    setLoading(true);
    setError('');
    setWedding(null);
    setRecords([]);
    setActionError('');
    setFeedback('');
    Promise.all([platformService.getWedding(weddingId), platformService.listWishes(weddingId)])
      .then(([details, rows]) => {
        if (current) {
          setWedding(details);
          setRecords(rows);
        }
      })
      .catch((reason: unknown) => {
        if (current) setError(errorMessage(reason));
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [weddingId, attempt]);
  const moderate = async (wish: WishRecord) => {
    if (!weddingId || busy.has(wish.id)) return;
    const approved = !wish.approved;
    setBusy((current) => new Set(current).add(wish.id));
    setActionError('');
    setFeedback('');
    try {
      await platformService.moderateWish(wish.id, weddingId, approved);
      setRecords((current) =>
        current.map((record) => (record.id === wish.id ? { ...record, approved } : record)),
      );
      setFeedback(
        `The wish from ${wish.guest_name} is ${approved ? 'approved and visible in the guestbook' : 'hidden from the public guestbook'}.`,
      );
    } catch (reason) {
      setActionError(errorMessage(reason));
    } finally {
      setBusy((current) => {
        const next = new Set(current);
        next.delete(wish.id);
        return next;
      });
    }
  };
  const approvedCount = records.filter((record) => record.approved).length;
  const visible = records.filter(
    (record) =>
      (filter === 'all' || record.approved === (filter === 'approved')) &&
      `${record.guest_name} ${record.message}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <PlatformFrame
      eyebrow="Your guestbook"
      title={wedding ? weddingTitle(wedding) : 'Guest wishes'}
      description="Keep every kind word, and choose which wishes appear in your public guestbook."
      actions={
        <Link
          className="platform-button quiet"
          to={profile?.role === 'admin' ? '/admin' : '/dashboard'}
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to weddings
        </Link>
      }
    >
      {loading ? (
        <p className="platform-loading" role="status">
          Loading guest wishes…
        </p>
      ) : error ? (
        <LoadError message={error} retry={() => setAttempt((value) => value + 1)} />
      ) : (
        <>
          <StatsGrid
            items={[
              { label: 'Total wishes', value: records.length },
              { label: 'Approved', value: approvedCount },
              { label: 'Hidden / awaiting review', value: records.length - approvedCount },
            ]}
          />
          <section className="platform-card">
            <div className="platform-toolbar">
              <label className="platform-field">
                <span>Search wishes</span>
                <input
                  type="search"
                  value={query}
                  placeholder="Guest name or message"
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <label className="platform-field">
                <span>Visibility</span>
                <select value={filter} onChange={(event) => setFilter(event.target.value)}>
                  <option value="all">All wishes</option>
                  <option value="approved">Approved</option>
                  <option value="hidden">Hidden / awaiting review</option>
                </select>
              </label>
            </div>
            {actionError && <LoadError message={actionError} />}
            {feedback && (
              <p className="platform-feedback" role="status">
                {feedback}
              </p>
            )}
            <p className="platform-result-count" aria-live="polite">
              {visible.length} of {records.length} wishes
            </p>
            {!visible.length ? (
              <div className="platform-empty">
                <MessageSquare size={28} aria-hidden="true" />
                <h3>
                  {records.length ? 'No wishes match your search' : 'A little love will grow here'}
                </h3>
                <p>
                  {records.length
                    ? 'Try another search or visibility filter.'
                    : 'Messages from your guests will appear here, ready for your review.'}
                </p>
              </div>
            ) : (
              <div className="platform-wishes">
                {visible.map((wish) => (
                  <article className="platform-wish" key={wish.id}>
                    <div className="platform-section-heading">
                      <div>
                        <h3>{wish.guest_name}</h3>
                        <time dateTime={wish.created_at}>{formatTimestamp(wish.created_at)}</time>
                      </div>
                      <span
                        className={`platform-badge ${wish.approved ? 'status-active' : 'status-draft'}`}
                      >
                        {wish.approved ? 'Approved' : 'Hidden'}
                      </span>
                    </div>
                    <p>{wish.message}</p>
                    <button
                      className="platform-button quiet"
                      disabled={busy.has(wish.id)}
                      onClick={() => void moderate(wish)}
                    >
                      {busy.has(wish.id) ? (
                        'Saving…'
                      ) : wish.approved ? (
                        <>
                          <EyeOff size={15} aria-hidden="true" />
                          Hide wish
                        </>
                      ) : (
                        <>
                          <Check size={15} aria-hidden="true" />
                          Approve wish
                        </>
                      )}
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </PlatformFrame>
  );
}
