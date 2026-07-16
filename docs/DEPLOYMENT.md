# Innovatix — Deployment & Production Configuration

Living deployment doc. This section covers **secret configuration and the
production fail-fast guard**; other sections (hosting, migrations, monitoring)
are added as those hardening tasks land.

> Status: local-only development. Nothing is deployed yet. Do **not** run
> production migrations or provision infra from this doc until a release is
> approved.

---

## Production secret fail-fast

The API (`apps/api`) **refuses to boot when `NODE_ENV=production`** unless every
required secret is present, non-default, and strong. This prevents the
catastrophic failure mode where a deploy silently runs on the committed
development defaults (which would let anyone forge an admin JWT or a payment
webhook).

- Enforcement: `apps/api/src/config-validation.ts` (`validateProductionSecrets`),
  called at boot in `apps/api/src/config.ts`. Pure + unit-tested
  (`apps/api/test/config.test.ts`).
- In `development` / `test` the guard is inactive — the safe defaults in
  `.env.example` let the app run with zero setup.
- Error messages name the offending variable and reason **only** — secret
  values are never printed.

### Rules (production)

Every secret below must be: **present**, **not** a known dev placeholder, and
**≥ 32 characters**.

| Variable | Purpose | Notes |
|---|---|---|
| `PORTAL_JWT_SECRET` | Client-portal JWT signing (cookie `inx_portal`) | Must differ from `STAFF_JWT_SECRET` |
| `STAFF_JWT_SECRET` | Staff/admin JWT signing (cookie `inx_staff`) | Separate trust domain; must differ from `PORTAL_JWT_SECRET` |
| `ABUSE_HASH_SALT` | Salt for hashed-IP abuse identifiers | Rotating it resets rate-limit windows |
| `CALCOM_WEBHOOK_SECRET` | HMAC verification of Cal.com booking webhooks | |
| `PAYMENTS_WEBHOOK_SECRET` | HMAC verification of payment webhooks | |

**Also required, but only when the matching provider is selected:**

| Condition | Required variable(s) |
|---|---|
| `EMAIL_TRANSPORT=postmark` | `POSTMARK_SERVER_TOKEN` |
| `STORAGE_PROVIDER=s3` | `S3_BUCKET`, `S3_REGION` |
| `PAYMENTS_PROVIDER=stripe` | `STRIPE_SECRET_KEY` |

**Encryption keys:** none are used today (auth uses bcrypt; integrity uses
HMAC/SHA-256). If symmetric encryption is added later, register its key in the
`ENCRYPTION_KEYS` map passed to `validateProductionSecrets` so production boot
fails if the key is missing/weak.

### Generating strong secrets

```bash
# 48 random bytes, base64 (>= 32 chars). Generate one PER secret; never reuse.
openssl rand -base64 48
```

Set them in the production environment (host secret manager / CI secret store) —
**never commit real values.** `apps/api/.env.example` documents each variable
with its safe development default.

### Verifying the guard locally

```bash
# Should print the aggregated problems and exit 1 (no secret values shown):
cd apps/api
NODE_ENV=production DATABASE_URL=postgres://x PORT=4040 npx tsx -e "import('./src/config')"

# Run the config unit tests (no database needed):
npx tsx --test test/config.test.ts
```

### Deploy checklist (secrets)

- [ ] `NODE_ENV=production` is set on the API and worker processes.
- [ ] All five core secrets set to unique, random, ≥32-char values.
- [ ] `PORTAL_JWT_SECRET` ≠ `STAFF_JWT_SECRET`.
- [ ] Provider-conditional secrets set for the selected providers.
- [ ] Secrets live in a secret manager, not in the repo or an image layer.
- [ ] Boot the API once and confirm it starts (guard passes) before serving traffic.
