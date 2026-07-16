import { renderOgImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og';
import { SERVICE_PAGES } from '@/lib/services';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Innovatix Systems service';

type Params = { category: string; service: string };

// Mirror the page so an image is generated for each static service route.
export function generateStaticParams(): Params[] {
  return Object.keys(SERVICE_PAGES).map((slug) => {
    const [category = '', service = ''] = slug.split('/');
    return { category, service };
  });
}

export default function ServiceOgImage({ params }: { params: Params }) {
  const p = SERVICE_PAGES[`${params.category}/${params.service}`];
  return renderOgImage({
    eyebrow: p?.category ?? 'Services',
    title: p?.h1 ?? 'Enterprise software services',
    subtitle: p?.metaDescription ? p.metaDescription.slice(0, 130) : undefined,
  });
}
