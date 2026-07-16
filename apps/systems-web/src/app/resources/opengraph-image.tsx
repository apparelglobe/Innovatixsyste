import { renderOgImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Innovatix Systems — Resources';

// Template for resources / articles. Individual articles can override with their
// own opengraph-image once the blog ships.
export default function ResourcesOgImage() {
  return renderOgImage({
    eyebrow: 'Resources',
    title: 'Insights on enterprise software, AI & delivery',
    subtitle: 'Practical guidance from the Innovatix Systems engineering team.',
  });
}
