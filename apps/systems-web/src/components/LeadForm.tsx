'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, Loader2 } from 'lucide-react';
import { analytics } from '@innovatix/analytics';
import { captureFirstTouch, getAttribution } from '@/lib/attribution';

type Variant = 'contact' | 'book';
type State = 'idle' | 'submitting' | 'success' | 'error';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4040/v1';

const SERVICE_OPTIONS = [
  'Custom Software Development',
  'Enterprise Software Development',
  'ERP Development',
  'AI Automation',
  'Cloud & Infrastructure',
  'Data & Analytics',
  'Other / Not sure yet',
];
const BUDGET_OPTIONS = ['Under $25k', '$25k–$50k', '$50k–$100k', '$100k–$250k', '$250k+', 'Not sure yet'];
const START_OPTIONS = ['Immediately', 'Within 1 month', '1–3 months', '3–6 months', 'Exploring'];

function field(label: string, node: React.ReactNode, required = false) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-neutral-200">
        {label}{required && <span className="text-primary-light"> *</span>}
      </span>
      {node}
    </label>
  );
}

const inputCls =
  'w-full rounded-lg border border-line-strong bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30';

export function LeadForm({ variant, onSuccess }: { variant: Variant; onSuccess?: (email: string, name: string, leadId?: string) => void }) {
  const [state, setState] = useState<State>('idle');
  const mountedAt = useRef(Date.now());
  // Stable idempotency key per form instance (retries/double-clicks reuse it).
  const idempotencyKey = useMemo(
    () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `k-${Math.random().toString(36).slice(2)}-${mountedAt.current}`),
    [],
  );

  const started = useRef(false);
  // Prefill service interest when arriving from a service page (/book?service=…).
  const [presetService] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('service') || '';
  });
  const serviceOptions = presetService && !SERVICE_OPTIONS.includes(presetService) ? [presetService, ...SERVICE_OPTIONS] : SERVICE_OPTIONS;

  useEffect(() => {
    captureFirstTouch();
  }, []);

  // Fire "form started" once, on first interaction (never re-fires).
  function markStarted() {
    if (started.current) return;
    started.current = true;
    analytics.contactFormStarted(variant);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state === 'submitting') return;
    setState('submitting');
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get('businessEmail') || '');
    const firstName = String(fd.get('firstName') || '');
    const serviceInterest = String(fd.get('serviceInterest') || '') || undefined;
    analytics.contactFormSubmitted({ form: variant, serviceInterest });
    const payload = {
      firstName,
      lastName: String(fd.get('lastName') || ''),
      businessEmail: email,
      phone: String(fd.get('phone') || '') || undefined,
      company: String(fd.get('company') || '') || undefined,
      jobTitle: String(fd.get('jobTitle') || '') || undefined,
      form: variant === 'book' ? 'BOOK' : 'CONTACT',
      serviceInterest: String(fd.get('serviceInterest') || '') || undefined,
      projectDescription: String(fd.get('projectDescription') || '') || undefined,
      budgetRange: String(fd.get('budgetRange') || '') || undefined,
      desiredStartWindow: String(fd.get('desiredStartWindow') || '') || undefined,
      consentGranted: fd.get('consent') === 'on' ? true : undefined,
      consentPolicyVersion: fd.get('consent') === 'on' ? '2026-07' : undefined,
      honeypot: String(fd.get('company_website') || ''), // hidden field
      submitElapsedMs: Date.now() - mountedAt.current,
      idempotencyKey,
      attribution: getAttribution(),
    };
    try {
      const res = await fetch(`${API_BASE}/leads`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok && res.status !== 202) throw new Error(String(res.status));
      const data = (await res.json().catch(() => ({}))) as { reference?: string };
      setState('success');
      if (variant === 'book') analytics.bookingCompleted({ reference: data.reference });
      else analytics.contactFormSuccess({ form: variant, reference: data.reference });
      onSuccess?.(email, firstName, data.reference);
    } catch (err) {
      setState('error');
      analytics.contactFormError({ form: variant, code: err instanceof Error ? err.message : 'error' });
    }
  }

  if (state === 'success' && !onSuccess) {
    return (
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-8 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/15 text-primary-light"><Check size={22} /></div>
        <h3 className="mt-4 text-lg font-bold text-white">Your request has been received</h3>
        <p className="mt-2 text-sm text-neutral-300">Thanks — our team will contact you shortly to discuss your project.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} onFocusCapture={markStarted} className="space-y-4" noValidate>
      {/* honeypot — visually hidden, must stay empty */}
      <div aria-hidden className="absolute left-[-9999px] top-[-9999px] h-0 w-0 overflow-hidden">
        <label>Company website<input type="text" name="company_website" tabIndex={-1} autoComplete="off" /></label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {field('First name', <input name="firstName" required maxLength={120} className={inputCls} placeholder="Grace" />, true)}
        {field('Last name', <input name="lastName" maxLength={120} className={inputCls} placeholder="Hopper" />)}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {field('Business email', <input name="businessEmail" type="email" required maxLength={320} className={inputCls} placeholder="you@company.com" />, true)}
        {field('Phone', <input name="phone" maxLength={40} className={inputCls} placeholder="Optional" />)}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {field('Company', <input name="company" maxLength={200} className={inputCls} placeholder="Company name" />)}
        {field('Job title', <input name="jobTitle" maxLength={160} className={inputCls} placeholder="Optional" />)}
      </div>

      {field('What do you need help with?', (
        <select name="serviceInterest" className={inputCls} defaultValue={presetService || ''}
          onChange={(e) => e.target.value && analytics.serviceInterestSelected(e.target.value)}>
          <option value="" disabled>Select a service…</option>
          {serviceOptions.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      ))}

      {variant === 'book' && (
        <div className="grid gap-4 sm:grid-cols-2">
          {field('Estimated budget', (
            <select name="budgetRange" className={inputCls} defaultValue="">
              <option value="" disabled>Select…</option>
              {BUDGET_OPTIONS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          ))}
          {field('Desired start', (
            <select name="desiredStartWindow" className={inputCls} defaultValue="">
              <option value="" disabled>Select…</option>
              {START_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          ))}
        </div>
      )}

      {field(
        variant === 'book' ? 'Tell us about your project' : 'How can we help?',
        <textarea name="projectDescription" rows={4} maxLength={5000} className={inputCls} placeholder="A few sentences about your goals, systems, and constraints." required={variant === 'book'} />,
        variant === 'book',
      )}

      <label className="flex items-start gap-2.5 text-sm text-neutral-400">
        <input type="checkbox" name="consent" className="mt-0.5 h-4 w-4 rounded border-line-strong bg-transparent" />
        <span>I agree to be contacted about my inquiry and accept the <a href="/privacy" className="text-primary-light hover:underline">privacy policy</a>.</span>
      </label>

      {state === 'error' && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">
          Something went wrong. Please try again shortly.
        </p>
      )}

      <button
        type="submit"
        disabled={state === 'submitting'}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 font-semibold text-white shadow-cta transition-colors hover:bg-primary-dark disabled:opacity-60 sm:w-auto"
      >
        {state === 'submitting' ? <><Loader2 size={18} className="animate-spin" /> Sending…</>
          : variant === 'book' ? <>Continue to scheduling <ArrowRight size={18} /></>
          : <>Send message <ArrowRight size={18} /></>}
      </button>
    </form>
  );
}
