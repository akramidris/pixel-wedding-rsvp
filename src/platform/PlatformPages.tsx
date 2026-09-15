import { useState, type FormEvent } from 'react';
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';

export function PlatformLayout() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const logout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Sign-out failed.');
    }
  };
  return (
    <div className="platform-page">
      <nav className="platform-nav" aria-label="Platform navigation">
        <Link className="platform-brand" to="/">
          A Garden of Us <span>Wedding Studio</span>
        </Link>
        <div className="platform-nav-links">
          <Link to="/demo">Explore the game</Link>
          {user ? (
            <>
              <Link to="/dashboard">Dashboard</Link>
              {profile?.role === 'admin' && <Link to="/admin">Admin</Link>}
              <button className="platform-button quiet" onClick={logout}>
                Log out
              </button>
            </>
          ) : (
            <Link className="platform-button" to="/login">
              Log in
            </Link>
          )}
        </div>
      </nav>
      {error && (
        <p className="platform-alert" role="alert">
          {error}
        </p>
      )}
      <Outlet />
    </div>
  );
}

export function HomePage() {
  return (
    <main className="platform-container">
      <section className="platform-hero">
        <div>
          <span className="eyebrow">Every wedding, a little world of its own</span>
          <h1>
            A beautiful invitation.
            <br />
            An easier celebration.
          </h1>
          <p>
            Give your guests a garden to explore, a story to discover, and a simple way to RSVP.
            Manage every response in one place.
          </p>
        </div>
        <Link className="platform-button primary" to="/login">
          Open your dashboard
        </Link>
      </section>
      <section className="platform-card">
        <h2>Your wedding, your own invitation link</h2>
        <p>
          Names, venue, schedule, wishes and responses belong to your wedding. Your guests can enter
          and RSVP without an account.
        </p>
        <Link className="platform-button" to="/demo">
          Explore the sample garden
        </Link>
        <p className="platform-muted">
          The sample garden is a preview. Its sample responses stay on this device.
        </p>
      </section>
      <section className="platform-grid">
        <article className="platform-card">
          <span className="eyebrow">Demo wedding A</span>
          <h2>Akram & Aisyah</h2>
          <Link to="/wedding/akram-aisyah">Open invitation</Link>
        </article>
        <article className="platform-card">
          <span className="eyebrow">Demo wedding B</span>
          <h2>Amir & Nurul</h2>
          <Link to="/wedding/amir-nurul">Open invitation</Link>
        </article>
      </section>
      {!isSupabaseConfigured && (
        <p className="platform-alert">
          Wedding management is awaiting service setup. The sample garden is available to explore.
        </p>
      )}
    </main>
  );
}

export function LoginPage() {
  const { user, loading, error: authError, signIn } = useAuth();
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [error, setError] = useState(''),
    [saving, setSaving] = useState(false);
  const location = useLocation(),
    navigate = useNavigate();
  const destination = (location.state as { from?: string } | null)?.from;
  const next =
    destination && /^\/(dashboard|admin)(\/|$)/.test(destination) ? destination : '/dashboard';
  if (user) return <Navigate to={next} replace />;
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      await signIn(email, password);
      navigate(next, { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Sign-in failed.');
    } finally {
      setSaving(false);
    }
  };
  return (
    <main className="platform-container platform-auth">
      <section className="platform-card">
        <span className="eyebrow">For couples and administrators</span>
        <h1>Welcome back</h1>
        <p>Sign in to manage your invitation and guest responses.</p>
        {!isSupabaseConfigured ? (
          <p className="platform-alert" role="status">
            Sign-in is not available until the wedding service is connected. Please contact the
            administrator.
          </p>
        ) : (
          <form className="platform-form" onSubmit={submit}>
            <fieldset disabled={saving || loading}>
              <label className="platform-field">
                Email
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
              <label className="platform-field">
                Password
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
              <button className="platform-button primary" type="submit">
                {saving || loading ? 'Signing in…' : 'Sign in'}
              </button>
            </fieldset>
          </form>
        )}
        {(error || authError) && (
          <p className="platform-alert" role="alert">
            {error || authError}
          </p>
        )}
        <p>Wedding guests do not need an account. Open the invitation link shared by the couple.</p>
      </section>
    </main>
  );
}

export function ProtectedRoute({ admin = false }: { admin?: boolean }) {
  const { user, profile, loading, error, signOut } = useAuth();
  const location = useLocation();
  if (loading)
    return (
      <div className="platform-container platform-loading" role="status">
        Loading your account…
      </div>
    );
  if (error)
    return (
      <main className="platform-container">
        <section className="platform-card">
          <h1>Account unavailable</h1>
          <p role="alert">{error}</p>
          <button
            className="platform-button"
            onClick={() => {
              void signOut().catch(() => {});
            }}
          >
            Return to sign in
          </button>
        </section>
      </main>
    );
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (admin && profile?.role !== 'admin')
    return (
      <main className="platform-container">
        <section className="platform-card">
          <h1>Access restricted</h1>
          <p>This page is available to platform administrators.</p>
          <Link to="/dashboard">Return to your dashboard</Link>
        </section>
      </main>
    );
  return <Outlet />;
}

export function NotFoundPage() {
  return (
    <main className="platform-container">
      <section className="platform-card">
        <h1>Page not found</h1>
        <p>Please check the link and try again.</p>
        <Link to="/">Return home</Link>
      </section>
    </main>
  );
}
