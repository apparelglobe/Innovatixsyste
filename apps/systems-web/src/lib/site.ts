/**
 * Centralized site configuration — the ONLY place the canonical hostname is
 * resolved. Every canonical, sitemap entry, robots reference, OG url, Twitter
 * metadata, structured-data url, form-confirmation link, and booking link must
 * read from here, never hardcode the host.
 *
 * Env: NEXT_PUBLIC_SITE_URL (primary). SITE_URL is accepted as a server-only
 * fallback alias for backward compatibility. NEXT_PUBLIC_ is required because
 * client components (booking links, analytics) also need the canonical host at
 * runtime — Next inlines it into the client bundle at build time.
 *
 * Production enforcement: in an enforced build (CI / Vercel / explicit
 * INNOVATIX_ENFORCE_SITE_URL=1) a missing, malformed, non-https, or localhost
 * value FAILS the build loudly rather than shipping a wrong canonical. Locally
 * (unenforced) it falls back to http://localhost:3000 so `next dev`/`next start`
 * keep working. A standalone assertion (scripts/validate-site-url.mjs, run in
 * prebuild) enforces the same rules with a clearer author-facing message.
 */

/** True when this build must ship a real production canonical (deploy/CI). */
export function isCanonicalEnforced(): boolean {
  return (
    process.env.CI === 'true' ||
    !!process.env.VERCEL ||
    process.env.INNOVATIX_ENFORCE_SITE_URL === '1'
  );
}

/** True if the hostname is a local / loopback / non-routable dev host. */
export function isLocalHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  return (
    h === 'localhost' ||
    h === '::1' ||
    h === '0.0.0.0' ||
    h.startsWith('127.') ||
    h.startsWith('192.168.') ||
    h.startsWith('10.') ||
    h.endsWith('.local')
  );
}

function resolveSiteUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL)?.trim();
  const enforce = isCanonicalEnforced();

  if (!raw) {
    if (enforce) {
      throw new Error(
        '[site] NEXT_PUBLIC_SITE_URL is required for production builds. ' +
          'Set NEXT_PUBLIC_SITE_URL=https://innovatixmarketing.com before building.',
      );
    }
    return 'http://localhost:3000';
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`[site] NEXT_PUBLIC_SITE_URL is not a valid URL: "${raw}"`);
  }
  if (!/^https?:$/.test(url.protocol)) {
    throw new Error(`[site] NEXT_PUBLIC_SITE_URL must be http(s): "${raw}"`);
  }

  if (enforce) {
    if (isLocalHost(url.hostname)) {
      throw new Error(
        `[site] NEXT_PUBLIC_SITE_URL must not point to localhost in a production build: "${raw}". ` +
          'No indexable production page may ship a localhost canonical.',
      );
    }
    if (url.protocol !== 'https:') {
      throw new Error(`[site] NEXT_PUBLIC_SITE_URL must use https in a production build: "${raw}"`);
    }
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
  email: 'support@innovatixmarketing.com',
  /** Main phone line. `phone` = display, `phoneHref` = tel: (E.164). */
  phone: '(866) 754-4814',
  phoneHref: 'tel:+18667544814',
  /** Business address (single source of truth). */
  address: {
    line1: '86 Lackawanna Avenue',
    city: 'Woodland Park',
    state: 'NJ',
    zip: '07424',
    country: 'US',
    full: '86 Lackawanna Avenue, Woodland Park, NJ 07424',
  },
  /** Social profiles. */
  social: {
    facebook: 'https://www.facebook.com/profile.php?id=61592109359320',
  },
} as const;

/** Build an absolute URL from a path, always on the canonical host. */
export function absoluteUrl(path = '/'): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${SITE.url}${clean === '/' ? '' : clean}`;
}
