/**
 * Health / readiness / liveness + metrics endpoints and correlation-id
 * propagation, over the built app on the test DB.
 */
import '../_setup';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../../src/main';
import { prisma } from '../../src/db';

let app: Awaited<ReturnType<typeof buildApp>>;
before(async () => { app = await buildApp(); });
after(async () => { await app.close(); await prisma.$disconnect(); });

test('/livez is a pure liveness probe (200, no dependency checks)', async () => {
  const r = await app.inject({ method: 'GET', url: '/livez' });
  assert.equal(r.statusCode, 200);
  assert.equal(JSON.parse(r.body).status, 'alive');
});

test('/readyz reports component health and is 200 when the DB is reachable', async () => {
  const r = await app.inject({ method: 'GET', url: '/readyz' });
  assert.equal(r.statusCode, 200);
  const b = JSON.parse(r.body);
  assert.equal(b.ok, true);
  assert.equal(b.checks.db, 'ok');
  assert.ok(b.checks.scanner); // provider reported
  assert.ok(b.checks.storage_provider);
});

test('/metrics exposes Prometheus text incl. request + queue gauges', async () => {
  await app.inject({ method: 'GET', url: '/livez' }); // record at least one request
  const r = await app.inject({ method: 'GET', url: '/metrics' });
  assert.equal(r.statusCode, 200);
  assert.match(String(r.headers['content-type']), /text\/plain/);
  assert.match(r.body, /http_requests_total/);
  assert.match(r.body, /http_request_duration_ms_count/);
  assert.match(r.body, /sideeffect_jobs_pending \d+/);
  assert.match(r.body, /scan_jobs_dead \d+/);
});

test('every response carries x-correlation-id, reusing an inbound request id', async () => {
  const reused = await app.inject({ method: 'GET', url: '/livez', headers: { 'x-request-id': 'corr-abc-123' } });
  assert.equal(reused.headers['x-correlation-id'], 'corr-abc-123');
  const minted = await app.inject({ method: 'GET', url: '/livez' });
  assert.match(String(minted.headers['x-correlation-id']), /^[0-9a-f]{8}-/);
});
