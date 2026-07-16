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

  'software-engineering/enterprise-software-development': {
    slug: 'software-engineering/enterprise-software-development',
    category: 'Software Engineering',
    status: 'published',
    qc: qcAllTrue,
    primaryKeyword: 'enterprise software development',
    title: 'Enterprise Software Development Company | Innovatix Systems',
    metaDescription:
      'Innovatix Systems engineers enterprise software built to scale — multi-tenant architecture, SSO and RBAC, audit logging, deep integrations, and observability — with full delivery transparency.',
    h1: 'Enterprise Software Development',
    intro: [
      'Enterprise software is a different discipline from building an app. It has to survive real load, satisfy security and audit requirements, integrate with systems across departments, and stay dependable while dozens of people depend on it every day.',
      'We build enterprise platforms with those constraints designed in from the start: multi-tenant architecture, single sign-on and role-based access, audit trails, tested integrations, and the operational tooling — monitoring, CI/CD, backups — that keeps a business-critical system running.',
    ],
    problems: [
      { heading: 'Systems that break at enterprise scale', body: 'Tools built for a small team collapse under enterprise volume, concurrency, and data. We architect for scale — data modeling, indexing, caching, and horizontal scaling — so performance holds as usage grows.' },
      { heading: 'Security and governance gaps', body: 'Enterprises need SSO, granular permissions, audit logging, and a secure development lifecycle — not bolt-ons. We build these in so the platform passes security review and supports compliance readiness.' },
      { heading: 'Integration sprawl across departments', body: 'When every team runs a different tool, data drifts and reconciliation eats hours. We design an API-first integration layer so systems share one authoritative source of truth.' },
    ],
    solution: [
      { heading: 'Architecture for scale and isolation', body: 'Multi-tenant design with tenant isolation (including database row-level security where appropriate), a clean domain model, and boundaries that let the platform grow without a rewrite.' },
      { heading: 'Enterprise-grade security by default', body: 'Enterprise SSO (OIDC/SAML), role-based access control, audit logging, encryption in transit and at rest, secrets management, input validation, and rate limiting — engineered in, not added later.' },
      { heading: 'Reliable operations', body: 'CI/CD pipelines, automated testing, structured logging, monitoring and alerting, backups, and disaster-recovery planning so the platform is dependable and maintainable long-term.' },
    ],
    deliverables: [
      'Solution architecture, threat model, and a documented data model',
      'A multi-tenant platform with tenant isolation and RBAC',
      'Enterprise SSO, audit logging, and secure secrets management',
      'An API-first integration layer for cross-department systems',
      'CI/CD, automated tests, observability, and disaster-recovery plan',
      'Documentation, security review support, and a maintenance plan',
    ],
    technologies: ['TypeScript', 'Next.js', 'NestJS', 'PostgreSQL (RLS)', 'AWS / Azure', 'Kubernetes', 'OIDC / SAML SSO', 'Terraform'],
    process: [
      { step: 'Discovery', detail: 'Map stakeholders, systems, security and compliance requirements.' },
      { step: 'Architecture', detail: 'Design multi-tenant, secure, integration-ready architecture.' },
      { step: 'Build', detail: 'Ship in sprints with transparent daily and weekly reporting.' },
      { step: 'QA & Security', detail: 'Automated tests, UAT, and security testing against a definition of done.' },
      { step: 'Deploy & Operate', detail: 'Controlled release, monitoring, hypercare, and maintenance.' },
    ],
    faqs: [
      { q: 'What makes software “enterprise-grade”?', a: 'Enterprise-grade means the system is built for scale, security, and reliability from the start: multi-tenancy and isolation, SSO and role-based access, audit logging, tested integrations, automated testing and CI/CD, monitoring, and disaster recovery — not features added after launch.' },
      { q: 'Can you meet our security and audit requirements?', a: 'Yes. We build SSO, granular RBAC, audit logging, encryption, and a secure development lifecycle into the platform and support your security review. We advise on compliance readiness but never claim certifications we have not earned on your behalf.' },
      { q: 'How do you integrate with our existing enterprise systems?', a: 'We design an API-first integration layer and build tested connectors to the platforms your departments rely on, so systems share one authoritative source of truth instead of drifting apart.' },
      { q: 'How do you keep a business-critical system reliable?', a: 'Through CI/CD, automated testing, monitoring and alerting, structured logging, backups, and a documented disaster-recovery plan — plus optional ongoing maintenance and support retainers.' },
    ],
    proof: { label: 'Apparel Globe — a multi-channel operations platform', href: '/case-studies/apparel-globe' },
    internalLinks: [
      { label: 'Custom Software Development', href: '/services/software-engineering/custom-software-development' },
      { label: 'ERP Development', href: '/services/enterprise-systems/erp-development' },
      { label: 'Security Engineering', href: '/services/security' },
      { label: 'Our Delivery Process', href: '/company/process' },
    ],
  },

  'ai-services/ai-automation': {
    slug: 'ai-services/ai-automation',
    category: 'AI Services',
    status: 'published',
    qc: qcAllTrue,
    primaryKeyword: 'ai automation',
    title: 'AI Automation Services for Enterprise Operations | Innovatix Systems',
    metaDescription:
      'Innovatix Systems builds production AI automation — document intelligence, workflow automation, and grounded AI agents — with retrieval on your own data, human-in-the-loop review, and enterprise guardrails.',
    h1: 'AI Automation for Enterprise Operations',
    intro: [
      'AI automation is not a chatbot demo. It is production software that removes repetitive operational work — reading documents, routing requests, drafting responses, reconciling data — and does it reliably, on your own data, with guardrails and human review where it matters.',
      'We build AI into the systems your operations already run on, grounded in your data through retrieval so answers are accurate and traceable. The rule is simple: no source, no claim. AI summarizes and acts on verified information; it does not invent it.',
    ],
    problems: [
      { heading: 'High-volume manual work', body: 'Data entry, document processing, triage, and status updates consume hours and scale linearly with headcount. We automate the repetitive steps so your team spends time on judgment, not transcription.' },
      { heading: 'Knowledge trapped in documents and systems', body: 'Answers live in PDFs, emails, and databases nobody can search quickly. We build retrieval over your own content so staff and systems get accurate, cited answers in seconds.' },
      { heading: 'AI pilots that never reach production', body: 'Demos hallucinate, lack grounding, and have no controls — so they stall. We engineer for production: retrieval grounding, evaluations, guardrails, monitoring, and human-in-the-loop approval.' },
    ],
    solution: [
      { heading: 'Automate real workflows with measurable ROI', body: 'We start from an automation opportunity assessment — where volume, cost, and error rates are highest — and automate those workflows end-to-end inside your existing systems.' },
      { heading: 'Grounded in your data', body: 'Retrieval-augmented generation over your documents and databases means outputs are based on your verified information, with citations back to the source.' },
      { heading: 'Production controls and human oversight', body: 'Evaluations, guardrails, audit logging, and human-in-the-loop review keep automation accurate and accountable. Client-facing output requires human approval until confidence is proven.' },
    ],
    deliverables: [
      'An automation opportunity assessment with prioritized ROI',
      'Grounded AI workflows integrated into your existing systems',
      'Document-intelligence pipelines (extract, classify, route)',
      'Human-in-the-loop review and approval controls',
      'Evaluations, guardrails, monitoring, and audit logging',
      'Documentation and a plan to expand automation safely',
    ],
    technologies: ['Large Language Models', 'Retrieval-Augmented Generation', 'Vector Search', 'Python / TypeScript', 'Workflow Orchestration', 'PostgreSQL', 'AWS / Azure AI'],
    process: [
      { step: 'Assess', detail: 'Find the highest-ROI, highest-volume workflows to automate.' },
      { step: 'Ground', detail: 'Build retrieval over your verified data with evaluations.' },
      { step: 'Build', detail: 'Automate the workflow with guardrails and human-in-the-loop.' },
      { step: 'Validate', detail: 'Measure accuracy and ROI against a baseline before scale.' },
      { step: 'Operate', detail: 'Monitor, log, and expand automation as confidence grows.' },
    ],
    faqs: [
      { q: 'What can AI automation actually do for us?', a: 'It removes repetitive, high-volume operational work: reading and classifying documents, extracting data, routing and triaging requests, drafting responses, and reconciling records — integrated into the systems you already use, with human review where accuracy is critical.' },
      { q: 'How do you prevent AI hallucinations and errors?', a: 'We ground the AI in your own data through retrieval so outputs cite verified sources, run evaluations against a baseline, add guardrails, and keep a human in the loop for anything client-facing. Our rule is “no source, no claim.”' },
      { q: 'Is our data secure and private?', a: 'Yes. We design for data security — access controls, encryption, and audit logging — and choose deployment and model options that meet your privacy requirements. We do not train third-party public models on your proprietary data without your explicit approval.' },
      { q: 'How do you prove ROI before scaling?', a: 'We measure accuracy, time saved, and error reduction against a baseline on a defined workflow first, then expand only where the numbers justify it.' },
    ],
    proof: { label: 'Apparel Globe — AI workflows in a live operations platform', href: '/case-studies/apparel-globe' },
    internalLinks: [
      { label: 'AI Agents', href: '/services/ai-services/ai-agents' },
      { label: 'Document Intelligence', href: '/services/ai-services/document-intelligence' },
      { label: 'Custom Software Development', href: '/services/software-engineering/custom-software-development' },
      { label: 'Our Delivery Process', href: '/company/process' },
    ],
  },

  'enterprise-systems/erp-development': {
    slug: 'enterprise-systems/erp-development',
    category: 'Enterprise Systems',
    status: 'published',
    qc: qcAllTrue,
    primaryKeyword: 'erp development',
    title: 'Custom ERP Development Company | Innovatix Systems',
    metaDescription:
      'Innovatix Systems builds custom ERP software around how your business actually operates — orders, inventory, purchasing, and finance in one connected system, integrated with your channels, carriers, and payments.',
    h1: 'Custom ERP Development',
    intro: [
      'Packaged ERPs force your business into their model, then charge for the customization and licensing needed to make them almost fit. A custom ERP does the opposite: it is engineered around how your operations actually run.',
      'We build ERP platforms that unify orders, inventory, purchasing, fulfillment, and finance into one connected system — with a single source of truth, real-time operational visibility, and integrations to the channels, carriers, and payment systems your business depends on.',
    ],
    problems: [
      { heading: 'Packaged ERP that never quite fits', body: 'Off-the-shelf ERPs require costly customization and still leave gaps. A custom ERP is modeled on your real workflows, so it fits without expensive workarounds or per-seat lock-in.' },
      { heading: 'Disconnected modules and data silos', body: 'When orders, inventory, and finance live in separate systems, numbers drift and teams reconcile by hand. One connected data model keeps every module reading from the same truth.' },
      { heading: 'No real-time operational visibility', body: 'Leaders make decisions on stale exports. We build live dashboards and reporting on top of the operational data so the business sees what is happening as it happens.' },
    ],
    solution: [
      { heading: 'Modular ERP around your operating model', body: 'Order management, inventory and warehouse, purchasing and vendors, and finance/AR — designed as connected modules that mirror how your business runs, not a generic template.' },
      { heading: 'One connected data model', body: 'Orders, inventory, and finance share a single authoritative model, so a sale updates stock, costing, and AR automatically — no manual reconciliation.' },
      { heading: 'Integrated with your ecosystem', body: 'Tested integrations to marketplaces and sales channels, shipping carriers, payment processors, and accounting so the ERP is the operational hub, not another silo.' },
    ],
    deliverables: [
      'Order management with multi-channel support',
      'Inventory and warehouse management with real-time stock',
      'Purchasing and vendor management workflows',
      'Finance and accounts-receivable workflows',
      'Live operational dashboards and reporting',
      'Integrations (channels, carriers, payments, accounting), RBAC, and audit logging',
    ],
    technologies: ['TypeScript', 'Next.js', 'NestJS', 'PostgreSQL', 'AWS', 'Marketplace & Carrier APIs', 'Stripe'],
    process: [
      { step: 'Discovery', detail: 'Map your order-to-cash and procure-to-pay workflows.' },
      { step: 'Data Model', detail: 'Design the connected model linking orders, inventory, finance.' },
      { step: 'Build', detail: 'Deliver modules in phases with transparent reporting.' },
      { step: 'Migrate & Test', detail: 'Migrate data, integrate systems, and run UAT.' },
      { step: 'Go-Live & Support', detail: 'Phased rollout, hypercare, and ongoing support.' },
    ],
    faqs: [
      { q: 'Why build a custom ERP instead of buying SAP or NetSuite?', a: 'Packaged ERPs make you adapt to their model and charge heavily for customization and licensing to close the gap. A custom ERP is built around your actual workflows, integrates cleanly with your channels and carriers, and avoids per-seat lock-in — you own the system.' },
      { q: 'How do you migrate from our current ERP or spreadsheets?', a: 'We plan data migration during discovery — mapping, cleaning, and validating your data — and run it in stages with reconciliation so nothing is lost and the cutover is controlled.' },
      { q: 'Can it integrate with our sales channels and carriers?', a: 'Yes. We build tested integrations to marketplaces (such as Amazon and Walmart), shipping carriers (USPS, UPS, FedEx), payment processors, and accounting systems so the ERP is your operational hub.' },
      { q: 'Do we have to build the whole ERP at once?', a: 'No. We deliver in phases — typically starting with the module that relieves the most operational pain — so you get value early and expand the platform over time.' },
    ],
    proof: { label: 'Apparel Globe — a custom ERP for multi-channel operations', href: '/case-studies/apparel-globe' },
    internalLinks: [
      { label: 'Order Management Systems', href: '/services/enterprise-systems/order-management-systems' },
      { label: 'Warehouse Management Systems', href: '/services/enterprise-systems/warehouse-management-systems' },
      { label: 'Inventory Management Systems', href: '/services/enterprise-systems/inventory-management-systems' },
      { label: 'Our Delivery Process', href: '/company/process' },
    ],
  },

  'software-engineering/api-development': {
    slug: 'software-engineering/api-development', category: 'Software Engineering', status: 'published', qc: qcAllTrue,
    primaryKeyword: 'api development',
    title: 'API Development Services | Enterprise Integration | Innovatix Systems',
    metaDescription: 'Innovatix Systems designs and builds production APIs — REST and GraphQL, OAuth2/JWT auth, rate limiting, versioning, and OpenAPI docs — so your systems, partners, and AI agents integrate reliably.',
    h1: 'API Development for Enterprise Integration',
    intro: [
      "Every enterprise system eventually needs to talk to another one — a warehouse platform to a marketplace, a CRM to a billing engine, an internal tool to an AI agent acting on its behalf. The API is the contract that makes that conversation possible, and a poorly designed one becomes the single point of failure for every integration built on top of it: undocumented endpoints, breaking changes shipped without warning, authentication that leaks under load, and rate limits nobody tested until a partner's bulk job took the service down.",
      "We design and build APIs as first-class products, not afterthoughts bolted onto an internal admin panel. That means explicit versioning, documented contracts before code is written, authentication and authorization modeled around real consumers (internal services, partner systems, and increasingly AI agents), and observability that tells you which endpoint broke and for whom before your partner's support ticket does. Whether you need a new API-first platform, a stable public interface over a legacy system, or a hardened integration layer for EDI, marketplace, or ERP connections, we build it to be trusted by machines and partners for years, not just to pass a demo.",
    ],
    problems: [
      { heading: 'Undocumented, unstable contracts', body: "APIs built as a side effect of frontend work rarely have a real contract — field shapes drift, error formats vary by endpoint, and there's no OpenAPI spec a partner or an AI agent can read to know what to expect. Every integration becomes a support conversation instead of a self-service lookup." },
      { heading: 'Breaking changes with no migration path', body: 'Without deliberate versioning, a schema change made for one internal consumer silently breaks a partner integration or a mobile client three versions behind. Teams end up afraid to touch the API at all, which stalls the product roadmap.' },
      { heading: "Auth and rate limiting that don't match real usage", body: 'A single API key shared across every consumer, no scoped permissions, and no rate limiting means one runaway script or one compromised credential can take down the platform for every partner at once — and there is no audit trail to tell you who did what.' },
    ],
    solution: [
      { heading: 'API-first design, contract before code', body: 'We define the resource model, request/response shapes, and error semantics up front, expressed as an OpenAPI (or GraphQL schema) specification that becomes the source of truth for both the implementation and the documentation your partners read.' },
      { heading: 'Auth, scopes, and rate limits sized to the consumer', body: 'OAuth2 client-credentials or JWT flows for service-to-service and partner access, scoped API keys where that fits better, per-consumer rate limiting and quotas, and webhook signing — so a bad actor or a runaway integration is contained, not catastrophic.' },
      { heading: 'Versioned and observable in production', body: 'Explicit URI or header-based versioning so old consumers keep working while new capability ships, plus structured logging, request tracing, and error-rate monitoring per endpoint and per consumer so you see a problem before it becomes an incident.' },
    ],
    deliverables: [
      'OpenAPI 3.x specification (or GraphQL schema) as the reviewable, versioned contract',
      'Authentication and authorization layer — OAuth2 / JWT / scoped API keys with per-consumer permissions',
      'Rate limiting, quota, and throttling rules matched to each consumer tier',
      'Webhook or event-stream delivery for asynchronous integrations, with signing and retry/backoff',
      'Interactive API documentation and, where useful, generated client SDKs',
      'Request logging, tracing, and per-endpoint error/latency monitoring in production',
    ],
    technologies: ['TypeScript / Node.js', 'NestJS / Express', 'REST', 'GraphQL', 'OpenAPI / Swagger', 'PostgreSQL / Redis', 'OAuth2 / JWT', 'Docker / Kubernetes'],
    process: [
      { step: 'Discovery', detail: 'We map who consumes the API today and who will tomorrow — internal services, partners, mobile clients, AI agents — and the volumes and failure modes each one implies.' },
      { step: 'Contract design', detail: 'We draft the resource model and OpenAPI/GraphQL schema, review it with your team and, where relevant, the partner or downstream consumer, before writing implementation code.' },
      { step: 'Build', detail: 'We implement endpoints against the agreed contract, with authentication, rate limiting, and versioning wired in from the start rather than retrofitted.' },
      { step: 'Testing & hardening', detail: 'Contract tests validate the implementation against the spec, load tests confirm rate limits and quotas behave correctly under real traffic, and security testing checks auth boundaries and scope enforcement.' },
      { step: 'Deploy & support', detail: 'We ship with monitoring and alerting live from day one, and provide ongoing support for new consumers, schema evolution, and incident response — visible to you throughout in the connected client portal.' },
    ],
    faqs: [
      { q: 'REST or GraphQL — which is right for us?', a: "It depends on your consumers. REST with a clear OpenAPI contract is usually the right default for partner and marketplace integrations because it's simple to document, cache, and rate-limit per endpoint. GraphQL earns its complexity when you have many different frontend or partner clients each needing different slices of the same data and want to avoid over-fetching. We'll recommend one based on your actual consumer mix, not a blanket preference." },
      { q: 'How do you handle authentication for partner and third-party integrations?', a: "We typically use OAuth2 client-credentials flow or scoped API keys, depending on the consumer's technical sophistication and your control requirements. Each consumer gets its own credentials and permission scope, so access can be audited and revoked individually rather than sharing one key across every integration." },
      { q: 'What happens when the API needs to change after partners are already integrated?', a: 'We version the API explicitly (via URI path or header) from the first release, so a new version can introduce breaking changes while existing consumers keep working against the version they built to. We also document a deprecation timeline so partners have a clear migration window rather than a surprise cutoff.' },
      { q: 'Can our API be built so AI agents can use it reliably?', a: "Yes — that's increasingly a design requirement, not an afterthought. A well-documented OpenAPI spec, predictable error formats, and scoped, rate-limited authentication are exactly what lets an AI agent call your API safely and consistently, the same way a human developer or partner system would." },
    ],
    proof: { label: 'Apparel Globe — a multi-channel operations platform', href: '/case-studies/apparel-globe' },
    internalLinks: [
      { label: 'Custom Software Development', href: '/services/software-engineering/custom-software-development' },
      { label: 'Systems Integration', href: '/services/software-engineering/systems-integration' },
      { label: 'AI Automation', href: '/services/ai-services/ai-automation' },
      { label: 'Our Process', href: '/company/process' },
    ],
  },

  'software-engineering/systems-integration': {
    slug: 'software-engineering/systems-integration', category: 'Software Engineering', status: 'published', qc: qcAllTrue,
    primaryKeyword: 'systems integration',
    title: 'Systems Integration Services | Connect ERP, Marketplaces & APIs | Innovatix Systems',
    metaDescription: 'Custom systems integration that unifies ERP, marketplaces, payments, carriers, and accounting into one reliable source of truth — event-driven, idempotent, observable.',
    h1: 'Systems Integration: One Source of Truth Across Every System You Run On',
    intro: [
      'Most mid-market and enterprise operations run on a patchwork: an ERP for inventory and accounting, a handful of marketplace channels (Amazon, Walmart, Shopify), a payment processor or two, a shipping carrier mix, and a growing list of point tools bolted on as the business grew. Each of these systems has its own model of "what is true" — its own view of an order, a SKU, a customer, an inventory count — and none of them agree with each other by default. The gap between those views is where inventory oversells happen, where orders get double-shipped or never shipped, where finance reconciles by hand at month-end, and where a support rep has to open four tabs to answer one customer question.',
      'We build the integration layer that closes that gap: the pipes, transformers, and reconciliation logic that move data between systems reliably, in the right shape, in the right order, without silently dropping records when a webhook fires twice or a downstream API times out. This is not an off-the-shelf iPaaS connector wired up and left alone — it is engineered for your specific systems, your specific failure modes, and your specific definition of "correct," with the observability to prove it is working and the resilience to keep working when one link in the chain goes down.',
    ],
    problems: [
      { heading: 'Every system has a different answer to the same question', body: 'Your ERP says 42 units are in stock. Amazon says 50. Walmart says 38, because its last sync failed silently three days ago. Nobody notices until a customer orders something you do not have, and now you are canceling an order and eating a metric ding on a marketplace that already throttles sellers with cancellation problems. Without a canonical source of truth and a reconciliation process that catches drift, every downstream system is a guess.' },
      { heading: 'Point-to-point integrations turn into an unmaintainable mesh', body: 'The first integration between two systems is easy. The tenth — when Shopify, the ERP, the WMS, the accounting package, and three marketplaces all talk directly to each other in different formats with different auth schemes — is a tangle nobody fully understands, where changing one field breaks something unrelated three systems away. Adding an eleventh integration takes longer than the first ten combined.' },
      { heading: 'Retries and duplicates quietly corrupt your data', body: 'A webhook fires, your server takes 30 seconds to respond because a downstream API is slow, the sender times out and retries — and now you have processed the same order twice, deducted inventory twice, or emailed the customer twice. Without idempotency keys, deduplication logic, and a clear-eyed design for at-least-once delivery, integrations that look fine in testing generate duplicate records under real production load.' },
    ],
    solution: [
      { heading: 'A canonical data model with explicit ownership', body: 'We define which system owns each piece of data — inventory truth typically lives in the ERP or WMS, order truth in an order-management layer, customer identity behind SSO — and build every integration to read from and write to that canonical model rather than letting each system push its own version of reality. Conflicts get resolved by rule, not by whichever sync happened to run last.' },
      { heading: 'Event-driven pipelines with queues, not fragile point-to-point calls', body: 'Rather than wiring each system directly to every other system, we route data through message queues and event streams: a change in the ERP publishes an event, and every interested system — marketplace listings, accounting, the storefront — consumes it independently, at its own pace, with automatic retry and dead-letter handling when a consumer is down. Adding a new system means adding a new consumer, not rewiring the mesh.' },
      { heading: 'Idempotent processing with end-to-end observability', body: 'Every inbound webhook and outbound API call carries an idempotency key so retries and duplicate deliveries are collapsed safely instead of double-processed. We instrument the whole pipeline — queue depth, failed-job counts, per-integration error rates, reconciliation drift — so you find out about a stuck sync from a dashboard alert, not from a customer complaint or a finance team doing manual spreadsheet reconciliation weeks later.' },
    ],
    deliverables: [
      'Integration architecture document mapping every system, data owner, and event flow before a line of code is written',
      'Event-driven integration layer (queues/webhooks) connecting ERP, marketplaces, payment processors, and carriers',
      'Data mapping and transformation layer reconciling field-level differences (SKUs, units, tax codes, statuses) between systems',
      'Idempotency, retry, and dead-letter handling so duplicate or failed deliveries never corrupt downstream data',
      'Monitoring and alerting dashboards for sync health, queue backlogs, and reconciliation drift',
      'Connected client portal giving your team full transparency into integration status, error logs, and data flow — no black box',
    ],
    technologies: ['REST & GraphQL APIs', 'Webhooks', 'Message queues (SQS/RabbitMQ-class)', 'Event-driven architecture', 'OAuth2 / SSO', 'PostgreSQL', 'Node.js / TypeScript', 'Observability tooling (structured logging, metrics, tracing)'],
    process: [
      { step: 'Discovery', detail: 'We inventory every system in play — ERP, marketplaces, payment processors, carriers, accounting — and map current data flows, ownership gaps, and where drift already exists today.' },
      { step: 'Architecture', detail: 'We design the canonical data model, event/queue topology, and error-handling strategy, deciding system-by-system between an iPaaS connector and a custom integration layer based on volume, latency, and control needs.' },
      { step: 'Build', detail: 'We build the integration layer incrementally — connector by connector — with idempotency and retry logic in from day one, not bolted on after the first duplicate-order incident.' },
      { step: 'QA & UAT', detail: 'We test failure paths deliberately: dropped connections, delayed webhooks, out-of-order events, and duplicate deliveries, verifying the system reconciles correctly under real-world conditions, not just the happy path.' },
      { step: 'Deploy & Support', detail: 'We roll out with monitoring live from day one, then stay engaged for tuning, new-system onboarding, and incident response as your integration surface grows.' },
    ],
    faqs: [
      { q: 'Should we use an iPaaS tool (Zapier, Workato) or build a custom integration layer?', a: "It depends on volume, complexity, and how much control you need over failure handling. iPaaS tools are fast to stand up for low-volume, simple field mappings between well-supported connectors. Once you need custom retry logic, high-throughput event processing, non-standard data reconciliation, or integrations with systems an iPaaS does not support well, a custom layer built on queues and your own transformation logic gives you control an off-the-shelf tool cannot. Many engagements end up hybrid: iPaaS for simple syncs, custom code for anything touching inventory, orders, or money." },
      { q: 'How do you prevent duplicate orders or double-processed webhooks?', a: 'Every inbound event carries or is assigned an idempotency key, and processing logic checks that key before acting — so a retried webhook or a duplicate delivery is recognized and safely ignored rather than reprocessed. Combined with queue-based delivery and dead-letter handling for events that fail repeatedly, this is designed in from the architecture phase, not patched in after a production incident.' },
      { q: 'What happens when one of our systems (a marketplace API, a carrier) goes down or changes without notice?', a: 'The integration layer is built to degrade gracefully: failed calls go to a retry queue with backoff, persistent failures land in a dead-letter queue and trigger an alert rather than silently dropping data, and other integrations keep running unaffected. When a third-party API changes its contract, the isolated connector for that system is the only piece that needs updating — it does not cascade into the rest of the pipeline.' },
      { q: 'Will we be able to see what is happening inside the integration, or is it a black box once it is built?', a: 'You get a connected client portal showing sync status, error logs, and data flow for every integration in the system — so your team can see exactly what synced, what failed and why, and how current your data is, without needing to file a ticket to find out.' },
    ],
    proof: { label: 'Apparel Globe — a multi-channel operations platform', href: '/case-studies/apparel-globe' },
    internalLinks: [
      { label: 'Custom Software Development', href: '/services/software-engineering/custom-software-development' },
      { label: 'API Development', href: '/services/software-engineering/api-development' },
      { label: 'Order Management Systems', href: '/services/enterprise-systems/order-management-systems' },
      { label: 'Our Process', href: '/company/process' },
    ],
  },

  'ai-services/ai-agents': {
    slug: 'ai-services/ai-agents', category: 'AI Services', status: 'published', qc: qcAllTrue,
    primaryKeyword: 'ai agents',
    title: 'AI Agents Development | Autonomous Action, Not Just Answers | Innovatix Systems',
    metaDescription: 'We build AI agents that take real action inside your ERP, CRM, and OMS — tool-calling, planning, guardrails, human approval, and full audit trails.',
    h1: 'AI Agents That Take Action Inside Your Systems',
    intro: [
      'Most AI projects stop at a chat window: the model answers a question and a person still has to open the order, update the record, or send the email. An AI agent is different by design — it is given tools (functions, APIs, database actions), a scoped set of permissions, and a goal, and it plans a sequence of steps to get there, calling into your actual systems along the way. The distinction matters commercially: a chatbot reduces how long it takes a human to find an answer; an agent reduces how many humans are needed to complete the workflow at all.',
      'We design and build agentic systems for operations, finance, and customer-facing teams that need software to act, not just respond — checking inventory and creating a purchase order, reconciling a mismatched invoice against a PO, triaging and routing a support ticket, or assembling a multi-step report from data that lives in three different systems. Every agent we ship is built with explicit tool boundaries, a human-in-the-loop gate on anything risky or costly, and full tracing of what it did and why — because an agent your team cannot audit is not a system you can run a business on.',
    ],
    problems: [
      { heading: 'Your chatbot can explain the workflow, but someone still has to run it', body: 'A support or ops bot that answers "how do I reprocess a return" is convenience, not leverage — a person still opens the system, finds the order, and clicks through the steps by hand. The labor the business actually wanted to remove never left the building; it just got a better search box in front of it.' },
      { heading: 'Point-to-point automation scripts break the moment a workflow changes', body: 'Rule-based automations and RPA scripts encode one fixed path through a process, so a new SKU format, an added approval step, or a vendor changing an API response silently breaks them. There is no reasoning layer to adapt — just a brittle script that has to be rewritten by a developer every time reality shifts.' },
      { heading: 'Nobody can explain why the AI did what it did', body: 'When an LLM is wired directly to write actions with no logging, no permission boundary, and no approval step, the first incident — a wrong refund, a duplicated order, a price update that should not have gone out — becomes a governance crisis with no trail to reconstruct. Leadership ends up banning the very automation that was supposed to save time.' },
    ],
    solution: [
      { heading: 'Tool-calling agents that complete the task, not just describe it', body: 'We build agents on function/tool-calling — the model is given a defined set of callable actions against your systems (create a PO, update a shipment status, draft a customer reply, query a report) and it selects, sequences, and executes them toward a stated goal. The output is a completed action with a result, not a paragraph telling a human what to go do.' },
      { heading: 'Planning and orchestration built around your actual workflows', body: 'Rather than a single prompt-to-action call, multi-step tasks run through an orchestration layer that plans, executes, checks intermediate results, and re-plans when a step fails or returns something unexpected — the same way a competent employee would handle an exception instead of grinding to a halt. Retrieval grounds every step in your own data (catalog, inventory, order history, policies) instead of the model general training knowledge.' },
      { heading: 'Every action logged, permissioned, and reviewable', body: 'Each agent operates inside an explicit capability scope: which tools it can call, which data it can read, and which actions require a human to approve before they execute — refunds over a threshold, price changes, anything touching a customer account. Every run is traced end-to-end (inputs, reasoning steps, tool calls, outputs, cost) and visible in a connected client portal for full transparency.' },
    ],
    deliverables: [
      'Agent capability map and permission scoping — exactly which actions the agent may take autonomously versus route for human approval',
      'Tool/function-calling integration layer connecting the agent to your ERP, CRM, OMS, or WMS through secured, scoped APIs',
      'Retrieval pipeline that grounds agent decisions in your own product, order, and policy data instead of general model knowledge',
      'Human-in-the-loop approval workflow with a review queue for high-risk, high-cost, or irreversible actions',
      'Evaluation, tracing, and observability stack covering run logs, failure rates, and per-agent cost so you can see what it is doing and what it costs',
      'Connected client portal for full transparency into agent activity, approvals pending, and outcomes over time',
    ],
    technologies: ['LLM function/tool-calling APIs (OpenAI, Anthropic Claude)', 'Agent orchestration (LangGraph, custom planner/executor loops)', 'Vector retrieval (pgvector, Pinecone)', 'PostgreSQL for state and run history', 'NestJS / Node.js and Python tool layers', 'Queue-based orchestration (BullMQ, Temporal)', 'OpenTelemetry tracing', 'Redis for session state and rate/cost control'],
    process: [
      { step: 'Discovery', detail: 'We map the workflow the agent will take over end to end — which systems it touches, which actions are reversible versus not, and where a human must stay in the loop — before any tool is wired up.' },
      { step: 'Architecture', detail: 'We define the agent tool set, permission boundaries, retrieval sources, and approval gates, and design the orchestration layer that will plan and sequence multi-step runs against your systems.' },
      { step: 'Build', detail: 'We implement the tool-calling integrations, retrieval grounding, and orchestration logic, connecting the agent to your ERP/CRM/OMS through scoped, secured APIs rather than broad standing access.' },
      { step: 'QA & UAT', detail: 'We run the agent against real and adversarial scenarios — ambiguous requests, tool failures, edge-case data — and validate with your team that approval gates trigger correctly before anything touches production data.' },
      { step: 'Deploy & Support', detail: 'We roll the agent out with tracing and cost monitoring active from day one, then tune prompts, tool boundaries, and approval thresholds based on real run data through our connected client portal.' },
    ],
    faqs: [
      { q: 'What is the actual difference between an AI agent and a chatbot?', a: 'A chatbot answers questions in natural language; a human still has to act on the answer. An AI agent is given tools — callable functions against your real systems — and a goal, and it plans and executes the steps itself, such as creating a purchase order or updating a shipment status, with the result being a completed action rather than a suggestion.' },
      { q: 'How do you stop an agent from taking a wrong or costly action?', a: 'Every agent operates inside an explicit permission scope defined during architecture — actions below a set risk or cost threshold can run autonomously, while anything higher-stakes (refunds, price changes, irreversible updates) is routed to a human approval queue before it executes. Nothing runs with unscoped, standing access to your systems.' },
      { q: 'Can an agent integrate with our existing ERP, CRM, or warehouse system?', a: 'Yes — agents connect through the same secured, scoped API layer we would use for any systems integration, calling defined endpoints in your ERP, CRM, OMS, or WMS rather than requiring a rip-and-replace of those systems. The agent gets exactly the read/write access its task requires, nothing more.' },
      { q: 'How do we know what an agent is doing once it is live?', a: 'Every run is traced step by step — the plan it formed, the tools it called, the data it retrieved, and the outcome — and surfaced through a connected client portal along with cost and approval status, so your team has a real audit trail instead of a black box.' },
    ],
    proof: { label: 'Apparel Globe — a multi-channel operations platform', href: '/case-studies/apparel-globe' },
    internalLinks: [
      { label: 'AI Automation', href: '/services/ai-services/ai-automation' },
      { label: 'API Development', href: '/services/software-engineering/api-development' },
      { label: 'Systems Integration', href: '/services/software-engineering/systems-integration' },
      { label: 'Our Process', href: '/company/process' },
    ],
  },

  'ai-services/document-intelligence': {
    slug: 'ai-services/document-intelligence', category: 'AI Services', status: 'published', qc: qcAllTrue,
    primaryKeyword: 'document intelligence',
    title: 'Document Intelligence Services | Automated Data Extraction — Innovatix Systems',
    metaDescription: 'Turn invoices, POs, contracts, and forms into validated structured data automatically. OCR + LLM extraction, confidence scoring, human-in-the-loop review, and direct posting to your ERP or AP system.',
    h1: 'Document Intelligence: From Unstructured Paperwork to Validated System Data',
    intro: [
      "Every operations, finance, and procurement team has the same quiet drain on productivity: someone has to open a PDF, a scanned invoice, or an emailed purchase order and retype what is in it into the system of record. It is slow, it is inconsistent between people, and it is where line-item errors, missed remittances, and duplicate payments actually originate. The documents themselves are not the problem — the manual bridge between the document and the database is.",
      "Document intelligence closes that bridge with software instead of headcount. We build pipelines that classify incoming documents, extract fields and line items with OCR and LLM-based extraction, score every field for confidence, route anything below threshold to a human reviewer, and post the validated result straight into your ERP, AP, OMS, or warehouse system through an API — with a full audit trail of what was extracted, what was corrected, and by whom. The goal is not to read the PDF — it is to eliminate the re-keying step entirely while making the result more auditable than the manual process it replaces.",
    ],
    problems: [
      { heading: "Manual data entry does not scale and does not stay accurate", body: "Invoices, purchase orders, packing slips, remittance advices, and contracts arrive in dozens of formats — vendor-specific templates, scanned faxes, emailed PDFs — and someone has to key each one into the ERP or AP system by hand. As volume grows, so does the backlog, and so does the error rate: transposed quantities, misread unit prices, missed line items. Generic OCR software reads text off a page but does not understand that this document is a packing slip versus a customer PO versus a carrier invoice, so it still needs a human to interpret and route it." },
      { heading: 'Extraction without validation just moves the error, it does not remove it', body: "Off-the-shelf OCR tools will happily return a low-confidence, wrong-format, or partially-misread field with the same visual confidence as a correct one — there is no systematic way to know which extracted values need a second look before they hit your accounting or inventory system. Teams either trust the output blindly (and eat the downstream errors) or manually re-verify every single document (which erases the labor savings extraction was supposed to deliver)." },
      { heading: 'Extracted data has nowhere to go without integration work', body: "Even when a document is read correctly, the output is often a JSON blob or a spreadsheet export sitting outside your actual systems. Someone still has to open the ERP, find the right PO or vendor bill, and manually transcribe the extracted values in — which reintroduces the exact manual step the extraction was meant to remove, and gives you no record of which system field came from which source document." },
    ],
    solution: [
      { heading: 'Classification and extraction tuned to your actual document set', body: "We build the pipeline around the specific document types your business receives — vendor invoices, POs, remittances, packing slips, credit agreements, whatever your operation runs on — rather than a generic upload-any-PDF black box. Each document is first classified by type and source, then routed through an extraction schema built for that document fields and line-item structure, combining OCR for layout/text recognition with LLM-based extraction for context, table parsing, and handling of format variation between vendors." },
      { heading: 'Confidence scoring and human-in-the-loop review as a first-class step', body: "Every extracted field carries a confidence score. High-confidence documents post straight through automatically; anything below your configured threshold — a smudged total, an ambiguous SKU, a field the model is not sure about — is queued into a review interface where a human confirms or corrects it before it moves downstream. This is not a bolt-on QA step; it is built into the pipeline from day one, so accuracy improves over time and nothing questionable reaches your books unreviewed." },
      { heading: 'Validated data posted directly into your systems, with a full audit trail', body: "Once a document clears validation — automatically or via reviewer sign-off — the structured result is posted through an API integration into your ERP, AP workflow, order management system, or warehouse platform, matched against existing POs or vendor records where applicable. Every extraction, correction, and posting is logged: which document produced which value, what confidence it scored, who touched it, and when — so the process is auditable end to end." },
    ],
    deliverables: [
      'Document classification model covering your specific document types (invoices, POs, packing slips, remittances, contracts, forms)',
      'OCR + LLM extraction pipeline with field- and line-item-level schema mapping per document type',
      'Confidence scoring engine with configurable thresholds for auto-post vs. human review',
      'Human-in-the-loop review interface for low-confidence or exception documents',
      'API integration posting validated data directly into your ERP, AP, OMS, or warehouse system',
      'Full audit trail and reporting on extraction accuracy, review volume, and processing throughput',
    ],
    technologies: ['OCR engines', 'LLM-based extraction', 'Document classification models', 'REST / webhook APIs', 'Queue-based processing pipelines', 'PostgreSQL', 'Node.js / Python services', 'Cloud object storage'],
    process: [
      { step: 'Discovery', detail: 'We inventory your actual document types, volumes, and current manual handling — invoices, POs, remittances, contracts — and map exactly where the data needs to land downstream (ERP, AP, OMS, WMS) and what validation rules matter for your business.' },
      { step: 'Architecture', detail: 'We design the classification schema, per-document-type extraction fields, confidence thresholds, review-routing logic, and the API contract for posting results into your target system, including how exceptions and mismatches are handled.' },
      { step: 'Build', detail: 'We build the extraction pipeline, review interface, and integration layer, testing against real historical documents from your own vendor and customer mix rather than generic samples.' },
      { step: 'QA & UAT', detail: 'Your team runs live documents through the pipeline, verifying extraction accuracy, confidence scoring behavior, and review workflow before any auto-posting is enabled, with side-by-side comparison against manually-entered records.' },
      { step: 'Deploy & Support', detail: 'We roll out in production with monitoring on extraction accuracy and review queue volume, then tune thresholds and schemas as new document formats appear — with a connected client portal for full transparency into every document processed, reviewed, or posted.' },
    ],
    faqs: [
      { q: 'What kinds of documents can this handle?', a: 'Invoices, purchase orders, packing slips, remittance advices, contracts, wholesale agreements, and structured forms — effectively any recurring document type your business receives on paper, PDF, scan, or email. We build the classification and extraction schema around your actual document mix rather than a generic template.' },
      { q: 'How do you prevent extraction errors from reaching our accounting or inventory system?', a: 'Every extracted field is scored for confidence. Documents that clear your configured threshold post automatically; anything uncertain — a smudged number, an unfamiliar layout, an ambiguous line item — routes to a human reviewer before it ever reaches your ERP or AP system. Nothing questionable posts unreviewed.' },
      { q: 'Does this replace our ERP or AP software?', a: 'No — it sits in front of it. The pipeline classifies and extracts documents, validates the result, and posts the structured data into your existing ERP, AP workflow, order management system, or warehouse platform through an API. You keep your system of record; you eliminate the manual re-keying step feeding it.' },
      { q: 'What happens after deployment — do we need to keep tuning it?', a: 'Some ongoing tuning is normal as new vendor formats or document variants appear, and we build the pipeline so thresholds and schemas can be adjusted without a rebuild. Support after go-live includes monitoring extraction accuracy and review volume, plus a connected client portal so you can see exactly what has been processed, flagged, or corrected at any time.' },
    ],
    proof: { label: 'Apparel Globe — a multi-channel operations platform', href: '/case-studies/apparel-globe' },
    internalLinks: [
      { label: 'Enterprise Software Development', href: '/services/software-engineering/enterprise-software-development' },
      { label: 'API Development', href: '/services/software-engineering/api-development' },
      { label: 'Systems Integration', href: '/services/software-engineering/systems-integration' },
      { label: 'Our Process', href: '/company/process' },
    ],
  },

  'enterprise-systems/crm-development': {
    slug: 'enterprise-systems/crm-development', category: 'Enterprise Systems', status: 'published', qc: qcAllTrue,
    primaryKeyword: 'crm development',
    title: 'CRM Development | Custom CRM Software Built Around Your Sales Process',
    metaDescription: 'Custom CRM development that models your actual pipeline, quoting, and service workflows instead of forcing your team into HubSpot or Salesforce templates.',
    h1: 'CRM Development for Teams Outgrowing Off-the-Shelf Sales Tools',
    intro: [
      'Most CRM rollouts start the same way: a sales leader picks a well-known platform, a consultant maps the team pipeline onto its default stages as closely as it will bend, and six months later reps are keeping the deal truth in spreadsheets and sticky notes because the tool does not match how the business actually sells. The gap is not a training problem — it is an architecture problem. Salesforce, HubSpot, and similar platforms are built as generalized data models with a configuration layer bolted on top, and once your sales motion involves multi-entity accounts, usage-based pricing, territory splits, or a quoting process tied to real-time inventory or production capacity, that configuration layer runs out of road.',
      'Custom CRM development flips the starting point: the data model and pipeline logic are designed from your sales and service process first, and the interface is built to match how your reps, account managers, and support staff actually work day to day. That means pipeline stages that reflect your real deal lifecycle, not a generic Prospecting-to-Closed-Won template; account and contact structures that handle the entity relationships specific to your business (parent/child accounts, multiple ship-to locations, buying groups, reseller hierarchies); and native integration with the ERP, order management, telephony, and email systems you already run, so the CRM is a system of record rather than a second copy of the truth. Innovatix Systems builds these platforms as owned software — no per-seat licensing ceiling and a data model that can evolve as the business does.',
    ],
    problems: [
      { heading: 'Generic pipelines hide the deal stages that actually matter', body: 'Off-the-shelf CRMs ship with a default sales funnel and a configuration UI for renaming stages, but the underlying logic — what triggers a stage change, what fields are required at each gate, how approvals and discount thresholds are enforced — is either locked down or requires expensive platform-specific scripting. Sales and RevOps teams end up managing the real qualification and approval rules in side documents while the CRM shows a sanitized, less accurate version of pipeline health.' },
      { heading: 'Account and contact data does not match how the business is actually structured', body: 'B2B sellers frequently deal with parent companies, multiple divisions, several buyers per account, and ship-to locations that do not map to the standard Account-Contact-Opportunity model most CRMs assume. Forcing that structure onto a flat model produces duplicate accounts, contacts attached to the wrong entity, and reporting that cannot answer basic questions like total spend per parent company or renewal risk across a whole buying group.' },
      { heading: 'The CRM is disconnected from the systems that hold the actual answers', body: 'Reps need to know current inventory, order status, outstanding invoices, and shipment history to have a real conversation with a customer — and in most off-the-shelf setups that data lives in the ERP or OMS, not the CRM, requiring tab-switching, manual lookups, or brittle third-party connector apps that break silently and go unnoticed until a deal stalls.' },
    ],
    solution: [
      { heading: 'Pipeline and stage logic modeled on your real sales motion', body: 'We design pipeline stages, required fields, approval gates, and stage-transition rules around how deals actually progress in your business — including parallel pipelines for new business vs. renewals, quote-approval workflows tied to discount or margin thresholds, and territory or vertical-specific stage variants where the sales motion genuinely differs.' },
      { heading: 'An account, contact, and deal data model that mirrors your business structure', body: 'Accounts can carry parent/child hierarchies, multiple ship-to and bill-to locations, and role-based contacts per buying committee. Activity and communication — calls, emails, meeting notes, support interactions — log against the right entity automatically, so account history is a complete, chronological record instead of a scattered set of notes.' },
      { heading: 'Native integration with quoting, ERP/OMS, email, and telephony', body: 'Quoting pulls live pricing, inventory, and product data directly from your ERP or OMS instead of a stale export; sent quotes, orders, and invoice status flow back into the account timeline automatically. Email and calendar sync log correspondence without manual entry, and telephony integration (click-to-call, call logging, recording links) attaches directly to the contact or deal record — all built on the same integration layer used across your other enterprise systems.' },
    ],
    deliverables: [
      'Custom pipeline and deal-stage engine with configurable approval gates and discount/margin rules',
      'Account, contact, and territory data model supporting parent/child hierarchies and multi-location accounts',
      'Quoting module with live pricing and inventory lookups against your ERP/OMS',
      'Activity and communication logging (email, calls, meetings, support notes) tied automatically to the correct account or deal',
      'Role-based permissions and territory assignment rules controlling record visibility and edit access',
      'Sales and pipeline reporting/dashboards built on your actual stage and forecast definitions, plus a data migration path from your existing CRM',
    ],
    technologies: ['PostgreSQL', 'Node.js', 'React', 'REST/GraphQL APIs', 'Message queues for event-driven sync', 'OAuth2/SSO', 'Twilio/telephony APIs', 'IMAP/Graph API email integration'],
    process: [
      { step: 'Discovery', detail: 'We map your current sales and service process end to end — pipeline stages, quoting and approval rules, account structures, and every system a rep or manager touches during a deal — to define what the CRM actually needs to model.' },
      { step: 'Architecture', detail: 'We design the account/contact/deal data model, pipeline and permission rules, and the integration contracts to your ERP, OMS, email, and telephony systems before any interface work begins.' },
      { step: 'Build', detail: 'Engineers implement the data model, pipeline engine, quoting module, and integrations in staged increments, with working functionality reviewed by your sales and RevOps stakeholders throughout rather than at the end.' },
      { step: 'QA & UAT', detail: 'We test pipeline logic, permission and territory rules, and integration sync (quotes, orders, activity logging) against real account and deal scenarios, then run structured user acceptance testing with your sales team before go-live.' },
      { step: 'Deploy & Support', detail: 'We migrate your existing CRM data, cut over with a rollback plan, and stay engaged post-launch for fixes, pipeline changes, and new integrations as your sales process evolves — with a connected client portal giving you full transparency into ongoing work.' },
    ],
    faqs: [
      { q: 'Can a custom CRM really replace Salesforce or HubSpot for a growing sales team?', a: 'Yes — the core CRM functions (pipeline tracking, account/contact management, quoting, activity logging, reporting) are well-understood engineering problems. What a custom build changes is that the data model and workflow rules match your business from day one instead of being approximated inside someone else configuration limits, and you are not paying escalating per-seat licensing as the team grows.' },
      { q: 'How do you handle migrating data out of our existing CRM?', a: 'We extract accounts, contacts, deal history, and activity records from your current system, map them to the new data model (including reconciling any parent/child account structures the old CRM never modeled correctly), and validate the migration against your live data before cutover so historical pipeline and account history is preserved.' },
      { q: 'Does the CRM integrate with our ERP and order management system, or just email and calendar?', a: 'Both. Email, calendar, and telephony integration handle day-to-day communication logging, while the deeper integration — live pricing and inventory in quoting, order and invoice status on the account timeline — connects directly to your ERP or OMS so reps work from real operational data instead of a stale copy.' },
      { q: 'What happens after launch if our sales process or org structure changes?', a: 'The CRM is your owned system, so pipeline stages, territory rules, permissions, and integrations can be changed as your business changes rather than waiting on a vendor roadmap. We remain available for ongoing changes, new integrations, and support, with all work tracked through a connected client portal for full transparency.' },
    ],
    proof: { label: 'Apparel Globe — a multi-channel operations platform', href: '/case-studies/apparel-globe' },
    internalLinks: [
      { label: 'ERP Development', href: '/services/enterprise-systems/erp-development' },
      { label: 'Order Management Systems', href: '/services/enterprise-systems/order-management-systems' },
      { label: 'Systems Integration', href: '/services/software-engineering/systems-integration' },
      { label: 'Our Process', href: '/company/process' },
    ],
  },

  'enterprise-systems/warehouse-management-systems': {
    slug: 'enterprise-systems/warehouse-management-systems', category: 'Enterprise Systems', status: 'published', qc: qcAllTrue,
    primaryKeyword: 'warehouse management system',
    title: 'Custom Warehouse Management System Development | Innovatix Systems',
    metaDescription: 'Custom WMS software for receiving, putaway, directed picking, cycle counts, and multi-warehouse operations — built around how your floor actually runs, synced in real time with your ERP and OMS.',
    h1: 'Custom Warehouse Management Systems Built Around Your Floor, Not a Vendor Template',
    intro: [
      "Most warehouse management systems are sold as a fixed workflow: a receiving screen, a picking screen, a putaway screen, and a rulebook you are expected to bend your operation around. That works until your business does not match the template — you run wave picking for wholesale and single-order picking for DTC out of the same building, you have vendor-specific receiving rules for different suppliers, or you need cycle counts that reconcile against three sales channels instead of one. At that point the off-the-shelf WMS becomes the thing you are managing around, with spreadsheets and side processes patching the gaps it cannot cover.",
      "Innovatix Systems builds warehouse management software as custom application logic, not configuration inside someone else product. That means your bin and location model, your putaway rules, your pick-path logic, and your cycle-count cadence are built to match how your warehouse actually operates — and they stay in lockstep with inventory truth in your ERP, OMS, and storefront, because the WMS is built to talk to those systems directly instead of exporting to them on a batch schedule. The result is a system your floor staff can run on handheld scanners without translation layers, and one your operations team can extend as the business changes shape.",
    ],
    problems: [
      { heading: 'Off-the-shelf WMS products force your process into their workflow', body: "Packaged WMS platforms ship with a fixed model of receiving, putaway, and picking, and customization is usually limited to toggling settings inside that model. If your operation needs multi-supplier receiving rules, hybrid single-order and batch/wave picking in the same building, or location logic keyed to product characteristics the vendor never anticipated, you either pay for expensive professional-services customization with someone else roadmap driving it, or your team works around the software with manual steps and spreadsheets that quietly become the real system of record." },
      { heading: 'Inventory drifts out of sync between the floor and the systems that sell against it', body: "When the WMS, the order management system, and the storefront or marketplace channels update inventory on separate schedules — nightly batch jobs, manual CSV imports, periodic reconciliation reports — the number a picker sees on a handheld and the number a customer sees at checkout can disagree for hours. That drift shows up as oversells, phantom stock, and pickers hunting for units that were already promised to a different order, and it gets worse, not better, as the number of channels and warehouses grows." },
      { heading: "Paper and generic scanning apps cannot enforce the sequence your floor actually needs", body: "Clipboard-based receiving and putaway, or a generic barcode-scanning app with no warehouse logic behind it, can record that a scan happened but cannot enforce that it happened in the right order, at the right bin, against the right purchase order, by a worker with the right permissions. Errors — wrong bin, split lots, mis-picked SKUs, uncounted damage — are not caught until a cycle count or a customer complaint surfaces them, by which point the cost of finding and fixing the root cause is much higher than catching it at the scan." },
    ],
    solution: [
      { heading: 'Warehouse logic modeled on your bins, your suppliers, and your pick strategy', body: "We build the location hierarchy, receiving rules, and pick logic as first-class application code around your actual warehouse — zone and bin structures that match your racking, putaway rules that vary by vendor or product class, and picking strategies that support single-order, batch, and wave picking side by side in the same facility. If your process changes, the system changes with it, because it is your codebase, not a vendor fixed feature set." },
      { heading: 'Real-time inventory sync with your ERP, OMS, and sales channels', body: "Every scan-driven event on the floor — a receipt, a putaway, a pick, a pack, a cycle-count adjustment — is a direct, real-time update against the same inventory data your order management system and storefront read from, not a delayed export. That closes the gap between what the warehouse knows and what the business is selling against, so allocation, oversell prevention, and multi-warehouse routing decisions are working from the same numbers the floor is working from." },
      { heading: 'Mobile scanning workflows that enforce sequence, permissions, and exceptions', body: "Handheld and mobile scanning workflows are built to guide the worker through the correct sequence — scan the PO before you scan the bin, scan the license plate before you close the pallet, flag a short-pick or damage exception before the task can be marked complete — with role-based permissions controlling who can override an exception. Errors get caught at the point of the scan, where they are cheap to fix, instead of at the next cycle count." },
    ],
    deliverables: [
      'Receiving and putaway workflows with configurable, vendor- and product-specific rules',
      'Directed picking and packing (single-order, batch, and wave) tuned to your warehouse layout',
      'Bin, zone, and multi-location inventory model with full location and lot/serial traceability',
      'Mobile and handheld barcode scanning app for receiving, putaway, picking, packing, and cycle counts',
      'Real-time inventory sync with ERP, OMS, and storefront/marketplace channels',
      'Carrier and label integration for pack-and-ship, plus a connected client portal for full transparency into warehouse activity and integration status',
    ],
    technologies: ['Handheld barcode scanning (Zebra, Honeywell, camera-scan devices)', 'React Native / native mobile apps', 'Node.js / NestJS backend services', 'PostgreSQL for transactional inventory and location data', 'REST and event-driven APIs for ERP/OMS/storefront sync', 'Message queues / webhooks for real-time stock updates', 'Carrier and label APIs (UPS, FedEx, USPS)', 'Cloud infrastructure (AWS/GCP) with role-based access control'],
    process: [
      { step: 'Discovery', detail: 'We map your current receiving, putaway, picking, packing, and cycle-count workflows floor by floor — including the exceptions and workarounds your team already uses — and identify exactly where your process diverges from what packaged WMS products assume.' },
      { step: 'Architecture', detail: 'We design the bin/location model, pick-and-pack logic, and the real-time integration contracts with your ERP, OMS, and sales channels, so inventory truth has one source and every system reads from it consistently.' },
      { step: 'Build', detail: 'We build the WMS backend and the mobile/handheld scanning workflows in parallel, in incremental milestones tied to real warehouse processes (a receiving flow, a pick strategy, a cycle-count routine) rather than a single big-bang release.' },
      { step: 'QA & UAT', detail: 'Warehouse staff test workflows on the actual scanning hardware and against real bin layouts and SKUs before go-live, so sequence enforcement, exception handling, and permissions are validated on the floor, not just in a staging environment.' },
      { step: 'Deploy & Support', detail: 'We roll the system out warehouse by warehouse or workflow by workflow to control risk, then stay engaged for monitoring, fixes, and iteration as your product mix, supplier base, or facility footprint changes.' },
    ],
    faqs: [
      { q: 'Can a custom WMS handle multiple warehouses and different picking strategies in each one?', a: 'Yes — because the pick-and-pack logic is built as application code rather than vendor configuration, different facilities (or different zones within one facility) can run single-order picking, batch picking, or wave picking as appropriate, all against the same real-time inventory model.' },
      { q: 'How does the WMS stay in sync with our ERP and order management system?', a: 'Inventory-affecting events on the floor — receipts, putaways, picks, packs, adjustments — are pushed as real-time updates through APIs and event-driven integrations, rather than batch exports. Your ERP, OMS, and storefront read from the same live inventory state the warehouse is updating.' },
      { q: 'What hardware does the mobile scanning workflow run on?', a: 'We build for the handheld and mobile scanning devices you already have or plan to standardize on — Zebra and Honeywell handhelds, or camera-based scanning on rugged tablets/phones — and design the workflow logic to enforce correct sequence and flag exceptions regardless of device.' },
      { q: 'What happens after the system goes live?', a: 'Go-live is staged by warehouse or workflow to limit risk, and we remain engaged afterward for monitoring, defect fixes, and iteration as your supplier base, product mix, or facility footprint evolves. You also get a connected client portal so your team has visibility into system activity and integration health without waiting on a status update.' },
    ],
    proof: { label: 'Apparel Globe — a multi-channel operations platform', href: '/case-studies/apparel-globe' },
    internalLinks: [
      { label: 'ERP Development', href: '/services/enterprise-systems/erp-development' },
      { label: 'Inventory Management Systems', href: '/services/enterprise-systems/inventory-management-systems' },
      { label: 'Order Management Systems', href: '/services/enterprise-systems/order-management-systems' },
      { label: 'Our Process', href: '/company/process' },
    ],
  },

  'enterprise-systems/inventory-management-systems': {
    slug: 'enterprise-systems/inventory-management-systems', category: 'Enterprise Systems', status: 'published', qc: qcAllTrue,
    primaryKeyword: 'inventory management system',
    title: 'Inventory Management System Development | Innovatix Systems',
    metaDescription: 'Custom inventory management systems with real-time, multi-location stock accuracy — available-to-promise, reservations, replenishment, lot/serial tracking, and live sync to every sales channel.',
    h1: 'Inventory Management Systems Built for Multi-Channel, Multi-Location Accuracy',
    intro: [
      'Most inventory problems are not counting problems — they are synchronization problems. A company might have accurate stock counts in its warehouse management system, its ERP, and its e-commerce platform, and still oversell, understock, or ship the wrong lot, because none of those systems agree with each other in real time. The moment an order is placed on one channel, every other channel needs to know the available quantity changed — instantly, not on a nightly batch job. We build inventory management systems that function as the single source of truth for on-hand, allocated, reserved, in-transit, and available-to-promise quantities across every warehouse, store, and sales channel a business operates.',
      'This is not off-the-shelf inventory software with your logo on it. We design the data model and business rules around how your business actually moves product — how you allocate stock across channels, what happens when a reservation expires, how backorders and pre-orders are handled, whether lot or serial or expiry tracking applies to your SKUs, and how cost is valued (FIFO, average cost, or landed cost with freight and duty). The result is an inventory core that your order management, warehouse, storefront, and marketplace integrations all read from and write to — so in stock means the same thing everywhere, every time.',
    ],
    problems: [
      { heading: 'Overselling across channels because stock is not shared in real time', body: 'When a marketplace listing, a storefront, and an ERP each hold their own copy of quantity on hand, they drift apart the moment concurrent orders come in. A unit sells on Amazon and on the storefront within the same minute, both orders are accepted, and now one has to be cancelled or backordered — damaging trust and triggering marketplace performance penalties. Batch-based syncs (hourly or nightly feeds) do not fix this; they only narrow the window where the drift happens.' },
      { heading: 'No visibility into what stock is actually available to sell', body: 'Raw on-hand quantity is not the same as sellable quantity. Units already allocated to open orders, reserved for a pending transfer, held for quality inspection, or committed to a wholesale contract all need to be subtracted before a channel is told what it can sell. Without a proper available-to-promise calculation, teams either oversell (ignoring commitments) or artificially suppress inventory just to be safe, leaving revenue on the table.' },
      { heading: 'Replenishment and transfers run on spreadsheets and gut feel', body: 'Deciding when to reorder, how much safety stock to hold per SKU per location, and when to transfer stock between warehouses instead of buying more is a data problem, not a judgment call — but without a system that tracks velocity, lead times, and location-level demand, that decision defaults to whoever remembers to check a spreadsheet. The result is chronic stockouts on fast movers and excess capital tied up in slow movers, often in the wrong location.' },
    ],
    solution: [
      { heading: 'A single inventory core with real-time available-to-promise', body: 'We build inventory as an event-driven core: every receipt, sale, reservation, allocation, transfer, and adjustment posts as an atomic event that immediately recalculates on-hand and available-to-promise per SKU, per location. Every connected channel — storefront, marketplaces, B2B portal, retail POS — reads from that same live number, so a sale on one channel decrements availability everywhere within the same request cycle, not on the next sync.' },
      { heading: 'Reservation, allocation, and lot/serial logic matched to your operation', body: 'We model the specific mechanics your business needs: cart-level reservations with configurable expiry so abandoned checkouts release stock automatically, order-level allocation that respects FIFO or specific lot selection, and full lot/serial/expiry tracking where compliance or traceability requires it (recalls, expiration dating, warranty serials). Cost is tracked per unit or per lot under FIFO or average costing, so COGS and inventory valuation stay accurate as stock moves.' },
      { heading: 'Data-driven replenishment and transfer recommendations', body: 'Safety stock, reorder points, and reorder quantities are calculated per SKU per location from actual sales velocity, seasonality, and vendor lead times — not fixed globally. The system flags when a transfer between locations is more cost-effective than a new purchase order, and surfaces replenishment recommendations inside the same interface your team already uses, so buying decisions are driven by current demand instead of a stale spreadsheet.' },
    ],
    deliverables: [
      'Real-time available-to-promise engine spanning all warehouses, stores, and sales channels',
      'Reservation and allocation logic with configurable expiry, backorder, and pre-order handling',
      'Lot, serial, and expiry tracking for SKUs that require batch traceability or compliance',
      'FIFO or average-cost inventory valuation with landed cost support',
      'Replenishment and inter-location transfer recommendations driven by velocity and lead time',
      'Continuous sync connectors to marketplaces, storefront, OMS, WMS, and ERP to prevent overselling',
    ],
    technologies: ['PostgreSQL', 'Node.js / NestJS', 'Redis (real-time reservation and cache layer)', 'Event streaming (Kafka / message queues)', 'REST and GraphQL APIs', 'Barcode and RFID scanning integration', 'EDI for vendor and retail-partner transactions', 'Docker / Kubernetes on AWS or GCP'],
    process: [
      { step: 'Discovery', detail: 'We map every location that holds stock, every channel that sells it, and every system that currently claims to know the quantity — warehouse floor, storefront, marketplaces, ERP, spreadsheets. We identify where oversells and stockouts actually originate, and document the reservation, allocation, and costing rules your business needs.' },
      { step: 'Architecture', detail: 'We design the inventory data model — SKU, location, lot/serial, and cost dimensions — along with the event flow that keeps on-hand and available-to-promise numbers consistent under concurrent writes. Integration contracts with your ERP, WMS, OMS, and sales channels are specified before any code is written.' },
      { step: 'Build', detail: 'We build the inventory core, reservation and allocation engine, replenishment logic, and channel sync connectors in incremental releases, with each SKU category and integration validated against real transaction volume as it ships.' },
      { step: 'QA & UAT', detail: 'We test concurrency scenarios directly — simultaneous orders against the same unit, expiring reservations, mid-transfer stock movements, cost recalculation on receipt — and run your operations and finance teams through user acceptance testing against real SKUs and locations before go-live.' },
      { step: 'Deploy & Support', detail: 'We stage the cutover from legacy inventory sources with a reconciliation pass to confirm every channel agrees on quantity before go-live, then provide ongoing support and a connected client portal for full transparency into deployments, tickets, and system health.' },
    ],
    faqs: [
      { q: 'How fast does stock actually sync across channels?', a: 'Reservations, allocations, and quantity changes post as events the moment they happen, and every connected channel reads the same live available-to-promise number — there is no batch window where systems disagree. The exact propagation time to a given marketplace or storefront depends on that channel own API, but the internal inventory core itself is updated in real time.' },
      { q: 'Can this handle multiple warehouses and retail locations with different stock levels?', a: 'Yes. Inventory is tracked per SKU per location, not as one global number, so available-to-promise, safety stock, and replenishment logic can all be location-aware. The system also recommends inter-location transfers when moving existing stock is more efficient than placing a new purchase order.' },
      { q: 'Does this replace our ERP, WMS, or order management system, or integrate with them?', a: 'It integrates with them. The inventory core becomes the authoritative source for stock quantity and valuation, while your ERP continues to own accounting and your WMS continues to own warehouse operations — each system talks to the inventory core through defined APIs rather than keeping its own disconnected copy of the numbers.' },
      { q: 'What happens to lot, serial, or expiration data for regulated or perishable products?', a: 'Where your SKUs require it, we track inventory at the lot, serial, or expiry level rather than just the SKU level, so recalls, warranty claims, and expiration-based rotation (FIFO by expiry date) are all supported natively instead of being managed in a side spreadsheet.' },
    ],
    proof: { label: 'Apparel Globe — a multi-channel operations platform', href: '/case-studies/apparel-globe' },
    internalLinks: [
      { label: 'Warehouse Management Systems', href: '/services/enterprise-systems/warehouse-management-systems' },
      { label: 'Order Management Systems', href: '/services/enterprise-systems/order-management-systems' },
      { label: 'ERP Development', href: '/services/enterprise-systems/erp-development' },
      { label: 'Our Process', href: '/company/process' },
    ],
  },

  'enterprise-systems/order-management-systems': {
    slug: 'enterprise-systems/order-management-systems', category: 'Enterprise Systems', status: 'published', qc: qcAllTrue,
    primaryKeyword: 'order management system',
    title: 'Custom Order Management System Development | Innovatix Systems',
    metaDescription: 'Custom order management systems that unify orders from marketplaces, storefronts, wholesale/EDI, and phone — with smart routing, split fulfillment, and exception handling.',
    h1: 'Custom Order Management System Development',
    intro: [
      'Order volume outgrows a single sales channel long before the systems behind it catch up. A retailer selling through Amazon, Walmart, a Shopify or headless storefront, wholesale EDI accounts, and a phone/B2B sales desk usually ends up with orders landing in five different places, each with its own status model, its own idea of shipped, and its own quirks around cancellations and returns. Spreadsheets and manual re-keying fill the gaps until the gaps get too big, and then orders sit unallocated, ship from the wrong warehouse, or double-ship because two systems both thought they owned the inventory.',
      'We build order management systems as the orchestration layer that sits between every channel that creates an order and every system that has to fulfill one — inventory, warehouse operations, drop-ship vendors, carriers, payment processors, and accounting. The OMS owns the order lifecycle end to end: capture, validation, payment authorization and capture, allocation across locations, routing to the right fulfillment path, split shipments and backorder handling, carrier hand-off, and returns/RMA processing — all reconciled back to a single order status that every downstream system and every customer-facing surface can trust. This is custom-built against your actual channel mix and fulfillment network, not a generic multi-channel listing tool retrofitted to do order routing.',
    ],
    problems: [
      { heading: 'Order truth is scattered across channels', body: 'Marketplace orders, storefront orders, wholesale EDI (850/855/856/810) orders, and phone orders each arrive in a different format with a different status vocabulary. Without a canonical order record, customer service cannot answer where is my order without checking three systems, and finance cannot close the books without reconciling the same order twice.' },
      { heading: 'Allocation and fulfillment routing is manual guesswork', body: 'Deciding which warehouse, which drop-ship vendor, or which combination of both should fulfill a given line item — based on stock position, proximity, cost, and vendor lead time — is usually done by a person eyeballing a spreadsheet. That does not scale past a handful of daily orders and produces inconsistent shipping cost and delivery time.' },
      { heading: 'Exceptions consume the operations team', body: 'Partial stock, payment holds, address validation failures, carrier rate-shopping ties, vendor backorders, and return/RMA edge cases do not fit the happy path most off-the-shelf tools are built for. When the system cannot model the exception, it becomes a manual ticket — and at volume, exceptions become the majority of a team daily work.' },
    ],
    solution: [
      { heading: 'A single canonical order model across every channel', body: 'We build a normalized order schema that every channel adapter — marketplace APIs, storefront checkout, EDI translator, phone/CSR order entry — writes into. One order ID, one status state machine, one audit trail, regardless of where the order originated. Channel-specific quirks (Amazon order acknowledgment windows, EDI 856 ASN timing, wholesale net-terms holds) are handled in the adapter layer so the core order engine stays clean.' },
      { heading: 'Rules-driven allocation and split-fulfillment routing', body: 'A configurable allocation engine evaluates each order line against real-time inventory position (owned warehouses, 3PLs, drop-ship vendor feeds), then routes to the lowest-cost, fastest, or policy-preferred fulfillment source — splitting a single order across multiple shipments and vendors when no single location can cover it. Rules are data-driven so operations can tune routing priorities without a code deploy.' },
      { heading: 'Explicit exception handling as a first-class workflow', body: 'Backorders, partial shipments, payment declines/holds, address validation failures, carrier rate exceptions, and RMA/return flows are modeled as named states in the order state machine — not silent failures. Each exception routes to a queue with the context needed to resolve it (or auto-resolves per configured policy), so operations works a prioritized queue instead of hunting for what went wrong.' },
    ],
    deliverables: [
      'Unified order capture and adapters for marketplace, storefront, wholesale/EDI (X12 850/855/856/810), and manual/phone order entry',
      'Payment authorization, capture, and refund orchestration integrated with your processor(s), including split-payment and net-terms handling',
      'Configurable inventory allocation and fulfillment routing engine supporting multi-warehouse, 3PL, and drop-ship vendor networks',
      'Split-shipment, backorder, and partial-fulfillment logic with customer-facing status that reflects reality per shipment',
      'Returns and RMA workflow with restock/dispose/vendor-return branching and accounting-side credit reconciliation',
      'Unified order status API and operations dashboard giving every internal system and support team one source of truth',
    ],
    technologies: ['Node.js / NestJS', 'PostgreSQL', 'Redis for queues and idempotency locking', 'Message queue orchestration (RabbitMQ / SQS-style workflows)', 'EDI translation (X12 850/855/856/810 via AS2 or VAN)', 'Carrier and rate-shopping APIs (UPS, USPS, FedEx, and aggregators)', 'Payment gateway integration (Stripe, Authorize.net, or your existing processor)', 'REST and webhook integration layer for WMS, inventory, and accounting systems'],
    process: [
      { step: 'Discovery', detail: 'We map every current order source, every fulfillment path (owned warehouse, 3PL, drop-ship vendor), payment flows, and the exception cases operations already deals with manually — so the routing rules and state machine are built against reality, not assumptions.' },
      { step: 'Architecture', detail: 'We design the canonical order schema, the state machine covering every status and exception path, the allocation/routing rule model, and the integration contracts to inventory, WMS, carriers, and accounting — reviewed with your team before a line of production code is written.' },
      { step: 'Build', detail: 'Channel adapters, the core order engine, the allocation and routing service, and the exception-handling queues are built incrementally, with each channel and fulfillment path validated against real order data as it lands.' },
      { step: 'QA & UAT', detail: 'We test the exception paths as thoroughly as the happy path — partial stock, payment declines, split shipments, EDI ASN mismatches, RMA edge cases — and run your operations team through UAT on real order scenarios before go-live.' },
      { step: 'Deploy & Support', detail: 'Phased cutover by channel (so you are never fully dependent on an unproven system on day one), with monitoring on allocation accuracy and exception volume, plus ongoing support as new channels, warehouses, or vendors are added.' },
    ],
    faqs: [
      { q: 'Can this replace the order management built into our marketplace or storefront platform?', a: 'It sits above those platforms rather than replacing their native checkout or listing tools. Amazon, Walmart, and your storefront still capture the sale; the OMS becomes the layer that normalizes what happens after — allocation, routing, split fulfillment, and status — so no single channel built-in order tools have to (or can) manage fulfillment across your whole network.' },
      { q: 'How does the system decide which warehouse or vendor fulfills an order?', a: 'Allocation runs against a configurable rule set evaluating live inventory position, fulfillment cost, delivery speed, and any business-priority rules you set (e.g., prefer owned warehouse over drop-ship, or route wholesale orders to a specific facility). Rules are data-driven, so priorities can be adjusted by your operations team without a redeploy.' },
      { q: 'What happens when an order cannot be fully allocated from one location?', a: 'The engine splits the order across the fulfillment sources needed to cover it — for example shipping in-stock lines from your warehouse immediately while routing a backordered line to a drop-ship vendor — and tracks each resulting shipment against the parent order so the customer sees one accurate status, not fragmented confusion.' },
      { q: 'Do you integrate with our existing accounting and WMS, or do we need to replace them?', a: 'Integration, not replacement, is the default approach. The OMS is built to sit between your existing accounting system, WMS, inventory data, and carrier accounts — passing order, shipment, and financial events across via API or EDI so each system keeps doing what it already does well.' },
    ],
    proof: { label: 'Apparel Globe — a multi-channel operations platform', href: '/case-studies/apparel-globe' },
    internalLinks: [
      { label: 'Warehouse Management Systems', href: '/services/enterprise-systems/warehouse-management-systems' },
      { label: 'Inventory Management Systems', href: '/services/enterprise-systems/inventory-management-systems' },
      { label: 'Systems Integration', href: '/services/software-engineering/systems-integration' },
      { label: 'Our Process', href: '/company/process' },
    ],
  },

  'cloud-infrastructure/cloud-architecture': {
    slug: 'cloud-infrastructure/cloud-architecture', category: 'Cloud & Infrastructure', status: 'published', qc: qcAllTrue,
    primaryKeyword: 'cloud architecture',
    title: 'Cloud Architecture Design & Engineering | Innovatix Systems',
    metaDescription: 'AWS-based cloud architecture built for reliability, security, and cost control — networking, compute, IaC, autoscaling, HA/DR, and observability designed to grow without a rewrite.',
    h1: 'Cloud Architecture That Scales Without a Rewrite',
    intro: [
      'Most cloud infrastructure was never designed — it accumulated. An engineer stood up a VPC to hit a launch date, added instances as traffic grew, and five years later the business is running its order pipeline, inventory system, or customer data on infrastructure that nobody can fully diagram from memory. There is no failover plan, scaling means manually resizing an instance at 2 a.m., and the monthly cloud bill has become a line item nobody can explain. This work is for engineering and operations leaders at mid-market and growing enterprises running business-critical systems who have outgrown an improvised setup or are migrating off legacy on-prem or single-VPS hosting and need the next architecture to actually hold.',
      'We treat cloud architecture as an engineering discipline, not a checklist of services turned on in a console. That means deliberate decisions on networking and VPC segmentation, the right compute model for each workload — containers, serverless, or managed instances — a data layer sized for actual access patterns, and infrastructure defined entirely as code so every environment is reproducible and reviewable. High availability, disaster recovery, autoscaling, and observability are designed in from the start rather than bolted on after the first outage. The result is architecture built primarily on AWS, sized and secured for what the system needs today, with the headroom to absorb 10x growth, a new business line, or an acquisition without a ground-up rebuild.',
    ],
    problems: [
      { heading: 'Architecture that was never designed — it just accumulated', body: 'Infrastructure gets built by hand, one console click at a time, with no version-controlled record of what exists or why. Tribal knowledge lives in one engineer head, single points of failure go unnoticed until they fail, and scaling means upsizing an instance rather than designing for load. Every change is a risk because nothing is documented, tested, or reversible.' },
      { heading: 'Downtime and data-loss risk with no real disaster recovery plan', body: 'Backups exist, but no one has ever restored from one. There is no multi-AZ failover, no defined recovery time or recovery point objective, and no rehearsed runbook for what happens when a region, database, or availability zone goes down. The first real test of the DR plan is a live incident, and it usually fails.' },
      { heading: 'The cloud bill is growing faster than the business', body: 'Instances are overprovisioned to be safe, nothing scales down during off-peak hours, orphaned resources from old experiments keep billing quietly, and there is no per-service cost visibility to know what is actually driving spend. Finance sees the invoice; engineering cannot explain it.' },
    ],
    solution: [
      { heading: 'Infrastructure as code, from day one', body: 'Every VPC, subnet, security group, compute resource, and data store is defined in Terraform or AWS CDK, version-controlled, and peer-reviewed like application code. Environments are reproducible — staging matches production by construction, not by hope — and every change ships through a pull request with a plan output anyone can read before it applies.' },
      { heading: 'High availability and disaster recovery built into the design', body: 'Multi-AZ deployment, automated and tested backups, and a documented failover runbook with explicit RTO/RPO targets are part of the architecture, not an afterthought. We run failover drills before launch so the first time a region degrades is not the first time anyone has seen the recovery process work.' },
      { heading: 'Right-sized compute with autoscaling and real cost guardrails', body: 'Workloads get matched to the compute model that actually fits — containers on ECS/EKS, Lambda for event-driven work, managed instances where they make sense — with autoscaling policies tied to real load signals. Tagging, budgets, and alerting give a per-service view of spend so cost is a design input, not a surprise.' },
    ],
    deliverables: [
      'Well-Architected review and target-state architecture diagram',
      'VPC and networking design with private/public subnet segmentation and security groups',
      'Infrastructure-as-code repository (Terraform or AWS CDK) covering every environment',
      'CI/CD pipelines for both infrastructure changes and application deployments',
      'Autoscaling, high-availability, and disaster-recovery configuration with documented RTO/RPO',
      'Observability stack — metrics, logs, tracing, and alerting — plus a connected client portal for full transparency into infrastructure health and cost',
    ],
    technologies: ['AWS (VPC, EC2, ECS/EKS, Lambda, RDS, S3, CloudFront)', 'Terraform', 'AWS CDK', 'Docker', 'Kubernetes', 'GitHub Actions / CodePipeline', 'CloudWatch & Datadog', 'PostgreSQL / DynamoDB'],
    process: [
      { step: 'Discovery', detail: 'We audit the current infrastructure (or lack of one), map business-critical workloads, gather growth and compliance constraints, and define target SLAs, RTO/RPO, and cost expectations.' },
      { step: 'Architecture', detail: 'We design the VPC topology, choose the compute and data model per workload, define the HA/DR and security posture, and produce diagrams plus an infrastructure-as-code plan before a single resource is provisioned.' },
      { step: 'Build', detail: 'We implement the Terraform/CDK codebase, provision each environment identically, wire up CI/CD, and migrate or cut over existing workloads in controlled stages.' },
      { step: 'QA & UAT', detail: 'We load-test under realistic traffic, run failover and DR drills, validate the security model, and confirm the cost model holds up against actual usage before go-live.' },
      { step: 'Deploy & Support', detail: 'We cut over to production with monitoring and alerting live from hour one, hand off runbooks and architecture documentation, and provide ongoing support and incident response through a connected client portal.' },
    ],
    faqs: [
      { q: 'Do you only build on AWS?', a: 'AWS is our primary platform because of the depth of our experience there — compute, networking, data, and IaC tooling all mature together on it. Where a client is already committed to Azure or GCP, we architect on that platform instead; the design principles (IaC, HA/DR, autoscaling, observability, cost control) carry over regardless of cloud provider.' },
      { q: 'Can you redesign our architecture without downtime or a risky big-bang migration?', a: 'Yes. We build the new architecture alongside the existing one, validate it under real traffic, and cut over in stages — by service, by region, or by traffic percentage — so you can roll back at any point before the migration is complete.' },
      { q: 'How do you handle security in the architecture?', a: 'Security is designed in, not added afterward: least-privilege IAM roles, private subnets for anything that does not need public exposure, encryption at rest and in transit, security groups and WAF rules scoped tightly to actual traffic patterns. We do not claim formal certifications such as SOC 2, ISO, or HIPAA — we build sound security practices into the architecture and are direct about what has and has not been independently audited.' },
      { q: 'What kind of support do we get after the architecture goes live?', a: 'Monitoring, alerting, and incident response continue past launch — we do not hand off a diagram and disappear. You get full visibility into infrastructure health, deployments, and cost through a connected client portal, and an engineering team that already knows the system when something needs attention.' },
    ],
    proof: { label: 'Apparel Globe — a multi-channel operations platform', href: '/case-studies/apparel-globe' },
    internalLinks: [
      { label: 'Enterprise Software Development', href: '/services/software-engineering/enterprise-software-development' },
      { label: 'Systems Integration', href: '/services/software-engineering/systems-integration' },
      { label: 'Order Management Systems', href: '/services/enterprise-systems/order-management-systems' },
      { label: 'Our Process', href: '/company/process' },
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
