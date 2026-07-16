# Backups & disaster recovery

Backup strategy, retention, restore procedure, a **verified** restore test, PITR
plan, and a DR runbook for the Innovatix API (PostgreSQL + object storage).

## What must survive a disaster

| Asset | Store | Loss impact | RPO target | RTO target |
|-------|-------|-------------|-----------|-----------|
| Relational data (all 31 tables) | PostgreSQL | total — leads, projects, invoices, payments, audit trail | ≤ 5 min (with PITR) / ≤ 24 h (dumps only) | ≤ 1 h |
| Uploaded files | S3-compatible object storage | client deliverables/attachments | provider-durability + versioning | ≤ 1 h |
| Secrets / env | secrets manager (out of band) | cannot boot | n/a (versioned) | minutes |
| Code + migrations | git | rebuildable | n/a | minutes |

Object-storage objects are **content-addressed by key** and referenced from
`project_files`; the DB is the source of truth for *which* files exist, so DB and
bucket must be restored to a **consistent pair** (see DR runbook step 4).

## PostgreSQL backup strategy

Two layers, defense in depth:

1. **Logical dumps (portable, cross-version).** Nightly `pg_dump -Fc` (custom
   format, compressed). Self-contained, restorable into any same-or-newer
   Postgres, ideal for cloning to staging and for granular table recovery.
2. **Continuous archiving / PITR (fine-grained).** A base backup + WAL archiving
   (or the managed provider's PITR) to recover to any second within the retention
   window — the real RPO driver. On managed Postgres (RDS/Cloud SQL/Neon/Supabase)
   this is a checkbox; self-hosted, use `pgBackRest` or WAL-G to object storage.

### Nightly dump (cron / CI)

```bash
export PGPASSWORD="…"
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -Fc -f "innovatix-${STAMP}.dump"
# upload to a *separate* bucket/account from the app's object storage:
aws s3 cp "innovatix-${STAMP}.dump" "s3://innovatix-db-backups/${STAMP}.dump" \
  --sse aws:kms
```

Backups are **encrypted at rest** (KMS/SSE) and stored in a **different account
or region** from production so one compromised credential cannot both corrupt the
DB and delete its backups.

## Object-storage backup strategy

- Enable **bucket versioning** — deletes/overwrites become recoverable prior
  versions (also the malware story: an infected object can be rolled back).
- Enable **cross-region replication** (or a scheduled `aws s3 sync` to a backup
  bucket in another account) for regional-failure survival.
- A lifecycle rule expires noncurrent versions per the retention policy below.
- The app never hard-deletes on the client's behalf; `project_files` state
  transitions leave the object recoverable.

## Retention policy

| Layer | Keep | Where |
|-------|------|-------|
| Nightly dumps | 30 daily, 12 weekly, 12 monthly (GFS) | `innovatix-db-backups` (separate account, KMS) |
| WAL / PITR window | 7 days (tune to RPO vs. cost) | provider-managed or WAL-G bucket |
| Object versions | 90 days noncurrent, then expire | versioned prod bucket + replica |
| Restore-test evidence | keep the latest report in this doc | git |

## Restore procedure (logical dump)

```bash
export PGPASSWORD="…"
# 1. Restore into a FRESH db (never overwrite a live one blind).
createdb -h "$H" -p "$P" -U "$U" innovatix_restore
pg_restore -h "$H" -p "$P" -U "$U" -d innovatix_restore --no-owner --no-acl \
  "innovatix-<stamp>.dump"
# 2. Verify (counts + checksum + FK integrity + migration ledger) — see below.
# 3. Cut over: point DATABASE_URL at the restored db (or rename), redeploy,
#    then run `prisma migrate deploy` to apply any migrations newer than the dump.
```

For **PITR**: restore the base backup, replay WAL to the chosen
`recovery_target_time` (the last-known-good moment, e.g. just before a bad
migration/mass-delete), promote, then verify as below.

## Restore verification — TEST PERFORMED ✅

A real dump → restore → verify cycle was executed against the dev database
(`localhost:5544/innovatix`) on **2026-07-16**. This is not a documented intention
— it ran.

**Method:** fingerprint source → `pg_dump -Fc` → restore into a fresh
`innovatix_restore_test` DB → re-fingerprint → compare → integrity checks → drop.

**Results:**

| Check | Source | Restored | Match |
|-------|--------|----------|-------|
| public tables | 31 | 31 | ✅ |
| `tenants` | 2 | 2 | ✅ |
| `leads` | 59 | 59 | ✅ |
| `projects` | 5 | 5 | ✅ |
| `invoices` | 10 | 10 | ✅ |
| `project_files` | 6 | 6 | ✅ |
| `audit_events` | 169 | 169 | ✅ |
| `payments` | 0 | 0 | ✅ |
| `leads` content checksum (`md5(string_agg(id ORDER BY id))`) | `502987ae8821169700ad993ceb301e41` | `502987ae8821169700ad993ceb301e41` | ✅ identical |

**Integrity on the restored copy:**
- `invoices → projects → tenants` join intact: tenant *Innovatix Systems* = 5
  projects / 10 invoices; second tenant = 0/0. ✅
- Orphan invoices (invoice with no parent project): **0**. ✅
- Migration ledger: **11** applied migrations present in `_prisma_migrations`. ✅

**Timings** (dev dataset, 292 KB compressed dump): `pg_dump` < 0.1 s,
`pg_restore` < 0.2 s. At production scale re-measure and record here; the
procedure is unchanged.

**Cleanup:** `innovatix_restore_test` was dropped after verification; production
and the live dev DB were never touched (restore always targets a fresh DB).

> Re-run this test **quarterly** and after any schema/infra change, updating the
> table above. An unverified backup is a hypothesis, not a backup.

## Disaster-recovery runbook

**Trigger:** primary DB unrecoverable, region outage, or destructive change
(bad migration, mass delete, ransomware).

1. **Declare & freeze.** Page on-call. Take the API to maintenance (scale to 0 or
   nginx 503) so nothing writes to a half-restored state. `/readyz` will already
   be 503 if the DB is gone.
2. **Pick the recovery point.** PITR: the timestamp just before the incident.
   Dumps only: the latest nightly (accept up-to-24 h data loss; record the gap).
3. **Restore the database** into a fresh instance (procedure above). Verify with
   the counts/checksum/FK/migration checks before trusting it.
4. **Reconcile object storage to the DB.** Restore/select the bucket
   version-state closest to the DB recovery point. Then reconcile:
   - rows in `project_files` whose object is missing → mark `MISSING`, notify
     owners (data-loss disclosure);
   - objects with no `project_files` row → leave (orphaned, harmless).
5. **Re-point & migrate.** Set `DATABASE_URL` (+ `S3_*`) to the recovered
   resources; `prisma migrate deploy` to apply migrations newer than the dump;
   redeploy the API.
6. **Smoke test.** `/livez` 200 → `/readyz` 200 (`checks.db==='ok'`) → login →
   list projects → open one invoice → confirm a file download. Watch `/metrics`
   for a clean error rate and drained queues.
7. **Drain queues.** Confirm `sideeffect_jobs_pending` / `scan_jobs_pending` fall
   to baseline; requeue any `DEAD` jobs whose side effect (email/webhook) must
   still fire.
8. **Lift maintenance, communicate, write the post-mortem.** Record actual RPO
   (data-loss window) and RTO (downtime) achieved vs. target in this doc.

## Production-readiness gaps (backup/DR)

- Automated nightly dump + WAL archiving are **not yet provisioned** — this doc
  specifies them; infra work is a prod task (do not run against prod from here).
- The restore test above ran on the **dev** dataset. Repeat once on a
  prod-sized dataset to validate RTO timings before go-live.
- Cross-account/region backup destination and DB↔bucket reconciliation job are
  documented but not yet built.
