import type { Metadata } from 'next';
import { Container, Section, Card } from '@innovatix/ui';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Book a Consultation | Innovatix Systems',
  description: 'Book a focused consultation with Innovatix Systems to scope your software, AI, or enterprise-systems project.',
  path: '/contact/book',
});

export default function BookPage() {
  return (
    <Section>
      <Container className="max-w-2xl">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink md:text-4xl">Book a Consultation</h1>
        <p className="mt-3 text-neutral-600">
          Tell us about your project and pick a time. We&apos;ll map your goals, constraints, and the fastest path to value.
        </p>
        <Card className="mt-8">
          {/* F1 placeholder — scheduler (Cal.com) + qualifying form wired in W5/W7. */}
          <p className="text-sm text-neutral-500">
            Scheduling widget and lead form are connected in the next tickets (W5/W7). This page confirms the route and
            the conversion path exist.
          </p>
        </Card>
      </Container>
    </Section>
  );
}
