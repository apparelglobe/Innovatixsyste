/**
 * Cal.com booking integration. The visitor is NEVER sent to Cal.com before the
 * lead is persisted — the qualification form creates the Lead + attribution and
 * returns a leadId, which the frontend passes to Cal.com as metadata. The webhook
 * then links the booking back to that lead. Only minimal data is prefilled.
 *
 * Webhooks are verified cryptographically (HMAC-SHA256 of the raw body) before
 * any record is touched.
 */
import { createHmac } from 'node:crypto';
import type { PrismaClient, Tenant } from '@prisma/client';
import { safeEqual } from '../lib/crypto';
import { normalizeEmail } from '../lib/sanitize';

export function verifyCalcomSignature(rawBody: string, signature: string | undefined, secret: string): boolean {
  if (!secret || !signature) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  return safeEqual(expected, signature.trim());
}

type CalcomPayload = {
  triggerEvent?: string;
  payload?: {
    uid?: string;
    bookingId?: number | string;
    startTime?: string;
    endTime?: string;
    metadata?: Record<string, unknown>;
    attendees?: { email?: string; name?: string }[];
    location?: string;
    videoCallData?: { url?: string };
  };
};

export type BookingResult = { linked: boolean; meetingId?: string; leadId?: string; status: string };

export async function handleCalcomWebhook(
  prisma: PrismaClient,
  tenant: Tenant,
  body: CalcomPayload,
): Promise<BookingResult> {
  const ev = body.triggerEvent ?? 'UNKNOWN';
  const p = body.payload ?? {};
  const uid = String(p.uid ?? p.bookingId ?? '');
  if (!uid) return { linked: false, status: 'no_booking_id' };

  // Resolve the lead: prefer explicit metadata.leadId, else attendee email.
  let leadId = typeof p.metadata?.leadId === 'string' ? (p.metadata!.leadId as string) : undefined;
  if (leadId) {
    const exists = await prisma.lead.findFirst({ where: { id: leadId, tenantId: tenant.id } });
    if (!exists) leadId = undefined;
  }
  if (!leadId) {
    const email = p.attendees?.[0]?.email;
    if (email) {
      const lead = await prisma.lead.findUnique({
        where: { tenantId_normalizedEmail: { tenantId: tenant.id, normalizedEmail: normalizeEmail(email) } },
      });
      if (lead) leadId = lead.id;
    }
  }
  if (!leadId) return { linked: false, status: 'lead_not_found' };

  const status =
    ev === 'BOOKING_CANCELLED' ? 'CANCELED' : ev === 'BOOKING_RESCHEDULED' ? 'RESCHEDULED' : 'SCHEDULED';
  const scheduledAt = p.startTime ? new Date(p.startTime) : null;
  const endsAt = p.endTime ? new Date(p.endTime) : null;
  const meetingUrl = p.videoCallData?.url ?? (typeof p.location === 'string' ? p.location : null);

  const meeting = await prisma.meeting.upsert({
    where: { provider_providerBookingId: { provider: 'calcom', providerBookingId: uid } },
    update: { status: status as 'SCHEDULED' | 'RESCHEDULED' | 'CANCELED', scheduledAt, endsAt, meetingUrl, rawPayload: body as object },
    create: {
      tenantId: tenant.id,
      leadId,
      provider: 'calcom',
      providerBookingId: uid,
      status: status as 'SCHEDULED' | 'RESCHEDULED' | 'CANCELED',
      scheduledAt,
      endsAt,
      attendeeEmail: p.attendees?.[0]?.email ?? null,
      meetingUrl,
      rawPayload: body as object,
    },
  });

  await prisma.leadActivity.create({
    data: {
      tenantId: tenant.id,
      leadId,
      type: status === 'SCHEDULED' ? 'MEETING_SCHEDULED' : 'MEETING_UPDATED',
      data: { uid, status, scheduledAt: scheduledAt?.toISOString() ?? null },
    },
  });
  await prisma.auditEvent.create({
    data: { tenantId: tenant.id, entityType: 'Meeting', entityId: meeting.id, action: `MEETING_${status}`, actorType: 'WEBHOOK', data: { uid, leadId } },
  });

  // A booking is a response → satisfy any active SLA for this lead.
  if (status !== 'CANCELED') {
    await prisma.slaTimer.updateMany({
      where: { tenantId: tenant.id, leadId, status: 'ACTIVE' },
      data: { status: 'MET', satisfiedAt: new Date() },
    });
    // Durable confirmation email.
    await prisma.sideEffectJob.create({
      data: {
        tenantId: tenant.id,
        leadId,
        type: 'BOOKING_CONFIRM',
        payload: { leadId, scheduledAt: scheduledAt?.toISOString() ?? null, meetingUrl },
        idempotencyKey: `${meeting.id}:BOOKING_CONFIRM:${status}`,
        maxAttempts: 6,
      },
    }).catch(() => undefined); // idempotent on replay
  }

  return { linked: true, meetingId: meeting.id, leadId, status };
}
