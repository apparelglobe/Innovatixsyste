# Tenant isolation

How the platform keeps one tenant's (and one client organization's) data
inaccessible to another, and how that is proven.

## Isolation model

Every business record carries a bare-string `tenantId`; portal records also carry
`clientOrgId` (directly or via their `Project`). Isolation is enforced at the
**application layer** today (not yet DB-level RLS — see below), through three
rings:

1. **Tenant resolution** — the server independently resolves the trusted tenant;
   a tenant id presented by a client is only honored if it *equals* the resolved
   one (`resolveTrustedTenant`). Forged/foreign/missing → fail closed (401).
2. **Scoped queries** — every sensitive fetch folds `tenantId` (+ `clientOrgId` /
   visibility for client routes) into the WHERE clause. A bare `id` can never
   resolve another tenant/org's row. Centralized in `lib/scoped.ts`.
3. **Guards on trust boundaries** — workers and webhooks that resolve a record by
   a globally-unique id verify tenant ownership before acting.

Cross-**tenant** access at the API surface fails closed as **401** (a foreign
tenant token is rejected at the door). Cross-**organization** access inside a
tenant returns **404** (never reveal existence). **403** is reserved for a caller
authorized in the tenant who lacks the role/action (RBAC).

## Tenant resolution

`tenant.ts`:
- `resolveDefaultTenant` / `resolvePublicSiteTenant` — the trusted tenant from
  configuration (`INNOVATIX_DEFAULT_TENANT_SLUG`). Public routes (leads,
  invitation accept, webhooks) NEVER take a tenant id from the request.
- `resolveTrustedTenant(presentedTenantId)` — returns the tenant **only if** the
  presented id matches the resolved one; else `null` → caller returns 401. Single
  decision point for "is a client-presented tenant id authoritative" → "only if it
  equals what the server resolved."
- Staff/client guards (`requireStaff`/`requireSession`) already assert
  `session.tenant === resolvedTenant.id` **and** that the user row exists+active
  in that tenant.

Multi-tenant / custom-domain resolution (host → tenant map) slots into
`resolveTenantFromRequest` later without touching callers.

## Organization scoping

Client routes are scoped to `session.org`. A client can never cross orgs:
`findClientOrgProject` / `findClientOrgInvoice` / `findClientVisibleFile` /
`findClientOrgApproval` / `findClientOrgUser` all require `clientOrgId`.

## Safe-query patterns (`lib/scoped.ts`)

The safe path is the easy path — handlers call helpers instead of hand-writing
`where: { id }`:

| Helper | Scope |
|---|---|
| `findTenantProject/Invoice/File/Approval` | staff: `tenantId` |
| `findClientOrgProject/Invoice/Approval/User` | client: `tenantId` + `clientOrgId` |
| `findClientVisibleFile` | + `isCurrent` + `clientVisible` + `state=AVAILABLE` + not-deleted |
| `assertSameTenant(expected, record)` | worker/webhook ownership guard |

Rule: **no sensitive query uses an id alone.** Route handlers were audited; the
remaining bare `findUnique({where:{id}})` calls are session-owned self-lookups
(`staffUser` by `session.sub`) or internal worker/webhook derivations now covered
by tenant guards.

## Worker rules

Durable jobs carry `tenantId`. The scan worker (`processScanJobs`) loads the file
by `scan.fileId` and **refuses** (`FileScan → DEAD`, `errorCode=TENANT_MISMATCH`,
file stays unavailable) if `file.tenantId !== scan.tenantId`. Lead/email/SLA/
booking jobs resolve their own tenant-owned lead/inquiry from the job's tenant.

## Webhook rules

Signature-verified, then tenant-matched via **trusted stored state**, never the
payload's tenant claim:
- **Payments** — the event resolves a `Payment` by `checkoutSessionId`/
  `paymentIntentId` (created by us with `tenantId`+`clientOrgId`). If the resolved
  payment's `tenantId`/`invoiceId` disagrees with the event's invoice, the webhook
  returns `mismatch`, writes a `PAYMENT_TENANT_MISMATCH` audit, and does NOT
  settle. Replay/amount/currency guards remain.
- **Cal.com** — booking is matched to the lead/tenant via stored references, not
  an arbitrary tenant id in the payload.

## Storage rules

- Object keys are fully tenant-scoped: `tenant/{tenantId}/org/{clientOrgId}/
  project/{projectId}/file/{fileId}/v/{version}/{name}`. A signed URL is bound to
  one object key + signature — it cannot reach another tenant's object.
- Staff file/scan reads are `tenantId`-scoped → cross-tenant metadata = 404.
- Clients get only current, client-visible, scan-clean files; internal-only,
  quarantined, unscanned, non-current, cross-org, and cross-tenant all = 404.
- Version chains (`rootId`) are queried with `tenantId` → a shared `rootId` can't
  leak rows across tenants.

## Schema constraints

Additive tenant-compound indexes (`migration add_tenant_scoped_indexes`):
`Project([tenantId,clientOrgId])` (pre-existing), and new
`Invoice/ProjectFile/Approval/PortalMessage ([tenantId, projectId])`;
`Notification([tenantId,…])` pre-existing.

**Not enforced by composite FK** (documented limitation): Prisma composite foreign
keys across `(tenantId, id)` would be a large, brittle change and are deferred.
Cross-tenant FK integrity (a child referencing a parent in another tenant) is
prevented in application code (scoped writes always set the parent's tenant) and
proven by the cross-tenant test suite. DB-level enforcement arrives with RLS.

## RLS decision (evidence-based)

**Recommendation: defer PostgreSQL RLS until a real second tenant is onboarded
(post-MVP); implement it as a fast-follow, not a launch blocker.**

Why:
- **Connection model.** The API uses one DB role behind **PgBouncer** with a
  shared Prisma pool. RLS needs a per-request tenant GUC
  (`current_setting('app.tenant_id')`). Under transaction-pooling, a session-level
  `SET` does not persist between statements — it must be `SET LOCAL` inside an
  explicit transaction wrapping **every** query. Prisma has no per-request GUC
  hook, so this means routing all reads/writes through a tenant-context
  transaction — a large, risky change.
- **Value now.** There is exactly one tenant. App-layer scoping + fail-closed
  tenant resolution + the cross-tenant test suite already prove isolation.
  Enabling RLS incorrectly (session `SET` under transaction pooling) would either
  silently not enforce (false security) or break queries — strictly worse than the
  current, tested state.

Target design when multi-tenant launches:
- **Tables with RLS:** every tenant-scoped table (leads, client orgs/users,
  projects, milestones, reports, files, file_scans, approvals, portal_messages,
  notifications, invoices, payments, meetings, invitations, audit_events,
  side_effect_jobs).
- **Policies:** `USING (tenantId = current_setting('app.tenant_id')::text)` for
  SELECT/UPDATE/DELETE + `WITH CHECK` on INSERT/UPDATE.
- **Context:** a Prisma middleware / per-request `$transaction` sets
  `SET LOCAL app.tenant_id = $trustedTenantId` (from the resolved tenant, never the
  client) at the start of each request/job transaction.
- **Workers:** set the context from the job's stored `tenantId`.
- **Migrations:** run as the table owner / a `BYPASSRLS` role.
- **Risks:** transaction-wrapping overhead, PgBouncer pooling-mode constraints, a
  migration/superuser role that bypasses policies.

## Test coverage (`test/integration/tenant-isolation.test.ts`, 12 cases)

Foreign/forged tenant token → 401 (staff+client); `resolveTrustedTenant` accepts
only the resolved id; cross-org read/pay/approve/download → 404; internal-only file
never client-downloadable (staff can); tenant-A staff can't read/update a tenant-B
project/invoice/file/scan → 404; scoped helpers never resolve cross-tenant/org ids;
scan worker refuses a tenant-mismatched job (never available); payment webhook
refuses a cross-tenant payment (invoice unpaid); version chains are tenant-scoped;
audit events retain the acting tenant; same-tenant regression (own read/pay/download
still work). Plus existing `isolation.test.ts` (cross-org IDOR → 404) and
`client-rbac.test.ts`.

## Known limitations

- Isolation is app-layer, not DB-enforced (RLS deferred — above).
- No composite FKs across tenant scope (app-code + tests protect it).
- Single default tenant today; multi-tenant resolution is a documented forward hook.

## Completion criteria (this task)

Sensitive routes/workers audited ✓ · two-tenant tests pass ✓ · cross-tenant &
cross-org fail closed ✓ · storage/scan isolation verified ✓ · webhooks tenant-safe
✓ · tenant resolution documented ✓ · unsafe unscoped patterns reduced (scoped
helpers + guards) ✓ · typecheck ✓ · full suites pass ✓ · builds ✓.
