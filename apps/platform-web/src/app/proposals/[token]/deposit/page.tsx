'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Lock, PartyPopper, ArrowRight } from 'lucide-react';
import { api, apiJson } from '@/lib/portal-api';
import { fmtMoney } from '@/lib/fmt';
import { ProposalShell, ProposalLoading, ProposalTerminal, ProposalSteps } from '@/components/proposal-ui';

type Status = 'loading' | 'DUE' | 'PAID' | 'NOT_READY' | 'INVALID';
type Deposit = { status: string; amountCents?: number; currency?: string; number?: string };

export default function DepositPage() {
  const router = useRouter();
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<Status>('loading');
  const [dep, setDep] = useState<Deposit | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { body } = await apiJson<{ ok: boolean } & Deposit>(`/proposals/${encodeURIComponent(token)}/deposit`);
    setDep(body);
    const s = body.status;
    setStatus(s === 'DUE' || s === 'PAID' || s === 'NOT_READY' ? (s as Status) : 'INVALID');
  }, [token]);

  useEffect(() => { load().catch(() => setStatus('INVALID')); }, [load]);

  async function pay() {
    setBusy(true); setErr(null);
    const res = await api(`/proposals/${encodeURIComponent(token)}/deposit/checkout`, { method: 'POST', body: JSON.stringify({}) });
    const body = await res.json().catch(() => ({}));
    if (res.ok && body?.url) { window.location.href = body.url; return; }
    setBusy(false);
    setErr(body?.message || 'We could not start the payment. Please try again in a moment.');
  }

  if (status === 'loading') return <ProposalLoading label="Loading your deposit…" />;
  if (status === 'NOT_READY') return (
    <ProposalShell width="max-w-md">
      <ProposalSteps current="deposit" />
      <div className="rounded-2xl border border-line bg-surface p-6 text-center shadow-card">
        <p className="text-white">Please sign the agreement first.</p>
        <button onClick={() => router.push(`/proposals/${encodeURIComponent(token)}/agreement`)} className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 font-semibold text-white shadow-cta hover:bg-primary-dark">
          Go to the agreement <ArrowRight size={18} />
        </button>
      </div>
    </ProposalShell>
  );
  if (status === 'INVALID' || !dep) return <ProposalTerminal tone="bad" title="This link is invalid" body="Check that you used the full link from your email, or ask your Innovatix contact to resend it." />;

  if (status === 'PAID') return (
    <ProposalShell width="max-w-md">
      <ProposalSteps current="deposit" />
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center shadow-card">
        <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-emerald-500/20 text-emerald-300"><PartyPopper size={26} /></div>
        <h1 className="text-xl font-extrabold text-white">You&apos;re all set — welcome aboard!</h1>
        <p className="mt-2 text-sm leading-relaxed text-neutral-300">Your deposit is received and your project is activated. We&apos;ve emailed you an invitation to set up your workspace login — from there you&apos;ll track everything as we build.</p>
      </div>
    </ProposalShell>
  );

  // DUE
  return (
    <ProposalShell width="max-w-md">
      <ProposalSteps current="deposit" />
      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
        <div className="px-6 py-6 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary-light">Activation deposit{dep.number ? ` · ${dep.number}` : ''}</p>
          <p className="mt-2 text-4xl font-extrabold tracking-tight text-white">{fmtMoney(dep.amountCents || 0, dep.currency || 'USD')}</p>
          <p className="mt-3 text-sm leading-relaxed text-neutral-300">Pay securely and your project workspace opens automatically — then we get started. The balance is billed in stages as we deliver.</p>
        </div>
        {err && <div className="mx-6 mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">{err}</div>}
        <div className="border-t border-line px-6 py-5">
          <button onClick={pay} disabled={busy} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 text-base font-semibold text-white shadow-cta transition-colors hover:bg-primary-dark disabled:opacity-60">
            {busy ? <><Loader2 size={18} className="animate-spin" /> Opening secure checkout…</> : <><Lock size={16} /> Pay {fmtMoney(dep.amountCents || 0, dep.currency || 'USD')} deposit</>}
          </button>
          <p className="mt-3 text-center text-xs text-neutral-500">🔒 Secure payment · you&apos;ll get a receipt by email.</p>
        </div>
      </div>
    </ProposalShell>
  );
}
