/**
 * Central, validated configuration. Fails fast with a clear message if a
 * required variable (e.g. DATABASE_URL) is missing or malformed — the API must
 * not boot half-configured.
 */
import 'dotenv/config';
import { z } from 'zod';
import { validateProductionSecrets, isDevOutboxEnabled } from './config-validation';

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
  EMAIL_FROM: z.string().default('Innovatix Systems <hello@innovatixmarketing.com>'),
  EMAIL_INTERNAL_TO: z.string().default('sales@innovatixmarketing.com'),
  POSTMARK_SERVER_TOKEN: z.string().optional().default(''),
  POSTMARK_MESSAGE_STREAM: z.string().default('outbound'),

  DEV_OUTBOX_VIEWER: bool(true),

  LEADS_SLA_TARGET_MINUTES: int(240),
  LEADS_SLA_TIMEZONE: z.string().default('America/New_York'),

  CALCOM_WEBHOOK_SECRET: z.string().optional().default(''),
  CALCOM_EVENT_URL: z.string().default('https://cal.com/innovatix/consultation'),

  // Native scheduler (self-hosted; no third-party calendar). Availability is
  // config-driven: business hours in BOOKING_TIMEZONE, on BOOKING_WEEKDAYS
  // (0=Sun..6=Sat), split into BOOKING_SLOT_MINUTES slots. Bookings are stored
  // as Meeting rows (provider="native"); the unique (provider,providerBookingId)
  // constraint prevents two people taking the same slot.
  BOOKING_TIMEZONE: z.string().default('America/New_York'),
  BOOKING_WEEKDAYS: z.string().default('1,2,3,4,5'),
  BOOKING_START_HOUR: int(9),
  BOOKING_END_HOUR: int(17),
  BOOKING_SLOT_MINUTES: int(30),
  BOOKING_MIN_NOTICE_HOURS: int(12),
  BOOKING_MAX_DAYS_AHEAD: int(21),
  // Optional static meeting link (Google Meet/Zoom room). If empty, staff send
  // the joining details after the lead is reviewed.
  BOOKING_MEETING_URL: z.string().optional().default(''),

  // File storage (client portal)
  STORAGE_PROVIDER: z.enum(['local', 's3']).default('local'),
  STORAGE_LOCAL_DIR: z.string().default('.filestore'),
  MAX_FILE_BYTES: int(25 * 1024 * 1024),
  // S3-compatible object storage (AWS S3, Cloudflare R2, MinIO, …). Never
  // hardcoded — bucket/region/endpoint/creds all come from the environment.
  S3_BUCKET: z.string().optional().default(''),
  S3_REGION: z.string().optional().default('us-east-1'),
  S3_ENDPOINT: z.string().optional().default(''), // set for non-AWS (R2/MinIO)
  S3_ACCESS_KEY_ID: z.string().optional().default(''),
  S3_SECRET_ACCESS_KEY: z.string().optional().default(''),
  S3_FORCE_PATH_STYLE: bool(false), // required by MinIO / some R2 setups
  S3_SIGNED_URL_TTL_SECONDS: int(300),
  // Archives (zip/…) are blocked by default; opt in explicitly per deployment.
  STORAGE_ALLOW_ARCHIVES: bool(false),

  // Malware scanning. 'stub' = EICAR/exe-magic (dev/test); 'clamav' = real
  // ClamAV over the INSTREAM TCP protocol.
  MALWARE_SCANNER_PROVIDER: z.enum(['stub', 'clamav']).default('stub'),
  CLAMAV_HOST: z.string().optional().default(''),
  CLAMAV_PORT: int(3310),
  CLAMAV_TIMEOUT_MS: int(30000),
  CLAMAV_MAX_FILE_BYTES: int(100 * 1024 * 1024),
  CLAMAV_REQUIRED_IN_PRODUCTION: bool(true),
  // Files at/below this size scan inline in-request; larger files are enqueued to
  // the durable scan worker so the API never holds a request open on a big scan.
  SCAN_INLINE_MAX_BYTES: int(6 * 1024 * 1024),

  // Client portal (Launch 2). Client and staff JWTs are signed with SEPARATE
  // secrets so a client token can never be verified as a staff token even if
  // one secret leaks. In production both must be set, strong, and distinct
  // (enforced by validateProductionSecrets below).
  PORTAL_JWT_SECRET: z.string().default('dev-portal-secret-change-me'),
  STAFF_JWT_SECRET: z.string().default('dev-staff-secret-change-me'),
  PORTAL_WEB_ORIGIN: z
    .string()
    .default('http://localhost:3001')
    .transform((v) => v.split(',').map((s) => s.trim()).filter(Boolean)),

  OUTBOX_POLL_MS: int(2000),
  OUTBOX_MAX_ATTEMPTS: int(6),

  // Observability. Errors/alerts default to structured console output; set a DSN
  // or a Slack-compatible webhook to fan them out. Never required.
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  SENTRY_DSN: z.string().optional().default(''),
  ALERT_WEBHOOK_URL: z.string().optional().default(''), // Slack/Mattermost incoming webhook
  METRICS_ENABLED: bool(true),
  // Bearer token required to read GET /metrics. Optional in dev; REQUIRED in
  // production when metrics are enabled (see config-validation) so internal
  // queue/scan counts are never publicly scrapable.
  METRICS_TOKEN: z.string().optional().default(''),
  AUTH_FAIL_ALERT_THRESHOLD: int(25), // 401s within the window before an alert fires
  AUTH_FAIL_ALERT_WINDOW_MS: int(60_000),

  // Client-invitation setup-link lifetime. Configurable; safe 7-day default.
  PORTAL_INVITE_TTL_HOURS: int(168),

  // Billing (invoices → payment link + webhook). 'stub' needs no external keys;
  // 'stripe' requires STRIPE_SECRET_KEY (enforced in production).
  PAYMENTS_PROVIDER: z.enum(['stub', 'stripe']).default('stub'),
  PAYMENTS_WEBHOOK_SECRET: z.string().default('dev-payments-webhook-secret'),
  STRIPE_SECRET_KEY: z.string().optional().default(''),
  // Stripe webhook signing secret (whsec_…). Dev/test default is a local-only,
  // non-secret placeholder so tests can sign+verify fixtures; production boot
  // requires a real value when PAYMENTS_PROVIDER=stripe (see config-validation).
  STRIPE_WEBHOOK_SECRET: z.string().default('whsec_dev_local_only'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  • ${i.path.join('.')}: ${i.message}`).join('\n');
  // eslint-disable-next-line no-console
  console.error(`\n[config] Invalid environment:\n${issues}\n`);
  process.exit(1);
}

// Fail fast: refuse to start in production with missing/insecure secrets.
const secretProblems = validateProductionSecrets({
  NODE_ENV: parsed.data.NODE_ENV,
  PORTAL_JWT_SECRET: parsed.data.PORTAL_JWT_SECRET,
  STAFF_JWT_SECRET: parsed.data.STAFF_JWT_SECRET,
  ABUSE_HASH_SALT: parsed.data.ABUSE_HASH_SALT,
  CALCOM_WEBHOOK_SECRET: parsed.data.CALCOM_WEBHOOK_SECRET,
  PAYMENTS_WEBHOOK_SECRET: parsed.data.PAYMENTS_WEBHOOK_SECRET,
  STORAGE_PROVIDER: parsed.data.STORAGE_PROVIDER,
  S3_BUCKET: parsed.data.S3_BUCKET,
  S3_REGION: parsed.data.S3_REGION,
  S3_ACCESS_KEY_ID: parsed.data.S3_ACCESS_KEY_ID,
  S3_SECRET_ACCESS_KEY: parsed.data.S3_SECRET_ACCESS_KEY,
  MALWARE_SCANNER_PROVIDER: parsed.data.MALWARE_SCANNER_PROVIDER,
  CLAMAV_HOST: parsed.data.CLAMAV_HOST,
  CLAMAV_REQUIRED_IN_PRODUCTION: parsed.data.CLAMAV_REQUIRED_IN_PRODUCTION,
  EMAIL_TRANSPORT: parsed.data.EMAIL_TRANSPORT,
  POSTMARK_SERVER_TOKEN: parsed.data.POSTMARK_SERVER_TOKEN,
  PAYMENTS_PROVIDER: parsed.data.PAYMENTS_PROVIDER,
  STRIPE_SECRET_KEY: parsed.data.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: parsed.data.STRIPE_WEBHOOK_SECRET,
  METRICS_ENABLED: parsed.data.METRICS_ENABLED,
  METRICS_TOKEN: parsed.data.METRICS_TOKEN,
  ENCRYPTION_KEYS: {},
});
if (secretProblems.length > 0) {
  const list = secretProblems.map((e) => `  • ${e}`).join('\n');
  // eslint-disable-next-line no-console
  console.error(
    `\n[config] Refusing to start in production — insecure or missing secrets:\n${list}\n\n` +
      `Set strong, unique values in the environment (never commit real secrets).\n` +
      `See apps/api/.env.example and docs/DEPLOYMENT.md.\n`,
  );
  process.exit(1);
}

export const config = parsed.data;
export type Config = typeof config;

/** The dev outbox viewer is NEVER available in production, regardless of flag. */
export const devOutboxViewerEnabled = isDevOutboxEnabled(config.NODE_ENV, config.DEV_OUTBOX_VIEWER);
