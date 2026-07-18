# Innovatix OS — Current Code Status (Code‑Verified)

_Generated 2026‑07‑18 by auditing the actual codebase — schema, routes, migrations, tests, and git — **not** checkpoint notes. Where a checkpoint doc (`PHASE-3-CHECKPOINT.md`) disagrees with the code, the code wins (it is stale: it still calls S3/Stripe/AV "stubs" which are now real)._

- **Repo:** `/Users/sohailabutt/Desktop/innovatix-os`
- **Branch:** `feat/innovatix-platform-mvp`
- **Working tree:** **clean** (`git status --porcelain` empty — everything committed; `.pgdata/`, `apps/api/.filestore/` are gitignored)
- **Commits on branch:** 19 (all work lives on this one branch)
- **Tests:** **145 passing / 0 failing** (ran the suite live; see §9)

---

## 1. Monorepo — apps & packages

npm workspaces (`apps/*`, `packages/*`) + Turborepo. Local DB via `docker-compose.yml` (postgres:16). pm2 `ecosystem.config.js` runs 4 processes.

| Package | Name | Stack | Purpose |
|---|---|---|---|
| `apps/api` | `api` | **Fastify 5** + Prisma 6 + zod + jsonwebtoken + bcryptjs | Backend spine: lead pipeline + client‑delivery platform. Domains: `leads/ booking/ admin/ portal/ staff/ client/ billing/ invitations/ notifications/ email/ storage/ scanning/ jobs/ observability/`. Two entrypoints: API `src/main.ts`, background `src/worker.ts`. |
| `apps/platform-web` | `platform-web` | **Next.js 14** (App Router), :3001 | Authenticated app = **client portal + staff delivery workspace**. noindex. Auth is client‑side (backend 401 → redirect). |
| `apps/systems-web` | `systems-web` | **Next.js 14**, :4030 | Public **marketing website** (innovatixmarketing.com). SEO/QC build gate. |
| `packages/ui` | `@innovatix/ui` | React 18 TS (source‑exported) | Shared design system (Container, Section, Button, Card, Badge, Metric, CaseStudyCard, `cn`). |
| `packages/config` | `@innovatix/config` | config lib | Shared Tailwind preset + base tsconfig. |
| `packages/analytics` | `@innovatix/analytics` | React 18 TS | GA4/GTM event helpers with PII‑blocking allowlist. Used by systems‑web only. |

> README mentions `packages/sdk` and `packages/auth` — these **do not exist yet**.

---

## 2. Frontend — systems‑web (public marketing site)

Next.js 14 App Router, `src/app/`. No middleware, no auth — entirely public/static. Consumes `@innovatix/ui`, `@innovatix/analytics`, `@innovatix/config`.

| Route | Purpose | State |
|---|---|---|
| `/` | Homepage (hero, categories, proof, process, industries) | REAL |
| `/services` | Services index (8 capability areas) | REAL |
| `/services/[category]` | Category landing (live vs planned split) | REAL (8 categories) |
| `/services/[category]/[service]` | Service detail (from `SERVICE_PAGES` registry) | REAL — **13 published slugs**; others 404 |
| `/case-studies` + `/case-studies/[slug]` | Case study index + detail | REAL — but both studies `verified:false` → **noindex, metrics hidden** |
| `/company/process` | 6‑phase delivery process | REAL |
| `/contact` | Contact + `LeadForm` | REAL |
| `/book` | Consultation booking (`BookFlow`) | REAL |
| `/company`, `/solutions`, `/industries`, `/technologies`, `/resources` | — | **PLACEHOLDER** (`ComingSoon`, noindex) |
| `/privacy`, `/terms`, `/cookie-policy` | Legal | **PLACEHOLDER** (`ComingSoon`, noindex) |
| `/robots.ts`, `/sitemap.ts` | SEO — sitemap lists only indexable routes | REAL |
| `opengraph-image.tsx` / `twitter-image.tsx` (+ per‑route) | Dynamic OG cards | REAL |

**13 published service pages:** custom‑software‑development, enterprise‑software‑development, api‑development, systems‑integration, ai‑automation, ai‑agents, document‑intelligence, erp‑development, crm‑development, warehouse‑management‑systems, inventory‑management‑systems, order‑management‑systems, cloud‑architecture. ~48 more sub‑services are `planned:true` (intentional `ComingSoon`, no dead links).

---

## 3. Frontend — platform‑web (portal + delivery workspace)

Next.js 14, :3001, every page `'use client'`, root layout noindex. Auth = backend‑401 → client redirect (no middleware). All data live from API; **no mock/hardcoded data**.

**Client‑facing** (redirect → `/login`):

| Route | Purpose | State |
|---|---|---|
| `/` | Project overview (%complete, milestones, pending approval, latest report, activity, team) | REAL |
| `/milestones` | Milestone timeline | REAL |
| `/reports` | Daily/weekly reports | REAL |
| `/files` | Deliverables + downloads | REAL |
| `/invoices` + `/invoices/[id]` | Invoice list + detail (pay = OWNER‑gated) | REAL |
| `/pay/[id]` | Hosted payment page | **DEV STUB** (simulate checkout; prod uses provider hosted checkout) |
| `/messages` | Client↔team messaging + read receipts | REAL |
| `/team` | Delivery team roster | REAL |
| `/login` | Client sign‑in | REAL |
| `/setup-account` | Invite‑token account setup | REAL (token‑gated) |

**Staff‑facing** (redirect → `/admin/login`):

| Route | Purpose | State |
|---|---|---|
| `/admin` | Project list + create | REAL |
| `/admin/projects/[id]` | Delivery console — **9 tabs** (Overview, Milestones, Reports, Approvals, Messages, Team, Files, Invoices, Activity), RBAC‑gated writes | REAL (largest page, 382 lines) |
| `/admin/leads` | Lead inbox + convert‑to‑client | REAL |
| `/admin/login` | Staff sign‑in | REAL |

**Not built:** client **Settings**, staff **Notifications** + **Settings** (nav items flagged `soon:true`).

---

## 4. Backend API routes (grouped by module)

Everything mounts through `buildApp()` (`src/main.ts`); feature routes under `/v1`. Guards: **public** / **staff‑JWT** (`requireStaff`) / **client‑JWT** (`requireSession`) / **+RBAC** (permission action).

**Ops (root, no `/v1`):** `GET /health`, `GET /livez`, `GET /readyz` (503 if DB down), `GET /metrics` (Prometheus; gated by `METRICS_ENABLED`).

**Public intake:**
- `POST /v1/leads` — website lead capture (zod, 415 on non‑JSON, IP‑hash rate limit, honeypot/spam scoring; 202 non‑revealing)
- `POST /v1/booking/calcom-webhook` — Cal.com webhook (HMAC‑SHA256 verified)
- `POST /v1/webhooks/payments` — generic/stub provider (HMAC)
- `POST /v1/webhooks/stripe` — Stripe authoritative (Stripe‑Signature verified, replay‑guarded)
- `GET /v1/auth/invitations/:token`, `POST /v1/auth/invitations/:token/accept` — invite inspect + password set (rate‑limited, token kept out of logs)
- `GET /v1/dev/outbox` — dev email viewer (**hard‑disabled in production**)

**Client portal (`/v1/portal/*`, client‑JWT + org‑scoped):** `auth/login`, `auth/logout`, `me`, `overview`, `projects/:id`, `project`, `messages` (+RBAC `message:send`), `messages/read`, `invoices/:id`, `invoices/:id/pdf`, `invoices/:id/pay-demo` (+`invoice:pay`, prod‑disabled), `invoices/:id/checkout` (+`invoice:pay`/OWNER), `files/:id/download` (clientVisible+AVAILABLE only), `approvals/:id/decide` (+`approval:decide`/OWNER), `notifications` (+ read / read‑all), `client-users` GET/POST/PATCH (+`client-user:*`/OWNER, self‑lockout blocked), `invoices/:id/billing-contact` (+`billing:manage`/OWNER).

**Staff/admin (`/v1/admin/*`, staff‑JWT + tenant‑scoped, mostly RBAC):** `auth/login`+`logout`, `me`, `staff`, `clients`; projects `GET/POST/GET:id/PATCH:id` (+`project:view`/`project:write`); `milestones` POST/PATCH (+`milestone:write`); `reports` POST (+`report:publish`); `approvals` POST (+`approval:create`); `messages` POST/read (+`message:reply`); `invoices` POST/PATCH/GET/pdf/`payment-link` (+`invoice:write`/`project:view`); client‑users + client‑invitations issue/resend/revoke/list (+`team:assign`); members POST/DELETE (+`team:assign`); files POST/versions/scan/download/DELETE (+`file:write`/`project:view`); `leads` GET + `leads/:id/convert` (+`lead:convert`); staff notifications + read.

_(~70 routes total; full per‑route table available in the audit transcript.)_

---

## 5. Prisma — models & migrations

Schema: `apps/api/prisma/schema.prisma`. **~30 models, 33 enums, 11 migrations.** Header documents multi‑tenant design, dedup identity `(tenantId, normalizedEmail)`, durable outbox, salted‑hash IP privacy.

**Models by domain:**
- **Tenancy:** `Tenant`
- **CRM/leads:** `Lead`, `LeadInquiry`, `LeadAttribution`, `LeadActivity`, `AuditEvent`, `Assignment`, `SlaTimer`, `Meeting`
- **Infra/side‑effects:** `SideEffectJob` (outbox+DLQ), `EmailOutbox`, `RateLimitCounter`
- **Client/tenancy:** `ClientOrg`, `ClientUser`, `ClientInvitation`
- **Delivery:** `Project`, `Milestone`, `ProjectReport`, `Approval`, `ProjectMember`, `PortalActivity`
- **Files:** `ProjectFile` (versioning + FileState machine), `FileScan`
- **Billing:** `Invoice`, `InvoiceLineItem`, `Payment`, `ProcessedWebhookEvent`
- **Messaging/notify/staff:** `PortalMessage`, `StaffUser`, `Notification`

**Migrations (chronological):** `init_lead_pipeline` → `client_portal` → `phase3_delivery` → `portal_invite_email` → `notification_email` → `file_versioning` → `add_client_invitations` → `add_payments_and_webhook_ledger` → `add_file_state_machine` → `add_file_scans` → `add_tenant_scoped_indexes`. **No schema drift** vs `schema.prisma`.

**Schema caveats (by design, but worth knowing):** `StaffUser` has **zero Prisma relations** — every staff link (`assigneeId`, `requestedByStaffId`, `uploadedByStaffId`, `authorStaffId`, `ProjectMember.staffUserId`, etc.) is an **unenforced bare string** (no DB FK). `Notification.projectId`, `InvoiceLineItem.milestoneId`, most `*StaffId` are bare strings too. `ProcessedWebhookEvent` is the only table without `tenantId`. `ProjectFile.scanStatus` is legacy alongside the newer `state`/`FileScan`.

---

## 6. Business workflows — completeness (schema + code verified)

| Workflow | Status |
|---|---|
| Website lead capture | ✅ COMPLETE (public route + inquiry/attribution/rate‑limit/outbox, tested) |
| CRM intake | ✅ COMPLETE (dedup lead, activities, assignment, SLA timer, meeting) |
| Lead → client conversion | ✅ COMPLETE (`/admin/leads/:id/convert`; `leadId` links are optional bare strings) |
| Client onboarding | ✅ COMPLETE (hashed single‑use invitation → password setup, no temp passwords) |
| Project creation | ✅ COMPLETE |
| Milestones | ✅ COMPLETE |
| Reports (daily/weekly) | ✅ COMPLETE |
| Files | ✅ COMPLETE (versioning + upload→scan→AVAILABLE state machine, clientVisible gating) |
| Approvals | ✅ COMPLETE (one‑shot decide, OWNER‑gated; approver identity is a bare string) |
| Messages | ✅ COMPLETE (client/team, internal flag, read receipts) |
| Invoices | ✅ COMPLETE (line items, status transitions, PDF) |
| Payments | ⚠️ MOSTLY — **client checkout = real Stripe**; **admin "payment‑link" = stub** (see §8/§10) |
| Notifications | ✅ COMPLETE (in‑app + email; no per‑user preference model) |
| Support / tickets | ❌ **MISSING** — no ticket/support model; only per‑project messaging |

---

## 7. Auth, RBAC & security controls

**Two separate trust domains, distinct cookies AND distinct signing secrets** (prod‑enforced to differ): staff `inx_staff` / `STAFF_JWT_SECRET`; client `inx_portal` / `PORTAL_JWT_SECRET`. Both httpOnly, sameSite lax, secure in prod, 7‑day TTL, accept cookie or Bearer.

- **Staff RBAC** (`staff/rbac.ts`): roles `ADMIN`, `DELIVERY_LEAD`, `ENGINEER`, `VIEWER` × 10 actions; `requireStaff` re‑loads the StaffUser from DB and requires `active:true` every call. (ADMIN and DELIVERY_LEAD currently have identical full sets.)
- **Client RBAC** (`client/rbac.ts`+`authz.ts`): `OWNER`/`MEMBER`; role resolved **fresh from DB** per request (forged token role ignored; removed user → 401).
- **Production secret fail‑fast** (`config-validation.ts`): prod boot aborts unless all secrets present, ≥32 chars, non‑default, staff≠client, plus provider‑conditional keys (Stripe/S3/Postmark/ClamAV). `process.exit(1)`; never prints values.
- **Tenant isolation** (`tenant.ts`, `lib/scoped.ts`): `tenantId` (+`clientOrgId` for clients) folded into every query; guards reject tokens whose tenant ≠ resolved. Single‑tenant‑by‑config today; **no PG RLS** (future hook).
- **Rate limiting** (`lib/ratelimit.ts`): DB sliding window on salted IP hash — leads, both logins, invitation routes.
- **Input validation**: zod `safeParse` + `sanitize.ts` everywhere; 32KB body cap; multipart 1 file ≤ `MAX_FILE_BYTES`.
- **File‑scan gating**: fail‑closed upload→scan pipeline; downloads require `AVAILABLE`; MIME allowlist + magic‑byte sniff + dangerous‑extension block.
- **Webhook signatures**: Stripe HMAC over `t.rawBody` + 5‑min replay window (`timingSafeEqual`); Cal.com + stub webhooks HMAC too.
- **Also**: helmet, CORS allowlist + credentials, bcrypt password hashing + strong policy, generic non‑revealing auth errors, log redaction, correlation IDs, auth‑failure brute‑force alert.

---

## 8. External integrations

| Integration | Status | Notes |
|---|---|---|
| Stripe — **client checkout** | ✅ REAL | Real Checkout Session + refunds + signature verify (`billing/gateway.ts`, `PAYMENTS_PROVIDER=stripe`) |
| Stripe — **admin payment‑link** | ❌ **STUB‑LOCKED** | `billing/index.ts:12` hardcodes `StubPaymentProvider`, ignores config → staff‑generated links are fake even in prod |
| S3 / object storage | ✅ REAL | Hand‑rolled SigV4, AWS/R2/MinIO (`STORAGE_PROVIDER=s3`; dev default local) |
| ClamAV malware scan | ✅ REAL | clamd INSTREAM, fail‑closed (`MALWARE_SCANNER_PROVIDER=clamav`; dev default stub) |
| Email | ✅ REAL | Postmark SDK (`EMAIL_TRANSPORT=postmark`; dev default DB outbox) |
| Cal.com booking | ✅ REAL | HMAC webhook + booking→lead link |
| Analytics (GA4/GTM) | ✅ REAL | PII‑blocking allowlist; systems‑web |
| PDF | ✅ REAL (minimal) | Zero‑dep hand‑assembled PDF; labeled for later real templating |
| SMS / Twilio / SendGrid / Sentry / Datadog | ❌ NOT PRESENT | Comment‑only future channel; marketing copy only |

Prod config‑validation forces real keys when a real provider is selected.

---

## 9. Tests (exact, ran live)

`npm test` (apps/api) against live Postgres, `prisma migrate deploy` succeeded, **exit 0**:

| Category | Files | Tests | Pass | Fail |
|---|---|---|---|---|
| Unit | 6 | 35 | 35 | 0 |
| Integration | 11 | 109 | 109 | 0 |
| E2E | 1 | 1 | 1 | 0 |
| **Total** | **18** | **145** | **145** | **0** |

Zero skipped/todo. The `prisma:error` lines in output are **intentional** (`assert.rejects` proving idempotency/replay guards). **Frontends and packages have ZERO tests.** CI (`.github/workflows/ci.yml`) runs migrate → typecheck → unit → integration → e2e → build on push/PR.

---

## 10. Production hardening — present vs gaps

**Real (code):** health/livez/readyz probes; correlation IDs; structured pino logging + redaction; dependency‑free Prometheus metrics + `/metrics`; alert hooks firing on dead‑job / payment‑fail / scan‑fail‑&‑quarantine / auth brute‑force (`ALERT_WEBHOOK_URL`); config fail‑fast; CI.

**Gaps:**
1. **Backups/DR = DOC‑ONLY** — `docs/BACKUP-DR.md` has procedures but **no executable backup/restore script** exists in `scripts/`.
2. **`/metrics` unauthenticated at app layer** — relies on nginx/network fencing; leaks queue/scan counts if not fenced.
3. **Single‑tenant by config** — abstraction present, no PG RLS.
4. **Client audit events mis‑attributed** — `ActorType` has no `CLIENT`, so client actions log as `ADMIN`.
5. **No runtime deployment yet** — pm2/docker config exists; nothing is actually deployed/hosted.

---

## 11. Known stubs / placeholders / blockers

**Genuine blockers:**
- **`billing/index.ts:12`** admin payment‑link → always `StubPaymentProvider` (real Stripe not wired for this path).
- **Backups/DR** is doc‑only (no script) — no automated recovery.

**Intentional dev‑default stubs (real impl behind provider boundary):** `StubGateway`, `StubScanner`, `LocalStorage`, `OutboxTransport`, minimal PDF renderer, `portal .../pay-demo` (prod‑disabled), `platform-web /pay/[id]` (dev simulate).

**Not‑yet‑built product boundaries:** client‑user deactivation (needs `ClientUser.active`); client self‑serve teammate invite UI; billing‑contact picker dropdown data; SMS channel; **support/ticketing (no model)**; portal **Settings** + staff **Notifications/Settings** screens.

**Marketing site:** 8 `ComingSoon` pages (company/solutions/industries/technologies/resources + privacy/terms/cookie), ~48 `planned` sub‑services, both case studies unverified (noindex).

**Markers:** zero `TODO/FIXME/HACK` and zero `throw new Error('not implemented')` in source.

---

## 12. Git — commits (feature map)

Branch `feat/innovatix-platform-mvp`, 19 commits, tree clean. Newest→oldest:

`b222f53` prod‑readiness (observability/probes/backup‑DR docs/staging) · `3dd63c6` + `3dba6bd` tenant‑isolation + cross‑tenant tests (near‑duplicate pair) · `6e78cbd` real ClamAV + durable scan jobs · `1528419` real S3 + file state machine · `0a28c87` real Stripe (webhook‑authoritative) · `016cec2` secure invitation + password setup · `53d6c56` categorized test system + CI · `287d104` client‑portal RBAC · `476ffb4` secret fail‑fast + separate JWT secrets · `a813d49` docs/handoff · `6bc3502` Fastify lead‑pipeline + delivery backend · `361df96` monorepo tooling + shared packages · `0ceb176` systems‑web (SEO/QC‑gated) · `2e9c58b` platform‑web (portal + delivery workspace) · `32ba6c9` Prisma schema + 6 migrations + seed · `71740bc` gitignore · `6573ef7` docs · `d5ae934` scaffold monorepo.

---

## 13. Honest completion %

| Area | % | Basis |
|---|---|---|
| **Systems website** | **75%** | Core marketing + 13 service pages + contact/book real; 8 ComingSoon (incl. legal), case studies unverified, ~48 planned sub‑pages |
| **Client portal** | **90%** | All screens real; pay page dev‑stub; Settings pending |
| **Staff Delivery OS** | **90%** | 9‑tab console + leads + create real; Notifications/Settings pending |
| **Backend / API** | **90%** | ~70 routes, full auth/RBAC/security/integrations, 145 tests; admin payment‑link stub the only functional gap |
| **Sales lifecycle** | **90%** | Capture → CRM → convert → onboard, all real + tested |
| **Project delivery lifecycle** | **85%** | Project→…→invoice→(client)payment real; admin‑link stub; no support/ticketing |
| **Production readiness** | **70%** | Probes/observability/alerts/CI real; backups doc‑only, /metrics unfenced, no deploy, single‑tenant |
| **Entire V1** | **~80%** | Built + tested + committed; not deployed; a few stubs + no DR script |

---

## 14. Prioritized remaining work (recommended order)

1. **Wire admin payment‑link to real Stripe** (`billing/index.ts:12`) — otherwise staff‑sent payment links are fake in prod.
2. **Executable backup + restore script** (make DR real, not a doc) + schedule it.
3. **Fence `/metrics`** (proxy allowlist or add a bearer token).
4. **Fix client audit attribution** — add `ActorType.CLIENT` (enum migration) so client actions aren't logged as ADMIN.
5. **Legal pages** — fill `/privacy`, `/terms`, `/cookie-policy` (needed to launch publicly) + verify ≥1 case study.
6. **Deploy V1** — provision infra, set all prod provider keys, `migrate deploy`, smoke‑test the full lifecycle in staging.
7. **Post‑V1:** client‑user deactivation (`ClientUser.active`), portal Settings + staff Notifications/Settings screens, self‑serve teammate invites, SMS channel, support/ticketing model, frontend tests, PG RLS for true multi‑tenant.

---

## 15. Direct answers

**What can I use today?**
The **entire lead‑to‑delivery lifecycle**, end‑to‑end, in dev/staging: capture a website lead → CRM with SLA/booking → convert to client + project → invite client (secure token) → run milestones/reports/approvals/messages → upload virus‑scanned versioned files → issue invoices → client pays via **real Stripe checkout** → in‑app + email notifications. Both frontends work; auth/RBAC works; real S3, ClamAV, Postmark, Cal.com; **145 tests green**.

**What still does not work?**
Staff‑generated **payment links** (stub, not real Stripe); **support/ticketing** (no model); **client‑user deactivation**; **SMS**; portal **Settings** and staff **Notifications/Settings** screens; 8 marketing **ComingSoon** pages (incl. legal) + unverified case studies.

**What would break if we deployed today?**
- Staff‑sent payment links wouldn't actually charge (stub) even with Stripe configured.
- `/metrics` would leak internal queue/scan counts unless fenced at the proxy.
- **No automated backups/restore** — a data‑loss event has no recovery path yet.
- Client actions would be **mis‑logged as ADMIN** in the audit trail.
- It's **single‑tenant** — fine for launch with one client, not true multi‑tenant.
- Frontends have **no tests** and rely on client‑side redirect for gating (data is still protected server‑side, so not a data leak).

**Shortest path to a launchable V1:**
Items **1–6** in §14: wire real Stripe for admin links → add a backup/restore script → fence `/metrics` → fix client audit `ActorType` → fill 3 legal pages + verify a case study → deploy to staging and smoke‑test the full lifecycle with production provider keys. Everything else (§14 item 7) is post‑V1 polish. Estimated as a small, well‑scoped push — the platform is built and green; this is hardening + one integration fix + deployment, not new feature construction.
