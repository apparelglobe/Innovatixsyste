// Canonical display timezone for every business-event date in the portal (proposal
// sent/accepted/signed, invoices, milestones, activity). Pinning it means you, your ops
// team, and the client all read the SAME calendar date for an event — instead of each
// browser formatting in its own zone, which made a 22:49 UTC "sent" time render as the
// next day for any viewer east of UTC. This is a US-Eastern shop and the prod box already
// runs America/New_York, so ET is the natural anchor. It's a single constant: change it
// here to move every date in the app. (Revisit if a large share of clients ever sit in
// another region — see the fmtDate call sites, all of which flow through here.)
export const DISPLAY_TZ = 'America/New_York';
export const DISPLAY_TZ_LABEL = 'ET';

export const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-US', { timeZone: DISPLAY_TZ, month: 'short', day: 'numeric', year: 'numeric' }) : '—';

export const fmtDateTime = (d?: string | null) =>
  d ? new Date(d).toLocaleString('en-US', { timeZone: DISPLAY_TZ, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';

// The precise instant (UTC, to the second) for a `title` tooltip on a rendered date — keeps
// the ground truth that the pinned display date rounds away. Empty string for null/invalid.
export const isoTitle = (d?: string | null) => {
  if (!d) return '';
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? '' : t.toISOString();
};

export const fmtMoney = (cents: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(cents / 100);
