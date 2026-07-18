import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';
import { Container, Section, Button, Badge, Eyebrow, Card } from '@innovatix/ui';
import { pageMetadata, breadcrumbJsonLd } from '@/lib/seo';
import { JsonLd } from '@/components/JsonLd';

export const metadata: Metadata = pageMetadata({
  title: 'Industries | Innovatix Systems',
  description:
    'Innovatix Systems builds custom enterprise software for manufacturing, wholesale & distribution, logistics, healthcare, retail & e-commerce, and professional services — engineered around each industry’s real operations.',
  path: '/industries',
  index: true,
});

const INDUSTRIES = [
  { name: 'Wholesale & Distribution', body: 'Multi-channel order and inventory operations, customer and vendor portals, and finance workflows on one connected system — so channels, stock, and billing stay in sync.' },
  { name: 'Manufacturing', body: 'Systems that connect production, inventory, and fulfillment, replacing spreadsheets and disconnected tools with a single operational source of truth.' },
  { name: 'Logistics & Fulfillment', body: 'Warehouse, inventory, and order-management systems with carrier integrations, built for accuracy and throughput as volume grows.' },
  { name: 'Healthcare', body: 'Security-first platforms — multi-tenant isolation, enterprise authentication, role-based access, and audit logging engineered in from the start.' },
  { name: 'Retail & E-commerce', body: 'Commerce operations that unify storefronts, marketplaces, and back-office systems, with automation for the repetitive work in between.' },
  { name: 'Professional Services', body: 'Custom platforms and client portals that bring projects, documents, approvals, and billing into one transparent system of record.' },
];

export default function Page() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Industries', path: '/industries' }])} />

      <section className="relative overflow-hidden border-b border-line bg-base">
        <div className="pointer-events-none absolute inset-0 bg-hero-glow" />
        <Container className="relative py-16 md:py-20">
          <Badge>Industries</Badge>
          <h1 className="mt-4 max-w-3xl text-3xl font-extrabold tracking-tight text-white md:text-5xl">
            Enterprise software engineered for your industry
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-neutral-300">
            We build custom software, not packaged products — so the system fits how your industry actually operates.
            Here are the sectors where our engineering, AI, and enterprise-systems work is a natural fit.
          </p>
          <div className="mt-8">
            <Button href="/book" size="lg">Book a Consultation <ArrowRight size={18} /></Button>
          </div>
        </Container>
      </section>

      <Section>
        <Container>
          <Eyebrow>Where we build</Eyebrow>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-white md:text-3xl">Industries we serve</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {INDUSTRIES.map((i) => (
              <Card key={i.name}>
                <h3 className="text-base font-bold text-white">{i.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-400">{i.body}</p>
              </Card>
            ))}
          </div>
          <p className="mt-8 max-w-2xl text-sm leading-relaxed text-neutral-400">
            Don’t see your industry? Because we build custom software around your operations rather than forcing a
            template, our approach applies well beyond this list.{' '}
            <a href="/book" className="text-primary underline hover:no-underline">Tell us how your business runs</a>.
          </p>
        </Container>
      </Section>

      <Section tone="gradient" className="border-y border-line">
        <Container className="max-w-3xl">
          <Eyebrow>Our approach</Eyebrow>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-white md:text-3xl">
            Industry fit comes from understanding your operations
          </h2>
          <p className="mt-4 leading-relaxed text-neutral-300">
            We start every engagement with discovery — mapping your goals, constraints, systems, and how work actually
            flows — before we design or build anything. That is what makes the software fit, whatever the industry.{' '}
            <a href="/company/process" className="text-primary underline hover:no-underline">See our delivery process</a>.
          </p>
          <div className="mt-8">
            <Button href="/services" size="lg" variant="secondary">Explore Services</Button>
          </div>
        </Container>
      </Section>
    </>
  );
}
