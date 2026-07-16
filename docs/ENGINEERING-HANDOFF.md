# Innovatix Platform — Master Engineering Handoff

> Audience: a senior engineer taking over with **no prior context**. Technical assessment, not a
> sales summary. Where something is fragile, stubbed, or should be redesigned, it says so. Every
> claim verified against code via six parallel audits (docs, systems-web, platform-web, api,
> database, security/testing). `typecheck` + `build` executed — both PASS; test runner executed — broken (see §11).
>
> Repo: `~/Desktop/innovatix-os` · monorepo (npm workspaces + Turborepo) · branch `main` · audited 2026-07-16.
> Corrections vs the earlier same-day draft: **6** migrations (not 5), **26** enums (not 24), **13** published service pages (not 14).

---

## 🔴 READ THIS FIRST — the project is not committed to git

`git HEAD` is `d5ae934` (F1 scaffold only). Everything built since — the entire backend, client
portal, staff Delivery OS, and **all 6 Prisma migrations** — is **uncommitted working-tree state**:
`apps/api/src` = 1 tracked / 18 uncommitted; `apps/api/prisma/migrations/` = **untracked (`??`)**;
~101 total dirty paths. **One `git checkout .` / `git clean -fd` / disk failure destroys the platform.**
Priority Zero: branch, commit everything, push to a remote.

---

## 1. Executive Summary

An impressively complete, well-architected MVP by one disciplined author — happy paths work
end-to-end — that is **not committed, not deployed, tested only by one broken suite, with several
production-blocking stubs and default-secret gaps.**

| Track | Built | Prod-ready |
|---|---|---|
| Marketing website (`systems-web`) | ~65% | ~55% |
| Client Portal + Delivery OS (`platform-web` + `api`) | ~65% | ~40% |
| Database schema | ~80% | ~65% |
| Full vision (proposals/contracts/e-sign/discovery/support) | ~35% | — |
| **Overall → launchable MVP** | **~55%** | **~40%** |

**Phase:** post–"Phase 3/4" feature build; pre-commit, pre-deploy, pre-hardening. The Master Plan
tracker (says 0–5%) is stale — trust the code.

**Fully complete (works locally):** monorepo tooling (typecheck+build PASS, CI runs them); public lead
pipeline (intake→spam/honeypot→rate-limit→dedup/idempotency→attribution→outbox worker→ack/assignment/SLA
jobs→Cal.com webhook); marketing core (home, 8 categories, 13 published service pages, process, contact,
book; strong SEO infra); client portal + staff Delivery OS (9-tab cockpit, lead→client conversion,
milestones/reports/approvals/messaging/files/invoices/team); real security primitives (two JWT realms,
server-side staff RBAC, audit logging, webhook HMAC, rate limiting, idempotency, sanitization).

**Partially complete:** website content depth (13/62 service pages; legal + nav stubs); billing (invoice
lifecycle real, **payments = stub, no Stripe**); files (local FS works, **S3 throws**, AV = EICAR
placeholder); multi-tenancy (columns everywhere, single tenant in practice, no RLS); auth hardening
(**dev-default secrets can reach prod**, portal has no SSR guard).

**Biggest remaining milestones:** (1) commit+push+deploy; (2) real payments/storage/AV/PDF; (3) secret
fail-fast + client-role enforcement + tenant-isolation hardening; (4) tests over authz/billing/portal;
(5) launch content (legal, nav, case-study verification).

---

## 2. Repository Structure

```
innovatix-os/
├─ apps/
│  ├─ systems-web/     # Public marketing site. Next.js 14 App Router, SSG/ISR, SEO-first, no auth.
│  ├─ platform-web/    # Client portal + staff Delivery OS. Next.js 14, 100% client components.
│  └─ api/             # Backend. Fastify 5 + Prisma 6 + PostgreSQL + Zod. main.ts (HTTP) + worker.ts (jobs).
├─ packages/
│  ├─ ui/              # Shared React design-system primitives.
│  ├─ config/          # Shared Tailwind/tsconfig/eslint config.
│  └─ analytics/       # @innovatix/analytics — GA4/dataLayer event wrapper.
├─ docs/               # Planning + this handoff.
├─ scripts/            # Repo utilities.
├─ ecosystem.config.js # PM2: inx-api, inx-worker, inx-portal, inx-web.
├─ docker-compose.yml  # Local Postgres.
├─ turbo.json          # Turborepo task graph.
└─ package.json        # npm workspaces; scripts delegate to turbo.
```

- `apps/api` — only backend; `main.ts` HTTP (`:4040`, routes under `/v1`), `worker.ts` DB-polling jobs;
  single `prisma/schema.prisma`.
- `apps/systems-web` — public, CDN-friendly; content data-driven from `src/lib/*` registries (`nav.ts`,
  `services.ts`, `case-studies.ts`).
- `apps/platform-web` — pure frontend (no Next API routes/server actions); data via `fetch` + cookie auth.
- `packages/*` — shared libs; `ui`/`config` are build-time deps of both web apps.

---

## 3. Systems Website (`apps/systems-web`)

Next.js 14 App Router. Registries: `nav.ts` (8 cats, 62 items), `services.ts` (13 pages), `case-studies.ts` (2).

| Route | Status | SEO | JSON-LD |
|---|---|---|---|
| `/` | Complete | index; no per-page metadata (layout default) | Organization |
| `/services` | Complete | index, canonical, OG | BreadcrumbList |
| `/services/[category]` | Complete (8) | index, canonical, OG | BreadcrumbList |
| `/services/[category]/[service]` | Complete (**13**) | title/desc/canonical, QC-gated index | Service+Breadcrumb+FAQ |
| `/case-studies` | Complete | index, canonical | BreadcrumbList |
| `/case-studies/[slug]` | Renders; unverified content | **noindex until verified** (both false) | BreadcrumbList |
| `/company/process` | Complete | index, canonical, OG | BreadcrumbList |
| `/contact` | Complete | index, canonical, OG | BreadcrumbList |
| `/book` | Complete | index, canonical, OG | BreadcrumbList |
| `/company`,`/industries`,`/solutions`,`/technologies`,`/resources` | **Stub (ComingSoon)** | noindex | — |
| `/privacy`,`/terms`,`/cookie-policy` | **Stub** (but linked from consent+footer) | noindex | — |

13 published pages: Software Eng (custom-software-development, enterprise-software-development, api-development,
systems-integration); AI (ai-automation, ai-agents, document-intelligence); Enterprise (erp/crm-development,
warehouse/inventory/order-management-systems); Cloud (cloud-architecture).

- **SEO: strong.** Dynamic `sitemap.ts` (indexable-only), `robots.ts`, central `pageMetadata()`;
  `NEXT_PUBLIC_SITE_URL` **hard-enforced** (`site.ts` fails prod build on missing/non-https/localhost);
  www→apex + HSTS/CSP headers; two prebuild QC gates fail the build on incomplete pages, dup titles,
  placeholder text, or unverified case-study metrics. Gaps: home lacks metadata; no `keywords`; CSP allows
  `'unsafe-inline'`; hardcoded sitemap `lastModified`.
- **Structured data:** Organization (site-wide) + Service/Breadcrumb/FAQPage (service pages).
- **Mobile:** responsive (Tailwind breakpoints + drawer nav); Cal.com iframe fixed `h-[640px]`.
- **Remaining:** legal (3), nav stubs (5), **~49 planned service pages** (Cloud-beyond-architecture, Data,
  Security, Digital Transformation, Team Services = 0 built), case-study verification.

---

## 4. Platform / Delivery OS (`platform-web`)

Next.js 14, **100% client components**, **no `middleware.ts`**, data via cookie-auth `fetch`.

| Module | Side | Status | What it does |
|---|---|---|---|
| Login (`/login`, `/admin/login`) | Both | Complete | Separate client/staff forms |
| Overview (`/`) | Client | Complete | Header, %, tiles, inline approval action, timeline, activity, report, team |
| Projects list (`/admin`) | Staff | Complete | List + inline create |
| Project cockpit (`/admin/projects/[id]`) | Staff | Complete | 9 tabs; drives most staff writes |
| Milestones / Reports / Files / Messages / Approvals / Invoices / Team | Both | Complete | Client read/act; staff CRUD (files=versioning, messages=internal notes) |
| Payments (`/pay/[id]`) | Client | **Partial (demo)** | Simulated checkout → `pay-demo` |
| Notifications (bell) | Both | Complete | 30s poll; standalone nav item = stub |
| Leads→client (`/admin/leads`) | Staff | Complete | Convert (**leaks dev temp password in UI**) |
| Settings | Both | **Not started** | "Available soon" |

Real app, no mock data, consistent loading/empty states. **Weak spots:** thin error handling (one `alert()`),
**no SSR/edge route guard** (fetch `/me` in `useEffect` → 401 redirect; unauth users briefly render shell),
leaked dev password, admin project page fully `any`-typed.

---

## 5. Backend (`apps/api`)

**Fastify 5 + Prisma 6 + PostgreSQL + Zod.** `main.ts` = HTTP `:4040` (`/v1` prefix); `worker.ts` = DB-poll jobs.
Wiring: helmet (CSP off), CORS allowlist+credentials, cookie, multipart (1 file), 32KB body cap, trustProxy,
raw-body capture for HMAC, redacted logging, DB boot gate, graceful shutdown. ~55 endpoints.

Auth legend: public · client-JWT (`inx_portal`) · staff-JWT (`inx_staff`) · staff+role (RBAC).

**Public/webhooks:** `GET /health`; `POST /v1/leads` (public); `POST /v1/booking/calcom-webhook` (HMAC);
`POST /v1/webhooks/payments` (HMAC, stub provider); `GET /v1/dev/outbox` (dev).

**Client portal** (client-JWT, org-scoped): `auth/login`,`logout`; `GET me/overview/project/projects/:id/
invoices/:id/invoices/:id/pdf(stub)/files/:id/download/notifications`; `POST messages/messages/read/
invoices/:id/pay-demo(stub)/approvals/:id/decide(one-shot)/notifications read`. All ✅.

**Staff/Delivery OS** (staff+role): auth; `staff`/`clients` pickers; projects `GET/POST/GET:id/PATCH:id`;
milestones create/patch; reports; approvals; messages(+read); members create/delete; client-users list/invite/
patch-role; invoices create/get/patch/payment-link(stub)/pdf(stub); files upload+version/versions/download/
delete; leads list + `:id/convert`; notifications. Each gated by RBAC action. All ✅ (happy-path).

**Services (real):** intakeLead; booking; convertLead (idempotent lead→org+user+project+5 milestones+invite);
inviteClientUser; notifications (+email mirror; SMS future); email + 8 templates; markInvoicePaid (idempotent);
invoice/approval enrichers; local storage; spam; rate-limit; business-hours SLA calc; crypto; sanitize;
tenant resolver; Prisma singleton.
**Stubs (prod-blocking):** payments (StubPaymentProvider only, no Stripe); S3StorageStub (throws); scanFile
(EICAR/magic-byte only); renderInvoicePdf (hand-rolled minimal); email OutboxTransport in dev (Postmark coded, needs token).

**Worker:** durable DB-table poller (no Redis), 2s interval, atomic claim, exponential backoff → dead-letter
(6 attempts), purges rate-limits. Jobs: ACK_EMAIL, INTERNAL_NOTIFY, ASSIGNMENT, SLA_TIMER, BOOKING_CONFIRM,
ASSIGNMENT_NOTIFY (no-op). **Gap: `SLA_WARNING` has a handler+template but NO producer — SLA timers are
created but never swept for breach. No scheduler/cron infra exists at all.**

---

## 6. Database

PostgreSQL/Prisma; single schema; **26 models, 26 enums, 6 migrations** (in sync). Layers: lead-pipeline
(real Tenant FKs), portal (tenantId string, no FK), staff/notifications.

Object graph is a **star, not a chain**: Reports/Files/Messages/Approvals/Invoices are **direct children of
Project**. Real nesting only Project→Milestone→Approval and Invoice→InvoiceLineItem. `Lead→Project` link is a
soft `leadId` string (no FK). **No `Payment` model** — payments = `Invoice.status=PAID` + `paidAt`/`paymentUrl`/`pdfKey`.

- **Indexes/constraints:** tenant-prefixed composite uniques on pipeline; `side_effect_jobs.idempotencyKey` unique;
  cascades `RESTRICT` (nullable soft-parents `SET NULL`); **no `ON DELETE CASCADE`**. **Missing:** `approvals.milestoneId`
  (FK unindexed — perf gap), **9 portal tables lack `tenantId` index**, `notifications.projectId` unindexed.
- **Migrations (6):** init_lead_pipeline → client_portal → phase3_delivery → portal_invite_email →
  notification_email → file_versioning. ⚠️ **untracked in git.**
- **Isolation:** every table HAS `tenantId`, but only the **12 pipeline tables enforce it with a real FK**;
  the **14 portal/staff/notification tables use a bare `tenantId` string (no FK)** — DB can't block cross-tenant
  writes; isolation is app-layer `where` only. No RLS.

---

## 7. Authentication & Authorization

Two fully separate realms (client token ≠ staff token):

| | Client | Staff |
|---|---|---|
| File | `src/portal/auth.ts` | `src/staff/auth.ts` |
| User | ClientUser (org-scoped) | StaffUser |
| Cookie | `inx_portal` | `inx_staff` |
| Secret | `PORTAL_JWT_SECRET` | `PORTAL_JWT_SECRET + ':staff'` |
| TTL | 7d | 7d |

JWT HS256 (`jsonwebtoken`), bearer fallback; cookies httpOnly + sameSite:lax + secure(prod) + signed; passwords
**bcryptjs** (hash 10). Guards are Fastify inline funcs: `requireSession` (verify+tenant), `requireStaff(action)`
(verify+tenant+active+RBAC). **RBAC** `src/staff/rbac.ts` static matrix (ADMIN/DELIVERY_LEAD=all, ENGINEER=limited,
VIEWER=view) enforced server-side (403). **Client authorization = org-scoping, not roles** — `ClientUserRole`
(OWNER/MEMBER) exists but is **not enforced** anywhere. Frontend has **no SSR guard** (reactive 401 redirect).

---

## 8. Complete Business Workflow (implemented vs remaining)

| Step | Status |
|---|---|
| Visitor → Lead (form/spam/dedup/attribution/ack) | ✅ |
| → Booking (Cal.com) | ✅ |
| → Opportunity/qualification | 🟡 (status+Assignment exist; no sales pipeline UI) |
| → Proposal/Contract/e-sign/deposit | ❌ Not built |
| → Client Org / Client User (invite/login) | ✅ (`convertLead`) |
| → Project auto-provision (+5 milestones) | ✅ |
| → Milestones / Reports / Files / Messages / Approvals / Invoices | ✅ |
| → Payments | 🟡 **demo only (stub, no Stripe)** |
| → Project Completion | 🟡 (`COMPLETE` status; no close-out flow) |
| → Support | ❌ Not built |

Middle of the lifecycle (convert→deliver→approve→invoice) is genuinely built; the front (proposal/contract/
e-sign/deposit) and back (real payment capture, support) are missing or stubbed.

---

## 9. System Architecture

- `systems-web` (public, Vercel/CDN) and `platform-web` (authed, client-only) **never touch Postgres or each
  other** — only the `api` over HTTP (cookies).
- `api` (Fastify :4040 `/v1`) owns Prisma/Postgres; routes = portal + admin + webhooks, with Zod + RBAC + audit.
- `worker` shares the same DB and drains the `SideEffectJob` outbox table (DB *is* the queue; no Redis) →
  email transport (Postmark/outbox). No message bus, no sockets (polling by design).
- `packages/{ui,config}` = build-time deps of both web apps; `packages/analytics` = GA4 events in systems-web.
- **PM2** runs 4 procs (inx-api, inx-worker, inx-portal, inx-web) — ⚠ currently in dev/tsx mode, not compiled `dist/`.

---

## 10. Security

| Control | Status | Note |
|---|---|---|
| Tenant/org isolation (IDOR) | ✅ app-layer | queries scoped by tenantId+clientOrgId; single-tenant in practice; no RLS |
| RBAC (staff) | ✅ server-side | requireStaff(action)→403 |
| RBAC (client OWNER/MEMBER) | ❌ not enforced | any org user can approve deliverables & pay |
| Audit logging | ✅ | AuditEvent on all sensitive mutations |
| File authorization | ✅ | authorized endpoints; org+visible+current+not-deleted scoped |
| Signed/expiring downloads | ✅ (S3 path)/local stream | 300s signed URL; non-guessable keys; path-traversal guard; **S3 stub** |
| Webhook verification | ✅ | HMAC-SHA256 raw body, constant-time (payments+Cal.com) |
| Idempotency | ✅ | lead key unique; job keys; markInvoicePaid idempotent |
| Replay protection | 🟡 | idempotent end-state only, no event-id ledger |
| Rate limiting | ✅ | DB fixed-window on salted IP hash (leads + logins) |
| Spam protection | ✅ no CAPTCHA | honeypot + timing + heuristics |
| Input validation | ✅ | Zod per-route; 32KB cap |
| XSS / sanitization | ✅ | sanitize.ts + React escape; only dev-controlled JSON-LD uses dangerouslySetInnerHTML |
| Secret handling | 🟡 **gap** | dev-default JWT/webhook/salt secrets, **no prod fail-fast** → forgeable tokens/webhooks |
| CORS / CSP | ✅ / ❌ | strict CORS; **CSP disabled** on api |

**Top gaps:** (1) default secrets can reach prod — add boot fail-fast; (2) client roles unenforced; (3) app-layer-only
isolation (one missing `where` = cross-org leak) — add FK/RLS; (4) no CSP; (5) webhook replay not deduped; (6) S3/AV stubbed.

---

## 11. Testing

- One test file: `apps/api/test/leads.test.ts` (19 tests via `node:test`/`tsx --test`). **Zero tests** for portal,
  admin/RBAC, billing/webhook, file authz — the security-critical surface is untested.
- **`npm test` is broken** (`**` glob not expanded under `sh -c` → never runs). Run directly: **13 pass / 6 fail**
  (all 6 = shared-DB rate-limiter bleed = test-isolation defect, not a product bug) — the only suite is red.
- **CI** (`.github/workflows/ci.yml`): `npm ci → typecheck → build` on Node 20; does **not** run tests.
- **Executed this audit:** `npm run typecheck` → **PASS** (5/5, 0 errors); `npm run build` → **PASS** (3/3, ~20s).
- Verdict: compilation/build green + CI-guarded; automated behavioral/security coverage effectively nonexistent.

---

## 12. Production Readiness

**Ready now:** 13 published marketing pages (QC-gated, SEO-enforced, responsive); lead pipeline; auth realms +
staff RBAC + audit + rate limiting + webhook HMAC + sanitization + idempotency; typecheck/build/CI.

**Blocks prod:** (1) not committed/pushed/deployed; (2) default secrets no prod guard; (3) payments stub (no Stripe);
(4) S3 + AV stubs; (5) client role unenforced + app-layer-only isolation; (6) no authz/billing/portal tests; (7) PM2
runs dev tsx not `dist/`; (8) legal pages stubbed but linked; (9) no SSR guard + leaked dev password.

**Nice-to-have post-launch:** SLA-breach sweeper; remaining service/nav/blog pages; CSP; enum-ify status columns;
missing indexes; real PDF templating; client self-serve invites + deactivation; SMS.

---

## 13. Remaining Work

| # | Feature | Priority | Complexity | Depends | Order |
|---|---|---|---|---|---|
| 1 | Commit + push to remote | Critical | Trivial | — | 1 |
| 2 | Fail-fast on default secrets (prod) | Critical | Low | — | 2 |
| 3 | Deploy pipeline (Vercel + host + managed Postgres + migrations + `dist/` build) | Critical | Med | 1 | 3 |
| 4 | Real payments (Stripe checkout + webhook sig) | Critical | Med | 3 | 4 |
| 5 | Real file storage (S3) + real AV scan | High | Med | 3 | 5 |
| 6 | Enforce client OWNER/MEMBER roles | High | Low | — | 6 |
| 7 | Tenant isolation hardening (FK/RLS on portal tables) | High | Med–High | migration | 7 |
| 8 | Test suite: fix glob + isolation; cover authz/billing/portal | High | Med | — | parallel |
| 9 | Legal pages (privacy/terms/cookie) | High(launch) | Low | — | parallel |
| 10 | SSR/edge auth guard; remove leaked temp password | Med | Low | — | 8 |
| 11 | SLA-breach sweeper + scheduler | Med | Low | — | 9 |
| 12 | Production invoice PDF | Med | Low | 3 | 10 |
| 13 | Website content: nav stubs, blog, service pages, case-study verification | Med | Med | — | parallel |
| 14 | CSP; missing indexes; enum-ify status | Low | Low | — | later |
| 15 | Proposal/contract/e-sign/deposit + support-lite | Med(biz) | High | 3,4 | later |

---

## 14. Timeline (1 experienced senior engineer, full-time)

- **To MVP** (committed, deployed, real payments+storage, secrets hardened, client roles, legal pages, smoke-tested):
  **≈ 3–4 weeks.**
- **To production** (+ isolation/RLS, real authz/billing tests, SSR guards, PDF, SLA sweeper, CSP, Sentry, consent):
  **≈ 6–9 weeks.**
- **To V1.0** (+ proposals/contracts/e-sign/deposits, support-lite, remaining website content, multi-tenant):
  **≈ 4–6 months.**

---

## 15. Technical Assessment (candid)

**Strengths:** security-first plumbing rare at this stage (idempotency, salted-hash rate limiting, HMAC webhooks,
audit logging, separated auth realms, server-side RBAC); clean provider-boundary pattern (swap stubs, not rewrite);
disciplined pipeline data model; production-grade SEO QC gate + claims-integrity rules; durable DB-outbox worker;
green typecheck/build/CI.

**Technical debt:** portal 100% client components, no SSR guards, thin error handling, one `any`-typed file,
leaked dev password; portal/staff tables stringly-typed `tenantId` (no FK) + soft polymorphic refs (orphan-prone,
unindexed); near-zero tests (the one suite red + unrunnable); free-text where enums belong; missing indexes.

**Refactor before prod:** tenant FKs/RLS on portal tables + missing indexes; centralize a request-scoped tenant/query
helper so isolation can't be forgotten; global error boundary + typed API client on portal; fix + expand tests, gate CI on them.

**Do NOT change (good):** provider-boundary interfaces; outbox worker; lead-pipeline schema + idempotency; two-realm
auth separation; SEO QC-gate framework; api Zod-per-route + audit pattern.

**Biggest technical risks:** (1) uncommitted/undeployed single-copy codebase; (2) default secrets reaching prod
(forgeable tokens/webhooks); (3) app-layer-only isolation (one missing `where` = cross-org leak); (4) no tests on money/authz paths.

**Biggest business risks:** (1) payments simulated — **cannot collect money** until Stripe; (2) case-study metrics/certs
correctly gated as unverified — **no proof content is live**; (3) thin marketing site (13/62 pages, legal stubbed).

**Next-phase priorities:** A (days) — commit/push/backup + secret fail-fast + stand up a deploy; B (weeks) — Stripe +
S3 + AV + client-role enforcement + isolation hardening + legal pages + real authz/billing tests; C (later) — website
content + case-study verification + proposal/contract/e-sign + support-lite + multi-tenant + observability.

---
*Verified against code 2026-07-16. Largest caveat: the Master Plan tracker is stale (0–5%); the code is far more
built than that — but far less **shipped** than the checkpoints imply, because none of it is committed or deployed.*
