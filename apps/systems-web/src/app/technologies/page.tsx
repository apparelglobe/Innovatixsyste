import type { Metadata } from 'next';
import { ComingSoon } from '@/components/ComingSoon';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Technologies | Innovatix Systems',
  description: 'The enterprise technology stack Innovatix Systems builds on — React, Next.js, NestJS, PostgreSQL, AWS, Kubernetes.',
  path: '/technologies',
  index: false,
});

export default function Page() {
  return (
    <ComingSoon
      eyebrow="Technologies"
      title="The technologies we build on"
      blurb="React, Next.js, Node.js, NestJS, PostgreSQL, AWS, Docker, and Kubernetes — chosen for reliability at enterprise scale. Detailed technology pages are on the way."
    />
  );
}
