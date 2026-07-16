# Increment 3 — Client Portal, Phase 3 (Delivery Operating System) — Checkpoint

**Status:** Phase 3 (P3.1 → P3.7) complete, verified end-to-end, **branch-only** (`chore/po-reconciliation-rehearsal`). Nothing committed, pushed, or deployed. Runs locally: API `:4040`, portal `:3001`, isolated Postgres cluster `:5544`.

**Standing constraints honored:** No fabricated metrics/claims anywhere in the product. Innovatix kept fully separate from Apparel Globe. No commit/deploy without explicit sign-off.

---

## 1. What Phase 3 delivered

A staff-facing **Delivery OS** that authors everything the client portal shows, plus the mechanics that connect the two sides: lead→client conversion, secure files, notifications (in-app + email), an approval state machine, messaging with read receipts, and full invoice detail. Every client-facing record is authored on the staff side, explicitly flagged client-visible vs internal, tenant + org scoped, and audit-logged.

| Sub-phase | Delivered |
|-----------|-----------|
| **P3.1** Internal delivery admin | Staff auth (`inx_staff` cookie, separate JWT secret), RBAC (ADMIN/DELIVERY_LEAD/ENGINEER/VIEWER), `/admin/*` API, 8-tab project workspace UI, projects/leads directories |
| **P3.2** Lead → client conversion | Idempotent `convertLead`: creates org + owner user + project + 5 default milestones, assigns delivery lead, sends portal invite, 3 audit events |
| **P3.3** Secure file storage | `FileStorage` abstraction (Local dev / S3 stub prod), MIME allowlist + size cap + scan hook, authorized-only download, internal files never leak to clients |
| **P3.4** Notifications | `Notification` model + email mirror, polling bell (30s) on both shells, 7 client-facing triggers + client→staff triggers |
| **P3.5** Approval state machine | Typed approvals, single-decision guard (409 on re-decide), approved-milestone auto-DONE through the service path only, requester/approver/note surfaced |
| **P3.6** Messaging | Server-side sanitization, read receipts both directions, unread tracking |
| **P3.7** Invoice detail | Create with line items (+ per-line milestone), status transitions, billing contact, client detail page with totals/pay/download boundary |

---

## 2. Route inventory

### Staff — `/v1/admin/*` (staff-auth + RBAC + tenant-scoped)
```
POST   /admin/auth/login            POST /admin/auth/logout       GET  /admin/me
GET    /admin/staff                 GET  /admin/clients
GET    /admin/projects              POST /admin/projects
GET    /admin/projects/:id          PATCH /admin/projects/:id
POST   /admin/projects/:id/milestones   PATCH /admin/milestones/:id
POST   /admin/projects/:id/reports
POST   /admin/projects/:id/approvals
POST   /admin/projects/:id/messages     POST /admin/projects/:id/messages/read
POST   /admin/projects/:id/invoices     PATCH /admin/invoices/:id   GET /admin/invoices/:id
POST   /admin/projects/:id/members      DELETE /admin/members/:id
POST   /admin/projects/:id/files        GET /admin/files/:id/download   DELETE /admin/files/:id
GET    /admin/leads                  POST /admin/leads/:id/convert
GET    /admin/notifications          POST /admin/notifications/:id/read   POST /admin/notifications/read-all
```

### Client — `/v1/portal/*` (session-auth + tenant + org scoped)
```
POST /portal/auth/login   POST /portal/auth/logout   GET /portal/me
GET  /portal/overview     GET /portal/projects/:id   GET /portal/project
POST /portal/messages     POST /portal/messages/read
GET  /portal/invoices/:id
GET  /portal/files/:id/download
POST /portal/approvals/:id/decide
GET  /portal/notifications  POST /portal/notifications/:id/read  POST /portal/notifications/read-all
```

---

## 3. Data model (Phase-3 additions/extensions)

- **StaffUser** (`StaffRole` ADMIN/DELIVERY_LEAD/ENGINEER/VIEWER) — separate identity from ClientUser.
- **Notification** (`NotificationType` ×10, `RecipientType` CLIENT/STAFF, `read`, `linkPath`) + email mirror via outbox.
- **Approval** — `ApprovalType` (MILESTONE/DELIVERABLE/UAT/CHANGE_REQUEST/DEPLOYMENT), `ApprovalStatus` (PENDING/APPROVED/CHANGES_REQUESTED), `requestedByStaffId`, `decidedByUserId`, `decidedAt`, `note`, `milestoneId`, `relatedType/relatedId`.
- **ProjectFile** — `mimeType`, `storageProvider`, `version`, `uploadedByStaffId`, `clientVisible` (default true), `deletedAt` (soft delete).
- **PortalMessage** — `authorStaffId`, `internal` (default false), `readByClientAt`, `readByTeamAt`.
- **Invoice** — `status` (DRAFT/SENT/PAID/OVERDUE), `billingContactUserId`, `paymentUrl`, `pdfKey`, `issuedAt/dueAt/paidAt`; **InvoiceLineItem** (description, quantity, unitCents, amountCents, milestoneId).
- **ProjectMember** — `staffUserId`, `clientVisible` (internal team members hidden from client).

`requestedByStaffId` / `decidedByUserId` / `billingContactUserId` are intentionally FK-loose (they cross the staff↔client boundary); names are resolved in code via `lib/approvals.ts` and `lib/invoices.ts` enrichment helpers.

---

## 4. RBAC matrix

| Action | ADMIN | DELIVERY_LEAD | ENGINEER | VIEWER |
|--------|:---:|:---:|:---:|:---:|
| project:view | ✓ | ✓ | ✓ | ✓ |
| project:write | ✓ | ✓ | – | – |
| milestone:write | ✓ | ✓ | ✓ | – |
| report:publish | ✓ | ✓ | ✓ | – |
| file:write | ✓ | ✓ | ✓ | – |
| message:reply | ✓ | ✓ | ✓ | – |
| approval:create | ✓ | ✓ | – | – |
| team:assign | ✓ | ✓ | – | – |
| invoice:write | ✓ | ✓ | – | – |
| lead:convert | ✓ | ✓ | – | – |

Enforced by `requireStaff(req, reply, action)` → `can(role, action)` in `staff/rbac.ts`. **Verified:** ENGINEER `POST /admin/.../invoices` → **403**; ENGINEER `PATCH /admin/invoices/:id` → **403**; ENGINEER `GET project` → **200**.

---

## 5. Lead → client conversion sequence

`POST /admin/leads/:id/convert` → `convertLead()` (idempotent):
1. If a `ClientOrg` already links this `leadId` → return it (no duplication).
2. Create `ClientOrg{ leadId }`.
3. Reuse or create `ClientUser` (role OWNER, temp password; returned only when `NODE_ENV≠production`).
4. Create `Project{ leadId }` + 5 default milestones.
5. Assign the acting staff as **Delivery Lead** (`ProjectMember`).
6. Mark lead `CONVERTED`.
7. Write 3 audit events; send `PORTAL_INVITE` email (durable outbox).

Previously verified: converted client logged in, saw only their own project, isolation held, re-running was a no-op.

---

## 6. File-storage architecture

`storage/` — `FileStorage` interface (`put/getStream/getSignedUrl/delete`), `LocalStorage` (dev, path-traversal-safe `safeKeyPath`), `S3StorageStub` (prod boundary). `validateUpload` enforces MIME allowlist + `MAX_FILE_BYTES`; `scanFile` hook stubbed for AV. Uploads via `@fastify/multipart` (1 file, size-capped). Downloads are **always authorized** — never public URLs: staff `GET /admin/files/:id/download` (tenant-scoped), client `GET /portal/files/:id/download` (tenant + org + `clientVisible` + not-deleted, else 404). On S3 the client path 302s to a 300s signed URL.

Previously verified: staff upload → client download returns real bytes; internal file → client **404**; unauthenticated → **401**; bad MIME → **400**; bytes on disk not publicly reachable.

---

## 7. Notification catalog

`NotificationType`: `REPORT_PUBLISHED`, `MILESTONE_UPDATED`, `APPROVAL_REQUESTED`, `APPROVAL_COMPLETED`, `FILE_UPLOADED`, `CLIENT_MESSAGE`, `TEAM_MESSAGE`, `INVOICE_CREATED`, `INVOICE_DUE`, `PROJECT_STATUS_CHANGED`.

| Trigger (author) | → recipient | Type | Email |
|---|---|---|:--:|
| Report published (staff) | client org | REPORT_PUBLISHED | ✓ |
| Milestone updated (staff) | client org | MILESTONE_UPDATED | ✓ |
| File uploaded, client-visible (staff) | client org | FILE_UPLOADED | ✓ |
| Approval requested (staff) | client org | APPROVAL_REQUESTED | ✓ |
| Team message, non-internal (staff) | client org | TEAM_MESSAGE | ✓ |
| Invoice sent (staff) | client org | INVOICE_CREATED | ✓ |
| Project status changed (staff) | client org | PROJECT_STATUS_CHANGED | ✓ |
| Client message (client) | all assigned staff | CLIENT_MESSAGE | ✓ |
| Approval decided (client) | all assigned staff | APPROVAL_COMPLETED | ✓ |

Delivery: in-app `Notification` row + email mirror (`NOTIFICATION` type through durable outbox → dev Outbox / prod Postmark). UI: `NotificationBell` polls every 30s, unread badge, mark-one / mark-all-read, click → `linkPath`. Sockets deliberately not used (polling is sufficient and simpler to operate).

---

## 8. Approval state machine

```
                 staff: POST /admin/.../approvals
                              │
                              ▼
                        ┌───────────┐
                        │  PENDING  │
                        └─────┬─────┘
        client: POST /portal/approvals/:id/decide (once)
                    │                         │
             decision=APPROVED         decision=CHANGES_REQUESTED
                    ▼                         ▼
             ┌────────────┐          ┌──────────────────────┐
             │  APPROVED  │          │  CHANGES_REQUESTED    │
             └─────┬──────┘          └──────────┬───────────┘
    if type=MILESTONE → milestone.status=DONE   │
    (mutation happens ONLY on this path)        │
                    └───────────┬───────────────┘
                                ▼
                notifyStaff(APPROVAL_COMPLETED, email)
                          + audit + activity
```

- **Single decision:** any non-PENDING approval rejects re-decide with **409** — prevents re-triggering the milestone mutation or re-notifying.
- **Related-object mutation is gated:** the milestone only moves to DONE through the approval decision transaction, never by a direct client write.
- **Provenance surfaced:** `requestedByName` (staff) + `decidedByName` (client) + `note` shown on both staff and client views.

---

## 9. End-to-end verification (this session)

All run against the live local stack after `pm2 restart inx-api`.

**Notifications (P3.4)**
- Staff publishes report → client `Notification` (REPORT_PUBLISHED) **+1**, `NOTIFICATION` email queued **+1**.
- Client unread `4 → 3` after marking one read.
- Client message → **3** assigned staff each get CLIENT_MESSAGE + email.

**Approvals (P3.5)**
- Staff requests MILESTONE approval (`requestedByStaffId` set).
- Client approves **with note** → status `APPROVED`, note stored, `decidedByUserId` set, **milestone → DONE**.
- Re-decide closed approval → **409**.
- Portal detail surfaces `requestedByName="Sam Admin"`, `decidedByName="Dana Okoro"`.

**Messaging (P3.6)**
- Team messages unread-by-client `3 → 0` after client `messages/read`.
- Client messages unread-by-team `3 → 0` after staff `messages/read`.
- `<script>alert(1)</script> hi` stored as `alert(1) hi` (tags stripped).

**Invoices (P3.7)**
- Create SENT with 2 line items (one milestone-linked) → total **400000¢** (250000 + 2×75000) ✓, 2 line items, status SENT.
- Client notified INVOICE_CREATED + audit written.
- Client detail enriches line-item milestone name → `"Discovery & Planning"`.
- Mark PAID → status PAID + `paidAt` set + `INVOICE_PAID` audit.

**Security / isolation**
- ENGINEER invoice create/patch → **403**; view → **200**.
- Unauthenticated portal invoice / admin invoice-create → **401**.
- Fabricated invoice id (wrong scope) → **404**.
- Client project detail excludes `internal` messages and non-`clientVisible`/deleted files (P3.3 fix, still holds).

**Build gates:** API `tsc --noEmit` ✓, portal `tsc --noEmit` ✓, portal `next build` ✓ (new `/invoices/[id]` route emitted).

---

## 10. UI surfaces (live, viewable at localhost)

Screenshots not captured in this headless session — the stack is running for live review:
- **Staff Delivery OS** (`localhost:3001/admin`): projects list, project workspace tabs **Overview / Milestones / Reports / Approvals / Messages / Team / Files / Invoices / Activity**, leads + Convert, notification bell.
- **Client portal** (`localhost:3001/`): Overview (pending-approval action with note), Milestones, Reports, Files, Invoices (list → detail page with line items + pay/download), Messages (read receipts), Team, notification bell.

*(If you want PNGs committed to the report, I can add a headless-screenshot pass — say the word.)*

---

## 11. Blockers / known boundaries (all intentional, none blocking)

1. **PDF & payment are provider stubs.** `pdfKey`/`paymentUrl` render buttons only when present; no PDF generator or Stripe wired yet (deliberate boundary — Phase 4 candidate).
2. **S3 is a stub** in prod config; local uses disk. Real bucket + AV scanner are deploy-time wiring.
3. **Billing contact picker** not yet in the invoice-create UI (API accepts `billingContactUserId`; needs a client-user list endpoint for the dropdown).
4. **Single-tenant** resolved via `resolveDefaultTenant`; multi-tenant onboarding UI is out of scope for Phase 3.
5. **Email in dev** lands in the Outbox transport (not actually sent); prod needs Postmark keys.

---

## 12. Recommended Phase 4

1. **Billing completion:** PDF generation (server render → `pdfKey`) + Stripe/hosted-invoice `paymentUrl`, with a webhook that flips status to PAID and notifies — closes the invoice loop end-to-end.
2. **Client-user & org management:** invite additional client users, roles beyond OWNER, billing-contact picker.
3. **File hardening for prod:** real S3 + signed uploads + AV scan enforcement + versioned history UI.
4. **Notification preferences & digest:** per-user email opt-in/out, daily digest, and (only if warranted) websockets for live delivery.
5. **Reporting/analytics for staff:** portfolio dashboard (open approvals, overdue invoices, unread client messages) across projects.

**Suggested order:** billing completion first (highest client-visible value and the most obvious current stub), then client-user management, then prod file hardening.

---

## 13. Phase 4 — Billing completion (DELIVERED, branch-only)

The top Phase-4 recommendation is done and verified. Built behind a **provider boundary** with a zero-dependency stub (mirrors the storefront Stripe-stub pattern); a real Stripe provider slots in behind the same interfaces with no route changes.

**New backend**
- `billing/pdf.ts` — hand-assembled, **zero-dependency** valid PDF renderer (`renderInvoicePdf` / `renderInvoicePdfFrom`).
- `billing/payments.ts` — `PaymentProvider` interface + `StubPaymentProvider` (`createPaymentLink`, HMAC `verifyWebhook`, `parseEvent`, `signPaymentWebhook`).
- `billing/mark-paid.ts` — single idempotent paid-transition (audit + activity + client & staff notify) shared by the webhook and the demo endpoint.
- `billing/index.ts` — provider factory (`PAYMENTS_PROVIDER` = stub|stripe).
- Config: `PAYMENTS_PROVIDER` (default `stub`), `PAYMENTS_WEBHOOK_SECRET`.

**New routes**
```
POST /admin/invoices/:id/payment-link     (invoice:write) → provider hosted-pay URL, stored + audited
GET  /admin/invoices/:id/pdf              (project:view)  → on-demand application/pdf
GET  /portal/invoices/:id/pdf             (session+org, non-DRAFT only) → on-demand application/pdf
POST /portal/invoices/:id/pay-demo        (session+org, non-prod + stub only) → simulates provider callback
POST /webhooks/payments                   (public, HMAC-verified) → idempotent invoice→PAID + notify
```

**New UI** — client invoice detail: always-available **Download PDF** (non-draft) + **Pay** button; new **`/pay/[id]`** demo hosted-checkout page. Admin Invoices tab: **PDF** link, **Payment link** button (then **Link ✓**), status controls.

**Verified E2E**
- PDF streams `application/pdf` for staff + client; `file` reports *"PDF document, version 1.4, 1 pages"* (valid xref/startxref/%%EOF).
- Payment link created + audited (`INVOICE_PAYMENT_LINK`); creating one on a PAID invoice → **409**.
- Webhook: bad signature → **401**; valid HMAC → invoice **PAID** + `paidAt` + client notify **+1** + staff notify **+3** + `INVOICE_PAID` audit.
- **Idempotent:** replayed webhook → `already`, **0** extra notifications.
- Demo-pay (dev-only) → PAID; cross-org/unknown id → **404**; DRAFT invoice PDF for client → **404**.

**Remaining boundaries:** swap `StubPaymentProvider` for Stripe (checkout session + real signature) and, if desired, persist rendered PDFs to `pdfKey` via the storage layer instead of rendering on demand. Neither blocks the loop — it is fully functional today in stub mode.

---

## 14. Phase 4 — Client-user & org management (DELIVERED, branch-only)

Second Phase-4 recommendation done. Staff can now grow a client organization beyond its single converted OWNER, and the billing-contact picker (an open item from §11) is wired.

**New backend**
- `admin/client-users.ts` — `inviteClientUser` helper: creates a `ClientUser` (bcrypt temp password), sends `PORTAL_INVITE`, audits. Idempotent on email within a tenant (re-invite = re-send, no duplicate); an email owned by a *different* org is rejected (409).
- Routes (all staff-auth + tenant-scoped):
```
GET   /admin/projects/:id/client-users     (project:view) → org contacts (id, name, email, role, lastLoginAt)
POST  /admin/projects/:id/client-users     (team:assign)  → invite MEMBER/OWNER, sends portal invite
PATCH /admin/client-users/:id              (team:assign)  → change role (OWNER/MEMBER), audited
```

**New UI** — admin project **Team** tab now has a *Client contacts (portal access)* section: list with last-sign-in, per-contact role dropdown, and an invite form. The **invoice-create** form gained a **billing-contact picker** populated from the org's contacts.

**Verified E2E**
- Invite MEMBER → `isNew=true`, temp password issued, `CLIENT_USER_INVITED` audit, `PORTAL_INVITE` email **SENT**; the invited user **logs into the portal** with that password.
- Promote to OWNER via PATCH → role updated + `CLIENT_USER_ROLE_CHANGED` audit.
- Billing-contact picker: invoice created with the contact → detail enriches `billingContactName` ("Riley Chen").
- **Dedupe:** re-invite same email/same org → `isNew=false`, still **1** user row.
- **RBAC:** ENGINEER invite → **403**; ENGINEER view contacts → **200**.

**Remaining boundary:** client-side self-serve (an OWNER inviting teammates from the portal) and user deactivation (needs a `ClientUser.active` column) are not yet built — staff-driven management covers the delivery-OS model today.

---

## 15. Phase 4 — File hardening (DELIVERED, branch-only)

Third Phase-4 recommendation, local-safe subset: file **versioning** + **scan enforcement** in the code path. (Real S3 wiring + prod AV remain deploy-time — untouched, prod NOT migrated.)

**Schema** (dev migration `file_versioning` on the isolated :5544 cluster; prod NOT migrated)
- `ProjectFile.rootId` (version-chain group; self for v1), `isCurrent` (only latest non-deleted is current), `scanStatus`. Existing rows backfilled `rootId = id`.

**Versioning** — `POST /admin/projects/:id/files?replaceId=<fileId>` uploads a **new version**: bumps `version`, keeps the chain (`rootId`), sets the new row `isCurrent` and demotes the prior one in a transaction, audits `FILE_VERSIONED`, notifies the client "Updated file … (vN)". Lists show **current only** — admin detail (`isCurrent:true`), portal (`clientVisible + isCurrent`). History via `GET /admin/files/:id/versions`.

**Scan enforcement** — `scanFile` now catches the **EICAR** test signature and **executable magic bytes** (MZ/ELF/Mach-O) and the upload path rejects with the reason before persisting; clean uploads record `scanStatus='clean'`. Swaps for a real scanner (ClamAV/API) behind the same signature.

**UI** — admin **Files** tab: version badge (`v2`), **New version** per-file uploader, **History** expander (per-version download, current/deleted flags).

**Verified E2E**
- v1 upload → `rootId=id`, `isCurrent=true`, `scanStatus=clean`.
- New version via `replaceId` → **v2** current, **v1** demoted (`isCurrent=false`), same `rootId`, `FILE_VERSIONED` audit.
- Admin detail + client both show **current only** (`spec_v2 v2`); history endpoint returns `v2(cur), v1`.
- Scan: EICAR → **400** `eicar_test_signature`; MZ executable → **400** `executable_blocked:DOS/PE`; neither persisted.
- **Access hardening (bug caught + fixed):** portal file download now also requires `isCurrent` — client fetch of a superseded version → **404**, current → **200**; staff retains full history download (**200**).

**Remaining boundary:** production object storage (real S3 bucket + signed uploads) and a real AV scanner are deploy-time wiring; the version model + enforcement path are done and prod-ready behind the existing `FileStorage` / `scanFile` seams.
