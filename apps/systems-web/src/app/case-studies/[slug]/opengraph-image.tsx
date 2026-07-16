import { renderOgImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og';
import { CASE_STUDIES } from '@/lib/case-studies';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Innovatix Systems case study';

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return Object.keys(CASE_STUDIES).map((slug) => ({ slug }));
}

export default function CaseStudyOgImage({ params }: { params: Params }) {
  const c = CASE_STUDIES[params.slug];
  // No fabricated metrics/logos — only the client name + honest scope line.
  return renderOgImage({
    eyebrow: c?.industry ? `Case Study · ${c.industry}` : 'Case Study',
    title: c?.client ?? 'Systems we’ve engineered',
    subtitle: c?.summary ? c.summary.slice(0, 130) : undefined,
  });
}
