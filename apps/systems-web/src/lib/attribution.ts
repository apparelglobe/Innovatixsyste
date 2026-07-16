/**
 * Client-side attribution capture. First-touch (landing page, referrer, UTMs,
 * GCLID) is stored on the first visit; each submission sends last-touch UTMs with
 * a first-touch landing/referrer fallback. Only marketing attribution is
 * captured here — never sensitive form content.
 */
export type Attribution = {
  landingPage?: string;
  referrerUrl?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  gclid?: string;
};

const FT_KEY = 'inx_first_touch';

function utmsFromUrl(): Attribution {
  if (typeof window === 'undefined') return {};
  const q = new URLSearchParams(window.location.search);
  const pick = (k: string) => q.get(k) || undefined;
  return {
    utmSource: pick('utm_source'),
    utmMedium: pick('utm_medium'),
    utmCampaign: pick('utm_campaign'),
    utmTerm: pick('utm_term'),
    utmContent: pick('utm_content'),
    gclid: pick('gclid'),
  };
}

/** Call once on mount — persists first-touch attribution if not already set. */
export function captureFirstTouch(): void {
  if (typeof window === 'undefined') return;
  try {
    if (localStorage.getItem(FT_KEY)) return;
    const ft: Attribution & { capturedAt: number } = {
      landingPage: window.location.pathname + window.location.search,
      referrerUrl: document.referrer || undefined,
      ...utmsFromUrl(),
      capturedAt: Date.now(),
    };
    localStorage.setItem(FT_KEY, JSON.stringify(ft));
  } catch {
    /* storage unavailable — attribution best-effort */
  }
}

/** Build the attribution payload for a submission (last-touch + first-touch fallback). */
export function getAttribution(): Attribution {
  if (typeof window === 'undefined') return {};
  let ft: Attribution = {};
  try {
    ft = JSON.parse(localStorage.getItem(FT_KEY) || '{}');
  } catch {
    /* ignore */
  }
  const cur = utmsFromUrl();
  const merge = (a?: string, b?: string) => a || b || undefined;
  return {
    landingPage: ft.landingPage || window.location.pathname,
    referrerUrl: ft.referrerUrl,
    utmSource: merge(cur.utmSource, ft.utmSource),
    utmMedium: merge(cur.utmMedium, ft.utmMedium),
    utmCampaign: merge(cur.utmCampaign, ft.utmCampaign),
    utmTerm: merge(cur.utmTerm, ft.utmTerm),
    utmContent: merge(cur.utmContent, ft.utmContent),
    gclid: merge(cur.gclid, ft.gclid),
  };
}
