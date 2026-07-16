/**
 * Case-study registry. CLAIMS INTEGRITY: a case study is indexable ONLY when
 * `verified === true`. Until then it renders with noindex, is excluded from the
 * sitemap, and shows NO quantified metrics — only scope we can honestly state.
 *
 * `metrics` stays empty until the owner supplies verified numbers. We never
 * invent revenue, counts, %, uptime, timelines, team sizes, certifications,
 * compliance status, or partnerships. `systemsBuilt` lists real deliverables
 * (capabilities engineered), which is factual and safe to present.
 */
export type CaseStudy = {
  slug: string;
  client: string;
  industry: string;
  verified: boolean; // false → noindex + no metrics shown
  title: string;
  metaDescription: string;
  h1: string;
  summary: string;
  challenge: string[];
  approach: string[];
  systemsBuilt: { heading: string; body: string }[];
  stack: string[];
  /** Populated ONLY when verified === true. Empty = "pending verification". */
  metrics: { value: string; label: string }[];
};

export const CASE_STUDIES: Record<string, CaseStudy> = {
  'apparel-globe': {
    slug: 'apparel-globe',
    client: 'Apparel Globe',
    industry: 'Wholesale & Distribution · Multi-channel Commerce',
    verified: false,
    title: 'Apparel Globe — Multi-channel Operations Platform | Innovatix Systems',
    metaDescription:
      'How Innovatix Systems engineered the operations platform an apparel wholesale and D2C business runs on — ERP, OMS, WMS, portals, and integrations. Verified metrics published on confirmation.',
    h1: 'Apparel Globe: an operations platform for a multi-channel apparel business',
    summary:
      'Innovatix Systems engineered the software Apparel Globe runs its day-to-day operations on — a connected platform spanning commerce, orders, inventory, fulfillment, finance, and portals across multiple sales channels.',
    challenge: [
      'A growing apparel business selling across multiple channels was operating on fragmented tools — orders in one place, inventory in another, finance in a third — which forced constant manual reconciliation and made a single source of truth impossible.',
      'The business needed a system that could unify channels, automate operational work, and scale — without the per-seat lock-in and misfit of packaged software.',
    ],
    approach: [
      'We designed a connected data model so orders, inventory, and finance share one authoritative source of truth, and built the platform as modular systems mirroring how the business actually operates.',
      'We integrated the external systems the business depends on — sales channels, shipping carriers, and payments — and automated the repetitive operational work that previously required manual effort.',
    ],
    systemsBuilt: [
      { heading: 'ERP & Order Management', body: 'A custom ERP unifying multi-channel orders, with an order-management workflow from capture through fulfillment.' },
      { heading: 'Inventory & Warehouse', body: 'Real-time inventory and warehouse workflows keeping stock accurate across channels.' },
      { heading: 'Customer & Vendor Portals', body: 'Self-service portals for customers and vendors, connected to the same operational data.' },
      { heading: 'Finance & AR', body: 'Finance and accounts-receivable workflows tied to orders so billing and costing stay in sync.' },
      { heading: 'Marketplace & Shipping Integrations', body: 'Integrations to sales channels (including Amazon and Walmart) and shipping carriers (USPS, UPS, FedEx).' },
      { heading: 'AI Automation & Notifications', body: 'AI-assisted workflows and an operational notification system so nothing time-sensitive is missed.' },
    ],
    stack: ['TypeScript', 'Next.js', 'NestJS', 'PostgreSQL', 'AWS', 'Marketplace & Carrier APIs', 'Stripe', 'AI / RAG'],
    metrics: [], // pending owner verification — do NOT fabricate
  },

  medjaaf: {
    slug: 'medjaaf',
    client: 'MedJAAF',
    industry: 'Healthcare',
    verified: false,
    title: 'MedJAAF — Security-first Healthcare Platform | Innovatix Systems',
    metaDescription:
      'How Innovatix Systems approaches security-first healthcare platform engineering — multi-tenant architecture, enterprise authentication, and audit logging. Details published on verification.',
    h1: 'MedJAAF: a security-first healthcare operations platform',
    summary:
      'A healthcare platform engagement demonstrating security-first architecture — multi-tenant design, enterprise authentication, and audit logging built in from the start.',
    challenge: [
      'Healthcare software carries a high bar for security, access control, and auditability from day one — the architecture has to earn trust before any feature ships.',
    ],
    approach: [
      'We approached the platform security-first: multi-tenant architecture with isolation, enterprise authentication and role-based access, and audit logging as foundational, not optional.',
    ],
    systemsBuilt: [
      { heading: 'Security-first architecture', body: 'Multi-tenant design with tenant isolation and least-privilege access.' },
      { heading: 'Enterprise authentication & RBAC', body: 'Authentication and role-based access control engineered into the foundation.' },
      { heading: 'Audit logging', body: 'Auditability built in so sensitive actions are traceable.' },
    ],
    stack: ['TypeScript', 'NestJS', 'PostgreSQL', 'AWS'],
    metrics: [], // pending verification — no HIPAA / compliance / certification / partnership claims
  },
};

/** A case study is indexable only when verified. */
export function isCaseStudyIndexable(slug: string): boolean {
  return CASE_STUDIES[slug]?.verified === true;
}

export function verifiedCaseStudySlugs(): string[] {
  return Object.keys(CASE_STUDIES).filter(isCaseStudyIndexable);
}
