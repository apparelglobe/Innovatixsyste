'use client';

/**
 * Book flow: the visitor is NEVER sent to Cal.com before the lead is persisted.
 * Step 1 = qualification form → POST /v1/leads (lead + attribution saved in
 * Innovatix). Step 2 = Cal.com scheduling, prefilled with only email + name; the
 * webhook links the booking back to the lead by email.
 */
import { useEffect, useState } from 'react';
import { Check, Calendar } from 'lucide-react';
import { analytics } from '@innovatix/analytics';
import { LeadForm } from './LeadForm';

const CAL_URL = process.env.NEXT_PUBLIC_CALCOM_URL || 'https://cal.com/innovatix/consultation';

export function BookFlow() {
  const [scheduled, setScheduled] = useState<{ email: string; name: string } | null>(null);

  useEffect(() => {
    analytics.bookingStarted();
  }, []);

  if (!scheduled) {
    return (
      <div>
        <ol className="mb-6 flex items-center gap-3 text-xs font-semibold">
          <li className="flex items-center gap-1.5 text-primary-light"><span className="grid h-5 w-5 place-items-center rounded-full bg-primary text-white">1</span> Tell us about your project</li>
          <span className="h-px w-6 bg-line-strong" />
          <li className="flex items-center gap-1.5 text-neutral-500"><span className="grid h-5 w-5 place-items-center rounded-full border border-line-strong">2</span> Pick a time</li>
        </ol>
        <LeadForm variant="book" onSuccess={(email, name) => setScheduled({ email, name })} />
      </div>
    );
  }

  const prefill = new URLSearchParams({ email: scheduled.email, name: scheduled.name }).toString();
  const url = `${CAL_URL}?${prefill}`;
  return (
    <div>
      <div className="mb-5 flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
        <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/15 text-primary-light"><Check size={14} /></span>
        <div>
          <p className="text-sm font-semibold text-white">Your details are saved.</p>
          <p className="text-sm text-neutral-300">Pick a time below — your consultation will be linked automatically.</p>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-line-strong bg-elevated">
        <iframe
          title="Schedule a consultation"
          src={url}
          className="h-[640px] w-full"
          loading="lazy"
        />
      </div>
      <p className="mt-3 text-center text-sm text-neutral-400">
        Scheduler not loading?{' '}
        <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary-light hover:underline">
          <Calendar size={14} /> Open it in a new tab
        </a>
      </p>
    </div>
  );
}
