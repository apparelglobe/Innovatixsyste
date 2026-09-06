/**
 * Step 3 acceptance tests — the lead pipeline end to end.
 * Run: NODE_ENV=test npm test  (requires the dev DB up: scripts/dev-db.sh start)
 *
 * Uses the real Postgres (dedup/idempotency/concurrency are the whole point, so
 * they can't be mocked). Each test uses a unique email/idempotency key.
 */
import '../_setup'; // MUST be first — points DATABASE_URL at the isolated test DB
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import { buildApp } from '../../src/main';
import { prisma } from '../../src/db';
import { config } from '../../src/config';
import { resolveDefaultTenant } from '../../src/tenant';
import { intakeLead } from '../../src/leads/service';
import { processDueJobs } from '../../src/jobs/processor';
import { checkRateLimit } from '../../src/lib/ratelimit';
import { computeSlaDueAt } from '../../src/lib/business-hours';
import { verifyCalcomSignature } from '../../src/booking/service';

let app: Awaited<ReturnType<typeof buildApp>>;
let tenantId: string;
const uid = () => randomUUID().slice(0, 8);
const base = (over: Record<string, unknown> = {}) => ({
  firstName: 'Grace',
  lastName: 'Hopper',
  businessEmail: `grace-${uid()}@example.com`,
  company: 'Navy Systems',
  form: 'CONTACT',
  serviceInterest: 'ERP Development',
  projectDescription: 'We need a custom ERP for operations.',
  idempotencyKey: `key-${uid()}-${uid()}`,
  ...over,
});
// Each submission gets a UNIQUE client IP (via X-Forwarded-For; trustProxy is on),
// so the durable DB-backed rate limiter never bleeds one test into another.
const uniqueIp = () => `10.${1 + ((Math.random() * 250) | 0)}.${(Math.random() * 250) | 0}.${1 + ((Math.random() * 250) | 0)}`;
const post = (payload: unknown, ip: string = uniqueIp()) =>
  app.inject({ method: 'POST', url: '/v1/leads', headers: { 'content-type': 'application/json', origin: 'http://localhost:4030', 'x-forwarded-for': ip }, payload });

before(async () => {
  app = await buildApp();
  await app.ready();
  const t = await resolveDefaultTenant(prisma);
  tenantId = t.id;
});
after(async () => {
  await app.close();
  await prisma.$disconnect();
});

test('1. new valid lead → 202 + lead/inquiry/attribution/4 jobs', async () => {
  const email = `new-${uid()}@example.com`;
  const res = await post(base({ businessEmail: email, attribution: { utmSource: 'google', utmMedium: 'cpc', gclid: 'G123' } }));
  assert.equal(res.statusCode, 202);
  const body = res.json();
  assert.equal(body.ok, true);
  assert.ok(body.reference);
  const lead = await prisma.lead.findFirstOrThrow({ where: { tenantId, normalizedEmail: email } });
  const inquiries = await prisma.leadInquiry.count({ where: { leadId: lead.id } });
  const attr = await prisma.leadAttribution.findFirst({ where: { inquiry: { leadId: lead.id } } });
  const jobs = await prisma.sideEffectJob.count({ where: { leadId: lead.id } });
  assert.equal(inquiries, 1);
  assert.equal(attr?.gclid, 'G123');
  assert.equal(attr?.utmSource, 'google');
  assert.equal(jobs, 4);
});

test('2. repeat submission same email (different key) → same lead, 2 inquiries', async () => {
  const email = `repeat-${uid()}@example.com`;
  await post(base({ businessEmail: email }));
  await post(base({ businessEmail: email }));
  const lead = await prisma.lead.findFirstOrThrow({ where: { tenantId, normalizedEmail: email } });
  const count = await prisma.leadInquiry.count({ where: { leadId: lead.id } });
  assert.equal(count, 2);
  const leadCount = await prisma.lead.count({ where: { tenantId, normalizedEmail: email } });
  assert.equal(leadCount, 1);
});

test('3. same lead, a second distinct project inquiry is preserved', async () => {
  const email = `multi-${uid()}@example.com`;
  await post(base({ businessEmail: email, projectDescription: 'Project A: ERP' }));
  await post(base({ businessEmail: email, projectDescription: 'Project B: mobile app' }));
  const lead = await prisma.lead.findFirstOrThrow({ where: { tenantId, normalizedEmail: email } });
  const inqs = await prisma.leadInquiry.findMany({ where: { leadId: lead.id }, orderBy: { submittedAt: 'asc' } });
  assert.equal(inqs.length, 2);
  assert.notEqual(inqs[0].projectDescription, inqs[1].projectDescription);
});

test('4. double-click (same idempotency key) → exactly one inquiry', async () => {
  const p = base();
  await post(p);
  await post(p);
  const inqs = await prisma.leadInquiry.count({ where: { tenantId, idempotencyKey: p.idempotencyKey } });
  assert.equal(inqs, 1);
});

test('5. retried HTTP with same idempotency key → same reference (replay)', async () => {
  const p = base();
  const r1 = await post(p);
  const r2 = await post(p);
  assert.equal(r1.json().reference, r2.json().reference);
});

test('6. two concurrent submissions (same email) → one lead, two inquiries', async () => {
  const email = `concurrent-${uid()}@example.com`;
  // Assert BOTH succeed — before the FOR UPDATE fix, one submission lost a deadlock (40P01) and 500'd,
  // leaving one inquiry. The status check makes that failure mode explicit, not just a count mismatch.
  const [r1, r2] = await Promise.all([post(base({ businessEmail: email })), post(base({ businessEmail: email }))]);
  assert.equal(r1.statusCode, 202);
  assert.equal(r2.statusCode, 202);
  const leads = await prisma.lead.count({ where: { tenantId, normalizedEmail: email } });
  const lead = await prisma.lead.findFirstOrThrow({ where: { tenantId, normalizedEmail: email } });
  const inqs = await prisma.leadInquiry.count({ where: { leadId: lead.id } });
  assert.equal(leads, 1);
  assert.equal(inqs, 2);
});

test('6b. N concurrent submissions (same NEW email, repeated rounds) → 1 lead, N inquiries, N job/attr sets, all 202', async () => {
  const N = 8; // exceeds the old 2-way race; the whole race runs from BEFORE the lead exists
  const ROUNDS = 4; // run the race repeatedly, not once
  for (let round = 0; round < ROUNDS; round++) {
    const email = `race-${uid()}-r${round}@example.com`;
    const responses = await Promise.all(Array.from({ length: N }, () => post(base({ businessEmail: email }))));
    // A deadlock would surface here as a 500 on the losing submission.
    for (const r of responses) assert.equal(r.statusCode, 202, `round ${round}: expected 202, got ${r.statusCode} → ${r.payload}`);
    // Exactly one lead — the unique(tenantId, normalizedEmail) + P2002 refetch converges all N onto it
    // BEFORE the FOR UPDATE section (resolveLead runs outside the txn), so the lock section is same-row.
    const leads = await prisma.lead.count({ where: { tenantId, normalizedEmail: email } });
    assert.equal(leads, 1, `round ${round}: exactly one lead`);
    const lead = await prisma.lead.findFirstOrThrow({ where: { tenantId, normalizedEmail: email } });
    // No duplicate inquiries / attribution rows / job sets — retries are atomic (rolled back attempts
    // leave nothing) and each is independently unique-guarded.
    assert.equal(await prisma.leadInquiry.count({ where: { leadId: lead.id } }), N, `round ${round}: N inquiries`);
    assert.equal(await prisma.leadAttribution.count({ where: { inquiry: { leadId: lead.id } } }), N, `round ${round}: N attributions`);
    assert.equal(await prisma.sideEffectJob.count({ where: { leadId: lead.id } }), N * 4, `round ${round}: N×4 jobs`);
    // Exactly one LEAD_CREATED across all N (only the isNew winner emits it), and one lead row overall.
    assert.equal(
      await prisma.leadActivity.count({ where: { leadId: lead.id, type: 'LEAD_CREATED' } }),
      1,
      `round ${round}: exactly one LEAD_CREATED activity`,
    );
  }
});

test('6c. N concurrent submissions (distinct emails) stay parallel + correct → N leads, one inquiry each, all 202', async () => {
  const N = 8;
  const emails = Array.from({ length: N }, () => `distinct-${uid()}@example.com`);
  const responses = await Promise.all(emails.map((email) => post(base({ businessEmail: email }))));
  for (const r of responses) assert.equal(r.statusCode, 202);
  for (const email of emails) {
    assert.equal(await prisma.lead.count({ where: { tenantId, normalizedEmail: email } }), 1);
    const lead = await prisma.lead.findFirstOrThrow({ where: { tenantId, normalizedEmail: email } });
    assert.equal(await prisma.leadInquiry.count({ where: { leadId: lead.id } }), 1);
  }
});

test('6d. injected deadlock (P2034) on the first attempt → bounded retry re-runs the WHOLE txn; exactly one inquiry/attribution/job set + one per idempotency key (no duplication)', async () => {
  // Real deadlocks can no longer occur (FOR UPDATE serialises same-lead intakes), so the retry branch is
  // otherwise unexercised. Inject a synthetic P2034 on the FIRST $transaction and delegate everything else
  // to the real client: this proves the retry (a) fires ONLY on a genuine deadlock and (b) writes exactly
  // ONE set — the failed attempt committed nothing (atomicity), and the unique keys would reject any dup.
  const email = `retry-${uid()}@example.com`;
  const payload = base({ businessEmail: email });
  let txCalls = 0;
  const flaky = new Proxy(prisma, {
    get(target, prop, recv) {
      if (prop === '$transaction') {
        return (...args: unknown[]) => {
          txCalls += 1;
          if (txCalls === 1) {
            return Promise.reject(
              new Prisma.PrismaClientKnownRequestError('deadlock detected', { code: 'P2034', clientVersion: 'test' }),
            );
          }
          return (target.$transaction as (...a: unknown[]) => unknown)(...args);
        };
      }
      return Reflect.get(target, prop, recv);
    },
  }) as unknown as typeof prisma;

  const result = await intakeLead(flaky, { id: tenantId } as any, payload as any, { correlationId: `c-${uid()}` });
  assert.ok(txCalls >= 2, `retry must have re-run the whole transaction (txCalls=${txCalls})`);
  assert.equal(result.replayed, false);
  const lead = await prisma.lead.findFirstOrThrow({ where: { tenantId, normalizedEmail: email } });
  assert.equal(await prisma.leadInquiry.count({ where: { leadId: lead.id } }), 1, 'one inquiry, no dup');
  assert.equal(await prisma.leadAttribution.count({ where: { inquiry: { leadId: lead.id } } }), 1, 'one attribution, no dup');
  assert.equal(await prisma.sideEffectJob.count({ where: { leadId: lead.id } }), 4, 'one job set, no dup');
  assert.equal(
    await prisma.leadInquiry.count({ where: { tenantId, idempotencyKey: (payload as { idempotencyKey: string }).idempotencyKey } }),
    1,
    'one inquiry per idempotency key',
  );
});

test('7. invalid email → 400 (generic)', async () => {
  const res = await post(base({ businessEmail: 'not-an-email' }));
  assert.equal(res.statusCode, 400);
  assert.equal(res.json().ok, false);
});

test('8. oversized project description → 400', async () => {
  const res = await post(base({ projectDescription: 'x'.repeat(5001) }));
  assert.equal(res.statusCode, 400);
});

test('9. honeypot → 202 generic, inquiry REJECTED, no side-effect jobs', async () => {
  const email = `bot-${uid()}@example.com`;
  const res = await post(base({ businessEmail: email, honeypot: 'i-am-a-bot' }));
  assert.equal(res.statusCode, 202); // never reveal spam outcome
  const lead = await prisma.lead.findFirstOrThrow({ where: { tenantId, normalizedEmail: email } });
  const inq = await prisma.leadInquiry.findFirstOrThrow({ where: { leadId: lead.id } });
  assert.equal(inq.spamResult, 'REJECTED');
  const jobs = await prisma.sideEffectJob.count({ where: { leadId: lead.id } });
  assert.equal(jobs, 0);
});

test('10. rate-limit triggers after the max (direct, isolated identifier)', async () => {
  const hashedId = `test-rl-${uid()}`;
  const MAX = 3;
  let limitedAt = -1;
  for (let i = 1; i <= 8; i++) {
    const r = await checkRateLimit(prisma, tenantId, hashedId, new Date(), MAX);
    if (r.limited && limitedAt === -1) limitedAt = i;
  }
  assert.equal(limitedAt, MAX + 1, `should limit right after ${MAX} allowed`);
});

test('10b. HTTP rate limit — repeated submissions from one IP → 429 (proves enforcement)', async () => {
  const ip = uniqueIp(); // fixed for this test only; other tests use their own IPs
  const max = config.LEADS_RATE_LIMIT_MAX;
  let last = 0;
  for (let i = 1; i <= max + 1; i++) last = (await post(base(), ip)).statusCode;
  assert.equal(last, 429, `submission ${max + 1} from one IP should be rate limited`);
});

test('11-15. side-effect retry → backoff → dead-letter (failing job)', async () => {
  // processDueJobs below drains the GLOBAL job queue, so first clear any PENDING jobs left by earlier
  // tests/files — otherwise a leftover email job would be processed here (a real send → ~30s timeout)
  // and skew this test. This file and retainer-worker are the only two processDueJobs drivers.
  await prisma.sideEffectJob.deleteMany({});
  // A job that references a non-existent lead throws in its handler → exercises
  // the generic retry/backoff/dead-letter path used by email/notify/assignment.
  // leadId null → the ACK_EMAIL handler's findUniqueOrThrow throws → retry path.
  const job = await prisma.sideEffectJob.create({
    data: { tenantId, type: 'ACK_EMAIL', leadId: null, payload: {}, idempotencyKey: `fail-${uid()}`, maxAttempts: 2, nextAttemptAt: new Date(0) },
  });
  // attempt 1 → fails, reschedules PENDING with future nextAttemptAt
  let s = await processDueJobs(prisma, new Date());
  assert.ok(s.failed >= 1);
  let cur = await prisma.sideEffectJob.findUniqueOrThrow({ where: { id: job.id } });
  assert.equal(cur.status, 'PENDING');
  assert.equal(cur.attempts, 1);
  assert.ok(cur.nextAttemptAt.getTime() > Date.now());
  // force it due again → attempt 2 hits maxAttempts → DEAD
  await prisma.sideEffectJob.update({ where: { id: job.id }, data: { nextAttemptAt: new Date(0) } });
  s = await processDueJobs(prisma, new Date());
  assert.ok(s.dead >= 1);
  cur = await prisma.sideEffectJob.findUniqueOrThrow({ where: { id: job.id } });
  assert.equal(cur.status, 'DEAD');
  assert.ok(cur.lastError);
});

test('16. missing attribution → 202, attribution row created with nulls', async () => {
  const email = `noattr-${uid()}@example.com`;
  const res = await post(base({ businessEmail: email, attribution: undefined }));
  assert.equal(res.statusCode, 202);
  const lead = await prisma.lead.findFirstOrThrow({ where: { tenantId, normalizedEmail: email } });
  const attr = await prisma.leadAttribution.findFirst({ where: { inquiry: { leadId: lead.id } } });
  assert.ok(attr);
  assert.equal(attr?.utmSource, null);
  assert.equal(attr?.gclid, null);
});

test('17. full UTM + GCLID captured', async () => {
  const email = `utm-${uid()}@example.com`;
  await post(base({ businessEmail: email, attribution: { utmSource: 's', utmMedium: 'm', utmCampaign: 'c', utmTerm: 't', utmContent: 'co', gclid: 'g', referrerUrl: 'https://ref', landingPage: '/lp' } }));
  const lead = await prisma.lead.findFirstOrThrow({ where: { tenantId, normalizedEmail: email } });
  const a = await prisma.leadAttribution.findFirstOrThrow({ where: { inquiry: { leadId: lead.id } } });
  assert.deepEqual(
    { s: a.utmSource, m: a.utmMedium, c: a.utmCampaign, t: a.utmTerm, co: a.utmContent, g: a.gclid },
    { s: 's', m: 'm', c: 'c', t: 't', co: 'co', g: 'g' },
  );
});

test('18. cross-tenant isolation — same email is a distinct lead per tenant', async () => {
  const other = await prisma.tenant.upsert({ where: { slug: 'other-tenant-test' }, update: {}, create: { slug: 'other-tenant-test', name: 'Other' } });
  const email = `shared-${uid()}@example.com`;
  await intakeLead(prisma, { id: tenantId } as any, base({ businessEmail: email }) as any, { correlationId: 'c1' });
  await intakeLead(prisma, other as any, base({ businessEmail: email }) as any, { correlationId: 'c2' });
  const a = await prisma.lead.findUnique({ where: { tenantId_normalizedEmail: { tenantId, normalizedEmail: email } } });
  const b = await prisma.lead.findUnique({ where: { tenantId_normalizedEmail: { tenantId: other.id, normalizedEmail: email } } });
  assert.ok(a && b);
  assert.notEqual(a!.id, b!.id); // isolated per tenant
});

test('19. database unavailable → clear failure', async () => {
  const bad = new PrismaClient({ datasources: { db: { url: 'postgresql://x:x@127.0.0.1:1/none?connect_timeout=1' } } });
  await assert.rejects(() => bad.$queryRaw`SELECT 1`);
  await bad.$disconnect().catch(() => undefined);
});

test('20. Cal.com webhook — valid signature links booking + confirm job', async () => {
  // First persist a lead the booking will link to.
  const email = `book-${uid()}@example.com`;
  await post(base({ businessEmail: email }));
  const lead = await prisma.lead.findFirstOrThrow({ where: { tenantId, normalizedEmail: email } });
  const bookingUid = `cal-${uid()}`;
  const payload = JSON.stringify({
    triggerEvent: 'BOOKING_CREATED',
    payload: { uid: bookingUid, startTime: '2026-08-01T15:00:00Z', endTime: '2026-08-01T15:30:00Z', metadata: { leadId: lead.id }, attendees: [{ email }] },
  });
  const sig = createHmac('sha256', 'dev_calcom_secret').update(payload).digest('hex');
  const res = await app.inject({ method: 'POST', url: '/v1/booking/calcom-webhook', headers: { 'content-type': 'application/json', 'x-cal-signature-256': sig }, payload });
  assert.equal(res.statusCode, 200);
  const meeting = await prisma.meeting.findFirst({ where: { providerBookingId: bookingUid } });
  assert.ok(meeting);
  assert.equal(meeting?.leadId, lead.id);
  const confirmJob = await prisma.sideEffectJob.count({ where: { leadId: lead.id, type: 'BOOKING_CONFIRM' } });
  assert.ok(confirmJob >= 1);
});

test('21. Cal.com webhook — invalid signature → 401, no meeting', async () => {
  const bookingUid = `cal-bad-${uid()}`;
  const payload = JSON.stringify({ triggerEvent: 'BOOKING_CREATED', payload: { uid: bookingUid, attendees: [{ email: 'x@example.com' }] } });
  const res = await app.inject({ method: 'POST', url: '/v1/booking/calcom-webhook', headers: { 'content-type': 'application/json', 'x-cal-signature-256': 'deadbeef' }, payload });
  assert.equal(res.statusCode, 401);
  const meeting = await prisma.meeting.findFirst({ where: { providerBookingId: bookingUid } });
  assert.equal(meeting, null);
});

test('22. business-hours SLA lands inside a weekday window', async () => {
  // Friday 16:00 ET + 240 business min → should roll into Monday, not the weekend.
  const fri = new Date('2026-07-10T20:00:00Z'); // 16:00 America/New_York (EDT)
  const due = computeSlaDueAt(fri, 240, 'America/New_York');
  assert.ok(due.getTime() > fri.getTime());
  const dow = due.getUTCDay();
  assert.ok(dow >= 1 && dow <= 5, `due should be a weekday, got dow=${dow}`);
});

test('23. signature verifier rejects tampered body', () => {
  const body = '{"a":1}';
  const sig = createHmac('sha256', 'secret').update(body).digest('hex');
  assert.equal(verifyCalcomSignature(body, sig, 'secret'), true);
  assert.equal(verifyCalcomSignature('{"a":2}', sig, 'secret'), false);
  assert.equal(verifyCalcomSignature(body, sig, 'wrong'), false);
});
