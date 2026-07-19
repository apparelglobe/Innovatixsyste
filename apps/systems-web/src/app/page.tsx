import { ArrowRight, PlayCircle, ShieldCheck, GaugeCircle, LayoutDashboard, Code2, Bot, Layers, Lock } from 'lucide-react';
import { Container, Section, Button, Badge, Eyebrow } from '@innovatix/ui';
import { PortalOverviewMockup, MiniDashboard } from '@/components/Mockups';

const TRUST = [
  { icon: <ShieldCheck size={18} />, title: 'Enterprise Grade', body: 'Secure & compliant by default' },
  { icon: <GaugeCircle size={18} />, title: 'Proven Results', body: '90K+ SKUs on a platform we built' },
  { icon: <LayoutDashboard size={18} />, title: 'Full Transparency', body: 'Connected client portal' },
];

const INTEGRATIONS = ['Amazon', 'Walmart', 'FedEx', 'UPS', 'USPS'];

const FEATURES = [
  { icon: <Code2 size={22} />, tint: 'bg-blue-50 text-primary', title: 'Custom Software', body: 'Scalable, secure, and tailored to your business needs.', cta: 'Explore Services', href: '/services/software-engineering' },
  { icon: <Bot size={22} />, tint: 'bg-violet-50 text-violet-600', title: 'AI & Automation', body: 'Intelligent solutions to automate processes and boost productivity.', cta: 'Explore Solutions', href: '/services/ai-services' },
  { icon: <Layers size={22} />, tint: 'bg-emerald-50 text-emerald-600', title: 'Enterprise Platforms', body: 'Power your operations with robust, integrated enterprise platforms.', cta: 'Learn More', href: '/services/enterprise-systems' },
  { icon: <Lock size={22} />, tint: 'bg-amber-50 text-amber-600', title: 'Security First', body: 'Built with compliance, security, and reliability at the core.', cta: 'Our Approach', href: '/services/security' },
];

const CASES = [
  { href: '/case-studies/apparel-globe', variant: 'light' as const, eyebrow: 'Multi-channel commerce', title: 'Apparel Globe', body: 'ERP, OMS, WMS, portals, marketplace + shipping integrations, and AI automation — one connected platform.' },
  { href: '/case-studies/medjaaf', variant: 'dark' as const, eyebrow: 'Healthcare · security-first', title: 'MedJAAF', body: 'Multi-tenant, security-first architecture with audit logging and enterprise authentication.' },
];

export default function HomePage() {
  return (
    <>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden border-b border-neutral-200 bg-white">
        <div className="pointer-events-none absolute inset-0 bg-grid-faint bg-grid opacity-70" />
        <div className="pointer-events-none absolute inset-0 bg-hero-glow" />
        <Container className="relative grid items-center gap-12 py-16 md:py-20 lg:grid-cols-2">
          <div>
            <Badge>Enterprise Software Company</Badge>
            <h1 className="mt-5 max-w-xl text-4xl font-extrabold leading-[1.05] tracking-tight text-neutral-900 md:text-6xl">
              One Platform.<br />Unlimited Possibilities.<br /><span className="text-gradient">Built for Your Business.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-neutral-600">
              Innovatix Systems delivers custom software, AI solutions, and platforms that power operations, drive
              efficiency, and accelerate growth — all through one connected ecosystem.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button href="/book" size="lg" data-cta="Book a Consultation" data-cta-loc="hero">Book a Consultation <ArrowRight size={18} /></Button>
              <Button href="/company/process" size="lg" variant="secondary" data-cta="See how it works" data-cta-loc="hero"><PlayCircle size={18} /> See how it works</Button>
            </div>
            <div className="mt-9 grid gap-5 sm:grid-cols-3">
              {TRUST.map((t) => (
                <div key={t.title} className="flex items-start gap-2.5">
                  <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-primary">{t.icon}</span>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-neutral-900">{t.title}</div>
                    <div className="text-xs text-neutral-500">{t.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="lg:pl-4"><PortalOverviewMockup /></div>
        </Container>
      </section>

      {/* ── Integrations strip (honest: what we connect, not clients) ── */}
      <Section tone="lightAlt" className="border-b border-neutral-200 py-12">
        <Container>
          <p className="text-center text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
            Connects the platforms you already run on
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-12 gap-y-5">
            {INTEGRATIONS.map((name) => (
              <span key={name} className="text-xl font-extrabold tracking-tight text-neutral-400 sm:text-2xl">{name}</span>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-neutral-400">
            Marketplace &amp; carrier integrations shown are platforms our software connects to — not client endorsements.
          </p>
        </Container>
      </Section>

      {/* ── Feature cards ── */}
      <Section tone="light">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow>What we build</Eyebrow>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-neutral-900 md:text-4xl">Everything your operations need, engineered as one system</h2>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex flex-col rounded-2xl border border-neutral-200 bg-white p-6 shadow-card transition hover:-translate-y-0.5 hover:shadow-pop">
                <span className={`grid h-12 w-12 place-items-center rounded-xl ${f.tint}`}>{f.icon}</span>
                <h3 className="mt-5 text-lg font-bold text-neutral-900">{f.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-neutral-500">{f.body}</p>
                <a href={f.href} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:gap-1.5">
                  {f.cta} <ArrowRight size={14} />
                </a>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* ── Case studies (real proof) ── */}
      <Section tone="lightAlt" className="border-y border-neutral-200">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow>Proof, not promises</Eyebrow>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-neutral-900 md:text-4xl">Systems we&apos;ve engineered</h2>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {CASES.map((c) => (
              <a key={c.href} href={c.href} className="group grid grid-cols-[150px_1fr] gap-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-card transition hover:border-primary/40 hover:shadow-pop sm:grid-cols-[190px_1fr]">
                <div className="aspect-[4/3] w-full overflow-hidden rounded-lg"><MiniDashboard variant={c.variant} /></div>
                <div className="py-1">
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

      {/* ── Blue CTA banner ── */}
      <Section tone="light">
        <Container>
          <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-10 shadow-cta md:px-12 md:py-12">
            <div className="pointer-events-none absolute inset-0 bg-grid-faint bg-grid opacity-20" />
            <div className="relative flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
              <div className="flex items-start gap-4">
                <span className="hidden h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/15 text-white sm:grid"><LayoutDashboard size={26} /></span>
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-white md:text-3xl">Let&apos;s Build Something Great Together</h2>
                  <p className="mt-1.5 max-w-xl text-blue-100">Tell us about your goals and we&apos;ll craft the right solution for your business.</p>
                </div>
              </div>
              <a href="/book" data-cta="Book a Free Consultation" data-cta-loc="footer-cta"
                className="inline-flex h-[3.25rem] shrink-0 items-center gap-2 rounded-btn bg-white px-7 text-base font-semibold text-primary shadow-lg transition hover:bg-blue-50">
                Book a Free Consultation <ArrowRight size={18} />
              </a>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
