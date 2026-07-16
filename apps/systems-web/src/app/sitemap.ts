import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/site';
import { publishedServiceSlugs } from '@/lib/services';
import { verifiedCaseStudySlugs } from '@/lib/case-studies';
import { SERVICE_CATEGORIES } from '@/lib/nav';

/**
 * Only INDEXABLE pages appear here. Service pages must be published AND pass the
 * full QC checklist; case studies must be verified. Draft/thin/unverified pages
 * are excluded so they are never surfaced to search engines.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date('2026-07-13');

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/'), lastModified, changeFrequency: 'weekly', priority: 1 },
    { url: absoluteUrl('/services'), lastModified, changeFrequency: 'weekly', priority: 0.9 },
    { url: absoluteUrl('/case-studies'), lastModified, changeFrequency: 'monthly', priority: 0.7 },
    { url: absoluteUrl('/company/process'), lastModified, changeFrequency: 'monthly', priority: 0.6 },
    { url: absoluteUrl('/contact'), lastModified, changeFrequency: 'monthly', priority: 0.7 },
    { url: absoluteUrl('/book'), lastModified, changeFrequency: 'monthly', priority: 0.8 },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = SERVICE_CATEGORIES.map((c) => ({
    url: absoluteUrl(`/services/${c.key}`),
    lastModified,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const serviceRoutes: MetadataRoute.Sitemap = publishedServiceSlugs().map((slug) => ({
    url: absoluteUrl(`/services/${slug}`),
    lastModified,
    changeFrequency: 'weekly',
    priority: 0.9,
  }));

  const caseStudyRoutes: MetadataRoute.Sitemap = verifiedCaseStudySlugs().map((slug) => ({
    url: absoluteUrl(`/case-studies/${slug}`),
    lastModified,
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  return [...staticRoutes, ...categoryRoutes, ...serviceRoutes, ...caseStudyRoutes];
}
