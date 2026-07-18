import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Container, Section, Button } from '@innovatix/ui';
import { pageMetadata, breadcrumbJsonLd } from '@/lib/seo';
import { JsonLd } from '@/components/JsonLd';
import { SITE, absoluteUrl } from '@/lib/site';
import { ARTICLES, getArticle, articleSlugs } from '@/lib/articles';

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return articleSlugs().map((slug) => ({ slug }));
}

export function generateMetadata({ params }: { params: Params }): Metadata {
  const a = getArticle(params.slug);
  if (!a) return {};
  return pageMetadata({ title: `${a.title} | Innovatix Systems`, description: a.description, path: `/resources/${a.slug}`, index: true });
}

const fmtDate = (iso: string) =>
  new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });

export default function ArticlePage({ params }: { params: Params }) {
  const a = getArticle(params.slug);
  if (!a) return notFound();

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: a.title,
    description: a.description,
    datePublished: a.date,
    dateModified: a.date,
    url: absoluteUrl(`/resources/${a.slug}`),
    author: { '@type': 'Organization', name: SITE.name, url: SITE.url },
    publisher: { '@type': 'Organization', name: SITE.name, url: SITE.url },
    mainEntityOfPage: absoluteUrl(`/resources/${a.slug}`),
  };

  return (
    <>
      <JsonLd data={articleJsonLd} />
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Resources', path: '/resources' }, { name: a.title, path: `/resources/${a.slug}` }])} />

      <section className="relative overflow-hidden border-b border-line bg-base">
        <div className="pointer-events-none absolute inset-0 bg-hero-glow" />
        <Container className="relative py-16 md:py-20">
          <a href="/resources" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-light hover:underline">
            <ArrowLeft size={14} /> Resources
          </a>
          <h1 className="mt-4 max-w-3xl text-3xl font-extrabold tracking-tight text-white md:text-5xl">{a.title}</h1>
          <p className="mt-4 text-sm text-neutral-500">{fmtDate(a.date)} · {a.readMinutes} min read</p>
        </Container>
      </section>

      <Section>
        <Container>
          <article
            className={
              'max-w-3xl space-y-5 leading-relaxed text-neutral-300 ' +
              '[&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-white ' +
              '[&_a]:text-primary [&_a]:underline [&_a:hover]:no-underline ' +
              '[&_ul]:mt-2 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6 [&_li]:marker:text-primary/60'
            }
          >
            {a.intro.map((p, i) => (
              <p key={`intro-${i}`} className="text-lg text-neutral-200">{p}</p>
            ))}
            {a.sections.map((s) => (
              <div key={s.heading}>
                <h2>{s.heading}</h2>
                {s.body.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
                {s.bullets ? (
                  <ul>
                    {s.bullets.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </article>

          <div className="mt-12 max-w-3xl border-t border-line pt-8">
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Related services</div>
            <ul className="mt-3 flex flex-wrap gap-3">
              {a.internalLinks.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-neutral-300 transition hover:border-primary/40 hover:text-white">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Button href="/book" size="lg">Book a Consultation <ArrowRight size={18} /></Button>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
