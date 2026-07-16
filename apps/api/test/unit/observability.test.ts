/**
 * Observability units: correlation ids, the metrics registry, and the no-throw
 * guarantee on error/alert paths.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { correlationId, captureError, alert, noteAuthFailure, __resetAuthFailure } from '../../src/observability';
import { incr, renderPrometheus, observeHttpLatency, __resetMetrics } from '../../src/observability/metrics';

test('correlationId reuses an inbound id, else mints a uuid', () => {
  assert.equal(correlationId({ 'x-request-id': 'abc' }), 'abc');
  assert.equal(correlationId({ 'x-correlation-id': 'xyz' }), 'xyz');
  assert.match(correlationId({}), /^[0-9a-f]{8}-[0-9a-f]{4}-/);
  assert.match(correlationId(undefined), /^[0-9a-f]{8}-/);
});

test('metrics registry counts labels + renders Prometheus + a latency histogram', () => {
  __resetMetrics();
  incr('http_requests_total', { method: 'GET', status: '200' });
  incr('http_requests_total', { method: 'GET', status: '200' });
  incr('http_requests_total', { method: 'POST', status: '500' });
  observeHttpLatency(42);
  observeHttpLatency(3000);
  const text = renderPrometheus();
  assert.match(text, /http_requests_total\{method="GET",status="200"\} 2/);
  assert.match(text, /http_requests_total\{method="POST",status="500"\} 1/);
  assert.match(text, /http_request_duration_ms_count 2/);
  assert.match(text, /http_request_duration_ms_bucket\{le="50"\} 1/); // 42 only
  assert.match(text, /http_request_duration_ms_bucket\{le="\+Inf"\} 2/);
  assert.match(text, /process_uptime_seconds \d+/);
});

test('captureError and alert never throw (observability must not break the caller)', () => {
  assert.doesNotThrow(() => captureError(new Error('boom'), { reqId: 'x', url: '/y' }));
  assert.doesNotThrow(() => captureError('a bare string'));
  assert.doesNotThrow(() => captureError(undefined));
  assert.doesNotThrow(() => alert({ kind: 'test', level: 'critical', message: 'hi', tenantId: 't1', data: { a: 1 } }));
});

test('noteAuthFailure tolerates a burst and windows/throttles without throwing', () => {
  __resetAuthFailure();
  assert.doesNotThrow(() => { for (let i = 0; i < 60; i++) noteAuthFailure(1000, 'login'); });
  // A later window resets the counter; still no throw.
  assert.doesNotThrow(() => noteAuthFailure(1000 + 10 * 60_000, 'login'));
});
