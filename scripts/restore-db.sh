#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Innovatix — restore a logical dump into a FRESH database and verify it.
#
# Safety: restore ALWAYS targets a new database (default: <name>_restore). It
# never overwrites the source. Verification runs after every restore: table
# count, key-table row counts, orphan-invoice check, and the Prisma migration
# ledger — and, when the live DB is reachable, a source↔restore count diff.
#
#   scripts/restore-db.sh <DUMP>                 restore into <name>_restore, verify, keep
#   scripts/restore-db.sh <DUMP> --into DBNAME   restore into a named target
#   scripts/restore-db.sh <DUMP> --drop-after    round-trip self-test (verify then drop)
#   scripts/restore-db.sh --verify-only DBNAME   just verify an existing database
#
# Env: DATABASE_URL (else apps/api/.env), PGBIN. See docs/BACKUP-DR.md.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/lib-dburl.sh
source "$ROOT/scripts/lib-dburl.sh"

DUMP="" TARGET="" DROP_AFTER=0 VERIFY_ONLY=0
while [ $# -gt 0 ]; do
  case "$1" in
    --into) TARGET="$2"; shift 2 ;;
    --drop-after) DROP_AFTER=1; shift ;;
    --verify-only) VERIFY_ONLY=1; TARGET="$2"; shift 2 ;;
    -*) echo "unknown flag: $1" >&2; exit 1 ;;
    *) DUMP="$1"; shift ;;
  esac
done

parse_database_url
require_pg_tool psql
[ "$VERIFY_ONLY" -eq 1 ] || require_pg_tool pg_restore
: "${TARGET:=${DB_NAME}_restore}"

if [ "$TARGET" = "$DB_NAME" ]; then
  echo "✗ refusing to restore over the source database '$DB_NAME' — pick a fresh --into target." >&2
  exit 1
fi

admin_psql() { PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres "$@"; }

if [ "$VERIFY_ONLY" -eq 0 ]; then
  [ -n "$DUMP" ] && [ -f "$DUMP" ] || { echo "✗ dump file not found: '$DUMP'" >&2; exit 1; }
  echo "→ (re)creating fresh target database '$TARGET'"
  admin_psql -c "DROP DATABASE IF EXISTS \"$TARGET\" WITH (FORCE);" >/dev/null
  admin_psql -c "CREATE DATABASE \"$TARGET\";" >/dev/null
  admin_psql -d "$TARGET" -c "CREATE EXTENSION IF NOT EXISTS citext;" >/dev/null 2>&1 || true
  echo "→ restoring ${DUMP} → ${TARGET}"
  PGPASSWORD="$DB_PASS" pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TARGET" \
    --no-owner --no-acl "$DUMP" 2>&1 | grep -v '^$' || true
  echo "✓ restore complete"
fi

# ── Verification ─────────────────────────────────────────────────────────────
echo ""
echo "── Verifying '$TARGET' ─────────────────────────────────────────"
FAIL=0
check() { # label  actual  [expected]
  if [ -n "${3:-}" ] && [ "$2" != "$3" ]; then
    printf "  ✗ %-28s %s (source: %s)\n" "$1" "$2" "$3"; FAIL=1
  else
    printf "  ✓ %-28s %s\n" "$1" "$2"
  fi
}

TABLES="$(psql_scalar "$TARGET" "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';")"
MIGRATIONS="$(psql_scalar "$TARGET" "SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL;")"
ORPHAN_INV="$(psql_scalar "$TARGET" "SELECT count(*) FROM invoices i LEFT JOIN projects p ON p.id=i.\"projectId\" WHERE p.id IS NULL;")"

# Source-of-truth comparison (only if the live DB is reachable).
SRC_OK=0
if psql_scalar "$DB_NAME" "SELECT 1;" >/dev/null 2>&1; then SRC_OK=1; fi

for t in tenants leads projects invoices payments project_files audit_events; do
  R="$(psql_scalar "$TARGET" "SELECT count(*) FROM $t;")"
  if [ "$SRC_OK" -eq 1 ]; then
    S="$(psql_scalar "$DB_NAME" "SELECT count(*) FROM $t;")"
    check "$t" "$R" "$S"
  else
    check "$t" "$R"
  fi
done
check "public tables" "$TABLES"
check "applied migrations" "$MIGRATIONS"
check "orphan invoices (want 0)" "$ORPHAN_INV" "0"

if [ "$DROP_AFTER" -eq 1 ]; then
  echo "→ dropping self-test database '$TARGET'"
  admin_psql -c "DROP DATABASE IF EXISTS \"$TARGET\" WITH (FORCE);" >/dev/null
fi

echo "────────────────────────────────────────────────────────────────"
if [ "$FAIL" -eq 0 ]; then
  echo "✓ verification PASSED"
else
  echo "✗ verification FAILED — do not trust this restore"; exit 1
fi
