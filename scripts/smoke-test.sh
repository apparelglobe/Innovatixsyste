#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Innovatix API — post-deploy smoke test (automated).
#
# Probes a RUNNING API and fails (non-zero) if any critical path is broken. Safe
# to run against staging (full) or prod (read-mostly + one lead write). Uses only
# curl + POSIX tools — no jq, no deps.
#
#   scripts/smoke-test.sh [BASE_URL]     default: http://localhost:4040
#
# Env:
#   METRICS_TOKEN   if set, /metrics is probed WITH a bearer token (expect 200);
#                   otherwise /metrics is only checked to be reachable & gated.
#   SKIP_LEAD=1     skip the POST /v1/leads write (pure read-only probe)
#
# Exit 0 = all checks passed. Companion checklist: docs/STAGING.md.
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail

BASE="${1:-http://localhost:4040}"
BASE="${BASE%/}"
PASS=0 FAIL=0

ok()   { printf "  \033[32m✓\033[0m %s\n" "$1"; PASS=$((PASS + 1)); }
bad()  { printf "  \033[31m✗\033[0m %s\n" "$1"; FAIL=$((FAIL + 1)); }

# GET helper: echoes "HTTP_STATUS<newline>BODY".
http_get() { curl -sS -m 15 -w $'\n%{http_code}' "$@" 2>/dev/null; }

# Split a curl "body\nSTATUS" response.
status_of() { printf '%s' "$1" | tail -n1; }
body_of()   { printf '%s' "$1" | sed '$d'; }

echo "→ smoke-testing $BASE"

# 1. Liveness ────────────────────────────────────────────────────────────────
R="$(http_get "$BASE/livez")"; S="$(status_of "$R")"
[ "$S" = "200" ] && ok "GET /livez → 200" || bad "GET /livez → $S (expected 200)"

# 2. Health ──────────────────────────────────────────────────────────────────
R="$(http_get "$BASE/health")"; S="$(status_of "$R")"
[ "$S" = "200" ] && ok "GET /health → 200" || bad "GET /health → $S (expected 200)"

# 3. Readiness (DB must be ok) ────────────────────────────────────────────────
R="$(http_get "$BASE/readyz")"; S="$(status_of "$R")"; B="$(body_of "$R")"
if [ "$S" = "200" ] && printf '%s' "$B" | grep -q '"db":"ok"'; then
  ok "GET /readyz → 200, db=ok"
else
  bad "GET /readyz → $S (want 200 + db=ok); body: $B"
fi

# 4. /metrics is gated (never publicly scrapable) ────────────────────────────
if [ -n "${METRICS_TOKEN:-}" ]; then
  R="$(http_get -H "Authorization: Bearer $METRICS_TOKEN" "$BASE/metrics")"; S="$(status_of "$R")"
  [ "$S" = "200" ] && ok "GET /metrics (with token) → 200" || bad "GET /metrics (with token) → $S (expected 200)"
  R="$(http_get "$BASE/metrics")"; S="$(status_of "$R")"
  [ "$S" = "401" ] && ok "GET /metrics (no token) → 401 (gated)" || bad "GET /metrics (no token) → $S (expected 401)"
else
  R="$(http_get "$BASE/metrics")"; S="$(status_of "$R")"
  case "$S" in
    200) ok "GET /metrics → 200 (open; dev only — set METRICS_TOKEN in prod)" ;;
    401|403|404) ok "GET /metrics → $S (gated/disabled)" ;;
    *) bad "GET /metrics → $S (unexpected)" ;;
  esac
fi

# 5. Lead pipeline write (core funnel) ───────────────────────────────────────
if [ "${SKIP_LEAD:-0}" = "1" ]; then
  echo "  – skipping POST /v1/leads (SKIP_LEAD=1)"
else
  IDEM="smoke-$(date -u +%Y%m%dT%H%M%SZ)-$$"
  PAYLOAD="{\"firstName\":\"Smoke\",\"lastName\":\"Test\",\"businessEmail\":\"smoke-test@example.com\",\"company\":\"SmokeCo\",\"form\":\"CONTACT\",\"projectDescription\":\"Automated smoke test — please ignore.\",\"idempotencyKey\":\"$IDEM\"}"
  R="$(curl -sS -m 15 -w $'\n%{http_code}' -X POST "$BASE/v1/leads" \
        -H 'content-type: application/json' -d "$PAYLOAD" 2>/dev/null)"
  S="$(status_of "$R")"; B="$(body_of "$R")"
  if { [ "$S" = "200" ] || [ "$S" = "201" ] || [ "$S" = "202" ]; } && printf '%s' "$B" | grep -q '"ok":true'; then
    ok "POST /v1/leads → $S, ok:true (lead pipeline works)"
  else
    bad "POST /v1/leads → $S (want 200/201 + ok:true); body: $B"
  fi
fi

echo "────────────────────────────────────────────"
printf "  passed: %d   failed: %d\n" "$PASS" "$FAIL"
if [ "$FAIL" -eq 0 ]; then
  echo "✓ smoke test PASSED"; exit 0
else
  echo "✗ smoke test FAILED"; exit 1
fi
