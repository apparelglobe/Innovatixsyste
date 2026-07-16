# Monitoring, logging & alerting

How the API reports that it is healthy, records what happened, and pages a human
when something needs attention — with **zero mandatory external dependencies**.
Every hook degrades to a safe no-op (or a console line) when its provider env var
is unset, so the same build runs in dev, staging, and prod.

## Design principles

1. **Observability must never break the request.** Every capture/alert entry
   point is wrapped so it can throw internally and the caller still succeeds.
   (`captureError`, `alert`, `noteAuthFailure` all guarantee no-throw.)
2. **No vendor lock-in at the boundary.** Errors go to `console.error` as
   structured JSON by default; set `SENTRY_DSN` to also forward. Alerts go to
   `console.warn` by default; set `ALERT_WEBHOOK_URL` (Slack-compatible incoming
   webhook) to also POST.
3. **In-process metrics, Prometheus text format.** A tiny hand-rolled registry
   (`observability/metrics.ts`) — no client library — rendered at `/metrics`.
4. **Secrets never logged.** The logger redacts `authorization`, `cookie`,
   `x-cal-signature-256`, and `stripe-signature`; request bodies, IPs, and UAs
   are not logged.

## Structured logging & correlation IDs

- Pino JSON logs (Fastify built-in), level from `LOG_LEVEL` (`info` default;
  `silent` under `NODE_ENV=test`).
- **Correlation id** — `genReqId` reuses an inbound `x-request-id` /
  `x-correlation-id` if present, else mints a UUID (`observability.correlationId`).
  Every response echoes it as `x-correlation-id` (an `onSend` hook), and every
  captured error carries it (`reqId`) — so a client-reported id ties a log line, a
  Sentry event, and an alert together across the request.

## Health endpoints

| Endpoint | Purpose | Checks | Failure |
|----------|---------|--------|---------|
| `GET /livez` | Liveness — process is up. **No dependency checks** so a DB blip never restarts the pod. | none | always 200 while the event loop runs |
| `GET /readyz` | Readiness — safe to receive traffic. | `SELECT 1` (DB), object-storage `head` probe, reports scanner + storage provider | **503** if DB down; storage error is reported but non-fatal (uploads degrade, reads/writes of records still work) |
| `GET /health` | Legacy shallow liveness (kept for back-compat). | none | 200 |
| `GET /metrics` | Prometheus scrape (gate at nginx to the internal network / scrape token). Off when `METRICS_ENABLED=false` (→404). | renders registry + live queue gauges | 200 text/plain |

**Load balancer wiring:** point the LB/orchestrator health check at `/livez`;
point the "should this instance get traffic" / rolling-deploy gate at `/readyz`.

## Metrics catalog (`/metrics`)

Counters and a latency histogram are updated in the `onResponse` hook and at the
business events below; queue depths are queried live at scrape time.

| Metric | Type | Labels | Meaning |
|--------|------|--------|---------|
| `http_requests_total` | counter | `method`, `status` | request volume + error-rate source (5xx / 4xx ratios) |
| `http_request_duration_ms` | histogram | — | API latency (buckets 5…5000 ms; gives p50/p95/p99 via `histogram_quantile`) |
| `payments_total` | counter | `result` (`paid`/`failed`) | settlement outcomes |
| `file_scans_total` | counter | `result` (`clean`/`infected`/`error`) | malware-scan outcomes |
| `sideeffect_jobs_dead_total` | counter | `type` | jobs that exhausted retries (DEAD) |
| `sideeffect_jobs_pending` / `sideeffect_jobs_dead` | gauge | — | outbox/side-effect queue depth (live count) |
| `scan_jobs_pending` / `scan_jobs_dead` | gauge | — | scan queue depth (live count) |
| `files_scanning` | gauge | — | files stuck in `SCANNING` state (live count) |
| `process_uptime_seconds`, `process_resident_memory_bytes` | gauge | — | process health |

### Suggested Prometheus alert rules (operate at the scrape layer)

```yaml
- alert: ApiHighErrorRate
  expr: sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) > 0.05
  for: 5m
- alert: ApiHighLatencyP95
  expr: histogram_quantile(0.95, sum(rate(http_request_duration_ms_bucket[5m])) by (le)) > 1000
  for: 10m
- alert: DeadLetterJobs
  expr: sideeffect_jobs_dead > 0 or scan_jobs_dead > 0
  for: 0m
- alert: ScanBacklog
  expr: scan_jobs_pending > 50
  for: 15m
- alert: ReadinessDown            # from blackbox probe of /readyz
  expr: probe_http_status_code{instance=~".*/readyz"} == 503
  for: 1m
```

## Alert catalog (application-emitted)

Emitted via `alert({kind, level, message, tenantId?, data?})` — console always,
`ALERT_WEBHOOK_URL` when set. `level` is `warning` or `critical`.

| Kind | Level | Fires when | Source | Operator action |
|------|-------|-----------|--------|-----------------|
| `job.dead` | critical | a side-effect job exhausts `OUTBOX_MAX_ATTEMPTS` → `DEAD` | `jobs/processor.ts` | inspect `side_effect_jobs`, fix root cause, requeue |
| `scan.failed` | critical | a file scan exhausts retries → `DEAD` (scanner unreachable/erroring) | `scanning/service.ts` | check ClamAV health; file stays quarantined (not downloadable) |
| `scan.quarantined` | warning | a scan returns **INFECTED** | `scanning/service.ts` | expected signal; confirm the uploader, no data leaked (download blocked) |
| `payment.failed` | warning | a verified webhook reports a failed/declined charge | `billing/process-webhook.ts` | follow up with client; invoice stays unpaid |
| `auth.bruteforce` | critical | ≥ `AUTH_FAIL_ALERT_THRESHOLD` 401s within `AUTH_FAIL_ALERT_WINDOW_MS` | `main.ts` onResponse → `noteAuthFailure` | investigate source; alert throttled to once/window |
| (uncaught 5xx) | — | any unhandled error / 5xx | `main.ts` setErrorHandler → `captureError` | triaged via Sentry/console with correlation id |

### Auth-failure (brute-force) detector

`noteAuthFailure(now, source)` keeps a windowed counter in process. Past the
threshold it emits `auth.bruteforce` **once per window** (no alert storm), then
resets when the window rolls. Thresholds are env-tunable
(`AUTH_FAIL_ALERT_THRESHOLD`=25, `AUTH_FAIL_ALERT_WINDOW_MS`=60000). This is a
coarse signal, complementary to per-IP rate limiting (`rate_limit_counters`), not
a replacement for it.

## Worker / queue monitoring

Both durable queues (`side_effect_jobs`, `file_scans`) use the same
`PENDING → PROCESSING → SUCCEEDED | FAILED → …retry… → DEAD` model. Health is
observable three ways: the live gauges at `/metrics` (depth + dead count), the
`*_dead_total` counters, and the critical `job.dead` / `scan.failed` alerts on the
terminal transition. A rising `*_pending` gauge with flat throughput means the
worker is wedged or the downstream (SMTP, ClamAV, storage) is down.

## Configuration reference

| Var | Default | Effect |
|-----|---------|--------|
| `LOG_LEVEL` | `info` | Pino level (`silent` in test) |
| `SENTRY_DSN` | `''` | when set, `captureError` also forwards to Sentry |
| `ALERT_WEBHOOK_URL` | `''` | when set, `alert` also POSTs (Slack-compatible) |
| `METRICS_ENABLED` | `true` | `/metrics` returns 404 when false |
| `AUTH_FAIL_ALERT_THRESHOLD` | `25` | 401s per window before `auth.bruteforce` |
| `AUTH_FAIL_ALERT_WINDOW_MS` | `60000` | brute-force window length |

## Tests

- `test/unit/observability.test.ts` — correlation-id reuse/mint; metrics registry
  counting, Prometheus render, histogram buckets, process gauge; no-throw
  guarantee for `captureError`/`alert`; brute-force burst + window rollover.
- `test/integration/health.test.ts` — `/livez` 200, `/readyz` 200 with
  `checks.db==='ok'`, `/metrics` exposes `http_requests_total` +
  `sideeffect_jobs_pending`, and `x-correlation-id` echo (reuse + mint).
