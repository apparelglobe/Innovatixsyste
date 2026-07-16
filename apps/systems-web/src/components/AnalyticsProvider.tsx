'use client';

/**
 * Initializes analytics once and delegates CTA-click tracking: any element with
 * a `data-cta` attribute fires `cta_clicked` through @innovatix/analytics — so
 * CTAs stay declarative and no component tracks clicks inline.
 * GA4 loads only when NEXT_PUBLIC_GA_MEASUREMENT_ID is set (safe no-op otherwise).
 */
import { useEffect } from 'react';
import { initAnalytics, analytics } from '@innovatix/analytics';

export function AnalyticsProvider() {
  useEffect(() => {
    initAnalytics({ measurementId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID });

    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest('[data-cta]') as HTMLElement | null;
      if (!el) return;
      analytics.ctaClicked({
        label: el.getAttribute('data-cta') || 'cta',
        location: el.getAttribute('data-cta-loc') || 'unknown',
        href: (el as HTMLAnchorElement).getAttribute?.('href') || undefined,
      });
    };
    document.addEventListener('click', onClick, { capture: true });
    return () => document.removeEventListener('click', onClick, { capture: true });
  }, []);

  return null;
}
