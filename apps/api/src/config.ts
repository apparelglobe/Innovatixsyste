/**
 * Central, validated configuration. Fails fast with a clear message if a
 * required variable (e.g. DATABASE_URL) is missing or malformed — the API must
 * not boot half-configured.
 */
import 'dotenv/config';
import { z } from 'zod';

const bool = (def: boolean) =>
  z
    .string()
    .optional()
    .transform((v) => (v == null ? def : /^(1|true|yes)$/i.test(v)));

const int = (def: number) =>
  z
    .string()
    .optional()
    .transform((v) => (v == null || v === '' ? def : Number(v)))
    .pipe(z.number().int().nonnegative());

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: int(4040),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  INNOVATIX_DEFAULT_TENANT_SLUG: z.string().default('innovatix-systems'),

  LEADS_ALLOWED_ORIGINS: z
    .string()
    .default('http://localhost:4030')
    .transform((v) => v.split(',').map((s) => s.trim()).filter(Boolean)),

  LEADS_RATE_LIMIT_MAX: int(5),
  LEADS_RATE_LIMIT_WINDOW_MS: int(10 * 60 * 1000),
  ABUSE_HASH_SALT: z.string().default('dev-salt-change-me'),

  EMAIL_TRANSPORT: z.enum(['outbox', 'postmark']).default('outbox'),
  EMAIL_FROM: z.string().default('Innovatix Systems <hello@innovatixsystems.com>'),
  EMAIL_INTERNAL_TO: z.string().default('sales@innovatixsystems.com'),
  POSTMARK_SERVER_TOKEN: z.string().optional().default(''),
  POSTMARK_MESSAGE_STREAM: z.string().default('outbound'),

  DEV_OUTBOX_VIEWER: bool(true),

  LEADS_SLA_TARGET_MINUTES: int(240),
  LEADS_SLA_TIMEZONE: z.string().default('America/New_York'),

  CALCOM_WEBHOOK_SECRET: z.string().optional().default(''),
  CALCOM_EVENT_URL: z.string().default('https://cal.com/innovatix/consultation'),

  // File storage (client portal)
  STORAGE_PROVIDER: z.enum(['local', 's3']).default('local'),
  STORAGE_LOCAL_DIR: z.string().default('.filestore'),
  MAX_FILE_BYTES: int(25 * 1024 * 1024),
  S3_BUCKET: z.string().optional().default(''),
  S3_REGION: z.string().optional().default(''),

  // Client portal (Launch 2)
  PORTAL_JWT_SECRET: z.string().default('dev-portal-secret-change-me'),
  PORTAL_WEB_ORIGIN: z
    .string()
    .default('http://localhost:3001')
    .transform((v) => v.split(',').map((s) => s.trim()).filter(Boolean)),

  OUTBOX_POLL_MS: int(2000),
  OUTBOX_MAX_ATTEMPTS: int(6),

  // Billing (invoices → payment link + webhook). 'stub' needs no external keys.
  PAYMENTS_PROVIDER: z.enum(['stub', 'stripe']).default('stub'),
  PAYMENTS_WEBHOOK_SECRET: z.string().default('dev-payments-webhook-secret'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  • ${i.path.join('.')}: ${i.message}`).join('\n');
  // eslint-disable-next-line no-console
  console.error(`\n[config] Invalid environment:\n${issues}\n`);
  process.exit(1);
}

export const config = parsed.data;
export type Config = typeof config;

/** The dev outbox viewer is NEVER available in production, regardless of flag. */
export const devOutboxViewerEnabled = config.NODE_ENV !== 'production' && config.DEV_OUTBOX_VIEWER;
