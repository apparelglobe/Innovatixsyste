/**
 * Build-time assertion for the canonical site URL.
 *
 * Runs in `prebuild`. In an ENFORCED build (CI / Vercel / INNOVATIX_ENFORCE_SITE_URL=1)
 * it FAILS the build (exit 1) when NEXT_PUBLIC_SITE_URL is missing, malformed,
 * non-https, or points to localhost — so no indexable production page can ever
 * ship a localhost canonical. Locally (unenforced) it only warns.
 *
 * This mirrors resolveSiteUrl() in src/lib/site.ts but as a standalone check
 * with a clearer, author-facing message and a hard process exit.
 */
const enforce =
  process.env.CI === 'true' ||
  !!process.env.VERCEL ||
  process.env.INNOVATIX_ENFORCE_SITE_URL === '1';

const raw = (process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL)?.trim();

function isLocalHost(hostname) {
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

function fail(msg) {
  console.error('\n[31m✗ [validate-site-url] ' + msg + '[0m\n');
  process.exit(1);
}

function ok(msg) {
  console.log('[32m✓ [validate-site-url] ' + msg + '[0m');
}

function warn(msg) {
  console.warn('[33m⚠ [validate-site-url] ' + msg + '[0m');
}

if (!raw) {
  if (enforce) {
    fail(
      'NEXT_PUBLIC_SITE_URL is required for production builds.\n' +
        '  Set NEXT_PUBLIC_SITE_URL=https://innovatixsystem.com before building.',
    );
  }
  warn('NEXT_PUBLIC_SITE_URL not set — using http://localhost:3000 (local build only).');
  process.exit(0);
}

let url;
try {
  url = new URL(raw);
} catch {
  fail(`NEXT_PUBLIC_SITE_URL is not a valid URL: "${raw}"`);
}

if (!/^https?:$/.test(url.protocol)) {
  fail(`NEXT_PUBLIC_SITE_URL must be http(s): "${raw}"`);
}

if (enforce) {
  if (isLocalHost(url.hostname)) {
    fail(
      `NEXT_PUBLIC_SITE_URL must not point to localhost in a production build: "${raw}".\n` +
        '  No indexable production page may ship a localhost canonical.',
    );
  }
  if (url.protocol !== 'https:') {
    fail(`NEXT_PUBLIC_SITE_URL must use https in a production build: "${raw}"`);
  }
  ok(`canonical host validated for production: ${url.protocol}//${url.host}`);
} else {
  ok(`canonical host: ${url.protocol}//${url.host} (enforcement off — local/dev build)`);
}
