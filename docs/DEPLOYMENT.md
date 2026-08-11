# Innovatix — Deployment & Production Configuration

Living deployment doc: **hosting + how to ship**, then secret configuration and
the production fail-fast guard.

> Status (2026-08-11): **LIVE in production.** innovatixmarketing.com (marketing),
> app.innovatixmarketing.com (client portal) and the lead API are all serving.

---

## Hosting & how to deploy

**Where it runs — one Contabo VPS.** There is **no CI/CD and no git-based
deploy**: production is a *file copy* of this working tree, built and run on the
box. (The box has no `.git`; the only git history lives on the developer's Mac.)

| | |
|---|---|
| Host | `sohailadmin@82.197.66.10` (hostname `fp-cb-vm`), key-only SSH |
| Path | `/home/sohailadmin/innovatix-os` |
| Web | pm2 `innovatix-systems-web` → Next.js marketing, port **4030** |
| Portal | pm2 `innovatix-portal` → Next.js portal, port **3001** (app.innovatixmarketing.com) |
| API | pm2 `innovatix-api` → NestJS, **127.0.0.1:4040** (nginx proxies `/api/inx`) |
| Worker | pm2 `innovatix-worker` → background jobs |
| DB | Docker `innovatix-postgres` (postgres:16), **127.0.0.1:5432** |
| Web server | nginx + Let's Encrypt (certbot, auto-renew); vhosts `innovatixsystems.com`, `app.innovatixmarketing.com` |

### Deploy

```bash
DRY=1 ./scripts/deploy.sh    # preview exactly what would change (no writes)
./scripts/deploy.sh          # rsync tree up, npm install, turbo build, pm2 restart, verify HTTPS
```

`scripts/deploy.sh` rsyncs this tree to the box (never overwriting the box's
`.env` / `node_modules` / `.next`), then on the box runs `npm install` →
`npm run build` (turbo) → `pm2 restart` of the four `innovatix-*` processes →
`pm2 save`, and finally curls the two public URLs. Override the target with
`INX_HOST` / `INX_REMOTE`.

### Put it on a git remote (recommended — no offsite backup today)

The repo is committed **only** on the developer's Mac with **no remote**, so
prod = an un-versioned copy of one laptop. To back it up:

```bash
git remote add origin git@github.com:<org>/innovatix-os.git
git push -u origin HEAD          # push the current branch
```

Deploying still uses `scripts/deploy.sh` (rsync); git is for history + backup.
Optionally switch the box to `git pull` later.

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
