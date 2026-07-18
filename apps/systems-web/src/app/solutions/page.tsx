import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';
import { Container, Section, Button, Badge, Eyebrow, Card } from '@innovatix/ui';
import { pageMetadata, breadcrumbJsonLd } from '@/lib/seo';
import { JsonLd } from '@/components/JsonLd';

export const metadata: Metadata = pageMetadata({
  title: 'Solutions | Innovatix Systems',
  description:
    'Outcome-focused solutions from Innovatix Systems — business-process automation, operations modernization, multi-system integration, and legacy replacement — built around how your business actually operates.',
  path: '/solutions',
  index: true,
});

const SOLUTIONS = [
  {
    name: 'Business-process automation',
    outcome: 'Replace repetitive manual work with software that does it reliably.',
    body: 'We map the operational work draining your team — data entry, reconciliation, status-chasing, handoffs — and automate it with custom workflows and AI where it fits, so people spend time on judgment, not busywork.',
    href: '/services/ai-services',
  },
  {
    name: 'Operations modernization',
    outcome: 'Trade fragmented tools for one connected system of record.',
    body: 'Orders, inventory, finance, and fulfillment on one authoritative data model — so there is a single source of truth instead of spreadsheets bridging systems that were never meant to talk.',
    href: '/services/enterprise-systems',
  },
  {
    name: 'Multi-system integration',
    outcome: 'Make the systems you already run work as one.',
    body: 'We connect ERPs, marketplaces, carriers, payment processors, and internal tools through robust APIs, so data flows automatically instead of being re-keyed between systems.',
    href: '/services/software-engineering/systems-integration',
  },
  {
    name: 'Legacy replacement',
    outcome: 'Retire the software holding you back — without a risky big-bang cutover.',
    body: 'We replace aging or misfit systems with custom software you own, migrating data carefully and rolling out in controlled phases with a rollback plan at every step.',
    href: '/services/software-engineering/enterprise-software-development',
  },
  {
    name: 'AI-assisted operations',
    outcome: 'Put AI to work on real operational tasks, safely.',
    body: 'Document intelligence, AI agents that take action, and AI-summarized reporting — grounded in your data, with a “no source, no claim” rule and human approval where it matters.',
    href: '/services/ai-services/ai-agents',
  },
  {
    name: 'Customer & vendor portals',
    outcome: 'Give the people you work with self-service, connected to live data.',
    body: 'Branded portals for customers and vendors, tied to the same operational source of truth — so status, documents, and transactions are always current.',
    href: '/services/enterprise-systems',
  },
];

export default function Page() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Solutions', path: '/solutions' }])} />

      <section className="relative overflow-hidden border-b border-line bg-base">
        <div className="pointer-events-none absolute inset-0 bg-hero-glow" />
        <Container className="relative py-16 md:py-20">
          <Badge>Solutions</Badge>
          <h1 className="mt-4 max-w-3xl text-3xl font-extrabold tracking-tight text-white md:text-5xl">
            Solutions built around how your business actually operates
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-neutral-300">
            Services are the “what.” Solutions are the outcome. Here is how we package our engineering, AI, and systems
            work around the results businesses come to us for.
          </p>
          <div className="mt-8">
            <Button href="/book" size="lg">Book a Consultation <ArrowRight size={18} /></Button>
          </div>
        </Container>
      </section>

      <Section>
        <Container>
          <Eyebrow>Outcomes we deliver</Eyebrow>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-white md:text-3xl">Where we make the difference</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {SOLUTIONS.map((s) => (
              <a key={s.name} href={s.href} className="group">
                <Card className="h-full transition-colors group-hover:border-primary/50">
                  <h3 className="text-base font-bold text-white">{s.name}</h3>
                  <p className="mt-2 text-sm font-medium text-primary-light">{s.outcome}</p>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-400">{s.body}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                    Learn more <ArrowRight size={14} />
                  </span>
                </Card>
              </a>
            ))}
          </div>
        </Container>
      </Section>

      <Section tone="gradient" className="border-y border-line">
        <Container className="max-w-3xl">
          <Eyebrow>Delivered transparently</Eyebrow>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-white md:text-3xl">
            Every solution ships through your client portal
          </h2>
          <p className="mt-4 leading-relaxed text-neutral-300">
            Whatever we build for you, you see it happen — live progress, verified reports, milestone approvals, and
            every document and invoice in one place.{' '}
            <a href="/company/process" className="text-primary underline hover:no-underline">See how we deliver</a>.
          </p>
          <div className="mt-8">
            <Button href="/book" size="lg">Start a conversation <ArrowRight size={18} /></Button>
          </div>
        </Container>
      </Section>
    </>
  );
}
