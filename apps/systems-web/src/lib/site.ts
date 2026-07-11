/**
 * Centralized site configuration — the ONLY place the canonical hostname is
 * resolved. Every canonical, sitemap entry, OG url, schema url, and (later)
 * email/CRM/proposal/portal link must read from here, never hardcode the host.
 *
 * Source: SITE_URL env (see .env.example). Validated at import time so a
 * missing/invalid value fails the build loudly rather than shipping a wrong
 * canonical.
 */
function resolveSiteUrl(): string {
  const raw = process.env.SITE_URL?.trim();
  // Fallback ONLY for local/CI when env is unset; production build must set SITE_URL.
  const value = raw || 'http://localhost:3000';
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`[site] SITE_URL is not a valid URL: "${value}"`);
  }
  if (!/^https?:$/.test(url.protocol)) {
    throw new Error(`[site] SITE_URL must be http(s): "${value}"`);
  }
  // Normalize: no trailing slash, no path.
  return `${url.protocol}//${url.host}`;
}

export const SITE = {
  url: resolveSiteUrl(),
  name: 'Innovatix Systems',
  legalName: 'Innovatix Systems',
  tagline: 'Enterprise software, AI, and platforms — engineered to run your business as one system.',
  description:
    'Innovatix Systems is an enterprise software company delivering custom software, AI, enterprise systems, cloud, data, and security — with a connected client portal for full project transparency.',
  email: 'hello@innovatixsystems.com',
} as const;

/** Build an absolute URL from a path, always on the canonical host. */
export function absoluteUrl(path = '/'): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${SITE.url}${clean === '/' ? '' : clean}`;
}
