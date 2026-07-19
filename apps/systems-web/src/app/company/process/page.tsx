import type { Metadata } from 'next';
import { ArrowRight, Check } from 'lucide-react';
import { Container, Section, Button, Badge, Eyebrow, Card } from '@innovatix/ui';
import { pageMetadata, breadcrumbJsonLd } from '@/lib/seo';
import { JsonLd } from '@/components/JsonLd';

export const metadata: Metadata = pageMetadata({
  title: 'Our Delivery Process | Innovatix Systems',
  description:
    'How Innovatix Systems delivers software: a transparent, milestone-driven process — discovery, architecture, build, QA and UAT, deployment, and support — with a connected client portal so you always know where your project stands.',
  path: '/company/process',
  index: true,
});

const PHASES = [
  { n: '01', name: 'Discovery', body: 'We map your goals, constraints, existing systems, users, and success metrics — then document a solution architecture. You approve the plan before development begins.' },
  { n: '02', name: 'Architecture', body: 'We design the data model, system boundaries, integrations, and security model for scale and reliability, so the platform grows without a rewrite.' },
  { n: '03', name: 'Build', body: 'We ship in focused sprints. Every day and week, you see progress in your portal — what shipped, what is next, and any risks — no status-chasing required.' },
  { n: '04', name: 'QA & UAT', body: 'Automated tests plus your user-acceptance testing against a clear definition of done. Nothing is “done” until it passes and you have signed off.' },
  { n: '05', name: 'Deploy & Hypercare', body: 'A controlled release with a rollback plan, followed by hypercare — close monitoring and rapid response while the system beds in.' },
  { n: '06', name: 'Support & Evolve', body: 'Ongoing maintenance, monitoring, and enhancement. Change requests are scoped, priced, and approved before any out-of-scope work begins.' },
];

const PORTAL = [
  'Live project percentage and milestone timeline',
  'AI-summarized daily and weekly development reports (verified data only)',
  'Milestone approvals with a full audit trail',
  'Contracts, invoices, and files in one place',
  'Direct messaging with your delivery team',
  'Change requests with scope, cost, and timeline impact',
];

export default function ProcessPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Company', path: '/company' },
          { name: 'Process', path: '/company/process' },
        ])}
      />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-neutral-200 bg-white">
        <div className="pointer-events-none absolute inset-0 bg-hero-glow" />
        <Container className="relative py-16 md:py-20">
          <Badge>How we deliver</Badge>
          <h1 className="mt-4 max-w-3xl text-3xl font-extrabold tracking-tight text-neutral-900 md:text-5xl">
            A delivery process you can actually see
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-neutral-600">
            Most software gets built behind a curtain — you find out how it is going at the demo. We do the opposite:
            a milestone-driven process with a connected client portal, so you always know exactly where your project stands.
          </p>
          <div className="mt-8">
            <Button href="/book" size="lg">Book a Consultation <ArrowRight size={18} /></Button>
          </div>
        </Container>
      </section>

      {/* Phases */}
      <Section>
        <Container>
          <Eyebrow>The process</Eyebrow>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-neutral-900 md:text-3xl">Six phases, one connected system of record</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {PHASES.map((p) => (
              <Card key={p.n}>
                <div className="text-3xl font-black text-primary/40">{p.n}</div>
                <h3 className="mt-2 text-base font-bold text-neutral-900">{p.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-400">{p.body}</p>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      {/* Portal transparency */}
      <Section tone="gradient" className="border-y border-neutral-200">
        <Container className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <Eyebrow>Full transparency</Eyebrow>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-neutral-900 md:text-3xl">
              You never disappear into a development black box
            </h2>
            <p className="mt-4 leading-relaxed text-neutral-600">
              Every engagement comes with a connected client portal. Reports summarize verified development activity — our
              rule is “no source, no claim,” and client-facing reports require human approval. You get the truth, on time,
              without asking for it.
            </p>
          </div>
          <Card className="bg-white">
            <ul className="space-y-3.5 text-sm text-neutral-700">
              {PORTAL.map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                    <Check size={12} />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          </Card>
        </Container>
      </Section>

      {/* CTA */}
      <section className="border-t border-neutral-200 bg-white">
        <Container className="flex flex-col items-start justify-between gap-6 py-16 md:flex-row md:items-center">
          <h2 className="text-2xl font-extrabold tracking-tight text-neutral-900 md:text-3xl">See it applied to your project.</h2>
          <Button href="/book" size="lg">Book a Consultation <ArrowRight size={18} /></Button>
        </Container>
      </section>
    </>
  );
}
