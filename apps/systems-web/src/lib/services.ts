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
    proof: { label: 'Amazon Sellers — a multi-channel operations platform', href: '/case-studies/apparel-globe' },
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
    proof: { label: 'Amazon Sellers — a multi-channel operations platform', href: '/case-studies/apparel-globe' },
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
    proof: { label: 'Amazon Sellers — AI workflows in a live operations platform', href: '/case-studies/apparel-globe' },
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
    proof: { label: 'Amazon Sellers — a custom ERP for multi-channel operations', href: '/case-studies/apparel-globe' },
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
    proof: { label: 'Amazon Sellers — a multi-channel operations platform', href: '/case-studies/apparel-globe' },
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
    proof: { label: 'Amazon Sellers — a multi-channel operations platform', href: '/case-studies/apparel-globe' },
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
    proof: { label: 'Amazon Sellers — a multi-channel operations platform', href: '/case-studies/apparel-globe' },
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
    proof: { label: 'Amazon Sellers — a multi-channel operations platform', href: '/case-studies/apparel-globe' },
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
    proof: { label: 'Amazon Sellers — a multi-channel operations platform', href: '/case-studies/apparel-globe' },
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
    proof: { label: 'Amazon Sellers — a multi-channel operations platform', href: '/case-studies/apparel-globe' },
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
    proof: { label: 'Amazon Sellers — a multi-channel operations platform', href: '/case-studies/apparel-globe' },
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
    proof: { label: 'Amazon Sellers — a multi-channel operations platform', href: '/case-studies/apparel-globe' },
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
    proof: { label: 'Amazon Sellers — a multi-channel operations platform', href: '/case-studies/apparel-globe' },
    internalLinks: [
      { label: 'Enterprise Software Development', href: '/services/software-engineering/enterprise-software-development' },
      { label: 'Systems Integration', href: '/services/software-engineering/systems-integration' },
      { label: 'Order Management Systems', href: '/services/enterprise-systems/order-management-systems' },
      { label: 'Our Process', href: '/company/process' },
    ],
  },

  // ── Data & Analytics ──────────────────────────────────────────────────────
  'data-analytics/data-engineering': {
    slug: 'data-analytics/data-engineering', category: 'Data & Analytics', status: 'published', qc: qcAllTrue,
    primaryKeyword: 'data engineering services',
    title: 'Data Engineering Services | Pipelines, Models & Platforms | Innovatix Systems',
    metaDescription: 'Innovatix Systems builds the data engineering foundation your analytics run on — reliable pipelines, a modeled warehouse, and one trustworthy source of truth across every system.',
    h1: 'Data Engineering for a Single Source of Truth',
    intro: [
      'Analytics are only as good as the data underneath them. Data engineering is the unglamorous foundation that makes dashboards, reports, and AI trustworthy: reliable pipelines, a clean data model, and one place the whole business agrees is correct.',
      'We build that foundation — moving data out of scattered operational systems into a governed, modeled store, with tests and monitoring so the numbers are right every morning, not just the day you built the report.',
    ],
    problems: [
      { heading: 'Numbers never match between systems', body: 'Finance, operations, and marketing each pull from a different source and get different answers. Without a modeled source of truth, every meeting starts by arguing about whose number is right.' },
      { heading: 'Reports break silently', body: 'A schema changes upstream, a nightly job fails, and nobody notices until a report is wrong in front of leadership. Pipelines without tests and alerts erode trust in every metric.' },
      { heading: 'Data is trapped in operational systems', body: 'The ERP, marketplace, and CRM each hold part of the picture, but querying them directly is slow, risky, and impossible to join. Analysis stalls before it starts.' },
    ],
    solution: [
      { heading: 'Reliable ingestion from every source', body: 'We build pipelines that pull from your operational systems, marketplaces, and third-party APIs on a schedule, with retries, idempotency, and clear failure alerts — so data lands completely and on time.' },
      { heading: 'A modeled, documented warehouse', body: 'Raw data is transformed into clean, well-named, tested tables that mirror how the business thinks — orders, customers, inventory, finance — so anyone can query with confidence.' },
      { heading: 'Tested and monitored, like software', body: 'Transformations have data tests (uniqueness, freshness, referential integrity) and monitoring, so a broken upstream change surfaces as an alert, not a wrong board slide.' },
    ],
    deliverables: [
      'Source inventory and a target data model documented up front',
      'Ingestion pipelines with retries, idempotency, and failure alerting',
      'A modeled, tested warehouse (staging → core → marts)',
      'Data-quality tests: freshness, uniqueness, referential integrity',
      'Documentation and a data dictionary for self-service',
      'Monitoring, runbooks, and ongoing support options',
    ],
    technologies: ['PostgreSQL', 'SQL / dbt-style modeling', 'Python', 'AWS (S3, Glue, Redshift-compatible)', 'Airflow-style orchestration', 'Parquet / columnar storage'],
    process: [
      { step: 'Discovery', detail: 'Inventory sources, define the questions the business needs answered, and design the target model.' },
      { step: 'Ingestion', detail: 'Build reliable, monitored pipelines from each source system.' },
      { step: 'Modeling', detail: 'Transform raw data into clean, tested, documented tables.' },
      { step: 'Validation', detail: 'Add data tests and reconcile against source-of-truth systems.' },
      { step: 'Handover', detail: 'Document, monitor, and enable self-service analytics.' },
    ],
    faqs: [
      { q: 'Do we need a data warehouse or can we query our app database directly?', a: 'Querying a production database directly is slow, risky, and hard to join across systems. A separate modeled warehouse isolates analytics load, unifies sources, and gives you clean tables built for questions rather than transactions.' },
      { q: 'How do you keep the data trustworthy over time?', a: 'Every transformation ships with data tests (freshness, uniqueness, referential integrity) and monitoring, so upstream changes and failed jobs raise alerts before they reach a report.' },
      { q: 'Can you work with the systems we already run?', a: 'Yes — we build ingestion from ERPs, marketplaces, CRMs, payment processors, and third-party APIs, and land it in a warehouse you own.' },
    ],
    proof: { label: 'Amazon Sellers — a connected operational data model', href: '/case-studies/apparel-globe' },
    internalLinks: [
      { label: 'Data Warehousing', href: '/services/data-analytics/data-warehousing' },
      { label: 'ETL & Data Pipelines', href: '/services/data-analytics/etl-pipelines' },
      { label: 'Business Intelligence', href: '/services/data-analytics/business-intelligence' },
      { label: 'Systems Integration', href: '/services/software-engineering/systems-integration' },
    ],
  },

  'data-analytics/data-warehousing': {
    slug: 'data-analytics/data-warehousing', category: 'Data & Analytics', status: 'published', qc: qcAllTrue,
    primaryKeyword: 'data warehouse development',
    title: 'Data Warehouse Development | Modeled, Governed, Query-Ready | Innovatix Systems',
    metaDescription: 'Innovatix Systems designs and builds data warehouses that unify your systems into one governed, query-ready model — the foundation for reporting, BI, and AI.',
    h1: 'Data Warehouse Development',
    intro: [
      'A data warehouse is the central store where data from every system is unified, modeled, and made ready for analysis. Done well, it ends the daily argument about whose numbers are right and lets anyone answer a question without touching production systems.',
      'We design the schema around how your business actually operates, load it reliably, and govern access — so reporting, dashboards, and AI all read from the same trustworthy foundation.',
    ],
    problems: [
      { heading: 'Analytics compete with production for resources', body: 'Running heavy reports against the app database slows down the very operations you are trying to measure. A warehouse isolates analytical workloads.' },
      { heading: 'No conformed definitions', body: 'What is an "active customer"? A "shipped order"? Without conformed dimensions and documented definitions, every team computes metrics differently.' },
      { heading: 'History is lost', body: 'Operational systems overwrite state. Without a warehouse capturing change over time, you cannot analyze trends, cohorts, or point-in-time snapshots.' },
    ],
    solution: [
      { heading: 'A schema modeled on your business', body: 'We design conformed dimensions and fact tables (orders, customers, inventory, finance) so metrics are defined once and reused everywhere.' },
      { heading: 'Reliable loads and history capture', body: 'Scheduled, monitored loads populate the warehouse and capture change over time, enabling trend, cohort, and point-in-time analysis.' },
      { heading: 'Governed and documented', body: 'Role-based access, a data dictionary, and clear ownership make the warehouse safe to open up for self-service without losing control.' },
    ],
    deliverables: [
      'A dimensional data model (facts, conformed dimensions) documented',
      'A provisioned, governed warehouse with role-based access',
      'Scheduled, monitored loads with history capture',
      'Conformed metric definitions and a data dictionary',
      'Query performance tuning and cost controls',
      'Documentation, handover, and support options',
    ],
    technologies: ['PostgreSQL', 'Columnar / MPP warehouses (Redshift-compatible)', 'SQL modeling', 'AWS S3', 'Star-schema design', 'Role-based access controls'],
    process: [
      { step: 'Discovery', detail: 'Define the metrics and questions, then design conformed dimensions and facts.' },
      { step: 'Provision', detail: 'Stand up the warehouse with governance and access controls.' },
      { step: 'Load', detail: 'Build monitored loads and capture change history.' },
      { step: 'Model & tune', detail: 'Build marts, conform metrics, and tune query performance.' },
      { step: 'Enable', detail: 'Document, grant access, and connect BI tools.' },
    ],
    faqs: [
      { q: 'Data warehouse vs. data lake — which do we need?', a: 'Most operations businesses need a modeled warehouse first: structured, query-ready tables with conformed metrics. A lake adds value later for large, semi-structured, or ML workloads. We help you choose based on your questions, not the trend.' },
      { q: 'Which warehouse technology do you use?', a: 'We match the tool to your scale and budget — PostgreSQL for moderate volumes, a columnar/MPP warehouse for large ones — and design the model so you are not locked in.' },
      { q: 'How do you control cost?', a: 'Through sensible partitioning, incremental loads, and query tuning, plus monitoring so runaway analytical queries do not surprise you on the bill.' },
    ],
    proof: { label: 'Amazon Sellers — unified reporting across channels', href: '/case-studies/apparel-globe' },
    internalLinks: [
      { label: 'Data Engineering', href: '/services/data-analytics/data-engineering' },
      { label: 'Business Intelligence', href: '/services/data-analytics/business-intelligence' },
      { label: 'Executive Dashboards', href: '/services/data-analytics/executive-dashboards' },
      { label: 'Cloud Architecture', href: '/services/cloud-infrastructure/cloud-architecture' },
    ],
  },

  'data-analytics/etl-pipelines': {
    slug: 'data-analytics/etl-pipelines', category: 'Data & Analytics', status: 'published', qc: qcAllTrue,
    primaryKeyword: 'etl and data pipeline development',
    title: 'ETL & Data Pipeline Development | Reliable, Monitored | Innovatix Systems',
    metaDescription: 'Innovatix Systems builds ETL and data pipelines that move data between your systems reliably — with retries, idempotency, and alerting so nothing silently breaks.',
    h1: 'ETL & Data Pipeline Development',
    intro: [
      'Data pipelines are the plumbing that moves information between your systems — from operational databases and marketplaces into your warehouse, and between the tools your business runs on. When they are reliable, everything downstream just works. When they are not, reports lie and syncs drift.',
      'We build pipelines engineered like software: idempotent, retried, monitored, and tested — so data lands completely and on time, and failures raise alerts instead of silently corrupting a report.',
    ],
    problems: [
      { heading: 'Silent failures', body: 'A job dies at 2am, no one is paged, and the data is stale or partial by morning. Pipelines without monitoring turn into invisible landmines.' },
      { heading: 'Duplicates and drift', body: 'Re-running a job double-loads rows; a missed run leaves gaps. Without idempotency and reconciliation, the warehouse slowly diverges from reality.' },
      { heading: 'Brittle, one-off scripts', body: 'Scattered cron scripts with no retries or logging are impossible to trust or hand off. Every change is a gamble.' },
    ],
    solution: [
      { heading: 'Idempotent, retried, ordered', body: 'Every pipeline can safely re-run without duplicating data, retries transient failures, and processes in a defined order — so a hiccup does not corrupt downstream tables.' },
      { heading: 'Monitored and alerted', body: 'Freshness checks, run status, and row-count reconciliation feed alerting, so you know within minutes if something did not land.' },
      { heading: 'Batch or streaming, as the case needs', body: 'Scheduled batch for reporting, near-real-time streams for operational sync — chosen to fit the latency the use case actually requires.' },
    ],
    deliverables: [
      'Source-to-target mapping and pipeline design',
      'Idempotent, retried, ordered pipelines (batch and/or streaming)',
      'Freshness, run-status, and reconciliation monitoring with alerts',
      'Backfill and replay tooling for corrections',
      'Logging, runbooks, and on-call-ready documentation',
      'Handover and ongoing support options',
    ],
    technologies: ['Python', 'SQL', 'Airflow-style orchestration', 'Webhooks & queues', 'AWS (S3, Lambda, SQS)', 'Change-data-capture patterns'],
    process: [
      { step: 'Map', detail: 'Document sources, targets, volumes, and the latency each use case needs.' },
      { step: 'Build', detail: 'Implement idempotent, retried pipelines with clear ordering.' },
      { step: 'Instrument', detail: 'Add freshness checks, reconciliation, and alerting.' },
      { step: 'Backfill', detail: 'Load history and add replay tooling for corrections.' },
      { step: 'Operate', detail: 'Document runbooks and hand over a monitored system.' },
    ],
    faqs: [
      { q: 'ETL or ELT?', a: 'Both have their place. We often load raw data first and transform inside the warehouse (ELT) for flexibility and auditability, but use in-flight transformation (ETL) when volume or privacy demands it. We pick per pipeline, not by dogma.' },
      { q: 'Do you do real-time pipelines?', a: 'When the use case needs it — operational sync between systems, for example. For reporting, scheduled batch is usually simpler and cheaper, so we match latency to need rather than defaulting to streaming.' },
      { q: 'What happens when a pipeline fails?', a: 'It retries transient errors, alerts on hard failures, and — because pipelines are idempotent — can be safely re-run or backfilled without creating duplicates.' },
    ],
    internalLinks: [
      { label: 'Data Engineering', href: '/services/data-analytics/data-engineering' },
      { label: 'Data Warehousing', href: '/services/data-analytics/data-warehousing' },
      { label: 'Systems Integration', href: '/services/software-engineering/systems-integration' },
      { label: 'API Development', href: '/services/software-engineering/api-development' },
    ],
  },

  'data-analytics/business-intelligence': {
    slug: 'data-analytics/business-intelligence', category: 'Data & Analytics', status: 'published', qc: qcAllTrue,
    primaryKeyword: 'business intelligence services',
    title: 'Business Intelligence Services | Reporting & Self-Service BI | Innovatix Systems',
    metaDescription: 'Innovatix Systems turns your data into decision-ready business intelligence — governed metrics, reports, and self-service dashboards built on a trustworthy foundation.',
    h1: 'Business Intelligence That Teams Actually Use',
    intro: [
      'Business intelligence turns raw data into answers people act on. But most BI projects fail not on the charts — they fail on the foundation: inconsistent metrics, stale data, and dashboards nobody trusts. We build BI on a governed, tested data model so the answers hold up.',
      'From executive KPIs to self-service exploration, we deliver reporting your teams rely on because the definitions are conformed, the data is fresh, and the numbers reconcile with the systems of record.',
    ],
    problems: [
      { heading: 'Conflicting metrics', body: 'Two dashboards show different revenue for the same month because each defines it differently. Without conformed, governed metrics, BI creates arguments instead of ending them.' },
      { heading: 'Dashboards no one trusts', body: 'Once a number is wrong in front of leadership, the whole tool loses credibility. Trust is the real BI deliverable — and it comes from the data layer, not the chart.' },
      { heading: 'Everything is a ticket', body: 'When every question requires an analyst to write SQL, insight bottlenecks. Teams need governed self-service, not a queue.' },
    ],
    solution: [
      { heading: 'A governed metrics layer', body: 'Core metrics — revenue, orders, margin, retention — are defined once, tested, and reused across every report, so the whole company measures the same way.' },
      { heading: 'Reports built for decisions', body: 'We design dashboards around the decisions they support, not vanity charts: the KPI, the trend, the breakdown, and the drill-down that answers "why".' },
      { heading: 'Safe self-service', body: 'Curated datasets and role-based access let teams explore on their own without breaking definitions or seeing data they should not.' },
    ],
    deliverables: [
      'A governed, documented metrics layer with conformed definitions',
      'Executive and operational dashboards designed around decisions',
      'Curated self-service datasets with role-based access',
      'Data freshness and reconciliation against systems of record',
      'Training and documentation for report consumers',
      'Ongoing enhancement and support options',
    ],
    technologies: ['SQL', 'Metabase / Looker-style BI', 'PostgreSQL / warehouse', 'Semantic modeling', 'Role-based access', 'Embedded analytics'],
    process: [
      { step: 'Decisions', detail: 'Start from the decisions and KPIs that matter, then work back to the data.' },
      { step: 'Model', detail: 'Define and test conformed metrics on the warehouse.' },
      { step: 'Build', detail: 'Design dashboards and curated self-service datasets.' },
      { step: 'Validate', detail: 'Reconcile every number against the system of record.' },
      { step: 'Enable', detail: 'Train users and roll out governed self-service.' },
    ],
    faqs: [
      { q: 'Which BI tool do you use?', a: 'We are tool-flexible — Metabase, Looker-style semantic layers, or embedded analytics inside your own app. The value is in the governed metrics layer underneath, which keeps you from being locked to any one tool.' },
      { q: 'Why do our current dashboards disagree?', a: 'Almost always because metrics are defined inconsistently across reports. We fix it with a single governed metrics layer so revenue means the same thing everywhere.' },
      { q: 'Can teams build their own reports?', a: 'Yes — safely. We publish curated, well-named datasets with role-based access so teams self-serve without breaking shared definitions.' },
    ],
    internalLinks: [
      { label: 'Executive Dashboards', href: '/services/data-analytics/executive-dashboards' },
      { label: 'Data Warehousing', href: '/services/data-analytics/data-warehousing' },
      { label: 'Predictive Analytics', href: '/services/data-analytics/predictive-analytics' },
      { label: 'Data Engineering', href: '/services/data-analytics/data-engineering' },
    ],
  },

  'data-analytics/executive-dashboards': {
    slug: 'data-analytics/executive-dashboards', category: 'Data & Analytics', status: 'published', qc: qcAllTrue,
    primaryKeyword: 'executive dashboard development',
    title: 'Executive Dashboard Development | Real-Time KPI Visibility | Innovatix Systems',
    metaDescription: 'Innovatix Systems builds executive dashboards that give leadership one live, trustworthy view of the business — the KPIs that matter, updated automatically, reconciled to source.',
    h1: 'Executive Dashboards for Real Decisions',
    intro: [
      'Leadership should not wait for a monthly deck to know how the business is doing. An executive dashboard puts the handful of numbers that actually drive decisions — revenue, margin, orders, cash, pipeline — in one live, trustworthy view.',
      'We build focused dashboards on top of a governed data foundation, so the KPIs update automatically, reconcile with the systems of record, and answer "how are we doing, and why" at a glance.',
    ],
    problems: [
      { heading: 'Decisions run on stale spreadsheets', body: 'By the time a manually-assembled report reaches the leadership meeting, it is days old and already being questioned. Decisions deserve live data.' },
      { heading: 'Too many metrics, no signal', body: 'A wall of 40 charts hides the 6 numbers that matter. Executive dashboards fail when they inform everything and decide nothing.' },
      { heading: 'No path from "what" to "why"', body: 'A KPI that dropped is only useful if you can drill into the cause. Flat dashboards show the symptom and stop there.' },
    ],
    solution: [
      { heading: 'The vital few, not the trivial many', body: 'We work with leadership to choose the KPIs that actually drive decisions, and design the dashboard so the signal is unmissable.' },
      { heading: 'Live and reconciled', body: 'KPIs refresh automatically from the warehouse and reconcile with finance and operations systems, so the number on screen is the number of record.' },
      { heading: 'Drill-down to the "why"', body: 'Every headline metric drills into the breakdown behind it — by channel, region, product, or period — so a change leads to a cause, not a follow-up meeting.' },
    ],
    deliverables: [
      'A KPI definition workshop with leadership',
      'A focused executive dashboard with the vital-few metrics',
      'Automated refresh from a governed warehouse',
      'Drill-downs from each KPI to its drivers',
      'Reconciliation with finance and operational systems',
      'Access controls, training, and support options',
    ],
    technologies: ['SQL', 'BI / semantic layer', 'Warehouse (PostgreSQL / MPP)', 'Scheduled refresh', 'Role-based access', 'Embedded analytics'],
    process: [
      { step: 'Align', detail: 'Agree the vital-few KPIs and their exact definitions with leadership.' },
      { step: 'Model', detail: 'Build and test those metrics on the warehouse.' },
      { step: 'Design', detail: 'Lay out for signal, with drill-down to drivers.' },
      { step: 'Reconcile', detail: 'Tie every number to the system of record.' },
      { step: 'Roll out', detail: 'Grant access, train, and iterate on real usage.' },
    ],
    faqs: [
      { q: 'How many KPIs should an executive dashboard show?', a: 'Usually a handful — the metrics that genuinely change decisions. We deliberately resist the wall-of-charts approach; the value of an executive view is focus.' },
      { q: 'How current is the data?', a: 'As current as the decision needs. Most KPIs refresh on a schedule from the warehouse; where a metric truly needs to be live, we build it that way. Either way it reconciles to source.' },
      { q: 'Can we drill into a number that looks off?', a: 'Yes — every headline KPI drills into its drivers (channel, region, product, time), so you go from "what changed" to "why" without opening a ticket.' },
    ],
    proof: { label: 'Amazon Sellers — operational visibility across channels', href: '/case-studies/apparel-globe' },
    internalLinks: [
      { label: 'Business Intelligence', href: '/services/data-analytics/business-intelligence' },
      { label: 'Data Warehousing', href: '/services/data-analytics/data-warehousing' },
      { label: 'Predictive Analytics', href: '/services/data-analytics/predictive-analytics' },
      { label: 'Our Delivery Process', href: '/company/process' },
    ],
  },

  'data-analytics/predictive-analytics': {
    slug: 'data-analytics/predictive-analytics', category: 'Data & Analytics', status: 'published', qc: qcAllTrue,
    primaryKeyword: 'predictive analytics services',
    title: 'Predictive Analytics Services | Forecasting & ML on Your Data | Innovatix Systems',
    metaDescription: 'Innovatix Systems builds predictive analytics grounded in your operational data — demand forecasting, churn and risk scoring, and models wired into the workflows that use them.',
    h1: 'Predictive Analytics, Grounded in Your Data',
    intro: [
      'Predictive analytics uses your history to inform what happens next — how much to stock, which customers are about to churn, which orders carry risk. The value is not the model in a notebook; it is the prediction delivered into the workflow where someone acts on it.',
      'We build pragmatic predictive models on a solid data foundation and wire them into your operations — a reorder suggestion, a risk flag, a forecast — with honest confidence, monitoring, and a clear fallback when the model is unsure.',
    ],
    problems: [
      { heading: 'Models that never leave the notebook', body: 'A data scientist builds a promising model, but it never reaches production, so it changes nothing. Prediction only pays off when it is operationalized.' },
      { heading: 'Garbage in, confident garbage out', body: 'Predictions built on messy, unreconciled data are worse than none — they are wrong with authority. The data foundation matters more than the algorithm.' },
      { heading: 'No sense of when to trust it', body: 'A forecast with no confidence signal and no monitoring drifts silently as conditions change, and no one knows when to stop trusting it.' },
    ],
    solution: [
      { heading: 'Start from a decision, not an algorithm', body: 'We pick problems where a prediction changes an action — reorder points, churn outreach, risk review — and design the model around that decision.' },
      { heading: 'Built on trustworthy data', body: 'Models train on the same governed, tested warehouse that powers your reporting, so predictions rest on numbers that reconcile with reality.' },
      { heading: 'Operationalized with honest confidence', body: 'Predictions are delivered into the workflow (a suggestion, a flag, an API), carry a confidence signal, are monitored for drift, and degrade to a sensible default when uncertain.' },
    ],
    deliverables: [
      'A use-case and feasibility assessment tied to a real decision',
      'A predictive model trained on your governed data',
      'Delivery of predictions into the workflow (UI, flag, or API)',
      'Confidence signals and a defined fallback behavior',
      'Drift monitoring and a retraining plan',
      'Documentation, handover, and support options',
    ],
    technologies: ['Python', 'scikit-learn / gradient boosting', 'Time-series forecasting', 'PostgreSQL / warehouse', 'Feature pipelines', 'Model monitoring'],
    process: [
      { step: 'Frame', detail: 'Pick a decision a prediction would change and confirm the data supports it.' },
      { step: 'Prepare', detail: 'Build feature pipelines on the governed warehouse.' },
      { step: 'Model', detail: 'Train, evaluate honestly, and set a confidence threshold.' },
      { step: 'Operationalize', detail: 'Deliver predictions into the workflow with a fallback.' },
      { step: 'Monitor', detail: 'Watch for drift and retrain on a schedule.' },
    ],
    faqs: [
      { q: 'Do we have enough data for predictive analytics?', a: 'Often yes for operational use cases like demand forecasting, but sometimes no. We start with a feasibility assessment and will tell you honestly if the data does not yet support a reliable model.' },
      { q: 'Is this the same as AI?', a: 'It overlaps. Predictive analytics focuses on forecasting and scoring from your historical data; our broader AI services cover automation, agents, and document intelligence. We use whichever fits the problem.' },
      { q: 'What happens when the model is unsure?', a: 'Every prediction carries a confidence signal and a defined fallback — a safe default or a hand-off to a human — so low-confidence cases never silently drive a bad action.' },
    ],
    internalLinks: [
      { label: 'AI Automation', href: '/services/ai-services/ai-automation' },
      { label: 'Business Intelligence', href: '/services/data-analytics/business-intelligence' },
      { label: 'Data Engineering', href: '/services/data-analytics/data-engineering' },
      { label: 'Document Intelligence', href: '/services/ai-services/document-intelligence' },
    ],
  },

  // ── Software Engineering (remaining) ──────────────────────────────────────
  'software-engineering/saas-product-development': {
    slug: 'software-engineering/saas-product-development', category: 'Software Engineering', status: 'published', qc: qcAllTrue,
    primaryKeyword: 'saas product development',
    title: 'SaaS Product Development Company | Multi-Tenant, Billing-Ready | Innovatix Systems',
    metaDescription: 'Innovatix Systems builds SaaS products end to end — multi-tenant architecture, subscription billing, secure auth, and the delivery transparency to ship and iterate with confidence.',
    h1: 'SaaS Product Development, Engineered to Scale',
    intro: [
      'Building a SaaS product is different from building an internal tool: from day one it has to be multi-tenant, secure, metered, and able to onboard a customer without a developer in the loop. Get the foundations wrong and every new customer makes the product harder to run.',
      'We build SaaS platforms with the hard parts done right — tenant isolation, subscription billing, roles and permissions, and self-service onboarding — so you can focus on the product, not fighting the plumbing.',
    ],
    problems: [
      { heading: 'Single-tenant code that cannot scale to many customers', body: 'A product built for one customer leaks data or requires a separate deployment per client. Retrofitting multi-tenancy later is painful and risky.' },
      { heading: 'Billing bolted on as an afterthought', body: 'Plans, trials, proration, upgrades, and dunning are deceptively complex. Hand-rolled billing becomes a source of revenue leakage and support tickets.' },
      { heading: 'Onboarding that needs an engineer', body: 'If every new customer requires manual setup, growth stalls. SaaS lives or dies on self-service onboarding.' },
    ],
    solution: [
      { heading: 'Multi-tenant from the first commit', body: 'We design tenant isolation into the data model and every query, with enforced scoping so one customer can never see another’s data — verified by tests, not hope.' },
      { heading: 'Subscription billing done properly', body: 'Plans, trials, upgrades/downgrades with proration, and webhook-authoritative payment state via a provider like Stripe — so what a customer can do always matches what they have paid for.' },
      { heading: 'Self-service onboarding and admin', body: 'Sign-up, team invites, roles and permissions, and an account/settings surface so customers run themselves and your team is not the bottleneck.' },
    ],
    deliverables: [
      'Multi-tenant architecture with enforced tenant isolation',
      'Subscription billing (plans, trials, proration, webhooks)',
      'Authentication, roles, permissions, and team management',
      'Self-service onboarding and account administration',
      'Usage metering and admin/reporting surfaces',
      'CI/CD, monitoring, and documentation',
    ],
    technologies: ['TypeScript', 'React / Next.js', 'Node.js / NestJS', 'PostgreSQL', 'Stripe', 'AWS', 'Docker / Kubernetes'],
    process: [
      { step: 'Discovery', detail: 'Define the product, tenancy model, plans, and roles.' },
      { step: 'Architecture', detail: 'Design tenant isolation, billing, and auth foundations.' },
      { step: 'Build', detail: 'Ship the product in sprints with transparent reporting.' },
      { step: 'QA & UAT', detail: 'Test isolation, billing edge cases, and onboarding flows.' },
      { step: 'Launch & iterate', detail: 'Deploy, monitor, and evolve with change requests.' },
    ],
    faqs: [
      { q: 'Do you handle subscription billing and Stripe?', a: 'Yes. We integrate Stripe (or a similar provider) with webhook-authoritative payment state, plans, trials, and proration, so entitlements always reflect what the customer has actually paid for.' },
      { q: 'How do you guarantee one customer cannot see another’s data?', a: 'Tenant isolation is designed into the data model and enforced on every query, then verified with automated cross-tenant tests — the same approach we use across our multi-tenant platforms.' },
      { q: 'Can you take a SaaS product from idea to launch?', a: 'Yes — from discovery and architecture through build, launch, and ongoing iteration, with a connected client portal so you see progress the whole way.' },
    ],
    internalLinks: [
      { label: 'Web Application Development', href: '/services/software-engineering/web-application-development' },
      { label: 'Custom Software Development', href: '/services/software-engineering/custom-software-development' },
      { label: 'Cloud Architecture', href: '/services/cloud-infrastructure/cloud-architecture' },
      { label: 'Our Delivery Process', href: '/company/process' },
    ],
  },

  'software-engineering/web-application-development': {
    slug: 'software-engineering/web-application-development', category: 'Software Engineering', status: 'published', qc: qcAllTrue,
    primaryKeyword: 'web application development',
    title: 'Web Application Development | Fast, Secure, Custom | Innovatix Systems',
    metaDescription: 'Innovatix Systems builds custom web applications — dashboards, portals, and operational tools — that are fast, secure, and engineered around your workflows, not a template.',
    h1: 'Custom Web Application Development',
    intro: [
      'A web application is where your team, customers, or vendors actually do the work — so it has to be fast, reliable, and shaped around real workflows. Generic templates and no-code tools break exactly when the workflow gets interesting.',
      'We build custom web apps — internal operations tools, customer and vendor portals, dashboards, and admin systems — engineered for performance, security, and the specific way your business runs.',
    ],
    problems: [
      { heading: 'Slow, clunky interfaces kill adoption', body: 'If a tool is slow or awkward, people route around it back to spreadsheets. Web apps have to be fast and clear to actually get used.' },
      { heading: 'Workflows that do not fit off-the-shelf', body: 'Approvals, multi-step processes, and role-specific views rarely match a packaged product. Forcing the fit creates workarounds and shadow processes.' },
      { heading: 'Security and access as an afterthought', body: 'Business web apps handle sensitive data and multiple roles. Bolting on auth and permissions late leaves gaps.' },
    ],
    solution: [
      { heading: 'Built for speed and clarity', body: 'Modern React/Next.js front-ends with server-rendering where it helps, thoughtful UX, and real-time updates where the workflow benefits — so the app feels fast and obvious.' },
      { heading: 'Shaped around your workflow', body: 'We model the actual process — states, approvals, role-specific views — so the app supports how work really happens instead of forcing a generic flow.' },
      { heading: 'Secure and role-aware by design', body: 'Authentication, role-based access, and audit logging are part of the foundation, so the right people see the right things and actions are traceable.' },
    ],
    deliverables: [
      'A custom web application built on a modeled data layer',
      'Role-based access control and secure authentication',
      'Responsive UI designed around your real workflows',
      'Integrations with the systems the app depends on',
      'Automated tests, CI/CD, and monitoring',
      'Documentation, handover, and support options',
    ],
    technologies: ['TypeScript', 'React / Next.js', 'Node.js / NestJS', 'PostgreSQL', 'Tailwind CSS', 'AWS', 'WebSockets'],
    process: [
      { step: 'Discovery', detail: 'Map the workflow, roles, and data the app must serve.' },
      { step: 'Design', detail: 'Prototype the key screens and the data model.' },
      { step: 'Build', detail: 'Ship in sprints with visible progress in your portal.' },
      { step: 'QA & UAT', detail: 'Test against a clear definition of done with your team.' },
      { step: 'Deploy & support', detail: 'Release, monitor, and iterate on real usage.' },
    ],
    faqs: [
      { q: 'What kinds of web apps do you build?', a: 'Internal operations tools, customer and vendor portals, dashboards, admin systems, and B2B applications — the software teams use to run day-to-day work.' },
      { q: 'Can it integrate with our existing systems?', a: 'Yes — we build integrations with ERPs, marketplaces, payment processors, and internal APIs so the app fits into your stack rather than sitting beside it.' },
      { q: 'Will it work well on mobile browsers?', a: 'We build responsive interfaces that work across devices; for field or warehouse use where a browser is not ideal, we also build dedicated mobile experiences.' },
    ],
    internalLinks: [
      { label: 'SaaS Product Development', href: '/services/software-engineering/saas-product-development' },
      { label: 'Mobile Application Development', href: '/services/software-engineering/mobile-application-development' },
      { label: 'Custom Software Development', href: '/services/software-engineering/custom-software-development' },
      { label: 'Customer Portals', href: '/services/enterprise-systems/erp-development' },
    ],
  },

  'software-engineering/mobile-application-development': {
    slug: 'software-engineering/mobile-application-development', category: 'Software Engineering', status: 'published', qc: qcAllTrue,
    primaryKeyword: 'mobile application development',
    title: 'Mobile Application Development | Field, Warehouse & Customer Apps | Innovatix Systems',
    metaDescription: 'Innovatix Systems builds mobile applications for operations — field reps, warehouse scanning, and customer apps — connected to the same systems your business runs on.',
    h1: 'Mobile Applications for the Way You Operate',
    intro: [
      'Mobile matters most where the work happens away from a desk: a rep in the field, a picker on the warehouse floor, a customer checking an order. A mobile app earns its keep when it is connected to your real operational data and designed for one-handed, on-the-move use.',
      'We build mobile experiences — responsive PWAs and native/cross-platform apps — wired into the same backend as the rest of your platform, so what happens on the phone updates the business in real time.',
    ],
    problems: [
      { heading: 'Field and floor work still runs on paper', body: 'Visit notes, counts, and scans captured on paper get re-keyed later — slowly and with errors. Mobile capture at the point of work removes the double entry.' },
      { heading: 'Apps disconnected from the real system', body: 'A mobile app that syncs to a spreadsheet or a separate database drifts out of truth. It has to talk to the same source of record as everything else.' },
      { heading: 'Unreliable connectivity breaks the workflow', body: 'Warehouses and field sites have dead zones. An app that only works online strands the user exactly when they need it.' },
    ],
    solution: [
      { heading: 'Designed for the point of work', body: 'Scanning, large tap targets, and focused single-task flows for field and warehouse use — plus clean customer-facing apps where that is the need.' },
      { heading: 'Connected to your source of truth', body: 'The app talks to the same backend and data model as your web platform, so a scan, a visit, or an order updates the business immediately.' },
      { heading: 'Resilient to bad connectivity', body: 'Offline-tolerant capture with sync-on-reconnect where the workflow demands it, so a dead zone does not stop the work.' },
    ],
    deliverables: [
      'A mobile app (PWA or cross-platform/native) for your use case',
      'Barcode/QR scanning and device-camera workflows where needed',
      'Real-time connection to your operational backend',
      'Offline-tolerant capture with sync where required',
      'Role-based access and secure authentication',
      'Store submission support (native), documentation, and support',
    ],
    technologies: ['React Native', 'Progressive Web Apps', 'TypeScript', 'Node.js / NestJS', 'PostgreSQL', 'Zebra / Honeywell scanners', 'Push notifications'],
    process: [
      { step: 'Discovery', detail: 'Define the on-the-move workflow, devices, and connectivity reality.' },
      { step: 'Design', detail: 'Prototype focused, one-handed flows for the point of work.' },
      { step: 'Build', detail: 'Develop the app against your real backend, with sync.' },
      { step: 'Field test', detail: 'Validate on real devices in real conditions.' },
      { step: 'Release & support', detail: 'Ship (store or PWA), monitor, and iterate.' },
    ],
    faqs: [
      { q: 'Native or cross-platform or PWA?', a: 'We choose based on the use case: a PWA is fast to ship and great for many internal tools; cross-platform (React Native) or native suits app-store distribution, deep device features, or heavy offline use. We recommend the fit, not the fashion.' },
      { q: 'Do you support barcode scanning and handhelds?', a: 'Yes — camera-based scanning on phones/tablets and dedicated handhelds like Zebra and Honeywell, with workflows that enforce correct sequence and flag exceptions.' },
      { q: 'Will the app work offline?', a: 'Where the workflow needs it, we build offline-tolerant capture that syncs when connectivity returns, so dead zones do not stop work.' },
    ],
    internalLinks: [
      { label: 'Web Application Development', href: '/services/software-engineering/web-application-development' },
      { label: 'Warehouse Management Systems', href: '/services/enterprise-systems/warehouse-management-systems' },
      { label: 'Custom Software Development', href: '/services/software-engineering/custom-software-development' },
      { label: 'Systems Integration', href: '/services/software-engineering/systems-integration' },
    ],
  },

  'software-engineering/legacy-modernization': {
    slug: 'software-engineering/legacy-modernization', category: 'Software Engineering', status: 'published', qc: qcAllTrue,
    primaryKeyword: 'legacy software modernization',
    title: 'Legacy Software Modernization | Replace Risk Without a Big-Bang | Innovatix Systems',
    metaDescription: 'Innovatix Systems modernizes legacy software safely — data migration, incremental replacement, and a rollback plan at every step, so operations never stop.',
    h1: 'Legacy Software Modernization',
    intro: [
      'Legacy systems do not fail loudly — they slowly tax the business: fragile integrations, no one who fully understands them, and every change a gamble. But ripping them out in one big-bang cutover is how modernization projects fail spectacularly.',
      'We modernize legacy software the safe way: understand the current system, replace it in controlled increments behind a stable interface, migrate data carefully, and keep a rollback plan at every step — so the business keeps running the whole time.',
    ],
    problems: [
      { heading: 'The system is a black box', body: 'Undocumented behavior and business rules buried in old code mean no one can safely change it. Modernization has to start by making the current system understood.' },
      { heading: 'Big-bang rewrites are high-risk', body: 'Replacing everything at once means a single cutover where everything must work perfectly — a bet businesses regularly lose.' },
      { heading: 'Data migration is where projects die', body: 'Decades of accumulated, inconsistent data rarely map cleanly to a new model. Underestimating migration derails timelines and trust.' },
    ],
    solution: [
      { heading: 'Understand before you replace', body: 'We document the current system’s real behavior, data, and integrations, and capture the business rules that actually matter — so nothing critical is lost in the move.' },
      { heading: 'Incremental, reversible replacement', body: 'We replace the legacy system piece by piece behind a stable interface (a strangler-fig approach), so each step is small, verifiable, and reversible instead of one terrifying cutover.' },
      { heading: 'Careful, verified data migration', body: 'We profile, clean, and migrate data with reconciliation and verification against the source, and always into a fresh target first — never overwriting the old system blind.' },
    ],
    deliverables: [
      'An assessment of the current system, data, and integrations',
      'A phased modernization plan with reversible increments',
      'Incremental replacement behind a stable interface',
      'Verified data migration with reconciliation',
      'Automated tests, CI/CD, and monitoring on the new system',
      'Cutover, rollback plan, and post-migration support',
    ],
    technologies: ['TypeScript', 'Node.js / NestJS', 'PostgreSQL', 'API gateways / adapters', 'AWS', 'Data-migration tooling', 'Automated testing'],
    process: [
      { step: 'Assess', detail: 'Document the current system, data, rules, and integrations.' },
      { step: 'Plan', detail: 'Sequence reversible increments and a data-migration strategy.' },
      { step: 'Strangle', detail: 'Replace piece by piece behind a stable interface.' },
      { step: 'Migrate', detail: 'Move and reconcile data into fresh targets, verified.' },
      { step: 'Cut over', detail: 'Switch with a rollback plan, then support and stabilize.' },
    ],
    faqs: [
      { q: 'Do we have to replace everything at once?', a: 'No — and we recommend against it. We use an incremental "strangler-fig" approach, replacing the legacy system piece by piece behind a stable interface so each step is small and reversible.' },
      { q: 'What about our years of existing data?', a: 'We profile, clean, and migrate it with reconciliation against the source, always loading into a fresh target first and verifying before any cutover. Data migration is treated as a first-class part of the project, not an afterthought.' },
      { q: 'Will the business keep running during modernization?', a: 'Yes — that is the point of the incremental approach. Operations continue throughout, with each change verified and reversible.' },
    ],
    internalLinks: [
      { label: 'Enterprise Software Development', href: '/services/software-engineering/enterprise-software-development' },
      { label: 'Systems Integration', href: '/services/software-engineering/systems-integration' },
      { label: 'Software Maintenance & Support', href: '/services/software-engineering/maintenance-support' },
      { label: 'Our Delivery Process', href: '/company/process' },
    ],
  },

  'software-engineering/maintenance-support': {
    slug: 'software-engineering/maintenance-support', category: 'Software Engineering', status: 'published', qc: qcAllTrue,
    primaryKeyword: 'software maintenance and support',
    title: 'Software Maintenance & Support Services | Keep Systems Reliable | Innovatix Systems',
    metaDescription: 'Innovatix Systems provides software maintenance and support — monitoring, security updates, bug fixes, and enhancements — so the systems your business depends on stay reliable.',
    h1: 'Software Maintenance & Support',
    intro: [
      'Shipping software is the start, not the finish. The systems your business runs on need monitoring, security patches, dependency updates, and steady improvement — or they quietly rot until something breaks at the worst possible time.',
      'We provide ongoing maintenance and support for the software we build and for systems we inherit: proactive monitoring, fast response when something goes wrong, and scoped enhancements so the platform keeps getting better.',
    ],
    problems: [
      { heading: 'Small issues become outages', body: 'Unpatched dependencies, expiring certificates, and creeping errors go unnoticed until they cause a production incident. Reactive-only support is how avoidable outages happen.' },
      { heading: 'The system stagnates', body: 'Without a steady stream of small improvements, software falls behind the business, and the backlog of "we should fix that" only grows.' },
      { heading: 'No one to call', body: 'When the original team is gone, a production problem has no clear owner. That uncertainty is a business risk on critical systems.' },
    ],
    solution: [
      { heading: 'Proactive monitoring and upkeep', body: 'Health monitoring, alerting, dependency and security updates, and backups verified — so problems are caught and prevented, not just cleaned up.' },
      { heading: 'Responsive support with clear expectations', body: 'A defined response process and priorities so you know how and when issues get handled, and a real team who knows your system.' },
      { heading: 'Steady, scoped enhancement', body: 'Beyond keeping the lights on, we deliver improvements and change requests — each scoped, priced, and approved before work begins.' },
    ],
    deliverables: [
      'Monitoring, alerting, and incident response',
      'Security patches and dependency updates',
      'Bug fixes and reliability improvements',
      'Verified backups and recovery readiness',
      'Scoped enhancements and change requests',
      'Regular reporting on health, work done, and risks',
    ],
    technologies: ['Monitoring & alerting', 'CI/CD', 'PostgreSQL backups / PITR', 'Dependency scanning', 'AWS', 'Log aggregation'],
    process: [
      { step: 'Onboard', detail: 'Assess the system, access, monitoring, and known risks.' },
      { step: 'Stabilize', detail: 'Close obvious gaps: alerts, backups, urgent patches.' },
      { step: 'Operate', detail: 'Monitor, patch, respond, and report on a cadence.' },
      { step: 'Improve', detail: 'Deliver scoped enhancements and reduce risk over time.' },
    ],
    faqs: [
      { q: 'Do you support software you did not build?', a: 'Yes. We onboard by assessing the system, access, and risks, close the obvious gaps (monitoring, backups, urgent patches), then operate and improve it from there.' },
      { q: 'How do you handle urgent production issues?', a: 'With a defined response process and priorities, monitoring that surfaces problems early, and a team that knows your system — so incidents are handled quickly and communicated clearly.' },
      { q: 'Is enhancement work included?', a: 'Maintenance keeps the system healthy; enhancements and change requests are scoped, priced, and approved before work begins, so you control what gets built.' },
    ],
    internalLinks: [
      { label: 'Legacy Software Modernization', href: '/services/software-engineering/legacy-modernization' },
      { label: 'Custom Software Development', href: '/services/software-engineering/custom-software-development' },
      { label: 'Cloud Architecture', href: '/services/cloud-infrastructure/cloud-architecture' },
      { label: 'Our Delivery Process', href: '/company/process' },
    ],
  },

  // ── Security ──────────────────────────────────────────────────────────────
  'security/secure-architecture': {
    slug: 'security/secure-architecture', category: 'Security', status: 'published', qc: qcAllTrue,
    primaryKeyword: 'secure software architecture',
    title: 'Secure Software Architecture | Security by Design | Innovatix Systems',
    metaDescription: 'Innovatix Systems designs secure software architecture from the first commit — tenant isolation, least privilege, and defense in depth built in, not bolted on.',
    h1: 'Secure Software Architecture',
    intro: [
      'Most breaches are not exotic — they trace back to architecture decisions made early and never revisited: shared data with no isolation, over-broad access, secrets in the wrong place. Security you can trust is designed in at the foundation, not sprayed on before launch.',
      'We build software secure by design: tenant isolation, least-privilege access, encrypted transport and storage, and defense in depth, so the architecture resists mistakes instead of amplifying them.',
    ],
    problems: [
      { heading: 'Security bolted on at the end', body: 'Retrofitting isolation, access control, and auditing onto a finished system is expensive and leaky. The architecture has to assume security from the start.' },
      { heading: 'Over-broad trust and access', body: 'Services and users granted more access than they need turn a small compromise into a large one. Least privilege limits blast radius.' },
      { heading: 'No isolation between tenants or environments', body: 'Shared data stores without enforced scoping mean one bug exposes everyone. Isolation is an architectural property, not a config flag.' },
    ],
    solution: [
      { heading: 'Isolation and least privilege by default', body: 'We design tenant and environment isolation into the data model and enforce least-privilege access for every user and service — then verify it with tests.' },
      { heading: 'Defense in depth', body: 'Multiple layers — network, application, data, and identity — so no single failure is catastrophic, and encryption in transit and at rest is standard.' },
      { heading: 'Secrets and supply chain handled', body: 'Secrets live in a manager, not in code; dependencies are scanned; and boot-time configuration validation refuses to run insecurely in production.' },
    ],
    deliverables: [
      'A threat-informed architecture and data-isolation design',
      'Least-privilege access model for users and services',
      'Encryption in transit and at rest, and secrets management',
      'Dependency scanning and supply-chain hygiene',
      'Security tests (including cross-tenant isolation)',
      'Architecture documentation and a hardening checklist',
    ],
    technologies: ['Tenant isolation patterns', 'JWT / OAuth', 'Secrets managers', 'TLS / encryption at rest', 'Dependency scanning', 'AWS security services'],
    process: [
      { step: 'Model threats', detail: 'Identify what must be protected and the realistic attack surface.' },
      { step: 'Design', detail: 'Architect isolation, least privilege, and defense in depth.' },
      { step: 'Build', detail: 'Implement with secure defaults and secrets hygiene.' },
      { step: 'Verify', detail: 'Test isolation and access; scan dependencies.' },
      { step: 'Harden', detail: 'Document and lock down the production configuration.' },
    ],
    faqs: [
      { q: 'Can you improve the security of a system we already have?', a: 'Yes. We assess the current architecture, prioritize the highest-risk gaps (isolation, access, secrets, dependencies), and remediate incrementally rather than demanding a rewrite.' },
      { q: 'How do you prove tenant isolation actually holds?', a: 'With automated cross-tenant tests that attempt to access another tenant’s data and assert failure — isolation is enforced and verified, not assumed.' },
      { q: 'Do you handle secrets and configuration safely?', a: 'Secrets live in a manager, never in code, and our systems validate configuration at boot so they refuse to start insecurely in production.' },
    ],
    internalLinks: [
      { label: 'Authentication & Authorization', href: '/services/security/authentication-authorization' },
      { label: 'Role-Based Access Control', href: '/services/security/rbac' },
      { label: 'Application Security', href: '/services/security/application-security' },
      { label: 'Cloud Architecture', href: '/services/cloud-infrastructure/cloud-architecture' },
    ],
  },

  'security/authentication-authorization': {
    slug: 'security/authentication-authorization', category: 'Security', status: 'published', qc: qcAllTrue,
    primaryKeyword: 'authentication and authorization',
    title: 'Authentication & Authorization | Secure Identity Engineering | Innovatix Systems',
    metaDescription: 'Innovatix Systems builds authentication and authorization the right way — secure sessions, strong password handling, MFA-ready flows, and server-authoritative permissions.',
    h1: 'Authentication & Authorization',
    intro: [
      'Authentication proves who a user is; authorization decides what they can do. Get either wrong and everything else is moot. Yet these are exactly the areas teams most often hand-roll insecurely — weak sessions, client-trusted roles, passwords stored badly.',
      'We build identity the right way: secure session handling, strong credential storage, MFA-ready flows, and authorization that is always decided on the server, never trusted from the client.',
    ],
    problems: [
      { heading: 'Roles trusted from the client', body: 'If the browser tells the server what the user is allowed to do, the check is worthless. Authorization must be server-authoritative.' },
      { heading: 'Weak session and credential handling', body: 'Long-lived tokens, weak password hashing, and no rotation turn one leak into a persistent compromise.' },
      { heading: 'No separation between user types', body: 'Sharing one identity system across staff and customers without separate trust domains means one breach crosses boundaries it should not.' },
    ],
    solution: [
      { heading: 'Server-authoritative authorization', body: 'Every permission is resolved on the server from the source of truth, so a role forged in a token or request body is ignored — and sensitive denials are audited.' },
      { heading: 'Secure sessions and credentials', body: 'HttpOnly cookies or short-lived tokens, strong password hashing, and MFA-ready flows, with separate signing secrets for separate trust domains.' },
      { heading: 'Least privilege and safe defaults', body: 'New users get the least access needed; deactivation takes effect immediately; and the system fails closed when identity cannot be verified.' },
    ],
    deliverables: [
      'Authentication with secure sessions and strong credential storage',
      'MFA-ready flows and account lifecycle (invite, deactivate)',
      'Server-authoritative authorization / permission checks',
      'Separate trust domains for staff vs. customer identities',
      'Audit trail for sensitive auth events',
      'Documentation and security tests',
    ],
    technologies: ['JWT', 'OAuth / OIDC', 'HttpOnly cookies', 'Argon2 / bcrypt', 'MFA / TOTP', 'RBAC enforcement'],
    process: [
      { step: 'Model', detail: 'Define identities, trust domains, and the permission model.' },
      { step: 'Build auth', detail: 'Implement secure sessions and credential handling.' },
      { step: 'Build authz', detail: 'Enforce server-side permissions from the source of truth.' },
      { step: 'Harden', detail: 'Add MFA readiness, lockouts, and fail-closed behavior.' },
      { step: 'Verify', detail: 'Test permission bypass attempts and audit coverage.' },
    ],
    faqs: [
      { q: 'Do you support MFA and SSO?', a: 'Yes — we build MFA-ready flows and integrate SSO / enterprise identity; see our SSO & Enterprise Identity service for federated login with providers like Okta, Azure AD, and Google Workspace.' },
      { q: 'How do you stop users escalating their own permissions?', a: 'Authorization is always resolved server-side from the source of truth, so a role claimed in a token or request body is ignored, and sensitive denials are logged.' },
      { q: 'Where are passwords stored?', a: 'Never in plain text — we use strong, modern hashing (e.g. Argon2/bcrypt) and never store or log credentials.' },
    ],
    internalLinks: [
      { label: 'SSO & Enterprise Identity', href: '/services/security/sso-enterprise-identity' },
      { label: 'Role-Based Access Control', href: '/services/security/rbac' },
      { label: 'Secure Software Architecture', href: '/services/security/secure-architecture' },
      { label: 'Audit Logging', href: '/services/security/audit-logging' },
    ],
  },

  'security/sso-enterprise-identity': {
    slug: 'security/sso-enterprise-identity', category: 'Security', status: 'published', qc: qcAllTrue,
    primaryKeyword: 'sso and enterprise identity',
    title: 'SSO & Enterprise Identity Integration | Okta, Azure AD, Google | Innovatix Systems',
    metaDescription: 'Innovatix Systems integrates single sign-on and enterprise identity — SAML/OIDC with Okta, Azure AD, and Google Workspace — with provisioning and central access control.',
    h1: 'SSO & Enterprise Identity Integration',
    intro: [
      'When a business grows, managing a separate login for every application becomes a security and support burden. Single sign-on lets employees use one enterprise identity everywhere, and lets IT grant and revoke access centrally — including the moment someone leaves.',
      'We integrate your applications with enterprise identity providers over SAML and OIDC, with role mapping and provisioning, so access is centralized, auditable, and instantly revocable.',
    ],
    problems: [
      { heading: 'Access that outlives employment', body: 'Without central identity, a departing employee’s scattered logins linger, each a standing risk. SSO makes revocation a single action.' },
      { heading: 'Password sprawl', body: 'Separate credentials per app mean weak, reused passwords and constant reset tickets. One federated identity fixes both.' },
      { heading: 'No central visibility of access', body: 'When each app manages its own users, no one can answer "who can access what" — a problem for security and for audits.' },
    ],
    solution: [
      { heading: 'Federated login over SAML / OIDC', body: 'We integrate with Okta, Azure AD/Entra, Google Workspace, and other IdPs so users authenticate once with their enterprise identity.' },
      { heading: 'Role mapping and provisioning', body: 'Group and role claims from the IdP map to application roles, and provisioning/de-provisioning keeps access in sync automatically.' },
      { heading: 'Central control and revocation', body: 'Access is granted and revoked centrally at the IdP, so offboarding is immediate and "who can access what" has a single answer.' },
    ],
    deliverables: [
      'SAML/OIDC integration with your identity provider',
      'Role/group claim mapping to application permissions',
      'Just-in-time or SCIM-style provisioning where supported',
      'Central revocation and offboarding flow',
      'Fallback and break-glass access handling',
      'Documentation and configuration handover',
    ],
    technologies: ['SAML 2.0', 'OpenID Connect (OIDC)', 'Okta', 'Azure AD / Entra ID', 'Google Workspace', 'SCIM provisioning'],
    process: [
      { step: 'Assess', detail: 'Identify the IdP, apps, and role mapping requirements.' },
      { step: 'Integrate', detail: 'Wire SAML/OIDC login into the applications.' },
      { step: 'Map roles', detail: 'Translate IdP groups/claims into app permissions.' },
      { step: 'Provision', detail: 'Automate access sync and offboarding.' },
      { step: 'Verify', detail: 'Test login, revocation, and break-glass paths.' },
    ],
    faqs: [
      { q: 'Which identity providers do you support?', a: 'The standards-based ones — SAML 2.0 and OIDC — which covers Okta, Azure AD/Entra, Google Workspace, OneLogin, and most enterprise IdPs.' },
      { q: 'Can access be revoked instantly when someone leaves?', a: 'Yes — that is a core benefit. Because identity is centralized at the IdP, disabling the user there revokes access to every integrated app at once.' },
      { q: 'Do you handle automated provisioning?', a: 'Where the IdP supports it, yes — via just-in-time provisioning or SCIM — so accounts and roles stay in sync without manual work.' },
    ],
    internalLinks: [
      { label: 'Authentication & Authorization', href: '/services/security/authentication-authorization' },
      { label: 'Role-Based Access Control', href: '/services/security/rbac' },
      { label: 'Secure Software Architecture', href: '/services/security/secure-architecture' },
      { label: 'Systems Integration', href: '/services/software-engineering/systems-integration' },
    ],
  },

  'security/rbac': {
    slug: 'security/rbac', category: 'Security', status: 'published', qc: qcAllTrue,
    primaryKeyword: 'role-based access control',
    title: 'Role-Based Access Control (RBAC) Development | Innovatix Systems',
    metaDescription: 'Innovatix Systems designs and builds role-based access control — clear roles and permissions, server-enforced, auditable, and flexible enough for real organizations.',
    h1: 'Role-Based Access Control (RBAC)',
    intro: [
      'As soon as more than a couple of people use a system, "who can do what" becomes a real problem. Role-based access control answers it cleanly: permissions attach to roles, roles attach to people, and every action is checked against them — on the server.',
      'We design RBAC that fits how your organization actually works — including nuances like organization scoping and last-owner protection — and enforce it consistently so the right people can act and the wrong ones cannot.',
    ],
    problems: [
      { heading: 'Permissions scattered through the code', body: 'Ad-hoc if-statements checking user types are impossible to audit and easy to get wrong. Access rules need one clear, enforced model.' },
      { heading: 'All-or-nothing access', body: 'When the only roles are "admin" and "everyone else", people get far more power than they need. Real organizations need graded roles.' },
      { heading: 'Dangerous edge cases', body: 'Removing the last admin, changing your own role, or cross-organization access are the edge cases that cause lockouts and breaches when unhandled.' },
    ],
    solution: [
      { heading: 'A clear role/permission matrix', body: 'We define roles and the specific actions each may perform, in one place, so access is legible and auditable instead of buried in code.' },
      { heading: 'Server-enforced, consistently', body: 'Every sensitive action checks the actor’s current role from the source of truth — so permissions cannot be forged and changes take effect immediately.' },
      { heading: 'Guardrails for the edge cases', body: 'Organization scoping (no cross-tenant access), self-lockout prevention, and last-owner protection so administration is safe as well as flexible.' },
    ],
    deliverables: [
      'A documented role/permission matrix',
      'Server-side permission enforcement across the app',
      'Organization/tenant scoping of access',
      'Self-lockout and last-owner protections',
      'Audit events for permission-sensitive actions',
      'Tests proving each role’s boundaries',
    ],
    technologies: ['RBAC modeling', 'Server-side authorization', 'PostgreSQL', 'JWT / sessions', 'Audit logging', 'Automated authorization tests'],
    process: [
      { step: 'Model roles', detail: 'Define roles and the exact actions each may take.' },
      { step: 'Enforce', detail: 'Implement server-side checks from the source of truth.' },
      { step: 'Scope', detail: 'Add tenant/org scoping and edge-case guardrails.' },
      { step: 'Audit', detail: 'Log sensitive actions and denials.' },
      { step: 'Verify', detail: 'Test each role’s allowed and forbidden actions.' },
    ],
    faqs: [
      { q: 'RBAC vs. ABAC — which do we need?', a: 'Most organizations are served well by RBAC (roles and permissions). Attribute-based rules add value for fine-grained, context-dependent access; we combine them where the requirement genuinely calls for it, rather than over-engineering.' },
      { q: 'Can roles differ per organization or team?', a: 'Yes — we scope access by organization/tenant so the same role means the right thing within each customer or team, with no cross-boundary access.' },
      { q: 'How do you prevent admin lockouts?', a: 'With guardrails like self-role-change limits and last-active-owner protection, so administration cannot accidentally lock an organization out of its own account.' },
    ],
    internalLinks: [
      { label: 'Authentication & Authorization', href: '/services/security/authentication-authorization' },
      { label: 'Audit Logging', href: '/services/security/audit-logging' },
      { label: 'Secure Software Architecture', href: '/services/security/secure-architecture' },
      { label: 'SSO & Enterprise Identity', href: '/services/security/sso-enterprise-identity' },
    ],
  },

  'security/audit-logging': {
    slug: 'security/audit-logging', category: 'Security', status: 'published', qc: qcAllTrue,
    primaryKeyword: 'audit logging implementation',
    title: 'Audit Logging Implementation | Traceable, Tamper-Evident | Innovatix Systems',
    metaDescription: 'Innovatix Systems builds audit logging that makes sensitive actions traceable — who did what, when, and to what — the foundation of accountability and compliance readiness.',
    h1: 'Audit Logging',
    intro: [
      'When something goes wrong — a record changed, access granted, data exported — the first question is always "who did this, and when?" Without an audit trail, there is no answer, and no accountability. With one, you have both, plus a foundation for compliance.',
      'We build audit logging into the systems we deliver: sensitive actions recorded with actor, action, target, and time, scoped to the right tenant, and captured consistently rather than in scattered ad-hoc log lines.',
    ],
    problems: [
      { heading: 'No answer to "who changed this?"', body: 'When records mutate with no trail, disputes and incidents are unresolvable and trust erodes. Sensitive actions need a durable record.' },
      { heading: 'Logs that are noise, not evidence', body: 'Unstructured console logs scattered across services cannot be searched or trusted as an audit trail. Audit events must be structured and consistent.' },
      { heading: 'Compliance asks you cannot answer', body: 'Auditors and enterprise customers ask for access and change history. Without audit logging, the answer is an embarrassing "we do not have that".' },
    ],
    solution: [
      { heading: 'Structured, consistent audit events', body: 'Every sensitive action writes a structured event — actor, action, target, tenant, timestamp — through one path, so the trail is complete and searchable.' },
      { heading: 'Correct attribution', body: 'Events record who really acted (client vs. staff vs. system vs. webhook) and are scoped to the right organization, so the trail is accurate, not misleading.' },
      { heading: 'Durable and reviewable', body: 'Audit data is stored durably, protected from casual tampering, and exposed through review surfaces so it is usable when it matters.' },
    ],
    deliverables: [
      'An audit event model (actor, action, target, tenant, time)',
      'Consistent capture of sensitive actions through one path',
      'Correct actor attribution and tenant scoping',
      'Durable storage and retention policy',
      'Review/query access to the audit trail',
      'Documentation mapping actions to audit coverage',
    ],
    technologies: ['Structured logging', 'PostgreSQL', 'Append-only patterns', 'Correlation IDs', 'Retention policies', 'Log aggregation'],
    process: [
      { step: 'Define', detail: 'Identify which actions must be audited and why.' },
      { step: 'Model', detail: 'Design the audit event schema and attribution.' },
      { step: 'Instrument', detail: 'Capture events consistently through one path.' },
      { step: 'Store', detail: 'Persist durably with a retention policy.' },
      { step: 'Expose', detail: 'Provide review and query access.' },
    ],
    faqs: [
      { q: 'What should be audited?', a: 'Security- and business-sensitive actions: logins and permission changes, data access/export, financial actions, and record changes that matter. We map the set with you rather than logging everything into noise.' },
      { q: 'Does audit logging help with compliance?', a: 'It is foundational to it — access and change history is a near-universal requirement for SOC 2, HIPAA-aligned, and enterprise reviews. See our Compliance-Readiness Engineering service.' },
      { q: 'Can the logs be tampered with?', a: 'We store audit data durably with append-only patterns and access controls so it is protected from casual tampering and usable as evidence.' },
    ],
    internalLinks: [
      { label: 'Role-Based Access Control', href: '/services/security/rbac' },
      { label: 'Compliance-Readiness Engineering', href: '/services/security/compliance-readiness' },
      { label: 'Secure Software Architecture', href: '/services/security/secure-architecture' },
      { label: 'Application Security', href: '/services/security/application-security' },
    ],
  },

  'security/application-security': {
    slug: 'security/application-security', category: 'Security', status: 'published', qc: qcAllTrue,
    primaryKeyword: 'application security services',
    title: 'Application Security Services | Harden Your Software | Innovatix Systems',
    metaDescription: 'Innovatix Systems hardens applications against real-world attacks — input validation, safe file handling and malware scanning, dependency hygiene, and secure defaults.',
    h1: 'Application Security',
    intro: [
      'Application security is the practical work of making software resistant to the attacks it will actually face: injection, broken access control, unsafe uploads, vulnerable dependencies, and leaked secrets. It is less about a single silver bullet and more about doing many things correctly.',
      'We harden applications end to end — validating input, handling files and uploads safely (including malware scanning), keeping dependencies current, and shipping secure defaults — so the software holds up in the real world.',
    ],
    problems: [
      { heading: 'Untrusted input trusted anyway', body: 'Injection and broken validation remain top causes of breaches. Every input from a user or third party has to be treated as hostile.' },
      { heading: 'Unsafe file uploads', body: 'Accepting user files without scanning and controls invites malware and abuse. Uploads need validation, scanning, and safe storage.' },
      { heading: 'Vulnerable, outdated dependencies', body: 'Most application code is third-party. Unpatched libraries are a standing, well-known attack path.' },
    ],
    solution: [
      { heading: 'Validate and encode everywhere', body: 'Strict input validation, parameterized queries, and output encoding close off injection and cross-site scripting by construction.' },
      { heading: 'Safe file handling and scanning', body: 'Uploaded files are validated, malware-scanned before they are trusted, and stored with least-privilege access — the same approach we use in our own platforms.' },
      { heading: 'Dependency and secret hygiene', body: 'Dependencies are scanned and updated, secrets live in a manager, and the app ships with secure defaults and hardened configuration.' },
    ],
    deliverables: [
      'Input validation and injection/XSS mitigations',
      'Safe upload handling with malware scanning',
      'Dependency scanning and update process',
      'Secrets management and secure configuration',
      'Security-focused code review and remediation',
      'A hardening checklist and documentation',
    ],
    technologies: ['Input validation (schema-based)', 'Parameterized queries', 'ClamAV malware scanning', 'Dependency scanning', 'Secrets managers', 'Security headers / CSP'],
    process: [
      { step: 'Review', detail: 'Assess the app against common, real-world attack classes.' },
      { step: 'Prioritize', detail: 'Rank findings by exploitability and impact.' },
      { step: 'Remediate', detail: 'Fix validation, uploads, dependencies, and secrets.' },
      { step: 'Harden', detail: 'Apply secure defaults, headers, and configuration.' },
      { step: 'Verify', detail: 'Re-test and document the hardened state.' },
    ],
    faqs: [
      { q: 'Do you do penetration testing?', a: 'Our focus is building and hardening secure software — validation, uploads, dependencies, access, and configuration. For formal third-party penetration testing we coordinate with specialist testers and remediate their findings.' },
      { q: 'How do you handle file uploads safely?', a: 'Uploads are validated, scanned for malware (e.g. via ClamAV) before they are trusted, and stored with least-privilege access — the same pattern we run in our own platforms.' },
      { q: 'How do you keep dependencies safe?', a: 'We scan dependencies for known vulnerabilities and keep them current as part of maintenance, so you are not exposed through outdated libraries.' },
    ],
    internalLinks: [
      { label: 'Secure Software Architecture', href: '/services/security/secure-architecture' },
      { label: 'Compliance-Readiness Engineering', href: '/services/security/compliance-readiness' },
      { label: 'Software Maintenance & Support', href: '/services/software-engineering/maintenance-support' },
      { label: 'Audit Logging', href: '/services/security/audit-logging' },
    ],
  },

  'security/compliance-readiness': {
    slug: 'security/compliance-readiness', category: 'Security', status: 'published', qc: qcAllTrue,
    primaryKeyword: 'compliance readiness engineering',
    title: 'Compliance-Readiness Engineering | SOC 2, HIPAA-Aligned | Innovatix Systems',
    metaDescription: 'Innovatix Systems engineers the technical controls that make audits and enterprise reviews pass — access control, audit logging, encryption, and evidence — without slowing you down.',
    h1: 'Compliance-Readiness Engineering',
    intro: [
      'Compliance frameworks like SOC 2 and HIPAA are, at the technical level, a checklist of controls: least-privilege access, audit trails, encryption, secure change management, and the evidence to prove them. We do not sell certifications — we build the engineering that makes passing them straightforward.',
      'We assess your systems against the controls that matter, close the gaps, and put the evidence-generating machinery in place, so an audit or a big customer’s security review becomes a confirmation rather than a scramble.',
    ],
    problems: [
      { heading: 'Enterprise deals stall on security review', body: 'A large customer’s security questionnaire asks for controls you have not built, and the deal stalls. Readiness is a revenue issue, not just a compliance one.' },
      { heading: 'Controls exist but there is no evidence', body: 'Auditors need proof, not promises. Without audit logs and documented controls, even a secure system fails the review.' },
      { heading: 'Compliance treated as a document exercise', body: 'Policies without technical enforcement do not protect anyone and do not survive scrutiny. The controls have to be real in the software.' },
    ],
    solution: [
      { heading: 'Map controls to your systems', body: 'We translate the relevant framework (SOC 2, HIPAA-aligned) into concrete technical controls and assess where your systems already meet them and where they do not.' },
      { heading: 'Engineer the missing controls', body: 'Least-privilege access, audit logging, encryption in transit and at rest, secure change management, and monitoring — built into the software, not bolted-on policy.' },
      { heading: 'Generate the evidence', body: 'The audit trail, access reports, and documentation that reviewers ask for, produced by the system so evidence is a query, not a fire drill.' },
    ],
    deliverables: [
      'A controls gap assessment against your target framework',
      'Least-privilege access and RBAC enforcement',
      'Audit logging and access/change evidence',
      'Encryption in transit and at rest, secrets management',
      'Secure change management (CI/CD, reviews, backups)',
      'Documentation and audit-evidence runbooks',
    ],
    technologies: ['RBAC', 'Audit logging', 'Encryption / secrets management', 'CI/CD with reviews', 'Backups / DR', 'Monitoring & alerting'],
    process: [
      { step: 'Scope', detail: 'Identify the target framework and applicable controls.' },
      { step: 'Assess', detail: 'Gap-check current systems against those controls.' },
      { step: 'Engineer', detail: 'Build the missing technical controls.' },
      { step: 'Evidence', detail: 'Wire up audit trails and reporting.' },
      { step: 'Document', detail: 'Produce runbooks for the audit/review.' },
    ],
    faqs: [
      { q: 'Do you provide the actual certification or audit?', a: 'No — certification is issued by an accredited auditor. We build and document the technical controls and evidence so the audit goes smoothly; we can coordinate with your chosen auditor.' },
      { q: 'Which frameworks do you support?', a: 'We focus on the common technical control sets — SOC 2 and HIPAA-aligned engineering — which overlap heavily with what enterprise security reviews demand.' },
      { q: 'We are early — is this premature?', a: 'The highest-value controls (access, audit logging, encryption, backups) are good engineering regardless, and building them early is far cheaper than retrofitting under deal pressure.' },
    ],
    internalLinks: [
      { label: 'Audit Logging', href: '/services/security/audit-logging' },
      { label: 'Role-Based Access Control', href: '/services/security/rbac' },
      { label: 'Secure Software Architecture', href: '/services/security/secure-architecture' },
      { label: 'Application Security', href: '/services/security/application-security' },
    ],
  },

  // ── Digital Transformation ────────────────────────────────────────────────
  'digital-transformation/legacy-modernization': {
    slug: 'digital-transformation/legacy-modernization', category: 'Digital Transformation', status: 'published', qc: qcAllTrue,
    primaryKeyword: 'legacy system modernization program',
    title: 'Legacy System Modernization Program | Digital Transformation | Innovatix Systems',
    metaDescription: 'Innovatix Systems runs legacy modernization as a program — assess the portfolio, sequence by business value and risk, and modernize system by system without stopping operations.',
    h1: 'Legacy System Modernization as a Program',
    intro: [
      'For many businesses, "the legacy system" is really a whole estate of aging, entangled applications — and modernizing them is less an engineering task than a program: what to tackle first, in what order, at what risk, for what return. Get the sequencing wrong and you spend a fortune modernizing the wrong things.',
      'We approach legacy modernization at the portfolio level: assess the estate, sequence the work by business value and risk, and execute system by system with the incremental, reversible engineering that keeps operations running throughout.',
    ],
    problems: [
      { heading: 'A tangled estate, not one system', body: 'Modernizing without understanding how the applications depend on each other creates surprises and stalls. The program has to start from the whole picture.' },
      { heading: 'Modernizing the wrong things first', body: 'Effort spent on low-value or low-risk systems while the real bottlenecks fester wastes budget and goodwill. Sequencing by value and risk is the hard part.' },
      { heading: 'Transformation fatigue', body: 'Big-bang programs that promise everything and deliver late lose executive support. Momentum comes from visible wins, in sequence.' },
    ],
    solution: [
      { heading: 'Assess the whole estate', body: 'We map the applications, their dependencies, data, and the business processes they support, and score each on value at stake and risk of change.' },
      { heading: 'Sequence for value and momentum', body: 'We plan the modernization order so early moves reduce the most risk or unlock the most value, delivering visible wins that keep the program funded.' },
      { heading: 'Execute incrementally and reversibly', body: 'Each system is modernized with careful data migration and reversible increments (see our engineering-level modernization service), so the business never stops.' },
    ],
    deliverables: [
      'A modernization assessment of the application estate',
      'A value- and risk-sequenced modernization roadmap',
      'A per-system incremental migration approach',
      'Data-migration strategy across the portfolio',
      'Governance, milestones, and executive reporting',
      'Execution of the modernization work, system by system',
    ],
    technologies: ['Application portfolio mapping', 'TypeScript / Node.js', 'PostgreSQL', 'API adapters', 'AWS', 'Data-migration tooling'],
    process: [
      { step: 'Assess', detail: 'Map the estate, dependencies, and business value at stake.' },
      { step: 'Sequence', detail: 'Prioritize by value and risk into a phased roadmap.' },
      { step: 'Pilot', detail: 'Modernize a first system to prove the approach.' },
      { step: 'Scale', detail: 'Work through the portfolio, milestone by milestone.' },
      { step: 'Govern', detail: 'Report progress and adjust the sequence as you learn.' },
    ],
    faqs: [
      { q: 'How is this different from your software-engineering legacy modernization?', a: 'That service is the hands-on engineering of replacing one system safely. This is the program around a whole estate — assessment, sequencing, governance — that decides what to modernize, in what order, and why. We often do both.' },
      { q: 'Where should we start?', a: 'Usually with the assessment. Sequencing is where modernization budgets are won or lost, and you cannot sequence what you have not mapped.' },
      { q: 'Will operations keep running?', a: 'Yes — each system is modernized incrementally and reversibly, so the business continues throughout the program.' },
    ],
    proof: { label: 'Amazon Sellers — replacing fragmented tools with one platform', href: '/case-studies/apparel-globe' },
    internalLinks: [
      { label: 'Legacy Software Modernization', href: '/services/software-engineering/legacy-modernization' },
      { label: 'Architecture Assessments', href: '/services/digital-transformation/architecture-assessments' },
      { label: 'Technology Roadmaps', href: '/services/digital-transformation/technology-roadmaps' },
      { label: 'Operational Systems Integration', href: '/services/digital-transformation/systems-integration' },
    ],
  },

  'digital-transformation/process-automation': {
    slug: 'digital-transformation/process-automation', category: 'Digital Transformation', status: 'published', qc: qcAllTrue,
    primaryKeyword: 'business process automation',
    title: 'Business Process Automation Services | Remove Manual Work | Innovatix Systems',
    metaDescription: 'Innovatix Systems automates the repetitive operational work draining your team — approvals, data entry, reconciliation, and handoffs — with custom workflows wired into your systems.',
    h1: 'Business Process Automation',
    intro: [
      'Every operations team has a set of tasks that eat hours and add no judgment: re-keying data between systems, chasing approvals, reconciling numbers, moving work from one person to the next. Business process automation replaces that toil with software that does it reliably, every time.',
      'We map the processes draining your team and automate them with custom workflows wired into the systems you already run — so people spend their time on decisions, not busywork, and nothing time-sensitive falls through the cracks.',
    ],
    problems: [
      { heading: 'Hours lost to manual re-keying', body: 'Copying data between systems is slow, error-prone, and endless. It is the clearest candidate for automation and the biggest quiet cost.' },
      { heading: 'Work stuck waiting on people', body: 'Approvals and handoffs sitting in inboxes stall the whole process. Automated routing and reminders keep work moving.' },
      { heading: 'Errors that surface too late', body: 'Manual reconciliation catches problems days later, after they have compounded. Automated checks catch them at the source.' },
    ],
    solution: [
      { heading: 'Map, then automate the real process', body: 'We document how the work actually flows — states, approvals, exceptions — and automate the repetitive steps while keeping humans in the loop where judgment is needed.' },
      { heading: 'Wired into your systems', body: 'Automation reads and writes to your ERP, CRM, marketplaces, and tools directly, so it moves real work rather than shuffling spreadsheets.' },
      { heading: 'Exceptions handled, not hidden', body: 'When something does not fit the happy path, the workflow flags it for a person with context — so automation speeds things up without silently doing the wrong thing.' },
    ],
    deliverables: [
      'A process map of the target workflow and its exceptions',
      'Automated workflows for the repetitive steps',
      'Integrations with the systems the process touches',
      'Approvals, routing, reminders, and notifications',
      'Exception handling with human-in-the-loop review',
      'Reporting on throughput, time saved, and exceptions',
    ],
    technologies: ['Workflow engines', 'Node.js / NestJS', 'Webhooks & queues', 'System APIs (ERP/CRM/marketplace)', 'Notifications', 'AI where it fits'],
    process: [
      { step: 'Map', detail: 'Document the current process, volumes, and exceptions.' },
      { step: 'Design', detail: 'Decide what to automate and where humans stay in the loop.' },
      { step: 'Build', detail: 'Implement workflows wired into your systems.' },
      { step: 'Pilot', detail: 'Run alongside the manual process, then cut over.' },
      { step: 'Measure', detail: 'Track time saved, errors avoided, and exceptions.' },
    ],
    faqs: [
      { q: 'Is this the same as AI automation?', a: 'They overlap. Process automation is about reliably executing defined workflows; where a step needs judgment — reading a document, classifying, deciding — we bring in our AI services. We use whichever fits the step.' },
      { q: 'Do we have to replace our current systems?', a: 'No — automation wires into the systems you already run via their APIs, so it augments your stack rather than forcing a replacement.' },
      { q: 'What happens with edge cases?', a: 'They are routed to a person with full context instead of being forced through automatically, so speed never comes at the cost of doing the wrong thing quietly.' },
    ],
    internalLinks: [
      { label: 'AI Automation', href: '/services/ai-services/ai-automation' },
      { label: 'Operational Systems Integration', href: '/services/digital-transformation/systems-integration' },
      { label: 'Custom Software Development', href: '/services/software-engineering/custom-software-development' },
      { label: 'Order Management Systems', href: '/services/enterprise-systems/order-management-systems' },
    ],
  },

  'digital-transformation/systems-integration': {
    slug: 'digital-transformation/systems-integration', category: 'Digital Transformation', status: 'published', qc: qcAllTrue,
    primaryKeyword: 'operational systems integration',
    title: 'Operational Systems Integration | Make Your Tools Work as One | Innovatix Systems',
    metaDescription: 'Innovatix Systems connects the operational systems your business runs on — ERP, marketplaces, carriers, payments, and finance — so data flows automatically instead of being re-keyed.',
    h1: 'Operational Systems Integration',
    intro: [
      'As a business grows it accumulates systems — an ERP, sales channels, a CRM, shipping carriers, payment processors, accounting — that were never designed to talk to each other. The gaps between them get filled by people copying data by hand, and that manual glue becomes the ceiling on how fast you can operate.',
      'We integrate the operational systems you already run so data flows between them automatically, keeping orders, inventory, finance, and fulfillment in sync without human re-keying.',
    ],
    problems: [
      { heading: 'Humans as the integration layer', body: 'When people move data between systems by hand, you get delay, error, and a cost that scales with volume. Integration removes the manual glue.' },
      { heading: 'Systems out of sync', body: 'Inventory says one thing, the marketplace another, finance a third. Without integration, there is no single truth and constant reconciliation.' },
      { heading: 'Brittle point-to-point spaghetti', body: 'Ad-hoc one-off connections between every pair of systems become impossible to maintain. Integration needs a deliberate design.' },
    ],
    solution: [
      { heading: 'Reliable, tested integrations', body: 'We connect your systems through their APIs with retries, idempotency, and monitoring, so data moves completely and failures are visible rather than silent.' },
      { heading: 'A coherent integration design', body: 'Rather than point-to-point spaghetti, we design how data should flow — canonical models and clear ownership — so the integration stays maintainable as you add systems.' },
      { heading: 'Kept in sync automatically', body: 'Orders, inventory, finance, and fulfillment stay consistent across channels without anyone re-entering data — the manual bottleneck disappears.' },
    ],
    deliverables: [
      'An integration map of your systems and data flows',
      'Tested integrations with retries, idempotency, and monitoring',
      'A canonical data model where it reduces complexity',
      'Error handling, alerting, and reconciliation',
      'Documentation and runbooks',
      'Handover and ongoing support options',
    ],
    technologies: ['REST & webhook APIs', 'Marketplace APIs (Amazon, Walmart)', 'Carrier APIs (USPS/UPS/FedEx)', 'Payment APIs (Stripe)', 'Node.js / NestJS', 'Queues & CDC'],
    process: [
      { step: 'Map', detail: 'Inventory systems, data, and where the manual glue is.' },
      { step: 'Design', detail: 'Plan reliable flows and a maintainable topology.' },
      { step: 'Build', detail: 'Implement tested, monitored integrations.' },
      { step: 'Reconcile', detail: 'Add checks so systems provably stay in sync.' },
      { step: 'Operate', detail: 'Document, monitor, and support.' },
    ],
    faqs: [
      { q: 'How is this different from your software-engineering systems integration?', a: 'They are two views of the same strength. The engineering service focuses on building a specific integration; this transformation service takes the operational view — untangling the whole estate so your business runs as one connected system.' },
      { q: 'Which systems can you connect?', a: 'ERPs, marketplaces (Amazon, Walmart), storefronts, shipping carriers (USPS, UPS, FedEx), payment processors (Stripe), accounting, and internal tools — through their APIs.' },
      { q: 'How do you keep integrations from breaking?', a: 'With idempotency, retries, monitoring, and reconciliation, so failures are caught and safely re-run rather than silently corrupting data.' },
    ],
    proof: { label: 'Amazon Sellers — marketplace, carrier & payment integrations', href: '/case-studies/apparel-globe' },
    internalLinks: [
      { label: 'Systems Integration', href: '/services/software-engineering/systems-integration' },
      { label: 'Business Process Automation', href: '/services/digital-transformation/process-automation' },
      { label: 'API Development', href: '/services/software-engineering/api-development' },
      { label: 'Order Management Systems', href: '/services/enterprise-systems/order-management-systems' },
    ],
  },

  'digital-transformation/digital-strategy': {
    slug: 'digital-transformation/digital-strategy', category: 'Digital Transformation', status: 'published', qc: qcAllTrue,
    primaryKeyword: 'digital transformation strategy',
    title: 'Digital Transformation Strategy | Pragmatic, Outcome-Led | Innovatix Systems',
    metaDescription: 'Innovatix Systems builds pragmatic digital strategy grounded in engineering reality — tied to business outcomes, sequenced by value, and something we can actually deliver.',
    h1: 'Digital Strategy That Ships',
    intro: [
      'Most "digital transformation strategy" fails not because the vision is wrong but because it is disconnected from what can actually be built and in what order. A strategy that ignores engineering reality is a slide deck; one grounded in it is a plan.',
      'We build digital strategy from the outcomes backward — the results the business needs, the systems and data required to get there, and a sequenced plan we can stand behind because we also build the software.',
    ],
    problems: [
      { heading: 'Strategy detached from delivery', body: 'A vision with no realistic path to build it stalls the moment execution starts. Strategy has to be informed by what is actually buildable.' },
      { heading: 'Technology for its own sake', body: 'Adopting tools because they are trendy, not because they serve an outcome, burns budget and trust. Strategy should start from results.' },
      { heading: 'No sequencing or measures', body: 'Without a value-based sequence and clear success metrics, transformation sprawls and no one can tell if it is working.' },
    ],
    solution: [
      { heading: 'Start from business outcomes', body: 'We define the outcomes that matter — cost, speed, capacity, revenue — and work back to the systems, data, and capabilities needed to reach them.' },
      { heading: 'Grounded in engineering reality', body: 'Because we build software, our strategy accounts for real effort, risk, and dependencies — so the plan is deliverable, not aspirational.' },
      { heading: 'Sequenced and measurable', body: 'We sequence initiatives by value and risk, define success metrics, and stage the work so early moves fund and de-risk the rest.' },
    ],
    deliverables: [
      'A current-state assessment of systems and capabilities',
      'Target outcomes and the capabilities required',
      'A sequenced, value-based transformation roadmap',
      'Success metrics for each initiative',
      'Build-vs-buy and technology recommendations',
      'An executive-ready strategy document',
    ],
    technologies: ['Capability mapping', 'Value/risk sequencing', 'Architecture assessment', 'Build-vs-buy analysis', 'Roadmapping', 'Metrics definition'],
    process: [
      { step: 'Understand', detail: 'Learn the business goals, constraints, and current systems.' },
      { step: 'Define outcomes', detail: 'Agree the results that matter and how to measure them.' },
      { step: 'Design', detail: 'Map the capabilities, systems, and data required.' },
      { step: 'Sequence', detail: 'Order initiatives by value and risk.' },
      { step: 'Plan', detail: 'Produce a deliverable roadmap with metrics.' },
    ],
    faqs: [
      { q: 'Do you only do strategy, or can you deliver it too?', a: 'Both — and that is the point. Our strategy is credible because we also build the software, so the plan reflects real effort and risk. You can engage us for strategy alone or strategy-through-delivery.' },
      { q: 'How long does a strategy engagement take?', a: 'Typically a few focused weeks — enough to assess the current state, define outcomes, and produce a sequenced roadmap — rather than a months-long study that goes stale.' },
      { q: 'Will you recommend building everything custom?', a: 'No. We recommend build-vs-buy honestly per capability; custom software where it creates real advantage, proven tools where it does not.' },
    ],
    internalLinks: [
      { label: 'Technology Roadmaps', href: '/services/digital-transformation/technology-roadmaps' },
      { label: 'Architecture Assessments', href: '/services/digital-transformation/architecture-assessments' },
      { label: 'Fractional CTO', href: '/services/team-services/fractional-cto' },
      { label: 'Our Delivery Process', href: '/company/process' },
    ],
  },

  'digital-transformation/technology-roadmaps': {
    slug: 'digital-transformation/technology-roadmaps', category: 'Digital Transformation', status: 'published', qc: qcAllTrue,
    primaryKeyword: 'technology roadmap consulting',
    title: 'Technology Roadmap Consulting | Sequence What to Build | Innovatix Systems',
    metaDescription: 'Innovatix Systems builds technology roadmaps that turn strategy into a sequenced, realistic plan — what to build, in what order, with the dependencies and risks made explicit.',
    h1: 'Technology Roadmaps',
    intro: [
      'A technology roadmap is where strategy becomes a plan: the specific systems and capabilities to build, in an order that respects dependencies, risk, and the value each unlocks. Without one, teams build in the wrong sequence and discover the dependency they missed halfway through.',
      'We build roadmaps grounded in engineering reality — realistic effort, explicit dependencies, and a sequence that delivers value early — so leadership can fund with confidence and teams can execute without surprises.',
    ],
    problems: [
      { heading: 'Building in the wrong order', body: 'Starting the flashy feature before the foundation it depends on leads to rework and stalls. Sequencing by dependency and value is the whole job.' },
      { heading: 'Hidden dependencies', body: 'The integration or data model everything relies on gets discovered late, blowing up timelines. A good roadmap surfaces dependencies up front.' },
      { heading: 'Roadmaps that are just wish-lists', body: 'A list of desired features with no effort, risk, or sequence is not a roadmap. It has to be actionable and honest about trade-offs.' },
    ],
    solution: [
      { heading: 'Realistic effort and risk', body: 'Because we build software, we size initiatives with real effort and risk rather than optimism, so the roadmap holds up under execution.' },
      { heading: 'Dependencies made explicit', body: 'We map what depends on what — foundations, data, integrations — so the sequence avoids the mid-project surprises that derail plans.' },
      { heading: 'Value-early sequencing', body: 'We order the work so early increments deliver visible value and reduce risk, keeping the effort funded and the team motivated.' },
    ],
    deliverables: [
      'An inventory of initiatives with effort and risk',
      'An explicit dependency map',
      'A sequenced, phased roadmap with milestones',
      'Value and risk rationale for the ordering',
      'Assumptions, trade-offs, and decision points',
      'An executive-ready roadmap artifact',
    ],
    technologies: ['Dependency mapping', 'Effort/risk estimation', 'Value sequencing', 'Milestone planning', 'Architecture review', 'Roadmapping'],
    process: [
      { step: 'Gather', detail: 'Collect the initiatives, goals, and constraints.' },
      { step: 'Size', detail: 'Estimate effort and risk realistically.' },
      { step: 'Map', detail: 'Make dependencies explicit.' },
      { step: 'Sequence', detail: 'Order for value early and reduced risk.' },
      { step: 'Present', detail: 'Deliver a fundable, executable roadmap.' },
    ],
    faqs: [
      { q: 'How is a roadmap different from a strategy?', a: 'Strategy sets the outcomes and direction; the roadmap is the sequenced, dependency-aware plan of what to build to get there. We often deliver them together.' },
      { q: 'How detailed is the roadmap?', a: 'Detailed enough to fund and start — initiatives, sequence, dependencies, effort/risk, and milestones — without pretending to predict every detail months out.' },
      { q: 'Can you help execute it?', a: 'Yes — we can build the roadmap and then deliver against it, or hand it to your team with the reasoning documented.' },
    ],
    internalLinks: [
      { label: 'Digital Strategy', href: '/services/digital-transformation/digital-strategy' },
      { label: 'Architecture Assessments', href: '/services/digital-transformation/architecture-assessments' },
      { label: 'Legacy System Modernization Program', href: '/services/digital-transformation/legacy-modernization' },
      { label: 'Fractional CTO', href: '/services/team-services/fractional-cto' },
    ],
  },

  'digital-transformation/architecture-assessments': {
    slug: 'digital-transformation/architecture-assessments', category: 'Digital Transformation', status: 'published', qc: qcAllTrue,
    primaryKeyword: 'software architecture assessment',
    title: 'Software Architecture Assessment | Find the Real Risks | Innovatix Systems',
    metaDescription: 'Innovatix Systems assesses your software architecture — scalability, security, and maintainability — and delivers a prioritized, honest picture of the real risks and fixes.',
    h1: 'Software Architecture Assessment',
    intro: [
      'Before you invest in scaling, modernizing, or acquiring a system, you need an honest answer to one question: is the architecture sound, and where are the real risks? An architecture assessment gives you that — a clear-eyed evaluation of scalability, security, and maintainability, and what it will take to fix what matters.',
      'We assess the architecture of your systems (or a system you are considering acquiring) and deliver a prioritized, plain-spoken picture: what is solid, what is risky, and the highest-value fixes — with no incentive to inflate the findings.',
    ],
    problems: [
      { heading: 'Unknown scaling limits', body: 'A system that works today may hit a wall at 2× volume for reasons buried in the architecture. Better to know before the wall than after.' },
      { heading: 'Hidden security and maintainability debt', body: 'Risk accumulates quietly — weak isolation, tangled dependencies, no tests. An assessment surfaces it before it becomes an incident.' },
      { heading: 'Big decisions made blind', body: 'Deciding to scale, rebuild, or acquire a system without an architecture view is an expensive gamble.' },
    ],
    solution: [
      { heading: 'Evaluate against what matters', body: 'We review the architecture for scalability, security, data integrity, and maintainability — the dimensions that actually determine whether a system can carry the business forward.' },
      { heading: 'Prioritized, honest findings', body: 'You get a clear picture ranked by risk and impact, distinguishing "fix now" from "fine for years" — with no incentive to manufacture work.' },
      { heading: 'A path forward', body: 'Every significant finding comes with a recommended remediation and a rough sense of effort, so the assessment leads to decisions, not just observations.' },
    ],
    deliverables: [
      'An architecture review across scalability, security, and maintainability',
      'A prioritized findings register (risk × impact)',
      'Remediation recommendations with rough effort',
      'A scaling and risk outlook',
      'A go/no-go or build/rebuild recommendation where relevant',
      'An executive summary plus technical detail',
    ],
    technologies: ['Architecture review', 'Scalability analysis', 'Security review', 'Data-integrity review', 'Dependency analysis', 'Technical due diligence'],
    process: [
      { step: 'Scope', detail: 'Agree the systems and questions to assess.' },
      { step: 'Review', detail: 'Examine architecture, code, data, and operations.' },
      { step: 'Analyze', detail: 'Rank findings by risk and business impact.' },
      { step: 'Recommend', detail: 'Propose prioritized remediations with effort.' },
      { step: 'Report', detail: 'Deliver executive summary plus technical detail.' },
    ],
    faqs: [
      { q: 'Can you do technical due diligence for an acquisition?', a: 'Yes — assessing a target system’s architecture, scalability, security, and maintainability is exactly this service, giving you an honest technical view before you buy.' },
      { q: 'How is this different from an architecture review (Team Services)?', a: 'This is a focused, outcome-oriented assessment — often for a decision or investment. The Team Services architecture review is a lighter, more ongoing check of a specific design as your team works. Different depth and cadence.' },
      { q: 'Will you just recommend a rewrite?', a: 'No. We are honest about what is fine and what is not; often the answer is targeted fixes, not a rebuild. We have no incentive to inflate the work.' },
    ],
    internalLinks: [
      { label: 'Architecture Reviews', href: '/services/team-services/architecture-reviews' },
      { label: 'Codebase Audits', href: '/services/team-services/codebase-audits' },
      { label: 'Technology Roadmaps', href: '/services/digital-transformation/technology-roadmaps' },
      { label: 'Secure Software Architecture', href: '/services/security/secure-architecture' },
    ],
  },

  // ── Team Services ─────────────────────────────────────────────────────────
  'team-services/dedicated-teams': {
    slug: 'team-services/dedicated-teams', category: 'Team Services', status: 'published', qc: qcAllTrue,
    primaryKeyword: 'dedicated development team',
    title: 'Dedicated Development Teams | A Team That Owns Delivery | Innovatix Systems',
    metaDescription: 'Innovatix Systems provides dedicated development teams that own delivery end to end — engineers, architecture, and process — working transparently through a connected client portal.',
    h1: 'Dedicated Development Teams',
    intro: [
      'Sometimes you do not need a fixed-scope project — you need a capable team that owns an area of your product and keeps delivering. A dedicated team gives you senior engineers who take responsibility for outcomes, not just tickets, and who bring architecture and process with them.',
      'We assemble dedicated teams matched to your work, integrated with your priorities, and accountable through the same transparent delivery — a connected client portal, verified reporting, and milestone approvals — we use on every engagement.',
    ],
    problems: [
      { heading: 'Hiring can’t keep pace', body: 'Building an engineering team from scratch is slow and risky exactly when you need velocity. A dedicated team gives you capacity now.' },
      { heading: 'Contractors who only take tickets', body: 'Hands that need everything specified for them add overhead. You need a team that owns outcomes and brings judgment.' },
      { heading: 'No visibility into the work', body: 'Outsourced work often disappears into a black box until the demo. Ownership without transparency is a risk.' },
    ],
    solution: [
      { heading: 'A team that owns outcomes', body: 'Senior engineers who take responsibility for an area — architecture, quality, and delivery — not just implementing pre-chewed tasks.' },
      { heading: 'Integrated with your priorities', body: 'The team works to your roadmap and communicates continuously, so it functions as part of your organization rather than a distant vendor.' },
      { heading: 'Transparent by default', body: 'The same connected portal, verified daily/weekly reporting, and milestone approvals we use everywhere — so you always see exactly where the work stands.' },
    ],
    deliverables: [
      'A dedicated team matched to your work and stack',
      'Ownership of architecture, quality, and delivery',
      'Continuous delivery to your roadmap and priorities',
      'A connected portal with verified progress reporting',
      'Milestone approvals and change-request handling',
      'Ability to scale the team up or down as needs change',
    ],
    technologies: ['TypeScript', 'React / Next.js', 'Node.js / NestJS', 'PostgreSQL', 'AWS', 'CI/CD'],
    process: [
      { step: 'Scope', detail: 'Understand the work, stack, and ways of working.' },
      { step: 'Assemble', detail: 'Match a team with the right skills and seniority.' },
      { step: 'Integrate', detail: 'Align to your roadmap, tools, and cadence.' },
      { step: 'Deliver', detail: 'Ship continuously with transparent reporting.' },
      { step: 'Adjust', detail: 'Scale the team as priorities evolve.' },
    ],
    faqs: [
      { q: 'How is a dedicated team different from staff augmentation?', a: 'Staff augmentation adds individuals into your team under your management. A dedicated team owns an area with its own architecture and process and delivers outcomes — more autonomy, more accountability.' },
      { q: 'How do we stay in control of the work?', a: 'Through the same transparent delivery we use everywhere: a connected portal, verified reporting, and milestone approvals, so priorities and progress are always visible.' },
      { q: 'Can we scale the team over time?', a: 'Yes — teams scale up or down as your priorities and budget change.' },
    ],
    internalLinks: [
      { label: 'Staff Augmentation', href: '/services/team-services/staff-augmentation' },
      { label: 'Fractional CTO', href: '/services/team-services/fractional-cto' },
      { label: 'Our Delivery Process', href: '/company/process' },
      { label: 'Custom Software Development', href: '/services/software-engineering/custom-software-development' },
    ],
  },

  'team-services/staff-augmentation': {
    slug: 'team-services/staff-augmentation', category: 'Team Services', status: 'published', qc: qcAllTrue,
    primaryKeyword: 'staff augmentation services',
    title: 'Staff Augmentation Services | Senior Engineers, Fast | Innovatix Systems',
    metaDescription: 'Innovatix Systems provides staff augmentation — senior engineers who slot into your team, work to your process, and add real capacity without long hiring cycles.',
    h1: 'Staff Augmentation',
    intro: [
      'When your team is solid but short-handed, staff augmentation is the fastest way to add capable engineers who work under your direction, in your process, on your priorities — without the months and risk of hiring.',
      'We place senior engineers who integrate into your team and pull their weight from the start: they know how to work in an existing codebase, communicate clearly, and raise the bar rather than needing to be carried.',
    ],
    problems: [
      { heading: 'Hiring is too slow for the need', body: 'Recruiting a strong engineer takes months. When you need capacity this quarter, augmentation fills the gap immediately.' },
      { heading: 'Junior or mismatched contractors', body: 'Cheap augmentation that cannot work independently costs more than it saves. You need engineers who add capacity, not supervision load.' },
      { heading: 'Ramp-up that never ends', body: 'Some contractors never really get productive in your codebase. Effective augmentation ramps fast and contributes.' },
    ],
    solution: [
      { heading: 'Senior engineers who integrate', body: 'We place experienced engineers who work in your codebase, tools, and process from the start, under your direction — extending your team rather than running a separate one.' },
      { heading: 'Fast, low-friction ramp-up', body: 'People used to entering established systems ramp quickly and communicate clearly, so you get contribution, not a training burden.' },
      { heading: 'A quality bar, not just hands', body: 'Our engineers bring good practices — tests, reviews, clear communication — so augmentation raises your standards rather than lowering them.' },
    ],
    deliverables: [
      'Senior engineer(s) matched to your stack and needs',
      'Integration into your team, tools, and process',
      'Contribution under your direction and priorities',
      'Clear communication and collaboration',
      'Flexible ramp-up and wind-down',
      'Continuity and knowledge sharing with your team',
    ],
    technologies: ['TypeScript', 'React / Next.js', 'Node.js / NestJS', 'PostgreSQL', 'Cloud (AWS)', 'Your existing stack'],
    process: [
      { step: 'Define', detail: 'Clarify the skills, seniority, and duration needed.' },
      { step: 'Match', detail: 'Place engineers who fit the stack and the team.' },
      { step: 'Onboard', detail: 'Ramp into your codebase, tools, and process.' },
      { step: 'Contribute', detail: 'Deliver under your direction and priorities.' },
      { step: 'Flex', detail: 'Scale up or down as the need changes.' },
    ],
    faqs: [
      { q: 'Do the engineers work under our management?', a: 'Yes — that is the model. Augmented engineers integrate into your team and work to your priorities and process, under your direction.' },
      { q: 'How quickly can someone start contributing?', a: 'Our engineers are used to joining established codebases and ramp quickly — the goal is contribution in days, not weeks of hand-holding.' },
      { q: 'Can we adjust the engagement size?', a: 'Yes — augmentation flexes up or down as your workload and budget change.' },
    ],
    internalLinks: [
      { label: 'Dedicated Development Teams', href: '/services/team-services/dedicated-teams' },
      { label: 'Technical Consulting', href: '/services/team-services/technical-consulting' },
      { label: 'Codebase Audits', href: '/services/team-services/codebase-audits' },
      { label: 'Our Delivery Process', href: '/company/process' },
    ],
  },

  'team-services/technical-consulting': {
    slug: 'team-services/technical-consulting', category: 'Team Services', status: 'published', qc: qcAllTrue,
    primaryKeyword: 'technical consulting services',
    title: 'Technical Consulting Services | Senior Engineering Guidance | Innovatix Systems',
    metaDescription: 'Innovatix Systems provides technical consulting — senior, hands-on guidance on architecture, technology choices, and hard engineering decisions, grounded in real delivery.',
    h1: 'Technical Consulting',
    intro: [
      'Sometimes you do not need more hands — you need the right decision. Technical consulting gives you senior, hands-on guidance on the choices that are expensive to get wrong: architecture, technology selection, scaling, and how to approach a hard problem.',
      'We advise from the perspective of people who build production systems, not just diagram them — so the guidance is practical, honest about trade-offs, and something you can actually act on.',
    ],
    problems: [
      { heading: 'High-stakes decisions with no in-house expert', body: 'Choosing an architecture, a platform, or a scaling approach without senior guidance is a costly gamble. A trusted advisor de-risks it.' },
      { heading: 'Advice detached from delivery', body: 'Consultants who have not shipped in years give advice that does not survive contact with real constraints. Guidance should come from builders.' },
      { heading: 'Analysis paralysis', body: 'Teams stall debating options without a way to decide. A clear, reasoned recommendation breaks the logjam.' },
    ],
    solution: [
      { heading: 'Guidance from people who build', body: 'Our consultants ship production software, so advice on architecture, technology, and scaling reflects real effort, risk, and trade-offs.' },
      { heading: 'Decisions, not just options', body: 'We do not just enumerate choices — we give a reasoned recommendation and the rationale, so your team can decide and move.' },
      { heading: 'Right-sized engagement', body: 'A focused review, a decision workshop, or ongoing advisory — matched to the decision at hand rather than a bloated retainer.' },
    ],
    deliverables: [
      'Senior guidance on the specific decision or problem',
      'Architecture and technology recommendations with rationale',
      'Trade-off analysis and risk assessment',
      'A clear, actionable recommendation',
      'Optional follow-up and advisory',
      'Written summary of decisions and reasoning',
    ],
    technologies: ['Architecture', 'Technology selection', 'Scalability', 'Cloud (AWS)', 'Data & integration', 'AI feasibility'],
    process: [
      { step: 'Frame', detail: 'Define the decision or problem and its constraints.' },
      { step: 'Review', detail: 'Examine the relevant systems, options, and context.' },
      { step: 'Analyze', detail: 'Weigh trade-offs, risks, and cost.' },
      { step: 'Recommend', detail: 'Give a reasoned, actionable recommendation.' },
      { step: 'Support', detail: 'Stay available as the decision is executed.' },
    ],
    faqs: [
      { q: 'What kinds of decisions do you advise on?', a: 'Architecture, build-vs-buy, technology and platform selection, scaling approaches, data and integration strategy, and AI feasibility — the choices that are costly to reverse.' },
      { q: 'How is this different from a Fractional CTO?', a: 'Consulting is engaged for specific decisions or problems. A Fractional CTO is an ongoing leadership role owning technology direction and the team over time.' },
      { q: 'Is the engagement long-term?', a: 'It can be a single focused review or an ongoing advisory relationship — sized to what you actually need.' },
    ],
    internalLinks: [
      { label: 'Fractional CTO', href: '/services/team-services/fractional-cto' },
      { label: 'Architecture Reviews', href: '/services/team-services/architecture-reviews' },
      { label: 'Digital Strategy', href: '/services/digital-transformation/digital-strategy' },
      { label: 'Architecture Assessments', href: '/services/digital-transformation/architecture-assessments' },
    ],
  },

  'team-services/fractional-cto': {
    slug: 'team-services/fractional-cto', category: 'Team Services', status: 'published', qc: qcAllTrue,
    primaryKeyword: 'fractional cto services',
    title: 'Fractional CTO Services | Technology Leadership, Part-Time | Innovatix Systems',
    metaDescription: 'Innovatix Systems provides fractional CTO leadership — technology strategy, architecture, hiring, and delivery oversight — for companies that need senior direction without a full-time hire.',
    h1: 'Fractional CTO',
    intro: [
      'Plenty of companies need senior technology leadership before they need — or can afford — a full-time CTO. A fractional CTO gives you that leadership part-time: someone who owns technology direction, keeps engineering aligned to the business, and makes the calls that shape the next few years.',
      'We step in as your fractional CTO to set technology strategy, guide architecture, strengthen the team and process, and provide the delivery oversight that keeps engineering pointed at business outcomes.',
    ],
    problems: [
      { heading: 'No senior technical owner', body: 'When no one owns technology direction, decisions drift, debt accumulates, and engineering loses alignment with the business.' },
      { heading: 'A full-time CTO is premature', body: 'Early-stage and lean companies often cannot justify a full-time executive hire but still need executive-level technical judgment.' },
      { heading: 'Engineering disconnected from the business', body: 'Without leadership translating between business goals and technical work, teams build the wrong things well.' },
    ],
    solution: [
      { heading: 'Own the technology direction', body: 'We set and maintain technology strategy, architecture direction, and standards, so engineering has a clear north star aligned to the business.' },
      { heading: 'Strengthen team and delivery', body: 'Hiring guidance, process, and delivery oversight — raising the bar on how the team ships, not just what it ships.' },
      { heading: 'A translator for the business', body: 'We connect business goals to technical decisions and communicate risk and trade-offs to leadership in plain terms.' },
    ],
    deliverables: [
      'Technology strategy and architecture direction',
      'Delivery oversight and engineering standards',
      'Hiring and team-development guidance',
      'Vendor and build-vs-buy decisions',
      'Risk, security, and roadmap ownership',
      'Regular leadership reporting to the business',
    ],
    technologies: ['Technology strategy', 'Architecture leadership', 'Delivery oversight', 'Hiring / team development', 'Security & risk', 'Roadmapping'],
    process: [
      { step: 'Assess', detail: 'Understand the business, team, systems, and goals.' },
      { step: 'Set direction', detail: 'Establish strategy, architecture, and standards.' },
      { step: 'Lead', detail: 'Guide delivery, hiring, and key decisions.' },
      { step: 'Report', detail: 'Keep leadership informed of progress and risk.' },
      { step: 'Evolve', detail: 'Adjust the engagement as the company grows.' },
    ],
    faqs: [
      { q: 'How much time does a fractional CTO commit?', a: 'It is scaled to your needs — from a few days a month of strategic oversight to a more involved role during a critical period. We right-size it with you.' },
      { q: 'Can you also lead delivery, not just strategy?', a: 'Yes — because we build software, a fractional CTO engagement can include real delivery oversight and even a delivery team, not just advice.' },
      { q: 'What happens as we grow into a full-time CTO?', a: 'We help define the role, support hiring, and hand over cleanly — the goal is to strengthen your organization, not create dependence.' },
    ],
    internalLinks: [
      { label: 'Technical Consulting', href: '/services/team-services/technical-consulting' },
      { label: 'Dedicated Development Teams', href: '/services/team-services/dedicated-teams' },
      { label: 'Digital Strategy', href: '/services/digital-transformation/digital-strategy' },
      { label: 'Technology Roadmaps', href: '/services/digital-transformation/technology-roadmaps' },
    ],
  },

  'team-services/architecture-reviews': {
    slug: 'team-services/architecture-reviews', category: 'Team Services', status: 'published', qc: qcAllTrue,
    primaryKeyword: 'architecture review services',
    title: 'Architecture Review Services | A Second Set of Senior Eyes | Innovatix Systems',
    metaDescription: 'Innovatix Systems provides architecture reviews — a senior second opinion on your design before you build — catching scalability, security, and maintainability issues early.',
    h1: 'Architecture Reviews',
    intro: [
      'The cheapest time to fix an architecture problem is before you build it. An architecture review is a senior second set of eyes on your design — the data model, the boundaries, the integrations, the security — that catches the expensive mistakes while they are still cheap to change.',
      'We review the design your team is about to build (or just built) and give direct, practical feedback: what is solid, what will bite you at scale, and the specific changes worth making now.',
    ],
    problems: [
      { heading: 'Design flaws found after building', body: 'A data model or boundary decision that does not hold up is far more expensive to fix once code depends on it. Reviews catch it earlier.' },
      { heading: 'No senior reviewer in-house', body: 'Small teams often lack a senior architect to pressure-test a design. An external review provides that judgment on demand.' },
      { heading: 'Blind spots in your own design', body: 'Everyone is blind to some flaws in their own work. A fresh, experienced perspective surfaces what the team cannot see.' },
    ],
    solution: [
      { heading: 'Senior, focused review', body: 'An experienced architect examines your design across scalability, security, data integrity, and maintainability, focused on the decisions that matter most.' },
      { heading: 'Direct, practical feedback', body: 'You get specific, actionable feedback — keep this, change that, watch out for this at scale — not vague platitudes.' },
      { heading: 'Fast and lightweight', body: 'Reviews are quick to run and can be repeated as the design evolves, so they fit into how your team actually works.' },
    ],
    deliverables: [
      'A senior review of the proposed or current architecture',
      'Specific findings across scalability, security, and maintainability',
      'Prioritized, actionable recommendations',
      'Risks to watch as the system grows',
      'A concise written summary',
      'Optional follow-up as the design evolves',
    ],
    technologies: ['Architecture review', 'Data modeling', 'Scalability', 'Security review', 'Integration design', 'Cloud (AWS)'],
    process: [
      { step: 'Share', detail: 'You provide the design docs, diagrams, or code.' },
      { step: 'Review', detail: 'A senior architect examines the key decisions.' },
      { step: 'Discuss', detail: 'We walk through findings with your team.' },
      { step: 'Summarize', detail: 'Deliver prioritized, actionable recommendations.' },
      { step: 'Revisit', detail: 'Re-review as the design changes, if useful.' },
    ],
    faqs: [
      { q: 'How is this different from an architecture assessment?', a: 'A review is a lighter, faster second opinion on a specific design, often as your team works. The Digital Transformation assessment is a deeper, decision-grade evaluation of a whole system — often tied to an investment or acquisition.' },
      { q: 'Can you review a design before we build it?', a: 'Yes — that is the highest-value time. Reviewing the design up front catches the expensive mistakes while they are still cheap to fix.' },
      { q: 'Do you review code too, or just diagrams?', a: 'Both — for a deeper look at an existing system, see our Codebase Audits service, which examines the implementation, not just the design.' },
    ],
    internalLinks: [
      { label: 'Codebase Audits', href: '/services/team-services/codebase-audits' },
      { label: 'Architecture Assessments', href: '/services/digital-transformation/architecture-assessments' },
      { label: 'Technical Consulting', href: '/services/team-services/technical-consulting' },
      { label: 'Secure Software Architecture', href: '/services/security/secure-architecture' },
    ],
  },

  'team-services/codebase-audits': {
    slug: 'team-services/codebase-audits', category: 'Team Services', status: 'published', qc: qcAllTrue,
    primaryKeyword: 'codebase audit services',
    title: 'Codebase Audit Services | Know What You’re Standing On | Innovatix Systems',
    metaDescription: 'Innovatix Systems audits codebases for quality, security, and risk — an honest, prioritized picture of technical debt and what to fix, whether you own the code or are acquiring it.',
    h1: 'Codebase Audits',
    intro: [
      'A codebase carries risk you cannot see from the outside: shortcuts, security gaps, untested paths, and dependencies quietly rotting. A codebase audit surfaces that reality — an honest, prioritized picture of quality, security, and technical debt — so you can make decisions with your eyes open.',
      'We audit the code (yours, an inherited system, or an acquisition target) and deliver a clear register of what is solid, what is risky, and the highest-value fixes — with the technical detail to act and the summary to decide.',
    ],
    problems: [
      { heading: 'Invisible technical debt', body: 'Debt does not show up in a demo, but it slows every future change and hides risk. An audit makes it visible and rankable.' },
      { heading: 'Security gaps you have not found', body: 'Injection risks, weak access control, and unsafe handling lurk in code until someone exploits them. An audit finds them first.' },
      { heading: 'Buying or inheriting the unknown', body: 'Taking over a codebase — via acquisition or a departing team — without an audit means inheriting risk you cannot price.' },
    ],
    solution: [
      { heading: 'Examine what actually matters', body: 'We review code quality, architecture, security, test coverage, and dependency health — the factors that determine how safe and cheap the system is to evolve.' },
      { heading: 'Prioritized, honest findings', body: 'A register ranked by risk and impact, distinguishing must-fix from acceptable, with no incentive to exaggerate the debt.' },
      { heading: 'A remediation path', body: 'Each significant finding comes with a recommendation and rough effort, so the audit turns into a plan rather than a pile of worries.' },
    ],
    deliverables: [
      'A review of code quality, architecture, and structure',
      'A security review of the implementation',
      'Test-coverage and dependency-health assessment',
      'A prioritized findings register (risk × impact)',
      'Remediation recommendations with rough effort',
      'An executive summary plus technical detail',
    ],
    technologies: ['Static analysis', 'Security code review', 'Dependency scanning', 'Test-coverage analysis', 'Architecture review', 'Technical due diligence'],
    process: [
      { step: 'Scope', detail: 'Agree the codebase, access, and questions.' },
      { step: 'Analyze', detail: 'Review quality, security, tests, and dependencies.' },
      { step: 'Prioritize', detail: 'Rank findings by risk and business impact.' },
      { step: 'Recommend', detail: 'Propose fixes with rough effort estimates.' },
      { step: 'Report', detail: 'Deliver summary plus technical detail.' },
    ],
    faqs: [
      { q: 'Do you audit code for acquisitions (due diligence)?', a: 'Yes — assessing a target codebase’s quality, security, and debt is exactly this service, giving you an honest technical view before you commit.' },
      { q: 'What do you actually look at?', a: 'Code quality and structure, architecture, security, test coverage, and dependency health — the factors that determine how safe and affordable the system is to maintain and extend.' },
      { q: 'Will you fix what you find?', a: 'We can. The audit stands alone as an honest assessment, and we can remediate the findings or hand the plan to your team.' },
    ],
    internalLinks: [
      { label: 'Architecture Reviews', href: '/services/team-services/architecture-reviews' },
      { label: 'Application Security', href: '/services/security/application-security' },
      { label: 'Software Maintenance & Support', href: '/services/software-engineering/maintenance-support' },
      { label: 'Architecture Assessments', href: '/services/digital-transformation/architecture-assessments' },
    ],
  },

  // ── AI Services (remaining) ───────────────────────────────────────────────
  'ai-services/ai-strategy-consulting': {
    slug: 'ai-services/ai-strategy-consulting', category: 'AI Services', status: 'published', qc: qcAllTrue,
    primaryKeyword: 'ai strategy and consulting',
    title: 'AI Strategy & Consulting | Where AI Actually Pays Off | Innovatix Systems',
    metaDescription: 'Innovatix Systems provides honest AI strategy and consulting — finding where AI genuinely creates value in your operations, and where it does not, grounded in what we can build.',
    h1: 'AI Strategy & Consulting',
    intro: [
      'Most AI initiatives fail not because the technology cannot work, but because they were pointed at the wrong problem. AI strategy done well is mostly subtraction: separating the places AI genuinely earns its keep from the hype, and sequencing the few that do.',
      'We give you an honest AI strategy grounded in engineering reality — where AI can automate real operational work, what data and integration it needs, and a realistic plan — from people who then build it, not just advise on it.',
    ],
    problems: [
      { heading: 'AI as a solution looking for a problem', body: 'Adopting AI because everyone else is, rather than for a specific outcome, wastes budget and credibility. Strategy has to start from the problem.' },
      { heading: 'Ignoring the data and integration reality', body: 'AI is only as good as the data feeding it and the workflow it plugs into. Strategies that skip this fail at implementation.' },
      { heading: 'Over-trusting model output', body: 'Deploying AI without grounding, confidence, or a human fallback creates confident, wrong answers — worse than no automation.' },
    ],
    solution: [
      { heading: 'Find the real opportunities', body: 'We assess your operations for tasks where AI meaningfully removes work — document handling, classification, drafting, routing — and rank them by value and feasibility.' },
      { heading: 'Account for data and workflow', body: 'For each opportunity we check the data and integration it needs and how it lands in the workflow, so the strategy survives contact with reality.' },
      { heading: 'Design for honesty and safety', body: 'We build in grounding ("no source, no claim"), confidence signals, and human review, so AI helps without silently doing harm.' },
    ],
    deliverables: [
      'An AI opportunity assessment across your operations',
      'Prioritized use cases ranked by value and feasibility',
      'Data and integration requirements per use case',
      'A guardrails approach (grounding, confidence, review)',
      'A realistic, sequenced AI roadmap',
      'A build-vs-buy recommendation per use case',
    ],
    technologies: ['LLMs', 'RAG', 'Document intelligence', 'Feasibility analysis', 'Data assessment', 'AI guardrails'],
    process: [
      { step: 'Assess', detail: 'Map operations and where AI could genuinely help.' },
      { step: 'Prioritize', detail: 'Rank use cases by value and feasibility.' },
      { step: 'Check reality', detail: 'Validate data, integration, and workflow fit.' },
      { step: 'Plan', detail: 'Sequence a realistic roadmap with guardrails.' },
      { step: 'Recommend', detail: 'Advise build-vs-buy per use case.' },
    ],
    faqs: [
      { q: 'Will you tell us if AI is not the answer?', a: 'Yes. Plenty of problems are better solved with plain automation or better process. We have no incentive to force AI where it does not fit, and we will say so.' },
      { q: 'Can you also build what you recommend?', a: 'Yes — that is what makes the strategy credible. We assess, plan, and then build with our AI Automation, RAG, and Document Intelligence services.' },
      { q: 'How do you keep AI from producing confident nonsense?', a: 'We ground AI in your data, attach confidence signals, and keep a human in the loop for anything consequential — our "no source, no claim" rule.' },
    ],
    internalLinks: [
      { label: 'AI Automation', href: '/services/ai-services/ai-automation' },
      { label: 'Generative AI Applications', href: '/services/ai-services/generative-ai' },
      { label: 'Retrieval-Augmented Generation', href: '/services/ai-services/rag' },
      { label: 'Digital Strategy', href: '/services/digital-transformation/digital-strategy' },
    ],
  },

  'ai-services/generative-ai': {
    slug: 'ai-services/generative-ai', category: 'AI Services', status: 'published', qc: qcAllTrue,
    primaryKeyword: 'generative ai application development',
    title: 'Generative AI Application Development | Grounded & Useful | Innovatix Systems',
    metaDescription: 'Innovatix Systems builds generative AI applications that do real work — drafting, summarizing, and generating from your data — grounded, safe, and wired into your workflows.',
    h1: 'Generative AI Application Development',
    intro: [
      'Generative AI can draft, summarize, extract, and generate — but a demo that works once is not an application. A production generative-AI feature has to be grounded in your data, safe against bad output, and integrated where people actually work.',
      'We build generative-AI applications that hold up in production: grounded in your content, guarded against hallucination, and wired into the workflow so they save real time instead of creating a new thing to check.',
    ],
    problems: [
      { heading: 'Impressive demos, unusable products', body: 'A generative feature that works in a demo but hallucinates or misbehaves in production erodes trust fast. Real applications need grounding and guardrails.' },
      { heading: 'Ungrounded output', body: 'A model answering from its training data instead of your facts produces plausible, wrong content. It has to be grounded in your real information.' },
      { heading: 'Bolted on, not integrated', body: 'A generative feature off to the side that no one uses adds nothing. Value comes from being in the workflow.' },
    ],
    solution: [
      { heading: 'Grounded in your data', body: 'We ground generation in your documents and systems (often via retrieval) so output is based on your facts, with sources — our "no source, no claim" rule.' },
      { heading: 'Guarded and reviewable', body: 'Validation, confidence signals, and human review where it matters, so generated content is checked before it is trusted or sent.' },
      { heading: 'Embedded in the workflow', body: 'The generative capability lives inside the tools people already use — drafting a reply, summarizing a document, populating a field — so it saves time in context.' },
    ],
    deliverables: [
      'A production generative-AI feature grounded in your data',
      'Retrieval/grounding so output cites real sources',
      'Guardrails: validation, confidence, and human review',
      'Integration into your existing workflow and tools',
      'Prompt and evaluation setup for quality',
      'Monitoring and iteration support',
    ],
    technologies: ['LLMs', 'RAG', 'Vector search', 'Prompt engineering', 'Node.js / TypeScript', 'Evaluation harnesses'],
    process: [
      { step: 'Frame', detail: 'Pick a task where generation clearly saves time.' },
      { step: 'Ground', detail: 'Connect the model to your data via retrieval.' },
      { step: 'Guard', detail: 'Add validation, confidence, and review.' },
      { step: 'Integrate', detail: 'Embed the feature in the real workflow.' },
      { step: 'Evaluate', detail: 'Measure quality and iterate.' },
    ],
    faqs: [
      { q: 'How do you stop generative AI from making things up?', a: 'We ground it in your actual data using retrieval so answers cite real sources, add validation and confidence signals, and keep human review for anything consequential.' },
      { q: 'Which models do you use?', a: 'We are model-flexible and choose based on the task, cost, and privacy needs, and design so you are not locked to a single provider.' },
      { q: 'Can it use our private documents safely?', a: 'Yes — retrieval-augmented generation lets the model use your private content at answer time with access controls, without exposing it in training.' },
    ],
    internalLinks: [
      { label: 'Retrieval-Augmented Generation', href: '/services/ai-services/rag' },
      { label: 'AI Chatbots & Assistants', href: '/services/ai-services/chatbots-assistants' },
      { label: 'Document Intelligence', href: '/services/ai-services/document-intelligence' },
      { label: 'AI Strategy & Consulting', href: '/services/ai-services/ai-strategy-consulting' },
    ],
  },

  'ai-services/rag': {
    slug: 'ai-services/rag', category: 'AI Services', status: 'published', qc: qcAllTrue,
    primaryKeyword: 'retrieval augmented generation (rag)',
    title: 'Retrieval-Augmented Generation (RAG) Development | Innovatix Systems',
    metaDescription: 'Innovatix Systems builds retrieval-augmented generation (RAG) systems that let AI answer from your own documents and data — accurately, with sources, and access-controlled.',
    h1: 'Retrieval-Augmented Generation (RAG)',
    intro: [
      'Retrieval-augmented generation is how you make AI answer from your knowledge instead of guessing from its training. It retrieves the relevant pieces of your documents and data at question time and grounds the model’s answer in them — with citations — so responses are accurate and checkable.',
      'We build production RAG systems over your content — policies, manuals, tickets, product data — with the retrieval quality, access control, and evaluation that separate a reliable assistant from a plausible liar.',
    ],
    problems: [
      { heading: 'AI that does not know your business', body: 'A general model has never seen your policies, products, or history, so it cannot answer questions about them without guessing. RAG gives it your knowledge.' },
      { heading: 'Answers you cannot trust or verify', body: 'Without grounding and citations, you cannot tell if an answer is right. RAG returns sources so answers are checkable.' },
      { heading: 'Poor retrieval sinks the whole thing', body: 'If the system retrieves the wrong context, the answer is wrong no matter how good the model. Retrieval quality is the hard part.' },
    ],
    solution: [
      { heading: 'Quality retrieval over your content', body: 'We ingest and chunk your documents and data, build search that returns genuinely relevant context, and tune it — because retrieval quality, not the model, usually decides the outcome.' },
      { heading: 'Grounded, cited answers', body: 'The model answers only from retrieved context and returns sources, so users can verify — and the system can say "I don’t know" instead of inventing.' },
      { heading: 'Access-controlled and evaluated', body: 'Retrieval respects who is allowed to see what, and we set up evaluation so quality is measured and maintained, not assumed.' },
    ],
    deliverables: [
      'Ingestion and chunking of your documents/data',
      'Tuned retrieval (search) returning relevant context',
      'Grounded generation with citations and "I don’t know"',
      'Access control on retrieved content',
      'An evaluation harness for answer quality',
      'Integration into your app or workflow',
    ],
    technologies: ['LLMs', 'Vector databases', 'Embeddings', 'Hybrid search', 'Access control', 'Evaluation harnesses'],
    process: [
      { step: 'Ingest', detail: 'Chunk and index your documents and data.' },
      { step: 'Retrieve', detail: 'Build and tune relevant-context retrieval.' },
      { step: 'Ground', detail: 'Generate answers only from retrieved sources.' },
      { step: 'Secure', detail: 'Enforce access control on content.' },
      { step: 'Evaluate', detail: 'Measure quality and iterate.' },
    ],
    faqs: [
      { q: 'Why RAG instead of fine-tuning a model?', a: 'RAG keeps your knowledge current and access-controlled, cites sources, and avoids baking data into a model. It is usually the right first choice; fine-tuning has a place for style or narrow tasks, not for knowledge you update.' },
      { q: 'How do you keep it from answering when it should not?', a: 'The system answers only from retrieved context and is designed to say "I don’t know" when nothing relevant is found, rather than inventing.' },
      { q: 'Can it respect who can see which documents?', a: 'Yes — retrieval enforces access control so users only get answers grounded in content they are allowed to see.' },
    ],
    proof: { label: 'Amazon Sellers — AI/RAG-assisted operations', href: '/case-studies/apparel-globe' },
    internalLinks: [
      { label: 'Generative AI Applications', href: '/services/ai-services/generative-ai' },
      { label: 'AI Chatbots & Assistants', href: '/services/ai-services/chatbots-assistants' },
      { label: 'Document Intelligence', href: '/services/ai-services/document-intelligence' },
      { label: 'Data Engineering', href: '/services/data-analytics/data-engineering' },
    ],
  },

  'ai-services/chatbots-assistants': {
    slug: 'ai-services/chatbots-assistants', category: 'AI Services', status: 'published', qc: qcAllTrue,
    primaryKeyword: 'ai chatbot and assistant development',
    title: 'AI Chatbot & Assistant Development | Grounded, Helpful, Safe | Innovatix Systems',
    metaDescription: 'Innovatix Systems builds AI chatbots and assistants grounded in your knowledge — answering accurately, escalating to humans cleanly, and integrated with your systems.',
    h1: 'AI Chatbots & Assistants',
    intro: [
      'A useful AI assistant answers from your actual knowledge, knows when to hand off to a human, and can take real action in your systems — not a scripted bot that frustrates people into asking for an agent.',
      'We build chatbots and assistants grounded in your documentation and data, with clean human handoff and integration into your tools, so they resolve real questions and know their limits.',
    ],
    problems: [
      { heading: 'Bots that cannot actually help', body: 'Scripted or ungrounded bots give wrong or generic answers and annoy users into abandoning them. An assistant has to know your real information.' },
      { heading: 'No graceful handoff', body: 'When the bot cannot help and there is no clean path to a human, the user is stuck. Escalation must be first-class.' },
      { heading: 'All talk, no action', body: 'An assistant that can only chat but not check an order or update a record leaves the real work undone.' },
    ],
    solution: [
      { heading: 'Grounded in your knowledge', body: 'The assistant answers from your documentation and data via retrieval, with sources, so responses are accurate and it can say when it does not know.' },
      { heading: 'Clean human handoff', body: 'When the assistant reaches its limit — or the user asks — it hands off to a real person with full context, so no one gets stuck in a loop.' },
      { heading: 'Able to act, safely', body: 'Integrated with your systems, the assistant can look up an order, check status, or take defined actions — with guardrails and confirmation where it matters.' },
    ],
    deliverables: [
      'A chatbot/assistant grounded in your knowledge (RAG)',
      'Human-handoff flow with full context transfer',
      'Integration to look up and act in your systems',
      'Guardrails, confidence, and safe fallbacks',
      'Channel integration (web, portal, or messaging)',
      'Analytics on resolution and escalation',
    ],
    technologies: ['LLMs', 'RAG', 'Vector search', 'Tool/function calling', 'WebSockets', 'System APIs'],
    process: [
      { step: 'Scope', detail: 'Define the questions and actions the assistant handles.' },
      { step: 'Ground', detail: 'Connect it to your knowledge via retrieval.' },
      { step: 'Integrate', detail: 'Wire in lookups, actions, and human handoff.' },
      { step: 'Guard', detail: 'Add confidence, confirmation, and fallbacks.' },
      { step: 'Measure', detail: 'Track resolution vs. escalation and improve.' },
    ],
    faqs: [
      { q: 'Will it hallucinate answers?', a: 'We ground it in your real content via retrieval and design it to escalate or say "I’m not sure" rather than invent — accuracy and knowing its limits over confident guessing.' },
      { q: 'Can it hand off to a human?', a: 'Yes — clean escalation with full context is a core part of the design, including when the user simply asks to talk to a person.' },
      { q: 'Can it do more than answer questions?', a: 'Yes — integrated with your systems it can look up orders, check status, and take defined actions, with confirmation and guardrails for anything consequential.' },
    ],
    internalLinks: [
      { label: 'Retrieval-Augmented Generation', href: '/services/ai-services/rag' },
      { label: 'AI Agents', href: '/services/ai-services/ai-agents' },
      { label: 'Generative AI Applications', href: '/services/ai-services/generative-ai' },
      { label: 'Customer Portal Development', href: '/services/enterprise-systems/customer-portals' },
    ],
  },

  'ai-services/workflow-automation': {
    slug: 'ai-services/workflow-automation', category: 'AI Services', status: 'published', qc: qcAllTrue,
    primaryKeyword: 'intelligent workflow automation',
    title: 'Intelligent Workflow Automation | AI-Assisted Operations | Innovatix Systems',
    metaDescription: 'Innovatix Systems builds intelligent workflow automation — AI handling the judgment steps (classify, extract, decide) inside your operational workflows, with humans on exceptions.',
    h1: 'Intelligent Workflow Automation',
    intro: [
      'Plenty of operational work is automatable except for one step that needs judgment — reading a document, classifying a request, deciding a route. Intelligent workflow automation puts AI on exactly those steps, so a process that used to require a person end to end can run mostly on its own.',
      'We combine reliable process automation with AI on the judgment steps, keeping humans on the exceptions — so throughput goes up without handing decisions to a black box.',
    ],
    problems: [
      { heading: 'One human step blocks full automation', body: 'A workflow that is 90% automatable still needs a person because of one judgment step. AI on that step unlocks the rest.' },
      { heading: 'Rules-only automation is too rigid', body: 'Pure if-then rules cannot handle messy, varied inputs like documents and free text. AI handles the variability rules cannot.' },
      { heading: 'Fear of AI deciding unsupervised', body: 'Handing decisions entirely to AI without oversight is risky. The right design keeps humans on exceptions and low-confidence cases.' },
    ],
    solution: [
      { heading: 'AI on the judgment steps', body: 'We use AI for the steps that need understanding — classify, extract, summarize, route — inside an otherwise deterministic, reliable workflow.' },
      { heading: 'Humans on the exceptions', body: 'High-confidence cases flow through automatically; anything uncertain or unusual is routed to a person with context, so speed never overrides good judgment.' },
      { heading: 'Wired into your systems', body: 'The workflow reads and writes to your real systems, so it moves actual work — not a demo alongside the real process.' },
    ],
    deliverables: [
      'An automated workflow with AI on the judgment steps',
      'Confidence thresholds and human-in-the-loop exceptions',
      'Document/text understanding where needed',
      'Integration with the systems the workflow touches',
      'Monitoring, audit trail, and quality measurement',
      'Iteration as accuracy improves',
    ],
    technologies: ['LLMs', 'Document intelligence', 'Workflow engines', 'Confidence thresholds', 'System APIs', 'Node.js / NestJS'],
    process: [
      { step: 'Map', detail: 'Find the workflow and its judgment bottleneck.' },
      { step: 'Design', detail: 'Decide where AI acts and where humans review.' },
      { step: 'Build', detail: 'Implement AI steps inside a reliable workflow.' },
      { step: 'Calibrate', detail: 'Set confidence thresholds for auto vs. review.' },
      { step: 'Operate', detail: 'Monitor accuracy and expand automation safely.' },
    ],
    faqs: [
      { q: 'How is this different from AI Automation?', a: 'It is closely related — this service emphasizes AI handling the judgment steps inside multi-step operational workflows, with explicit human-in-the-loop exception handling. We often deliver them together.' },
      { q: 'What if the AI gets a case wrong?', a: 'Confidence thresholds route uncertain cases to a human, and everything is audit-logged — so low-confidence work is reviewed rather than pushed through automatically.' },
      { q: 'Do we keep control?', a: 'Yes — you set where AI acts autonomously and where humans review, and can tighten or loosen it as accuracy proves out.' },
    ],
    internalLinks: [
      { label: 'AI Automation', href: '/services/ai-services/ai-automation' },
      { label: 'Document Intelligence', href: '/services/ai-services/document-intelligence' },
      { label: 'AI Agents', href: '/services/ai-services/ai-agents' },
      { label: 'Business Process Automation', href: '/services/digital-transformation/process-automation' },
    ],
  },

  'ai-services/ai-integration': {
    slug: 'ai-services/ai-integration', category: 'AI Services', status: 'published', qc: qcAllTrue,
    primaryKeyword: 'ai integration services',
    title: 'AI Integration Services | Add AI to Your Existing Software | Innovatix Systems',
    metaDescription: 'Innovatix Systems integrates AI into the software you already run — adding grounded, guarded AI capabilities to your app, portal, or operations without a rebuild.',
    h1: 'AI Integration',
    intro: [
      'You do not always need a new AI product — often you need AI added into the software you already run: a summarize button in your app, extraction in your intake flow, an assistant in your portal. AI integration brings those capabilities into your existing systems, safely.',
      'We integrate AI into your current applications and workflows — grounded in your data, guarded against bad output, and wired to your systems — so you get the value without a rebuild or a bolted-on tool no one uses.',
    ],
    problems: [
      { heading: 'AI stuck outside your systems', body: 'A standalone AI tool disconnected from your app means copy-paste and context-switching. The value is in AI where the work already happens.' },
      { heading: 'Integrations that ignore safety', body: 'Wiring a raw model into your app without grounding or guardrails invites wrong output and data exposure. Integration must be done responsibly.' },
      { heading: 'Vendor lock-in', body: 'Hard-wiring to one AI provider makes you fragile to price and policy changes. Integration should keep you flexible.' },
    ],
    solution: [
      { heading: 'AI where the work happens', body: 'We add AI capabilities into your existing app, portal, or workflow — summarize, extract, draft, classify, assist — so it is used in context, not off to the side.' },
      { heading: 'Grounded and guarded', body: 'Integrations use retrieval/grounding, confidence signals, and access control, so added AI is accurate and safe with your data.' },
      { heading: 'Provider-flexible', body: 'We abstract the AI provider so you can switch or mix models as cost, quality, and privacy needs change, without re-plumbing your app.' },
    ],
    deliverables: [
      'AI capabilities integrated into your existing software',
      'Grounding/retrieval and access control',
      'Guardrails: validation, confidence, and fallbacks',
      'A provider abstraction to avoid lock-in',
      'Monitoring and cost controls',
      'Documentation and iteration support',
    ],
    technologies: ['LLM APIs', 'RAG', 'Provider abstraction', 'Function calling', 'Your existing stack', 'Cost/rate controls'],
    process: [
      { step: 'Identify', detail: 'Pick the highest-value AI capability to add.' },
      { step: 'Design', detail: 'Plan grounding, guardrails, and provider abstraction.' },
      { step: 'Integrate', detail: 'Add the capability into your app/workflow.' },
      { step: 'Guard', detail: 'Add validation, confidence, and cost controls.' },
      { step: 'Iterate', detail: 'Measure usage and improve.' },
    ],
    faqs: [
      { q: 'Can you add AI without rebuilding our app?', a: 'Usually yes — AI capabilities integrate into your existing application and workflow. A rebuild is only warranted if the current architecture cannot support it, which we would tell you honestly.' },
      { q: 'How do you avoid AI vendor lock-in?', a: 'We put a provider abstraction between your app and the model, so you can switch or mix providers as cost, quality, and privacy needs change.' },
      { q: 'Is our data safe when integrated with AI?', a: 'We use grounding with access control and avoid sending more than necessary, choosing providers and configurations appropriate to your data sensitivity.' },
    ],
    internalLinks: [
      { label: 'AI Automation', href: '/services/ai-services/ai-automation' },
      { label: 'Generative AI Applications', href: '/services/ai-services/generative-ai' },
      { label: 'Systems Integration', href: '/services/software-engineering/systems-integration' },
      { label: 'AI Strategy & Consulting', href: '/services/ai-services/ai-strategy-consulting' },
    ],
  },

  // ── Enterprise Systems (remaining) ────────────────────────────────────────
  'enterprise-systems/customer-portals': {
    slug: 'enterprise-systems/customer-portals', category: 'Enterprise Systems', status: 'published', qc: qcAllTrue,
    primaryKeyword: 'customer portal development',
    title: 'Customer Portal Development | Self-Service, Connected | Innovatix Systems',
    metaDescription: 'Innovatix Systems builds customer portals connected to your live operational data — orders, invoices, documents, and support — so customers self-serve and your team is freed up.',
    h1: 'Customer Portal Development',
    intro: [
      'A customer portal turns "email us and wait" into self-service: customers check their orders, invoices, documents, and status themselves, at any hour, from live data. Done right it lifts a load off your team and raises how professional you look.',
      'We build customer portals connected to the same operational systems your business runs on, so what a customer sees is always current — not a stale export — with secure access and a clean, on-brand experience.',
    ],
    problems: [
      { heading: 'Your team is the portal', body: 'When every status check, invoice copy, or document request is an email to your team, support cost scales with customers and response is slow.' },
      { heading: 'Customers see stale data', body: 'Portals fed by exports or manual updates drift out of date, creating confusion and mistrust. The portal has to read live data.' },
      { heading: 'Access and security handled loosely', body: 'Customer data behind a weak or shared login is a breach waiting to happen. Portals need real authentication and scoping.' },
    ],
    solution: [
      { heading: 'Connected to live operational data', body: 'The portal reads directly from your order, invoice, and document systems, so customers always see current, accurate information.' },
      { heading: 'Real self-service', body: 'Orders, status, invoices, documents, and support in one place, so customers answer their own questions and your team handles the exceptions.' },
      { heading: 'Secure and scoped', body: 'Proper authentication, role-based access, and per-customer scoping so each customer sees only their own data, with an audit trail.' },
    ],
    deliverables: [
      'A branded customer portal on live operational data',
      'Self-service for orders, invoices, documents, and status',
      'Secure authentication and per-customer data scoping',
      'Support/messaging or ticket entry point',
      'Notifications for updates that matter',
      'Integrations, audit logging, and support options',
    ],
    technologies: ['TypeScript', 'React / Next.js', 'Node.js / NestJS', 'PostgreSQL', 'RBAC', 'AWS'],
    process: [
      { step: 'Discovery', detail: 'Define what customers need to see and do.' },
      { step: 'Design', detail: 'Model the data, access, and branded experience.' },
      { step: 'Build', detail: 'Develop the portal on live operational data.' },
      { step: 'Secure', detail: 'Enforce auth, scoping, and audit logging.' },
      { step: 'Launch', detail: 'Roll out, monitor, and iterate.' },
    ],
    faqs: [
      { q: 'Will the portal show real-time data?', a: 'Yes — it reads from your live operational systems rather than periodic exports, so customers see current orders, invoices, and status.' },
      { q: 'How do you keep each customer’s data private?', a: 'Through authentication, role-based access, and per-customer scoping enforced on the server, with an audit trail — a customer can only ever see their own data.' },
      { q: 'Can it connect to our existing systems?', a: 'Yes — we integrate the portal with your ERP, order, invoice, and document systems so it reflects your source of truth.' },
    ],
    proof: { label: 'Amazon Sellers — customer & vendor portals on live data', href: '/case-studies/apparel-globe' },
    internalLinks: [
      { label: 'Vendor Portal Development', href: '/services/enterprise-systems/vendor-portals' },
      { label: 'ERP Development', href: '/services/enterprise-systems/erp-development' },
      { label: 'Web Application Development', href: '/services/software-engineering/web-application-development' },
      { label: 'Order Management Systems', href: '/services/enterprise-systems/order-management-systems' },
    ],
  },

  'enterprise-systems/vendor-portals': {
    slug: 'enterprise-systems/vendor-portals', category: 'Enterprise Systems', status: 'published', qc: qcAllTrue,
    primaryKeyword: 'vendor portal development',
    title: 'Vendor & Supplier Portal Development | Innovatix Systems',
    metaDescription: 'Innovatix Systems builds vendor and supplier portals — POs, ASNs, invoices, and documents in one connected place — so procurement runs on data instead of email and spreadsheets.',
    h1: 'Vendor & Supplier Portal Development',
    intro: [
      'Managing suppliers over email and spreadsheets is slow and error-prone: lost POs, mismatched invoices, no shared status. A vendor portal gives your suppliers one place to receive orders, confirm and ship them, submit invoices, and exchange documents — connected to your systems.',
      'We build vendor and supplier portals wired into your procurement and operations, so purchase orders, shipment notices, invoices, and documents flow through structured data instead of inboxes.',
    ],
    problems: [
      { heading: 'Procurement runs on email', body: 'POs, confirmations, and invoices scattered across inboxes mean lost documents, delays, and no shared source of truth with suppliers.' },
      { heading: 'Invoice and PO mismatches', body: 'Without a structured exchange, invoices that do not match POs and receipts create disputes and manual reconciliation.' },
      { heading: 'No visibility into supplier status', body: 'When suppliers cannot see or update order status in a shared place, you are left chasing updates by phone and email.' },
    ],
    solution: [
      { heading: 'Structured PO-to-invoice flow', body: 'Suppliers receive POs, confirm and submit shipment notices, and file invoices in the portal — matched against POs and receipts to reduce disputes.' },
      { heading: 'Shared, live status', body: 'Both sides see the same current status of orders, shipments, and documents, ending the phone-and-email chase.' },
      { heading: 'Connected to your systems', body: 'The portal integrates with your ERP/procurement so vendor activity updates your operations directly, without re-keying.' },
    ],
    deliverables: [
      'A supplier portal for POs, confirmations, ASNs, and invoices',
      'PO/invoice/receipt matching to reduce disputes',
      'Document exchange and shared status',
      'Secure, per-vendor access and audit logging',
      'Integration with your ERP/procurement systems',
      'Notifications and support options',
    ],
    technologies: ['TypeScript', 'React / Next.js', 'Node.js / NestJS', 'PostgreSQL', 'EDI/API integration', 'RBAC'],
    process: [
      { step: 'Discovery', detail: 'Map the procurement flow and vendor needs.' },
      { step: 'Design', detail: 'Model POs, ASNs, invoices, and matching rules.' },
      { step: 'Build', detail: 'Develop the portal integrated with procurement.' },
      { step: 'Secure', detail: 'Add per-vendor access and audit logging.' },
      { step: 'Roll out', detail: 'Onboard suppliers, monitor, and support.' },
    ],
    faqs: [
      { q: 'Can it match invoices to POs and receipts?', a: 'Yes — structured PO/invoice/receipt matching is a core benefit, cutting the disputes and manual reconciliation that email-based procurement creates.' },
      { q: 'Do you support EDI as well as a portal?', a: 'Yes — for suppliers who trade via EDI (850/855/856/810) we integrate that alongside the portal, so both self-service and automated exchange are covered.' },
      { q: 'Will it update our ERP?', a: 'Yes — vendor activity in the portal integrates with your ERP/procurement so your operations stay in sync without re-keying.' },
    ],
    proof: { label: 'Amazon Sellers — vendor portal & marketplace integrations', href: '/case-studies/apparel-globe' },
    internalLinks: [
      { label: 'Customer Portal Development', href: '/services/enterprise-systems/customer-portals' },
      { label: 'ERP Development', href: '/services/enterprise-systems/erp-development' },
      { label: 'Systems Integration', href: '/services/software-engineering/systems-integration' },
      { label: 'Inventory Management Systems', href: '/services/enterprise-systems/inventory-management-systems' },
    ],
  },

  'enterprise-systems/finance-ar-systems': {
    slug: 'enterprise-systems/finance-ar-systems', category: 'Enterprise Systems', status: 'published', qc: qcAllTrue,
    primaryKeyword: 'finance and accounts receivable systems',
    title: 'Finance & Accounts Receivable Systems | Innovatix Systems',
    metaDescription: 'Innovatix Systems builds finance and AR systems tied to your orders — invoicing, receivables, payments, and reconciliation — so billing and cash flow stay accurate and in sync.',
    h1: 'Finance & Accounts Receivable Systems',
    intro: [
      'When billing lives apart from operations, numbers drift: invoices that do not match what shipped, receivables no one is tracking, payments reconciled by hand days late. A finance and AR system tied to your orders keeps billing accurate and cash flow visible.',
      'We build finance and accounts-receivable systems connected to your order and operational data — invoicing, receivables tracking, payment capture, and reconciliation — so what you bill matches what you did, and you always know who owes what.',
    ],
    problems: [
      { heading: 'Billing disconnected from operations', body: 'When invoicing is separate from orders and fulfillment, customers get billed wrong and disputes follow. Finance has to read the same truth as operations.' },
      { heading: 'Receivables tracked in spreadsheets', body: 'Aging invoices in a spreadsheet mean missed follow-ups and cash flow surprises. Receivables need a system, not a tab.' },
      { heading: 'Manual, late reconciliation', body: 'Reconciling payments to invoices by hand is slow and error-prone, and problems surface long after they happened.' },
    ],
    solution: [
      { heading: 'Invoicing tied to orders', body: 'Invoices generate from actual order and fulfillment data, so what you bill matches what you delivered, and costing stays in sync.' },
      { heading: 'Receivables and aging tracked', body: 'Open invoices, aging, and follow-ups are tracked in the system, so nothing slips and cash flow is visible.' },
      { heading: 'Payments captured and reconciled', body: 'Payments (including via a processor like Stripe, webhook-authoritative) are captured and reconciled against invoices automatically, with a clear audit trail.' },
    ],
    deliverables: [
      'Order-tied invoicing and billing',
      'Accounts-receivable and aging tracking',
      'Payment capture and reconciliation',
      'Net-terms/credit handling where needed',
      'Finance reporting and audit trail',
      'Integration with accounting and your operations',
    ],
    technologies: ['TypeScript', 'Node.js / NestJS', 'PostgreSQL', 'Stripe', 'Accounting integrations', 'Audit logging'],
    process: [
      { step: 'Discovery', detail: 'Map billing, receivables, and payment flows.' },
      { step: 'Model', detail: 'Design invoicing tied to orders and payments.' },
      { step: 'Build', detail: 'Develop invoicing, AR, and reconciliation.' },
      { step: 'Integrate', detail: 'Connect payments and accounting.' },
      { step: 'Verify', detail: 'Reconcile, audit, and report.' },
    ],
    faqs: [
      { q: 'Does it integrate with our accounting software?', a: 'Yes — we integrate with your accounting system so finance stays the source of truth for the books while the operational AR system handles order-tied invoicing and reconciliation.' },
      { q: 'Can it handle net terms and credit?', a: 'Yes — where your business extends credit or net terms, we build the receivables, holds, and aging logic to manage it.' },
      { q: 'How are payments reconciled?', a: 'Payments are captured (e.g. via Stripe, webhook-authoritative) and reconciled to invoices automatically, with an audit trail, rather than matched by hand.' },
    ],
    proof: { label: 'Amazon Sellers — finance & AR tied to orders', href: '/case-studies/apparel-globe' },
    internalLinks: [
      { label: 'ERP Development', href: '/services/enterprise-systems/erp-development' },
      { label: 'Order Management Systems', href: '/services/enterprise-systems/order-management-systems' },
      { label: 'Business Operations Platforms', href: '/services/enterprise-systems/business-operations-platforms' },
      { label: 'Custom Software Development', href: '/services/software-engineering/custom-software-development' },
    ],
  },

  'enterprise-systems/business-operations-platforms': {
    slug: 'enterprise-systems/business-operations-platforms', category: 'Enterprise Systems', status: 'published', qc: qcAllTrue,
    primaryKeyword: 'business operations platform development',
    title: 'Business Operations Platform Development | Run on One System | Innovatix Systems',
    metaDescription: 'Innovatix Systems builds the operations platform your business runs on — orders, inventory, fulfillment, finance, and portals unified on one connected source of truth.',
    h1: 'Business Operations Platforms',
    intro: [
      'At some point a business outgrows the patchwork of tools it started with and needs one platform it actually runs on — where orders, inventory, fulfillment, finance, and the people it works with all read from the same source of truth. That platform is the difference between scaling smoothly and drowning in reconciliation.',
      'We build business operations platforms as connected systems, modeled on how your business really works, so the whole operation runs on one source of truth instead of spreadsheets bridging tools that were never meant to talk.',
    ],
    problems: [
      { heading: 'A patchwork that no longer scales', body: 'Separate tools for orders, inventory, and finance, glued by spreadsheets, hit a wall as volume grows. Reconciliation becomes the job.' },
      { heading: 'No single source of truth', body: 'When each function has its own version of the numbers, no one can trust any of them, and decisions are made on stale, conflicting data.' },
      { heading: 'Packaged software that does not fit', body: 'Off-the-shelf platforms force your operation to bend to their model, creating workarounds that recreate the fragmentation you were escaping.' },
    ],
    solution: [
      { heading: 'One connected source of truth', body: 'We design a data model where orders, inventory, fulfillment, and finance share one authoritative source, so the whole business reads the same numbers.' },
      { heading: 'Modeled on your operation', body: 'The platform mirrors how your business actually works — its channels, workflows, and rules — rather than forcing a generic template.' },
      { heading: 'Modular and integrated', body: 'Built as connected modules with customer/vendor portals and integrations to marketplaces, carriers, and payments, so it is one system, not silos.' },
    ],
    deliverables: [
      'A connected operations platform on one data model',
      'Order, inventory, and fulfillment modules',
      'Finance/AR tied to operations',
      'Customer and vendor portals',
      'Marketplace, carrier, and payment integrations',
      'RBAC, audit logging, reporting, and support',
    ],
    technologies: ['TypeScript', 'Next.js', 'NestJS', 'PostgreSQL', 'AWS', 'Marketplace & carrier APIs', 'Stripe'],
    process: [
      { step: 'Discovery', detail: 'Map the whole operation, systems, and data.' },
      { step: 'Architecture', detail: 'Design the connected data model and modules.' },
      { step: 'Build', detail: 'Deliver modules on one source of truth, in sprints.' },
      { step: 'Integrate', detail: 'Connect channels, carriers, payments, and portals.' },
      { step: 'Launch & evolve', detail: 'Roll out, monitor, and extend over time.' },
    ],
    faqs: [
      { q: 'Isn’t this just an ERP?', a: 'It overlaps, but the emphasis is a platform modeled on how your specific business operates — including portals and channel integrations — rather than adopting a generic ERP and bending to it. We build ERP capabilities as part of it where that fits.' },
      { q: 'Do we have to build it all at once?', a: 'No — we deliver it as connected modules on one data model, sequenced so you get value early and grow the platform over time.' },
      { q: 'Can it integrate our marketplaces and carriers?', a: 'Yes — marketplace (Amazon, Walmart), carrier (USPS/UPS/FedEx), and payment integrations are part of the platform, so operations run as one connected system.' },
    ],
    proof: { label: 'Amazon Sellers — a full multi-channel operations platform', href: '/case-studies/apparel-globe' },
    internalLinks: [
      { label: 'ERP Development', href: '/services/enterprise-systems/erp-development' },
      { label: 'Order Management Systems', href: '/services/enterprise-systems/order-management-systems' },
      { label: 'Finance & AR Systems', href: '/services/enterprise-systems/finance-ar-systems' },
      { label: 'Custom Software Development', href: '/services/software-engineering/custom-software-development' },
    ],
  },

  // ── Cloud & Infrastructure (remaining) ────────────────────────────────────
  'cloud-infrastructure/cloud-migration': {
    slug: 'cloud-infrastructure/cloud-migration', category: 'Cloud & Infrastructure', status: 'published', qc: qcAllTrue,
    primaryKeyword: 'cloud migration services',
    title: 'Cloud Migration Services | Move Without the Meltdown | Innovatix Systems',
    metaDescription: 'Innovatix Systems migrates applications and data to the cloud safely — assessed, sequenced, and reversible — so you gain scalability and reliability without downtime surprises.',
    h1: 'Cloud Migration',
    intro: [
      'Moving to the cloud promises scalability, reliability, and lower operational drag — but a rushed lift-and-shift often delivers a bigger bill and the same problems. A good migration is planned: assessed, sequenced, and reversible, with the cost and downtime understood up front.',
      'We migrate applications and data to the cloud deliberately — evaluating what to rehost, re-platform, or refactor, moving in controlled steps, and validating each one — so you get the benefits without the meltdown.',
    ],
    problems: [
      { heading: 'Lift-and-shift that just moves the mess', body: 'Copying a system to the cloud unchanged often raises costs and keeps the old problems. Migration needs a strategy per workload.' },
      { heading: 'Downtime and data-loss risk', body: 'Cutting over without a tested plan and rollback risks outages and lost data at the worst moment.' },
      { heading: 'Runaway cloud bills', body: 'Cloud without cost awareness gets expensive fast. Migration should include right-sizing and cost controls.' },
    ],
    solution: [
      { heading: 'Assess and choose the right approach', body: 'For each workload we decide rehost, re-platform, or refactor based on value and effort — not one blunt strategy for everything.' },
      { heading: 'Sequenced, reversible cutover', body: 'We migrate in controlled steps with data validation and rollback plans, so each move is verifiable and the business keeps running.' },
      { heading: 'Right-sized and cost-aware', body: 'We size resources sensibly and set up cost monitoring, so the cloud saves money rather than surprising you on the bill.' },
    ],
    deliverables: [
      'A migration assessment and per-workload strategy',
      'A sequenced migration and cutover plan with rollback',
      'Data migration with validation and reconciliation',
      'Right-sized cloud architecture and cost controls',
      'Monitoring, backups, and DR readiness',
      'Documentation and post-migration support',
    ],
    technologies: ['AWS', 'Docker / Kubernetes', 'Infrastructure as Code', 'PostgreSQL', 'CI/CD', 'Cost monitoring'],
    process: [
      { step: 'Assess', detail: 'Inventory workloads and choose per-workload approach.' },
      { step: 'Plan', detail: 'Sequence the migration with cutover and rollback.' },
      { step: 'Migrate', detail: 'Move in steps, validating data each time.' },
      { step: 'Optimize', detail: 'Right-size resources and set cost controls.' },
      { step: 'Operate', detail: 'Monitor, back up, and support.' },
    ],
    faqs: [
      { q: 'Will there be downtime?', a: 'We plan migrations to minimize downtime — often near-zero for well-architected apps — with tested cutover and rollback so a problem does not become an outage.' },
      { q: 'Lift-and-shift or refactor?', a: 'It depends on the workload. We choose rehost, re-platform, or refactor per system based on value and effort, rather than forcing one approach across everything.' },
      { q: 'How do you keep cloud costs under control?', a: 'By right-sizing resources during migration and setting up cost monitoring and controls, so the move reduces cost rather than surprising you.' },
    ],
    internalLinks: [
      { label: 'Cloud Architecture', href: '/services/cloud-infrastructure/cloud-architecture' },
      { label: 'AWS Engineering', href: '/services/cloud-infrastructure/aws-engineering' },
      { label: 'Infrastructure as Code', href: '/services/cloud-infrastructure/infrastructure-as-code' },
      { label: 'Legacy Software Modernization', href: '/services/software-engineering/legacy-modernization' },
    ],
  },

  'cloud-infrastructure/aws-engineering': {
    slug: 'cloud-infrastructure/aws-engineering', category: 'Cloud & Infrastructure', status: 'published', qc: qcAllTrue,
    primaryKeyword: 'aws engineering services',
    title: 'AWS Engineering Services | Well-Architected & Cost-Aware | Innovatix Systems',
    metaDescription: 'Innovatix Systems designs and operates AWS infrastructure the right way — secure, scalable, and cost-aware — with the compute, data, and networking your workloads actually need.',
    h1: 'AWS Engineering',
    intro: [
      'AWS gives you every building block imaginable — which is exactly why teams get it wrong, over-provisioning, under-securing, and overspending. Good AWS engineering is about choosing the right services for your workload and wiring them together securely and cost-effectively.',
      'We design, build, and operate AWS infrastructure that fits your applications — the right compute, data, and networking, secured and monitored — following well-architected principles without gold-plating.',
    ],
    problems: [
      { heading: 'Over-engineered or under-secured', body: 'AWS setups often swing between needlessly complex and dangerously loose. Both cost you — in money or in risk.' },
      { heading: 'Surprising bills', body: 'Without cost-aware design and monitoring, AWS spend creeps and then spikes, with no clear owner or cause.' },
      { heading: 'Fragile, hand-built infrastructure', body: 'Click-ops infrastructure no one can reproduce is a liability. It should be defined as code and repeatable.' },
    ],
    solution: [
      { heading: 'Right services for the workload', body: 'We pick the AWS services that fit — not the most or the trendiest — and architect them for your reliability and scale needs following well-architected principles.' },
      { heading: 'Secure and cost-aware', body: 'Least-privilege IAM, network isolation, and encryption by default, plus right-sizing and cost monitoring so the bill is understood and controlled.' },
      { heading: 'Defined as code', body: 'Infrastructure as code so environments are reproducible, reviewable, and recoverable — not a fragile hand-built snowflake.' },
    ],
    deliverables: [
      'A well-architected AWS design for your workloads',
      'Compute, data, and networking set up securely',
      'Least-privilege IAM and encryption',
      'Infrastructure as code and repeatable environments',
      'Cost monitoring, right-sizing, and controls',
      'Monitoring, backups, and operational runbooks',
    ],
    technologies: ['AWS (EC2, ECS, Lambda, RDS, S3, VPC)', 'IAM', 'Infrastructure as Code (Terraform/CDK)', 'CloudWatch', 'CI/CD', 'PostgreSQL / RDS'],
    process: [
      { step: 'Assess', detail: 'Understand the workloads and requirements.' },
      { step: 'Design', detail: 'Choose services and a well-architected layout.' },
      { step: 'Build', detail: 'Provision as code, secured and cost-aware.' },
      { step: 'Instrument', detail: 'Add monitoring, backups, and cost controls.' },
      { step: 'Operate', detail: 'Run, optimize, and support.' },
    ],
    faqs: [
      { q: 'Do you follow the AWS Well-Architected Framework?', a: 'Yes — reliability, security, performance, cost, and operational excellence guide our designs, applied pragmatically to your workloads rather than as a box-ticking exercise.' },
      { q: 'Can you help reduce our AWS bill?', a: 'Yes — we assess for right-sizing, unused resources, and architectural cost drivers, and set up monitoring so spend stays visible and controlled.' },
      { q: 'Do you use infrastructure as code?', a: 'Always — environments are defined as code (e.g. Terraform/CDK) so they are reproducible, reviewable, and recoverable.' },
    ],
    internalLinks: [
      { label: 'Cloud Architecture', href: '/services/cloud-infrastructure/cloud-architecture' },
      { label: 'Infrastructure as Code', href: '/services/cloud-infrastructure/infrastructure-as-code' },
      { label: 'DevOps', href: '/services/cloud-infrastructure/devops' },
      { label: 'Monitoring & Observability', href: '/services/cloud-infrastructure/monitoring-observability' },
    ],
  },

  'cloud-infrastructure/azure-engineering': {
    slug: 'cloud-infrastructure/azure-engineering', category: 'Cloud & Infrastructure', status: 'published', qc: qcAllTrue,
    primaryKeyword: 'azure engineering services',
    title: 'Azure Engineering Services | Secure, Scalable Microsoft Cloud | Innovatix Systems',
    metaDescription: 'Innovatix Systems engineers Microsoft Azure infrastructure — secure, scalable, and integrated with Entra ID — for organizations standardized on the Microsoft ecosystem.',
    h1: 'Azure Engineering',
    intro: [
      'For organizations standardized on Microsoft — Entra ID, Microsoft 365, and the Azure ecosystem — Azure is often the natural home for their applications. Doing it well means using Azure’s building blocks securely and cost-effectively, and integrating cleanly with the identity and tools you already run.',
      'We design, build, and operate Azure infrastructure that fits your workloads and your Microsoft environment — secure, scalable, defined as code, and integrated with Entra ID for identity.',
    ],
    problems: [
      { heading: 'Azure set up ad hoc', body: 'Resources spun up by hand without a coherent design or identity model become insecure and hard to manage. Azure needs deliberate architecture.' },
      { heading: 'Identity not integrated', body: 'Not leveraging Entra ID for access across Azure workloads means duplicated identity and weaker security in a Microsoft shop.' },
      { heading: 'Cost and governance drift', body: 'Without cost controls and governance, Azure spend and sprawl grow unchecked.' },
    ],
    solution: [
      { heading: 'Well-architected Azure', body: 'We design Azure infrastructure for your reliability, security, and scale needs, choosing the right services rather than the most.' },
      { heading: 'Integrated with Entra ID', body: 'Identity and access built on Entra ID (Azure AD), so authentication and authorization align with your existing Microsoft environment.' },
      { heading: 'Governed, coded, cost-aware', body: 'Infrastructure as code, governance/policy, and cost monitoring so environments are reproducible, compliant, and affordable.' },
    ],
    deliverables: [
      'A well-architected Azure design for your workloads',
      'Compute, data, and networking configured securely',
      'Entra ID (Azure AD) identity integration',
      'Infrastructure as code and governance/policy',
      'Cost monitoring and controls',
      'Monitoring, backups, and runbooks',
    ],
    technologies: ['Azure (App Service, AKS, Functions, SQL, Storage)', 'Entra ID (Azure AD)', 'Infrastructure as Code (Bicep/Terraform)', 'Azure Monitor', 'CI/CD', 'Azure Policy'],
    process: [
      { step: 'Assess', detail: 'Understand workloads and the Microsoft environment.' },
      { step: 'Design', detail: 'Architect Azure services and identity.' },
      { step: 'Build', detail: 'Provision as code, secured and governed.' },
      { step: 'Instrument', detail: 'Add monitoring, backups, and cost controls.' },
      { step: 'Operate', detail: 'Run, optimize, and support.' },
    ],
    faqs: [
      { q: 'We are a Microsoft shop — is Azure the right choice?', a: 'Often yes, because of tight integration with Entra ID and Microsoft 365. We help you weigh it honestly against alternatives based on your workloads and skills, not by default.' },
      { q: 'Do you integrate with Entra ID / Azure AD?', a: 'Yes — we build identity and access on Entra ID so authentication and authorization align with your existing Microsoft environment.' },
      { q: 'Do you also do AWS?', a: 'Yes — we engineer on both AWS and Azure and can advise which fits your organization, or run a multi-cloud approach where it is warranted.' },
    ],
    internalLinks: [
      { label: 'AWS Engineering', href: '/services/cloud-infrastructure/aws-engineering' },
      { label: 'Cloud Architecture', href: '/services/cloud-infrastructure/cloud-architecture' },
      { label: 'SSO & Enterprise Identity', href: '/services/security/sso-enterprise-identity' },
      { label: 'Infrastructure as Code', href: '/services/cloud-infrastructure/infrastructure-as-code' },
    ],
  },

  'cloud-infrastructure/devops': {
    slug: 'cloud-infrastructure/devops', category: 'Cloud & Infrastructure', status: 'published', qc: qcAllTrue,
    primaryKeyword: 'devops services',
    title: 'DevOps Services | Ship Faster, Break Less | Innovatix Systems',
    metaDescription: 'Innovatix Systems brings DevOps practices to your team — automated pipelines, infrastructure as code, and monitoring — so you ship more often with less risk.',
    h1: 'DevOps',
    intro: [
      'DevOps is not a tool you buy — it is the practice of making software delivery fast, repeatable, and safe: automated pipelines, infrastructure defined as code, and monitoring that catches problems early. Done right, teams ship more often and break things less.',
      'We bring DevOps practices to your team and systems — automating the path from commit to production, codifying your infrastructure, and instrumenting it — so delivery is quick and reliable instead of a risky manual event.',
    ],
    problems: [
      { heading: 'Deploys are slow and scary', body: 'Manual, infrequent, high-stress releases lead to big-batch risk and fear of shipping. Automation makes deploys routine.' },
      { heading: 'Environments drift and differ', body: '"Works on my machine" and hand-built environments cause bugs and outages. Infrastructure as code makes them consistent.' },
      { heading: 'Problems found by customers', body: 'Without monitoring and alerting, issues surface as customer complaints instead of alerts. Delivery needs feedback loops.' },
    ],
    solution: [
      { heading: 'Automated delivery pipelines', body: 'We build CI/CD so every change is tested and deployed the same way, turning releases from events into a routine, low-risk flow.' },
      { heading: 'Infrastructure as code', body: 'Environments defined as code so they are consistent, reviewable, and reproducible across dev, staging, and production.' },
      { heading: 'Monitoring and fast feedback', body: 'Health checks, metrics, and alerting so problems are caught early and the team learns from every release.' },
    ],
    deliverables: [
      'CI/CD pipelines for build, test, and deploy',
      'Infrastructure as code and consistent environments',
      'Automated testing gates in the pipeline',
      'Monitoring, alerting, and health checks',
      'Rollback and safe-deploy practices',
      'Documentation and team enablement',
    ],
    technologies: ['CI/CD (GitHub Actions/GitLab)', 'Docker', 'Kubernetes', 'Infrastructure as Code (Terraform)', 'AWS / Azure', 'Monitoring & alerting'],
    process: [
      { step: 'Assess', detail: 'Review current delivery, environments, and pain.' },
      { step: 'Automate', detail: 'Build CI/CD and codify infrastructure.' },
      { step: 'Instrument', detail: 'Add monitoring, alerting, and health checks.' },
      { step: 'Harden', detail: 'Add safe-deploy and rollback practices.' },
      { step: 'Enable', detail: 'Document and upskill the team.' },
    ],
    faqs: [
      { q: 'Do you set up DevOps for teams or just projects we build?', a: 'Both — we bring these practices to your existing team and systems, or embed them in the software we build for you.' },
      { q: 'Which CI/CD tools do you use?', a: 'We work with the common ones — GitHub Actions, GitLab CI, and similar — and choose based on where your code and team already live.' },
      { q: 'How does this reduce risk?', a: 'Automated, tested, repeatable deploys plus monitoring and rollback turn releases from big, scary events into routine, low-risk, quickly-reversible changes.' },
    ],
    internalLinks: [
      { label: 'CI/CD', href: '/services/cloud-infrastructure/ci-cd' },
      { label: 'Infrastructure as Code', href: '/services/cloud-infrastructure/infrastructure-as-code' },
      { label: 'Monitoring & Observability', href: '/services/cloud-infrastructure/monitoring-observability' },
      { label: 'Kubernetes', href: '/services/cloud-infrastructure/kubernetes' },
    ],
  },

  'cloud-infrastructure/ci-cd': {
    slug: 'cloud-infrastructure/ci-cd', category: 'Cloud & Infrastructure', status: 'published', qc: qcAllTrue,
    primaryKeyword: 'ci/cd pipeline setup',
    title: 'CI/CD Pipeline Setup | Automated, Tested Deployments | Innovatix Systems',
    metaDescription: 'Innovatix Systems builds CI/CD pipelines that test and deploy every change automatically — with quality gates, safe rollouts, and rollback — so shipping is routine and reliable.',
    h1: 'CI/CD Pipeline Setup',
    intro: [
      'Continuous integration and delivery is the assembly line for software: every change is automatically built, tested, and deployed the same way. It is the single highest-leverage investment in shipping quickly without breaking things.',
      'We build CI/CD pipelines that run your tests on every change, enforce quality gates, and deploy safely with rollback — so releasing goes from a manual, anxious event to a routine, reliable flow.',
    ],
    problems: [
      { heading: 'Manual, inconsistent deploys', body: 'Deploying by hand means every release is different and mistakes are easy. A pipeline makes it identical every time.' },
      { heading: 'Bugs reaching production', body: 'Without automated test gates, regressions slip through to customers. CI/CD catches them before they ship.' },
      { heading: 'No safe way to roll back', body: 'When a bad deploy has no quick reversal, a small mistake becomes a long outage.' },
    ],
    solution: [
      { heading: 'Test and build on every change', body: 'The pipeline runs your automated tests and builds on every commit, so problems are caught early and consistently.' },
      { heading: 'Quality gates before production', body: 'Tests, checks, and (where you want) approvals gate the path to production, so only vetted changes ship.' },
      { heading: 'Safe rollouts and rollback', body: 'Controlled deploys with health checks and a fast rollback path, so a bad release is reversed in moments, not hours.' },
    ],
    deliverables: [
      'CI/CD pipeline for build, test, and deploy',
      'Automated test and quality gates',
      'Environment promotion (dev → staging → prod)',
      'Safe rollout strategy and fast rollback',
      'Secrets handling in the pipeline',
      'Documentation and team handover',
    ],
    technologies: ['GitHub Actions / GitLab CI', 'Docker', 'Automated testing', 'AWS / Azure', 'Infrastructure as Code', 'Secrets management'],
    process: [
      { step: 'Review', detail: 'Understand the app, tests, and deploy targets.' },
      { step: 'Build pipeline', detail: 'Automate build, test, and deploy.' },
      { step: 'Gate', detail: 'Add quality gates and environment promotion.' },
      { step: 'Secure', detail: 'Handle secrets and add rollback.' },
      { step: 'Hand over', detail: 'Document and enable the team.' },
    ],
    faqs: [
      { q: 'What if we do not have automated tests yet?', a: 'We can start with a pipeline that builds and deploys reliably and add test gates as coverage grows — and help you build that coverage. Even without full tests, consistent automated deploys reduce risk immediately.' },
      { q: 'How fast is rollback?', a: 'We design deploys so rolling back to the previous good version is a quick, safe action — minutes, not a scramble.' },
      { q: 'Which platforms do you support?', a: 'The common CI/CD platforms (GitHub Actions, GitLab CI, etc.) deploying to AWS, Azure, or your target — chosen to fit where your code lives.' },
    ],
    internalLinks: [
      { label: 'DevOps', href: '/services/cloud-infrastructure/devops' },
      { label: 'Infrastructure as Code', href: '/services/cloud-infrastructure/infrastructure-as-code' },
      { label: 'Monitoring & Observability', href: '/services/cloud-infrastructure/monitoring-observability' },
      { label: 'Software Maintenance & Support', href: '/services/software-engineering/maintenance-support' },
    ],
  },

  'cloud-infrastructure/infrastructure-as-code': {
    slug: 'cloud-infrastructure/infrastructure-as-code', category: 'Cloud & Infrastructure', status: 'published', qc: qcAllTrue,
    primaryKeyword: 'infrastructure as code',
    title: 'Infrastructure as Code | Reproducible, Reviewable Environments | Innovatix Systems',
    metaDescription: 'Innovatix Systems defines your infrastructure as code — reproducible, reviewable, version-controlled environments with Terraform/CDK — so nothing is a fragile hand-built snowflake.',
    h1: 'Infrastructure as Code',
    intro: [
      'Infrastructure as code means your servers, networks, and cloud resources are defined in version-controlled files, not clicked together by hand. It turns infrastructure into something you can review, reproduce, and recover — the foundation of reliable operations.',
      'We codify your infrastructure with tools like Terraform or CDK, so environments are consistent across dev, staging, and production, changes are reviewed like code, and disaster recovery is a re-apply rather than a memory test.',
    ],
    problems: [
      { heading: 'Snowflake environments no one can reproduce', body: 'Hand-built infrastructure that only one person understands is a liability. When it breaks or that person leaves, you are stuck.' },
      { heading: 'Drift between environments', body: 'When dev, staging, and prod are configured differently by hand, "works in staging" does not mean "works in prod". Code keeps them identical.' },
      { heading: 'Slow, error-prone provisioning', body: 'Clicking through consoles to stand up environments is slow and inconsistent. Code makes it fast and repeatable.' },
    ],
    solution: [
      { heading: 'Everything defined as code', body: 'We define your infrastructure in version-controlled code so it is reproducible, auditable, and the single source of truth for your environments.' },
      { heading: 'Consistent, reviewed changes', body: 'Infrastructure changes go through review like application code, with plan/preview before apply — so surprises are caught before they hit production.' },
      { heading: 'Fast recovery and new environments', body: 'Standing up a new environment or recovering from a disaster becomes a re-apply, not a manual rebuild from memory.' },
    ],
    deliverables: [
      'Your infrastructure defined as version-controlled code',
      'Consistent dev/staging/prod environments',
      'Plan/preview and review workflow for changes',
      'State management and secrets handling',
      'Documentation and modules for reuse',
      'Recovery/rebuild capability',
    ],
    technologies: ['Terraform', 'AWS CDK / CloudFormation', 'Bicep (Azure)', 'Git-based workflow', 'AWS / Azure', 'Secrets management'],
    process: [
      { step: 'Assess', detail: 'Inventory current infrastructure and gaps.' },
      { step: 'Codify', detail: 'Express infrastructure as version-controlled code.' },
      { step: 'Standardize', detail: 'Make environments consistent and modular.' },
      { step: 'Review flow', detail: 'Add plan/preview and change review.' },
      { step: 'Hand over', detail: 'Document and enable the team.' },
    ],
    faqs: [
      { q: 'Terraform or a cloud-native tool?', a: 'We use Terraform for cloud-agnostic or multi-cloud needs, and cloud-native tools (CDK/CloudFormation, Bicep) where you are all-in on one provider. We match the tool to your situation.' },
      { q: 'Can you codify infrastructure we built by hand?', a: 'Yes — we bring existing hand-built infrastructure under code (importing state where possible) so it becomes reproducible and reviewable going forward.' },
      { q: 'How does this help disaster recovery?', a: 'When infrastructure is code, recreating an environment is a re-apply rather than a manual rebuild from memory — dramatically faster and less error-prone.' },
    ],
    internalLinks: [
      { label: 'AWS Engineering', href: '/services/cloud-infrastructure/aws-engineering' },
      { label: 'DevOps', href: '/services/cloud-infrastructure/devops' },
      { label: 'Cloud Architecture', href: '/services/cloud-infrastructure/cloud-architecture' },
      { label: 'Kubernetes', href: '/services/cloud-infrastructure/kubernetes' },
    ],
  },

  'cloud-infrastructure/kubernetes': {
    slug: 'cloud-infrastructure/kubernetes', category: 'Cloud & Infrastructure', status: 'published', qc: qcAllTrue,
    primaryKeyword: 'kubernetes consulting and engineering',
    title: 'Kubernetes Engineering | Container Orchestration Done Right | Innovatix Systems',
    metaDescription: 'Innovatix Systems designs and operates Kubernetes — when it is the right tool — with secure, scalable, observable clusters, and the honesty to say when you do not need it.',
    h1: 'Kubernetes Engineering',
    intro: [
      'Kubernetes is a powerful way to run containerized applications at scale — and a heavy, complex tool that many teams adopt before they need it. Done right, it gives you scalability, resilience, and portability; done wrong, it adds operational burden you cannot afford.',
      'We design, build, and operate Kubernetes when it genuinely fits — secure, observable, and right-sized — and we will tell you honestly when a simpler platform would serve you better.',
    ],
    problems: [
      { heading: 'Kubernetes adopted too early', body: 'Teams reach for Kubernetes for prestige, not need, and drown in complexity. The first question is whether you actually need it.' },
      { heading: 'Insecure or unobservable clusters', body: 'Clusters without proper security, resource limits, and observability become fragile and dangerous at scale.' },
      { heading: 'Operational burden with no owner', body: 'Kubernetes demands real operational skill. Without it, clusters rot and incidents multiply.' },
    ],
    solution: [
      { heading: 'Right tool for the job', body: 'We assess honestly whether Kubernetes fits your scale and team; when it does, we architect it properly, and when it does not, we recommend the simpler platform.' },
      { heading: 'Secure, observable clusters', body: 'Least-privilege access, network policy, resource limits, and observability built in, so clusters are safe and debuggable.' },
      { heading: 'Codified and operable', body: 'Defined as code with CI/CD, autoscaling, and runbooks, so the cluster is reproducible and your team can actually operate it.' },
    ],
    deliverables: [
      'A fit assessment (do you need Kubernetes?)',
      'A secure, right-sized cluster design',
      'Deployments, autoscaling, and resource limits',
      'Network policy, RBAC, and secrets handling',
      'Observability (metrics, logs, alerts)',
      'Infrastructure as code and operational runbooks',
    ],
    technologies: ['Kubernetes', 'Docker', 'Helm', 'EKS / AKS', 'Infrastructure as Code', 'Prometheus / observability'],
    process: [
      { step: 'Assess fit', detail: 'Decide honestly if Kubernetes is warranted.' },
      { step: 'Design', detail: 'Architect a secure, right-sized cluster.' },
      { step: 'Build', detail: 'Provision as code with autoscaling and limits.' },
      { step: 'Observe', detail: 'Add metrics, logs, alerts, and policy.' },
      { step: 'Operate', detail: 'Document runbooks and support.' },
    ],
    faqs: [
      { q: 'Do we actually need Kubernetes?', a: 'Often not — many workloads run better on simpler platforms (managed containers, serverless). We assess honestly and only recommend Kubernetes when its scale and portability benefits genuinely outweigh its operational cost.' },
      { q: 'Can you operate our existing cluster?', a: 'Yes — we can take over, harden, and operate an existing Kubernetes setup, adding the security, observability, and runbooks it may be missing.' },
      { q: 'Managed Kubernetes or self-hosted?', a: 'Usually managed (EKS/AKS) to reduce operational burden; self-hosted only where there is a specific reason. We recommend based on your team and needs.' },
    ],
    internalLinks: [
      { label: 'AWS Engineering', href: '/services/cloud-infrastructure/aws-engineering' },
      { label: 'DevOps', href: '/services/cloud-infrastructure/devops' },
      { label: 'Infrastructure as Code', href: '/services/cloud-infrastructure/infrastructure-as-code' },
      { label: 'Monitoring & Observability', href: '/services/cloud-infrastructure/monitoring-observability' },
    ],
  },

  'cloud-infrastructure/monitoring-observability': {
    slug: 'cloud-infrastructure/monitoring-observability', category: 'Cloud & Infrastructure', status: 'published', qc: qcAllTrue,
    primaryKeyword: 'monitoring and observability',
    title: 'Monitoring & Observability | Know Before Your Customers Do | Innovatix Systems',
    metaDescription: 'Innovatix Systems builds monitoring and observability — metrics, logs, health checks, and actionable alerts — so you find and fix problems before customers ever notice.',
    h1: 'Monitoring & Observability',
    intro: [
      'The difference between a minor blip and a costly outage is often just how fast you knew. Monitoring and observability give your systems a nervous system — metrics, logs, health checks, and alerts — so problems surface as pages you can act on, not customer complaints.',
      'We instrument your applications and infrastructure so you can see what they are doing, get alerted when something is wrong, and diagnose why — turning "it feels slow" into a specific, fixable answer.',
    ],
    problems: [
      { heading: 'Customers report your outages', body: 'When the first sign of a problem is a support ticket, you are always behind. Monitoring flips that so you know first.' },
      { heading: 'No way to diagnose "it’s slow"', body: 'Without metrics and traces, performance problems are guesswork. Observability shows where the time actually goes.' },
      { heading: 'Alert fatigue', body: 'Too many noisy, non-actionable alerts get ignored, so the real one is missed. Alerts must be meaningful.' },
    ],
    solution: [
      { heading: 'See what your systems are doing', body: 'Metrics, structured logs, and health/readiness checks across your app and infrastructure, so system state is visible rather than a mystery.' },
      { heading: 'Actionable alerting', body: 'Alerts tuned to meaningful conditions (error rates, latency, saturation, failed jobs) so a page means something and gets acted on — not ignored.' },
      { heading: 'Fast diagnosis', body: 'Correlated logs and metrics (with request/correlation IDs) so when something breaks, you find the cause quickly instead of guessing.' },
    ],
    deliverables: [
      'Metrics and dashboards for app and infrastructure',
      'Structured, correlated logging',
      'Health/readiness checks',
      'Actionable alerting on meaningful conditions',
      'On-call/runbook setup',
      'Documentation and tuning',
    ],
    technologies: ['Prometheus / metrics', 'Grafana dashboards', 'Structured logging', 'Correlation IDs', 'Alerting (PagerDuty/Slack)', 'CloudWatch / Azure Monitor'],
    process: [
      { step: 'Assess', detail: 'Identify what must be watched and current gaps.' },
      { step: 'Instrument', detail: 'Add metrics, logs, and health checks.' },
      { step: 'Alert', detail: 'Tune alerts to meaningful, actionable conditions.' },
      { step: 'Correlate', detail: 'Wire logs and metrics for fast diagnosis.' },
      { step: 'Operate', detail: 'Set up runbooks and iterate on signal.' },
    ],
    faqs: [
      { q: 'Monitoring vs. observability — what’s the difference?', a: 'Monitoring tells you something is wrong (a metric crossed a threshold); observability helps you understand why (correlated logs, metrics, and traces). We build both, because knowing and diagnosing are different needs.' },
      { q: 'How do you avoid alert fatigue?', a: 'By alerting only on meaningful, actionable conditions and tuning thresholds, so a page means real action is needed and the important alert is never lost in noise.' },
      { q: 'Can you add this to our existing systems?', a: 'Yes — we instrument existing applications and infrastructure with metrics, logs, health checks, and alerting, not just new builds.' },
    ],
    internalLinks: [
      { label: 'DevOps', href: '/services/cloud-infrastructure/devops' },
      { label: 'Software Maintenance & Support', href: '/services/software-engineering/maintenance-support' },
      { label: 'AWS Engineering', href: '/services/cloud-infrastructure/aws-engineering' },
      { label: 'Cloud Architecture', href: '/services/cloud-infrastructure/cloud-architecture' },
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
