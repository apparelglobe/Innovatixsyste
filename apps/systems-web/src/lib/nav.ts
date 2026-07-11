/**
 * Innovatix Systems navigation taxonomy — the 8 enterprise service categories
 * (drives the header mega-menu). Hrefs follow /services/{category}/{service}.
 * Only pages that exist + pass QC are linked as live; others are marked planned
 * so the mega-menu can render them non-linked until built (no dead links, no
 * thin pages indexed).
 */
export type NavItem = { label: string; href: string; planned?: boolean };
export type NavCategory = { key: string; label: string; blurb: string; items: NavItem[] };

export const SERVICE_CATEGORIES: NavCategory[] = [
  {
    key: 'software-engineering',
    label: 'Software Engineering',
    blurb: 'Custom, enterprise, and SaaS product engineering.',
    items: [
      { label: 'Custom Software Development', href: '/services/software-engineering/custom-software-development' },
      { label: 'Enterprise Software Development', href: '/services/software-engineering/enterprise-software-development', planned: true },
      { label: 'SaaS Product Development', href: '/services/software-engineering/saas-product-development', planned: true },
      { label: 'Web Application Development', href: '/services/software-engineering/web-application-development', planned: true },
      { label: 'Mobile Application Development', href: '/services/software-engineering/mobile-application-development', planned: true },
      { label: 'Legacy Software Modernization', href: '/services/software-engineering/legacy-modernization', planned: true },
      { label: 'API Development', href: '/services/software-engineering/api-development', planned: true },
      { label: 'Systems Integration', href: '/services/software-engineering/systems-integration', planned: true },
      { label: 'Software Maintenance & Support', href: '/services/software-engineering/maintenance-support', planned: true },
    ],
  },
  {
    key: 'ai-services',
    label: 'AI Services',
    blurb: 'Automation, agents, and generative AI in production.',
    items: [
      { label: 'AI Strategy & Consulting', href: '/services/ai-services/ai-strategy-consulting', planned: true },
      { label: 'AI Automation', href: '/services/ai-services/ai-automation', planned: true },
      { label: 'AI Agents', href: '/services/ai-services/ai-agents', planned: true },
      { label: 'Generative AI Applications', href: '/services/ai-services/generative-ai', planned: true },
      { label: 'Retrieval-Augmented Generation', href: '/services/ai-services/rag', planned: true },
      { label: 'AI Chatbots & Assistants', href: '/services/ai-services/chatbots-assistants', planned: true },
      { label: 'Document Intelligence', href: '/services/ai-services/document-intelligence', planned: true },
      { label: 'Intelligent Workflow Automation', href: '/services/ai-services/workflow-automation', planned: true },
      { label: 'AI Integration', href: '/services/ai-services/ai-integration', planned: true },
    ],
  },
  {
    key: 'enterprise-systems',
    label: 'Enterprise Systems',
    blurb: 'ERP, CRM, WMS, OMS, and operations platforms.',
    items: [
      { label: 'ERP Development', href: '/services/enterprise-systems/erp-development', planned: true },
      { label: 'CRM Development', href: '/services/enterprise-systems/crm-development', planned: true },
      { label: 'Warehouse Management Systems', href: '/services/enterprise-systems/warehouse-management-systems', planned: true },
      { label: 'Inventory Management Systems', href: '/services/enterprise-systems/inventory-management-systems', planned: true },
      { label: 'Order Management Systems', href: '/services/enterprise-systems/order-management-systems', planned: true },
      { label: 'Customer Portals', href: '/services/enterprise-systems/customer-portals', planned: true },
      { label: 'Vendor Portals', href: '/services/enterprise-systems/vendor-portals', planned: true },
      { label: 'Finance & AR Systems', href: '/services/enterprise-systems/finance-ar-systems', planned: true },
      { label: 'Business Operations Platforms', href: '/services/enterprise-systems/business-operations-platforms', planned: true },
    ],
  },
  {
    key: 'cloud-infrastructure',
    label: 'Cloud & Infrastructure',
    blurb: 'Cloud architecture, DevOps, and reliability.',
    items: [
      { label: 'Cloud Architecture', href: '/services/cloud-infrastructure/cloud-architecture', planned: true },
      { label: 'Cloud Migration', href: '/services/cloud-infrastructure/cloud-migration', planned: true },
      { label: 'AWS Engineering', href: '/services/cloud-infrastructure/aws-engineering', planned: true },
      { label: 'Azure Engineering', href: '/services/cloud-infrastructure/azure-engineering', planned: true },
      { label: 'DevOps', href: '/services/cloud-infrastructure/devops', planned: true },
      { label: 'CI/CD', href: '/services/cloud-infrastructure/ci-cd', planned: true },
      { label: 'Infrastructure as Code', href: '/services/cloud-infrastructure/infrastructure-as-code', planned: true },
      { label: 'Kubernetes', href: '/services/cloud-infrastructure/kubernetes', planned: true },
      { label: 'Monitoring & Observability', href: '/services/cloud-infrastructure/monitoring-observability', planned: true },
    ],
  },
  {
    key: 'data-analytics',
    label: 'Data & Analytics',
    blurb: 'Pipelines, warehousing, BI, and predictive analytics.',
    items: [
      { label: 'Data Engineering', href: '/services/data-analytics/data-engineering', planned: true },
      { label: 'Data Warehousing', href: '/services/data-analytics/data-warehousing', planned: true },
      { label: 'ETL & Data Pipelines', href: '/services/data-analytics/etl-pipelines', planned: true },
      { label: 'Business Intelligence', href: '/services/data-analytics/business-intelligence', planned: true },
      { label: 'Executive Dashboards', href: '/services/data-analytics/executive-dashboards', planned: true },
      { label: 'Predictive Analytics', href: '/services/data-analytics/predictive-analytics', planned: true },
    ],
  },
  {
    key: 'security',
    label: 'Security',
    blurb: 'Secure architecture, identity, and compliance-readiness.',
    items: [
      { label: 'Secure Software Architecture', href: '/services/security/secure-architecture', planned: true },
      { label: 'Authentication & Authorization', href: '/services/security/authentication-authorization', planned: true },
      { label: 'SSO & Enterprise Identity', href: '/services/security/sso-enterprise-identity', planned: true },
      { label: 'Role-Based Access Control', href: '/services/security/rbac', planned: true },
      { label: 'Audit Logging', href: '/services/security/audit-logging', planned: true },
      { label: 'Application Security', href: '/services/security/application-security', planned: true },
      { label: 'Compliance-Readiness Engineering', href: '/services/security/compliance-readiness', planned: true },
    ],
  },
  {
    key: 'digital-transformation',
    label: 'Digital Transformation',
    blurb: 'Modernization, automation, and technology roadmaps.',
    items: [
      { label: 'Legacy-System Modernization', href: '/services/digital-transformation/legacy-modernization', planned: true },
      { label: 'Business Process Automation', href: '/services/digital-transformation/process-automation', planned: true },
      { label: 'Operational Systems Integration', href: '/services/digital-transformation/systems-integration', planned: true },
      { label: 'Digital Strategy', href: '/services/digital-transformation/digital-strategy', planned: true },
      { label: 'Technology Roadmaps', href: '/services/digital-transformation/technology-roadmaps', planned: true },
      { label: 'Architecture Assessments', href: '/services/digital-transformation/architecture-assessments', planned: true },
    ],
  },
  {
    key: 'team-services',
    label: 'Team Services',
    blurb: 'Dedicated teams, staff augmentation, and advisory.',
    items: [
      { label: 'Dedicated Development Teams', href: '/services/team-services/dedicated-teams', planned: true },
      { label: 'Staff Augmentation', href: '/services/team-services/staff-augmentation', planned: true },
      { label: 'Technical Consulting', href: '/services/team-services/technical-consulting', planned: true },
      { label: 'Fractional CTO', href: '/services/team-services/fractional-cto', planned: true },
      { label: 'Architecture Reviews', href: '/services/team-services/architecture-reviews', planned: true },
      { label: 'Codebase Audits', href: '/services/team-services/codebase-audits', planned: true },
    ],
  },
];

export const PRIMARY_NAV = [
  { label: 'Services', href: '/services', mega: true },
  { label: 'Solutions', href: '/solutions' },
  { label: 'Industries', href: '/industries' },
  { label: 'Technologies', href: '/technologies' },
  { label: 'Case Studies', href: '/case-studies' },
  { label: 'Resources', href: '/resources' },
  { label: 'Company', href: '/company' },
] as const;
