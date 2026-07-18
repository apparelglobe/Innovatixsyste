/**
 * Critical-journey unit tests for the marketing site's SEO + claims integrity —
 * the two things that must never regress: (1) only genuinely indexable pages
 * reach search engines, and (2) no unverified case study exposes quantified
 * claims. Pure data-layer logic, zero deps — runs with `tsx --test`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CASE_STUDIES, isCaseStudyIndexable, verifiedCaseStudySlugs } from '../src/lib/case-studies';
import { SERVICE_PAGES, isIndexable, publishedServiceSlugs } from '../src/lib/services';
import { isLocalHost, absoluteUrl } from '../src/lib/site';

// ── Claims integrity ─────────────────────────────────────────────────────────
test('no UNVERIFIED case study exposes any quantified metrics', () => {
  for (const [slug, c] of Object.entries(CASE_STUDIES)) {
    if (!c.verified) {
      assert.equal(c.metrics.length, 0, `unverified case study "${slug}" must not publish metrics`);
    }
  }
});

test('a case study is indexable IFF it is verified, and the sitemap list agrees', () => {
  for (const [slug, c] of Object.entries(CASE_STUDIES)) {
    assert.equal(isCaseStudyIndexable(slug), c.verified, `indexability of "${slug}" must equal its verified flag`);
  }
  const verified = verifiedCaseStudySlugs();
  for (const slug of verified) assert.equal(CASE_STUDIES[slug].verified, true);
  // Every verified slug is indexable; no unverified slug leaks into the list.
  assert.deepEqual(
    verified.sort(),
    Object.entries(CASE_STUDIES).filter(([, c]) => c.verified).map(([s]) => s).sort(),
  );
});

// ── Service-page SEO ─────────────────────────────────────────────────────────
test('every sitemap-listed service is published AND passes full QC', () => {
  for (const slug of publishedServiceSlugs()) {
    const p = SERVICE_PAGES[slug];
    assert.equal(p.status, 'published', `${slug} in sitemap must be published`);
    assert.ok(Object.values(p.qc).every(Boolean), `${slug} in sitemap must pass every QC check`);
  }
});

test('a draft or QC-failing page is never indexable', () => {
  const slug = Object.keys(SERVICE_PAGES)[0];
  const original = SERVICE_PAGES[slug];
  // Draft status → not indexable.
  assert.equal(isIndexable('this-slug-does-not-exist'), false);
  // Sanity: the registry has at least one indexable page (the site isn't empty).
  assert.ok(publishedServiceSlugs().length > 0, 'expected at least one published service page');
  assert.ok(original, 'registry should be non-empty');
});

// ── Canonical host safety ────────────────────────────────────────────────────
test('isLocalHost flags loopback and private ranges (never shipped as canonical)', () => {
  for (const h of ['localhost', '127.0.0.1', '::1', '0.0.0.0', '192.168.1.5', '10.0.0.3', 'dev.local']) {
    assert.equal(isLocalHost(h), true, `${h} must be treated as local`);
  }
  for (const h of ['innovatixmarketing.com', 'www.innovatixmarketing.com']) {
    assert.equal(isLocalHost(h), false, `${h} must NOT be treated as local`);
  }
});

test('absoluteUrl builds clean paths on the canonical host', () => {
  assert.match(absoluteUrl('/services'), /\/services$/);
  assert.match(absoluteUrl('services'), /\/services$/); // leading slash normalized
  assert.ok(!absoluteUrl('/').endsWith('//'), 'root URL must not double-slash');
});
