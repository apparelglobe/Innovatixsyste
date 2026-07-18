import type { Metadata } from 'next';
import { SITE, absoluteUrl } from './site';

/** Build Next Metadata with canonical + OG, always on the canonical host. */
export function pageMetadata(opts: {
  title: string;
  description: string;
  path: string;
  index?: boolean;
}): Metadata {
  const url = absoluteUrl(opts.path);
  const index = opts.index !== false;
  return {
    title: opts.title,
    description: opts.description,
    alternates: { canonical: url },
    robots: index ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: {
      title: opts.title,
      description: opts.description,
      url,
      siteName: SITE.name,
      type: 'website',
    },
    twitter: { card: 'summary_large_image', title: opts.title, description: opts.description },
  };
}

/** Organization JSON-LD (site-wide). */
export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE.name,
    legalName: SITE.legalName,
    url: SITE.url,
    description: SITE.description,
    email: SITE.email,
    telephone: SITE.phoneHref.replace('tel:', ''),
    slogan: SITE.tagline,
    contactPoint: [
      {
        '@type': 'ContactPoint',
        telephone: SITE.phoneHref.replace('tel:', ''),
        contactType: 'sales',
        email: SITE.email,
        areaServed: 'US',
        availableLanguage: 'English',
      },
    ],
  };
}

/** Service JSON-LD. */
export function serviceJsonLd(opts: { name: string; description: string; path: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: opts.name,
    serviceType: 'Custom software development',
    description: opts.description,
    url: absoluteUrl(opts.path),
    provider: { '@type': 'Organization', name: SITE.name, url: SITE.url },
    areaServed: 'US',
  };
}

/** BreadcrumbList JSON-LD. */
export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.path),
    })),
  };
}

/** FAQPage JSON-LD. */
export function faqJsonLd(faqs: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

