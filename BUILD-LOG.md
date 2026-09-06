# Innovatix — Build Log

> **The route we follow, and the record of everything we build.**
> Companion to [`PROJECT-CANON.md`](./PROJECT-CANON.md) — the canon says *what & why*; this file says *in what order*, and (once we start) *what was actually built*.

**Status: ✅ PHASE 1 FULLY LIVE ON PROD · UI DEPLOYED + END-TO-END TESTED — 2026-08-16. Only deposit→activation is gated on Stripe (deferred).**
The activation gate (proposal → accept → sign → deposit → activate) is built, **deployed, and end-to-end tested on prod**. Backend + DB schema live (migrations applied, api+worker running, `/health` 200); the **61-service catalog seeded** (catalog-only); the **Phase 1 UI is live on prod** — prospect pages (review/accept/sign/pay) + staff proposal builder (list/new/detail/send). A full prod E2E passed: lead → staff send → **SMTP email delivered** → prospect review → accept → **sign**. **Only remaining gap:** deposit → activation, gated on `PAYMENTS_PROVIDER=stub` — **Stripe wiring deferred by choice (2026-08-16)**; nothing chargeable until it's wired.

**Last updated:** 2026-08-16

---

## How this file works

1. **Now:** it holds the proposed **Roadmap** (below) — the route, phase by phase.
2. **When you decide to proceed:** you tell me which phase, we build it, and **every piece built and coded is recorded** in the **Build Log** at the bottom — date, what was built, which tables/files, status.
3. The canon stays the north star; if a build decision changes the vision, we update the canon too.

Each phase is ordered to **ship value early and de-risk the next** — the highest-value gap first, foundations reused wherever they already exist.

---

## The Roadmap (proposed)

### Phase 1 — Close the deal in the system  ·  *the activation gate*
**Why first:** the single highest-value gap. Today a deal closes off-system (email + PDF + payment link) and can leak. This makes the platform the place the deal is won. (Canon §5.)

**What gets built**
- A minimal **service catalog** (services → packages → what's included) so a quote can be assembled.
- **Proposal** flow on a secure link (no password): review · request changes · accept.
- **Agreement** e-signature step.
- **Activation payment** (deposit) — treated as the activation event, amount configurable (33% standard).
- On payment received → **activate**: create the client account, let them set a password, create the project workspace.

**Reuses (already built):** the secure-link/invite pattern, Stripe payments, the "create client org + account + project" mechanism that "Convert" fires today.

**Outcome:** deals close in-platform, deposit captured, no leakage. Also creates the **Prospect stage** of the workspace.

---

### Phase 2 — The action-driven workspace  ·  *one screen, one next action*
**Why next:** the moment someone becomes a client (Phase 1), they land here — so the "one status, one action" model should greet them from the first "Your turn: pay deposit." (Canon §6.)

**What gets built**
- One **status card**: current project · current status · **one clear next action**.
- **Your Turn / Our Turn** states (incl. "Our turn — next update Friday" so silence never reads as neglect).
- **Curated relationship timeline** (meaningful moments only).
- **Minimal nav:** Home · Projects · Billing · Messages (files/invoices/support surface in-context).

**Reuses:** existing portal screens (overview, milestones, approvals, files, invoices, messages) and the existing curated client-activity feed. This is largely a **reframe**, not a rebuild.

**Outcome:** the calm, focused workspace from the vision — for both prospect and active stages.

---

### Phase 3 — Recurring revenue  ·  *retainers*
**Why:** turns one-off projects into predictable monthly income — the biggest business lever. (Canon §6 long-term.)

**What gets built**
- **Subscriptions/retainers** (monthly plan, what's included, hours) + **auto-pay**.
- Automatic recurring invoices (rides the existing background-job worker).
- The **long-term workspace state:** "Care Plan active — we're monitoring, next report Friday."

**Reuses:** invoices, Stripe, the background-job worker.

**Outcome:** clients keep paying after launch; revenue compounds instead of resetting.

---

### Phase 4 — The relationship home  ·  *never goes dark*
**Why:** make the workspace the client's permanent home holding many things at once. (Canon §0, §6.)

**What gets built**
- **Support requests** (tickets), tracked — not lost in chat.
- **Multi-project hub:** the relationship holds several projects (active + past) + the retainer, side by side; a project is a *card* inside the relationship.
- Invoice history, past-project archive, **"Start a new project."**

**Outcome:** one home for the whole relationship, for years.

---

### Phase 5 — Demand capture & polish
**Why:** strengthen the top of the funnel and finish the edges once the core lifecycle earns.

**What gets built / done**
- **AI Assistant** (a guide, not a consultant — educates and routes to a booking). Canon §3.
- **Google Workspace scheduling:** Calendar events, Meet links, invites, reminders, reschedule, cancel — all behind the Innovatix experience. Canon §4.
- **Proof:** publish verified case studies with real numbers (content, not code — but it's what the whole funnel converts against).

> **🅿️ Decision parked — 2026-08-13 (revisit when Phase 5 begins):**
> **Video + scheduling = Google Meet via the Google Calendar API**, layered on the *existing* native scheduler. **Skip Cal.com** — keep one source of truth in Google.
> - The booking→event integration (auto-generated **Meet link**, calendar **invite**, **reminders**, **reschedule/cancel**) **works on the free Google Workspace for Nonprofits tier** — no upgrade needed to build it. Footprint: `meetings` gains `googleEventId` + `meetLink`.
> - Setup: enable Calendar API, service account with **domain-wide delegation** (doable — we own the Workspace domains), point it at a dedicated "Consultations" calendar.
> - **In-call AI notes / recording / transcripts are NOT in the free nonprofit tier.** They need **nonprofit-discounted Business Standard**, and only on the **1–2 seats that run consultations** (a few $/seat/mo — far cheaper than adding Zoom). Build the integration free; make the seat-upgrade call at build time.

---

## Sequencing at a glance

```
Phase 1  Activation gate      →  close deals in-system      (highest value; reuses invite + Stripe)
Phase 2  Action-driven UI     →  the calm workspace         (reframe of existing screens)
Phase 3  Retainers            →  recurring monthly revenue
Phase 4  Relationship home    →  support + multi-project hub
Phase 5  AI + scheduling +    →  stronger funnel & polish
         verified proof
```

**Guiding rule for every phase:** build only what the customer needs (see status · do the next thing · pay · download · message), reuse what already exists, and never add complexity the customer must navigate. *Simplicity comes from what you hide.*

---

## Open decisions before we start (from Canon §8)
- Which phase to begin with (recommendation: **Phase 1**).
- AI Assistant: in-house vs. third-party widget to start.
- Google Workspace: how much of Calendar/Meet/reminders to integrate first vs. keep the native scheduler.
- Can a client have more than one active project at once? (Sizes Phase 4.)
- Build-vs-buy for the sales/CRM desk in early stages.

---

## Open production issues
*Tracked separately from phase sign-offs. Cleared only when resolved + verified.*

### 🟢 RESOLVED (2026-09-06) — The download always succeeded; the "503" was a FALSE status from the browser-testing extension
- **Verified:** the download **succeeded end-to-end** — Chrome saved the file and the downloaded PDF (`s5-2-upload-test (12).pdf`) **opened/rendered correctly** from disk. Issue **closed**.
- **Root cause:** the "503" was **not a real error from any layer**. It was a **false status reported by the browser-testing extension** the tester was using to watch the network: when Chrome handed the top-level navigation off to its **download manager**, the extension mis-reported that handoff as a 503, even though the request completed and the file downloaded successfully.
- **Evidence (the download worked at every layer):** the nginx access log shows every one of the tester's real download requests to the exact URL returning **`200 668`** (zero non-200 for that URL; **zero `503`s in the whole access log**; error log clean); the response carries a **deterministic `Content-Length`** with **no chunked encoding**; **Chrome successfully saved the files**; and the **downloaded PDF opened/rendered correctly**. (Raw HTTP with `Sec-Fetch-Mode: navigate` / `Dest: document` also returned **200** through nginx **and** direct — no server-side discrimination; `server: nginx/1.18.0`.)
- **Kept:** the stored-file **`Content-Length` hardening remains deployed** (commit `b73e5d462d5dbd8c3d3968067071c01bb8991860`; determinate-length, not chunked; S3 / authz / invoice-PDF untouched; code-only, no migration; prod smoke 24/24). A correct low-risk hardening; unrelated to the false 503. **No further server/nginx change was needed or made.**
- Not the S5.2 keyless-row Download **404** (separate; long resolved).

---

## Build Log
*Newest first. Everything below is built on local dev only until a release is approved.*

**Template for each entry:**
```
### YYYY-MM-DD — <phase / feature>
- Built: <what, in plain words>
- Tables/files: <what changed>
- Status: in progress | done | verified
- Notes: <decisions, deviations, follow-ups>
```

### 2026-09-06 — Feature: Request a Quote (marketing lead capture) — ✅ DEPLOYED
- **Built:** a prospect-facing "Request a Quote" flow that lands in the **existing leads pipeline** and is answered by the **existing staff Proposal flow** — no new proposal machinery, no instant pricing. API: `QUOTE` added to `LeadFormEnum` + Prisma `InquiryForm` enum via additive migration `20260906120000_add_quote_inquiry_form` (`ALTER TYPE "InquiryForm" ADD VALUE 'QUOTE'`); the API never branches on `form` (stored only), so intake/dedup/jobs are unchanged. Web (systems-web): `LeadForm` gained `variant="quote"` (sends `form:QUOTE`, shows budget + desired-start, requires a project description, review-framed success copy — promises a **review, not a proposal**); a new `/request-a-quote` page; and a secondary **"Request a Quote"** CTA on every service page alongside "Book a Consultation". The CTA passes the **stable canonical service slug** (`?service=ai-services/ai-automation`), and `LeadForm` resolves it back to the display label via the existing `SERVICE_CATEGORIES` nav catalog (no new hard-coded map); a non-slug value (legacy `/book` display-name param) passes through unchanged.
- **Files:** API — `src/leads/schema.ts`, `prisma/schema.prisma`, `prisma/migrations/20260906120000_add_quote_inquiry_form/migration.sql`. Web — `apps/systems-web/src/components/LeadForm.tsx`, `apps/systems-web/src/app/request-a-quote/page.tsx`, `apps/systems-web/src/components/ServicePageView.tsx`, `packages/analytics/src/events.ts` (`FormKind += 'quote'`). Test: `test/integration/leads.test.ts` #24 (QUOTE → 1 lead / 1 inquiry `form=QUOTE` / attribution / 4 jobs, idempotent).
- **Status:** ✅ **DEPLOYED to production 2026-09-06.** Branch `feat/request-a-quote`, checkpoint **`758a6843d7df04c47a2da14e078b9701e353673c`** (pushed to origin). **Migration `20260906120000_add_quote_inquiry_form` applied — `prisma migrate status` up to date at 25 migrations.** Ordered deploy: **API + migration FIRST** (`prisma migrate deploy` → `prisma generate` → restart innovatix-api; verified with a controlled `form=QUOTE` intake), **systems-web SECOND** (`next build` → restart innovatix-systems-web). **Production QUOTE smoke — PASS** (throwaway data, worker paused, DB-verified): `/request-a-quote` 200 (public `https://innovatixmarketing.com/request-a-quote`=200), service page shows **both** CTAs, **canonical service slug → label PASS** (`request-a-quote?service=ai-services%2Fai-automation` → resolves to "AI Automation"), submit → **1 Lead + 1 LeadInquiry `form=QUOTE` + serviceInterest "AI Automation" + 1 attribution + 4 jobs**, **idempotency replay PASS** (no duplicate inquiry/jobs), **/contact + /book regression PASS** (both 200, unchanged; book CTA still uses the display name), no 40P01/P2034/P2028/500 in logs, **cleanup residue zero**. All 7 deployed files' hashes == committed `758a684`. (Marketing site = systems-web on :4030, domains innovatixsystem(s).com + innovatixmarketing.com; `app.innovatixmarketing.com` is the portal.)

### 2026-09-06 — Fix: leads concurrent same-email dedup deadlock — ✅ DEPLOYED
- **Built:** two concurrent submissions for the same email deadlocked (Postgres **40P01**) — each `LeadInquiry` insert holds a FK KEY-SHARE lock on the shared lead row, then the first/last-touch `UPDATE` (which sets the `@unique` attribution columns) escalates to FOR UPDATE and the two cross; `intakeLead` only caught P2002, so the loser 500'd and lost its inquiry (reproduced 15/20). Fix: lock the lead row with **`SELECT … FOR UPDATE` as the FIRST statement** in the intake transaction (serialises same-lead intakes → no deadlock); a bounded (5-attempt), jittered **whole-transaction** retry that fires **only** on a genuine deadlock (40P01/P2034), nothing else; and intake `$transaction` **`timeout: 20_000`** (the serialisation makes the interactive-tx timeout count row-lock wait, so the 5s default tripped **P2028** under load — `maxWait` left at the Prisma default since the bottleneck is the row lock, not the pool). `resolveLead`'s find→create→P2002-refetch already converges racers onto one lead before the locked section.
- **Files:** `src/leads/service.ts` (the only runtime change). Tests: `test/integration/leads.test.ts` — #6 hardened (both 202) + #6b (N=8 × 4 rounds → 1 lead, N inquiries, N job/attr sets, 1 LEAD_CREATED), #6c (distinct-email stays parallel), #6d (injected P2034 exercises the retry, proves no duplication).
- **Status:** ✅ **DEPLOYED to production 2026-09-06.** Branch `fix/leads-dedup-deadlock`, commit **`367c2c13335b21d704be64c5a41545154950ab8c`** (pushed to origin). **Code-only / no migration** (`prisma migrate status` = up to date; deploy = rsync only `service.ts` + `pm2 restart innovatix-api` — prod runs `tsx src/main.ts` from source, so no build; deployed hash matches the commit). Local gate: leads **22/23** (only the pre-existing Cal.com env fail), concurrency **20× + 2× parallel-load = 0 failures**, serialized same-email worst latency ~487 ms (≪ 20 s tx cap and nginx 60 s read timeout), full regression clean, typecheck/build clean. **Prod smoke (throwaway data, worker paused, DB-verified):** single intake 202 (1 lead / 1 inquiry / 1 attribution / 4 jobs); **2× concurrent same-new-email → 1 Lead + 2 Inquiries**; 4× same-email → 1 Lead + 4 Inquiries; different-email → 1 lead each; idempotency replay → same reference, no duplicate jobs; **no 40P01 / P2034 / P2028 / 500 in logs**; **cleanup residue zero**; all services online. (Separate diagnostic item, NOT part of this slice: pre-existing `ERR_REQUIRE_ESM` @fastify/cookie log noise — predates this change; API boots and serves fine.)

### 2026-09-06 — Fix: deterministic Content-Length on stored-file downloads (hardening) — ✅ DEPLOYED
- **Built:** both file-download routes (`/portal/files/:id/download`, `/admin/files/:id/download`) now funnel through a shared `sendFileDownload()` helper that, on the local/streamed path, sets **`Content-Length`** from the storage adapter's own `head()` (fs.stat local / HEAD remote) — so the response is a determinate-size body, not chunked transfer-encoding. Signed-URL (S3) redirect, authz, audit, provider selection, file bytes, and the invoice-PDF path are all unchanged.
- **Files:** `src/lib/download.ts` (new shared helper), `src/portal/routes.ts`, `src/admin/routes.ts`, `test/integration/files.test.ts` (+4: exact Content-Length, byte-identity, preserved type/disposition, owner/member/staff authz unchanged, cross-org/keyless 404, S3-redirect preserved, real-socket NOT-chunked).
- **Status:** ✅ **DEPLOYED 2026-09-06.** Commit `b73e5d462d5dbd8c3d3968067071c01bb8991860`. Code-only / no migration; full regression **208/206** (2 pre-existing env-only fails); prod smoke **24/24**; prod matches committed. **Context:** a low-risk hardening prompted by the Download-503 investigation — it was NOT the 503's cause (the 503 was client-side; see *Open production issues → RESOLVED*).

### 2026-09-06 — Phase 3 · P3.4: Client Workspace / Timeline (Care Plan status + RETAINER_ACTIVATED moment) — ✅ DEPLOYED
- **Built:** the money-free Care Plan relationship-status projection `selectClientCarePlanStatus` → `{ active, nextReportAt }` on `/portal/overview` for ALL client roles (never exposes price / raw status / `nextReportNote`); the long-term "Care Plan active — next report `<date>`" workspace state (precedence: **below** overdue-invoice/approval/invoice-due, **above** the delivery phase); and the curated **RETAINER_ACTIVATED** relationship-timeline moment, emitted ATOMICALLY once per Care Plan via a deterministic `PortalActivity` primary-key id (`retainer-activated:<carePlanId>`) + P2002 catch (concurrency-safe; best-effort so a moment-write failure never rolls back the already-committed activation).
- **Additive; P3.3 owner-only billing untouched** (billing-authz 17/17). **No schema migration** (fields + moment type already existed; idempotency rides the existing `id` PK).
- **Known Phase-4 limitation:** `RETAINER_ACTIVATED` is idempotent per Care Plan and currently attaches to the org's **newest project** — a divergence is only possible under future multi-project (Phase 4).
- **Status:** ✅ **DEPLOYED to production 2026-09-06.** Commit `f1f9ff4645aac477ea66b20f0bd5e30c52dfad2f`. Code-only / no migration; prod smoke **22/22** (owner + member, incl. concurrent activation → one moment); prod verified matching the committed code.

### 2026-09-05 — Phase 3 · P3.3: Client Billing UI (Care Plan / RETAINER invoices) — OWNER-only — ✅ DEPLOYED
- **Built:** the CLIENT-facing Billing surface for Care Plan / RETAINER invoices, **enforced OWNER-only server-side.** `invoice:read` moved into the owner-only client-RBAC set; every billing route gates on it before returning data — the invoice list (`/portal/project` `billing` block), detail (`/portal/invoices/:id`), PDF (`/pdf`), checkout + pay-demo, **and** the `/portal/overview` payable-invoice summary — so a MEMBER (or a deactivated account with a still-live token) is refused **even on a direct URL**, and members receive **no invoice data at all**. `findClientOrgInvoice` broadened to also resolve org-scoped RETAINER invoices (`projectId=null`, `clientOrgId`=caller's org) while folding tenant+org (+ a falsy-tenant/org guard). New `selectClientCarePlan` returns the ONE client-visible plan — live (ACTIVE/PAUSED/PAST_DUE) else most-recent terminal as "Ended", **never DRAFT** — with only client-safe fields (no autoPay / Stripe ids / billingAnchorDay / timestamps).
- **UI:** Billing list with a Care Plan summary card ("Billed monthly — pay each invoice" + next-invoice date) and a unified invoice list tagging RETAINER rows with their billing period; retainer context on the detail page; a "limited to account owners" notice + a `billingAllowed` nav gate so members never see the Billing tab. **No Stripe / auto-pay wiring; no "Auto-pay enabled" wording** (Stripe stays P3.5).
- **Additive-only:** project/milestone/deposit invoice, PDF, and pay behavior unchanged; the `/portal/projects/:id` detail route no longer includes invoices (billing lives ONLY on the dedicated owner-only surface).
- **Files:** `src/client/rbac.ts` (invoice:read → OWNER_ONLY), `src/lib/scoped.ts` (broadened + guarded helper), `src/lib/care-plan.ts` (new — client-safe selector), `src/portal/routes.ts` (gates on detail / PDF / checkout / pay-demo / `/portal/project` / `/portal/projects/:id` / `/portal/overview`); web `lib/usePortal.ts`, `components/PortalShell.tsx`, `app/invoices/page.tsx`, `app/invoices/[id]/page.tsx`, + `billingAllowed` on home/projects/messages/settings. Tests: `test/integration/billing-authz.test.ts` (new, 17 cases), `test/unit/rbac.test.ts` (matrix update).
- **Verification (LOCAL, isolated `innovatix_test` DB; prod source untouched):** API + web `tsc` clean; web `next build` clean; **full suite 187/189** — the only 2 failures are the pre-existing env-only tests (`/metrics`, Cal.com signature), which fail identically on the untouched baseline. `billing-authz.test.ts` **17/17**: owner sees billing / member gets `billing:null`; member → 403 on detail/PDF/checkout + on a project invoice; cross-org → 404; cross-tenant → 404 (query) + non-default-tenant session → 401 (auth); DRAFT never exposed; Care Plan client-safe fields only; `/portal/overview` payable-invoice owner-only + org/tenant-protected. **Adversarial review (4 confirmed / 8 raised) found + fixed before deploy:** a HIGH `/portal/projects/:id` invoice-list leak to members; the invoice-detail Billing-nav dropout; the Care Plan terminal-selection tie-break; a defense-in-depth falsy-org guard on the invoice helper. Also fixed a **pre-existing test-isolation flake** — the global job processor could claim other files' leftover jobs (→ a real email send → ~30s timeout) — by running integration files sequentially + clearing the job table in the two processor-driving tests.
- **Known pre-existing flake (NOT P3.3, NOT fixed here):** `leads.test.ts` #6 (concurrent same-email dedup race) fails intermittently (~1 in 4) under DB load on BOTH this branch and the untouched baseline — a lead-capture concurrency test, unrelated to billing; tracked as a separate follow-up.
- **Prod deploy (2026-09-05):** code-only (**no migration** — `migrate deploy` is a no-op). Deploy delta verified surgical (rsync dry-run = only the P3.3 files). api + worker + portal + systems-web restarted healthy; public HTTPS 200. **Controlled prod smoke test as OWNER and MEMBER — 13/13 PASS** (throwaway org + owner + member + project + SENT invoice + ACTIVE Care Plan + RETAINER invoice; JWTs minted from the prod secret; live API): OWNER → `/portal/project` billing block present (RETAINER in list), `/portal/overview` `payableInvoice` present, invoice detail (project + RETAINER) 200, PDF 200, checkout authz 200; MEMBER → billing `null`, overview `payableInvoice` `null`, detail 403, PDF 403, checkout 403. All throwaway data deleted; prod verified clean (0 remnants, 0 orphan payments).
- **Status:** ✅ **DEPLOYED.** Approved conditional on closing the `/portal/overview` member payable-invoice leak — done as part of this slice. No auto-pay (Stripe-gated, P3.5).

### 2026-08-30 — Phase 3 · P3.2: Recurring RETAINER invoice worker — ✅ DEPLOYED + SIGNED OFF
- **Built:** the recurring-billing engine for Care Plans. `sweepDueCarePlans(now)` (a worker-loop tick) enqueues ONE period-keyed durable job per ACTIVE plan whose `nextInvoiceAt` cursor is due; `generateRetainerInvoice` creates the `kind=RETAINER` invoice **and** advances the cursor in ONE `$transaction` — so a failure can never advance the cursor. `REC-` numbering via the atomic `nextDocumentNumber`. ET-anchored period math (`lib/billing-period.ts`, noon-UTC pin; billingAnchorDay ≤28 → no month-end overflow).
- **Additive-only:** only ever creates RETAINER invoices (org-scoped, `projectId=null`); deposit/milestone/standard/final billing is untouched.
- **No-double-bill — THREE independent guards:** the job `idempotencyKey` `${planId}:${period}`, the handler's "cursor is still == this period" check, and the DB `UNIQUE(carePlanId, billingPeriodStart)`. Plus a worker-level overlap guard (never bills into already-covered time).
- **Retry / dead-letter:** rides the durable `SideEffectJob` engine (exponential backoff → DEAD after maxAttempts). The sweep **self-heals** a crash-stranded PROCESSING job (past a 10-min lease) or a DEAD job (throttled hourly), so a plan's billing can never silently, permanently halt.
- **Files:** `src/lib/billing-period.ts` (new), `src/billing/retainer.ts` (new — sweep + handler), `src/jobs/processor.ts` (+case), `src/worker.ts` (+sweep, isolated try/catch), `src/admin/routes.ts` (reactivation resumes the cursor PAST covered time — no overlap re-bill, keeps anchor), schema.prisma + migration `20260822000000` (JobType += GENERATE_RETAINER_INVOICE). Tests: `test/unit/billing-period.test.ts`, `test/integration/retainer-worker.test.ts`.
- **Verification (testing gate — no prod as first test):** LOCAL functional regression on the isolated, fail-closed `innovatix_test` DB with accelerated dates — **19/19 pass** (normal gen · amount/period/REC number · cursor advance · repeated-sweep + duplicate-enqueue idempotency · DB-unique · concurrent/stale P2002 no-op · failure→retry→dead-letter [cursor untouched, no invoice] · failure→retry→succeed · paused/terminal negatives · month-end Jan31→Feb28 · catch-up · reactivation-no-backfill · additive-untouched · overlap guard · DEAD/PROCESSING self-heal). **Adversarial review found + fixed 5 defects before deploy** (reactivation overlap double-bill; stranded/DEAD job silent billing halt; broken lead-less dead-letter alert; sweep starving the tick; nextAttemptAt scheduling).
- **Prod deploy (2026-08-30):** backup first; migration applied clean; api + worker healthy; **idle with 0 ACTIVE plans (0 invoices)**. Controlled prod smoke test — one $1.00 plan → exactly one `REC-0001` RETAINER invoice (correct amount/period/carePlanId/clientOrgId, `projectId=null`), cursor advanced, **no duplicate** on re-sweep, job SUCCEEDED; artifacts deleted + prod restored to baseline.
- **Status:** ✅ **DEPLOYED + SIGNED OFF.** Commit `02093c8`. NOT client-visible yet (P3.3) and NO auto-pay (Stripe-gated, P3.5) — generated invoices are staff-visible; real charging awaits Stripe.
- **By design:** catch-up bills each owed period once (an active plan across worker downtime); reactivation resumes at now with no back-billing of the paused stretch.

### 2026-08-21 — Phase 3 · P3.1: Care Plan (retainer) model + staff controls — ✅ DEPLOYED + SIGNED OFF
- **Built:** the greenfield **CarePlan** model — a relationship-level (ClientOrg) monthly retainer, **ADDITIVE** to and independent of project/milestone billing. `CarePlanStatus` (DRAFT/ACTIVE/PAUSED/CANCELED/COMPLETED/PAST_DUE); `InvoiceKind += RETAINER`; `Invoice.carePlanId + billingPeriodStart/End` with `UNIQUE(carePlanId, billingPeriodStart)` — the DB no-double-bill guarantee P3.2's worker relies on.
- **Staff API (gated `invoice:write`):** `POST /admin/projects/:id/care-plans` (create DRAFT; one-live-plan-per-org guard) + `PATCH /admin/care-plans/:id` (field edits + validated lifecycle transition). Activate sets the ET billing-anchor day + the `nextInvoiceAt` cursor P3.2 reads. **Admin UI:** a Care Plan tab on the project detail page (create + activate / pause / reactivate / cancel / complete).
- **Verification:** migration dry-run on prod PG16 (BEGIN…ROLLBACK) — additive only (new table, nullable cols, new enum value, indexes/FKs); applies clean + rolls back. tsc + `next build` clean. **Adversarial review found + fixed a real defect:** the one-live-plan invariant was enforced only at create → cancel→create→reactivate could leave two live plans (a double-billing seam). Fixed BOTH ways — CANCELED is now terminal (reactivate is PAUSED→ACTIVE; resume-after-cancel = a new, guarded plan) AND a partial-UNIQUE index `care_plans_one_live_per_org` enforces one live plan per relationship at the DB.
- **Files:** schema.prisma + migration `20260821000000`; `src/admin/routes.ts`; `admin/projects/[id]/page.tsx`. Commit `360b725`.
- **Status:** ✅ **DEPLOYED + SIGNED OFF** (2026-08-21). Additive-only confirmed on prod (existing invoices untouched, all `carePlanId` NULL). Model + controls only — no generation (P3.2), no client surface (P3.3), no auto-pay (P3.5).

### 2026-08-21 — Phase 2 · S5: Minimal nav + Projects hub — ✅ S5 COMPLETE (Phase 2 workspace signed off)
- **Built (S5, three deployed slices — each browser-verified + signed off on prod):**
  - **S5.1 — Minimal nav (8→4):** `PortalShell` collapsed to **Home · Projects · Billing · Messages** (Canon §6). New header **account menu** (avatar dropdown mirroring `NotificationBell`) now hosts **Account settings** + **Sign out** — relocated out of the desktop-only sidebar so it's reachable on every viewport. Net-new **mobile bottom nav** (fixed 4-item bar; `dvh` + `env(safe-area-inset-bottom)` so the Messages composer clears it on iOS). Keys kept stable (`overview`/`invoices`) so Home/Invoices resolve highlight unchanged; "Invoices" relabeled **Billing** on the same `/invoices` route.
  - **S5.2 — Projects hub:** `/projects` became a single active-project workspace with in-context tabs **Milestones · Reports · Files · Approvals · Team** (mirrors admin `admin/projects/[id]`; reads the one `usePortal()` graph — no new API). Home trimmed to its Canon §6 essentials (**S2 status card + S4 relationship timeline**); the Milestones / latest-Report / delivery-Team cards moved under Projects.
  - **S5.3 — Fold routes + deep-linking:** `/milestones,/reports,/files,/team` → **307 → `/projects?tab=<slug>`** (`next.config.js`); the hub reads/writes `?tab=` (URL is source of truth via a sync effect); the 4 standalone pages deleted; every client notification `linkPath` migrated to the hub tab (FILE_UPLOADED, MILESTONE_UPDATED, REPORT_PUBLISHED). Adversarial review caught + fixed a real defect (mount-only tab init desynced on same-route soft-nav).
- **Files:** `components/PortalShell.tsx`; `app/projects/page.tsx` (new hub); `app/page.tsx` (Home trim); `app/messages/page.tsx` (mobile height); `next.config.js` (redirects); deleted `app/{milestones,reports,files,team}/page.tsx`; API: `portal/routes.ts` (file-list `storageKey` guard), `scanning/service.ts` + `admin/routes.ts` (linkPaths). **No DB migrations.**
- **Also fixed here (Download 404 — distinct from the 503 below):** the client Files list advertised dev-seed metadata rows with no bytes (`storageKey` NULL) → Download 404. Added `storageKey: { not: null }` to both client file-list filters so the list can never surface an un-downloadable file; removed the 2 bogus seed rows from prod (`DELETE 2`).
- **Status:** ✅ **S5 complete — Phase 2 "action-driven workspace" fully deployed + signed off** (S1 engine · S2 status card + QA · S3 next-update · S4 curated relationship timeline · S5 nav + hub). Branch `feat/phase-1-activation-gate`, committed + pushed through `5620852`.
- **Open (separate — see ## Open production issues):** file-download **503** in the browser. **NOT part of S5 sign-off.**

### 2026-08-16 — DEPLOY: Phase 1 UI → production + full prod end-to-end test ✅
- **Shipped to prod:** both frontends rebuilt + deployed via `./scripts/deploy.sh` (rsync → box → `npm install` + `prisma generate` + `prisma migrate deploy` + `turbo build` + `pm2 restart` of api / portal / systems-web / worker). Portal (`app.innovatixmarketing.com`) + marketing (`innovatixmarketing.com`), both HTTP 200. No pending migrations (schema already live from the 08-14 backend deploy).
- **Fixed the launch-blocker:** both frontends had been built with the browser API base still `http://localhost:4040`, so no visitor's browser could reach the API (dead on step one). Now baked from `.env.local` on the box — **portal same-origin `/v1`**, **marketing cross-origin `https://app.innovatixmarketing.com/v1`** (CORS-allowed). Added **build-time guards** (`scripts/validate-api-url.mjs`, `systems-web/scripts/validate-site-url.mjs`) that **fail the build** if the API/site base is localhost/unset, wired through `turbo.json` `passThroughEnv` so they actually enforce on deploy (Turbo sandboxes env otherwise).
- **Email live for real:** `EMAIL_TRANSPORT=smtp` via Google Workspace, sender `proposals@innovatixmarketing.com`. New `SmtpTransport` (nodemailer). Confirmed delivering — the `PROPOSAL_SENT` email (inline) **and** the `LEAD_ACK` email (worker/async) both landed in a real inbox.
- **Full prod E2E — PASS:** lead form → `POST /v1/leads` **202** (no localhost, clean console) → staff login/build/send (**PROP-0001**) → SMTP email delivered with the review link → prospect **review** → **accept** (AGR-0001) → **sign**. Every stage verified on both the prospect and admin sides; admin timeline Draft → Sent → Viewed → Accepted → Signed.
- **Date formatting fix:** portal dates rendered in the *viewer's* browser timezone (a 22:49 UTC "sent" showed as the next calendar day for viewers east of UTC — two people read different dates off one record). Pinned all display dates to **`America/New_York`** via a single constant in `platform-web/src/lib/fmt.ts`; added a `Timestamp` component (precise instant on hover + machine-readable `<time>`), an **"(ET)" label + year** on the signed agreement. Verified from a UTC+2 browser now showing the correct ET date.
- **Deferred by choice — deposit → activation:** prod runs `PAYMENTS_PROVIDER=stub` + `NODE_ENV=production`, so the inline-settle path is code-disabled (`deposits/service.ts`) and "Pay deposit" redirects to a login-gated `/pay` the not-yet-onboarded prospect can't use → no ClientOrg/Project past "signed." Needs Stripe (`PAYMENTS_PROVIDER=stripe` + `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`, webhook authoritative for `PAID` → `activateFromDeposit`). **User deferred Stripe on 2026-08-16.**
- **Status:** ✅ **Phase 1 fully live + prod-tested through "Agreement signed."** Everything except the deposit works on prod. Git: branch `feat/phase-1-activation-gate`, all committed + pushed.
- **Next:** wire Stripe when ready to charge; then re-run the prod E2E through deposit → activation in Stripe test mode before going live.

### 2026-08-14 — Phase 1 · UI: prospect flow + staff proposal builder
- **Built:** the entire user-facing half of the activation gate, in platform-web's dark house theme — reusing the `portal-api` client, the `setup-account` public-token pattern, `fmt.ts`, and `AdminShell`.
- **Prospect pages (public, secure `[token]` link, no login):** `/proposals/[token]` (review → **Accept** / **Request a change**), `/proposals/[token]/agreement` (read the agreement → **type-to-sign** + PDF download), `/proposals/[token]/deposit` (**Pay** → *"you're activated"*). Shared `components/proposal-ui.tsx` (Shell + Loading + Terminal + a 3-step trail). Token read via `useParams` (path segment), each page a small state machine over the API's status dialect.
- **Staff pages (`/admin/proposals`):** list (status pills), `new` (builder — pick a lead, add line items **from the 61-service catalog** or custom, set deposit %, live totals, save draft), `[id]` (detail + timeline + agreement PDF + **Send to prospect**). `lib/proposal-status.ts` shares the status→pill map.
- **Changed:** `AdminShell.tsx` (+**Proposals** nav, `FileText` icon); `useStaff.ts` (staffCan +`proposal:write` for ADMIN/DELIVERY_LEAD, mirroring server RBAC).
- **Verified:** `tsc --noEmit` clean **and** a full `next build` — 20/20 routes generated, all six new routes present. No browser/runtime test yet (needs the stack running or a deploy).
- **Deferred (small, non-blocking):** edit-a-draft page (the `PATCH /admin/proposals/:id` endpoint already exists); the Stripe deposit `success_url` returns to the logged-in `/invoices/:id` rather than the proposal page — activation still completes via webhook + portal-invite email, but the post-pay redirect for a not-yet-onboarded prospect is a rough edge to polish.
- **Status:** ✅ built & build-verified on local. **Not deployed — prod UI untouched.**
- **Next:** see it running (local stack + a demo proposal), then deploy the UI; confirm prod payment mode before the pay page goes live.

### 2026-08-14 — DEPLOY: Phase 1 backend → production 🚀
- **Backup first (non-negotiable):** `docker exec innovatix-postgres pg_dump` of prod `innovatix` → `~/innovatix-backup-preP1.sql.gz` on the box **+ an offsite copy on the Mac** (`backups/`, gzip-verified). No offsite backup existed before.
- **Shipped:** rsync of `apps/api` (src + prisma) to the box (excluding `.env`/node_modules/build); `prisma generate`; `prisma migrate deploy` applied the **4 Phase 1 migrations** to prod (additive — new tables + two nullable columns, nothing dropped); `pm2 restart innovatix-api innovatix-worker` (box runs via `tsx` — no build step needed).
- **Verified on prod:** migrate status *up to date*; `innovatix-api` online + clean boot (`listening … env=production`, no errors, no crash-loop); `/health` → **200**; new `/v1/admin/services` → **401**.
- **Not deployed (by design):** the frontend UI (staff proposal builder + prospect review/sign/pay pages) and the seeded service catalog on prod. With no UI, the deposit flow can't be triggered → nothing chargeable.
- **Next:** seed the catalog on prod (catalog-only, NOT the demo seed which creates demo org/staff); build the Phase 1 UI.

### 2026-08-14 — Phase 1 · Slice 6: Activation on deposit-paid — ✅ PHASE 1 COMPLETE
- **Built:** the payoff. When the deposit is paid, `markInvoicePaid`'s deposit hook calls `activateFromDeposit` → reuses **`convertLead`** to create the **ClientOrg + first Project** (DISCOVERY, 5 milestones, delivery lead) **+ a secure portal invitation** (OWNER), then **backfills** the new org/project onto the proposal, contract, deposit invoice, and payment. New `src/activation/service.ts`.
- **Actor:** a paid-deposit event has no interactive staff, so the system acts as the **proposal's creator** (falls back to the first active admin).
- **Idempotent + resilient:** guarded by `proposal.clientOrgId` + convertLead's own idempotency + the invoice `PAID` gate; activation is wrapped so a failure records `ACTIVATION_FAILED` without unwinding the paid deposit.
- **Changed:** `src/billing/mark-paid.ts` (call activation in the deposit hook).
- **Verified:** `tsc` clean; live smoke on `:4041` (stub) — settle deposit → lead **CONVERTED**, ClientOrg *Smoke Test Co*, Project *OMS…* DISCOVERY + 5 milestones + 1 member, **portal invitation** to the prospect as OWNER (invite email queued), org/project **backfilled** onto proposal + contract + invoice (org & project) + payment, `ACTIVATED` audit written; re-settling the same deposit → **no double activation** (still 1 client org).
- **Status:** ✅ done & verified on local dev. **Not deployed — prod untouched, nothing charged.**

> **🎉 PHASE 1 COMPLETE.** A deal can now be closed entirely in-platform: proposal → accept → sign → deposit → activated client with a workspace. Six slices (+2b/4b), all on local dev, all verified by live smoke, nothing deployed.

### 2026-08-14 — Phase 1 · Slice 5: Activation deposit + checkout (the final gate)
- **Built:** the third activation gate. On accept, a **deposit invoice** (`kind=DEPOSIT`, `DEP-0001`, = the proposal's deposit amount) is created alongside the agreement. The prospect pays it on the **same secure link** — but **only after signing** (gated). Checkout runs through the shared gateway; a webhook marks it paid → emits `DEPOSIT_PAID`, teeing up activation.
- **API (new):** public `GET /v1/proposals/:token/deposit` (DUE / PAID / NOT_READY) + `POST /v1/proposals/:token/deposit/checkout` (returns the checkout URL). Logic in `src/deposits/service.ts` (deposit-invoice creation, status, checkout via `checkoutGateway()`).
- **Changed:** `Payment.clientOrgId` → **nullable** (migration `phase1_payment_clientorg_optional`) — a deposit has no org yet (Canon §5); `src/proposals/service.ts` (accept now also creates the deposit invoice, in the same transaction as the contract); `src/billing/mark-paid.ts` (**the deposit-paid hook** — a `kind=DEPOSIT` invoice going PAID writes a `DEPOSIT_PAID` lead activity + marks the activation seam; fires once across all settlement paths); `src/billing/process-webhook.ts` (allow null clientOrgId for deposit payments); `src/routes/proposals.ts` (deposit routes).
- **Safety:** checkout goes through `checkoutGateway()` — **stub in dev = no real Stripe, no charge**; real Stripe only when `PAYMENTS_PROVIDER=stripe`. Webhook is authoritative for PAID (redirects are UX-only); settlement idempotent (invoice `PAID` gate + Stripe `ProcessedWebhookEvent`).
- **Verified:** `tsc` clean; live smoke on `:4041` (`PAYMENTS_PROVIDER=stub`) — before-accept → INVALID; accept → DEP-0001 SENT $19,800; before sign → NOT_READY + checkout 409 NOT_SIGNED; after sign → DUE; checkout → **stub /pay URL (no Stripe)** + PENDING payment; stub webhook (HMAC) → invoice PAID; deposit → PAID; re-checkout → 409 ALREADY_PAID; timeline SENT → ACCEPTED → CONTRACT_SIGNED → DEPOSIT_PAID.
- **Status:** ✅ done & verified on local dev. **Not deployed — prod untouched, nothing charged.**
- **Next:** Slice 6 — activation: on DEPOSIT_PAID, create ClientOrg + account invite + Project (reuse `convertLead`), backfill the invoice/payment.

### 2026-08-14 — Phase 1 · Slice 4b: Signed-agreement PDF (on-demand)
- **Built:** a signed-agreement PDF **rendered on demand** from the stored agreement text + signature evidence — never stored (mirrors how invoice PDFs work; the DB keeps the source of truth, the PDF is regenerated identically each time). New `src/contracts/pdf.ts` — zero-dependency, multi-page, mirroring `billing/pdf.ts`.
- **Delivered to customer + staff:** public `GET /v1/proposals/:token/agreement/pdf` (customer, via their secure link) and staff `GET /v1/admin/contracts/:id/pdf`; on signing, the customer is emailed a *"Your signed agreement"* secure link (`agreementSignedEmail`). The PDF's signature block shows signer, timestamp, verification ID (content hash), and hashed IP.
- **Changed:** `src/contracts/service.ts` (+PDF helpers + signed-copy email on sign); `src/email/templates.ts` (+`agreementSignedEmail`); `src/routes/proposals.ts` + `src/admin/proposals.ts` (+PDF routes). No schema change, no blob storage.
- **Verified:** `tsc` clean; live smoke — both endpoints return a valid `%PDF-1.4` (2 pages, `%%EOF`, contains signer + total), staff & customer PDFs byte-identical, customer signed-copy email queued, staff PDF without auth → 401.
- **Status:** ✅ done & verified on local dev. **Not deployed — prod untouched.**

### 2026-08-13 — Phase 1 · Slice 4: Agreement e-signature (in-house click-to-sign)
- **Built:** the agreement step. On proposal **accept**, an agreement is auto-generated from the proposal terms (plain-language services agreement). The prospect reviews it and **signs** by typing their name — on the **same secure link**, no login, no printing.
- **API (new):** public `GET /v1/proposals/:token/agreement` + `POST /v1/proposals/:token/sign`; staff `GET /v1/admin/contracts/:id` (agreement + signature evidence). Logic in `src/contracts/service.ts` (template, contract creation, inspect, sign). Contract numbering `AGR-0001` via the shared atomic counter.
- **Changed:** `src/proposals/service.ts` (accept now auto-creates the contract, idempotently, in a transaction); `src/routes/proposals.ts` + `src/admin/proposals.ts` (new routes). **No schema change** — `Contract`/`ContractSignature` existed since Slice 1.
- **Evidence captured (ESIGN/UETA-style):** signer name + email + title, timestamp, **salted IP hash** (never the raw IP — Canon privacy), user agent, and a **SHA-256 of the exact agreement text signed** — verified to equal the contract's stored hash (tamper-evident). Single-sign = atomic compare-and-set.
- **Verified:** `tsc --noEmit` clean; live smoke on `:4041` — agreement-before-accept → NOT_ACCEPTED; accept → auto-creates AGR-0001; GET agreement → READY (1161-char body); sign → SIGNED + full evidence (content hash matches); sign again → 409; staff contract detail shows 1 signature; lead timeline SENT → ACCEPTED → CONTRACT_SIGNED.
- **Status:** ✅ done & verified on local dev. **Not deployed — prod untouched.**
- **Next:** Slice 5 — deposit invoice + Stripe checkout (the activation payment).

### 2026-08-13 — Phase 1 · Slice 3: Proposal builder + secure-link review
- **Built:** the full proposal lifecycle. Staff assemble a proposal from a lead (line items from the catalog or custom, configurable deposit %) and **send** it → issues a secure review link (the invite-token pattern) + emails the prospect. The prospect (no login) **reviews · requests changes · accepts**.
- **API (new):** staff `src/admin/proposals.ts` → `/v1/admin/proposals` (list · create · detail · patch) + `/…/:id/send` + `/v1/admin/leads/:id` (lead detail for the builder); public `src/routes/proposals.ts` → `GET /v1/proposals/:token` · `POST …/accept` · `POST …/request-changes` (logic in `src/proposals/service.ts`). Helpers: `src/lib/proposal-links.ts` (reuses the invite token gen/hash; proposal-shaped status), `src/lib/numbering.ts` (atomic per-tenant `PROP-0001`).
- **Changed:** `src/staff/rbac.ts` (+`proposal:view`/`proposal:write`); `src/email/service.ts` (`SendArgs.type` widened to the Prisma `EmailType`); `src/email/templates.ts` (+`proposalSentEmail`); `src/main.ts` (registered both modules); new `DocumentCounter` table (migration `phase1_document_counter`). Lead transitions now emitted: `PROPOSAL_SENT → NEGOTIATION → WON` + a lead timeline (SENT/VIEWED/CHANGES_REQUESTED/ACCEPTED).
- **Security:** secure link = the ClientInvitation pattern — 256-bit token, only its SHA-256 hash stored, raw token only ever in the emailed link (never returned over HTTP), single-use atomic accept, unknown token → non-revealing INVALID, per-hashed-IP rate limits, `logLevel:'warn'` keeps the token out of logs.
- **Verified:** `tsc --noEmit` clean; live end-to-end smoke on `:4041` — create PROP-0001 (deposit 33% = $19,800 of $60,000) → send (SENT + lead PROPOSAL_SENT) → review (VALID + VIEWED) → request-changes (CHANGES_REQUESTED + lead NEGOTIATION) → accept (ACCEPTED + lead WON) → re-accept 409 → unknown token INVALID; full lead timeline recorded. Email transport forced to outbox — no real email sent.
- **Status:** ✅ done & verified on local dev. **Not deployed — prod untouched.**
- **Next:** Slice 4 — agreement e-signature (in-house click-to-sign).

### 2026-08-13 — Phase 1 · Slice 2b: Full catalog import (61 services)
- **Built:** replaced the 8-service starter with the **complete 61-service catalog**, generated verbatim from the marketing site's source of truth (`apps/systems-web/src/lib/{services,nav}.ts`) into a committed, regenerable data module `apps/api/prisma/seed-data/catalog.ts`.
- **Changed:** `services` gains `categorySlug` + `categoryLabel` (migration `20260813192300_phase1_service_category_label`) so the site's **real 8 categories** are preserved (the coarse `ServiceCategory` enum stays as a code-level bucket); `src/admin/catalog.ts` returns/accepts them; `prisma/seed.ts` imports `CATALOG_SEED` and reconciles (drops stale services on re-seed).
- **Verified:** `tsc --noEmit` clean; seeded to local dev = **61 services / 61 packages / 366 deliverables**; categories Software Engineering 9 · Cloud & Infra 9 · AI 9 · Enterprise Systems 9 · Security 7 · Data & Analytics 6 · Digital Transformation 6 · Team Services 6.
- **Status:** ✅ done & verified on local dev. **Not deployed — prod untouched.**

### 2026-08-13 — Phase 1 · Slice 2: Service catalog (staff API + seed)
- **Built:** the catalog staff manage and quote from — full CRUD over Service → ServicePackage → CatalogDeliverable, plus a seeded starter catalog drawn from the real marketing-site services.
- **API (new file `src/admin/catalog.ts`):** `/v1/admin/services` (list · create · detail · patch · delete), `/v1/admin/services/:id/packages` + `/packages/:id` (patch · delete), `/packages/:id/deliverables` + `/deliverables/:id` (patch · delete). Staff-auth + RBAC (`service:view` / `service:write`) + tenant-scoped, mirroring the Projects module; reuses the shared `requireStaff` / `audit` helpers (now exported from `admin/routes.ts`).
- **Changed:** `src/staff/rbac.ts` (+`service:view` / `service:write`); `src/main.ts` (registered `registerCatalogRoutes`); `prisma/seed.ts` (+`seedCatalog`). Ripple from Slice 1's optional `invoice.projectId`: null-guarded the invoice paths in `admin/routes.ts`, `portal/routes.ts`, `billing/mark-paid.ts`, `billing/process-webhook.ts` (a deposit invoice has no project yet).
- **Seed:** 8 flagship services (one per site category, covering all 8 `ServiceCategory` values), each with one quote-only "Custom engagement" package and its verbatim "What you get" deliverables. This is a **starter subset** of the site's 61 services — full import available on request.
- **Verified:** `tsc --noEmit` clean; seeded to local dev (8 services / 8 packages / 48 deliverables); live smoke on `:4041` — staff login, 401 without auth, list = 8, detail with deliverables, create → id, duplicate-slug → 409, delete → 200.
- **Status:** ✅ done & verified on local dev. **Not deployed — prod untouched.**
- **Next:** Slice 3 — proposal builder + secure-link review.

### 2026-08-13 — Phase 1 · Slice 1: Activation-gate data model
- **Built:** the database foundation for the whole activation gate — service catalog, proposals, agreements/e-signatures, and deposit-aware invoices.
- **New tables (7):** `services`, `service_packages`, `catalog_deliverables`, `proposals`, `proposal_line_items`, `contracts`, `contract_signatures`.
- **Changed:** `leads` (+`estimatedValueCents`, +proposals relation; `LeadStatus` +`PROPOSAL_SENT`/`NEGOTIATION`/`WON`); `lead_inquiries` (+`serviceId`); `invoices` (+`kind`/`proposalId`/`clientOrgId`, and **`projectId` made optional** so a deposit invoice can precede the project — Canon §5); `invoice_line_items` (+`servicePackageId`); enums `NotificationType`/`EmailType`/`JobType`/`FileCategory`/`ActivityType` (+ proposal/contract/deposit events).
- **Files:** `apps/api/prisma/schema.prisma`; migration `20260813164141_phase1_activation_gate`.
- **Decisions:** e-signature = **in-house click-to-sign** (evidence stored: signer, timestamp, hashed IP, content hash); built as one migration.
- **Status:** ✅ done & verified on local dev (`innovatix_dev`, 38 tables). **Not deployed — prod untouched.**
- **Next:** Slice 2 — service catalog API + seed real Innovatix services.
