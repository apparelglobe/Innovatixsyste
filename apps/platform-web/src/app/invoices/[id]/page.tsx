'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, ExternalLink, Download } from 'lucide-react';
import { usePortal } from '@/lib/usePortal';
import { PortalShell } from '@/components/PortalShell';
import { apiJson } from '@/lib/portal-api';
import { fmtDate, fmtMoney } from '@/lib/fmt';

type LineItem = { id: string; description: string; quantity: number; unitCents: number; amountCents: number; milestoneName: string | null };
type Invoice = {
  id: string; number: string; amountCents: number; currency: string; status: string;
  issuedAt: string | null; dueAt: string | null; paidAt: string | null;
  billingContactName: string | null; paymentUrl: string | null; pdfKey: string | null;
  lineItems: LineItem[];
};

const STATUS: Record<string, { label: string; cls: string }> = {
  PAID: { label: 'Paid', cls: 'bg-emerald-400/15 text-emerald-300' },
  SENT: { label: 'Due', cls: 'bg-amber-400/15 text-amber-300' },
  OVERDUE: { label: 'Overdue', cls: 'bg-red-500/15 text-red-300' },
  DRAFT: { label: 'Draft', cls: 'bg-white/10 text-neutral-300' },
};

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { me, userName, loading } = usePortal();
  const [inv, setInv] = useState<Invoice | null | undefined>(undefined);

  useEffect(() => {
    apiJson<{ ok: boolean; invoice: Invoice }>(`/portal/invoices/${id}`).then((r) => setInv(r.status === 200 ? r.body.invoice : null));
  }, [id]);

  if (loading || !me || inv === undefined) return <div className="grid min-h-screen place-items-center bg-base text-neutral-400"><Loader2 className="animate-spin" /></div>;

  const s = inv ? STATUS[inv.status] ?? { label: inv.status, cls: 'bg-white/10 text-neutral-300' } : null;

  return (
    <PortalShell orgName={me.org.name} userName={userName} active="invoices">
      <div className="mx-auto max-w-3xl">
        <button onClick={() => router.push('/invoices')} className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white"><ArrowLeft size={15} /> All invoices</button>
        {!inv ? (
          <p className="text-neutral-400">Invoice not found.</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-line bg-surface">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line p-6">
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-xl font-extrabold tracking-tight text-white">{inv.number}</h1>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${s!.cls}`}>{s!.label}</span>
                </div>
                <div className="mt-1 space-y-0.5 text-sm text-neutral-500">
                  {inv.issuedAt && <div>Issued {fmtDate(inv.issuedAt)}</div>}
                  {inv.status === 'PAID' ? <div>Paid {fmtDate(inv.paidAt)}</div> : inv.dueAt && <div>Due {fmtDate(inv.dueAt)}</div>}
                  {inv.billingContactName && <div>Billed to {inv.billingContactName}</div>}
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-extrabold text-white">{fmtMoney(inv.amountCents, inv.currency)}</div>
                <div className="text-xs text-neutral-500">{inv.currency}</div>
              </div>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-neutral-500">
                  <th className="px-6 py-2.5 font-semibold">Description</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Qty</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Unit</th>
                  <th className="px-6 py-2.5 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {inv.lineItems.map((li) => (
                  <tr key={li.id} className="border-b border-line/50">
                    <td className="px-6 py-3 text-neutral-200">
                      {li.description}
                      {li.milestoneName && <span className="ml-2 rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-neutral-400">{li.milestoneName}</span>}
                    </td>
                    <td className="px-3 py-3 text-right text-neutral-400">{li.quantity}</td>
                    <td className="px-3 py-3 text-right text-neutral-400">{fmtMoney(li.unitCents, inv.currency)}</td>
                    <td className="px-6 py-3 text-right font-semibold text-white">{fmtMoney(li.amountCents, inv.currency)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="px-6 py-3 text-right text-sm font-semibold text-neutral-400">Total</td>
                  <td className="px-6 py-3 text-right text-base font-extrabold text-white">{fmtMoney(inv.amountCents, inv.currency)}</td>
                </tr>
              </tfoot>
            </table>

            {inv.status !== 'DRAFT' && (
              <div className="flex flex-wrap gap-2 border-t border-line p-6">
                {inv.paymentUrl && inv.status !== 'PAID' && (
                  <a href={inv.paymentUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark">
                    Pay invoice <ExternalLink size={15} />
                  </a>
                )}
                <a href={`${process.env.NEXT_PUBLIC_PORTAL_API_URL || 'http://localhost:4040/v1'}/portal/invoices/${inv.id}/pdf`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-4 py-2 text-sm font-semibold text-neutral-200 hover:bg-white/[0.05]">
                  <Download size={15} /> Download PDF
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </PortalShell>
  );
}
