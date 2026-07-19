/**
 * Native (self-hosted) scheduling. Free slots are computed from config-driven
 * business hours minus already-booked meetings; a booking is persisted as a
 * Meeting(provider="native") linked to the lead. The unique
 * (provider, providerBookingId) constraint — with providerBookingId scoped by
 * tenant + slot instant — guarantees a slot can only be taken once.
 */
import type { PrismaClient, Tenant } from '@prisma/client';
import { config } from '../config';
import { generateSlots, slotConfigFrom, zonedWallTimeToUtc, localTimeLabel, isValidDateStr, type Slot } from './slots';

export class SlotUnavailableError extends Error {
  constructor() {
    super('slot_unavailable');
    this.name = 'SlotUnavailableError';
  }
}
export class LeadNotFoundError extends Error {
  constructor() {
    super('lead_not_found');
    this.name = 'LeadNotFoundError';
  }
}

const cfg = () => slotConfigFrom(config);
const slotMs = () => config.BOOKING_SLOT_MINUTES * 60_000;

/** Booked slot-start times (ms) for one business date, for the given tenant. */
async function bookedMillisForDate(prisma: PrismaClient, tenantId: string, dateStr: string): Promise<Set<number>> {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dayStart = zonedWallTimeToUtc(y, m, d, 0, 0, config.BOOKING_TIMEZONE);
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);
  const meetings = await prisma.meeting.findMany({
    where: {
      tenantId,
      status: { in: ['SCHEDULED', 'RESCHEDULED'] },
      scheduledAt: { gte: dayStart, lt: dayEnd },
    },
    select: { scheduledAt: true },
  });
  return new Set(meetings.map((mm) => mm.scheduledAt?.getTime()).filter((t): t is number => typeof t === 'number'));
}

export async function listFreeSlots(
  prisma: PrismaClient,
  tenant: Tenant,
  dateStr: string,
  now: Date,
): Promise<{ date: string; timeZone: string; slots: Slot[] }> {
  if (!isValidDateStr(dateStr)) return { date: dateStr, timeZone: config.BOOKING_TIMEZONE, slots: [] };
  const booked = await bookedMillisForDate(prisma, tenant.id, dateStr);
  const slots = generateSlots(dateStr, cfg(), booked, now);
  return { date: dateStr, timeZone: config.BOOKING_TIMEZONE, slots };
}

/** The business-tz calendar date (YYYY-MM-DD) an instant falls on. */
function localDateOf(instant: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: config.BOOKING_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(instant);
}

export type ScheduleInput = { leadId: string; start: string; email?: string; name?: string };
export type ScheduleResult = { meetingId: string; scheduledAt: string; endsAt: string; label: string; meetingUrl: string | null };

export async function scheduleNativeMeeting(prisma: PrismaClient, tenant: Tenant, input: ScheduleInput): Promise<ScheduleResult> {
  const lead = await prisma.lead.findFirst({ where: { id: input.leadId, tenantId: tenant.id } });
  if (!lead) throw new LeadNotFoundError();

  const start = new Date(input.start);
  if (Number.isNaN(start.getTime())) throw new SlotUnavailableError();

  // Authoritative check: the requested instant must be a currently-free slot.
  const { slots } = await listFreeSlots(prisma, tenant, localDateOf(start), new Date());
  const wanted = start.getTime();
  if (!slots.some((s) => new Date(s.start).getTime() === wanted)) throw new SlotUnavailableError();

  const endsAt = new Date(wanted + slotMs());
  const meetingUrl = config.BOOKING_MEETING_URL || null;
  const providerBookingId = `${tenant.id}:${wanted}`; // unique per tenant+slot

  let meeting;
  try {
    meeting = await prisma.meeting.create({
      data: {
        tenantId: tenant.id,
        leadId: lead.id,
        provider: 'native',
        providerBookingId,
        status: 'SCHEDULED',
        scheduledAt: start,
        endsAt,
        attendeeEmail: input.email ?? lead.email,
        meetingUrl,
      },
    });
  } catch (err) {
    // P2002 = unique violation on (provider, providerBookingId): slot just taken.
    if (typeof err === 'object' && err && (err as { code?: string }).code === 'P2002') throw new SlotUnavailableError();
    throw err;
  }

  await prisma.leadActivity.create({
    data: { tenantId: tenant.id, leadId: lead.id, type: 'MEETING_SCHEDULED', data: { provider: 'native', scheduledAt: start.toISOString() } },
  }).catch(() => undefined);
  await prisma.auditEvent.create({
    data: { tenantId: tenant.id, entityType: 'Meeting', entityId: meeting.id, action: 'MEETING_SCHEDULED', actorType: 'SYSTEM', data: { leadId: lead.id, provider: 'native' } },
  }).catch(() => undefined);

  // A booking is a response → satisfy any active SLA for this lead.
  await prisma.slaTimer.updateMany({
    where: { tenantId: tenant.id, leadId: lead.id, status: 'ACTIVE' },
    data: { status: 'MET', satisfiedAt: new Date() },
  }).catch(() => undefined);

  // Durable confirmation email (processed by the worker).
  await prisma.sideEffectJob.create({
    data: {
      tenantId: tenant.id,
      leadId: lead.id,
      type: 'BOOKING_CONFIRM',
      payload: { leadId: lead.id, scheduledAt: start.toISOString(), meetingUrl },
      idempotencyKey: `${meeting.id}:BOOKING_CONFIRM:SCHEDULED`,
      maxAttempts: 6,
    },
  }).catch(() => undefined);

  return { meetingId: meeting.id, scheduledAt: start.toISOString(), endsAt: endsAt.toISOString(), label: localTimeLabel(start, config.BOOKING_TIMEZONE), meetingUrl };
}
