'use client';

/**
 * Book flow (native scheduler — no third-party calendar).
 * Step 1 = qualification form → POST /leads (persists the lead, returns leadId).
 * Step 2 = pick a real free slot → POST /booking/schedule, which stores the
 * appointment (Meeting) linked to that lead. Free slots come live from the API.
 */
import { useCallback, useEffect, useState } from 'react';
import { Check, Calendar, Loader2 } from 'lucide-react';
import { analytics } from '@innovatix/analytics';
import { LeadForm } from './LeadForm';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4040/v1';

type Slot = { start: string; label: string };
type DayOpt = { value: string; label: string };

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Next `count` Mon–Fri calendar days starting today (backend filters by notice/availability). */
function businessDays(count: number): DayOpt[] {
  const out: DayOpt[] = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  for (let k = 0; k < 40 && out.length < count; k++) {
    const dow = d.getDay();
    if (dow >= 1 && dow <= 5) out.push({ value: ymd(d), label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) });
    d.setDate(d.getDate() + 1);
  }
  return out;
}

export function BookFlow() {
  const [lead, setLead] = useState<{ email: string; name: string; leadId?: string } | null>(null);

  useEffect(() => {
    analytics.bookingStarted();
  }, []);

  if (!lead) {
    return (
      <div>
        <ol className="mb-6 flex items-center gap-3 text-xs font-semibold">
          <li className="flex items-center gap-1.5 text-primary-light"><span className="grid h-5 w-5 place-items-center rounded-full bg-primary text-white">1</span> Tell us about your project</li>
          <span className="h-px w-6 bg-line-strong" />
          <li className="flex items-center gap-1.5 text-neutral-500"><span className="grid h-5 w-5 place-items-center rounded-full border border-line-strong">2</span> Pick a time</li>
        </ol>
        <LeadForm variant="book" onSuccess={(email, name, leadId) => setLead({ email, name, leadId })} />
      </div>
    );
  }

  return <SlotPicker lead={lead} />;
}

function SlotPicker({ lead }: { lead: { email: string; name: string; leadId?: string } }) {
  const days = businessDays(8);
  const [date, setDate] = useState(days[0]?.value ?? ymd(new Date()));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<string | null>(null); // slot.start being booked
  const [confirmed, setConfirmed] = useState<{ label: string; day: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSlots = useCallback(async (d: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/booking/slots?date=${d}`);
      const data = (await res.json().catch(() => ({}))) as { slots?: Slot[] };
      setSlots(data.slots ?? []);
    } catch {
      setSlots([]);
      setError('Could not load times. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!confirmed) void loadSlots(date);
  }, [date, confirmed, loadSlots]);

  async function book(slot: Slot) {
    if (!lead.leadId) {
      setError('We could not link your details. Please refresh and try again.');
      return;
    }
    setBooking(slot.start);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/booking/schedule`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ leadId: lead.leadId, start: slot.start, email: lead.email, name: lead.name }),
      });
      if (res.status === 201) {
        const dayLabel = new Date(slot.start).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
        analytics.bookingCompleted?.({ reference: lead.leadId });
        setConfirmed({ label: slot.label, day: dayLabel });
        return;
      }
      if (res.status === 409) {
        setError('That time was just taken — please pick another.');
        await loadSlots(date);
        return;
      }
      setError('Something went wrong booking that time. Please try another.');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBooking(null);
    }
  }

  if (confirmed) {
    return (
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-6">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/15 text-primary-light"><Check size={18} /></span>
          <div>
            <p className="text-lg font-bold text-white">You&rsquo;re booked.</p>
            <p className="mt-1 text-neutral-200">{confirmed.day} at <span className="font-semibold text-white">{confirmed.label}</span></p>
            <p className="mt-3 text-sm text-neutral-400">A confirmation is on its way to {lead.email}. We look forward to talking through your project.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
        <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/15 text-primary-light"><Check size={14} /></span>
        <div>
          <p className="text-sm font-semibold text-white">Your details are saved.</p>
          <p className="text-sm text-neutral-300">Pick a time that works — your consultation is linked automatically.</p>
        </div>
      </div>

      {/* Date selector */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {days.map((d) => (
          <button
            key={d.value}
            type="button"
            onClick={() => setDate(d.value)}
            className={`shrink-0 rounded-lg border px-3 py-2 text-sm transition ${d.value === date ? 'border-primary bg-primary/15 font-semibold text-white' : 'border-line-strong text-neutral-300 hover:border-primary/40 hover:text-white'}`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Slots */}
      <div className="min-h-[8rem] rounded-xl border border-line-strong bg-elevated p-4">
        {loading ? (
          <div className="flex h-28 items-center justify-center text-neutral-400"><Loader2 className="mr-2 animate-spin" size={18} /> Loading times…</div>
        ) : slots.length === 0 ? (
          <div className="flex h-28 flex-col items-center justify-center gap-1 text-center text-neutral-400">
            <Calendar size={20} />
            <p className="text-sm">No open times on this day. Try another date.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {slots.map((s) => (
              <button
                key={s.start}
                type="button"
                disabled={booking !== null}
                onClick={() => book(s)}
                className={`rounded-lg border border-line-strong px-3 py-2.5 text-sm font-medium text-neutral-100 transition hover:border-primary hover:bg-primary/10 disabled:opacity-50 ${booking === s.start ? 'border-primary bg-primary/15' : ''}`}
              >
                {booking === s.start ? <Loader2 className="mx-auto animate-spin" size={16} /> : s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      <p className="mt-3 text-center text-xs text-neutral-500">Times shown in Eastern Time (ET).</p>
    </div>
  );
}
