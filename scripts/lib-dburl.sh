# ─────────────────────────────────────────────────────────────────────────────
# Shared helpers for the backup/restore scripts. Sourced, not executed.
# Parses a Postgres DATABASE_URL into DB_HOST/DB_PORT/DB_USER/DB_PASS/DB_NAME and
# locates the Postgres client tools.
# ─────────────────────────────────────────────────────────────────────────────

# Put the Postgres client tools on PATH (Homebrew pg@17 by default; override PGBIN).
export PATH="${PGBIN:-/opt/homebrew/opt/postgresql@17/bin}:$PATH"

# Load DATABASE_URL from apps/api/.env when it is not already in the environment.
_load_env_database_url() {
  if [ -n "${DATABASE_URL:-}" ]; then return; fi
  local env_file="${ROOT:-.}/apps/api/.env"
  if [ -f "$env_file" ]; then
    # Take the last DATABASE_URL= line, strip surrounding quotes.
    DATABASE_URL="$(grep -E '^DATABASE_URL=' "$env_file" | tail -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")"
    export DATABASE_URL
  fi
}

# Parse DATABASE_URL → DB_HOST DB_PORT DB_USER DB_PASS DB_NAME (schema/query stripped).
# Percent-decodes the password (common for URL-encoded special chars).
parse_database_url() {
  _load_env_database_url
  if [ -z "${DATABASE_URL:-}" ]; then
    echo "✗ DATABASE_URL is not set and apps/api/.env has none." >&2
    exit 1
  fi
  local url="${DATABASE_URL#postgres://}"
  url="${url#postgresql://}"
  local creds="${url%%@*}"
  local hostpart="${url#*@}"
  DB_USER="${creds%%:*}"
  DB_PASS="${creds#*:}"
  [ "$DB_PASS" = "$creds" ] && DB_PASS=""      # no password present
  local hostport="${hostpart%%/*}"
  local dbpart="${hostpart#*/}"
  DB_HOST="${hostport%%:*}"
  DB_PORT="${hostport#*:}"
  [ "$DB_PORT" = "$hostport" ] && DB_PORT="5432"
  DB_NAME="${dbpart%%\?*}"                       # drop ?schema=...
  # Percent-decode the password (e.g. %40 → @).
  DB_PASS="$(printf '%b' "${DB_PASS//%/\\x}")"
  export DB_HOST DB_PORT DB_USER DB_PASS DB_NAME
  : "${DB_HOST:?}" "${DB_PORT:?}" "${DB_USER:?}" "${DB_NAME:?}"
}

# Abort with a clear message if a required Postgres client tool is missing.
require_pg_tool() {
  local tool="$1"
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "✗ '$tool' not found. Install the Postgres client tools (e.g. 'brew install postgresql@17') or set PGBIN." >&2
    exit 1
  fi
}

# psql one-liner against a given database, returns the trimmed scalar result.
psql_scalar() {
  local db="$1" sql="$2"
  PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$db" -tAc "$sql" 2>/dev/null | tr -d '[:space:]'
}
