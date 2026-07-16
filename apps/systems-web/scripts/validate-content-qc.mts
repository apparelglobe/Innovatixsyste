/**
 * Hard SEO / content-quality build assertion.
 *
 * Runs in `prebuild`. FAILS the build (exit 1) and prints every violation with
 * the exact failing check, so a content author knows precisely what to fix.
 * The system must NEVER silently downgrade a `published` page to noindex — if a
 * page is marked published, it must earn indexation or the build breaks.
 *
 * Checks (per the Increment-2 spec):
 *   1. published + any failing QC item              → error (no silent noindex)
 *   2. published missing canonical (qc.canonical)   → error
 *   3. published service missing structured data    → error (schema + FAQs)
 *   4. duplicate <title> or meta description        → error
 *   5. placeholder content in a published page       → error
 *   6. published missing its primary CTA             → error (conversionPath)
 *   7. published unexpectedly excluded from sitemap  → error
 *   8. draft / placeholder / unverified in sitemap   → error
 *   9. claims integrity: unverified case study with  → error
 *      metrics, or banned compliance/partnership language
 */
import {
  SERVICE_PAGES,
  isIndexable,
  publishedServiceSlugs,
  type ServicePage,
  type QcChecklist,
} from '../src/lib/services';
import {
  CASE_STUDIES,
  verifiedCaseStudySlugs,
  type CaseStudy,
} from '../src/lib/case-studies';

type Violation = { where: string; check: string; detail: string };
const violations: Violation[] = [];
const add = (where: string, check: string, detail: string) =>
  violations.push({ where, check, detail });

// Text that must never appear in a published page's body.
const PLACEHOLDER_MARKERS = [
  'lorem ipsum',
  'todo',
  'tbd',
  'coming soon',
  'placeholder',
  'xxxx',
  'insert ',
  'lorem',
];
// Claims that require documentary proof — never allowed on an UNVERIFIED case study.
const BANNED_UNVERIFIED_CLAIMS = [
  'hipaa',
  'soc 2',
  'soc2',
  'iso 27001',
  'pci',
  'certified',
  'certification',
  'compliant',
  'compliance',
  'partnership',
  'partner with',
  'official partner',
];

const REQUIRED_QC_KEYS: (keyof QcChecklist)[] = [
  'distinctKeywordIntent', 'uniqueIntroValueProp', 'industryProblems', 'serviceSolutionDetail',
  'workflowsUseCases', 'integrations', 'securityCompliance', 'deliverables', 'faqs',
  'internalLinks', 'uniqueTitleMeta', 'canonical', 'schema', 'conversionPath',
  'proofReference', 'editorialSignoff',
];

function pageBodyText(p: ServicePage): string {
  return [
    ...p.intro,
    ...p.problems.flatMap((x) => [x.heading, x.body]),
    ...p.solution.flatMap((x) => [x.heading, x.body]),
    ...p.deliverables,
    ...p.faqs.flatMap((x) => [x.q, x.a]),
    p.h1,
    p.metaDescription,
  ]
    .join(' \n ')
    .toLowerCase();
}

// ── Per-page checks over the service registry ────────────────────────────────
const publishedSlugs = Object.keys(SERVICE_PAGES).filter((s) => SERVICE_PAGES[s].status === 'published');
const titleSeen = new Map<string, string>();
const descSeen = new Map<string, string>();

for (const slug of Object.keys(SERVICE_PAGES)) {
  const p = SERVICE_PAGES[slug];
  const where = `service:${slug}`;

  // (4) duplicate title / meta description — across ALL entries.
  const t = p.title.trim().toLowerCase();
  if (titleSeen.has(t)) add(where, 'duplicate-title', `<title> duplicates ${titleSeen.get(t)}: "${p.title}"`);
  else titleSeen.set(t, slug);
  const d = p.metaDescription.trim().toLowerCase();
  if (descSeen.has(d)) add(where, 'duplicate-meta-description', `meta description duplicates ${descSeen.get(d)}`);
  else descSeen.set(d, slug);

  if (p.status !== 'published') continue;

  // (1) published + failing QC item → hard error (never silent noindex).
  const failing = REQUIRED_QC_KEYS.filter((k) => p.qc[k] !== true);
  if (failing.length) {
    add(where, 'published-qc-failed', `marked published but QC items are false: ${failing.join(', ')}`);
  }

  // (2) canonical, (3) schema + FAQ, (6) conversion path — explicit even if in QC.
  if (!p.qc.canonical) add(where, 'missing-canonical', 'published page must assert qc.canonical');
  if (!p.qc.schema) add(where, 'missing-structured-data', 'published service must assert qc.schema (Service/Breadcrumb/FAQ)');
  if (!p.faqs?.length) add(where, 'missing-faq-schema-source', 'published service has no FAQs → FAQ schema would be empty');
  if (!p.qc.conversionPath) add(where, 'missing-cta', 'published page must assert qc.conversionPath (primary CTA)');
  if (!p.internalLinks?.length) add(where, 'missing-internal-links', 'published page has no internal links');

  // (5) placeholder content.
  const body = pageBodyText(p);
  for (const marker of PLACEHOLDER_MARKERS) {
    if (body.includes(marker)) add(where, 'placeholder-content', `published page body contains placeholder marker "${marker}"`);
  }
  // Empty required content.
  if (!p.intro?.length || p.intro.some((s) => !s.trim())) add(where, 'empty-intro', 'published page has empty intro copy');
  if (!p.deliverables?.length) add(where, 'empty-deliverables', 'published page has no deliverables');
}

// ── (7)/(8) sitemap consistency ──────────────────────────────────────────────
const indexable = new Set(publishedSlugs.filter(isIndexable));
const sitemapSet = new Set(publishedServiceSlugs());

for (const slug of publishedSlugs) {
  // (7) a published page that is NOT in the sitemap = it was silently downgraded.
  if (!sitemapSet.has(slug)) {
    add(`service:${slug}`, 'unexpected-sitemap-exclusion', 'published page is excluded from the sitemap (QC gate downgraded it to noindex)');
  }
}
for (const slug of sitemapSet) {
  // (8) nothing draft/review may reach the sitemap.
  const st = SERVICE_PAGES[slug]?.status;
  if (st !== 'published') add(`service:${slug}`, 'draft-in-sitemap', `sitemap contains a non-published page (status=${st})`);
}

// ── (9) case-study claims integrity ──────────────────────────────────────────
for (const slug of Object.keys(CASE_STUDIES)) {
  const c: CaseStudy = CASE_STUDIES[slug];
  const where = `case-study:${slug}`;
  if (!c.verified) {
    if (c.metrics && c.metrics.length > 0) {
      add(where, 'unverified-metrics', `unverified case study exposes ${c.metrics.length} metric(s) — must be empty until owner-verified`);
    }
    // scan visible text fields for banned compliance/partnership claims.
    const text = JSON.stringify(c).toLowerCase();
    for (const claim of BANNED_UNVERIFIED_CLAIMS) {
      if (text.includes(claim)) {
        add(where, 'unsupported-claim', `unverified case study contains banned claim term "${claim}" (needs documentary proof)`);
      }
    }
  }
}
const verifiedSitemap = new Set(verifiedCaseStudySlugs());
for (const slug of verifiedSitemap) {
  if (CASE_STUDIES[slug]?.verified !== true) {
    add(`case-study:${slug}`, 'unverified-in-sitemap', 'unverified case study reached the sitemap');
  }
}

// ── Report ───────────────────────────────────────────────────────────────────
const c = { red: '[31m', green: '[32m', yellow: '[33m', dim: '[2m', reset: '[0m' };
if (violations.length === 0) {
  console.log(
    `${c.green}✓ [validate-content-qc] ${publishedSlugs.length} published service page(s), ` +
      `${Object.keys(CASE_STUDIES).length} case stud(y/ies) — all QC checks passed.${c.reset}`,
  );
  process.exit(0);
}

console.error(`\n${c.red}✗ [validate-content-qc] ${violations.length} content-quality violation(s) — build blocked.${c.reset}\n`);
const byWhere = new Map<string, Violation[]>();
for (const v of violations) {
  if (!byWhere.has(v.where)) byWhere.set(v.where, []);
  byWhere.get(v.where)!.push(v);
}
for (const [where, vs] of byWhere) {
  console.error(`  ${c.yellow}${where}${c.reset}`);
  for (const v of vs) console.error(`    ${c.red}✗${c.reset} ${v.check}: ${c.dim}${v.detail}${c.reset}`);
}
console.error(
  `\n  ${c.dim}Fix each item above, or set status to 'draft'/'review' if the page is not ready.` +
    ` A 'published' page must pass every check.${c.reset}\n`,
);
process.exit(1);
