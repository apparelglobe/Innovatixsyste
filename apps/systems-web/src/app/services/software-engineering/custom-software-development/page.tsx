import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowRight, Check } from 'lucide-react';
import { Container, Section, Button, Badge, Card } from '@innovatix/ui';
import { SERVICE_PAGES, isIndexable } from '@/lib/services';
import { pageMetadata, serviceJsonLd, breadcrumbJsonLd, faqJsonLd } from '@/lib/seo';
import { JsonLd } from '@/components/JsonLd';

const SLUG = 'software-engineering/custom-software-development';
const PATH = `/services/${SLUG}`;

export function generateMetadata(): Metadata {
  const p = SERVICE_PAGES[SLUG];
  if (!p) return {};
  return pageMetadata({ title: p.title, description: p.metaDescription, path: PATH, index: isIndexable(SLUG) });
}

export default function Page() {
  const p = SERVICE_PAGES[SLUG];
  if (!p) return notFound();

  const jsonLd = [
    serviceJsonLd({ name: p.h1, description: p.metaDescription, path: PATH }),
    breadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Services', path: '/services' },
      { name: p.category, path: `/services/${p.category.toLowerCase().replace(/ & /g, '-').replace(/\s+/g, '-')}` },
      { name: 'Custom Software Development', path: PATH },
    ]),
    faqJsonLd(p.faqs),
  ];

  return (
    <>
      <JsonLd data={jsonLd} />

      {/* Hero */}
      <section className="bg-ink text-white">
        <Container className="py-16 md:py-20">
          <nav aria-label="Breadcrumb" className="text-xs text-neutral-400">
            <a href="/" className="hover:text-white">Home</a> / <a href="/services" className="hover:text-white">Services</a> / <span>{p.category}</span>
          </nav>
          <Badge className="mt-4 bg-white/10 text-accent">{p.category}</Badge>
          <h1 className="mt-4 max-w-4xl text-3xl font-extrabold leading-tight tracking-tight md:text-5xl">{p.h1}</h1>
          <div className="mt-6 max-w-2xl space-y-4 text-neutral-300">
            {p.intro.map((para, i) => <p key={i}>{para}</p>)}
          </div>
          <div className="mt-8">
            <Button href="/contact/book" size="lg">Book a Consultation <ArrowRight size={18} /></Button>
          </div>
        </Container>
      </section>

      {/* Problems */}
      <Section>
        <Container>
          <h2 className="text-2xl font-extrabold tracking-tight text-ink md:text-3xl">Problems we solve</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {p.problems.map((pr) => (
              <Card key={pr.heading}>
                <h3 className="text-base font-bold text-ink">{pr.heading}</h3>
                <p className="mt-2 text-sm text-neutral-600">{pr.body}</p>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      {/* Solution */}
      <Section tone="muted">
        <Container>
          <h2 className="text-2xl font-extrabold tracking-tight text-ink md:text-3xl">How we approach it</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {p.solution.map((s) => (
              <div key={s.heading}>
                <h3 className="text-base font-bold text-ink">{s.heading}</h3>
                <p className="mt-2 text-sm text-neutral-600">{s.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* Deliverables + Tech */}
      <Section>
        <Container className="grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-ink md:text-3xl">What you get</h2>
            <ul className="mt-6 space-y-3">
              {p.deliverables.map((d) => (
                <li key={d} className="flex items-start gap-2 text-sm text-neutral-700">
                  <Check size={18} className="mt-0.5 shrink-0 text-primary" /> {d}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-ink md:text-3xl">Technologies</h2>
            <div className="mt-6 flex flex-wrap gap-2">
              {p.technologies.map((t) => (
                <span key={t} className="rounded-pill border border-neutral-300 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-700">{t}</span>
              ))}
            </div>
          </div>
        </Container>
      </Section>

      {/* Process */}
      <Section tone="muted">
        <Container>
          <h2 className="text-2xl font-extrabold tracking-tight text-ink md:text-3xl">Our delivery process</h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-5">
            {p.process.map((s, i) => (
              <li key={s.step}>
                <div className="text-3xl font-black text-primary/30">{i + 1}</div>
                <div className="mt-1 text-sm font-bold text-ink">{s.step}</div>
                <p className="mt-1 text-xs text-neutral-600">{s.detail}</p>
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
                <div className="text-xs font-bold uppercase tracking-widest text-accent-dark">Proof</div>
                <p className="mt-1 text-lg font-bold text-ink">{p.proof.label}</p>
              </div>
              <Button href={p.proof.href} variant="secondary">Read the case study <ArrowRight size={16} /></Button>
            </Card>
          </Container>
        </Section>
      )}

      {/* FAQ */}
      <Section tone="muted">
        <Container className="max-w-3xl">
          <h2 className="text-2xl font-extrabold tracking-tight text-ink md:text-3xl">Frequently asked questions</h2>
          <div className="mt-6 space-y-4">
            {p.faqs.map((f) => (
              <div key={f.q} className="border-b border-neutral-200 pb-4">
                <h3 className="font-semibold text-ink">{f.q}</h3>
                <p className="mt-1 text-sm text-neutral-600">{f.a}</p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* Internal links + CTA */}
      <Section tone="ink">
        <Container className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight md:text-3xl">Ready to scope your build?</h2>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-neutral-300">
              {p.internalLinks.map((l) => (
                <a key={l.href} href={l.href} className="hover:text-white">{l.label} →</a>
              ))}
            </div>
          </div>
          <Button href="/contact/book" size="lg">Book a Consultation <ArrowRight size={18} /></Button>
        </Container>
      </Section>
    </>
  );
}
