/**
 * @innovatix/analytics — provider-agnostic conversion tracking.
 *
 * track(name, params) sanitizes params against a SAFE allowlist (dropping any
 * PII / form-body key) and dispatches to whatever sinks exist: GA4 (gtag),
 * GTM (dataLayer), and a window CustomEvent (for tests/debug). It is a safe
 * no-op on the server and when no analytics provider is configured.
 */
import { EVENTS, SAFE_PARAM_KEYS, BLOCKED_PARAM_KEYS, type EventName, type EventParams } from './events';

export { EVENTS };
export type { EventName, EventParams, FormKind } from './events';

type AnyParams = Record<string, unknown>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    __innovatixAnalytics?: { measurementId?: string; ready: boolean };
  }
}

const SAFE = new Set<string>(SAFE_PARAM_KEYS as readonly string[]);
const BLOCKED = new Set<string>(BLOCKED_PARAM_KEYS as readonly string[]);

/** Keep only allowlisted, non-blocked, non-empty keys; coerce + truncate values. */
export function sanitizeParams(params: AnyParams = {}): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (BLOCKED.has(k) || !SAFE.has(k)) continue;
    if (v == null || v === '') continue;
    out[k] = String(v).slice(0, 200);
  }
  return out;
}

/** Fire a typed conversion event. */
export function track<N extends EventName>(name: N, params?: EventParams[N]): void {
  if (typeof window === 'undefined') return;
  const safe = sanitizeParams(params as AnyParams);

  // GTM / GA4 dataLayer
  (window.dataLayer = window.dataLayer || []).push({ event: name, ...safe });
  // GA4 gtag (if loaded)
  if (typeof window.gtag === 'function') window.gtag('event', name, safe);
  // Testable + dev-observable signal
  try {
    window.dispatchEvent(new CustomEvent('innovatix:analytics', { detail: { name, params: safe } }));
  } catch {
    /* ignore */
  }
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.debug('[analytics]', name, safe);
  }
}

/**
 * Initialize analytics. If a GA4 measurement id is provided, load gtag once.
 * With no id, analytics is a safe no-op (events still push to dataLayer, which
 * a GTM container could consume). Never loads a provider on the server.
 */
export function initAnalytics(opts?: { measurementId?: string }): void {
  if (typeof window === 'undefined') return;
  window.__innovatixAnalytics = window.__innovatixAnalytics || { measurementId: opts?.measurementId, ready: false };
  window.dataLayer = window.dataLayer || [];
  const id = opts?.measurementId;
  if (!id || window.__innovatixAnalytics.ready) return;

  window.gtag = window.gtag || function gtag(...args: unknown[]) { window.dataLayer!.push(args); };
  window.gtag('js', new Date());
  // anonymize_ip + no ad personalization signals by default (privacy-forward).
  window.gtag('config', id, { anonymize_ip: true, allow_google_signals: false });

  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(s);
  window.__innovatixAnalytics.ready = true;
}

// ── Named helpers (thin, typed wrappers so components read clearly) ──────────
export const analytics = {
  ctaClicked: (p: EventParams['cta_clicked']) => track(EVENTS.CTA_CLICKED, p),
  contactFormStarted: (form: EventParams['contact_form_started']['form']) => track(EVENTS.CONTACT_FORM_STARTED, { form }),
  contactFormSubmitted: (p: EventParams['contact_form_submitted']) => track(EVENTS.CONTACT_FORM_SUBMITTED, p),
  contactFormSuccess: (p: EventParams['contact_form_success']) => track(EVENTS.CONTACT_FORM_SUCCESS, p),
  contactFormError: (p: EventParams['contact_form_error']) => track(EVENTS.CONTACT_FORM_ERROR, p),
  bookingStarted: () => track(EVENTS.BOOKING_STARTED, {}),
  bookingCompleted: (p: EventParams['booking_completed'] = {}) => track(EVENTS.BOOKING_COMPLETED, p),
  serviceInterestSelected: (serviceInterest: string) => track(EVENTS.SERVICE_INTEREST_SELECTED, { serviceInterest }),
  caseStudyViewed: (slug: string) => track(EVENTS.CASE_STUDY_VIEWED, { slug }),
};
