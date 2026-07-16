/**
 * Repository guard: no plaintext temporary/demo passwords in production-facing
 * source or transactional templates. This is a static scan (no DB) that fails if
 * anyone reintroduces temp-password behavior or leaks the local seed demo
 * password into API routes, email templates, or the web UI.
 *
 * Deliberately excluded: the local Prisma seed (dev-only), the password policy's
 * own denylist definition, and test files.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

// test/unit → apps/api
const API_ROOT = resolve(__dirname, '..', '..');
const SCAN_DIRS = [join(API_ROOT, 'src'), resolve(API_ROOT, '..', 'platform-web', 'src')];

// Files that legitimately reference these strings.
const EXCLUDED = [
  join('lib', 'password.ts'), // the denylist itself
];

// Target the actual risky forms — a generated temp-password variable, the seed's
// demo password literal, and an emailed/displayed "Temporary password:" LABEL
// (i.e. a label immediately followed by a value or code tag). Prose that merely
// mentions the absence of temp passwords in a comment is intentionally allowed.
const PATTERNS: { label: string; re: RegExp }[] = [
  { label: 'seed demo password literal', re: /portal-demo-2026/ },
  { label: 'tempPassword identifier', re: /\btempPassword\b/ },
  { label: 'temporaryPassword identifier', re: /\btemporaryPassword\b/ },
  { label: '"Temporary password:" label with a value', re: /temporary password\s*[:<]/i },
];

function walk(dir: string): string[] {
  let out: string[] = [];
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (['node_modules', '.next', 'dist', '.turbo'].includes(e.name)) continue;
      out = out.concat(walk(full));
    } else if (/\.(ts|tsx)$/.test(e.name) && !full.includes(`${join('test', '')}`)) {
      out.push(full);
    }
  }
  return out;
}

test('no plaintext temp/demo passwords in production-facing source or templates', () => {
  const files = SCAN_DIRS.flatMap(walk).filter((f) => !EXCLUDED.some((x) => f.endsWith(x)));
  assert.ok(files.length > 0, 'scan should find source files');
  const violations: string[] = [];
  for (const f of files) {
    const text = readFileSync(f, 'utf8');
    for (const { label, re } of PATTERNS) {
      if (re.test(text)) violations.push(`${f}: ${label}`);
    }
  }
  assert.deepEqual(violations, [], `plaintext/demo password references found:\n${violations.join('\n')}`);
});
