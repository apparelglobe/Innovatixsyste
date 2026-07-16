import type { Metadata } from 'next';
import { ComingSoon } from '@/components/ComingSoon';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Terms of Service | Innovatix Systems',
  description: 'Innovatix Systems terms of service.',
  path: '/terms',
  index: false,
});

export default function Page() {
  return (
    <ComingSoon
      eyebrow="Legal"
      title="Terms of Service"
      blurb="Our terms of service are being finalized and will be published here shortly. For any questions in the meantime, please contact us."
    />
  );
}
