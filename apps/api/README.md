# Innovatix API — Lead Pipeline

Fastify + Prisma + PostgreSQL service behind the public website. Receives lead
submissions (`POST /v1/leads`) and Cal.com booking webhooks, persists them
durably, and drains side effects (emails, assignment, SLA) via a worker.

## Quick start

```bash
# 1. Start Postgres
docker compose up -d                 # canonical (port 5432)
#   — or, without Docker (Homebrew Postgres on 5433/5544):
bash scripts/dev-db.sh start

# 2. Configure + migrate + seed
cp apps/api/.env.example apps/api/.env
npm run db:migrate -w api            # apply migrations
npm run db:seed -w api               # seed the default tenant

# 3. Run
npm run dev -w api                   # API on :4040
npm run worker -w api                # side-effect worker (separate process)
```

`.env` uses port **5544** for the no-Docker local cluster; `docker-compose.yml`
uses **5432**. Set `DATABASE_URL` to match whichever you run.

## Architecture

```
POST /v1/leads
  → zod validate + size limit           (routes/leads.ts, schema.ts)
  → DB-backed rate limit (hashed IP)     (lib/ratelimit.ts)
  → intakeLead()                         (leads/service.ts)
      → spam assess (honeypot+heuristics)(lib/spam.ts)
      → idempotency replay check
      → resolve/dedup lead (retry-safe)
      → TX: inquiry + attribution + audit + activity + PENDING jobs
  → 202 generic response

worker (jobs/processor.ts)
  → claim due job (atomic) → handle → SUCCEEDED
                           → fail → backoff → … → DEAD (+ alert)
  handlers: ACK_EMAIL, INTERNAL_NOTIFY, ASSIGNMENT, SLA_TIMER,
            BOOKING_CONFIRM, SLA_WARNING
```

### Deduplication
Lead identity = **UNIQUE(tenantId, normalizedEmail)** (lowercased+trimmed).
Because a Postgres unique violation poisons its transaction, the lead is
resolved *before* the inquiry transaction (find → create → on P2002 refetch the
winner). Two concurrent submissions for the same email converge on **one lead**;
every submission is preserved as its own **LeadInquiry**. Company is normalized
for *comparison only* (original always kept) and is supporting evidence, never
the identity key.

### Idempotency
Client sends `idempotencyKey`. Inquiry identity = **UNIQUE(tenantId,
idempotencyKey)**. A replay (double-click / retry) returns the **original**
`reference` and creates nothing.

### Durable side effects
Lead + inquiry + attribution + audit + PENDING jobs commit in **one
transaction**. The worker drains jobs with **exponential backoff** (30s·2^n,
cap 1h) up to `maxAttempts`, then marks the job **DEAD** and raises a one-time
alert. Each job has a deterministic `idempotencyKey` so retries never
double-fire. The API never reports failure to the visitor once the lead is
safely persisted.

### Privacy
No raw IP is stored or logged — only a **salted SHA-256 hash** (`ABUSE_HASH_SALT`)
with an `expiresAt` for retention. Sensitive fields (project description, UA,
gclid) are never logged; the Cal.com signature header is redacted. Project
descriptions are never forwarded to analytics/ads/Cal.com.

## Email

Interface: `EmailTransport` (`email/types.ts`). Dev = **Outbox** transport
(recorded in `email_outbox`, viewable at `/v1/dev/outbox` — disabled in
production). Prod = **Postmark** (`EMAIL_TRANSPORT=postmark`,
`POSTMARK_SERVER_TOKEN`, transactional stream). Marketing email stays a separate
concern — never routed through this transport.

## Cal.com booking

Sequence: qualification form → lead+attribution persisted → `leadId` returned →
Cal.com scheduling (only minimal prefill) → **webhook** links the booking to the
existing lead. Webhooks are verified by **HMAC-SHA256 of the raw body**
(`x-cal-signature-256`, `CALCOM_WEBHOOK_SECRET`) before any record changes. A
booking satisfies the lead's active SLA and enqueues a confirmation email.

## Tenancy

Single public tenant today, resolved centrally (`tenant.ts`) — no hardcoded
constant. Every record carries `tenantId`; queries are tenant-scoped; compound
indexes lead with `tenantId`. Schema is RLS-ready.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev -w api` | API (watch) on :4040 |
| `npm run worker -w api` | Side-effect worker |
| `npm run db:migrate -w api` | Create/apply migration (dev) |
| `npm run db:deploy -w api` | Apply migrations (prod/CI) |
| `npm run db:seed -w api` | Seed default tenant |
| `npm run db:reset -w api` | **Dev-only** reset + seed |
| `npm test -w api` | Acceptance tests (needs DB up) |
| `bash scripts/dev-db.sh {start\|stop\|reset\|psql}` | Local Postgres (no Docker) |

## Tests

`NODE_ENV=test npm test -w api` runs the acceptance suite (new/repeat/dedup/
double-click/concurrent/spam/rate-limit/retry/dead-letter/attribution/cross-
tenant/db-down/Cal.com signed+unsigned/SLA). Stop the worker first
(`pm2 stop inx-worker`) so it doesn't race the tests' own `processDueJobs`.
