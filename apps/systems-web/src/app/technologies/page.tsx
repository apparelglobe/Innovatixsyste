import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';
import { Container, Section, Button, Badge, Eyebrow, Card } from '@innovatix/ui';
import { pageMetadata, breadcrumbJsonLd } from '@/lib/seo';
import { JsonLd } from '@/components/JsonLd';

export const metadata: Metadata = pageMetadata({
  title: 'Technologies | Innovatix Systems',
  description:
    'The enterprise technology stack Innovatix Systems builds on — TypeScript, React, Next.js, Node.js, NestJS, PostgreSQL, AWS, Docker, and Kubernetes — chosen for reliability at scale.',
  path: '/technologies',
  index: true,
});

const STACK = [
  { area: 'Frontend', body: 'TypeScript, React, and Next.js for fast, accessible, SEO-ready interfaces and portals.', items: ['TypeScript', 'React', 'Next.js', 'Tailwind CSS'] },
  { area: 'Backend & APIs', body: 'Node.js and NestJS services with well-defined, versioned APIs for reliable integration.', items: ['Node.js', 'NestJS', 'Fastify', 'REST & webhooks'] },
  { area: 'Data', body: 'PostgreSQL as an authoritative relational source of truth, with careful schema design and migrations.', items: ['PostgreSQL', 'Prisma', 'Read replicas', 'Migrations'] },
  { area: 'Cloud & Infrastructure', body: 'Cloud-native deployment engineered for reliability, observability, and scale.', items: ['AWS', 'Docker', 'Kubernetes', 'CI/CD'] },
  { area: 'AI', body: 'Retrieval-augmented AI grounded in your data, with agents and document intelligence for real operational work.', items: ['LLMs', 'RAG', 'AI agents', 'Document intelligence'] },
  { area: 'Security & Operations', body: 'Authentication, role-based access, tenant isolation, audit logging, malware scanning, and monitoring built in.', items: ['JWT / RBAC', 'Tenant isolation', 'Audit logging', 'Observability'] },
];

export default function Page() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Technologies', path: '/technologies' }])} />

      <section className="relative overflow-hidden border-b border-neutral-200 bg-white">
        <div className="pointer-events-none absolute inset-0 bg-hero-glow" />
        <Container className="relative py-16 md:py-20">
          <Badge>Technologies</Badge>
          <h1 className="mt-4 max-w-3xl text-3xl font-extrabold tracking-tight text-neutral-900 md:text-5xl">
            The technologies we build on
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-neutral-600">
            We choose proven, well-supported technology — not novelty — because the systems we build have to run a
            business reliably for years. Here is the stack behind our work.
          </p>
          <div className="mt-8">
            <Button href="/book" size="lg">Book a Consultation <ArrowRight size={18} /></Button>
          </div>
        </Container>
      </section>

      <Section>
        <Container>
          <Eyebrow>Our stack</Eyebrow>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-neutral-900 md:text-3xl">Proven tools, chosen for reliability</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {STACK.map((s) => (
              <Card key={s.area}>
                <h3 className="text-base font-bold text-neutral-900">{s.area}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-400">{s.body}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {s.items.map((it) => (
                    <span key={it} className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-xs text-neutral-600">
                      {it}
                    </span>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      <Section tone="gradient" className="border-y border-neutral-200">
        <Container className="max-w-3xl">
          <Eyebrow>How we choose</Eyebrow>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-neutral-900 md:text-3xl">
            The right tool for the job — and for the long run
          </h2>
          <p className="mt-4 leading-relaxed text-neutral-600">
            Technology choices are architecture decisions. We pick for reliability, maintainability, and the ability to
            scale without a rewrite — so the platform grows with your business.{' '}
            <a href="/services/cloud-infrastructure" className="text-primary underline hover:no-underline">
              See our cloud & infrastructure work
            </a>.
          </p>
          <div className="mt-8">
            <Button href="/services" size="lg" variant="secondary">Explore Services</Button>
          </div>
        </Container>
      </Section>
    </>
  );
}
