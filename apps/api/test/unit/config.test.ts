/**
 * Production secret fail-fast — unit tests for validateProductionSecrets().
 * Pure function; needs NO database and NO app boot.
 * Run directly:  npx tsx --test test/config.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateProductionSecrets,
  isDevOutboxEnabled,
  MIN_SECRET_LENGTH,
  DEV_SECRET_DEFAULTS,
  type ProdSecretEnv,
} from '../../src/config-validation';

test('dev outbox viewer is disabled in production regardless of flag', () => {
  assert.equal(isDevOutboxEnabled('production', true), false);
  assert.equal(isDevOutboxEnabled('production', false), false);
  assert.equal(isDevOutboxEnabled('development', true), true);
  assert.equal(isDevOutboxEnabled('test', true), true);
});

// Distinct, strong (≥ MIN_SECRET_LENGTH), non-default value per seed.
const strong = (seed: string) => `prod-${seed}-${'x'.repeat(MIN_SECRET_LENGTH)}`;

const validProd = (over: Partial<ProdSecretEnv> = {}): ProdSecretEnv => ({
  NODE_ENV: 'production',
  PORTAL_JWT_SECRET: strong('portal'),
  STAFF_JWT_SECRET: strong('staff'),
  ABUSE_HASH_SALT: strong('salt'),
  CALCOM_WEBHOOK_SECRET: strong('cal'),
  PAYMENTS_WEBHOOK_SECRET: strong('pay'),
  STORAGE_PROVIDER: 'local',
  S3_BUCKET: '',
  S3_REGION: '',
  EMAIL_TRANSPORT: 'outbox',
  POSTMARK_SERVER_TOKEN: '',
  PAYMENTS_PROVIDER: 'stub',
  STRIPE_SECRET_KEY: '',
  ENCRYPTION_KEYS: {},
  ...over,
});

test('valid production config → no errors', () => {
  assert.deepEqual(validateProductionSecrets(validProd()), []);
});

test('non-production is never gated (dev defaults allowed)', () => {
  const dev = validProd({
    NODE_ENV: 'development',
    PORTAL_JWT_SECRET: 'dev-portal-secret-change-me',
    STAFF_JWT_SECRET: 'dev-staff-secret-change-me',
    ABUSE_HASH_SALT: 'dev-salt-change-me',
    CALCOM_WEBHOOK_SECRET: '',
    PAYMENTS_WEBHOOK_SECRET: 'dev-payments-webhook-secret',
  });
  assert.deepEqual(validateProductionSecrets(dev), []);
  assert.deepEqual(validateProductionSecrets({ ...dev, NODE_ENV: 'test' }), []);
});

test('missing required secret is rejected', () => {
  const errs = validateProductionSecrets(validProd({ PORTAL_JWT_SECRET: '' }));
  assert.equal(errs.length, 1);
  assert.match(errs[0], /PORTAL_JWT_SECRET.*required/);
});

test('each required secret is checked', () => {
  for (const name of [
    'PORTAL_JWT_SECRET',
    'STAFF_JWT_SECRET',
    'ABUSE_HASH_SALT',
    'CALCOM_WEBHOOK_SECRET',
    'PAYMENTS_WEBHOOK_SECRET',
  ] as const) {
    const errs = validateProductionSecrets(validProd({ [name]: '' }));
    assert.ok(errs.some((e) => e.includes(name)), `expected an error for missing ${name}`);
  }
});

test('known dev defaults are rejected in production', () => {
  for (const def of DEV_SECRET_DEFAULTS) {
    const errs = validateProductionSecrets(validProd({ PORTAL_JWT_SECRET: def }));
    assert.ok(
      errs.some((e) => /known development default/.test(e)),
      `expected dev-default rejection for "${def}"`,
    );
  }
});

test('too-short secrets are rejected', () => {
  const errs = validateProductionSecrets(validProd({ STAFF_JWT_SECRET: 'short-key' }));
  assert.ok(errs.some((e) => /STAFF_JWT_SECRET.*too short/.test(e)));
});

test('identical client and staff JWT secrets are rejected', () => {
  const same = strong('same');
  const errs = validateProductionSecrets(validProd({ PORTAL_JWT_SECRET: same, STAFF_JWT_SECRET: same }));
  assert.ok(errs.some((e) => /must be different/.test(e)));
});

test('postmark transport requires a token', () => {
  assert.ok(
    validateProductionSecrets(validProd({ EMAIL_TRANSPORT: 'postmark' })).some((e) => /POSTMARK_SERVER_TOKEN/.test(e)),
  );
  assert.deepEqual(
    validateProductionSecrets(validProd({ EMAIL_TRANSPORT: 'postmark', POSTMARK_SERVER_TOKEN: 'pm-token-123' })),
    [],
  );
});

test('s3 storage requires bucket + region', () => {
  const errs = validateProductionSecrets(validProd({ STORAGE_PROVIDER: 's3' }));
  assert.ok(errs.some((e) => /S3_BUCKET/.test(e)));
  assert.ok(errs.some((e) => /S3_REGION/.test(e)));
  assert.deepEqual(
    validateProductionSecrets(validProd({ STORAGE_PROVIDER: 's3', S3_BUCKET: 'b', S3_REGION: 'us-east-1' })),
    [],
  );
});

test('stripe payments require a secret key and a webhook secret', () => {
  const errs = validateProductionSecrets(validProd({ PAYMENTS_PROVIDER: 'stripe' }));
  assert.ok(errs.some((e) => /STRIPE_SECRET_KEY/.test(e)));
  assert.ok(errs.some((e) => /STRIPE_WEBHOOK_SECRET/.test(e)));
  // Secret key alone is not enough — the webhook secret is still required.
  assert.ok(
    validateProductionSecrets(validProd({ PAYMENTS_PROVIDER: 'stripe', STRIPE_SECRET_KEY: strong('stripe') })).some((e) => /STRIPE_WEBHOOK_SECRET/.test(e)),
  );
  // Both present → clean.
  assert.deepEqual(
    validateProductionSecrets(validProd({ PAYMENTS_PROVIDER: 'stripe', STRIPE_SECRET_KEY: strong('stripe'), STRIPE_WEBHOOK_SECRET: strong('whsec') })),
    [],
  );
});

test('encryption-key hook: missing rejected, strong accepted', () => {
  assert.ok(
    validateProductionSecrets(validProd({ ENCRYPTION_KEYS: { FILE_ENCRYPTION_KEY: '' } })).some((e) =>
      /FILE_ENCRYPTION_KEY/.test(e),
    ),
  );
  assert.deepEqual(
    validateProductionSecrets(validProd({ ENCRYPTION_KEYS: { FILE_ENCRYPTION_KEY: strong('enc') } })),
    [],
  );
});

test('error messages never contain the secret value', () => {
  const canary = 'zzzz-leak-canary'; // 16 chars → triggers "too short", must not be echoed
  const errs = validateProductionSecrets(validProd({ PORTAL_JWT_SECRET: canary }));
  assert.ok(errs.length > 0);
  assert.ok(!errs.join(' ').includes(canary), 'secret value leaked into error message');
});
