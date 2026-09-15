import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { WeddingProvider } from '../context/WeddingContext';
import {
  loadPublicWedding,
  mapWeddingConfig,
  demoWeddingConfig,
  validSlug,
} from '../services/weddings';
import { createGuestRepository } from '../services/guestRepository';
import { weddingRepository } from '../services/storage';
import { isSupabaseConfigured } from '../lib/supabase';
import type { WeddingConfig } from '../types/wedding';
const Game = lazy(() => import('../App'));

function LoadedWedding({ config }: { config: WeddingConfig }) {
  const repository = useMemo(
    () =>
      config.settings.demo
        ? weddingRepository
        : createGuestRepository(config.id, config.settings.maxGuests),
    [config],
  );
  useEffect(() => {
    const before = document.title;
    document.title = `${config.groom.name} & ${config.bride.name} | ${config.title}`;
    return () => {
      document.title = before;
    };
  }, [config]);
  return (
    <WeddingProvider config={config} repository={repository}>
      <Suspense
        fallback={
          <div className="platform-loading" role="status">
            Preparing your garden…
          </div>
        }
      >
        <Game />
      </Suspense>
    </WeddingProvider>
  );
}
export function DemoPage() {
  return <LoadedWedding config={demoWeddingConfig} />;
}

export function WeddingPage() {
  const { slug = '' } = useParams();
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{
    slug: string;
    config?: WeddingConfig;
    state?: string;
    error?: string;
  }>({ slug: '' });
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setResult({ slug: '' });
    if (!validSlug(slug)) {
      setResult({ slug, state: 'not_found' });
      return;
    }
    if (!isSupabaseConfigured) {
      setResult({ slug, state: 'setup' });
      return;
    }
    void loadPublicWedding(slug, controller.signal)
      .then((data) => {
        if (active)
          setResult(
            data.state === 'active'
              ? { slug, config: mapWeddingConfig(data.wedding) }
              : { slug, state: data.state },
          );
      })
      .catch((cause) => {
        if (active)
          setResult({
            slug,
            error: cause instanceof Error ? cause.message : 'The invitation could not be loaded.',
          });
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [slug, retry]);
  if (result.slug !== slug)
    return (
      <div className="platform-page">
        <main className="platform-container platform-loading" role="status">
          Finding your invitation…
        </main>
      </div>
    );
  if (result.config) return <LoadedWedding key={result.config.id} config={result.config} />;
  const titles: Record<string, string> = {
    expired: 'This invitation has expired',
    unavailable: 'This invitation is archived',
    not_found: 'Wedding not found',
    setup: 'Invitation not available yet',
  };
  const details: Record<string, string> = {
    expired:
      'Thank you for being part of the celebration. This wedding is no longer accepting responses.',
    unavailable:
      'This celebration is no longer accepting responses. Please contact the couple if you need any details.',
    not_found: 'Please check the invitation link shared by the couple.',
    setup: 'Please contact the couple and try again later.',
  };
  return (
    <div className="platform-page">
      <main className="platform-container">
        <section className="platform-card">
          <span className="eyebrow">A Garden of Us</span>
          <h1>
            {result.error
              ? 'We couldn’t open this invitation'
              : titles[result.state || 'not_found']}
          </h1>
          <p role={result.error ? 'alert' : undefined}>
            {result.error || details[result.state || 'not_found']}
          </p>
          {result.error && (
            <button className="platform-button" onClick={() => setRetry((value) => value + 1)}>
              Try again
            </button>
          )}{' '}
          <Link to="/">Return home</Link>
        </section>
      </main>
    </div>
  );
}
