/**
 * Conversion event catalog — the single source of truth for event names and
 * their (SAFE) parameter shapes. Components must fire events through this
 * package, never inline. No parameter here is sensitive: names, emails, phone
 * numbers, and project descriptions are NEVER part of an event and are stripped
 * defensively by the dispatcher (see index.ts).
 */
export const EVENTS = {
  CTA_CLICKED: 'cta_clicked',
  CONTACT_FORM_STARTED: 'contact_form_started',
  CONTACT_FORM_SUBMITTED: 'contact_form_submitted',
  CONTACT_FORM_SUCCESS: 'contact_form_success',
  CONTACT_FORM_ERROR: 'contact_form_error',
  BOOKING_STARTED: 'booking_started',
  BOOKING_COMPLETED: 'booking_completed',
  SERVICE_INTEREST_SELECTED: 'service_interest_selected',
  CASE_STUDY_VIEWED: 'case_study_viewed',
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];

export type FormKind = 'contact' | 'book' | 'quote';

/** Typed, SAFE parameters per event. Any other key is dropped at dispatch. */
export type EventParams = {
  cta_clicked: { label: string; location: string; href?: string };
  contact_form_started: { form: FormKind };
  contact_form_submitted: { form: FormKind; serviceInterest?: string };
  contact_form_success: { form: FormKind; reference?: string };
  contact_form_error: { form: FormKind; code?: string };
  booking_started: Record<string, never>;
  booking_completed: { reference?: string };
  service_interest_selected: { serviceInterest: string };
  case_study_viewed: { slug: string };
};

/** Keys that may be sent to sinks. Everything else is stripped. */
export const SAFE_PARAM_KEYS = [
  'label', 'location', 'href', 'form', 'serviceInterest', 'reference', 'code', 'slug',
] as const;

/** Keys that must NEVER be sent, even if a caller passes them by mistake. */
export const BLOCKED_PARAM_KEYS = [
  'email', 'businessEmail', 'firstName', 'lastName', 'name', 'phone',
  'company', 'jobTitle', 'projectDescription', 'message', 'budget', 'budgetRange',
] as const;
