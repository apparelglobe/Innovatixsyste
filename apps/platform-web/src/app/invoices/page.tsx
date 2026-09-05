'use client';

import Link from 'next/link';
import { Loader2, ChevronRight, Lock, RefreshCw } from 'lucide-react';
import { usePortal, type ClientCarePlan } from '@/lib/usePortal';
import { PortalShell } from '@/components/PortalShell';
import { fmtDate, fmtMoney } from '@/lib/fmt';

const STATUS: Record<string, { label: string; cls: string }> = {
  PAID: { label: 'Paid', cls: 'bg-emerald-400/15 text-emerald-300' },
  SENT: { label: 'Due', cls: 'bg-amber-400/15 text-amber-300' },
  OVERDUE: { label: 'Overdue', cls: 'bg-red-500/15 text-red-300' },
  DRAFT: { label: 'Draft', cls: 'bg-white/10 text-neutral-300' },
  VOIDED: { label: 'Void', cls: 'bg-white/5 text-neutral-500 line-through' },
};

// The Care Plan summary shown above the invoice list. Never rendered for a DRAFT plan — the API
// never selects one — so only the live + ended states appear here.
function CarePlanCard({ plan }: { plan: ClientCarePlan }) {
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
  const { me, project, billing, userName, loading, canBilling } = usePortal();
  if (loading || !me) return <div className="grid min-h-screen place-items-center bg-base text-neutral-400"><Loader2 className="animate-spin" /></div>;

  // Billing is OWNER-only, enforced server-side (the API returns no billing block for a member).
  // This screen mirrors that: a member who navigates here directly sees a restricted notice, not data.
  if (!canBilling || !billing) {
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

  const invoices = billing.invoices;

  return (
    <PortalShell orgName={me.org.name} userName={userName} active="invoices" billingAllowed>
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-extrabold tracking-tight text-white">Billing</h1>
        <p className="mt-1 text-sm text-neutral-500">Invoices and care plan for {me.org.name}.</p>

        {billing.carePlan && <div className="mt-6"><CarePlanCard plan={billing.carePlan} /></div>}

        <div className="mt-2 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {invoices.length > 0 ? invoices.map((inv) => {
            const s = STATUS[inv.overdue ? 'OVERDUE' : inv.status] ?? { label: inv.status, cls: 'bg-white/10 text-neutral-300' };
            const retainer = inv.kind === 'RETAINER';
            const period = retainer && inv.billingPeriodStart
              ? `${fmtDate(inv.billingPeriodStart)}${inv.billingPeriodEnd ? ` – ${fmtDate(inv.billingPeriodEnd)}` : ''}`
              : null;
            return (
              <Link key={inv.id} href={`/invoices/${inv.id}`} className="flex flex-wrap items-center gap-3 p-4 transition hover:bg-white/[0.03]">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{inv.number}</span>
                    {retainer && <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary-light">Care Plan</span>}
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
          }) : <p className="p-6 text-neutral-400">No invoices yet.</p>}
        </div>
      </div>
    </PortalShell>
  );
}
