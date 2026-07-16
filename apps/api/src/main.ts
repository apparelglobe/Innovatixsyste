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
import { config } from './config';
import { assertDbReachable, prisma } from './db';
import { registerLeadRoutes } from './routes/leads';
import { registerBookingRoutes } from './routes/booking';
import { registerInvitationRoutes } from './routes/invitations';
import { registerDevOutboxRoutes } from './routes/dev-outbox';
import { registerPortalRoutes } from './portal/routes';
import { registerAdminRoutes } from './admin/routes';
import { registerPaymentWebhookRoutes } from './webhooks/payments';

const CORS_ALLOWED = new Set([...config.LEADS_ALLOWED_ORIGINS, ...config.PORTAL_WEB_ORIGIN]);

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    // trustProxy: reconstruct the real client IP behind nginx (for hashed rate-limit id).
    trustProxy: true,
    bodyLimit: 32 * 1024, // 32KB request cap
    logger: {
      level: config.NODE_ENV === 'test' ? 'silent' : 'info',
      // Never log secrets or sensitive request fields.
      redact: { paths: ['req.headers.authorization', 'req.headers.cookie', 'req.headers["x-cal-signature-256"]'], remove: true },
    },
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

  // Versioned API under /v1.
  await app.register(
    async (v1) => {
      await registerLeadRoutes(v1);
      await registerBookingRoutes(v1);
      await registerInvitationRoutes(v1);
      await registerDevOutboxRoutes(v1);
      await registerPortalRoutes(v1);
      await registerAdminRoutes(v1);
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

  await app.listen({ port: config.PORT, host: '0.0.0.0' });
  app.log.info(`innovatix-api listening on :${config.PORT} (env=${config.NODE_ENV})`);
}

// Auto-start unless imported by tests.
if (config.NODE_ENV !== 'test') {
  start().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[api] fatal:', err);
    process.exit(1);
  });
}
