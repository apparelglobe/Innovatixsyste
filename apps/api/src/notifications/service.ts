/**
 * Notification service. Writes in-app notifications (Notification model) and,
 * when `email` is set, mirrors them to transactional email through the outbox
 * transport. SMS is a future channel behind the same interface.
 */
import type { NotificationType, PrismaClient, RecipientType } from '@prisma/client';
import { sendTransactionalEmail } from '../email/service.js';
import { notificationEmail } from '../email/templates.js';
import { config } from '../config.js';

export type NotifyInput = {
  tenantId: string;
  recipientType: RecipientType;
  recipientId: string;
  type: NotificationType;
  title: string;
  body?: string;
  linkPath?: string;
  projectId?: string;
};

type OrgNotify = Omit<NotifyInput, 'tenantId' | 'recipientType' | 'recipientId'> & { email?: boolean };

const portalUrl = (linkPath?: string) => (config.PORTAL_WEB_ORIGIN[0] || 'http://localhost:3001') + (linkPath || '');

export async function notify(prisma: PrismaClient, n: NotifyInput) {
  return prisma.notification.create({
    data: { tenantId: n.tenantId, recipientType: n.recipientType, recipientId: n.recipientId, type: n.type, title: n.title, body: n.body ?? null, linkPath: n.linkPath ?? null, projectId: n.projectId ?? null },
  });
}

/** Notify every client user of an organization (in-app + optional email). */
export async function notifyClientOrg(prisma: PrismaClient, tenantId: string, clientOrgId: string, n: OrgNotify) {
  const users = await prisma.clientUser.findMany({ where: { tenantId, clientOrgId }, select: { id: true, email: true } });
  if (users.length === 0) return;
  await prisma.notification.createMany({
    data: users.map((u) => ({ tenantId, recipientType: 'CLIENT' as const, recipientId: u.id, type: n.type, title: n.title, body: n.body ?? null, linkPath: n.linkPath ?? null, projectId: n.projectId ?? null })),
  });
  if (n.email) {
    for (const u of users) {
      await sendTransactionalEmail(prisma, { tenantId, type: 'NOTIFICATION', to: u.email, built: notificationEmail(n.title, n.body ?? null, portalUrl(n.linkPath)) }).catch(() => undefined);
    }
  }
}

/** Notify all active staff on a tenant (in-app + optional email) — for client-originated events. */
export async function notifyStaff(prisma: PrismaClient, tenantId: string, n: OrgNotify) {
  const staff = await prisma.staffUser.findMany({ where: { tenantId, active: true }, select: { id: true, email: true } });
  if (staff.length === 0) return;
  await prisma.notification.createMany({
    data: staff.map((s) => ({ tenantId, recipientType: 'STAFF' as const, recipientId: s.id, type: n.type, title: n.title, body: n.body ?? null, linkPath: n.linkPath ?? null, projectId: n.projectId ?? null })),
  });
  if (n.email) {
    for (const s of staff) {
      await sendTransactionalEmail(prisma, { tenantId, type: 'NOTIFICATION', to: s.email, built: notificationEmail(n.title, n.body ?? null, portalUrl('/admin')) }).catch(() => undefined);
    }
  }
}
