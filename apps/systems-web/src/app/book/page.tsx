import type { Metadata } from 'next';
import { Check } from 'lucide-react';
import { Container, Badge } from '@innovatix/ui';
import { pageMetadata, breadcrumbJsonLd } from '@/lib/seo';
import { JsonLd } from '@/components/JsonLd';
import { BookFlow } from '@/components/BookFlow';

export const metadata: Metadata = pageMetadata({
  title: 'Book a Consultation | Innovatix Systems',
  description:
    'Book a focused consultation with Innovatix Systems to scope your software, AI, or enterprise-systems project. We map your goals, constraints, and the fastest path to value.',
  path: '/book',
  index: true,
});

const EXPECT = [
  'A focused conversation about your goals and constraints',
  'Honest input on build vs. buy and the right architecture',
  'A clear view of scope, process, and next steps',
  'No obligation — and no generic sales pitch',
];

export default function BookPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Book a Consultation', path: '/book' }])} />
      <section className="relative overflow-hidden border-b border-line bg-base">
        <div className="pointer-events-none absolute inset-0 bg-hero-glow" />
        <Container className="relative grid gap-12 py-16 md:py-20 lg:grid-cols-2">
          <div>
            <Badge>Book a consultation</Badge>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-white md:text-5xl">
              Scope your system with our team
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-neutral-300">
              Share a little context first so the conversation is productive — then pick a time that works for you.
            </p>
            <ul className="mt-8 space-y-3 text-sm text-neutral-200">
              {EXPECT.map((e) => (
                <li key={e} className="flex items-start gap-2.5">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/15 text-primary-light"><Check size={12} /></span>
                  {e}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-6 md:p-8">
            <BookFlow />
          </div>
        </Container>
      </section>
    </>
  );
}
