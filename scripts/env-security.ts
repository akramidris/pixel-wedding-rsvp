/** Build-time guard: reject privileged keys before Vite can inline them. */
export function assertPublicSupabaseConfig(env: Record<string, string | undefined>) {
  const key = env.VITE_SUPABASE_ANON_KEY?.trim() || '';
  const url = env.VITE_SUPABASE_URL?.trim() || '';
  if (!key && !url) return;
  if (!key || !url)
    throw new Error('Set both VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, or leave both empty.');
  if (key.startsWith('sb_secret_'))
    throw new Error(
      'Build blocked: use a Supabase public anon/publishable key, never a private key.',
    );
  if (key.startsWith('sb_publishable_')) return;
  try {
    const payload = JSON.parse(
      Buffer.from(key.split('.')[1] || '', 'base64url').toString('utf8'),
    ) as { role?: string };
    if (key.split('.').length === 3 && payload.role === 'anon') return;
  } catch {
    /* Never include the key in diagnostic output. */
  }
  throw new Error('Build blocked: VITE_SUPABASE_ANON_KEY must be a public anon/publishable key.');
}
