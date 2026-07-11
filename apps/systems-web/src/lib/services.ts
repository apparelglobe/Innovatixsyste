/**
 * Service page registry with an ENFORCED 16-point quality gate. A page is
 * indexable (in sitemap, no `noindex`) ONLY when status==='published' AND every
 * qcChecklist item is true. Thin/incomplete pages render with noindex and are
 * excluded from the sitemap. See INNOVATIX-MASTER-PLAN.md §5.2.
 */
export type QcChecklist = {
  distinctKeywordIntent: boolean;
  uniqueIntroValueProp: boolean;
  industryProblems: boolean;
  serviceSolutionDetail: boolean;
  workflowsUseCases: boolean;
  integrations: boolean;
  securityCompliance: boolean;
  deliverables: boolean;
  faqs: boolean;
  internalLinks: boolean;
  uniqueTitleMeta: boolean;
  canonical: boolean;
  schema: boolean;
  conversionPath: boolean;
  proofReference: boolean;
  editorialSignoff: boolean;
};

export type ServicePage = {
  slug: string; // full path after /services/
  category: string;
  status: 'draft' | 'review' | 'published';
  qc: QcChecklist;
  primaryKeyword: string;
  title: string; // <title>
  metaDescription: string;
  h1: string;
  intro: string[];
  problems: { heading: string; body: string }[];
  solution: { heading: string; body: string }[];
  deliverables: string[];
  technologies: string[];
  process: { step: string; detail: string }[];
  faqs: { q: string; a: string }[];
  proof?: { label: string; href: string };
  internalLinks: { label: string; href: string }[];
};

const qcAllTrue: QcChecklist = {
  distinctKeywordIntent: true, uniqueIntroValueProp: true, industryProblems: true,
  serviceSolutionDetail: true, workflowsUseCases: true, integrations: true,
  securityCompliance: true, deliverables: true, faqs: true, internalLinks: true,
  uniqueTitleMeta: true, canonical: true, schema: true, conversionPath: true,
  proofReference: true, editorialSignoff: true,
};

export const SERVICE_PAGES: Record<string, ServicePage> = {
  'software-engineering/custom-software-development': {
    slug: 'software-engineering/custom-software-development',
    category: 'Software Engineering',
    status: 'published',
    qc: qcAllTrue,
    primaryKeyword: 'custom software development',
    title: 'Custom Software Development Company | Innovatix Systems',
    metaDescription:
      'Innovatix Systems builds custom software for enterprise operations — from ERP and portals to AI automation — with a connected client portal for full project transparency.',
    h1: 'Custom Software Development for Enterprise Operations',
    intro: [
      'Off-the-shelf software forces your business to bend to its limits. Custom software does the opposite: it is engineered around how your operations actually run — your data, your workflows, your integrations, your rules.',
      'Our team builds production systems that companies run their day-to-day operations on: multi-channel commerce platforms, order and inventory systems, customer and vendor portals, finance workflows, and AI automation — all engineered to enterprise standards from day one.',
    ],
    problems: [
      { heading: 'Fragmented tools, no single source of truth', body: 'Orders live in one system, inventory in another, finance in a third. Custom software unifies them into one connected data model so the whole business reads from the same numbers.' },
      { heading: 'Manual work that does not scale', body: 'Spreadsheets and copy-paste break at volume. We automate the repetitive operational work — syncing, reconciling, reporting — so throughput grows without headcount.' },
      { heading: 'Systems that cannot keep up with growth', body: 'Prototypes and no-code tools hit a wall. We architect for scale, security, and integration up front so the platform grows with you instead of being rebuilt.' },
    ],
    solution: [
      { heading: 'Engineered around your workflows', body: 'We start with discovery and requirements, then design a data model and architecture that mirror how your business operates — not a generic template.' },
      { heading: 'Integrated with the systems you already use', body: 'We connect the platforms your operations depend on — marketplaces, payments, shipping carriers, accounting, and identity — through robust, tested integrations.' },
      { heading: 'Built to enterprise standards', body: 'Role-based access, audit logging, automated testing, CI/CD, monitoring, and secure-by-default architecture are part of the build, not an afterthought.' },
    ],
    deliverables: [
      'Discovery, requirements, and a documented solution architecture',
      'A production application built on a connected data model',
      'Integrations with your marketplaces, payments, shipping, and finance systems',
      'Role-based access control, audit logging, and secure authentication',
      'Automated tests, CI/CD pipeline, and monitoring',
      'Documentation, handover, and ongoing support options',
    ],
    technologies: ['TypeScript', 'React / Next.js', 'Node.js / NestJS', 'PostgreSQL', 'AWS', 'Docker / Kubernetes', 'AI / RAG'],
    process: [
      { step: 'Discovery', detail: 'Map goals, constraints, systems, and success metrics.' },
      { step: 'Architecture', detail: 'Design the data model and system boundaries for scale and security.' },
      { step: 'Build', detail: 'Ship in sprints with transparent daily and weekly reporting.' },
      { step: 'QA & UAT', detail: 'Automated and user-acceptance testing against a definition of done.' },
      { step: 'Deploy & Support', detail: 'Controlled release, hypercare, and long-term maintenance.' },
    ],
    faqs: [
      { q: 'How much does custom software development cost?', a: 'It depends on scope and complexity. We scope during discovery and provide a fixed-scope proposal with milestone-based pricing, so you know the investment before development begins.' },
      { q: 'How is custom software different from off-the-shelf?', a: 'Off-the-shelf software makes you adapt to its workflows and limits. Custom software is engineered around your operations, integrates with your existing systems, and scales without per-seat lock-in.' },
      { q: 'How do we track progress during development?', a: 'Every client gets a connected portal with daily and weekly development reports, milestone approvals, files, contracts, and invoices — so you always know status without asking.' },
      { q: 'Do you work with our existing systems?', a: 'Yes. We build integrations with the marketplaces, payment processors, shipping carriers, and accounting tools your business already runs on.' },
    ],
    proof: { label: 'Apparel Globe — a multi-channel operations platform', href: '/case-studies/apparel-globe' },
    internalLinks: [
      { label: 'Enterprise Software Development', href: '/services/software-engineering/enterprise-software-development' },
      { label: 'ERP Development', href: '/services/enterprise-systems/erp-development' },
      { label: 'API Development', href: '/services/software-engineering/api-development' },
      { label: 'Our Delivery Process', href: '/company/process' },
    ],
  },
};

/** True only when the page exists, is published, and all QC items pass. */
export function isIndexable(slug: string): boolean {
  const p = SERVICE_PAGES[slug];
  if (!p || p.status !== 'published') return false;
  return Object.values(p.qc).every(Boolean);
}

/** Slugs safe to include in the sitemap (indexable only). */
export function publishedServiceSlugs(): string[] {
  return Object.keys(SERVICE_PAGES).filter(isIndexable);
}
