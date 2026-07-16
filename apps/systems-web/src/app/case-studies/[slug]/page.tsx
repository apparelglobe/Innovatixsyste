import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { Container, Section, Button, Badge, Card, Metric } from '@innovatix/ui';
import { CASE_STUDIES, isCaseStudyIndexable } from '@/lib/case-studies';
import { pageMetadata, breadcrumbJsonLd } from '@/lib/seo';
import { JsonLd } from '@/components/JsonLd';
import { CaseStudyViewTracker } from '@/components/CaseStudyViewTracker';

type Params = { slug: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return Object.keys(CASE_STUDIES).map((slug) => ({ slug }));
}

export function generateMetadata({ params }: { params: Params }): Metadata {
  const c = CASE_STUDIES[params.slug];
  if (!c) return {};
  return pageMetadata({
    title: c.title,
    description: c.metaDescription,
    path: `/case-studies/${c.slug}`,
    index: isCaseStudyIndexable(c.slug), // noindex until verified
  });
}

export default function CaseStudyPage({ params }: { params: Params }) {
  const c = CASE_STUDIES[params.slug];
  if (!c) return notFound();
  const showMetrics = c.verified && c.metrics.length > 0;

  return (
    <>
      <CaseStudyViewTracker slug={c.slug} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Case Studies', path: '/case-studies' },
          { name: c.client, path: `/case-studies/${c.slug}` },
        ])}
      />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line bg-base">
        <div className="pointer-events-none absolute inset-0 bg-hero-glow" />
        <Container className="relative py-16 md:py-20">
          <nav aria-label="Breadcrumb" className="text-xs text-neutral-400">
            <a href="/" className="hover:text-white">Home</a> <span className="text-neutral-600">/</span>{' '}
            <a href="/case-studies" className="hover:text-white">Case Studies</a>
          </nav>
          <div className="mt-4"><Badge>{c.industry}</Badge></div>
          <h1 className="mt-4 max-w-4xl text-3xl font-extrabold leading-tight tracking-tight text-white md:text-5xl">{c.h1}</h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-neutral-300">{c.summary}</p>
          {!c.verified && (
            <p className="mt-6 inline-flex items-center gap-2 rounded-btn border border-line bg-surface px-3.5 py-2 text-xs text-neutral-400">
              <ShieldCheck size={14} className="text-primary-light" />
              Detailed outcomes are being verified before publication — we publish only confirmed results.
            </p>
          )}
        </Container>
      </section>

      {/* Verified metrics (only when confirmed) */}
      {showMetrics && (
        <Section tone="surface">
          <Container>
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
              {c.metrics.map((m) => (
                <Metric key={m.label} value={m.value} label={m.label} />
              ))}
            </div>
          </Container>
        </Section>
      )}

      {/* Challenge */}
      <Section>
        <Container className="max-w-prose">
          <h2 className="text-2xl font-extrabold tracking-tight text-white md:text-3xl">The challenge</h2>
          <div className="mt-4 space-y-4 leading-relaxed text-neutral-300">
            {c.challenge.map((p, i) => <p key={i}>{p}</p>)}
          </div>
        </Container>
      </Section>

      {/* Approach */}
      <Section tone="surface">
        <Container className="max-w-prose">
          <h2 className="text-2xl font-extrabold tracking-tight text-white md:text-3xl">Our approach</h2>
          <div className="mt-4 space-y-4 leading-relaxed text-neutral-300">
            {c.approach.map((p, i) => <p key={i}>{p}</p>)}
          </div>
        </Container>
      </Section>

      {/* Systems built */}
      <Section>
        <Container>
          <h2 className="text-2xl font-extrabold tracking-tight text-white md:text-3xl">What we engineered</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {c.systemsBuilt.map((s) => (
              <Card key={s.heading}>
                <h3 className="text-base font-bold text-white">{s.heading}</h3>
                <p className="mt-2 text-sm text-neutral-400">{s.body}</p>
              </Card>
            ))}
          </div>
          <div className="mt-10">
            <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Engineered with</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {c.stack.map((t) => (
                <span key={t} className="rounded-pill border border-line bg-surface px-3 py-1.5 text-sm font-semibold text-neutral-300">{t}</span>
              ))}
            </div>
          </div>
        </Container>
      </Section>

      {/* CTA */}
      <section className="relative overflow-hidden border-t border-line bg-base">
        <div className="pointer-events-none absolute inset-0 bg-hero-glow" />
        <Container className="relative flex flex-col items-start justify-between gap-6 py-16 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-white md:text-3xl">Want a system like this?</h2>
            <p className="mt-2 text-neutral-300">Let&apos;s scope what it would take to run your operations on software built for you.</p>
          </div>
          <Button href="/book" size="lg">Book a Consultation <ArrowRight size={18} /></Button>
        </Container>
      </section>
    </>
  );
}
