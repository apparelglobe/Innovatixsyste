#!/usr/bin/env node
/**
 * Test database lifecycle — `prepare` (create if needed + migrate) and `reset`
 * (drop schema + re-migrate). FAILS CLOSED unless the target DB name contains
 * "test", so this can never touch dev/prod.
 *
 *   node scripts/test-db.mjs prepare
 *   node scripts/test-db.mjs reset
 */
import { spawnSync } from 'node:child_process';
import 'dotenv/config';

const action = process.argv[2];
if (!['prepare', 'reset'].includes(action)) {
  console.error('usage: node scripts/test-db.mjs <prepare|reset>');
  process.exit(2);
}

function databaseName(url) {
  const m = url.match(/\/([^/?]+)(\?|$)/);
  return m ? m[1] : '';
}
function resolveTestUrl() {
  let url = process.env.DATABASE_URL_TEST;
  if (!url && process.env.DATABASE_URL) {
    url = process.env.DATABASE_URL.replace(/\/([^/?]+)(\?|$)/, (_a, n, t) => `/${n}_test${t}`);
  }
  if (!url) throw new Error('No test database configured (set DATABASE_URL_TEST or DATABASE_URL).');
  const name = databaseName(url);
  if (!/test/i.test(name)) {
    throw new Error(`Refusing to ${action}: database "${name}" does not contain "test".`);
  }
  return url;
}

const testUrl = resolveTestUrl();
const env = { ...process.env, DATABASE_URL: testUrl };
const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { stdio: 'inherit', env });
  return r.status ?? 1;
};

if (action === 'prepare') {
  // Best-effort: create the database if it doesn't exist. Ignore failure — in CI
  // the Postgres service already provisions it (POSTGRES_DB), and if psql is
  // absent, `migrate deploy` will surface a clear connection error instead.
  const adminUrl = testUrl.replace(/\/([^/?]+)(\?|$)/, '/postgres$2');
  const name = databaseName(testUrl);
  spawnSync('psql', [adminUrl, '-c', `CREATE DATABASE ${name}`], { stdio: 'ignore', env });
  console.log(`[test-db] prepare → migrate deploy on "${name}"`);
  process.exit(run('npx', ['prisma', 'migrate', 'deploy']));
}

if (action === 'reset') {
  console.log(`[test-db] reset → migrate reset --force on "${databaseName(testUrl)}"`);
  process.exit(run('npx', ['prisma', 'migrate', 'reset', '--force', '--skip-seed']));
}
