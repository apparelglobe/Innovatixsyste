'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, CircleDot, Circle, Loader2, FileText } from 'lucide-react';
import { PortalShell } from '@/components/PortalShell';
import { api, apiJson } from '@/lib/portal-api';
import { fmtDate } from '@/lib/fmt';

type Overview = {
  project: null | {
    id: string; name: string; status: string; percentComplete: number; dueDate: string | null;
    milestonesDone: number; milestonesTotal: number; openApprovals: number;
    pendingApproval?: { id: string; subject: string };
    nextMilestone?: { name: string; dueDate: string | null };
    milestones: { id: string; name: string; status: string; dueDate: string | null }[];
    latestReport?: { title: string; kind: string; summary: string; publishedAt: string };
    activities: { type: string; message: string; createdAt: string }[];
    team: { name: string; role: string }[];
  };
};

const STATUS_LABEL: Record<string, string> = { DISCOVERY: 'Discovery', IN_PROGRESS: 'In Progress', UAT: 'UAT', LAUNCHED: 'Launched', ON_HOLD: 'On Hold', COMPLETE: 'Complete' };

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

  // Only account OWNERs may decide approvals (the backend enforces this too).
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

  const userName = [me.user.firstName, me.user.lastName].filter(Boolean).join(' ') || 'Client';
  const p = data.project;

  return (
    <PortalShell orgName={me.org.name} userName={userName} active="overview">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-extrabold tracking-tight text-white">Overview</h1>
        {!p ? (
          <p className="mt-6 text-neutral-400">No active project yet. Your delivery team will set this up shortly.</p>
        ) : (
          <div className="mt-6 space-y-6">
            {/* Project header */}
            <div className="rounded-2xl border border-line bg-surface p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white">{p.name}</h2>
                    <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-semibold text-amber-300">{STATUS_LABEL[p.status] ?? p.status}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-neutral-500">Due {fmtDate(p.dueDate)}</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-extrabold text-white">{p.percentComplete}%</div>
                  <div className="text-xs text-neutral-500">Complete</div>
                </div>
              </div>
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${p.percentComplete}%` }} />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Stat value={`${p.milestonesDone}/${p.milestonesTotal}`} label="Milestones" />
                <Stat value={String(p.openApprovals)} label="Open approvals" />
                <Stat value={p.nextMilestone?.name ?? '—'} label="Next milestone" small />
              </div>
            </div>

            {/* Pending approval action */}
            {p.pendingApproval && (
              <div className="rounded-2xl border border-primary/30 bg-primary/[0.06] p-5">
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-primary-light">Action needed</div>
                  <p className="mt-1 font-semibold text-white">{p.pendingApproval.subject}</p>
                </div>
                {isOwner ? (
                  <>
                    <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={2000}
                      placeholder="Add a note (optional) — shared with the delivery team"
                      className="mt-3 w-full resize-none rounded-lg border border-line bg-base px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-primary focus:outline-none" />
                    <div className="mt-3 flex justify-end gap-2">
                      <button disabled={deciding} onClick={() => decide(p.pendingApproval!.id, 'CHANGES_REQUESTED')}
                        className="rounded-lg border border-line-strong px-3.5 py-2 text-sm font-semibold text-neutral-200 hover:bg-white/[0.05] disabled:opacity-60">Request changes</button>
                      <button disabled={deciding} onClick={() => decide(p.pendingApproval!.id, 'APPROVED')}
                        className="rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60">Approve</button>
                    </div>
                    {decideError && <p className="mt-2 text-right text-xs text-red-400">{decideError}</p>}
                  </>
                ) : (
                  <p className="mt-3 text-sm text-amber-400/90">Only an account owner can approve or request changes. Ask an owner on your team to review this.</p>
                )}
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Milestone timeline */}
              <div className="rounded-2xl border border-line bg-surface p-6">
                <h3 className="text-sm font-bold text-white">Milestone timeline</h3>
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

              {/* Activity feed */}
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

            {/* Latest report */}
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

            {/* Team */}
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

function Stat({ value, label, small }: { value: string; label: string; small?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-base/40 px-4 py-3">
      <div className={`font-bold text-white ${small ? 'text-sm' : 'text-lg'}`}>{value}</div>
      <div className="mt-0.5 text-xs text-neutral-500">{label}</div>
    </div>
  );
}
