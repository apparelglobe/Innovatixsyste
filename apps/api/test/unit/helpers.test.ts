/**
 * Pure helper units — SLA calc, HMAC signature verify, sanitization, spam.
 * No database, no network.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { computeSlaDueAt } from '../../src/lib/business-hours';
import { verifyCalcomSignature } from '../../src/booking/service';
import { cleanText, escapeHtml, normalizeEmail } from '../../src/lib/sanitize';
import { assessSpam } from '../../src/lib/spam';

test('SLA: Friday 16:00 ET + 240 business minutes lands on a weekday', () => {
  const fri = new Date('2026-07-10T20:00:00Z'); // 16:00 America/New_York (EDT)
  const due = computeSlaDueAt(fri, 240, 'America/New_York');
  assert.ok(due.getTime() > fri.getTime());
  const dow = due.getUTCDay();
  assert.ok(dow >= 1 && dow <= 5, `due should be a weekday, got dow=${dow}`);
});

test('signature helper: valid passes, tampered body fails, wrong secret fails', () => {
  const body = '{"a":1}';
  const sig = createHmac('sha256', 'secret').update(body).digest('hex');
  assert.equal(verifyCalcomSignature(body, sig, 'secret'), true);
  assert.equal(verifyCalcomSignature('{"a":2}', sig, 'secret'), false);
  assert.equal(verifyCalcomSignature(body, sig, 'wrong'), false);
});

test('sanitize: strips tags, escapes HTML, normalizes email', () => {
  const cleaned = cleanText('<script>alert(1)</script> hello');
  assert.ok(!cleaned.includes('<script>'), 'tags should be stripped');
  const esc = escapeHtml('<b>x & "y"</b>');
  assert.ok(esc.includes('&lt;') && !esc.includes('<b>'), 'html should be escaped');
  assert.equal(normalizeEmail('  Foo@Example.COM '), 'foo@example.com');
});

test('spam: honeypot rejects; clean passes; too-fast is scored', () => {
  assert.equal(assessSpam({ email: 'a@b.com', honeypot: 'x' }).result, 'REJECTED');
  assert.equal(assessSpam({ email: 'a@b.com', projectDescription: 'A normal request for an ERP build.' }).result, 'CLEAN');
  const fast = assessSpam({ email: 'a@b.com', submitElapsedMs: 200 });
  assert.ok(fast.score >= 40 && fast.reasons.includes('submitted_too_fast'));
});
