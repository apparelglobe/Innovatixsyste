import type { Metadata } from 'next';
import { ComingSoon } from '@/components/ComingSoon';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Privacy Policy | Innovatix Systems',
  description: 'Innovatix Systems privacy policy.',
  path: '/privacy',
  index: false,
});

export default function Page() {
  return (
    <ComingSoon
      eyebrow="Legal"
      title="Privacy Policy"
      blurb="Our privacy policy is being finalized and will be published here shortly. For any questions in the meantime, please contact us."
    />
  );
}
