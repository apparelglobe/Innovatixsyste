import type { Metadata } from 'next';
import { ComingSoon } from '@/components/ComingSoon';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Company | Innovatix Systems',
  description: 'Innovatix Systems is an enterprise software company building custom platforms, enterprise systems, and AI with full delivery transparency.',
  path: '/company',
  index: false,
});

export default function Page() {
  return (
    <ComingSoon
      eyebrow="Company"
      title="About Innovatix Systems"
      blurb="We are an enterprise software company that builds the systems businesses run on — with full delivery transparency. Company pages are in progress."
    />
  );
}
