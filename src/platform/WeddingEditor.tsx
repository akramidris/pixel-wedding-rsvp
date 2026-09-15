import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowDown, ArrowLeft, ArrowUp, ArrowUpRight, Plus, Save, Trash2 } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { platformService } from '../services/platform';
import { weddingUrl } from '../lib/urls';
import type {
  Profile,
  ScheduleItem,
  StoryItem,
  WeddingInput,
  WeddingRecord,
} from '../types/wedding';
import { errorMessage, LoadError, PlatformFrame } from './Dashboard';

const blankWedding = (ownerId: string): WeddingInput => ({
  owner_id: ownerId,
  slug: '',
  groom_name: '',
  bride_name: '',
  wedding_date: '',
  start_time: '11:00',
  end_time: '16:00',
  venue_name: '',
  venue_address: '',
  google_maps_url: '',
  waze_url: '',
  theme: 'sage',
  template: 'garden',
  music_url: '',
  status: 'draft',
  story: [],
  schedule: [],
  settings: {},
  expires_at: null,
});

function toInput(record: WeddingRecord): WeddingInput {
  const { id: _id, created_at: _created, updated_at: _updated, ...input } = record;
  return {
    ...input,
    start_time: input.start_time.slice(0, 5),
    end_time: input.end_time.slice(0, 5),
  };
}

function localDateTime(iso: string | null): string {
  if (!iso) return '';
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return '';
  const pad = (number: number) => String(number).padStart(2, '0');
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

function reorder<T>(rows: T[], index: number, direction: -1 | 1): T[] {
  const next = [...rows];
  [next[index], next[index + direction]] = [next[index + direction], next[index]];
  return next;
}

export function WeddingEditorPage() {
  const { weddingId } = useParams<{ weddingId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const adminMode = profile?.role === 'admin' && location.pathname.startsWith('/admin');
  const creating = !weddingId;
  const [form, setForm] = useState<WeddingInput>(() => blankWedding(user?.id || ''));
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [expiration, setExpiration] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [dirty, setDirty] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const back = adminMode ? '/admin' : '/dashboard';

  useEffect(() => {
    let current = true;
    setLoading(true);
    setError('');
    setSaveError('');
    setFeedback(typeof location.state?.notice === 'string' ? location.state.notice : '');
    if (creating && !adminMode) {
      setError('Only an administrator can create a wedding.');
      setLoading(false);
      return;
    }
    Promise.all([
      weddingId ? platformService.getWedding(weddingId) : Promise.resolve(null),
      adminMode ? platformService.listProfiles() : Promise.resolve([] as Profile[]),
    ])
      .then(([record, people]) => {
        if (!current) return;
        setForm(record ? toInput(record) : blankWedding(user?.id || ''));
        setExpiration(localDateTime(record?.expires_at || null));
        setProfiles(people);
        setDirty(!record);
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
  }, [weddingId, adminMode, user?.id, attempt]);

  const change = <K extends keyof WeddingInput>(key: K, value: WeddingInput[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setDirty(true);
    setFeedback('');
  };
  const storyChange = (index: number, key: keyof StoryItem, value: string) =>
    change(
      'story',
      form.story.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)),
    );
  const scheduleChange = (index: number, key: keyof ScheduleItem, value: string) =>
    change(
      'schedule',
      form.schedule.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)),
    );

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    setSaveError('');
    setFeedback('');
    if (adminMode && !form.owner_id) {
      setSaveError('Choose an owner for this wedding.');
      return;
    }
    if (form.end_time <= form.start_time) {
      setSaveError('End time must be later than start time.');
      return;
    }
    // Explicit allowlist: customer requests never contain owner, slug, status,
    // template, expiration or settings, including values loaded from the record.
    const editable: Partial<WeddingInput> = {
      groom_name: form.groom_name.trim(),
      bride_name: form.bride_name.trim(),
      wedding_date: form.wedding_date,
      start_time: form.start_time,
      end_time: form.end_time,
      venue_name: form.venue_name.trim(),
      venue_address: form.venue_address.trim(),
      google_maps_url: form.google_maps_url.trim(),
      waze_url: form.waze_url.trim(),
      theme: form.theme,
      music_url: form.music_url?.trim() || '',
      story: form.story.map((row) => ({
        year: row.year.trim(),
        title: row.title.trim(),
        description: row.description.trim(),
      })),
      schedule: form.schedule.map((row) => ({
        time: row.time.trim(),
        title: row.title.trim(),
        detail: row.detail.trim(),
      })),
    };
    let payload = editable;
    if (adminMode) {
      const expires = expiration ? new Date(expiration) : null;
      if (expires && Number.isNaN(expires.getTime())) {
        setSaveError('Enter a valid expiration date.');
        return;
      }
      payload = {
        ...editable,
        owner_id: form.owner_id,
        slug: form.slug.trim(),
        status: form.status,
        template: 'garden',
        settings: form.settings || {},
        expires_at: expires?.toISOString() || null,
      };
    }
    setSaving(true);
    try {
      const saved = creating
        ? await platformService.createWedding(payload as WeddingInput)
        : await platformService.updateWedding(weddingId, payload);
      setForm(toInput(saved));
      setDirty(false);
      if (creating)
        navigate(`/admin/weddings/${saved.id}/edit`, {
          replace: true,
          state: {
            notice: 'Wedding created. Activate it when you are ready to share the invitation.',
          },
        });
      else
        setFeedback(
          'Wedding saved. Guests will see the updated details when they next open the invitation.',
        );
    } catch (reason) {
      setSaveError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PlatformFrame
      eyebrow={adminMode ? 'Wedding administration' : 'Make it yours'}
      title={creating ? 'Create a wedding' : 'Edit your wedding'}
      description="The details that make this celebration yours. Your invitation updates after you save."
      actions={
        <Link className="platform-button quiet" to={back}>
          <ArrowLeft size={16} aria-hidden="true" />
          Back to weddings
        </Link>
      }
    >
      {loading ? (
        <p className="platform-loading" role="status">
          Loading wedding details…
        </p>
      ) : error ? (
        <LoadError message={error} retry={() => setAttempt((value) => value + 1)} />
      ) : (
        <form className="platform-form" onSubmit={(event) => void save(event)}>
          {saveError && <LoadError message={saveError} />}
          {feedback && (
            <p className="platform-feedback" role="status">
              {feedback}
            </p>
          )}
          <fieldset disabled={saving} className="platform-editor-fields">
            <section className="platform-card">
              <div className="platform-section-heading">
                <div>
                  <h2>The happy couple</h2>
                  <p className="platform-muted">Names and the time you will celebrate together.</p>
                </div>
                <span className="platform-step" aria-hidden="true">
                  01
                </span>
              </div>
              <div className="platform-form-grid">
                <label className="platform-field">
                  <span>Groom name</span>
                  <input
                    required
                    maxLength={120}
                    value={form.groom_name}
                    onChange={(event) => change('groom_name', event.target.value)}
                    autoComplete="off"
                  />
                </label>
                <label className="platform-field">
                  <span>Bride name</span>
                  <input
                    required
                    maxLength={120}
                    value={form.bride_name}
                    onChange={(event) => change('bride_name', event.target.value)}
                    autoComplete="off"
                  />
                </label>
              </div>
              <div className="platform-form-grid three">
                <label className="platform-field">
                  <span>Wedding date</span>
                  <input
                    type="date"
                    required
                    value={form.wedding_date}
                    onChange={(event) => change('wedding_date', event.target.value)}
                  />
                </label>
                <label className="platform-field">
                  <span>Start time</span>
                  <input
                    type="time"
                    required
                    value={form.start_time}
                    onChange={(event) => change('start_time', event.target.value)}
                  />
                </label>
                <label className="platform-field">
                  <span>End time</span>
                  <input
                    type="time"
                    required
                    value={form.end_time}
                    onChange={(event) => change('end_time', event.target.value)}
                  />
                </label>
              </div>
            </section>

            <section className="platform-card">
              <div className="platform-section-heading">
                <div>
                  <h2>A place to celebrate</h2>
                  <p className="platform-muted">Help your guests arrive with ease.</p>
                </div>
                <span className="platform-step" aria-hidden="true">
                  02
                </span>
              </div>
              <label className="platform-field">
                <span>Venue name</span>
                <input
                  required
                  maxLength={200}
                  value={form.venue_name}
                  onChange={(event) => change('venue_name', event.target.value)}
                />
              </label>
              <label className="platform-field">
                <span>Venue address</span>
                <textarea
                  required
                  rows={3}
                  maxLength={1000}
                  value={form.venue_address}
                  onChange={(event) => change('venue_address', event.target.value)}
                />
              </label>
              <div className="platform-form-grid">
                <label className="platform-field">
                  <span>Google Maps URL</span>
                  <input
                    type="url"
                    maxLength={2048}
                    pattern="https://.*"
                    placeholder="https://maps.google.com/…"
                    value={form.google_maps_url}
                    onChange={(event) => change('google_maps_url', event.target.value)}
                  />
                </label>
                <label className="platform-field">
                  <span>Waze URL</span>
                  <input
                    type="url"
                    maxLength={2048}
                    pattern="https://.*"
                    placeholder="https://waze.com/…"
                    value={form.waze_url}
                    onChange={(event) => change('waze_url', event.target.value)}
                  />
                </label>
              </div>
              <p className="platform-help">
                Use full HTTPS links. Leave a link blank if it is not available.
              </p>
            </section>

            <section className="platform-card">
              <div className="platform-section-heading">
                <div>
                  <h2>Your story</h2>
                  <p className="platform-muted">The moments guests discover in the story garden.</p>
                </div>
                <span className="platform-step" aria-hidden="true">
                  03
                </span>
              </div>
              {!form.story.length && (
                <p className="platform-empty-inline">
                  No story moments yet. Add the chapters you would like to share.
                </p>
              )}
              {form.story.map((row, index) => (
                <div className="platform-repeater" key={index}>
                  <div className="platform-repeater-heading">
                    <h3>Moment {index + 1}</h3>
                    <div className="platform-row-actions">
                      <button
                        type="button"
                        className="platform-icon-button"
                        disabled={index === 0}
                        aria-label={`Move story moment ${index + 1} up`}
                        onClick={() => change('story', reorder(form.story, index, -1))}
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        type="button"
                        className="platform-icon-button"
                        disabled={index === form.story.length - 1}
                        aria-label={`Move story moment ${index + 1} down`}
                        onClick={() => change('story', reorder(form.story, index, 1))}
                      >
                        <ArrowDown size={16} />
                      </button>
                      <button
                        type="button"
                        className="platform-icon-button"
                        aria-label={`Remove story moment ${index + 1}`}
                        onClick={() =>
                          change(
                            'story',
                            form.story.filter((_, rowIndex) => rowIndex !== index),
                          )
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="platform-form-grid story">
                    <label className="platform-field">
                      <span>Year or date</span>
                      <input
                        required
                        maxLength={40}
                        placeholder="2024"
                        value={row.year}
                        onChange={(event) => storyChange(index, 'year', event.target.value)}
                      />
                    </label>
                    <label className="platform-field">
                      <span>Moment title</span>
                      <input
                        required
                        maxLength={120}
                        value={row.title}
                        onChange={(event) => storyChange(index, 'title', event.target.value)}
                      />
                    </label>
                  </div>
                  <label className="platform-field">
                    <span>Our story</span>
                    <textarea
                      required
                      rows={3}
                      maxLength={2000}
                      value={row.description}
                      onChange={(event) => storyChange(index, 'description', event.target.value)}
                    />
                  </label>
                </div>
              ))}
              <button
                type="button"
                className="platform-button"
                disabled={form.story.length >= 30}
                onClick={() =>
                  change('story', [...form.story, { year: '', title: '', description: '' }])
                }
              >
                <Plus size={16} aria-hidden="true" />
                Add story moment
              </button>
            </section>

            <section className="platform-card">
              <div className="platform-section-heading">
                <div>
                  <h2>The wedding day</h2>
                  <p className="platform-muted">
                    A simple schedule, in the order guests will see it.
                  </p>
                </div>
                <span className="platform-step" aria-hidden="true">
                  04
                </span>
              </div>
              {!form.schedule.length && (
                <p className="platform-empty-inline">
                  Add arrival, ceremony and reception details whenever you are ready.
                </p>
              )}
              {form.schedule.map((row, index) => (
                <div className="platform-repeater" key={index}>
                  <div className="platform-repeater-heading">
                    <h3>Schedule item {index + 1}</h3>
                    <div className="platform-row-actions">
                      <button
                        type="button"
                        className="platform-icon-button"
                        disabled={index === 0}
                        aria-label={`Move schedule item ${index + 1} up`}
                        onClick={() => change('schedule', reorder(form.schedule, index, -1))}
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        type="button"
                        className="platform-icon-button"
                        disabled={index === form.schedule.length - 1}
                        aria-label={`Move schedule item ${index + 1} down`}
                        onClick={() => change('schedule', reorder(form.schedule, index, 1))}
                      >
                        <ArrowDown size={16} />
                      </button>
                      <button
                        type="button"
                        className="platform-icon-button"
                        aria-label={`Remove schedule item ${index + 1}`}
                        onClick={() =>
                          change(
                            'schedule',
                            form.schedule.filter((_, rowIndex) => rowIndex !== index),
                          )
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="platform-form-grid story">
                    <label className="platform-field">
                      <span>Time</span>
                      <input
                        required
                        maxLength={40}
                        placeholder="11:00 AM"
                        value={row.time}
                        onChange={(event) => scheduleChange(index, 'time', event.target.value)}
                      />
                    </label>
                    <label className="platform-field">
                      <span>Event title</span>
                      <input
                        required
                        maxLength={120}
                        value={row.title}
                        onChange={(event) => scheduleChange(index, 'title', event.target.value)}
                      />
                    </label>
                  </div>
                  <label className="platform-field">
                    <span>Event details</span>
                    <textarea
                      rows={2}
                      maxLength={2000}
                      value={row.detail}
                      onChange={(event) => scheduleChange(index, 'detail', event.target.value)}
                    />
                  </label>
                </div>
              ))}
              <button
                type="button"
                className="platform-button"
                disabled={form.schedule.length >= 30}
                onClick={() =>
                  change('schedule', [...form.schedule, { time: '', title: '', detail: '' }])
                }
              >
                <Plus size={16} aria-hidden="true" />
                Add schedule item
              </button>
            </section>

            <section className="platform-card">
              <div className="platform-section-heading">
                <div>
                  <h2>The finishing touches</h2>
                  <p className="platform-muted">Choose the colour and sound of your invitation.</p>
                </div>
                <span className="platform-step" aria-hidden="true">
                  05
                </span>
              </div>
              <fieldset className="platform-theme-field">
                <legend>Wedding theme</legend>
                <div className="platform-theme-options">
                  {(['sage', 'rose', 'champagne'] as const).map((theme) => (
                    <label key={theme} className={`platform-theme-option theme-${theme}`}>
                      <input
                        type="radio"
                        name="theme"
                        value={theme}
                        checked={form.theme === theme}
                        onChange={() => change('theme', theme)}
                      />
                      <span>
                        {theme === 'sage'
                          ? 'Garden sage'
                          : theme === 'rose'
                            ? 'Dusty rose'
                            : 'Champagne'}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="platform-field">
                <span>Music URL (optional)</span>
                <input
                  type="url"
                  maxLength={2048}
                  pattern="https://.*"
                  placeholder="https://…/your-music.mp3"
                  value={form.music_url || ''}
                  onChange={(event) => change('music_url', event.target.value)}
                />
              </label>
              <p className="platform-help">
                Use an HTTPS link to an audio file you have permission to share. Leave blank to use
                the garden music.
              </p>
            </section>

            {adminMode && (
              <section className="platform-card platform-admin-settings">
                <div className="platform-section-heading">
                  <div>
                    <h2>Access & publishing</h2>
                    <p className="platform-muted">Only administrators can change these settings.</p>
                  </div>
                </div>
                <div className="platform-form-grid">
                  <label className="platform-field">
                    <span>Wedding owner</span>
                    <select
                      required
                      value={form.owner_id || ''}
                      onChange={(event) => change('owner_id', event.target.value)}
                    >
                      <option value="" disabled>
                        Choose an owner
                      </option>
                      {profiles.map((person) => (
                        <option key={person.id} value={person.id}>
                          {person.display_name || person.id} · {person.role}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="platform-field">
                    <span>Invitation slug</span>
                    <input
                      required
                      minLength={3}
                      maxLength={80}
                      pattern="[a-z0-9]+(-[a-z0-9]+)*"
                      title="Use lowercase letters, numbers and single hyphens."
                      value={form.slug}
                      placeholder="akram-aisyah"
                      onChange={(event) => change('slug', event.target.value.toLowerCase())}
                      autoCapitalize="none"
                      spellCheck={false}
                    />
                  </label>
                </div>
                <p className="platform-help">
                  Changing the slug changes the invitation link. Existing links will stop working.
                </p>
                <div className="platform-form-grid three">
                  <label className="platform-field">
                    <span>Status</span>
                    <select
                      value={form.status}
                      onChange={(event) =>
                        change('status', event.target.value as WeddingInput['status'])
                      }
                    >
                      <option value="draft">Draft</option>
                      <option value="active">Active</option>
                      <option value="archived">Archived</option>
                      <option value="expired">Expired</option>
                    </select>
                  </label>
                  <label className="platform-field">
                    <span>Template</span>
                    <select value="garden" onChange={() => {}}>
                      <option value="garden">Wedding garden</option>
                    </select>
                  </label>
                  <label className="platform-field">
                    <span>Expiration (local time)</span>
                    <input
                      type="datetime-local"
                      value={expiration}
                      onChange={(event) => {
                        setExpiration(event.target.value);
                        setDirty(true);
                        setFeedback('');
                      }}
                    />
                  </label>
                </div>
                <p className="platform-help">
                  Only active weddings accept guests and new responses. Leave expiration blank for
                  no automatic end date.
                </p>
              </section>
            )}
          </fieldset>
          <div className="platform-savebar">
            <div>
              <span className="platform-muted">
                {saving
                  ? 'Saving your wedding…'
                  : dirty
                    ? 'You have unsaved changes'
                    : 'Your wedding details are saved'}
              </span>
              {!creating && (
                <a href={weddingUrl(form.slug)} target="_blank" rel="noreferrer">
                  Open invitation
                  <ArrowUpRight size={14} aria-hidden="true" />
                </a>
              )}
            </div>
            <button type="submit" className="platform-button primary" disabled={saving || !dirty}>
              <Save size={17} aria-hidden="true" />
              {saving ? 'Saving…' : creating ? 'Create wedding' : 'Save wedding'}
            </button>
          </div>
        </form>
      )}
    </PlatformFrame>
  );
}
