# Innovatix — Build Log

> **The route we follow, and the record of everything we build.**
> Companion to [`PROJECT-CANON.md`](./PROJECT-CANON.md) — the canon says *what & why*; this file says *in what order*, and (once we start) *what was actually built*.

**Status: ✅ PHASE 1 COMPLETE (on local dev) — the activation gate works end to end.**
Proposal → accept → sign agreement (with PDF copy) → pay deposit → the prospect becomes an activated client with a workspace. Built on branch `feat/phase-1-activation-gate` against a **local dev database only**, verified via live smoke tests at every slice. **Nothing is deployed to production, nothing was charged** — awaiting your review + release decision. Every slice is recorded in the Build Log below.

**Last updated:** 2026-08-14

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
