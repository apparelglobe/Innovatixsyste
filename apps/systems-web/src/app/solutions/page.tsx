import type { Metadata } from 'next';
import { ComingSoon } from '@/components/ComingSoon';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Solutions | Innovatix Systems',
  description: 'Outcome-focused solutions from Innovatix Systems — automation, modernization, and integration for enterprise operations.',
  path: '/solutions',
  index: false,
});

export default function Page() {
  return (
    <ComingSoon
      eyebrow="Solutions"
      title="Solutions for how your business actually operates"
      blurb="Business-process automation, operations modernization, multi-system integration, and legacy replacement — packaged around outcomes. Detailed solution pages are on the way."
    />
  );
}
