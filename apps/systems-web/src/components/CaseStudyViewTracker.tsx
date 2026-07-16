'use client';

import { useEffect } from 'react';
import { analytics } from '@innovatix/analytics';

/** Fires case_study_viewed once when a case-study page mounts. */
export function CaseStudyViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    analytics.caseStudyViewed(slug);
  }, [slug]);
  return null;
}
