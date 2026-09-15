import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, CalendarDays, Copy, Download, Heart, Plus } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { platformService } from '../services/platform';
import { weddingUrl } from '../lib/urls';
import { downloadRsvpCsv } from '../lib/csv';
import type { Profile, RSVPRecord, WeddingRecord } from '../types/wedding';

export const weddingTitle = (wedding: WeddingRecord) =>
  `${wedding.groom_name} & ${wedding.bride_name}`;
export const formatDate = (value: string) => {
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
};
export const formatTimestamp = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};
export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Please try again.';
export function summarizeRsvps(records: RSVPRecord[]) {
  const attending = records.filter((record) => record.attendance === 'attending');
  return {
    total: records.length,
    attending: attending.length,
    declined: records.filter((record) => record.attendance === 'not_attending').length,
    guests: attending.reduce((total, record) => total + record.guest_count, 0),
  };
}

export function PlatformFrame({
  title,
  eyebrow,
  description,
  actions,
  children,
}: {
  title: string;
  eyebrow: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="platform-container">
      <header className="platform-hero">
        <div>
          <p className="platform-eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          {description && <p className="platform-description">{description}</p>}
        </div>
        {actions && <div className="platform-actions">{actions}</div>}
      </header>
      {children}
    </section>
  );
}

const effectiveStatus = (wedding: WeddingRecord) =>
  wedding.status !== 'draft' && wedding.expires_at && Date.parse(wedding.expires_at) <= Date.now()
    ? 'expired'
    : wedding.status;
export function StatusBadge({ wedding }: { wedding: WeddingRecord }) {
  const status = effectiveStatus(wedding);
  return <span className={`platform-badge status-${status}`}>{status}</span>;
}

export function StatsGrid({ items }: { items: { label: string; value: number | string }[] }) {
  return (
    <dl className="platform-stats">
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd>{typeof item.value === 'number' ? item.value.toLocaleString() : item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function LoadError({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="platform-alert" role="alert">
      <p>{message}</p>
      {retry && (
        <button className="platform-button quiet" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  );
}

function WeddingCard({ wedding }: { wedding: WeddingRecord }) {
  const [records, setRecords] = useState<RSVPRecord[] | null>(null);
  const [wishCount, setWishCount] = useState(0);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let current = true;
    setRecords(null);
    setError('');
    Promise.all([platformService.listRsvps(wedding.id), platformService.listWishes(wedding.id)])
      .then(([rsvps, wishes]) => {
        if (current) {
          setRecords(rsvps);
          setWishCount(wishes.length);
        }
      })
      .catch((reason: unknown) => {
        if (current) setError(errorMessage(reason));
      });
    return () => {
      current = false;
    };
  }, [wedding.id, attempt]);
  const summary = records && summarizeRsvps(records);
  const url = weddingUrl(wedding.slug);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setFeedback('Invitation link copied.');
    } catch {
      setFeedback('Select and copy the invitation link below.');
    }
  };
  return (
    <article className="platform-card platform-wedding-card" aria-label={weddingTitle(wedding)}>
      <div className="platform-card-heading">
        <span className={`platform-monogram theme-${wedding.theme}`} aria-hidden="true">
          {wedding.groom_name.charAt(0)}
          <Heart size={12} />
          {wedding.bride_name.charAt(0)}
        </span>
        <StatusBadge wedding={wedding} />
      </div>
      <h2>{weddingTitle(wedding)}</h2>
      <p className="platform-date">
        <CalendarDays size={16} aria-hidden="true" />
        {formatDate(wedding.wedding_date)}
      </p>
      <p className="platform-muted">{wedding.venue_name}</p>
      {error ? (
        <LoadError message={error} retry={() => setAttempt((value) => value + 1)} />
      ) : summary ? (
        <StatsGrid
          items={[
            { label: 'Attending responses', value: summary.attending },
            { label: 'Not attending', value: summary.declined },
            { label: 'Expected guests', value: summary.guests },
            { label: 'Wishes', value: wishCount },
          ]}
        />
      ) : (
        <p className="platform-loading" role="status">
          Loading your guest summary…
        </p>
      )}
      <div className="platform-actions">
        <a className="platform-button primary" href={url} target="_blank" rel="noreferrer">
          View wedding
          <ArrowUpRight size={16} aria-hidden="true" />
        </a>
        <Link className="platform-button" to={`/dashboard/weddings/${wedding.id}/edit`}>
          Edit wedding
        </Link>
        <Link className="platform-button" to={`/dashboard/weddings/${wedding.id}/rsvp`}>
          View RSVP
        </Link>
        <Link className="platform-button" to={`/dashboard/weddings/${wedding.id}/wishes`}>
          View wishes
        </Link>
      </div>
      <div className="platform-card-footer">
        <button
          className="platform-button quiet"
          disabled={!records}
          onClick={() => {
            if (records) {
              downloadRsvpCsv(records, wedding.slug);
              setFeedback('RSVP CSV downloaded.');
            }
          }}
        >
          <Download size={15} aria-hidden="true" />
          Export RSVP
        </button>
        <button className="platform-button quiet" onClick={() => void copy()}>
          <Copy size={15} aria-hidden="true" />
          Copy invitation link
        </button>
      </div>
      {feedback && (
        <p className="platform-feedback" role="status">
          {feedback}
        </p>
      )}
      <label className="platform-link-field">
        <span>Invitation link</span>
        <input readOnly value={url} onFocus={(event) => event.currentTarget.select()} />
      </label>
    </article>
  );
}

export function DashboardHome() {
  const { user, profile } = useAuth();
  const [weddings, setWeddings] = useState<WeddingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!user) return;
    let current = true;
    setLoading(true);
    setError('');
    platformService
      .listWeddings(user.id)
      .then((data) => {
        if (current) setWeddings(data);
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
  }, [user?.id, attempt]);
  return (
    <PlatformFrame
      eyebrow="Your celebration"
      title="Wedding dashboard"
      description={`Welcome${profile?.display_name ? `, ${profile.display_name}` : ''}. Your wedding details, guest responses and heartfelt wishes, together.`}
    >
      {loading ? (
        <p className="platform-loading" role="status">
          Loading your weddings…
        </p>
      ) : error ? (
        <LoadError message={error} retry={() => setAttempt((value) => value + 1)} />
      ) : weddings.length ? (
        <div className="platform-wedding-grid">
          {weddings.map((wedding) => (
            <WeddingCard key={wedding.id} wedding={wedding} />
          ))}
        </div>
      ) : (
        <div className="platform-empty">
          <Heart size={28} aria-hidden="true" />
          <h2>Your celebration starts here</h2>
          <p>
            No wedding has been assigned to your account yet. Contact your wedding administrator to
            get started.
          </p>
        </div>
      )}
    </PlatformFrame>
  );
}

export function AdminPage() {
  const [weddings, setWeddings] = useState<WeddingRecord[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    active: number;
    draft: number;
    expired: number;
    rsvps: number;
  } | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let current = true;
    setLoading(true);
    setError('');
    Promise.all([
      platformService.listWeddings(),
      platformService.listProfiles(),
      platformService.adminStats(),
    ])
      .then(([records, people, totals]) => {
        if (current) {
          setWeddings(records);
          setProfiles(people);
          setStats(totals);
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
  }, [attempt]);
  const owners = useMemo(
    () => new Map(profiles.map((profile) => [profile.id, profile.display_name || profile.id])),
    [profiles],
  );
  const visible = weddings.filter(
    (wedding) =>
      (status === 'all' || effectiveStatus(wedding) === status) &&
      `${weddingTitle(wedding)} ${wedding.slug} ${owners.get(wedding.owner_id || '') || ''}`
        .toLowerCase()
        .includes(query.toLowerCase().trim()),
  );
  return (
    <PlatformFrame
      eyebrow="Administration"
      title="Every celebration, one place"
      description="Create weddings, manage access and keep an eye on guest responses."
      actions={
        <Link className="platform-button primary" to="/admin/weddings/new">
          <Plus size={17} aria-hidden="true" />
          Create wedding
        </Link>
      }
    >
      {loading ? (
        <p className="platform-loading" role="status">
          Loading the wedding overview…
        </p>
      ) : error ? (
        <LoadError message={error} retry={() => setAttempt((value) => value + 1)} />
      ) : (
        <>
          {stats && (
            <StatsGrid
              items={[
                { label: 'Total weddings', value: stats.total },
                { label: 'Active', value: stats.active },
                { label: 'Draft', value: stats.draft },
                { label: 'Expired', value: stats.expired },
                { label: 'RSVP responses', value: stats.rsvps },
              ]}
            />
          )}
          <section className="platform-card">
            <div className="platform-section-heading">
              <h2>Weddings</h2>
              <span className="platform-muted">{weddings.length} in total</span>
            </div>
            <div className="platform-toolbar">
              <label className="platform-field">
                <span>Search weddings</span>
                <input
                  type="search"
                  placeholder="Couple, slug or owner"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <label className="platform-field">
                <span>Status</span>
                <select value={status} onChange={(event) => setStatus(event.target.value)}>
                  <option value="all">All statuses</option>
                  {['draft', 'active', 'archived', 'expired'].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {!visible.length ? (
              <div className="platform-empty">
                <h3>
                  {weddings.length ? 'No matching weddings' : 'Ready for the first celebration'}
                </h3>
                <p>
                  {weddings.length
                    ? 'Try a different search or status.'
                    : 'Create a wedding and assign its owner to begin.'}
                </p>
              </div>
            ) : (
              <div
                className="platform-table-wrap"
                role="region"
                aria-label="Wedding list"
                tabIndex={0}
              >
                <table className="platform-table">
                  <thead>
                    <tr>
                      <th>Couple / slug</th>
                      <th>Wedding date</th>
                      <th>Status</th>
                      <th>Owner</th>
                      <th>Created</th>
                      <th>Manage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((wedding) => (
                      <tr key={wedding.id}>
                        <td>
                          <strong>{weddingTitle(wedding)}</strong>
                          <small>{wedding.slug}</small>
                        </td>
                        <td>{formatDate(wedding.wedding_date)}</td>
                        <td>
                          <StatusBadge wedding={wedding} />
                        </td>
                        <td>
                          {wedding.owner_id
                            ? owners.get(wedding.owner_id) || wedding.owner_id
                            : 'Unassigned'}
                        </td>
                        <td>{formatDate(wedding.created_at)}</td>
                        <td>
                          <div className="platform-row-actions">
                            <Link to={`/admin/weddings/${wedding.id}/edit`}>Edit</Link>
                            <a href={weddingUrl(wedding.slug)} target="_blank" rel="noreferrer">
                              View
                            </a>
                            <Link to={`/dashboard/weddings/${wedding.id}/rsvp`}>RSVP</Link>
                            <Link to={`/dashboard/weddings/${wedding.id}/wishes`}>Wishes</Link>
                          </div>
                        </td>
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
