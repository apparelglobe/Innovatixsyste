'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, CircleDot, Circle, Loader2, FileText, Clock, ArrowRight } from 'lucide-react';
import { PortalShell } from '@/components/PortalShell';
import { api, apiJson } from '@/lib/portal-api';
import { fmtDate } from '@/lib/fmt';
import { Timestamp } from '@/components/Timestamp';
import { deriveWorkspaceState, type ProjectStatus } from '@/lib/workspace-stage';
import { TONE_CLASS } from '@/lib/proposal-stage';

type Overview = {
  project: null | {
    id: string; name: string; status: string; percentComplete: number; dueDate: string | null;
    nextUpdateAt?: string | null; nextUpdateNote?: string | null;
    milestonesDone: number; milestonesTotal: number; openApprovals: number;
    pendingApproval?: { id: string; subject: string; type?: string | null };
    payableInvoice?: { id: string; number: string; amountCents: number; overdue?: boolean } | null;
    nextMilestone?: { name: string; dueDate: string | null };
    milestones: { id: string; name: string; status: string; dueDate: string | null }[];
    latestReport?: { title: string; kind: string; summary: string; publishedAt: string };
    activities: { type: string; message: string; createdAt: string }[];
    team: { name: string; role: string }[];
  };
};

export default function OverviewPage() {
  const router = useRouter();
  const [me, setMe] = useState<{ user: { firstName?: string; lastName?: string; role?: string }; org: { name: string } } | null>(null);
  const [data, setData] = useState<Overview | null>(null);
  const [deciding, setDeciding] = useState(false);
  const [note, setNote] = useState('');
  const [decideError, setDecideError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const meRes = await apiJson<{ ok: boolean; user?: { firstName?: string; lastName?: string; role?: string }; org?: { name: string } }>('/portal/me');
    if (meRes.status === 401) { router.replace('/clientportal'); return; }
    setMe({ user: meRes.body.user || {}, org: meRes.body.org || { name: '' } });
    const ov = await apiJson<Overview>('/portal/overview');
    setData(ov.body);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  // Only account OWNERs may decide approvals / pay (the backend enforces this too).
  const isOwner = me?.user.role === 'OWNER';

  async function decide(id: string, decision: 'APPROVED' | 'CHANGES_REQUESTED') {
    setDecideError(null);
    setDeciding(true);
    const r = await api(`/portal/approvals/${id}/decide`, { method: 'POST', body: JSON.stringify({ decision, note: note.trim() || undefined }) });
    setDeciding(false);
    if (!r.ok) { setDecideError(r.status === 403 ? 'Only an account owner can approve or request changes.' : 'Could not submit your decision. Please try again.'); return; }
    setNote('');
    await load();
  }

  if (!me || !data) {
    return <div className="grid min-h-screen place-items-center bg-base text-neutral-400"><Loader2 className="animate-spin" /></div>;
  }

  const firstName = me.user.firstName || '';
  const userName = [me.user.firstName, me.user.lastName].filter(Boolean).join(' ') || 'Client';
  const p = data.project;
  const state = p ? deriveWorkspaceState({
    projectStatus: p.status as ProjectStatus,
    pendingApproval: p.pendingApproval ? { id: p.pendingApproval.id, subject: p.pendingApproval.subject, type: p.pendingApproval.type } : null,
    payableInvoice: p.payableInvoice ?? null,
    nextUpdateAt: p.nextUpdateAt,
    nextUpdateNote: p.nextUpdateNote,
  }) : null;

  return (
    <PortalShell orgName={me.org.name} userName={userName} active="overview">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm text-neutral-500">Welcome back{firstName ? `, ${firstName}` : ''}</p>

        {!p || !state ? (
          <div className="mt-4 rounded-2xl border border-line bg-surface p-6 text-neutral-400">
            No active project yet. Your delivery team will set this up shortly.
          </div>
        ) : (
          <div className="mt-3 space-y-6">
            {/* ── The one status card: what's happening + the one next action ── */}
            <section className={`rounded-2xl border p-6 ${state.turn === 'YOU' ? 'border-primary/40 bg-primary/[0.06]' : 'border-line bg-surface'}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${TONE_CLASS[state.tone]}`}>{state.statusLabel}</span>
                <span className="text-sm font-medium text-neutral-400">{p.name}</span>
              </div>

              <h1 className="mt-3 text-xl font-extrabold tracking-tight text-white">{state.title}</h1>
              <p className="mt-1.5 text-sm leading-relaxed text-neutral-300">{state.body}</p>

              {/* Our turn — the next-update promise (renders nothing when no date is set) */}
              {state.nextUpdate && (
                <p className="mt-3 inline-flex flex-wrap items-center gap-1.5 rounded-lg bg-white/[0.04] px-3 py-2 text-sm text-neutral-200">
                  <Clock size={15} className="text-primary-light" />
                  Next update by <Timestamp value={state.nextUpdate.at} withZone className="font-semibold text-white" />
                  {state.nextUpdate.note && <span className="text-neutral-400">· {state.nextUpdate.note}</span>}
                </p>
              )}

              {/* Your turn — the one next action */}
              {state.action && (
                <div className="mt-4">
                  {state.action.ownerOnly && !isOwner ? (
                    <p className="text-sm text-amber-400/90">
                      Only an account owner can {state.action.kind === 'invoice' ? 'pay this' : 'approve this'}. Ask an owner on your team to take a look.
                    </p>
                  ) : state.action.kind === 'approval' ? (
                    <>
                      <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={2000}
                        placeholder="Add a note (optional) — shared with the delivery team"
                        className="w-full resize-none rounded-lg border border-line bg-base px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-primary focus:outline-none" />
                      <div className="mt-3 flex justify-end gap-2">
                        <button disabled={deciding} onClick={() => decide(state.action!.targetId, 'CHANGES_REQUESTED')}
                          className="rounded-lg border border-line-strong px-3.5 py-2 text-sm font-semibold text-neutral-200 hover:bg-white/[0.05] disabled:opacity-60">Request changes</button>
                        <button disabled={deciding} onClick={() => decide(state.action!.targetId, 'APPROVED')}
                          className="rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60">{state.action.label}</button>
                      </div>
                      {decideError && <p className="mt-2 text-right text-xs text-red-400">{decideError}</p>}
                    </>
                  ) : state.action.href ? (
                    <a href={state.action.href}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-cta transition-colors hover:bg-primary-dark">
                      {state.action.label} <ArrowRight size={15} />
                    </a>
                  ) : null}
                </div>
              )}

              {/* Delivery progress — the % is the headline metric; milestones are plain context */}
              <div className="mt-5 border-t border-line pt-4">
                <div className="flex items-end justify-between gap-3">
                  <span className="text-xs text-neutral-500">{p.milestonesDone} of {p.milestonesTotal} milestones done{p.nextMilestone ? ` · next: ${p.nextMilestone.name}` : ''}</span>
                  <span className="text-lg font-bold leading-none text-white">{p.percentComplete}%</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                  <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${p.percentComplete}%` }} />
                </div>
              </div>
            </section>

            {/* ── Project details (subordinate; relocated under Projects in S5) ── */}
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-line bg-surface p-6">
                <h3 className="text-sm font-bold text-white">Milestones</h3>
                <ul className="mt-4 space-y-3">
                  {p.milestones.map((m) => (
                    <li key={m.id} className="flex items-center gap-2.5 text-sm">
                      {m.status === 'DONE' ? <CheckCircle2 size={16} className="text-emerald-400" />
                        : m.status === 'IN_PROGRESS' ? <CircleDot size={16} className="text-primary-light" />
                        : <Circle size={16} className="text-neutral-600" />}
                      <span className={m.status === 'PLANNED' ? 'text-neutral-500' : 'text-neutral-200'}>{m.name}</span>
                      <span className="ml-auto text-xs text-neutral-600">{fmtDate(m.dueDate)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-line bg-surface p-6">
                <h3 className="text-sm font-bold text-white">Recent activity</h3>
                <ul className="mt-4 space-y-3.5">
                  {p.activities.map((a, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-light" />
                      <div>
                        <div className="text-neutral-200">{a.message}</div>
                        <div className="text-xs text-neutral-600">{fmtDate(a.createdAt)}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {p.latestReport && (
              <div className="rounded-2xl border border-line bg-surface p-6">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary-light">
                  <FileText size={14} /> Latest {p.latestReport.kind.toLowerCase()} report
                </div>
                <h3 className="mt-2 font-bold text-white">{p.latestReport.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-400">{p.latestReport.summary}</p>
                <p className="mt-3 text-xs text-neutral-600">Published {fmtDate(p.latestReport.publishedAt)}</p>
              </div>
            )}

            <div className="rounded-2xl border border-line bg-surface p-6">
              <h3 className="text-sm font-bold text-white">Your delivery team</h3>
              <div className="mt-4 flex flex-wrap gap-4">
                {p.team.map((t) => (
                  <div key={t.name} className="flex items-center gap-2.5">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-elevated text-xs font-bold text-primary-light">
                      {t.name.split(/[.\s]+/).map((s) => s[0]).slice(0, 2).join('').toUpperCase()}
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-white">{t.name}</div>
                      <div className="text-xs text-neutral-500">{t.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </PortalShell>
  );
}
