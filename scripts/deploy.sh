#!/usr/bin/env bash
#
# Innovatix Marketing — production deploy.
#
# There is NO CI/CD and NO git-based deploy: production is a file copy of this
# working tree, built and run on the box. This script captures that process so
# it stops being tribal knowledge. (Reverse-engineered from the live box on
# 2026-08-11; see docs/DEPLOYMENT.md.)
#
#   Target : Contabo VPS  sohailadmin@82.197.66.10  (hostname fp-cb-vm)
#   Path   : /home/sohailadmin/innovatix-os
#   Runs   : pm2 → innovatix-systems-web (:4030), innovatix-portal (:3001),
#            innovatix-api (127.0.0.1:4040), innovatix-worker
#   DB     : Docker postgres:16 on 127.0.0.1:5432  (untouched by this script)
#
# Usage:
#   ./scripts/deploy.sh          # rsync + install + build + pm2 restart (safe overlay)
#   DRY=1 ./scripts/deploy.sh    # show what rsync WOULD change; do nothing else
#   PRUNE=1 ./scripts/deploy.sh  # also delete remote files no longer in the tree
#
# Safety: prod-only files (.env, apps/*/.env, node_modules, .next) are NEVER
# overwritten or removed — they are excluded from the sync.

set -euo pipefail

HOST="${INX_HOST:-sohailadmin@82.197.66.10}"
REMOTE="${INX_REMOTE:-/home/sohailadmin/innovatix-os}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

EXCLUDES=(
  --exclude '.git' --exclude 'node_modules' --exclude '.next' --exclude '.turbo'
  --exclude 'dist' --exclude 'coverage' --exclude '*.log' --exclude '.DS_Store'
  # NEVER push local env over the box's production secrets:
  --exclude '.env' --exclude '.env.*' --exclude 'apps/*/.env' --exclude 'apps/*/.env.*'
)

# macOS ships openrsync (no --info= / rsync-3 flags); --stats works on both openrsync and rsync 3.x.
RSYNC=(-az --human-readable --stats "${EXCLUDES[@]}")
[ -n "${DRY:-}" ]   && RSYNC+=(--dry-run)
[ -n "${PRUNE:-}" ] && RSYNC+=(--delete)

echo "▶ rsync  ${ROOT}/  →  ${HOST}:${REMOTE}/"
rsync "${RSYNC[@]}" "${ROOT}/" "${HOST}:${REMOTE}/"

if [ -n "${DRY:-}" ]; then
  echo "✓ DRY run only — nothing built or restarted."
  exit 0
fi

echo "▶ install + migrate + build + restart on ${HOST}"
ssh "$HOST" "set -euo pipefail
  cd '${REMOTE}'
  npm install
  # Regenerate the Prisma client + apply any PENDING migrations BEFORE restarting the API,
  # so the new code never queries a schema that hasn't caught up. Both are idempotent (no-op
  # when nothing changed). Reads the prod DATABASE_URL from apps/api/.env.
  ( cd apps/api && npx prisma generate && npx prisma migrate deploy )
  # Enforce the build-time guards on the real deploy: fail the build if a frontend's
  # browser API base is localhost/unset, or the marketing site URL is localhost/unset.
  export INNOVATIX_ENFORCE_API_URL=1 INNOVATIX_ENFORCE_SITE_URL=1
  npm run build                 # turbo build → apps/{systems-web,platform-web}/.next
  pm2 restart innovatix-systems-web innovatix-portal innovatix-api innovatix-worker --update-env
  pm2 save
  pm2 status | grep -E 'innovatix' || true"

echo "▶ verify public HTTPS"
for u in https://innovatixmarketing.com https://app.innovatixmarketing.com; do
  printf '  %s → HTTP ' "$u"
  curl -s -o /dev/null -w '%{http_code}\n' -m 20 "$u" || echo "FAIL"
done

echo "✓ deploy complete"
