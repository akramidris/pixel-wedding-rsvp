export const useCleanUrls = import.meta.env.VITE_ROUTER_MODE === 'browser';
export function weddingUrl(slug: string) {
  const base = new URL(import.meta.env.BASE_URL, window.location.origin);
  const path = `wedding/${encodeURIComponent(slug)}`;
  return useCleanUrls ? new URL(path, base).href : `${base.href}#/${path}`;
}

export function safeHttpsUrl(value: string, label: string, optional = false) {
  const trimmed = value.trim();
  if (!trimmed && optional) return '';
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) throw new Error();
    return parsed.href;
  } catch {
    throw new Error(`${label} must be a valid HTTPS link.`);
  }
}
