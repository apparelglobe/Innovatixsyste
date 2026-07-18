# Clean-database end-to-end run — RESULTS

A complete end-to-end run executed against a database built **from zero** on
**2026-07-18**. This is not a documented intention — it ran, and this records the
actual output.

## Method (reproducible)

```bash
# 1. Create a brand-new empty database (0 tables).
psql -d postgres -c "CREATE DATABASE innovatix_e2e_test;"
psql -d innovatix_e2e_test -c "CREATE EXTENSION IF NOT EXISTS citext;"

# 2. Build the schema from zero with forward-only migrations (no reset, no seed).
DATABASE_URL_TEST=postgresql://…/innovatix_e2e_test npm run test:db:prepare   # prisma migrate deploy

# 3. Run the ENTIRE suite against the clean DB.
DATABASE_URL_TEST=postgresql://…/innovatix_e2e_test npm test                  # unit + integration + e2e
```

The database name contains `test`, so the fail-closed guard in `test/_setup.ts`
and `scripts/test-db.mjs` allows it while making it impossible to touch dev/prod.

## Schema build from zero

| Step | Result |
|------|--------|
| Tables before migrate | **0** (empty database) |
| `prisma migrate deploy` | all **14** migrations applied cleanly, in order |
| Tables after migrate | **31** |

The final migrations applied were `20260718174749_add_actortype_client` and
`20260718175633_add_clientuser_active` (this sprint's M2 + M4) — confirming the
new migrations build correctly on a virgin database, not just as diffs on an
existing one.

## Full test run on the clean database

| Suite | Files | Tests | Pass | Fail |
|-------|-------|-------|------|------|
| Unit | 6 | 37 | 37 | 0 |
| Integration | 11 | 115 | 115 | 0 |
| E2E | 1 | 1 | 1 | 0 |
| **Total** | **18** | **153** | **153** | **0** |

### The end-to-end lifecycle assertion

The single E2E test exercises the full customer journey on the clean DB and
passed (255 ms):

> **full lifecycle: lead → convert → report+approval → client approves →
> invoice → pay → file authz** ✅

That covers, in one uninterrupted flow: a public lead captured → staff converts
it to a client + project → a report and an approval are created → the client
approves → an invoice is issued → payment settles via the webhook-authoritative
path → and client file authorization is enforced. The integration suite
additionally covers tenant isolation (two-tenant cross-access), client + staff
RBAC (incl. the new client-user deactivation matrix), payments idempotency/replay,
file scanning (fake ClamAV), invitations, and storage.

## Conclusion

A clean database migrates to the current schema with zero manual steps, and the
entire application test pyramid — including the complete lead-to-payment
lifecycle — passes green on that fresh database. The backend is verified to boot
and operate correctly from nothing but migrations.

> Re-run before each release and after any schema change; update the totals here.
