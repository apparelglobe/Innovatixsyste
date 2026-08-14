'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, ArrowRight, CheckCircle2, MessageSquare } from 'lucide-react';
import { api, apiJson } from '@/lib/portal-api';
import { fmtMoney } from '@/lib/fmt';
import { ProposalShell, ProposalLoading, ProposalTerminal, ProposalSteps } from '@/components/proposal-ui';

type LineItem = { description: string; quantity: number; unitCents: number; amountCents: number };
type Proposal = {
  number: string; title: string; notes: string | null; orgName: string; currency: string;
  subtotalCents: number; totalCents: number; depositCents: number; depositPercent: number | null;
  lineItems: LineItem[]; expiresAt: string | null;
};
type Status = 'loading' | 'VALID' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'INVALID';
const TERMINALS = ['ACCEPTED', 'DECLINED', 'EXPIRED', 'INVALID'] as const;

export default function ProposalReviewPage() {
  const router = useRouter();
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<Status>('loading');
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [mode, setMode] = useState<'review' | 'changes' | 'sent'>('review');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { status: code, body } = await apiJson<{ ok: boolean; status: string; proposal?: Proposal }>(`/proposals/${encodeURIComponent(token)}`);
    if (code === 200 && body.status === 'VALID' && body.proposal) { setProposal(body.proposal); setStatus('VALID'); }
    else setStatus((TERMINALS as readonly string[]).includes(body.status) ? (body.status as Status) : 'INVALID');
  }, [token]);

  useEffect(() => { load().catch(() => setStatus('INVALID')); }, [load]);

  async function accept() {
    setBusy(true); setErr(null);
    const res = await api(`/proposals/${encodeURIComponent(token)}/accept`, { method: 'POST' });
    const body = await res.json().catch(() => ({}));
    if (res.ok && body?.ok) { router.push(`/proposals/${encodeURIComponent(token)}/agreement`); return; }
    setBusy(false);
    setErr(body?.message || 'We could not accept this proposal. Please try again.');
  }

  async function sendChanges(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setErr(null);
    const note = String(new FormData(e.currentTarget).get('note') || '').trim();
    if (!note) { setBusy(false); setErr('Please add a sentence or two about what to change.'); return; }
    const res = await api(`/proposals/${encodeURIComponent(token)}/request-changes`, { method: 'POST', body: JSON.stringify({ note }) });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok && body?.ok) { setMode('sent'); return; }
    setErr(body?.message || 'We could not send your note. Please try again.');
  }

  if (status === 'loading') return <ProposalLoading label="Loading your proposal…" />;
  if (status === 'ACCEPTED') return (
    <ProposalTerminal tone="ok" title="You've already accepted this proposal" body="The next step is to sign the agreement — open the link in your email, or continue below." />
  );
  if (status === 'EXPIRED') return <ProposalTerminal tone="bad" title="This proposal link has expired" body="Ask your Innovatix contact to resend it — your details are saved." />;
  if (status === 'DECLINED') return <ProposalTerminal tone="bad" title="This proposal was declined" body="If that wasn't intended, contact your Innovatix representative." />;
  if (status === 'INVALID' || !proposal) return <ProposalTerminal tone="bad" title="This link is invalid" body="Check that you used the full link from your email, or ask your Innovatix contact to resend it." />;

  if (mode === 'sent') return (
    <ProposalTerminal tone="ok" title="Sent — we're on it" body="Your team has your notes and will send a revised proposal shortly. This link stays live, so you can come back anytime." />
  );

  const deposit = proposal.depositCents;
  const balance = proposal.totalCents - deposit;

  return (
    <ProposalShell>
      <ProposalSteps current="review" />
      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
        <div className="border-b border-line px-6 py-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary-light">Prepared for {proposal.orgName} · {proposal.number}</p>
          <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight text-white">{proposal.title}</h1>
          {proposal.notes && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-neutral-300">{proposal.notes}</p>}
        </div>

        <div className="px-6 py-5">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">What&apos;s included</p>
          <div className="divide-y divide-line rounded-xl border border-line">
            {proposal.lineItems.map((li, i) => (
              <div key={i} className="flex items-baseline gap-4 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-white">{li.description}</div>
                  {li.quantity > 1 && <div className="text-xs text-neutral-500">Qty {li.quantity} × {fmtMoney(li.unitCents, proposal.currency)}</div>}
                </div>
                <div className="shrink-0 text-sm font-semibold tabular-nums text-white">{fmtMoney(li.amountCents, proposal.currency)}</div>
              </div>
            ))}
            <div className="flex items-baseline gap-4 bg-white/[0.03] px-4 py-3">
              <div className="flex-1 text-sm font-bold text-white">Total project</div>
              <div className="shrink-0 text-base font-bold tabular-nums text-white">{fmtMoney(proposal.totalCents, proposal.currency)}</div>
            </div>
          </div>
        </div>

        <div className="px-6 pb-5">
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-300">To get started</p>
            <p className="mt-1 text-xl font-extrabold text-white">{fmtMoney(deposit, proposal.currency)} <span className="text-sm font-semibold text-amber-300">deposit{proposal.depositPercent ? ` · ${proposal.depositPercent}%` : ''}</span></p>
            <p className="mt-2 text-sm leading-relaxed text-neutral-300">This deposit reserves your spot and kicks off the work. The remaining <b className="text-white">{fmtMoney(balance, proposal.currency)}</b> is billed in stages as we deliver — nothing else is due today.</p>
          </div>
        </div>

        {err && <div className="mx-6 mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">{err}</div>}

        <div className="border-t border-line px-6 py-5">
          {mode === 'review' ? (
            <div className="flex flex-col gap-3 sm:flex-row">
              <button onClick={accept} disabled={busy} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-6 font-semibold text-white shadow-cta transition-colors hover:bg-primary-dark disabled:opacity-60">
                {busy ? <><Loader2 size={18} className="animate-spin" /> Working…</> : <><CheckCircle2 size={18} /> Accept &amp; get started</>}
              </button>
              <button onClick={() => { setErr(null); setMode('changes'); }} disabled={busy} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-line-strong px-5 text-sm font-semibold text-neutral-200 transition-colors hover:border-primary/50 hover:text-white disabled:opacity-60">
                <MessageSquare size={16} /> Request a change
              </button>
            </div>
          ) : (
            <form onSubmit={sendChanges} className="space-y-3">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-neutral-200">What would you like to change?</span>
                <textarea name="note" rows={4} required placeholder="e.g. Can we phase the payments over 3 milestones?"
                  className="w-full rounded-lg border border-line-strong bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </label>
              <div className="flex gap-3">
                <button type="submit" disabled={busy} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-6 font-semibold text-white shadow-cta transition-colors hover:bg-primary-dark disabled:opacity-60">
                  {busy ? <><Loader2 size={18} className="animate-spin" /> Sending…</> : <>Send to my team <ArrowRight size={18} /></>}
                </button>
                <button type="button" onClick={() => { setErr(null); setMode('review'); }} className="inline-flex h-11 items-center justify-center rounded-lg border border-line-strong px-5 text-sm font-semibold text-neutral-200 hover:text-white">Back</button>
              </div>
            </form>
          )}
          <p className="mt-4 text-center text-xs text-neutral-500">🔒 Secure link · questions? just reply to our email.</p>
        </div>
      </div>
    </ProposalShell>
  );
}
