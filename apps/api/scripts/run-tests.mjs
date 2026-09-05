#!/usr/bin/env node
/**
 * Cross-platform test runner. Discovers *.test.ts files under test/<category>/
 * via the filesystem (NO shell globs — deterministic on every OS) and runs them
 * with node:test through tsx, using the spec reporter.
 *
 *   node scripts/run-tests.mjs unit|integration|e2e|all
 *
 * Each category runs in its own process, so state never leaks between
 * categories and output is grouped by category with per-file timings.
 */
import { spawnSync } from 'node:child_process';
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const apiRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const testRoot = join(apiRoot, 'test');

const requested = process.argv[2] || 'all';
const CATEGORIES = ['unit', 'integration', 'e2e'];
const toRun = requested === 'all' ? CATEGORIES : [requested];

function discover(category) {
  const dir = join(testRoot, category);
  if (!existsSync(dir)) return [];
  const files = [];
  const walk = (d) => {
    for (const entry of readdirSync(d).sort()) {
      const p = join(d, entry);
      if (statSync(p).isDirectory()) walk(p);
      else if (entry.endsWith('.test.ts')) files.push(p);
    }
  };
  walk(dir);
  return files;
}

let failed = false;
for (const category of toRun) {
  const files = discover(category);
  console.log(`\n──────── ${category.toUpperCase()} (${files.length} file${files.length === 1 ? '' : 's'}) ────────`);
  if (files.length === 0) {
    console.log(`(no ${category} tests)`);
    continue;
  }
  // Run files ONE AT A TIME. The integration suite shares a single database and several files perform
  // GLOBAL-scope operations (the retainer worker drains the whole job queue; some beforeEach hooks wipe
  // a table). Running files in parallel (node:test's default when handed many files) lets those global
  // operations corrupt each other. Sequential per-file execution keeps the shared DB deterministic.
  for (const file of files) {
    const res = spawnSync(
      'npx',
      ['tsx', '--test', '--test-reporter=spec', file],
      { stdio: 'inherit', cwd: apiRoot, env: { ...process.env, NODE_ENV: 'test' } },
    );
    if ((res.status ?? 1) !== 0) failed = true;
  }
}

process.exit(failed ? 1 : 0);
