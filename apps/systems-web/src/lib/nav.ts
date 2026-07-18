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
      { label: 'Enterprise Software Development', href: '/services/software-engineering/enterprise-software-development' },
      { label: 'SaaS Product Development', href: '/services/software-engineering/saas-product-development' },
      { label: 'Web Application Development', href: '/services/software-engineering/web-application-development' },
      { label: 'Mobile Application Development', href: '/services/software-engineering/mobile-application-development' },
      { label: 'Legacy Software Modernization', href: '/services/software-engineering/legacy-modernization' },
      { label: 'API Development', href: '/services/software-engineering/api-development' },
      { label: 'Systems Integration', href: '/services/software-engineering/systems-integration' },
      { label: 'Software Maintenance & Support', href: '/services/software-engineering/maintenance-support' },
    ],
  },
  {
    key: 'ai-services',
    label: 'AI Services',
    blurb: 'Automation, agents, and generative AI in production.',
    items: [
      { label: 'AI Strategy & Consulting', href: '/services/ai-services/ai-strategy-consulting' },
      { label: 'AI Automation', href: '/services/ai-services/ai-automation' },
      { label: 'AI Agents', href: '/services/ai-services/ai-agents' },
      { label: 'Generative AI Applications', href: '/services/ai-services/generative-ai' },
      { label: 'Retrieval-Augmented Generation', href: '/services/ai-services/rag' },
      { label: 'AI Chatbots & Assistants', href: '/services/ai-services/chatbots-assistants' },
      { label: 'Document Intelligence', href: '/services/ai-services/document-intelligence' },
      { label: 'Intelligent Workflow Automation', href: '/services/ai-services/workflow-automation' },
      { label: 'AI Integration', href: '/services/ai-services/ai-integration' },
    ],
  },
  {
    key: 'enterprise-systems',
    label: 'Enterprise Systems',
    blurb: 'ERP, CRM, WMS, OMS, and operations platforms.',
    items: [
      { label: 'ERP Development', href: '/services/enterprise-systems/erp-development' },
      { label: 'CRM Development', href: '/services/enterprise-systems/crm-development' },
      { label: 'Warehouse Management Systems', href: '/services/enterprise-systems/warehouse-management-systems' },
      { label: 'Inventory Management Systems', href: '/services/enterprise-systems/inventory-management-systems' },
      { label: 'Order Management Systems', href: '/services/enterprise-systems/order-management-systems' },
      { label: 'Customer Portals', href: '/services/enterprise-systems/customer-portals' },
      { label: 'Vendor Portals', href: '/services/enterprise-systems/vendor-portals' },
      { label: 'Finance & AR Systems', href: '/services/enterprise-systems/finance-ar-systems' },
      { label: 'Business Operations Platforms', href: '/services/enterprise-systems/business-operations-platforms' },
    ],
  },
  {
    key: 'cloud-infrastructure',
    label: 'Cloud & Infrastructure',
    blurb: 'Cloud architecture, DevOps, and reliability.',
    items: [
      { label: 'Cloud Architecture', href: '/services/cloud-infrastructure/cloud-architecture' },
      { label: 'Cloud Migration', href: '/services/cloud-infrastructure/cloud-migration' },
      { label: 'AWS Engineering', href: '/services/cloud-infrastructure/aws-engineering' },
      { label: 'Azure Engineering', href: '/services/cloud-infrastructure/azure-engineering' },
      { label: 'DevOps', href: '/services/cloud-infrastructure/devops' },
      { label: 'CI/CD', href: '/services/cloud-infrastructure/ci-cd' },
      { label: 'Infrastructure as Code', href: '/services/cloud-infrastructure/infrastructure-as-code' },
      { label: 'Kubernetes', href: '/services/cloud-infrastructure/kubernetes' },
      { label: 'Monitoring & Observability', href: '/services/cloud-infrastructure/monitoring-observability' },
    ],
  },
  {
    key: 'data-analytics',
    label: 'Data & Analytics',
    blurb: 'Pipelines, warehousing, BI, and predictive analytics.',
    items: [
      { label: 'Data Engineering', href: '/services/data-analytics/data-engineering' },
      { label: 'Data Warehousing', href: '/services/data-analytics/data-warehousing' },
      { label: 'ETL & Data Pipelines', href: '/services/data-analytics/etl-pipelines' },
      { label: 'Business Intelligence', href: '/services/data-analytics/business-intelligence' },
      { label: 'Executive Dashboards', href: '/services/data-analytics/executive-dashboards' },
      { label: 'Predictive Analytics', href: '/services/data-analytics/predictive-analytics' },
    ],
  },
  {
    key: 'security',
    label: 'Security',
    blurb: 'Secure architecture, identity, and compliance-readiness.',
    items: [
      { label: 'Secure Software Architecture', href: '/services/security/secure-architecture' },
      { label: 'Authentication & Authorization', href: '/services/security/authentication-authorization' },
      { label: 'SSO & Enterprise Identity', href: '/services/security/sso-enterprise-identity' },
      { label: 'Role-Based Access Control', href: '/services/security/rbac' },
      { label: 'Audit Logging', href: '/services/security/audit-logging' },
      { label: 'Application Security', href: '/services/security/application-security' },
      { label: 'Compliance-Readiness Engineering', href: '/services/security/compliance-readiness' },
    ],
  },
  {
    key: 'digital-transformation',
    label: 'Digital Transformation',
    blurb: 'Modernization, automation, and technology roadmaps.',
    items: [
      { label: 'Legacy-System Modernization', href: '/services/digital-transformation/legacy-modernization' },
      { label: 'Business Process Automation', href: '/services/digital-transformation/process-automation' },
      { label: 'Operational Systems Integration', href: '/services/digital-transformation/systems-integration' },
      { label: 'Digital Strategy', href: '/services/digital-transformation/digital-strategy' },
      { label: 'Technology Roadmaps', href: '/services/digital-transformation/technology-roadmaps' },
      { label: 'Architecture Assessments', href: '/services/digital-transformation/architecture-assessments' },
    ],
  },
  {
    key: 'team-services',
    label: 'Team Services',
    blurb: 'Dedicated teams, staff augmentation, and advisory.',
    items: [
      { label: 'Dedicated Development Teams', href: '/services/team-services/dedicated-teams' },
      { label: 'Staff Augmentation', href: '/services/team-services/staff-augmentation' },
      { label: 'Technical Consulting', href: '/services/team-services/technical-consulting' },
      { label: 'Fractional CTO', href: '/services/team-services/fractional-cto' },
      { label: 'Architecture Reviews', href: '/services/team-services/architecture-reviews' },
      { label: 'Codebase Audits', href: '/services/team-services/codebase-audits' },
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
