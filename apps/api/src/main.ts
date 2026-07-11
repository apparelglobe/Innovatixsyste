import Fastify from 'fastify';

/**
 * Placeholder shared API. Replaced by the NestJS modular monolith (multi-tenant,
 * RLS) in the platform stage. F1 only needs it to build + expose /health.
 */
const app = Fastify({ logger: true });

app.get('/health', async () => ({ ok: true, service: 'innovatix-api', ts: Date.now() }));

// Stub for the website lead intake (implemented in W7).
app.post('/v1/leads', async (req, reply) => reply.code(501).send({ error: 'not_implemented' }));

const port = Number(process.env.PORT ?? 4000);
if (require.main === module) {
  app.listen({ port, host: '0.0.0.0' }).catch((e) => { app.log.error(e); process.exit(1); });
}

export { app };
