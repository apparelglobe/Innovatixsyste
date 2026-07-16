import type { Metadata } from 'next';
import { Mail, MessageSquare, Building2, ArrowRight } from 'lucide-react';
import { Container, Section, Badge } from '@innovatix/ui';
import { pageMetadata, breadcrumbJsonLd } from '@/lib/seo';
import { JsonLd } from '@/components/JsonLd';
import { LeadForm } from '@/components/LeadForm';
import { SITE } from '@/lib/site';

export const metadata: Metadata = pageMetadata({
  title: 'Contact Innovatix Systems',
  description:
    'Get in touch with Innovatix Systems about a software, AI, or enterprise-systems project — general inquiries, partnerships, and support routing.',
  path: '/contact',
  index: true,
});

const REASONS = [
  { icon: <MessageSquare size={18} />, title: 'Project questions', body: 'Scoping a custom platform, ERP, or AI automation? Tell us what you need.' },
  { icon: <Building2 size={18} />, title: 'Partnerships', body: 'Agencies, vendors, and technology partners — we’d like to hear from you.' },
  { icon: <Mail size={18} />, title: 'Support & general', body: 'Existing client or general question? We’ll route you to the right team.' },
];

export default function ContactPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Contact', path: '/contact' }])} />
      <section className="relative overflow-hidden border-b border-line bg-base">
        <div className="pointer-events-none absolute inset-0 bg-hero-glow" />
        <Container className="relative grid gap-12 py-16 md:py-20 lg:grid-cols-2">
          <div>
            <Badge>Contact</Badge>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-white md:text-5xl">Let’s talk about your project</h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-neutral-300">
              Tell us what you’re trying to build. We’ll get back to you shortly to map your goals, constraints,
              and the fastest path to value.
            </p>
            <div className="mt-8 space-y-4">
              {REASONS.map((r) => (
                <div key={r.title} className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-primary/20 bg-primary/10 text-primary-light">{r.icon}</span>
                  <div>
                    <div className="font-semibold text-white">{r.title}</div>
                    <p className="text-sm text-neutral-400">{r.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 rounded-xl border border-line bg-surface p-4">
              <p className="text-sm text-neutral-300">Prefer to schedule a call?</p>
              <a href="/book" className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-light hover:underline">Book a consultation <ArrowRight size={14} /></a>
            </div>
            <p className="mt-6 text-sm text-neutral-400">Or email us at <a href={`mailto:${SITE.email}`} className="text-primary-light hover:underline">{SITE.email}</a></p>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-6 md:p-8">
            <LeadForm variant="contact" />
          </div>
        </Container>
      </section>
    </>
  );
}
