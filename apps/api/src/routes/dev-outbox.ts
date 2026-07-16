/**
 * GET /v1/dev/outbox — development-only email outbox viewer. Lets you SEE the
 * acknowledgment / internal / booking emails the outbox transport "sent" without
 * digging through logs. HARD-disabled in production (route not registered).
 */
import type { FastifyInstance } from 'fastify';
import { prisma } from '../db';
import { resolveDefaultTenant } from '../tenant';
import { devOutboxViewerEnabled } from '../config';

export async function registerDevOutboxRoutes(app: FastifyInstance): Promise<void> {
  if (!devOutboxViewerEnabled) return; // never in production

  app.get('/dev/outbox', async (req, reply) => {
    const tenant = await resolveDefaultTenant(prisma);
    const emails = await prisma.emailOutbox.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const wantsHtml = String(req.headers.accept || '').includes('text/html');
    if (!wantsHtml) {
      return reply.send({
        count: emails.length,
        emails: emails.map((e) => ({
          id: e.id, type: e.type, to: e.toAddress, subject: e.subject,
          status: e.status, transport: e.transport, createdAt: e.createdAt, sentAt: e.sentAt,
        })),
      });
    }
    const rows = emails
      .map(
        (e) => `<article style="border:1px solid #1f2937;border-radius:10px;margin:12px 0;padding:16px;background:#0F172A">
          <div style="font-size:12px;color:#64748b">${e.createdAt.toISOString()} · ${e.type} · ${e.status} · ${e.transport}</div>
          <div style="color:#fff;font-weight:700;margin:4px 0">${e.subject}</div>
          <div style="font-size:13px;color:#94a3b8">to: ${e.toAddress}</div>
          <details style="margin-top:8px"><summary style="cursor:pointer;color:#3B82F6">preview</summary>
            <div style="background:#0A0F1C;border-radius:8px;margin-top:8px">${e.htmlBody}</div>
          </details>
        </article>`,
      )
      .join('');
    reply.header('content-type', 'text/html; charset=utf-8');
    return reply.send(
      `<!doctype html><html><body style="background:#0A0F1C;color:#e5e7eb;font-family:Inter,Arial,sans-serif;max-width:720px;margin:0 auto;padding:24px">
        <h1 style="color:#fff">Dev Email Outbox <span style="font-size:13px;color:#64748b">(${emails.length})</span></h1>
        ${rows || '<p style="color:#64748b">No emails yet. Submit a lead to populate.</p>'}
      </body></html>`,
    );
  });
}
