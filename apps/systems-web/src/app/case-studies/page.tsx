import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';
import { Container, Section, Button, Badge, CaseStudyCard } from '@innovatix/ui';
import { CASE_STUDIES } from '@/lib/case-studies';
import { pageMetadata, breadcrumbJsonLd } from '@/lib/seo';
import { JsonLd } from '@/components/JsonLd';

export const metadata: Metadata = pageMetadata({
  title: 'Case Studies — Systems We Engineered | Innovatix Systems',
  description:
    'Enterprise platforms Innovatix Systems has engineered — from multi-channel commerce operations to security-first healthcare. We publish verified outcomes only.',
  path: '/case-studies',
  index: true,
});

export default function CaseStudiesIndex() {
  const studies = Object.values(CASE_STUDIES);
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Case Studies', path: '/case-studies' },
        ])}
      />

      <section className="relative overflow-hidden border-b border-neutral-200 bg-white">
        <div className="pointer-events-none absolute inset-0 bg-hero-glow" />
        <Container className="relative py-16 md:py-20">
          <Badge>Case Studies</Badge>
          <h1 className="mt-4 max-w-3xl text-3xl font-extrabold tracking-tight text-neutral-900 md:text-5xl">
            Systems we&apos;ve engineered
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-neutral-600">
            Real platforms businesses run on. We publish <span className="text-neutral-900">verified outcomes only</span> —
            no inflated numbers, no claimed partnerships or certifications we haven&apos;t earned.
          </p>
        </Container>
      </section>

      <Section>
        <Container>
          <div className="grid gap-5 md:grid-cols-2">
            {studies.map((c) => (
              <CaseStudyCard
                key={c.slug}
                eyebrow={c.industry}
                title={c.h1}
                outcome={c.summary}
                href={`/case-studies/${c.slug}`}
              />
            ))}
          </div>
        </Container>
      </Section>

      <section className="border-t border-neutral-200 bg-white">
        <Container className="flex flex-col items-start justify-between gap-6 py-16 md:flex-row md:items-center">
          <h2 className="text-2xl font-extrabold tracking-tight text-neutral-900 md:text-3xl">Let&apos;s build your proof.</h2>
          <Button href="/book" size="lg">Book a Consultation <ArrowRight size={18} /></Button>
        </Container>
      </section>
    </>
  );
}
