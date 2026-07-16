'use client';

// Demo hosted-payment page. In stub mode the provider "hosted checkout" is our
// own page: it shows the invoice and a Pay button that calls the dev-only
// simulate endpoint, which runs the exact same paid-transition the real webhook
// would. In production this route is replaced by the provider's hosted checkout.
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, CheckCircle2, Lock } from 'lucide-react';
import { api, apiJson } from '@/lib/portal-api';
import { fmtMoney } from '@/lib/fmt';

type Invoice = { id: string; number: string; amountCents: number; currency: string; status: string };

export default function PayPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [inv, setInv] = useState<Invoice | null | undefined>(undefined);
  const [paying, setPaying] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    apiJson<{ ok: boolean; invoice: Invoice }>(`/portal/invoices/${id}`).then((r) => {
      if (r.status === 401) { router.replace('/login'); return; }
      setInv(r.status === 200 ? r.body.invoice : null);
    });
  }, [id, router]);

  async function pay() {
    setPaying(true);
    const r = await api(`/portal/invoices/${id}/pay-demo`, { method: 'POST' });
    setPaying(false);
    if (r.ok) { setDone(true); setTimeout(() => router.replace(`/invoices/${id}`), 1400); }
  }

  if (inv === undefined) return <div className="grid min-h-screen place-items-center bg-base text-neutral-400"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="grid min-h-screen place-items-center bg-base px-4">
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-8">
        <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-primary-light"><Lock size={12} /> Secure payment · demo</div>
        {!inv ? (
          <p className="mt-4 text-neutral-400">Invoice not found.</p>
        ) : inv.status === 'PAID' || done ? (
          <div className="mt-6 text-center">
            <CheckCircle2 className="mx-auto text-emerald-400" size={40} />
            <p className="mt-3 text-lg font-bold text-white">Payment received</p>
            <p className="mt-1 text-sm text-neutral-500">Invoice {inv.number} is now paid.</p>
          </div>
        ) : (
          <>
            <h1 className="mt-3 text-xl font-extrabold tracking-tight text-white">Pay {inv.number}</h1>
            <div className="mt-6 flex items-end justify-between border-y border-line py-5">
              <span className="text-sm text-neutral-400">Amount due</span>
              <span className="text-3xl font-extrabold text-white">{fmtMoney(inv.amountCents, inv.currency)}</span>
            </div>
            <button onClick={pay} disabled={paying}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-white hover:bg-primary-dark disabled:opacity-60">
              {paying ? <Loader2 size={16} className="animate-spin" /> : <Lock size={15} />} Pay {fmtMoney(inv.amountCents, inv.currency)}
            </button>
            <p className="mt-3 text-center text-[11px] text-neutral-600">Demo checkout — no real charge. Replaced by the provider’s hosted page in production.</p>
          </>
        )}
      </div>
    </div>
  );
}
