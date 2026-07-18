#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Innovatix — logical database backup (pg_dump custom-format, compressed).
#
# Produces a self-contained, cross-version-restorable .dump that restore-db.sh
# (and pg_restore) can consume. Reads the connection from DATABASE_URL, falling
# back to apps/api/.env. Never touches the DB except to read it.
#
#   scripts/backup-db.sh [OUT_DIR]     write innovatix-<UTC stamp>.dump to OUT_DIR
#                                       (default: ./backups)
#
# Env:
#   DATABASE_URL   postgres URL (else parsed from apps/api/.env)
#   PGBIN          override the pg_dump/psql bin dir (default Homebrew pg@17)
#   KEEP           GFS-style retention: keep newest N dumps in OUT_DIR (default 30)
#
# Companion: restore-db.sh (restore + verify), docs/BACKUP-DR.md (full runbook).
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/lib-dburl.sh
source "$ROOT/scripts/lib-dburl.sh"

OUT_DIR="${1:-$ROOT/backups}"
KEEP="${KEEP:-30}"

parse_database_url            # exports DB_HOST DB_PORT DB_USER DB_PASS DB_NAME
require_pg_tool pg_dump

mkdir -p "$OUT_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="$OUT_DIR/innovatix-${STAMP}.dump"

echo "→ backing up ${DB_NAME} @ ${DB_HOST}:${DB_PORT} → ${OUT}"
PGPASSWORD="$DB_PASS" pg_dump \
  -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -Fc --no-owner --no-acl -f "$OUT"

SIZE="$(du -h "$OUT" | cut -f1)"
echo "✓ wrote ${OUT} (${SIZE})"

# Retention: keep the newest $KEEP dumps in OUT_DIR, prune the rest.
if [ "$KEEP" -gt 0 ]; then
  # shellcheck disable=SC2012
  ls -1t "$OUT_DIR"/innovatix-*.dump 2>/dev/null | tail -n +"$((KEEP + 1))" | while read -r old; do
    echo "→ pruning old backup ${old}"
    rm -f "$old"
  done
fi

echo "✓ backup complete. Restore with: scripts/restore-db.sh \"$OUT\""
