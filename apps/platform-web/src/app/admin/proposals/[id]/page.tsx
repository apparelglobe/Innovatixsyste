'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, ArrowLeft, Send, Download, Pencil, X } from 'lucide-react';
import { AdminShell } from '@/components/AdminShell';
import { ProposalStatusRail } from '@/components/ProposalStatusRail';
import { useStaff, staffCan } from '@/lib/useStaff';
import { api, apiJson } from '@/lib/portal-api';
import { fmtMoney, fmtDate } from '@/lib/fmt';
import { deriveStage, stageEvidence, STAGE, TONE_CLASS } from '@/lib/proposal-stage';

const API_BASE = process.env.NEXT_PUBLIC_PORTAL_API_URL || 'http://localhost:4040/v1';

type Line = { id: string; description: string; quantity: number; unitCents: number; amountCents: number };
type Proposal = {
  id: string; number: string; title: string; status: string; currency: string; notes: string | null;
  changeRequest: string | null; clientOrgId: string | null; projectId: string | null; activatedAt: string | null;
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
  const [confirmSend, setConfirmSend] = useState(false);

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
    try {
      const res = await api(`/admin/proposals/${id}/send`, { method: 'POST' });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body?.ok) { setConfirmSend(false); await load(); setBusy(false); return; }
      setBusy(false);
      setErr(body?.message || `Could not send the proposal (HTTP ${res.status}).`);
    } catch {
      setBusy(false);
      setErr('Network error — could not reach the server. Please try again.');
    }
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
  const deposit = p.invoices?.[0] ?? null;
  const stage = deriveStage({ status: p.status, contractStatus: p.contract?.status, depositStatus: deposit?.status, activatedAt: p.activatedAt });
  const reached = stageEvidence({ sentAt: p.sentAt, viewedAt: p.viewedAt, acceptedAt: p.acceptedAt, contractStatus: p.contract?.status, depositStatus: deposit?.status, activatedAt: p.activatedAt });
  const meta = STAGE[stage];
  const canSend = stage === 'DRAFT' || stage === 'CHANGES_REQUESTED';
  const activated = stage === 'ACTIVATED';
  const orgName = p.lead.company || [p.lead.firstName, p.lead.lastName].filter(Boolean).join(' ') || p.lead.email;
  const editUrl = `/admin/proposals/${p.id}/edit`;
  const footerTone =
    meta.tone === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
    : meta.tone === 'warn' ? 'border-amber-500/25 bg-amber-500/10 text-amber-100'
    : meta.tone === 'bad' ? 'border-red-500/30 bg-red-500/10 text-red-200'
    : 'border-line bg-surface text-neutral-400';

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
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${TONE_CLASS[meta.tone]}`}>{meta.label}</span>
        </div>

        {stage === 'CHANGES_REQUESTED' ? (
          <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/10 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-300">Change requested by the prospect</p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-neutral-200">{p.changeRequest}</p>
            {canWrite && <a href={editUrl} className="mt-2 inline-block text-sm font-semibold text-amber-300 hover:underline">Edit &amp; re-send →</a>}
          </div>
        ) : p.changeRequest ? (
          <details className="mt-4 rounded-xl border border-line bg-surface px-4 py-3">
            <summary className="cursor-pointer select-none text-sm font-medium text-neutral-400 hover:text-neutral-200">Change request — resolved</summary>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-neutral-300">{p.changeRequest}</p>
          </details>
        ) : null}

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

        {/* One horizontal lifecycle track replaces the old timeline box + agreement + deposit cards */}
        <div className="mt-5">
          <ProposalStatusRail stage={stage} reached={reached} />
        </div>

        {(p.contract || deposit || p.sentAt) && (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-line bg-surface px-5 py-3 text-sm">
            {p.contract && (
              <a href={`${API_BASE}/admin/contracts/${p.contract.id}/pdf`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-neutral-200 hover:text-white">
                <Download size={14} /> Agreement PDF
              </a>
            )}
            {deposit && (
              <span className="text-neutral-400">Deposit <b className="text-white">{deposit.number}</b> · <span className={deposit.status === 'PAID' ? 'text-emerald-300' : 'text-amber-300'}>{deposit.status === 'PAID' ? 'Paid' : 'Due'}</span></span>
            )}
            {activated && p.projectId && (
              <a href={`/admin/projects/${p.projectId}`} className="font-semibold text-emerald-300 hover:underline">View project →</a>
            )}
            <span className="ml-auto text-xs text-neutral-500">
              {activated && p.activatedAt ? `Activated ${fmtDate(p.activatedAt)}` : p.acceptedAt ? `Accepted ${fmtDate(p.acceptedAt)}` : p.sentAt ? `Sent ${fmtDate(p.sentAt)}` : ''}
            </span>
          </div>
        )}

        {err && !confirmSend && <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">{err}</p>}

        {canWrite && canSend ? (
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button onClick={() => { setErr(null); setConfirmSend(true); }} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-6 font-semibold text-white hover:bg-primary-dark">
              <Send size={17} /> {stage === 'CHANGES_REQUESTED' ? 'Re-send to prospect' : 'Send to prospect'}
            </button>
            <a href={editUrl} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-line-strong px-5 text-sm font-semibold text-neutral-200 hover:border-primary/50 hover:text-white"><Pencil size={15} /> Edit</a>
          </div>
        ) : (
          <div className={`mt-5 rounded-lg border px-4 py-3 text-center text-sm ${footerTone}`}>{meta.staff}</div>
        )}
      </div>

      {confirmSend && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-4" onClick={() => !busy && setConfirmSend(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6 shadow-card" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">{stage === 'CHANGES_REQUESTED' ? 'Re-send this proposal?' : 'Send this proposal?'}</h3>
              <button onClick={() => !busy && setConfirmSend(false)} className="text-neutral-500 transition hover:text-white"><X size={18} /></button>
            </div>
            <p className="mt-3 text-sm text-neutral-300">A secure review link will be emailed to:</p>
            <p className="mt-0.5 text-sm font-semibold text-white">{p.lead.email}</p>
            <div className="mt-3 rounded-lg border border-line bg-white/[0.03] px-3.5 py-2.5 text-sm">
              <div className="text-white">{p.title} <span className="text-neutral-500">· {p.number}</span></div>
              <div className="mt-0.5 text-neutral-400">Total <b className="text-white">{fmtMoney(p.totalCents, p.currency)}</b> · deposit <b className="text-amber-300">{fmtMoney(p.depositCents, p.currency)}</b></div>
            </div>
            {err && <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{err}</p>}
            <div className="mt-4 flex gap-2">
              <button onClick={send} disabled={busy} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 font-semibold text-white hover:bg-primary-dark disabled:opacity-60">
                {busy ? <><Loader2 size={16} className="animate-spin" /> Sending…</> : <><Send size={15} /> {stage === 'CHANGES_REQUESTED' ? 'Re-send' : 'Send'}</>}
              </button>
              <button onClick={() => setConfirmSend(false)} disabled={busy} className="inline-flex h-10 items-center justify-center rounded-lg border border-line-strong px-4 text-sm font-semibold text-neutral-200 hover:text-white disabled:opacity-60">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
