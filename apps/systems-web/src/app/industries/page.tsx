import type { Metadata } from 'next';
import { ComingSoon } from '@/components/ComingSoon';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Industries | Innovatix Systems',
  description: 'Industry expertise from Innovatix Systems across manufacturing, distribution, logistics, healthcare, retail, and more.',
  path: '/industries',
  index: false,
});

export default function Page() {
  return (
    <ComingSoon
      eyebrow="Industries"
      title="Enterprise software for your industry"
      blurb="Manufacturing, wholesale &amp; distribution, logistics, healthcare, retail, e-commerce, and professional services. Industry-specific pages are in progress."
    />
  );
}
