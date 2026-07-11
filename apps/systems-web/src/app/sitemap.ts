import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/site';
import { publishedServiceSlugs } from '@/lib/services';

/**
 * Only INDEXABLE pages appear here: the home page + service pages that are
 * published AND pass the full QC checklist. Draft/thin pages are excluded so
 * they are never surfaced to search engines.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date('2026-07-11');
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/'), lastModified, changeFrequency: 'weekly', priority: 1 },
  ];
  const serviceRoutes: MetadataRoute.Sitemap = publishedServiceSlugs().map((slug) => ({
    url: absoluteUrl(`/services/${slug}`),
    lastModified,
    changeFrequency: 'weekly',
    priority: 0.9,
  }));
  return [...staticRoutes, ...serviceRoutes];
}
