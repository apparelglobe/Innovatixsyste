#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Local Postgres for Innovatix WITHOUT Docker (Homebrew postgresql@17).
# The canonical setup is docker-compose.yml (port 5432). This runs an isolated
# cluster on port 5544 so it never clashes with a system-wide Postgres on 5432.
#
#   scripts/dev-db.sh start     start the cluster (idempotent)
#   scripts/dev-db.sh stop      stop the cluster
#   scripts/dev-db.sh status    show status
#   scripts/dev-db.sh reset     DROP + recreate the database (DEV ONLY, destructive)
#   scripts/dev-db.sh psql      open a psql shell
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

PGBIN="${PGBIN:-/opt/homebrew/opt/postgresql@17/bin}"
export PATH="$PGBIN:$PATH"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PGDATA="$ROOT/.pgdata"
PORT=5544
SUPER=innovatix
DB=innovatix

ensure_initdb() {
  if [ ! -d "$PGDATA" ]; then
    echo "→ initializing cluster at $PGDATA"
    initdb -D "$PGDATA" -U "$SUPER" --auth-local=trust --auth-host=trust --encoding=UTF8 >/dev/null
  fi
}

start() {
  ensure_initdb
  if pg_isready -h localhost -p "$PORT" >/dev/null 2>&1; then echo "✓ already running on :$PORT"; return; fi
  pg_ctl -D "$PGDATA" -o "-p $PORT -k /tmp" -l "$PGDATA/server.log" start >/dev/null
  for _ in $(seq 1 15); do pg_isready -h localhost -p "$PORT" >/dev/null 2>&1 && break; sleep 1; done
  createdb -h localhost -p "$PORT" -U "$SUPER" "$DB" </dev/null 2>/dev/null || true
  psql -h localhost -p "$PORT" -U "$SUPER" -d "$DB" -c "CREATE EXTENSION IF NOT EXISTS citext;" </dev/null >/dev/null 2>&1 || true
  echo "✓ Postgres up on :$PORT (db=$DB)"
}

stop()   { pg_ctl -D "$PGDATA" stop >/dev/null 2>&1 && echo "✓ stopped" || echo "not running"; }
status() { pg_isready -h localhost -p "$PORT"; }
psql_() { psql -h localhost -p "$PORT" -U "$SUPER" -d "$DB"; }

reset() {
  if [ "${NODE_ENV:-development}" = "production" ]; then echo "✗ refusing to reset in production"; exit 1; fi
  start
  echo "→ dropping + recreating $DB (destructive)"
  psql -h localhost -p "$PORT" -U "$SUPER" -d postgres -c "DROP DATABASE IF EXISTS $DB WITH (FORCE);" </dev/null >/dev/null
  createdb -h localhost -p "$PORT" -U "$SUPER" "$DB" </dev/null
  psql -h localhost -p "$PORT" -U "$SUPER" -d "$DB" -c "CREATE EXTENSION IF NOT EXISTS citext;" </dev/null >/dev/null
  echo "✓ $DB reset. Run: npm run db:migrate && npm run db:seed"
}

case "${1:-start}" in
  start) start ;;
  stop) stop ;;
  status) status ;;
  reset) reset ;;
  psql) psql_ ;;
  *) echo "usage: $0 {start|stop|status|reset|psql}"; exit 1 ;;
esac
