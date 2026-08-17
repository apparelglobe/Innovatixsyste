'use client';

import Link from 'next/link';
import { Loader2, ChevronRight } from 'lucide-react';
import { usePortal } from '@/lib/usePortal';
import { PortalShell } from '@/components/PortalShell';
import { fmtDate, fmtMoney } from '@/lib/fmt';

const STATUS: Record<string, { label: string; cls: string }> = {
  PAID: { label: 'Paid', cls: 'bg-emerald-400/15 text-emerald-300' },
  SENT: { label: 'Due', cls: 'bg-amber-400/15 text-amber-300' },
  OVERDUE: { label: 'Overdue', cls: 'bg-red-500/15 text-red-300' },
  DRAFT: { label: 'Draft', cls: 'bg-white/10 text-neutral-300' },
  VOIDED: { label: 'Void', cls: 'bg-white/5 text-neutral-500 line-through' },
};

export default function InvoicesPage() {
  const { me, project, userName, loading } = usePortal();
  if (loading || !me) return <div className="grid min-h-screen place-items-center bg-base text-neutral-400"><Loader2 className="animate-spin" /></div>;

  return (
    <PortalShell orgName={me.org.name} userName={userName} active="invoices">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-extrabold tracking-tight text-white">Invoices</h1>
        <p className="mt-1 text-sm text-neutral-500">Billing history for {project?.name}.</p>
        <div className="mt-6 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {project && project.invoices.length > 0 ? project.invoices.map((inv) => {
            const s = STATUS[inv.overdue ? 'OVERDUE' : inv.status] ?? { label: inv.status, cls: 'bg-white/10 text-neutral-300' };
            return (
              <Link key={inv.id} href={`/invoices/${inv.id}`} className="flex flex-wrap items-center gap-3 p-4 transition hover:bg-white/[0.03]">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-white">{inv.number}</div>
                  <div className="text-xs text-neutral-500">
                    Issued {fmtDate(inv.issuedAt)}{inv.status === 'PAID' ? ` · paid ${fmtDate(inv.paidAt)}` : inv.dueAt ? ` · due ${fmtDate(inv.dueAt)}` : ''}
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
