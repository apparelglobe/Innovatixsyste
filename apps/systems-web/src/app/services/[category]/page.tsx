import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { Container, Section, Button, Badge } from '@innovatix/ui';
import { SERVICE_CATEGORIES } from '@/lib/nav';
import { pageMetadata, breadcrumbJsonLd } from '@/lib/seo';
import { JsonLd } from '@/components/JsonLd';

type Params = { category: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return SERVICE_CATEGORIES.map((c) => ({ category: c.key }));
}

function findCategory(key: string) {
  return SERVICE_CATEGORIES.find((c) => c.key === key) ?? null;
}

export function generateMetadata({ params }: { params: Params }): Metadata {
  const cat = findCategory(params.category);
  if (!cat) return {};
  return pageMetadata({
    title: `${cat.label} Services | Innovatix Systems`,
    description: `${cat.blurb} Innovatix Systems delivers ${cat.label.toLowerCase()} for enterprise operations — engineered to scale, secure by default, and delivered with full transparency.`,
    path: `/services/${cat.key}`,
    index: true,
  });
}

export default function CategoryPage({ params }: { params: Params }) {
  const cat = findCategory(params.category);
  if (!cat) return notFound();
  const live = cat.items.filter((i) => !i.planned);
  const planned = cat.items.filter((i) => i.planned);

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Services', path: '/services' },
          { name: cat.label, path: `/services/${cat.key}` },
        ])}
      />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-neutral-200 bg-white">
        <div className="pointer-events-none absolute inset-0 bg-hero-glow" />
        <Container className="relative py-16 md:py-20">
          <nav aria-label="Breadcrumb" className="text-xs text-neutral-400">
            <a href="/" className="hover:text-neutral-900">Home</a> <span className="text-neutral-600">/</span>{' '}
            <a href="/services" className="hover:text-neutral-900">Services</a>
          </nav>
          <div className="mt-4"><Badge>Services</Badge></div>
          <h1 className="mt-4 max-w-3xl text-3xl font-extrabold tracking-tight text-neutral-900 md:text-5xl">{cat.label}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-neutral-600">{cat.blurb}</p>
          <div className="mt-8">
            <Button href="/book" size="lg">Book a Consultation <ArrowRight size={18} /></Button>
          </div>
        </Container>
      </section>

      {/* Services in this category */}
      <Section>
        <Container>
          {live.length > 0 && (
            <>
              <h2 className="text-xl font-bold text-neutral-900">Explore {cat.label.toLowerCase()}</h2>
              <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                {live.map((it) => (
                  <li key={it.href}>
                    <a
                      href={it.href}
                      className="group flex items-center justify-between gap-3 rounded-card border border-neutral-200 bg-neutral-50 p-5 transition hover:border-primary/40"
                    >
                      <span className="font-semibold text-neutral-900 group-hover:text-primary">{it.label}</span>
                      <ArrowUpRight size={18} className="shrink-0 text-primary" />
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}

          {planned.length > 0 && (
            <>
              <h2 className="mt-12 text-sm font-semibold uppercase tracking-wider text-neutral-500">More in this area</h2>
              <ul className="mt-4 flex flex-wrap gap-2.5">
                {planned.map((it) => (
                  <li
                    key={it.href}
                    className="rounded-pill border border-neutral-200 bg-neutral-50/50 px-3.5 py-1.5 text-sm text-neutral-500"
                    title="Coming soon"
                  >
                    {it.label}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm text-neutral-500">
                These are on our roadmap. Need one now?{' '}
                <a href="/book" className="font-semibold text-primary hover:underline">Talk to us</a>.
              </p>
            </>
          )}
        </Container>
      </Section>
    </>
  );
}
