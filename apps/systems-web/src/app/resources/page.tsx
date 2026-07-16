import type { Metadata } from 'next';
import { ComingSoon } from '@/components/ComingSoon';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Resources | Innovatix Systems',
  description: 'Insights and guides from Innovatix Systems on enterprise software, AI automation, and systems modernization.',
  path: '/resources',
  index: false,
});

export default function Page() {
  return (
    <ComingSoon
      eyebrow="Resources"
      title="Insights on enterprise software &amp; AI"
      blurb="Practical writing on building enterprise systems, AI automation, and modernization. Our resource library is coming soon."
    />
  );
}
