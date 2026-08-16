/**
 * Build-time guard for the browser-facing API base URL.
 *
 * In an ENFORCED build (the deploy sets INNOVATIX_ENFORCE_API_URL=1, or CI/Vercel),
 * this FAILS the build (exit 1) when the given env var is missing or points at
 * localhost — so a production bundle that tells every visitor's browser to call
 * their own machine (http://localhost:4040) can never ship again. Locally
 * (unenforced) it just prints a note and passes.
 *
 * Usage (from an app dir, run in `prebuild`):
 *   node ../../scripts/validate-api-url.mjs NEXT_PUBLIC_PORTAL_API_URL
 */
const varName = process.argv[2];
if (!varName) {
  console.error('[validate-api-url] usage: validate-api-url.mjs <ENV_VAR_NAME>');
  process.exit(2);
}

const enforce =
  process.env.CI === 'true' ||
  !!process.env.VERCEL ||
  process.env.INNOVATIX_ENFORCE_API_URL === '1';

const raw = (process.env[varName] ?? '').trim();
const isLocal = (s) => /localhost|127\.0\.0\.1|0\.0\.0\.0|::1/i.test(s);

const fail = (m) => {
  console.error('\n\x1b[31m✗ [validate-api-url] ' + m + '\x1b[0m\n');
  process.exit(1);
};
const ok = (m) => console.log('\x1b[32m✓ [validate-api-url] ' + m + '\x1b[0m');

if (!enforce) {
  console.log(`[validate-api-url] ${varName}: enforcement off (dev/local build)`);
  process.exit(0);
}

if (!raw) {
  fail(
    `${varName} is required for a production build.\n` +
      '  It is unset, so the bundle would default to http://localhost:4040 and every\n' +
      '  visitor’s browser would call their own machine. Set it (e.g. to the same-origin\n' +
      `  API path "/v1") in the app’s .env.local on the box, then rebuild.`,
  );
}
if (isLocal(raw)) {
  fail(
    `${varName} points at localhost ("${raw}").\n` +
      '  A production bundle must use a public/same-origin value (e.g. "/v1").',
  );
}
ok(`${varName} = "${raw}"`);
