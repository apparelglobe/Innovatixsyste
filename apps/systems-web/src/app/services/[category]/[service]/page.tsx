import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SERVICE_PAGES, isIndexable } from '@/lib/services';
import { pageMetadata } from '@/lib/seo';
import { ServicePageView } from '@/components/ServicePageView';

type Params = { category: string; service: string };

// Only registry pages exist; anything else 404s (no thin/auto pages).
export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return Object.keys(SERVICE_PAGES).map((slug) => {
    const [category = '', service = ''] = slug.split('/');
    return { category, service };
  });
}

export function generateMetadata({ params }: { params: Params }): Metadata {
  const slug = `${params.category}/${params.service}`;
  const p = SERVICE_PAGES[slug];
  if (!p) return {};
  return pageMetadata({
    title: p.title,
    description: p.metaDescription,
    path: `/services/${slug}`,
    index: isIndexable(slug),
  });
}

export default function Page({ params }: { params: Params }) {
  const slug = `${params.category}/${params.service}`;
  const p = SERVICE_PAGES[slug];
  if (!p) return notFound();
  return <ServicePageView page={p} />;
}
