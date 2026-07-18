import type { ReactNode } from 'react';
import { Container, Section } from '@innovatix/ui';

/**
 * Shared layout for the legal pages (privacy, terms, cookie policy). Hero +
 * a readable prose column. Body elements are styled via descendant selectors so
 * each page just writes semantic <h2>/<p>/<ul> without repeating classes.
 */
export function LegalPage({
  title,
  effectiveDate,
  intro,
  children,
}: {
  title: string;
  effectiveDate: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <>
      <section className="relative overflow-hidden border-b border-line bg-base">
        <div className="pointer-events-none absolute inset-0 bg-hero-glow" />
        <Container className="relative py-16 md:py-20">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Legal</p>
          <h1 className="mt-4 max-w-3xl text-3xl font-extrabold tracking-tight text-white md:text-5xl">{title}</h1>
          <p className="mt-4 text-sm text-neutral-400">Effective date: {effectiveDate}</p>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-neutral-300">{intro}</p>
        </Container>
      </section>

      <Section>
        <Container>
          <article
            className={
              'max-w-3xl space-y-5 leading-relaxed text-neutral-300 ' +
              '[&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-white ' +
              '[&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-white ' +
              '[&_a]:text-primary [&_a]:underline [&_a:hover]:no-underline ' +
              '[&_ul]:mt-2 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6 [&_li]:marker:text-primary/60 ' +
              '[&_strong]:text-white'
            }
          >
            {children}
          </article>
        </Container>
      </Section>
    </>
  );
}
