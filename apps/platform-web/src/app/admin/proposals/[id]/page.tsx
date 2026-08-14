'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, ArrowLeft, Send, Download, Pencil, CheckCircle2 } from 'lucide-react';
import { AdminShell } from '@/components/AdminShell';
import { useStaff, staffCan } from '@/lib/useStaff';
import { api, apiJson } from '@/lib/portal-api';
import { fmtMoney, fmtDateTime } from '@/lib/fmt';
import { PROPOSAL_STATUS } from '@/lib/proposal-status';

const API_BASE = process.env.NEXT_PUBLIC_PORTAL_API_URL || 'http://localhost:4040/v1';

type Line = { id: string; description: string; quantity: number; unitCents: number; amountCents: number };
type Proposal = {
  id: string; number: string; title: string; status: string; currency: string; notes: string | null;
  changeRequest: string | null; clientOrgId: string | null;
  subtotalCents: number; totalCents: number; depositCents: number; depositPercent: number | null;
  lineItems: Line[];
  lead: { id: string; email: string; firstName: string | null; lastName: string | null; company: string | null; status: string };
  contract: { id: string; status: string } | null;
  invoices: { number: string; status: string; paidAt: string | null }[];
  sentAt: string | null; viewedAt: string | null; acceptedAt: string | null;
};

export default function ProposalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { me, name } = useStaff();
  const [p, setP] = useState<Proposal | null>(null);
  const [loadErr, setLoadErr] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await apiJson<{ proposal: Proposal }>(`/admin/proposals/${id}`);
      if (r.status === 200 && r.body.proposal) { setP(r.body.proposal); setLoadErr(false); }
      else { setP(null); setLoadErr(true); }
    } catch { setP(null); setLoadErr(true); }
  }, [id]);
  useEffect(() => { if (me) load(); }, [me, load]);

  async function send() {
    setBusy(true); setErr(null);
    const res = await api(`/admin/proposals/${id}/send`, { method: 'POST' });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok && body?.ok) { await load(); return; }
    setErr(body?.message || 'Could not send the proposal. Please try again.');
  }

  if (!me || (!p && !loadErr)) return <div className="grid min-h-screen place-items-center bg-base text-neutral-400"><Loader2 className="animate-spin" /></div>;

  if (loadErr || !p) return (
    <AdminShell staffName={name} role={me.role} active="proposals">
      <div className="mx-auto max-w-3xl">
        <a href="/admin/proposals" className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white"><ArrowLeft size={15} /> Proposals</a>
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
          <p className="text-sm text-red-200">We couldn&apos;t load this proposal — it may have been removed, or your session expired.</p>
          <button onClick={() => load()} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-3.5 py-2 text-sm font-semibold text-neutral-100 hover:border-primary/50 hover:text-white">Try again</button>
        </div>
      </div>
    </AdminShell>
  );

  const canWrite = staffCan(me.role, 'proposal:write');
  const s = PROPOSAL_STATUS[p.status] || { label: p.status, cls: 'bg-white/10 text-neutral-300' };
  const canSend = p.status === 'DRAFT' || p.status === 'CHANGES_REQUESTED';
  const orgName = p.lead.company || [p.lead.firstName, p.lead.lastName].filter(Boolean).join(' ') || p.lead.email;
  const deposit = p.invoices?.[0] ?? null;
  const depositPaid = deposit?.status === 'PAID';
  const activated = !!p.clientOrgId;

  return (
    <AdminShell staffName={name} role={me.role} active="proposals">
      <div className="mx-auto max-w-3xl">
        <a href="/admin/proposals" className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white"><ArrowLeft size={15} /> Proposals</a>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary-light">{p.number} · for {orgName}</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-white">{p.title}</h1>
            <p className="mt-0.5 text-sm text-neutral-500">{p.lead.email}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${s.cls}`}>{s.label}</span>
        </div>

        {p.changeRequest && (
          <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/10 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-300">Change requested by the prospect</p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-neutral-200">{p.changeRequest}</p>
            {canWrite && <a href={`/admin/proposals/${p.id}/edit`} className="mt-2 inline-block text-sm font-semibold text-amber-300 hover:underline">Edit &amp; re-send →</a>}
          </div>
        )}

        {p.notes && <p className="mt-4 whitespace-pre-wrap rounded-xl border border-line bg-surface p-4 text-sm leading-relaxed text-neutral-300">{p.notes}</p>}

        <div className="mt-5 overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="divide-y divide-line">
            {p.lineItems.map((li) => (
              <div key={li.id} className="flex items-baseline gap-4 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-white">{li.description}</div>
                  {li.quantity > 1 && <div className="text-xs text-neutral-500">Qty {li.quantity} × {fmtMoney(li.unitCents, p.currency)}</div>}
                </div>
                <div className="shrink-0 text-sm font-semibold tabular-nums text-white">{fmtMoney(li.amountCents, p.currency)}</div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-line bg-white/[0.03] px-5 py-3">
            <span className="text-sm text-neutral-400">Total · deposit {p.depositPercent ?? 33}%</span>
            <span className="text-sm font-bold tabular-nums text-white">{fmtMoney(p.totalCents, p.currency)} · <span className="text-amber-300">{fmtMoney(p.depositCents, p.currency)}</span></span>
          </div>
        </div>

        <div className="mt-4 grid gap-3 rounded-2xl border border-line bg-surface p-5 text-sm sm:grid-cols-3">
          <div><div className="text-xs text-neutral-500">Sent</div><div className="text-neutral-200">{p.sentAt ? fmtDateTime(p.sentAt) : '—'}</div></div>
          <div><div className="text-xs text-neutral-500">Viewed</div><div className="text-neutral-200">{p.viewedAt ? fmtDateTime(p.viewedAt) : '—'}</div></div>
          <div><div className="text-xs text-neutral-500">Accepted</div><div className="text-neutral-200">{p.acceptedAt ? fmtDateTime(p.acceptedAt) : '—'}</div></div>
        </div>

        {p.contract && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-5">
            <div className="text-sm"><span className="text-neutral-400">Agreement:</span> <span className="font-semibold text-white">{p.contract.status === 'SIGNED' ? 'Signed ✓' : 'Awaiting signature'}</span></div>
            <a href={`${API_BASE}/admin/contracts/${p.contract.id}/pdf`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-3 py-2 text-xs font-semibold text-neutral-200 hover:border-primary/50 hover:text-white"><Download size={14} /> Agreement PDF</a>
          </div>
        )}

        {(deposit || activated) && (
          <div className="mt-4 rounded-2xl border border-line bg-surface p-5">
            {deposit && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-400">Activation deposit · {deposit.number}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${depositPaid ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>{depositPaid ? 'Paid' : 'Due'}</span>
              </div>
            )}
            {activated && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-100">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> <span>Client activated — workspace created and the prospect was invited to set up their login.</span>
              </div>
            )}
          </div>
        )}

        {err && <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">{err}</p>}

        {canWrite && canSend ? (
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button onClick={send} disabled={busy} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-6 font-semibold text-white hover:bg-primary-dark disabled:opacity-60">
              {busy ? <><Loader2 size={18} className="animate-spin" /> Sending…</> : <><Send size={17} /> {p.status === 'CHANGES_REQUESTED' ? 'Re-send to prospect' : 'Send to prospect'}</>}
            </button>
            <a href={`/admin/proposals/${p.id}/edit`} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-line-strong px-5 text-sm font-semibold text-neutral-200 hover:border-primary/50 hover:text-white"><Pencil size={15} /> Edit</a>
          </div>
        ) : activated ? null : (
          <p className="mt-5 rounded-lg border border-line bg-surface px-4 py-3 text-center text-sm text-neutral-400">
            {p.status === 'ACCEPTED' ? 'Accepted by the prospect — awaiting the signed agreement and deposit to activate.'
              : p.status === 'DECLINED' ? 'This proposal was declined.'
              : 'The prospect was emailed a secure link to review this proposal.'}
          </p>
        )}
      </div>
    </AdminShell>
  );
}
