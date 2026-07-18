import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';
import { Container, Section, Button, Badge, Eyebrow, Card } from '@innovatix/ui';
import { pageMetadata, breadcrumbJsonLd } from '@/lib/seo';
import { JsonLd } from '@/components/JsonLd';

export const metadata: Metadata = pageMetadata({
  title: 'Company | Innovatix Systems',
  description:
    'Innovatix Systems is an enterprise software company that builds the custom platforms, enterprise systems, and AI automation businesses run on — with full delivery transparency through a connected client portal.',
  path: '/company',
  index: true,
});

const PRINCIPLES = [
  { name: 'Transparency by default', body: 'Every engagement runs through a connected client portal — live progress, milestone approvals, reports, files, and invoices in one place. You never disappear into a development black box.' },
  { name: 'No source, no claim', body: 'Our reports summarize verified activity only, and client-facing reports require human approval. We would rather say less than overstate.' },
  { name: 'Systems, not silos', body: 'We design around one authoritative source of truth so orders, inventory, finance, and operations stay in sync — instead of fragmented tools that force manual reconciliation.' },
  { name: 'Security from the start', body: 'Access control, tenant isolation, audit logging, and malware scanning are foundational in how we build, not bolted on later.' },
  { name: 'Own what we build', body: 'We build custom software you own and can evolve — no per-seat lock-in, no misfit packaged product dictating how you operate.' },
  { name: 'Scoped and predictable', body: 'Work is scoped, priced, and approved before it starts. Change requests come with clear scope, cost, and timeline impact.' },
];

const WHAT_WE_DO = [
  { name: 'Software Engineering', href: '/services/software-engineering', body: 'Custom and enterprise software, APIs, and systems integration.' },
  { name: 'AI Services', href: '/services/ai-services', body: 'AI automation, agents, and document intelligence for real operational work.' },
  { name: 'Enterprise Systems', href: '/services/enterprise-systems', body: 'ERP, CRM, and warehouse, inventory, and order-management systems.' },
  { name: 'Cloud & Infrastructure', href: '/services/cloud-infrastructure', body: 'Cloud architecture engineered for reliability at scale.' },
];

export default function Page() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Company', path: '/company' }])} />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line bg-base">
        <div className="pointer-events-none absolute inset-0 bg-hero-glow" />
        <Container className="relative py-16 md:py-20">
          <Badge>Company</Badge>
          <h1 className="mt-4 max-w-3xl text-3xl font-extrabold tracking-tight text-white md:text-5xl">
            We build the systems businesses run on
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-neutral-300">
            Innovatix Systems is an enterprise software company. We engineer custom platforms, enterprise systems, and AI
            automation — and we deliver them with full transparency, so you always know exactly where your project
            stands.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button href="/book" size="lg">Book a Consultation <ArrowRight size={18} /></Button>
            <Button href="/company/process" size="lg" variant="secondary">See how we deliver</Button>
          </div>
        </Container>
      </section>

      {/* Mission */}
      <Section>
        <Container className="max-w-3xl">
          <Eyebrow>What we’re about</Eyebrow>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-white md:text-3xl">
            Enterprise software, engineered to run your business as one system
          </h2>
          <p className="mt-4 leading-relaxed text-neutral-300">
            Most growing businesses end up stitched together from tools that were never meant to work as one — orders in
            one place, inventory in another, finance in a third. We build the connected software that replaces that
            fragmentation with a single operational source of truth, tailored to how your business actually works.
          </p>
          <p className="mt-4 leading-relaxed text-neutral-300">
            And we do it in the open. A connected client portal gives you live progress, verified reports, milestone
            approvals, and every contract and invoice in one place — because you deserve to see the work, not just the
            demo.
          </p>
        </Container>
      </Section>

      {/* Principles */}
      <Section tone="gradient" className="border-y border-line">
        <Container>
          <Eyebrow>How we work</Eyebrow>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-white md:text-3xl">Principles we build by</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {PRINCIPLES.map((p) => (
              <Card key={p.name}>
                <h3 className="text-base font-bold text-white">{p.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-400">{p.body}</p>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      {/* What we do */}
      <Section>
        <Container>
          <Eyebrow>What we do</Eyebrow>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-white md:text-3xl">Four areas, one connected system</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {WHAT_WE_DO.map((s) => (
              <a key={s.name} href={s.href} className="group">
                <Card className="h-full transition-colors group-hover:border-primary/50">
                  <h3 className="text-base font-bold text-white">{s.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-400">{s.body}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                    Explore <ArrowRight size={14} />
                  </span>
                </Card>
              </a>
            ))}
          </div>
          <div className="mt-10">
            <Button href="/book" size="lg">Start a conversation <ArrowRight size={18} /></Button>
          </div>
        </Container>
      </Section>
    </>
  );
}
