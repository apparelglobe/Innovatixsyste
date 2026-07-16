import { ArrowRight, ShieldCheck, GaugeCircle, Boxes, Bot, Cloud, Database, Lock, Workflow, Check, SquareArrowOutUpRight, ShoppingCart, Truck, Search, DraftingCompass, Package, Rocket } from 'lucide-react';
import { Container, Section, Button, Badge, Eyebrow, Card } from '@innovatix/ui';
import { SERVICE_CATEGORIES } from '@/lib/nav';
import { HeroProjectMockup, PortalOverviewMockup, MiniDashboard } from '@/components/Mockups';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'software-engineering': <Boxes size={20} />,
  'ai-services': <Bot size={20} />,
  'enterprise-systems': <Workflow size={20} />,
  'cloud-infrastructure': <Cloud size={20} />,
  'data-analytics': <Database size={20} />,
  security: <Lock size={20} />,
  'digital-transformation': <GaugeCircle size={20} />,
  'team-services': <ShieldCheck size={20} />,
};

const INDUSTRIES = ['Manufacturing', 'Wholesale & Distribution', 'Logistics', 'Healthcare', 'Retail', 'E-commerce', 'Professional Services'];

const PROOF = [
  { icon: <SquareArrowOutUpRight size={18} />, value: '90K+', label: 'Live SKUs managed on a platform we engineered' },
  { icon: <ShoppingCart size={18} />, value: '3', label: 'Sales channels unified (Amazon, Walmart, D2C)' },
  { icon: <Truck size={18} />, value: 'Multi-carrier', label: 'USPS · UPS · FedEx fulfillment' },
  { icon: <ShieldCheck size={18} />, value: 'Secure by default', label: 'RBAC, audit logging, CI/CD' },
];

const PROCESS = [
  { n: '01', icon: <Search size={18} />, name: 'Discover', body: 'We understand your business, goals, and technical landscape.' },
  { n: '02', icon: <DraftingCompass size={18} />, name: 'Architect', body: 'We design the right solution for scale, security, and impact.' },
  { n: '03', icon: <Package size={18} />, name: 'Build', body: 'We engineer, test, and deliver with full transparency.' },
  { n: '04', icon: <Rocket size={18} />, name: 'Launch', body: 'We deploy, monitor, and ensure long-term success.' },
];

export default function HomePage() {
  return (
    <>
      {/* ── Hero (dark, two-column with product visual) ── */}
      <section className="relative overflow-hidden border-b border-line bg-base">
        <div className="pointer-events-none absolute inset-0 bg-grid-faint bg-grid opacity-60" />
        <div className="pointer-events-none absolute inset-0 bg-hero-glow" />
        <Container className="relative grid items-center gap-12 py-16 md:py-24 lg:grid-cols-2">
          <div>
            <Badge>Enterprise Software Company</Badge>
            <h1 className="mt-6 max-w-xl text-4xl font-extrabold leading-[1.08] tracking-tight text-white md:text-5xl">
              Enterprise software, AI, and platforms —{' '}
              <span className="text-gradient">engineered to run your business as one system.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-neutral-300">
              Innovatix Systems builds the software your operations run on — custom platforms, enterprise
              systems, and AI automation — to enterprise standards, with a connected client portal for full transparency.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button href="/book" size="lg" data-cta="Book a Consultation" data-cta-loc="hero">Book a Consultation <ArrowRight size={18} /></Button>
              <Button href="/case-studies" size="lg" variant="secondary" data-cta="See our work" data-cta-loc="hero">See our work</Button>
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-neutral-400">
              {['Custom-built, not off-the-shelf', 'Secure by default', 'Full delivery transparency'].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5"><Check size={15} className="text-primary-light" /> {t}</span>
              ))}
            </div>
          </div>
          <div className="lg:pl-4">
            <HeroProjectMockup />
          </div>
        </Container>
      </section>

      {/* ── Proof / trust bar (light, icon tiles) ── */}
      <Section tone="light" className="border-b border-neutral-200 py-12 md:py-16">
        <Container>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {PROOF.map((p) => (
              <div key={p.label} className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-neutral-200 bg-neutral-50 text-primary">{p.icon}</span>
                <div className="min-w-0">
                  <div className="text-xl font-extrabold tracking-tight text-neutral-900">{p.value}</div>
                  <div className="mt-0.5 text-sm text-neutral-500">{p.label}</div>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* ── Capability grid (light) ── */}
      <Section tone="light">
        <Container className="grid gap-10 lg:grid-cols-[300px_1fr]">
          <div>
            <Eyebrow className="text-primary">What we engineer</Eyebrow>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-neutral-900 md:text-4xl">
              Eight enterprise capabilities, one delivery team
            </h2>
            <p className="mt-3 text-neutral-500">
              From custom platforms to AI automation — delivered by one team on one connected platform, to a single standard.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
            {SERVICE_CATEGORIES.map((cat) => (
              <a
                key={cat.key}
                href={`/services/${cat.key}`}
                className="group flex flex-col rounded-xl border border-neutral-200 bg-white p-5 transition hover:border-primary/50 hover:shadow-lg"
              >
                <span className="grid h-10 w-10 place-items-center rounded-lg border border-neutral-200 bg-neutral-50 text-primary">
                  {CATEGORY_ICONS[cat.key]}
                </span>
                <h3 className="mt-4 text-base font-bold text-neutral-900 group-hover:text-primary">{cat.label}</h3>
                <p className="mt-1.5 text-sm text-neutral-500">{cat.blurb}</p>
              </a>
            ))}
          </div>
        </Container>
      </Section>

      {/* ── Industries (light) ── */}
      <Section tone="light" className="border-t border-neutral-200 py-12">
        <Container className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-xl font-extrabold tracking-tight text-neutral-900">Industries we serve</h2>
          <div className="flex flex-wrap gap-2.5">
            {INDUSTRIES.map((i) => (
              <span key={i} className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-sm font-medium text-neutral-700">
                <Check size={13} className="text-primary" /> {i}
              </span>
            ))}
          </div>
        </Container>
      </Section>

      {/* ── Differentiator band — the connected portal (dark, product visual) ── */}
      <section className="relative overflow-hidden border-y border-line bg-base">
        <div className="pointer-events-none absolute inset-0 bg-hero-glow" />
        <Container className="relative grid items-center gap-12 py-16 md:py-24 lg:grid-cols-2">
          <div>
            <Eyebrow>Built for transparency</Eyebrow>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-white md:text-4xl">
              A connected platform. Complete visibility.
            </h2>
            <p className="mt-4 leading-relaxed text-neutral-300">
              Our client portal gives you real-time project tracking, daily and weekly reports, milestone
              approvals, contracts, invoices, and files — all in one place.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-neutral-200">
              {[
                'Live project progress & milestone timeline',
                'AI-summarized development reports',
                'Contracts, invoices & files in one place',
                'Direct messaging with your delivery team',
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/15 text-primary-light"><Check size={12} /></span>
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-7">
              <Button href="/company/process" variant="secondary">See the platform in action <ArrowRight size={16} /></Button>
            </div>
          </div>
          <div className="lg:pl-4"><PortalOverviewMockup /></div>
        </Container>
      </section>

      {/* ── Case studies (light, with product thumbnails) ── */}
      <Section tone="light">
        <Container>
          <Eyebrow className="text-primary">Proof, not promises</Eyebrow>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-neutral-900 md:text-4xl">Systems we&apos;ve engineered</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {[
              { href: '/case-studies/apparel-globe', variant: 'dark' as const, eyebrow: 'Multi-channel commerce', title: 'Apparel Globe', body: 'ERP, OMS, WMS, portals, marketplace + shipping integrations, and AI automation. Verified metrics published on the case study.' },
              { href: '/case-studies/medjaaf', variant: 'light' as const, eyebrow: 'Healthcare · security-first', title: 'MedJAAF', body: 'Multi-tenant, security-first architecture with audit logging and enterprise authentication.' },
            ].map((c) => (
              <a key={c.href} href={c.href} className="group grid grid-cols-[140px_1fr] gap-4 rounded-xl border border-neutral-200 bg-white p-4 transition hover:border-primary/50 hover:shadow-lg sm:grid-cols-[180px_1fr]">
                <div className="aspect-[4/3] w-full"><MiniDashboard variant={c.variant} /></div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-primary">{c.eyebrow}</div>
                  <h3 className="mt-1 text-lg font-bold text-neutral-900 group-hover:text-primary">{c.title}</h3>
                  <p className="mt-1.5 text-sm text-neutral-500">{c.body}</p>
                  <span className="mt-3 inline-block text-sm font-semibold text-primary">Read case study →</span>
                </div>
              </a>
            ))}
          </div>
        </Container>
      </Section>

      {/* ── Process (light gray) ── */}
      <Section tone="lightAlt" className="border-t border-neutral-200">
        <Container>
          <Eyebrow className="text-primary">Our process</Eyebrow>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-neutral-900 md:text-3xl">
            Built with clarity. Delivered with confidence.
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PROCESS.map((p) => (
              <div key={p.n} className="relative">
                <span className="grid h-11 w-11 place-items-center rounded-lg border border-neutral-200 bg-white text-primary shadow-sm">{p.icon}</span>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-sm font-black text-primary/40">{p.n}</span>
                  <h3 className="text-base font-bold text-neutral-900">{p.name}</h3>
                </div>
                <p className="mt-1.5 text-sm text-neutral-500">{p.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* ── Final CTA (dark) ── */}
      <section className="relative overflow-hidden border-t border-line bg-base">
        <div className="pointer-events-none absolute inset-0 bg-hero-glow" />
        <Container className="relative flex flex-col items-start justify-between gap-6 py-16 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-white md:text-3xl">Ready to build what&apos;s next?</h2>
            <p className="mt-2 max-w-lg text-neutral-300">Let&apos;s discuss your goals and build a roadmap for a system that drives real results.</p>
          </div>
          <Button href="/book" size="lg" data-cta="Book a Consultation" data-cta-loc="footer-cta">Book a Consultation <ArrowRight size={18} /></Button>
        </Container>
      </section>
    </>
  );
}
