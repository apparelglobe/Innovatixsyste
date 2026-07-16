import { renderOgImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Innovatix Systems — Enterprise software, AI & platforms';

export default function OpengraphImage() {
  return renderOgImage({
    eyebrow: 'Enterprise Software Company',
    title: 'Enterprise software, AI, and platforms',
    subtitle: 'Engineered to run your business as one system — with a connected client portal for full transparency.',
  });
}
