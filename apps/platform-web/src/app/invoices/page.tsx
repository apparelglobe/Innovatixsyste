'use client';

/**
 * Slice 6 — relationship-wide client Billing History (OWNER-only). Shows ALL invoices across every project
 * plus Care-Plan/retainer invoices (not just the newest project's), with filter tabs, a project filter,
 * per-year grouping, a per-currency summary band, and keyset "Load more". Data comes from the dedicated
 * GET /portal/billing via useBilling; me/org/canBilling + the project list come from useRelationship.
 */
import Link from 'next/link';
import { Loader2, ChevronRight, Lock, RefreshCw } from 'lucide-react';
import { PortalShell } from '@/components/PortalShell';
import { useRelationship } from '@/lib/useRelationship';
import { useBilling, type BillingTab, type BillingCarePlan } from '@/lib/useBilling';
import { statusBadge, isRetainer, carePlanPeriod } from '@/lib/invoice-format';
import { fmtDate, fmtMoney, DISPLAY_TZ } from '@/lib/fmt';

const TABS: { key: BillingTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unpaid', label: 'Unpaid' },
  { key: 'paid', label: 'Paid' },
  { key: 'overdue', label: 'Overdue' },
];

// The Care Plan summary shown above the invoice list. Never rendered for a DRAFT plan — the API never
// selects one — so only the live + ended states appear here.
function CarePlanCard({ plan }: { plan: BillingCarePlan }) {
  const amount = fmtMoney(plan.monthlyAmountCents, plan.currency);
  const live = plan.status === 'ACTIVE' || plan.status === 'PAST_DUE';
  const pill =
    plan.status === 'ACTIVE' ? { label: 'Active', cls: 'bg-emerald-400/15 text-emerald-300' }
    : plan.status === 'PAST_DUE' ? { label: 'Past due', cls: 'bg-red-500/15 text-red-300' }
    : plan.status === 'PAUSED' ? { label: 'Paused', cls: 'bg-amber-400/15 text-amber-300' }
    : { label: 'Ended', cls: 'bg-white/10 text-neutral-400' };
  const line =
    live ? 'Billed monthly — pay each invoice as it’s issued.'
    : plan.status === 'PAUSED' ? 'Recurring billing is paused. No invoices are being issued right now.'
    : 'This care plan has ended. No further invoices will be issued.';

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="flex flex-wrap items-start justify-between gap-4 p-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary-light"><RefreshCw size={16} /></span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate font-bold text-white">{plan.name}</h2>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${pill.cls}`}>{pill.label}</span>
              </div>
              <p className="text-xs text-neutral-500">Care plan</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-neutral-400">{line}</p>
          {live && plan.nextInvoiceAt && (
            <p className="mt-1 text-xs text-neutral-500">Next invoice {fmtDate(plan.nextInvoiceAt)}</p>
          )}
          {plan.includedSummary && <p className="mt-2 text-xs text-neutral-500">{plan.includedSummary}</p>}
        </div>
        {live && (
          <div className="text-right">
            <div className="text-2xl font-extrabold text-white">{amount}</div>
            <div className="text-xs text-neutral-500">per month</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function InvoicesPage() {
  const { me, userName, canBilling, projects, loading } = useRelationship();
  const { invoices, aggregates, carePlan, tab, setTab, projectId, setProjectId, nextCursor, more, loadingMore } = useBilling();

  if (loading || !me) return <div className="grid min-h-screen place-items-center bg-base text-neutral-400"><Loader2 className="animate-spin" /></div>;

  // Billing is OWNER-only, enforced server-side (GET /portal/billing 403s a member). Mirror it here: a
  // member who navigates directly sees a restricted notice, not data — and the Billing nav stays hidden.
  if (!canBilling) {
    return (
      <PortalShell orgName={me.org.name} userName={userName} active="overview" billingAllowed={false}>
        <div className="mx-auto max-w-3xl">
          <div className="mt-10 flex flex-col items-center rounded-2xl border border-line bg-surface p-10 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-white/[0.04] text-neutral-400"><Lock size={20} /></span>
            <h1 className="mt-4 text-lg font-bold text-white">Billing is limited to account owners</h1>
            <p className="mt-1.5 max-w-md text-sm text-neutral-500">
              Invoices, payments, and care-plan details are visible to account owners on your team. Ask an owner if you need billing access.
            </p>
            <Link href="/" className="mt-5 rounded-lg border border-line-strong px-4 py-2 text-sm font-semibold text-neutral-200 hover:bg-white/[0.05]">Back to home</Link>
          </div>
        </div>
      </PortalShell>
    );
  }

  const currencies = Object.entries(aggregates.byCurrency);
  // Per-year sections; anchor = issuedAt ?? createdAt, computed in the display TZ (so a header can't disagree
  // with a row's ET-pinned date near the New-Year boundary). Bucket by year (unique keys, no duplicate
  // headers even if issuedAt isn't monotonic with the createdAt sort), then render years descending.
  const byYear = new Map<number, NonNullable<typeof invoices>>();
  for (const inv of invoices ?? []) {
    const year = Number(new Date(inv.issuedAt ?? inv.createdAt).toLocaleDateString('en-US', { timeZone: DISPLAY_TZ, year: 'numeric' }));
    let arr = byYear.get(year);
    if (!arr) { arr = []; byYear.set(year, arr); }
    arr.push(inv);
  }
  const groups = [...byYear.entries()].sort((a, b) => b[0] - a[0]).map(([year, rows]) => ({ year, rows }));

  return (
    <PortalShell orgName={me.org.name} userName={userName} active="invoices" billingAllowed>
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-extrabold tracking-tight text-white">Billing</h1>
        <p className="mt-1 text-sm text-neutral-500">Invoices and care plan for {me.org.name}.</p>

        {carePlan && <div className="mt-6"><CarePlanCard plan={carePlan} /></div>}

        {/* Per-currency relationship totals (lifetime paid + currently outstanding), never summed across currencies. */}
        {currencies.length > 0 && (
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {currencies.map(([cur, a]) => (
              <div key={cur} className="rounded-2xl border border-line bg-surface p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Paid to date{currencies.length > 1 ? ` · ${cur}` : ''}</span>
                  <span className="text-lg font-extrabold text-white">{fmtMoney(a.lifetimePaidCents, cur)}</span>
                </div>
                <div className="mt-1.5 flex items-baseline justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Outstanding</span>
                  <span className="text-lg font-extrabold text-white">{fmtMoney(a.outstandingCents, cur)}</span>
                </div>
                {a.overdueCount > 0 && <p className="mt-1 text-xs font-semibold text-red-300">{a.overdueCount} overdue</p>}
              </div>
            ))}
          </div>
        )}

        {/* Filters: status tabs + optional project filter (list only — the totals above stay relationship-wide). */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1.5">
            {TABS.map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${tab === t.key ? 'bg-primary/20 text-primary-light' : 'bg-white/[0.04] text-neutral-400 hover:text-white'}`}>{t.label}</button>
            ))}
          </div>
          {projects.length > 1 && (
            <select value={projectId ?? ''} onChange={(e) => setProjectId(e.target.value || null)}
              className="ml-auto rounded-lg border border-line bg-base px-2.5 py-1 text-xs text-neutral-200 focus:border-primary focus:outline-none">
              <option value="">All projects</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
        </div>

        <div className="mt-3 overflow-hidden rounded-2xl border border-line bg-surface">
          {invoices === undefined ? (
            <div className="grid place-items-center py-16 text-neutral-400"><Loader2 className="animate-spin" /></div>
          ) : invoices.length === 0 ? (
            <p className="p-6 text-neutral-400">No billing history yet.</p>
          ) : (
            <div className="divide-y divide-line">
              {groups.map((g) => (
                <div key={g.year}>
                  <div className="bg-white/[0.02] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">{g.year}</div>
                  {g.rows.map((inv) => {
                    const s = statusBadge(inv);
                    const period = carePlanPeriod(inv);
                    return (
                      <Link key={inv.id} href={`/invoices/${inv.id}`} className="flex flex-wrap items-center gap-3 p-4 transition hover:bg-white/[0.03]">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">{inv.number}</span>
                            {isRetainer(inv)
                              ? <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary-light">Care Plan</span>
                              : inv.projectName && <span className="truncate rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-semibold text-neutral-400">{inv.projectName}</span>}
                          </div>
                          <div className="text-xs text-neutral-500">
                            {period ? <>Billing period {period}</> : <>Issued {fmtDate(inv.issuedAt)}</>}
                            {inv.status === 'VOIDED' ? ' · voided' : inv.status === 'PAID' ? ` · paid ${fmtDate(inv.paidAt)}` : inv.dueAt ? ` · due ${fmtDate(inv.dueAt)}` : ''}
                          </div>
                        </div>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.cls}`}>{s.label}</span>
                        <div className="w-24 text-right font-bold text-white">{fmtMoney(inv.amountCents, inv.currency)}</div>
                        <ChevronRight size={16} className="text-neutral-600" />
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {nextCursor && (
          <div className="mt-4 grid place-items-center">
            <button onClick={more} disabled={loadingMore} className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-4 py-2 text-sm font-semibold text-neutral-200 hover:bg-white/[0.05] disabled:opacity-60">
              {loadingMore && <Loader2 size={14} className="animate-spin" />} Load more
            </button>
          </div>
        )}
      </div>
    </PortalShell>
  );
}
