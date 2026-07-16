import type { Metadata } from 'next';
import { ComingSoon } from '@/components/ComingSoon';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Cookie Policy | Innovatix Systems',
  description: 'Innovatix Systems cookie policy.',
  path: '/cookie-policy',
  index: false,
});

export default function Page() {
  return (
    <ComingSoon
      eyebrow="Legal"
      title="Cookie Policy"
      blurb="Our cookie policy is being finalized and will be published here shortly. For any questions in the meantime, please contact us."
    />
  );
}
