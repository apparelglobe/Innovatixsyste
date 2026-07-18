#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Innovatix — verify a PRODUCTION configuration from a CLEAN environment.
#
# Runs the API's real boot-time config guard (src/config.ts: Zod schema +
# validateProductionSecrets) against a candidate env file with NODE_ENV=production
# — WITHOUT booting the server or touching the database. A misconfigured prod env
# fails here (non-zero, naming each offending var) instead of at deploy time.
#
# "Clean environment": the check runs under `env -i` so ONLY the candidate file's
# variables are seen — no dev vars from your current shell leak in.
#
#   scripts/verify-prod-config.sh [ENV_FILE]     default: apps/api/.env.production
#   scripts/verify-prod-config.sh apps/api/.env.production.example   # self-test
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API="$ROOT/apps/api"
ENV_FILE="${1:-$API/.env.production}"

if [ ! -f "$ENV_FILE" ]; then
  echo "✗ env file not found: $ENV_FILE" >&2
  echo "  Create one from the template: apps/api/.env.production.example" >&2
  exit 1
fi
# Absolute path so it resolves after we cd into apps/api.
case "$ENV_FILE" in /*) : ;; *) ENV_FILE="$ROOT/$ENV_FILE" ;; esac

echo "→ verifying $ENV_FILE as a production config (clean env, no DB, no boot)"

# Run in a scrubbed environment: only PATH/HOME (to find node/tsx) + the forced
# NODE_ENV + the candidate file (loaded by dotenv via DOTENV_CONFIG_PATH). If
# src/config.ts's guard rejects anything it prints the reason and exits 1.
cd "$API"
env -i \
  PATH="$PATH" HOME="$HOME" \
  NODE_ENV=production \
  DOTENV_CONFIG_PATH="$ENV_FILE" \
  npx tsx -e "import('./src/config').then((m) => { void m.config; console.log('\n✓ production config is valid — all required vars present, secrets strong, provider keys satisfied.'); }).catch((e) => { console.error(e); process.exit(1); });"
