/**
 * Sends a transactional email AND records it in EmailOutbox (dev viewer +
 * audit). On provider failure the row is marked FAILED and the error rethrown so
 * the calling side-effect job retries. The dev 'outbox' transport is a no-op
 * send, so the recorded row IS the delivered message.
 */
import type { PrismaClient } from '@prisma/client';
import { makeTransport } from './transports';
import { config } from '../config';

type SendArgs = {
  tenantId: string;
  type: 'LEAD_ACK' | 'INTERNAL_LEAD_NOTIFY' | 'BOOKING_CONFIRM' | 'ASSIGNMENT_NOTIFY' | 'SLA_WARNING' | 'SIDE_EFFECT_FAILURE_ALERT' | 'PORTAL_INVITE' | 'NOTIFICATION';
  to: string;
  built: { subject: string; html: string; text: string };
  leadId?: string | null;
  inquiryId?: string | null;
};

const transport = makeTransport();

export async function sendTransactionalEmail(prisma: PrismaClient, args: SendArgs): Promise<void> {
  const row = await prisma.emailOutbox.create({
    data: {
      tenantId: args.tenantId,
      leadId: args.leadId ?? null,
      inquiryId: args.inquiryId ?? null,
      type: args.type,
      transport: transport.name,
      toAddress: args.to,
      fromAddress: config.EMAIL_FROM,
      subject: args.built.subject,
      htmlBody: args.built.html,
      textBody: args.built.text,
      status: 'QUEUED',
    },
  });

  try {
    const res = await transport.send({
      to: args.to,
      from: config.EMAIL_FROM,
      subject: args.built.subject,
      html: args.built.html,
      text: args.built.text,
    });
    await prisma.emailOutbox.update({
      where: { id: row.id },
      data: { status: 'SENT', providerMessageId: res.providerMessageId, sentAt: new Date() },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await prisma.emailOutbox.update({ where: { id: row.id }, data: { status: 'FAILED', error: msg } });
    throw err;
  }
}
