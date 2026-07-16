/**
 * Production secret hardening — PURE, side-effect-free validation.
 *
 * Kept in its own module (no dotenv, no process.exit, no imports) so it can be
 * unit-tested directly without booting the app or touching the database.
 * `config.ts` imports validateProductionSecrets() and fails fast on any result.
 *
 * Rules (production only): every listed secret must be present, non-default,
 * and ≥ MIN_SECRET_LENGTH; the client and staff JWT secrets must differ;
 * provider-specific keys are required when that provider is selected.
 * Messages name the offending variable and reason ONLY — never the value.
 */

/** Known development placeholders. A production value equal to any is rejected. */
export const DEV_SECRET_DEFAULTS = [
  'dev-portal-secret-change-me',
  'dev-staff-secret-change-me',
  'dev-salt-change-me',
  'dev-payments-webhook-secret',
  'change-me-in-prod',
  'change-me',
] as const;

/** Minimum length for any production secret / salt / webhook signing key. */
export const MIN_SECRET_LENGTH = 32;

/** The dev outbox email viewer must NEVER be enabled in production, whatever the flag. */
export function isDevOutboxEnabled(nodeEnv: string, flag: boolean): boolean {
  return nodeEnv !== 'production' && flag;
}

export interface ProdSecretEnv {
  NODE_ENV: string;
  PORTAL_JWT_SECRET: string;
  STAFF_JWT_SECRET: string;
  ABUSE_HASH_SALT: string;
  CALCOM_WEBHOOK_SECRET: string;
  PAYMENTS_WEBHOOK_SECRET: string;
  STORAGE_PROVIDER: string;
  S3_BUCKET: string;
  S3_REGION: string;
  EMAIL_TRANSPORT: string;
  POSTMARK_SERVER_TOKEN: string;
  PAYMENTS_PROVIDER: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  /** Extensible hook: symmetric-encryption keys keyed by env-var name. None used today. */
  ENCRYPTION_KEYS?: Record<string, string | undefined>;
}

/**
 * Returns [] when the configuration is safe to run in production. Outside
 * production always returns [] (dev/test keep their defaults).
 */
export function validateProductionSecrets(env: ProdSecretEnv): string[] {
  if (env.NODE_ENV !== 'production') return [];

  const errors: string[] = [];
  const known = new Set<string>(DEV_SECRET_DEFAULTS as readonly string[]);

  const requireStrong = (name: string, value: string | undefined) => {
    const v = (value ?? '').trim();
    if (v === '') {
      errors.push(`${name} is required in production but is missing/empty.`);
      return;
    }
    if (known.has(v)) {
      errors.push(`${name} is set to a known development default — set a unique, random production value.`);
      return;
    }
    if (v.length < MIN_SECRET_LENGTH) {
      errors.push(`${name} is too short (${v.length} chars; require ≥ ${MIN_SECRET_LENGTH}).`);
    }
  };

  requireStrong('PORTAL_JWT_SECRET', env.PORTAL_JWT_SECRET);
  requireStrong('STAFF_JWT_SECRET', env.STAFF_JWT_SECRET);
  requireStrong('ABUSE_HASH_SALT', env.ABUSE_HASH_SALT);
  requireStrong('CALCOM_WEBHOOK_SECRET', env.CALCOM_WEBHOOK_SECRET);
  requireStrong('PAYMENTS_WEBHOOK_SECRET', env.PAYMENTS_WEBHOOK_SECRET);

  // Client and staff JWT secrets MUST differ (separate trust domains).
  if ((env.PORTAL_JWT_SECRET ?? '').trim() !== '' && env.PORTAL_JWT_SECRET === env.STAFF_JWT_SECRET) {
    errors.push('PORTAL_JWT_SECRET and STAFF_JWT_SECRET must be different values.');
  }

  // Provider-conditional required secrets.
  if (env.EMAIL_TRANSPORT === 'postmark' && (env.POSTMARK_SERVER_TOKEN ?? '').trim() === '') {
    errors.push('POSTMARK_SERVER_TOKEN is required when EMAIL_TRANSPORT=postmark.');
  }
  if (env.STORAGE_PROVIDER === 's3') {
    if ((env.S3_BUCKET ?? '').trim() === '') errors.push('S3_BUCKET is required when STORAGE_PROVIDER=s3.');
    if ((env.S3_REGION ?? '').trim() === '') errors.push('S3_REGION is required when STORAGE_PROVIDER=s3.');
  }
  if (env.PAYMENTS_PROVIDER === 'stripe') {
    if ((env.STRIPE_SECRET_KEY ?? '').trim() === '') {
      errors.push('STRIPE_SECRET_KEY is required when PAYMENTS_PROVIDER=stripe.');
    }
    if ((env.STRIPE_WEBHOOK_SECRET ?? '').trim() === '') {
      errors.push('STRIPE_WEBHOOK_SECRET is required when PAYMENTS_PROVIDER=stripe.');
    }
  }

  // Encryption keys — none used today. When symmetric encryption is added,
  // register its env var here so production boot fails if the key is missing.
  for (const [name, value] of Object.entries(env.ENCRYPTION_KEYS ?? {})) {
    const v = (value ?? '').trim();
    if (v === '') errors.push(`${name} is required in production (encryption key missing/empty).`);
    else if (v.length < MIN_SECRET_LENGTH) errors.push(`${name} is too short (${v.length} chars; require ≥ ${MIN_SECRET_LENGTH}).`);
  }

  return errors;
}
