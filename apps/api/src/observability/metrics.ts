/**
 * Tiny in-process metrics registry with Prometheus text exposition — no
 * dependency. Counters + a latency histogram + sync gauges. DB/queue-derived
 * gauges are appended by the /metrics route (they need async queries).
 */
type Labels = Record<string, string>;

const counters = new Map<string, number>();
const gauges = new Map<string, () => number>();
const LATENCY_BUCKETS = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000]; // ms
const latencyCounts = new Array(LATENCY_BUCKETS.length + 1).fill(0);
let latencySum = 0;
let latencyCount = 0;

function key(name: string, labels?: Labels): string {
  if (!labels || Object.keys(labels).length === 0) return name;
  const l = Object.keys(labels).sort().map((k) => `${k}="${String(labels[k]).replace(/"/g, '')}"`).join(',');
  return `${name}{${l}}`;
}

export function incr(name: string, labels?: Labels, by = 1): void {
  const k = key(name, labels);
  counters.set(k, (counters.get(k) ?? 0) + by);
}

export function observeHttpLatency(ms: number): void {
  latencySum += ms;
  latencyCount++;
  for (let i = 0; i < LATENCY_BUCKETS.length; i++) {
    if (ms <= LATENCY_BUCKETS[i]) { latencyCounts[i]++; return; }
  }
  latencyCounts[LATENCY_BUCKETS.length]++;
}

export function registerGauge(name: string, fn: () => number): void {
  gauges.set(name, fn);
}

/** Render the process-local registry as Prometheus text. */
export function renderPrometheus(): string {
  const lines: string[] = [];
  for (const [k, v] of counters) lines.push(`${k} ${v}`);
  for (const [name, fn] of gauges) { try { lines.push(`${name} ${fn()}`); } catch { /* skip */ } }
  let cum = 0;
  for (let i = 0; i < LATENCY_BUCKETS.length; i++) {
    cum += latencyCounts[i];
    lines.push(`http_request_duration_ms_bucket{le="${LATENCY_BUCKETS[i]}"} ${cum}`);
  }
  cum += latencyCounts[LATENCY_BUCKETS.length];
  lines.push(`http_request_duration_ms_bucket{le="+Inf"} ${cum}`);
  lines.push(`http_request_duration_ms_sum ${latencySum}`);
  lines.push(`http_request_duration_ms_count ${latencyCount}`);
  return lines.join('\n') + '\n';
}

export function __resetMetrics(): void {
  counters.clear();
  latencyCounts.fill(0);
  latencySum = 0;
  latencyCount = 0;
}

// Process gauges available immediately.
registerGauge('process_uptime_seconds', () => Math.round(process.uptime()));
registerGauge('process_resident_memory_bytes', () => process.memoryUsage().rss);
