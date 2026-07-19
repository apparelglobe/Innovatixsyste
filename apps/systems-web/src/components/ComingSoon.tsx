import { ArrowRight } from 'lucide-react';
import { Container, Button, Badge } from '@innovatix/ui';

/**
 * Honest interim page for sections that are on the roadmap but not yet built.
 * Always rendered with noindex (set in each route's metadata) so nothing thin
 * gets indexed — keeps the nav fully navigable without dead links or fluff.
 */
export function ComingSoon({
  eyebrow,
  title,
  blurb,
}: {
  eyebrow: string;
  title: string;
  blurb: string;
}) {
  return (
    <section className="relative overflow-hidden border-b border-neutral-200 bg-white">
      <div className="pointer-events-none absolute inset-0 bg-hero-glow" />
      <Container className="relative flex min-h-[60vh] flex-col justify-center py-20">
        <Badge>{eyebrow}</Badge>
        <h1 className="mt-5 max-w-3xl text-3xl font-extrabold tracking-tight text-neutral-900 md:text-5xl">{title}</h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-neutral-600">{blurb}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button href="/book" size="lg">Book a Consultation <ArrowRight size={18} /></Button>
          <Button href="/services" size="lg" variant="secondary">Explore Services</Button>
        </div>
      </Container>
    </section>
  );
}
