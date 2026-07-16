import type { Metadata } from 'next';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { Container, Section, Button, Eyebrow, Badge } from '@innovatix/ui';
import { SERVICE_CATEGORIES } from '@/lib/nav';
import { pageMetadata, breadcrumbJsonLd } from '@/lib/seo';
import { JsonLd } from '@/components/JsonLd';

export const metadata: Metadata = pageMetadata({
  title: 'Enterprise Software, AI & Systems Services | Innovatix Systems',
  description:
    'Custom software, enterprise systems, AI automation, cloud & DevOps, data, and security engineering — eight enterprise capability areas, delivered by one team on one connected platform.',
  path: '/services',
  index: true,
});

export default function ServicesIndex() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Services', path: '/services' },
        ])}
      />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line bg-base">
        <div className="pointer-events-none absolute inset-0 bg-hero-glow" />
        <Container className="relative py-16 md:py-20">
          <Badge>Services</Badge>
          <h1 className="mt-4 max-w-3xl text-3xl font-extrabold tracking-tight text-white md:text-5xl">
            Enterprise software engineering, end to end
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-neutral-300">
            Eight capability areas — from custom platforms to AI automation — delivered by one team, to one standard,
            on one connected delivery platform. Explore what we build and how we deliver it.
          </p>
          <div className="mt-8">
            <Button href="/book" size="lg">Book a Consultation <ArrowRight size={18} /></Button>
          </div>
        </Container>
      </section>

      {/* Category sections */}
      {SERVICE_CATEGORIES.map((cat, idx) => (
        <Section key={cat.key} tone={idx % 2 === 0 ? 'default' : 'surface'}>
          <Container>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <Eyebrow>{`0${idx + 1}`.slice(-2)}</Eyebrow>
                <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-white md:text-3xl">
                  <a href={`/services/${cat.key}`} className="hover:text-primary-light">{cat.label}</a>
                </h2>
                <p className="mt-2 max-w-2xl text-neutral-400">{cat.blurb}</p>
              </div>
              <a href={`/services/${cat.key}`} className="inline-flex items-center gap-1 text-sm font-semibold text-primary-light hover:underline">
                View {cat.label} <ArrowUpRight size={15} />
              </a>
            </div>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {cat.items.map((it) =>
                it.planned ? (
                  <li
                    key={it.href}
                    className="flex items-center justify-between gap-2 rounded-btn border border-line bg-surface/50 px-4 py-3 text-sm text-neutral-500"
                    title="Coming soon"
                  >
                    {it.label}
                    <span className="rounded-pill border border-line px-2 py-0.5 text-[10px] uppercase tracking-wide text-neutral-500">Soon</span>
                  </li>
                ) : (
                  <li key={it.href}>
                    <a
                      href={it.href}
                      className="group flex items-center justify-between gap-2 rounded-btn border border-line bg-surface px-4 py-3 text-sm font-medium text-neutral-200 transition hover:border-primary/40 hover:text-white"
                    >
                      {it.label}
                      <ArrowUpRight size={15} className="text-primary-light opacity-0 transition group-hover:opacity-100" />
                    </a>
                  </li>
                ),
              )}
            </ul>
          </Container>
        </Section>
      ))}

      {/* CTA */}
      <section className="relative overflow-hidden border-t border-line bg-base">
        <div className="pointer-events-none absolute inset-0 bg-hero-glow" />
        <Container className="relative flex flex-col items-start justify-between gap-6 py-16 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-white md:text-3xl">Not sure where to start?</h2>
            <p className="mt-2 text-neutral-300">Tell us the problem — we&apos;ll map the fastest path to a working system.</p>
          </div>
          <Button href="/book" size="lg">Book a Consultation <ArrowRight size={18} /></Button>
        </Container>
      </section>
    </>
  );
}
