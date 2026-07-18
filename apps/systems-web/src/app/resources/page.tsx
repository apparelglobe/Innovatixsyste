import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';
import { Container, Section, Button, Badge, Eyebrow, Card } from '@innovatix/ui';
import { pageMetadata, breadcrumbJsonLd } from '@/lib/seo';
import { JsonLd } from '@/components/JsonLd';

export const metadata: Metadata = pageMetadata({
  title: 'Resources | Innovatix Systems',
  description:
    'Practical perspective from Innovatix Systems on building enterprise software, AI automation, systems modernization, and delivering software projects with transparency.',
  path: '/resources',
  index: true,
});

const TOPICS = [
  { name: 'Building enterprise software', body: 'What separates software that scales from software that gets rewritten — data modeling, system boundaries, and designing for change from day one.' },
  { name: 'AI automation, done responsibly', body: 'Where AI genuinely removes operational work, how to ground it in your data, and why “no source, no claim” and human approval matter.' },
  { name: 'Modernizing operations', body: 'Moving from fragmented tools to one connected source of truth — and how to do it in phases, without a risky big-bang cutover.' },
  { name: 'Systems integration', body: 'Connecting ERPs, marketplaces, carriers, and payments so data flows automatically instead of being re-keyed between systems.' },
  { name: 'Delivering projects transparently', body: 'How a connected client portal — live progress, verified reports, milestone approvals — changes the experience of buying custom software.' },
  { name: 'Security by design', body: 'Access control, tenant isolation, audit logging, and file scanning as foundations, not afterthoughts.' },
];

export default function Page() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Resources', path: '/resources' }])} />

      <section className="relative overflow-hidden border-b border-line bg-base">
        <div className="pointer-events-none absolute inset-0 bg-hero-glow" />
        <Container className="relative py-16 md:py-20">
          <Badge>Resources</Badge>
          <h1 className="mt-4 max-w-3xl text-3xl font-extrabold tracking-tight text-white md:text-5xl">
            Perspective on enterprise software & AI
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-neutral-300">
            Practical writing on building the systems businesses run on — from AI automation to modernization to
            delivering software transparently. Our library is growing; here is what we cover.
          </p>
          <div className="mt-8">
            <Button href="/book" size="lg">Book a Consultation <ArrowRight size={18} /></Button>
          </div>
        </Container>
      </section>

      <Section>
        <Container>
          <Eyebrow>What we write about</Eyebrow>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-white md:text-3xl">Topics we cover</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {TOPICS.map((t) => (
              <Card key={t.name}>
                <h3 className="text-base font-bold text-white">{t.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-400">{t.body}</p>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      <Section tone="gradient" className="border-y border-line">
        <Container className="max-w-3xl">
          <Eyebrow>Prefer to talk it through?</Eyebrow>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-white md:text-3xl">
            Bring us the problem you’re trying to solve
          </h2>
          <p className="mt-4 leading-relaxed text-neutral-300">
            The fastest way to useful answers is a conversation about your specific operations. Tell us where the
            friction is and we’ll tell you, honestly, whether and how software can help.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button href="/book" size="lg">Book a Consultation <ArrowRight size={18} /></Button>
            <Button href="/services" size="lg" variant="secondary">Explore Services</Button>
          </div>
        </Container>
      </Section>
    </>
  );
}
