# Innovatix V1 — Launch-Readiness Report

**Date:** 2026-07-18 · **Branch:** `feat/innovatix-platform-mvp` · **Working tree:** clean
**Scope of this report:** the continuous sprint that finished the remaining ~20% of V1.

---

## Executive summary

The sprint closed every item that was achievable without external credentials or
production infrastructure. The three highest-priority security issues are fixed,
production-readiness is now backed by **executable** tooling (not just docs), the
marketing site and platform have **no remaining "Coming Soon" pages**, and the
whole system is proven to build and pass end-to-end **from a clean database**.

- **Tests:** **168 passing, 0 failing** — 153 backend (37 unit + 115 integration + 1 E2E) + 15 frontend (9 platform-web + 6 systems-web). Up from a 147-backend / 0-frontend baseline.
- **Commits this sprint:** 11 logical milestones (listed below). Tree clean; nothing pushed/deployed.
- **Completion:** **V1 ≈ 93%** (was ~80%). Remaining 7% is provisioning + credentials + owner content sign-off — none of it code.

**Recommendation: GO for staging** — deploy to a staging environment with real
providers in test/sandbox mode and run the shipped smoke test. **Conditional GO
for production** once the external-dependency checklist at the end is satisfied
(secrets, infra, DNS, provider live keys). No code work blocks launch.

---

## What was completed this sprint

### Highest-priority security (all fixed + verified)

| # | Item | What changed | Verified |
|---|------|--------------|----------|
| M1 | Staff payment-link used a **stub** provider | Routed the admin payment-link through the same `checkoutGateway()` (real Stripe) as client checkout; creates a PENDING Payment row; webhook-authoritative | `tsc` + 147 tests green |
| M2 | Client actions logged as **ADMIN** | Added `CLIENT` to the `ActorType` enum (+ migration); 6 portal writes + the authz denial now log `actorType: 'CLIENT'` | migration builds from zero |
| M3 | `/metrics` **publicly scrapable** | Bearer-token gate (timing-safe); **fail-closed** in production; prod boot now requires `METRICS_TOKEN` when metrics are on | live: token→200, no-token→401 |

### Client-user lifecycle (M4)

- `ClientUser.active` column + migration; login rejects deactivated accounts (only after a correct password, so it never leaks account existence); `resolveClientRole` treats an inactive user as revoked so a live token loses access immediately.
- OWNER-only `POST /portal/client-users/:id/{deactivate,reactivate}` — blocks self-deactivation and last-active-OWNER lockout; org-scoped; CLIENT-actorType audit events. **6 new integration tests.**

### Production readiness — now executable (M5–M7)

- **`scripts/backup-db.sh` + `scripts/restore-db.sh`** — real `pg_dump`/`pg_restore`; restore always targets a **fresh** DB and self-verifies (table counts diffed vs. source, orphan-invoice check, migration ledger). **Verified round-trip** (440K dump → restore → PASS).
- **`scripts/verify-prod-config.sh`** + **`apps/api/.env.production.example`** — runs the API's real boot-time guard against a candidate env file under `env -i` (clean shell, no DB, no boot). Passes a complete config; fails weak/missing secrets naming each var. Verified both paths.
- **`scripts/smoke-test.sh`** — probes `/livez`, `/health`, `/readyz` (asserts `db=ok`), `/metrics` gating, and a real `POST /v1/leads`. **Verified 6/6 green** against a live API.

### Website (M8)

- **Every "Coming Soon" page replaced** with real, indexable content: **Company, Solutions, Industries, Technologies, Resources** (honest — no fabricated team size, client counts, or metrics) and **Privacy Policy, Terms of Service, Cookie Policy** (grounded in the system's actual data flows). Added to the sitemap.
- **Case studies audited:** both remain `verified:false` → noindex, empty metrics, excluded from sitemap; descriptions list only real deliverables and carry no compliance/certification claims. **No fabricated claims are published.**

### Platform (M9)

- **Client `/settings`:** account + org, plus OWNER-only **team-member management** (list, role change, deactivate/reactivate, invite) — the deactivation UI, matching the server guards.
- **Staff `/admin/notifications`** (full list, mark-read, deep-link) and **`/admin/settings`** (account + role-capability matrix). Flipped both shells' "Available soon" stubs to live links.

### Support / ticketing (M10)

- **Documented deferral** (`docs/SUPPORT-TICKETING-DECISION.md`): V1 support is covered by portal messaging + notifications + the public contact/lead pipeline; a ticket entity would duplicate the messaging model. Post-V1 design captured for when volume justifies it.

### Testing (M11–M12)

- **Frontend tests (15, new):** staff RBAC UI gating; team-management guards (refactored into a pure, tested `team-guards.ts`); SEO + claims integrity (unverified case studies never indexable/metric-bearing); canonical-host safety.
- **Clean-database E2E (M12):** built the schema from **0→31 tables** via `migrate deploy`, then the full suite passed **153/153**, including the lead→convert→approve→invoice→**pay**→file-authz lifecycle. Documented in `docs/E2E-CLEAN-RUN.md`.

---

## Commits (this sprint, oldest → newest)

| Commit | Milestone |
|--------|-----------|
| `a8c69ae` | feat(billing): route staff payment-link through the real Stripe gateway |
| `979d676` | fix(audit): record client-initiated events as CLIENT, not ADMIN |
| `dd25632` | feat(security): bearer-token gate on /metrics (fail-closed in prod) |
| `c514c83` | feat(portal): client-user deactivation/reactivation (OWNER-gated) |
| `90c77b9` | feat(ops): executable backup + restore scripts (verified round-trip) |
| `cc63ee8` | feat(ops): prod-config verifier, staging smoke test, prod env template |
| `8c35bed` | feat(web): real content for all Coming Soon + legal pages |
| `7a803b6` | feat(platform): client Settings + team management, staff Notifications & Settings |
| `7b53352` | docs: support/ticketing V1 decision — defer, covered by messaging |
| `2a3c08d` | test(web): frontend unit tests for critical journeys (15 tests) |
| `a3d8280` | docs: clean-database end-to-end run results |

---

## Completion by area

| Area | Before | After |
|------|:------:|:-----:|
| Systems marketing site | 75% | **95%** |
| Client portal | 90% | **95%** |
| Staff Delivery OS | 90% | **95%** |
| Backend / API | 90% | **95%** |
| Sales lifecycle | 90% | **92%** |
| Project-delivery lifecycle | 85% | **90%** |
| Production readiness | 70% | **90%** |
| **Entire V1** | **~80%** | **~93%** |

---

## Remaining items — require external credentials or production infrastructure

None are code; all are provisioning or content sign-off:

1. **Provision infra:** managed Postgres (PITR on), S3-compatible bucket (versioned), a reachable ClamAV daemon, a secrets manager, DNS, and a CI/deploy target for staging + prod. (`docs/STAGING.md` has the full topology.)
2. **Real provider credentials** (set in the secrets manager, never committed): Stripe **live** secret + webhook secret, Postmark server token, Cal.com webhook secret, Sentry DSN, alert webhook, S3 keys, strong unique `PORTAL_JWT_SECRET` / `STAFF_JWT_SECRET` / `ABUSE_HASH_SALT` / `PAYMENTS_WEBHOOK_SECRET` / `METRICS_TOKEN`. Validate the filled-in env with `scripts/verify-prod-config.sh` before deploy.
3. **Build-time frontend env:** `NEXT_PUBLIC_SITE_URL` (systems-web) and `NEXT_PUBLIC_PORTAL_API_URL` (platform-web) baked at build for the real hosts.
4. **Schedule backups:** wire `scripts/backup-db.sh` into a nightly cron with an off-account/off-region destination (the script exists; the scheduler + bucket are infra).
5. **Owner content sign-off:** publish case-study metrics once the owner supplies **verified** numbers (flip `verified:true`); a legal review of the Privacy/Terms/Cookie pages is prudent (they are factual but not attorney-reviewed).
6. **Full browser E2E (Playwright):** the next test layer needs browser binaries (an environment dependency) + the running frontends; the pure-logic journey tests are in place as the foundation.

---

## Go / No-Go

**GO to staging now.** Deploy with providers in test/sandbox mode and run
`scripts/smoke-test.sh` against the staging API. Everything that can be verified
locally is green: 168 tests, clean-DB E2E, verified backup/restore, and a
config guard that fails a bad prod env before boot.

**Production: GO once the checklist above is satisfied** — specifically real
secrets (validated by the config verifier), provisioned infra, and DNS. No
engineering work remains as a launch blocker; the outstanding items are
operational (provisioning, credentials) and one owner decision (case-study
metrics).
