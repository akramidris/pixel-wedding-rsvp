import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const url = import.meta.env.VITE_SUPABASE_URL?.trim() || '';
const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || '';

function configurationProblem() {
  if (!url || !key) return 'The wedding service has not been connected yet.';
  try {
    const parsed = new URL(url);
    if (
      parsed.protocol !== 'https:' &&
      !(import.meta.env.DEV && ['localhost', '127.0.0.1'].includes(parsed.hostname))
    )
      return 'The wedding service requires a secure HTTPS URL.';
    if (key.startsWith('sb_secret_')) return 'A private key cannot be used in this application.';
    if (key.split('.').length === 3) {
      const payload = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as {
        role?: string;
      };
      if (payload.role !== 'anon')
        return 'Only a public Supabase key can be used in this application.';
    }
  } catch {
    return 'The wedding service configuration is invalid.';
  }
  return null;
}

export const configurationError = configurationProblem();
export const supabase = configurationError
  ? null
  : createClient<Database>(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
      global: {
        fetch: (input, init) =>
          fetch(input, {
            ...init,
            signal: init?.signal
              ? AbortSignal.any([init.signal, AbortSignal.timeout(20000)])
              : AbortSignal.timeout(20000),
          }),
      },
    });
export const isSupabaseConfigured = supabase !== null;
export function requireSupabase() {
  if (!supabase) throw new Error(configurationError || 'The wedding service is unavailable.');
  return supabase;
}
