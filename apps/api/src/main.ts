/**
 * Innovatix API — public website lead pipeline + Cal.com booking webhook.
 *
 * Hardening: helmet, CORS restricted to approved origins, JSON body-size limit,
 * raw-body capture (for webhook HMAC), redacted structured logging (no IP/UA/
 * form bodies), a DB-readiness gate at boot, and a safe error boundary. See the
 * per-file headers for the pipeline design.
 */
import Fastify, { type FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import { timingSafeEqual } from 'node:crypto';
import { config } from './config';
import { assertDbReachable, prisma } from './db';
import { storage } from './storage';
import { correlationId, captureError, noteAuthFailure } from './observability';
import { incr, observeHttpLatency, renderPrometheus } from './observability/metrics';
import { registerLeadRoutes } from './routes/leads';
import { registerBookingRoutes } from './routes/booking';
import { registerInvitationRoutes } from './routes/invitations';
import { registerDevOutboxRoutes } from './routes/dev-outbox';
import { registerPortalRoutes } from './portal/routes';
import { registerAdminRoutes } from './admin/routes';
import { registerCatalogRoutes } from './admin/catalog';
import { registerProposalAdminRoutes } from './admin/proposals';
import { registerProposalRoutes } from './routes/proposals';
import { registerPaymentWebhookRoutes } from './webhooks/payments';

const CORS_ALLOWED = new Set([...config.LEADS_ALLOWED_ORIGINS, ...config.PORTAL_WEB_ORIGIN]);

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    // trustProxy: reconstruct the real client IP behind nginx (for hashed rate-limit id).
    trustProxy: true,
    bodyLimit: 32 * 1024, // 32KB request cap
    // Correlation id: reuse an inbound x-request-id / x-correlation-id else mint one.
    genReqId: (req) => correlationId(req.headers as Record<string, unknown>),
    logger: {
      level: config.NODE_ENV === 'test' ? 'silent' : config.LOG_LEVEL,
      // Never log secrets or sensitive request fields.
      redact: { paths: ['req.headers.authorization', 'req.headers.cookie', 'req.headers["x-cal-signature-256"]', 'req.headers["stripe-signature"]'], remove: true },
    },
  });

  // ── Observability: correlation id header, latency + status metrics, safe error
  //    boundary (every uncaught error is captured, never leaks internals). ──
  app.addHook('onSend', async (req, reply, payload) => {
    reply.header('x-correlation-id', String(req.id));
    return payload;
  });
  app.addHook('onResponse', async (req, reply) => {
    observeHttpLatency(reply.elapsedTime ?? 0);
    incr('http_requests_total', { method: req.method, status: String(reply.statusCode) });
    if (reply.statusCode === 401) noteAuthFailure(Date.now(), req.routeOptions?.url ?? req.url);
  });
  app.setErrorHandler((err, req, reply) => {
    const status = (err as { statusCode?: number }).statusCode;
    if (!status || status >= 500) captureError(err, { reqId: req.id, method: req.method, url: req.url });
    reply.code(status && status < 500 ? status : 500).send({ ok: false, message: status && status < 500 ? (err as Error).message : 'Internal error' });
  });

  // Capture the raw JSON body (needed for webhook signature verification) while
  // still parsing it for handlers.
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
    (req as unknown as { rawBody?: string }).rawBody = body as string;
    try {
      done(null, (body as string).length ? JSON.parse(body as string) : {});
    } catch (err) {
      done(err as Error, undefined);
    }
  });

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cookie, { secret: config.PORTAL_JWT_SECRET });
  await app.register(multipart, { limits: { fileSize: config.MAX_FILE_BYTES, files: 1 } });
  await app.register(cors, {
    origin(origin, cb) {
      // Allow server-to-server (no Origin) + approved browser origins only.
      if (!origin || CORS_ALLOWED.has(origin)) return cb(null, true);
      cb(null, false);
    },
    credentials: true, // portal uses an httpOnly session cookie
    methods: ['POST', 'GET', 'OPTIONS'],
    maxAge: 600,
  });

  app.get('/health', async () => ({ ok: true, service: 'innovatix-api', ts: Date.now() }));

  // Liveness: the process is up (no dependency checks — never flaps the pod).
  app.get('/livez', async () => ({ ok: true, status: 'alive', ts: Date.now() }));

  // Readiness: dependencies healthy enough to serve traffic. 503 if the DB is down.
  app.get('/readyz', async (_req, reply) => {
    const checks: Record<string, string> = { scanner: config.MALWARE_SCANNER_PROVIDER, storage_provider: config.STORAGE_PROVIDER };
    let ready = true;
    try { await prisma.$queryRaw`SELECT 1`; checks.db = 'ok'; } catch { checks.db = 'down'; ready = false; }
    try { await storage().head('__readiness_probe__'); checks.storage = 'ok'; } catch { checks.storage = 'error'; }
    return reply.code(ready ? 200 : 503).send({ ok: ready, checks, ts: Date.now() });
  });

  // Prometheus metrics (restrict to the internal network / scrape token at nginx).
  app.get('/metrics', async (req, reply) => {
    if (!config.METRICS_ENABLED) return reply.code(404).send();
    // Bearer-token gate so internal queue/scan counts are never publicly scrapable.
    // When a token is configured, it is required (timing-safe compare). In
    // production a token is mandatory (config-validation enforces it); if somehow
    // absent, fail closed rather than leak. Dev with no token = open (convenience).
    const token = config.METRICS_TOKEN;
    if (token) {
      const auth = String(req.headers['authorization'] ?? '');
      const presented = auth.startsWith('Bearer ') ? auth.slice(7) : '';
      const a = Buffer.from(presented);
      const b = Buffer.from(token);
      if (a.length !== b.length || !timingSafeEqual(a, b)) return reply.code(401).send();
    } else if (config.NODE_ENV === 'production') {
      return reply.code(403).send();
    }
    const [pendingJobs, deadJobs, pendingScans, deadScans, scanningFiles] = await Promise.all([
      prisma.sideEffectJob.count({ where: { status: 'PENDING' } }),
      prisma.sideEffectJob.count({ where: { status: 'DEAD' } }),
      prisma.fileScan.count({ where: { status: 'PENDING' } }),
      prisma.fileScan.count({ where: { status: 'DEAD' } }),
      prisma.projectFile.count({ where: { state: 'SCANNING' } }),
    ]).catch(() => [0, 0, 0, 0, 0]);
    const extra = [
      `sideeffect_jobs_pending ${pendingJobs}`,
      `sideeffect_jobs_dead ${deadJobs}`,
      `scan_jobs_pending ${pendingScans}`,
      `scan_jobs_dead ${deadScans}`,
      `files_scanning ${scanningFiles}`,
    ].join('\n');
    reply.header('content-type', 'text/plain; version=0.0.4');
    return renderPrometheus() + extra + '\n';
  });

  // Versioned API under /v1.
  await app.register(
    async (v1) => {
      await registerLeadRoutes(v1);
      await registerBookingRoutes(v1);
      await registerInvitationRoutes(v1);
      await registerDevOutboxRoutes(v1);
      await registerPortalRoutes(v1);
      await registerAdminRoutes(v1);
      await registerCatalogRoutes(v1);
      await registerProposalAdminRoutes(v1);
      await registerProposalRoutes(v1);
      await registerPaymentWebhookRoutes(v1);
    },
    { prefix: '/v1' },
  );

  return app;
}

export async function start(): Promise<void> {
  const app = await buildApp();
  try {
    await assertDbReachable();
  } catch (err) {
    app.log.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
  const shutdown = async () => {
    await app.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Bind host is configurable: default 0.0.0.0 for container/dev, but a
  // single-box deploy behind a same-origin proxy should set HOST=127.0.0.1 so
  // the API is never directly reachable from the public interface.
  const host = process.env.HOST || '0.0.0.0';
  await app.listen({ port: config.PORT, host });
  app.log.info(`innovatix-api listening on ${host}:${config.PORT} (env=${config.NODE_ENV})`);
}

// Auto-start unless imported by tests.
if (config.NODE_ENV !== 'test') {
  start().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[api] fatal:', err);
    process.exit(1);
  });
}
