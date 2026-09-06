import type { Metadata } from 'next';
import { ClipboardList, Wallet, CalendarClock, ArrowRight } from 'lucide-react';
import { Container, Badge } from '@innovatix/ui';
import { pageMetadata, breadcrumbJsonLd } from '@/lib/seo';
import { JsonLd } from '@/components/JsonLd';
import { LeadForm } from '@/components/LeadForm';
import { SITE } from '@/lib/site';

export const metadata: Metadata = pageMetadata({
  title: 'Request a Quote — Innovatix Systems',
  description:
    'Tell us about your software, AI, or enterprise-systems project — service, scope, budget, and timeline — and we’ll review your request and follow up with next steps.',
  path: '/request-a-quote',
  index: true,
});

const STEPS = [
  { icon: <ClipboardList size={18} />, title: 'Tell us the scope', body: 'The service you’re considering and a few sentences about your goals, systems, and constraints.' },
  { icon: <Wallet size={18} />, title: 'Share budget & timeline', body: 'A rough budget range and when you’d like to start — it helps us tailor the right approach.' },
  { icon: <CalendarClock size={18} />, title: 'We review & follow up', body: 'Our team reviews your request and follows up with next steps. If it’s a fit, that’s a tailored proposal.' },
];

export default function RequestAQuotePage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Request a Quote', path: '/request-a-quote' }])} />
      <section className="relative overflow-hidden border-b border-neutral-200 bg-white">
        <div className="pointer-events-none absolute inset-0 bg-hero-glow" />
        <Container className="relative grid gap-12 py-16 md:py-20 lg:grid-cols-2">
          <div>
            <Badge>Request a Quote</Badge>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-neutral-900 md:text-5xl">Request a project quote</h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-neutral-600">
              Tell us about your project — the service, scope, budget, and timeline. We’ll review your request and
              follow up with next steps. Every engagement is scoped to your needs, so pricing is tailored rather than
              off-the-shelf.
            </p>
            <div className="mt-8 space-y-4">
              {STEPS.map((s) => (
                <div key={s.title} className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-primary/20 bg-primary/10 text-primary">{s.icon}</span>
                  <div>
                    <div className="font-semibold text-neutral-900">{s.title}</div>
                    <p className="text-sm text-neutral-400">{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
              <p className="text-sm text-neutral-600">Prefer to talk it through first?</p>
              <a href="/book" className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">Book a consultation <ArrowRight size={14} /></a>
            </div>
            <p className="mt-6 text-sm text-neutral-400">Or email us at <a href={`mailto:${SITE.email}`} className="text-primary hover:underline">{SITE.email}</a></p>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6 md:p-8">
            <LeadForm variant="quote" />
          </div>
        </Container>
      </section>
    </>
  );
}
