import { ArrowRight, Check } from 'lucide-react';
import { Container, Section, Button, Badge, Card } from '@innovatix/ui';
import type { ServicePage } from '@/lib/services';
import { SERVICE_CATEGORIES } from '@/lib/nav';
import { serviceJsonLd, breadcrumbJsonLd, faqJsonLd } from '@/lib/seo';
import { JsonLd } from '@/components/JsonLd';

/**
 * Shared renderer for every /services/{category}/{service} page. All content
 * comes from the QC-gated SERVICE_PAGES registry — a page is a data entry, not a
 * bespoke layout. Dark enterprise theme throughout.
 */
export function ServicePageView({ page: p }: { page: ServicePage }) {
  const path = `/services/${p.slug}`;
  const categoryKey = p.slug.split('/')[0];
  const categoryPath = `/services/${categoryKey}`;
  // Carry the service context into the booking form (prefills serviceInterest).
  const navLabel = SERVICE_CATEGORIES.flatMap((c) => c.items).find((it) => it.href === path)?.label ?? p.h1;
  const bookHref = `/book?service=${encodeURIComponent(navLabel)}`;

  const jsonLd = [
    serviceJsonLd({ name: p.h1, description: p.metaDescription, path }),
    breadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Services', path: '/services' },
      { name: p.category, path: categoryPath },
      { name: p.h1, path },
    ]),
    faqJsonLd(p.faqs),
  ];

  return (
    <>
      <JsonLd data={jsonLd} />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-neutral-200 bg-white">
        <div className="pointer-events-none absolute inset-0 bg-hero-glow" />
        <Container className="relative py-16 md:py-20">
          <nav aria-label="Breadcrumb" className="text-xs text-neutral-400">
            <a href="/" className="hover:text-neutral-900">Home</a> <span className="text-neutral-600">/</span>{' '}
            <a href="/services" className="hover:text-neutral-900">Services</a> <span className="text-neutral-600">/</span>{' '}
            <a href={categoryPath} className="hover:text-neutral-900">{p.category}</a>
          </nav>
          <div className="mt-4"><Badge>{p.category}</Badge></div>
          <h1 className="mt-4 max-w-4xl text-3xl font-extrabold leading-tight tracking-tight text-neutral-900 md:text-5xl">{p.h1}</h1>
          <div className="mt-6 max-w-2xl space-y-4 text-lg leading-relaxed text-neutral-600">
            {p.intro.map((para, i) => <p key={i}>{para}</p>)}
          </div>
          <div className="mt-8">
            <Button href={bookHref} size="lg" data-cta="Book a Consultation" data-cta-loc="service-page">Book a Consultation <ArrowRight size={18} /></Button>
          </div>
        </Container>
      </section>

      {/* Problems */}
      <Section>
        <Container>
          <h2 className="text-2xl font-extrabold tracking-tight text-neutral-900 md:text-3xl">Problems we solve</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {p.problems.map((pr) => (
              <Card key={pr.heading}>
                <h3 className="text-base font-bold text-neutral-900">{pr.heading}</h3>
                <p className="mt-2 text-sm text-neutral-400">{pr.body}</p>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      {/* Solution */}
      <Section tone="surface">
        <Container>
          <h2 className="text-2xl font-extrabold tracking-tight text-neutral-900 md:text-3xl">How we approach it</h2>
          <div className="mt-8 grid gap-8 md:grid-cols-3">
            {p.solution.map((s) => (
              <div key={s.heading}>
                <h3 className="text-base font-bold text-neutral-900">{s.heading}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-400">{s.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* Deliverables + Tech */}
      <Section>
        <Container className="grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-neutral-900 md:text-3xl">What you get</h2>
            <ul className="mt-6 space-y-3">
              {p.deliverables.map((d) => (
                <li key={d} className="flex items-start gap-2.5 text-sm text-neutral-600">
                  <Check size={18} className="mt-0.5 shrink-0 text-primary" /> {d}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-neutral-900 md:text-3xl">Technologies &amp; integrations</h2>
            <div className="mt-6 flex flex-wrap gap-2">
              {p.technologies.map((t) => (
                <span key={t} className="rounded-pill border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-sm font-semibold text-neutral-600">{t}</span>
              ))}
            </div>
          </div>
        </Container>
      </Section>

      {/* Process */}
      <Section tone="surface">
        <Container>
          <h2 className="text-2xl font-extrabold tracking-tight text-neutral-900 md:text-3xl">Our delivery process</h2>
          <ol className="mt-8 grid gap-6 md:grid-cols-5">
            {p.process.map((s, i) => (
              <li key={s.step}>
                <div className="text-3xl font-black text-primary/40">{String(i + 1).padStart(2, '0')}</div>
                <div className="mt-1 text-sm font-bold text-neutral-900">{s.step}</div>
                <p className="mt-1 text-xs leading-relaxed text-neutral-400">{s.detail}</p>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      {/* Proof */}
      {p.proof && (
        <Section>
          <Container>
            <Card className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-primary">Proof</div>
                <p className="mt-1 text-lg font-bold text-neutral-900">{p.proof.label}</p>
              </div>
              <Button href={p.proof.href} variant="secondary">Read the case study <ArrowRight size={16} /></Button>
            </Card>
          </Container>
        </Section>
      )}

      {/* FAQ */}
      <Section>
        <Container className="max-w-3xl">
          <h2 className="text-2xl font-extrabold tracking-tight text-neutral-900 md:text-3xl">Frequently asked questions</h2>
          <div className="mt-6 divide-y divide-neutral-200">
            {p.faqs.map((f) => (
              <div key={f.q} className="py-5">
                <h3 className="font-semibold text-neutral-900">{f.q}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-neutral-400">{f.a}</p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* Internal links + CTA */}
      <section className="relative overflow-hidden border-t border-neutral-200 bg-white">
        <div className="pointer-events-none absolute inset-0 bg-hero-glow" />
        <Container className="relative flex flex-col items-start justify-between gap-6 py-16 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-neutral-900 md:text-3xl">Ready to scope your build?</h2>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-neutral-600">
              {p.internalLinks.map((l) => (
                <a key={l.href} href={l.href} className="hover:text-neutral-900">{l.label} →</a>
              ))}
            </div>
          </div>
          <Button href={bookHref} size="lg" data-cta="Book a Consultation" data-cta-loc="service-page">Book a Consultation <ArrowRight size={18} /></Button>
        </Container>
      </section>
    </>
  );
}
