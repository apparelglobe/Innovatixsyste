# Tenant & organization isolation

How Innovatix keeps one tenant's (and one client organization's) data unreachable
by another, and how future developers are steered onto the safe path.

## Isolation model

Two nested scopes on every business record:
- **`tenantId`** — the top-level boundary (Innovatix vs. a future client tenant).
- **`clientOrgId`** — the client-organization boundary *inside* a tenant (portal
  users never cross orgs).

Isolation is **application-layer** today (no RLS yet — see below). Every sensitive
query folds the scope into its `WHERE`; a bare `id` never resolves a record.

## Tenant resolution (trusted sources only)

`src/tenant.ts`:
- `resolveDefaultTenant` / `resolvePublicSiteTenant` — the trusted tenant from
  config (`INNOVATIX_DEFAULT_TENANT_SLUG`). Public routes (leads, invitation
  accept, webhooks) **never** take a tenant id from the request.
- `resolveTrustedTenant(presentedTenantId)` — accepts a session/JWT/job tenant id
  **only if it equals** the server-resolved tenant; a forged or foreign id → `null`
  → caller fails closed. This is the single decision point for "is a
  client-presented tenant id authoritative?" — answer: only if it matches.

`requireStaff` / `requireSession` enforce this: a JWT whose `tenant` ≠ the resolved
tenant is rejected **401** (a foreign-tenant token never even reaches a record).
Multi-tenant / custom-domain resolution (host → tenant map) slots in here later
with no record redesign.

## Safe-query patterns (`src/lib/scoped.ts`)

The safe path is the easy path — helpers fold scope in so route handlers stop
hand-writing `where: { id }`:
- Staff scope (tenant): `findTenantProject`, `findTenantInvoice`, `findTenantFile`,
  `findTenantApproval`.
- Client scope (tenant + org): `findClientOrgProject`, `findClientOrgInvoice`,
  `findClientOrgApproval`, `findClientOrgUser`, `findClientVisibleFile` (adds
  `clientVisible` + `isCurrent` + `state=AVAILABLE`).
- `assertSameTenant(expected, record)` for worker/webhook guards.

A `null` result → **404** (never reveal existence). Portal invoice/file handlers
were refactored onto these; the remaining handlers already scope inline (audited).

## Organization scoping

Portal routes always add `project: { clientOrgId: session.org }` (or
`clientOrgId`). A cross-org id → 404. OWNER/MEMBER RBAC is orthogonal and layered
on top (`client/rbac.ts`).

## Worker rules

Jobs carry `tenantId` (set by scoped code at enqueue). Workers that load a record
by id verify ownership:
- **Scan worker** (`processScanJobs`): if `fileScan.tenantId ≠ projectFile.tenantId`
  → refuse (`FileScan` → DEAD `TENANT_MISMATCH`, file never becomes AVAILABLE).
- Lead side-effect jobs load the job's own `leadId`/`inquiryId` (job carries the
  tenant); no global-id-then-mutate.

## Webhook rules

External callbacks never trust a tenant id in the payload:
- **Stripe** (`process-webhook.ts`): resolves the invoice by
  `client_reference_id`, resolves the Payment by session/intent id, then **guards**
  `payment.tenantId === invoice.tenantId && payment.invoiceId === invoiceId` —
  a mismatch → `PAYMENT_TENANT_MISMATCH` audit + refuse (invoice not settled).
  Replay ledger is `(provider, providerEventId)`.
- **Cal.com**: booking is matched to the lead via HMAC-verified signature +
  stored linkage, not a payload tenant id.

## Storage rules

- Object keys are fully scoped: `tenant/{tenantId}/org/{clientOrgId}/project/{projectId}/file/{fileId}/v/{version}/{name}` — a signed URL is per-object, so a Tenant-A URL can't reach a Tenant-B object.
- Staff file/scan reads are `findFirst({ tenantId, … })` → cross-tenant → 404.
- Client downloads require `clientVisible` + `AVAILABLE` → internal-only,
  quarantined, and unscanned files are never client-reachable.
- Version chains are queried by `{ tenantId, rootId }` → a shared `rootId` cannot
  leak a cross-tenant version (tested).

## Test coverage (`test/integration/tenant-isolation.test.ts`, 12 cases)

Foreign/forged tenant token → 401 (staff + client); `resolveTrustedTenant`
forged/missing → null; cross-org read/pay/approve/download → 404; internal-only
file unreachable by clients / reachable by staff; Tenant-A staff → Tenant-B
project/invoice/file/scan read + project update → 404; scoped helpers never cross
tenant/org; scan worker refuses tenant-mismatch; payment webhook refuses
cross-tenant settlement; version chain tenant-scoped; audit under the acting
tenant only; same-tenant regression (read/pay/download own). Plus the existing
`isolation.test.ts` (IDOR 404s) and `client-rbac.test.ts`.

## Schema constraints

Additive compound indexes lead with `tenantId`
(`add_tenant_scoped_indexes`): `Project [tenantId,clientOrgId]`, `Invoice`/
`ProjectFile`/`Approval`/`PortalMessage [tenantId,projectId]`, `Notification
[tenantId,recipientType,…]`, plus the lead-pipeline tables. **Composite foreign
keys were not added** — Prisma's composite-FK ergonomics + migration cost aren't
justified while a single tenant exists; cross-tenant FK integrity is instead
enforced in application code + proven by the worker/webhook/version tests above.
This is the main relationship that is **not** DB-enforced today (documented for the
RLS follow-up).

## RLS assessment (evidence-based)

**Recommendation: schedule RLS immediately *after* MVP / at first real second
tenant — do not enable it now.**

- **Which tables:** all tenant-scoped tables (client_orgs, client_users, projects,
  milestones, project_reports, project_files, file_scans, approvals,
  portal_messages, notifications, invoices, invoice_line_items, payments,
  client_invitations, audit_events, leads + lead_* , side_effect_jobs, meetings).
- **Proposed policy shape:** `USING (tenant_id = current_setting('app.tenant_id', true))`
  for SELECT/UPDATE/DELETE, `WITH CHECK` on INSERT.
- **Setting request context:** `SET LOCAL app.tenant_id = $1` at the start of each
  request/job transaction.
- **Prisma interaction — the blocker:** the app runs Prisma over **PgBouncer** in a
  shared pool with **one DB role**. `SET LOCAL` only holds inside an explicit
  transaction, so **every** query would have to run inside `prisma.$transaction`
  with the tenant set first — a large, invasive refactor — and a missed `SET`
  fails *open* (no rows or, worse, cross-tenant if a superuser-ish role bypasses
  RLS). Setting a non-transaction session var over a shared pooled connection is
  unsafe (leaks across requests).
- **Workers & migrations:** workers would set `app.tenant_id` per job transaction;
  migrations/seed run as a BYPASSRLS role.
- **Risks now:** invasive transaction-wrapping refactor, PgBouncer session-var
  hazards, fail-open on a missed `SET`, and — with exactly one tenant — **zero
  marginal protection** over the audited app-layer scoping. Enabling RLS blindly
  against the current connection model would add outage risk without security gain.
- **Decision:** rely on hardened app-layer scoping + the two-tenant test suite for
  MVP; implement RLS as a fast-follow when onboarding a second real tenant, at
  which point the transaction-scoped tenant context + a dedicated non-superuser app
  role are introduced together.

## Known limitations

- Isolation is app-layer (no RLS yet) — see above.
- No composite FKs — cross-tenant reference integrity is code-enforced + tested.
- Single default tenant today; multi-tenant/custom-domain resolution is stubbed at
  `resolvePublicSiteTenant`/`resolveTrustedTenant`.

## Completion criteria (this task)

Sensitive routes + workers audited ✓ · two-tenant tests pass ✓ · cross-tenant &
cross-org fail closed (404/401) ✓ · storage + scan isolation verified ✓ · webhooks
tenant-safe ✓ · tenant-resolution documented ✓ · unsafe unscoped patterns reduced
(scoped helpers + guards) ✓ · typecheck + full suites + builds pass ✓.
