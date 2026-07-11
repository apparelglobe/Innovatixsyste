import { ArrowRight, ShieldCheck, GaugeCircle, Boxes, Bot, Cloud, Database, Lock, Workflow } from 'lucide-react';
import { Container, Section, Button, Badge, Metric, Card, CaseStudyCard } from '@innovatix/ui';
import { SERVICE_CATEGORIES } from '@/lib/nav';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'software-engineering': <Boxes size={22} />,
  'ai-services': <Bot size={22} />,
  'enterprise-systems': <Workflow size={22} />,
  'cloud-infrastructure': <Cloud size={22} />,
  'data-analytics': <Database size={22} />,
  security: <Lock size={22} />,
  'digital-transformation': <GaugeCircle size={22} />,
  'team-services': <ShieldCheck size={22} />,
};

const INDUSTRIES = ['Manufacturing', 'Wholesale & Distribution', 'Logistics', 'Healthcare', 'Retail', 'E-commerce', 'Professional Services'];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-ink text-white">
        <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_70%_10%,rgba(79,70,229,0.35),transparent)]" />
        <Container className="relative py-20 md:py-28">
          <Badge className="bg-white/10 text-accent">Enterprise Software Company</Badge>
          <h1 className="mt-5 max-w-4xl text-4xl font-extrabold leading-[1.08] tracking-tight md:text-6xl">
            Enterprise software, AI, and platforms — engineered to run your business as one system.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-neutral-300">
            Innovatix Systems builds the software your operations run on — custom platforms, enterprise systems,
            and AI automation — to enterprise standards, with a connected client portal for full transparency.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button href="/contact/book" size="lg">Book a Consultation <ArrowRight size={18} /></Button>
            <Button href="/case-studies" size="lg" variant="ghost">See our work</Button>
          </div>
        </Container>
      </section>

      {/* Proof / trust bar */}
      <Section tone="muted" className="py-10 md:py-12">
        <Container>
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-neutral-500">
            Real systems, engineered to enterprise standards
          </p>
          <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-4">
            <Metric value="90k+" label="Live SKUs managed on a platform we engineered" />
            <Metric value="3" label="Sales channels unified (Amazon, Walmart, D2C)" />
            <Metric value="Multi-carrier" label="USPS · UPS · FedEx fulfillment" />
            <Metric value="Secure by default" label="RBAC, audit logging, CI/CD" />
          </div>
        </Container>
      </Section>

      {/* Capability grid (8 categories) */}
      <Section>
        <Container>
          <div className="max-w-2xl">
            <h2 className="text-3xl font-extrabold tracking-tight text-ink md:text-4xl">What we engineer</h2>
            <p className="mt-3 text-neutral-600">Eight enterprise capability areas, delivered by one team on one connected platform.</p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {SERVICE_CATEGORIES.map((cat) => (
              <Card key={cat.key} className="flex flex-col">
                <span className="grid h-11 w-11 place-items-center rounded-btn bg-primary/10 text-primary">
                  {CATEGORY_ICONS[cat.key]}
                </span>
                <h3 className="mt-4 text-base font-bold text-ink">{cat.label}</h3>
                <p className="mt-1 flex-1 text-sm text-neutral-600">{cat.blurb}</p>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      {/* Differentiator band — the connected portal */}
      <Section tone="ink">
        <Container className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <Badge className="bg-white/10 text-accent">The Innovatix difference</Badge>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight md:text-4xl">
              You never disappear into a development black box.
            </h2>
            <p className="mt-4 text-neutral-300">
              Every client gets a connected portal: real-time project tracking, daily and weekly development reports,
              milestone approvals, documentation, contracts, invoices, and support — so you always know exactly
              where your project stands, without having to ask.
            </p>
            <div className="mt-6">
              <Button href="/company/process" variant="ghost">How we deliver <ArrowRight size={16} /></Button>
            </div>
          </div>
          <Card className="bg-white/5 border-white/10">
            <ul className="space-y-3 text-sm text-neutral-200">
              {['Live project % complete & milestone timeline', 'AI-summarized daily & weekly dev reports', 'Milestone approvals with full audit trail', 'Contracts, invoices, and files in one place', 'Direct messaging with your delivery team'].map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <ShieldCheck size={18} className="mt-0.5 shrink-0 text-accent" /> {f}
                </li>
              ))}
            </ul>
          </Card>
        </Container>
      </Section>

      {/* Industries */}
      <Section tone="muted">
        <Container>
          <h2 className="text-2xl font-extrabold tracking-tight text-ink md:text-3xl">Industries we serve</h2>
          <div className="mt-6 flex flex-wrap gap-3">
            {INDUSTRIES.map((i) => (
              <span key={i} className="rounded-pill border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700">{i}</span>
            ))}
          </div>
        </Container>
      </Section>

      {/* Case studies */}
      <Section>
        <Container>
          <h2 className="text-3xl font-extrabold tracking-tight text-ink md:text-4xl">Proof, not promises</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <CaseStudyCard
              eyebrow="Multi-channel commerce"
              title="Apparel Globe — an operations platform for a multi-channel apparel business"
              outcome="ERP, OMS, WMS, customer & vendor portals, marketplace + shipping integrations, and AI automation — 90,000+ SKUs across 3 channels."
              href="/case-studies/apparel-globe"
            />
            <CaseStudyCard
              eyebrow="Healthcare · security-first"
              title="MedJAAF — a security-first healthcare operations platform"
              outcome="Multi-tenant, security-first architecture with audit logging and enterprise authentication. Details published on verification."
              href="/case-studies/medjaaf"
            />
          </div>
        </Container>
      </Section>

      {/* Final CTA */}
      <Section tone="ink" className="py-16">
        <Container className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight md:text-3xl">Let&apos;s scope your system.</h2>
            <p className="mt-2 text-neutral-300">A focused consultation to map your goals, constraints, and the fastest path to value.</p>
          </div>
          <Button href="/contact/book" size="lg">Book a Consultation <ArrowRight size={18} /></Button>
        </Container>
      </Section>
    </>
  );
}
