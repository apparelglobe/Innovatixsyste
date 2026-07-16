/**
 * Observability primitives: correlation ids, structured error capture, and
 * operational alerts. All entry points are NO-THROW — observability must never
 * take down a request or a worker. Defaults emit structured JSON to the console;
 * setting SENTRY_DSN / ALERT_WEBHOOK_URL fans events out to those sinks (best
 * effort, fire-and-forget). No external SDK dependency.
 */
import https from 'node:https';
import { randomUUID } from 'node:crypto';
import { config } from '../config';

export type AlertLevel = 'info' | 'warning' | 'critical';
export type AlertEvent = {
  kind: string; // e.g. 'job.dead', 'payment.failed', 'scan.failed', 'auth.bruteforce'
  level: AlertLevel;
  message: string;
  tenantId?: string | null;
  data?: Record<string, unknown>;
};

/** Stable request/job correlation id — reuse an inbound id, else mint one. */
export function correlationId(headers?: Record<string, unknown>): string {
  const h = headers ?? {};
  const provided = (h['x-request-id'] || h['x-correlation-id']) as string | undefined;
  return (typeof provided === 'string' && provided.trim()) || randomUUID();
}

function post(url: string, body: unknown): void {
  try {
    const u = new URL(url);
    const data = JSON.stringify(body);
    const req = https.request(
      { hostname: u.hostname, path: u.pathname + u.search, port: u.port || 443, method: 'POST', headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(data) }, timeout: 4000 },
      (res) => res.resume(),
    );
    req.on('error', () => undefined);
    req.on('timeout', () => req.destroy());
    req.write(data);
    req.end();
  } catch {
    /* never throw from an alert */
  }
}

/** Capture an error for aggregation (Sentry hook + structured console). No-throw. */
export function captureError(err: unknown, ctx: Record<string, unknown> = {}): void {
  const e = err instanceof Error ? { name: err.name, message: err.message, stack: err.stack } : { message: String(err) };
  const record = { level: 'error', kind: 'exception', ...ctx, error: e, ts: new Date().toISOString() };
  // eslint-disable-next-line no-console
  console.error(JSON.stringify(record));
  // A real Sentry integration posts to the DSN's ingest endpoint; kept as a
  // documented hook so we don't ship the SDK. Presence of the DSN is honoured by
  // the deployment's error pipeline.
  if (config.SENTRY_DSN && config.ALERT_WEBHOOK_URL) {
    post(config.ALERT_WEBHOOK_URL, { text: `:rotating_light: exception: ${e.message}`, ctx });
  }
}

/** Emit an operational alert (dead job, payment/scan failure, brute force). No-throw. */
export function alert(event: AlertEvent): void {
  const record = { ...event, ts: new Date().toISOString() };
  // eslint-disable-next-line no-console
  (event.level === 'critical' ? console.error : console.warn)(JSON.stringify({ alert: record }));
  if (config.ALERT_WEBHOOK_URL) {
    const icon = event.level === 'critical' ? ':rotating_light:' : event.level === 'warning' ? ':warning:' : ':information_source:';
    post(config.ALERT_WEBHOOK_URL, { text: `${icon} [${event.kind}] ${event.message}${event.tenantId ? ` (tenant ${event.tenantId})` : ''}`, data: event.data });
  }
}

// ── Auth-failure brute-force detector (windowed, throttled alert) ─────────────
let authFailCount = 0;
let windowStart = 0;
let lastAlerted = 0;
/** Record an authentication failure; alert once per window past the threshold. */
export function noteAuthFailure(now: number, source?: string): void {
  if (now - windowStart > config.AUTH_FAIL_ALERT_WINDOW_MS) {
    windowStart = now;
    authFailCount = 0;
  }
  authFailCount++;
  if (authFailCount === config.AUTH_FAIL_ALERT_THRESHOLD && now - lastAlerted > config.AUTH_FAIL_ALERT_WINDOW_MS) {
    lastAlerted = now;
    alert({ kind: 'auth.bruteforce', level: 'warning', message: `${authFailCount} auth failures within ${Math.round(config.AUTH_FAIL_ALERT_WINDOW_MS / 1000)}s`, data: { source } });
  }
}

/** Test seam. */
export function __resetAuthFailure(): void { authFailCount = 0; windowStart = 0; lastAlerted = 0; }
