# Staging & deployment readiness

A staging environment that mirrors production so every change is exercised
against real integrations (in test mode) before it reaches customers. Includes
the full env-var matrix, deployment checklist, and rollback checklist.

## Why staging exists

Dev runs on stubs (`STORAGE_PROVIDER=local`, `MALWARE_SCANNER_PROVIDER=stub`,
`PAYMENTS_PROVIDER=stub`, `EMAIL_TRANSPORT=outbox`). Production runs on the real
things. **Staging is where the real providers run in their test/sandbox modes** —
S3 test bucket, ClamAV daemon, Stripe test keys, Postmark, Cal.com sandbox — so
integration bugs surface here, never in front of a paying client.

## Topology (mirror of prod, smaller)

| Component | Prod | Staging |
|-----------|------|---------|
| API (`apps/api`, Fastify :4040) | N replicas behind nginx | 1 replica |
| platform-web (Next :3001) | N replicas | 1 replica |
| systems-web (Next public site) | N replicas | 1 replica |
| PostgreSQL | managed, PITR on | managed small tier or dedicated container, **separate DB & credentials** |
| Object storage | prod bucket, versioned+replicated | **separate** `innovatix-staging` bucket, test keys |
| ClamAV | daemon (`clamd`) reachable on 3310 | same, own instance |
| Email | Postmark live stream | Postmark **test/sandbox** stream |
| Payments | Stripe live | Stripe **test** keys + test webhook secret |
| Cal.com | live event + webhook | sandbox event + its webhook secret |
| Monitoring | Sentry + Prometheus + alert webhook | same, **separate** Sentry project + a staging alert channel |

Staging shares **no** credentials, buckets, DBs, or secrets with prod. A staging
bug must never be able to read, write, email, charge, or page against prod.

## Environment-variable matrix (`apps/api`)

`stg` = staging, `prod` = production. "secret" = store in a secrets manager, never
in git. Defaults come from `apps/api/src/config.ts`.

| Var | Dev default | Staging | Production | Notes |
|-----|-------------|---------|-----------|-------|
| `NODE_ENV` | development | `production` | `production` | staging runs prod code paths |
| `PORT` | 4040 | 4040 | 4040 | |
| `DATABASE_URL` | local :5544 | **stg DB** (secret) | **prod DB** (secret) | distinct instances |
| `INNOVATIX_DEFAULT_TENANT_SLUG` | innovatix-systems | innovatix-systems | innovatix-systems | trusted-tenant resolver |
| `LEADS_ALLOWED_ORIGINS` | localhost | stg site origin | prod site origin(s) | CORS allow-list |
| `PORTAL_WEB_ORIGIN` | localhost:3001 | stg portal origin | prod portal origin | CORS + cookie |
| `LEADS_RATE_LIMIT_MAX` / `_WINDOW_MS` | 5 / 10m | prod values | tuned | anti-abuse |
| `ABUSE_HASH_SALT` | dev-salt-change-me | **unique secret** | **unique secret** | must change off default |
| `PORTAL_JWT_SECRET` | dev-…-change-me | **unique secret** | **unique secret** | must change off default |
| `STAFF_JWT_SECRET` | dev-…-change-me | **unique secret** | **unique secret** | must change off default |
| `EMAIL_TRANSPORT` | outbox | `postmark` | `postmark` | outbox = DB only |
| `EMAIL_FROM` / `EMAIL_INTERNAL_TO` | defaults | stg addresses | prod addresses | |
| `POSTMARK_SERVER_TOKEN` | '' | **test token** (secret) | **live token** (secret) | |
| `POSTMARK_MESSAGE_STREAM` | outbound | outbound | outbound | |
| `DEV_OUTBOX_VIEWER` | true | **false** | **false** | dev-only outbox route |
| `CALCOM_WEBHOOK_SECRET` | '' | **sandbox secret** | **live secret** | HMAC verify |
| `CALCOM_EVENT_URL` | default | sandbox event | live event | |
| `STORAGE_PROVIDER` | local | `s3` | `s3` | |
| `S3_ENDPOINT`/`S3_REGION`/`S3_BUCKET` | — | stg bucket | prod bucket | separate buckets |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | — | **stg keys** (secret) | **prod keys** (secret) | least-privilege |
| `S3_FORCE_PATH_STYLE` / `S3_SIGNED_URL_TTL_SECONDS` | defaults | per-provider | per-provider | |
| `MAX_FILE_BYTES` / `STORAGE_ALLOW_ARCHIVES` | 25MB / false | prod values | prod values | |
| `MALWARE_SCANNER_PROVIDER` | stub | `clamav` | `clamav` | |
| `CLAMAV_HOST` / `CLAMAV_PORT` | '' / 3310 | stg clamd | prod clamd | |
| `CLAMAV_REQUIRED_IN_PRODUCTION` | true | **true** | **true** | boot fails if scanner unreachable in prod |
| `CLAMAV_TIMEOUT_MS` / `_MAX_FILE_BYTES` / `SCAN_INLINE_MAX_BYTES` | defaults | prod values | prod values | |
| `PAYMENTS_PROVIDER` | stub | `stripe` | `stripe` | |
| `STRIPE_SECRET_KEY` | '' | **test key** (secret) | **live key** (secret) | |
| `STRIPE_WEBHOOK_SECRET` | whsec_dev… | **test whsec** (secret) | **live whsec** (secret) | signature verify |
| `PAYMENTS_WEBHOOK_SECRET` | dev-…-secret | **unique secret** | **unique secret** | stub-provider HMAC |
| `LOG_LEVEL` | info | info | info | |
| `SENTRY_DSN` | '' | **stg project DSN** | **prod project DSN** | separate projects |
| `ALERT_WEBHOOK_URL` | '' | **stg channel** | **prod channel** | separate channels |
| `METRICS_ENABLED` | true | true | true | gate `/metrics` at nginx |
| `AUTH_FAIL_ALERT_THRESHOLD` / `_WINDOW_MS` | 25 / 60s | prod values | tuned | brute-force alert |
| `PORTAL_INVITE_TTL_HOURS` | 168 | 168 | 168 | |
| `OUTBOX_POLL_MS` / `OUTBOX_MAX_ATTEMPTS` | 2000 / 6 | prod values | prod values | worker |

> **Boot-time validation:** `config.ts` parses all of this through Zod and the
> process **refuses to boot** on a missing/invalid required var (e.g. empty
> `DATABASE_URL`) — a misconfigured deploy fails fast instead of half-running.
> Frontends have their own `NEXT_PUBLIC_*` (API base URL, site URL) — set at
> **build time**; a rebuild is required to change them.

## Executable tooling (run these)

The checklist below is backed by runnable scripts — not just prose:

```bash
scripts/verify-prod-config.sh apps/api/.env.production   # clean-env config guard (no boot, no DB)
scripts/backup-db.sh                                     # pre-deploy backup (rollback point)
scripts/smoke-test.sh https://staging-api.innovatixmarketing.com   # post-deploy smoke test
```

- **`verify-prod-config.sh`** runs the API's real boot-time guard (`src/config.ts`
  Zod schema + `validateProductionSecrets`) against a candidate env file under
  `env -i` (a genuinely clean shell) — a missing/weak/placeholder secret or an
  absent provider key fails here, naming each var, before you ever deploy. A
  filled-in copy of `apps/api/.env.production.example` passes; the template
  itself is the self-test.
- **`smoke-test.sh`** probes a running API: `/livez`, `/health`, `/readyz`
  (asserts `db=ok`), that `/metrics` is token-gated (401 without a bearer token
  when `METRICS_TOKEN` is set), and a real `POST /v1/leads` write. Exit 0 = all
  green. Set `METRICS_TOKEN` to also verify the authorized `/metrics` path;
  `SKIP_LEAD=1` for a read-only probe.

## Deployment checklist (staging & prod are identical steps)

**Pre-deploy**
- [ ] Green CI: `npm run typecheck`, full test suite (unit + integration + e2e), both web builds.
- [ ] New/changed migrations reviewed; confirmed **forward-only & backward-safe** (additive; no destructive change without a two-phase plan).
- [ ] Env-var diff applied in the secrets manager (any new var from the matrix above present in the target env **before** deploy).
- [ ] Backup taken / confirmed recent (see BACKUP-DR.md) — the rollback point.

**Deploy**
- [ ] `prisma migrate deploy` (never `migrate dev` outside local) against the target DB.
- [ ] Roll out the API build; wait for `/livez` 200 then `/readyz` 200 (`checks.db==='ok'`) before shifting traffic.
- [ ] Roll out platform-web / systems-web (rebuilt with the env for that tier).

**Post-deploy smoke (staging = full; prod = read-mostly)**
- [ ] `/readyz` reports db `ok`, correct scanner + storage provider.
- [ ] Submit a lead → row created, SLA timer set, internal email sent (Postmark test).
- [ ] Portal login → open a project → view an invoice.
- [ ] Upload a file → scan runs → **EICAR test string is quarantined** (proves ClamAV live).
- [ ] Stripe **test** checkout → webhook settles the invoice → `payments_total{result="paid"}` increments.
- [ ] Cal.com sandbox booking webhook accepted (HMAC verified).
- [ ] `/metrics` shows a clean error rate, drained queues; no unexpected `job.dead`/`scan.failed` alerts.
- [ ] Trigger one deliberate 401 storm in staging → confirm `auth.bruteforce` alert reaches the staging channel.

## Rollback checklist

Rollback is code-first (fast, safe); data rollback is last resort.

- [ ] **Code:** redeploy the previous build artifact / image tag. Confirm `/readyz` 200. (Blue-green or keep the prior release ready to re-point.)
- [ ] **Migration:** prefer **roll-forward** (a new corrective migration). Only restore from backup (BACKUP-DR.md) if a migration destroyed/corrupted data — that is a DR event, incurs data loss back to the backup, and needs the DB↔bucket reconciliation step.
- [ ] **Config:** revert the env/secret change; restart (Zod re-validates at boot).
- [ ] **Feature flag / provider:** if a real provider misbehaves, flip it to its stub/safe mode (`PAYMENTS_PROVIDER=stub`, etc.) to degrade gracefully rather than fail hard, then investigate.
- [ ] **Verify + communicate:** smoke-test the restored path, watch `/metrics` recover, post status, write the post-mortem.

## Production-readiness gaps (staging/deploy)

- Staging environment is **specified here but not yet provisioned** — infra
  (DB, buckets, ClamAV, secrets, DNS, CI target) is a prod task and out of scope
  for the local-only work. The config guard, backup, and smoke-test scripts are
  built and verified locally; they run against the staging hosts once those
  exist.
- CI does not yet auto-deploy; deploys are manual per this checklist (the smoke
  test + config verifier are the automation hooks a pipeline would call).
- Migration policy is documented (forward-only, additive) but not yet enforced by
  a CI check.
- `NEXT_PUBLIC_*` for staging frontends must be finalized when the staging
  hostnames are chosen (build-time bake).
