'use client';

/**
 * Slice 1 — per-project detail. Loads the EXPLICIT project from /portal/projects/:id (org-scoped;
 * foreign/missing → 404, never a newest-project fallback). Uses useRelationship for the shell + the
 * URL-navigation switcher (currentProjectId = the route param). Approvals are decided here (moved off
 * the multi-project Home). Billing stays off this route — invoices live on the owner-only Billing page.
 */
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, CircleDot, Circle, FileText, Download, Loader2, ArrowLeft } from 'lucide-react';
import { PortalShell } from '@/components/PortalShell';
import { useRelationship } from '@/lib/useRelationship';
import { api, apiJson } from '@/lib/portal-api';
import { fmtDate } from '@/lib/fmt';
import type { Project } from '@/lib/usePortal';
import { ActivityTimeline } from '@/components/ActivityTimeline';

const TABS = ['Milestones', 'Reports', 'Files', 'Approvals', 'Team', 'Activity'] as const;
type Tab = (typeof TABS)[number];
const TAB_SLUG: Record<Tab, string> = { Milestones: 'milestones', Reports: 'reports', Files: 'files', Approvals: 'approvals', Team: 'team', Activity: 'activity' };
const SLUG_TAB: Record<string, Tab> = { milestones: 'Milestones', reports: 'Reports', files: 'Files', approvals: 'Approvals', team: 'Team', activity: 'Activity' };
const MS_LABEL: Record<string, string> = { DONE: 'Complete', IN_PROGRESS: 'In progress', PLANNED: 'Planned' };
const CAT_LABEL: Record<string, string> = { CONTRACT: 'Contract', INVOICE: 'Invoice', DELIVERABLE: 'Deliverable', OTHER: 'File' };
const kb = (b?: number | null) => (b ? `${Math.round(b / 1024).toLocaleString()} KB` : '');
const initials = (name: string) => name.split(/[.\s]+/).map((s) => s[0]).slice(0, 2).join('').toUpperCase();
const Spinner = () => <div className="grid min-h-screen place-items-center bg-base text-neutral-400"><Loader2 className="animate-spin" /></div>;

export default function ProjectDetailPage() {
  return <Suspense fallback={<Spinner />}><ProjectDetail /></Suspense>;
}

function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const { me, projects, userName, canBilling, isOwner, loading } = useRelationship();
  const router = useRouter();
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>(() => SLUG_TAB[params.get('tab') ?? ''] ?? 'Milestones');
  const [project, setProject] = useState<Project | null | undefined>(undefined); // undefined = loading, null = 404
  useEffect(() => { const t = SLUG_TAB[params.get('tab') ?? '']; if (t) setTab(t); }, [params]);

  const load = useCallback(async () => {
    const r = await apiJson<{ project: Project }>(`/portal/projects/${projectId}`);
    setProject(r.status === 200 ? r.body.project : null);
  }, [projectId]);
  useEffect(() => { load(); }, [load]);

  const selectTab = (t: Tab) => { setTab(t); router.replace(`/projects/${projectId}?tab=${TAB_SLUG[t]}`, { scroll: false }); };
  if (loading || !me || project === undefined) return <Spinner />;
  const p = project;

  return (
    <PortalShell orgName={me.org.name} userName={userName} active="projects" billingAllowed={canBilling} projects={projects} currentProjectId={projectId}>
      <div className="mx-auto max-w-4xl">
        <a href="/" className="inline-flex items-center gap-1.5 text-sm text-neutral-400 transition hover:text-white"><ArrowLeft size={14} /> Relationship home</a>
        {p === null ? (
          <div className="mt-4 rounded-2xl border border-line bg-surface p-6 text-neutral-400">This project could not be found in your account.</div>
        ) : (
          <>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-white">{p.name}</h1>
            <p className="mt-1 text-sm text-neutral-500">
              {p.milestones.length ? `${p.milestones.filter((m) => m.status === 'DONE').length} of ${p.milestones.length} milestones complete · ${p.percentComplete}%` : 'Your project workspace'}
            </p>

            <div className="mt-5 flex flex-wrap gap-1 border-b border-line">
              {TABS.map((t) => (
                <button key={t} onClick={() => selectTab(t)}
                  className={`rounded-t-lg px-3.5 py-2 text-sm font-medium transition ${tab === t ? 'border-b-2 border-primary text-white' : 'text-neutral-400 hover:text-white'}`}>{t}</button>
              ))}
            </div>

            <div className="mt-6">
              {tab === 'Milestones' && (
                p.milestones.length > 0 ? (
                  <ol className="space-y-3">
                    {p.milestones.map((m) => (
                      <li key={m.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-4">
                        {m.status === 'DONE' ? <CheckCircle2 size={20} className="text-emerald-400" />
                          : m.status === 'IN_PROGRESS' ? <CircleDot size={20} className="text-primary-light" />
                          : <Circle size={20} className="text-neutral-600" />}
                        <div className="min-w-0">
                          <div className={`font-semibold ${m.status === 'PLANNED' ? 'text-neutral-400' : 'text-white'}`}>{m.name}</div>
                          <div className="text-xs text-neutral-500">{MS_LABEL[m.status] ?? m.status}{m.completedAt ? ` · completed ${fmtDate(m.completedAt)}` : m.dueDate ? ` · due ${fmtDate(m.dueDate)}` : ''}</div>
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : <p className="text-neutral-400">No milestones yet.</p>
              )}

              {tab === 'Reports' && (
                p.reports.length > 0 ? (
                  <div className="space-y-4">
                    {p.reports.map((r) => (
                      <article key={r.id} className="rounded-2xl border border-line bg-surface p-6">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary-light"><FileText size={14} /> {r.kind.toLowerCase()} report</div>
                        <h2 className="mt-2 font-bold text-white">{r.title}</h2>
                        <p className="mt-2 text-sm leading-relaxed text-neutral-400">{r.summary}</p>
                        <p className="mt-3 text-xs text-neutral-600">{r.periodStart && r.periodEnd ? `${fmtDate(r.periodStart)} – ${fmtDate(r.periodEnd)} · ` : ''}Published {fmtDate(r.publishedAt)}</p>
                      </article>
                    ))}
                  </div>
                ) : <p className="text-neutral-400">No reports published yet.</p>
              )}

              {tab === 'Files' && (
                p.files.length > 0 ? (
                  <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
                    {p.files.map((f) => (
                      <div key={f.id} className="flex items-center gap-3 p-4">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-base text-primary-light"><FileText size={16} /></span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-semibold text-white">{f.name}</div>
                          <div className="text-xs text-neutral-500">{CAT_LABEL[f.category] ?? f.category} · {kb(f.sizeBytes)} · {fmtDate(f.uploadedAt)}</div>
                        </div>
                        <a href={`${process.env.NEXT_PUBLIC_PORTAL_API_URL || 'http://localhost:4040/v1'}/portal/files/${f.id}/download`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-3 py-1.5 text-sm text-neutral-300 hover:bg-white/[0.05]"><Download size={14} /> Download</a>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-neutral-400">No files shared yet.</p>
              )}

              {tab === 'Approvals' && (
                p.approvals.length > 0 ? (
                  <div className="space-y-3">
                    {p.approvals.map((a) => (
                      <div key={a.id} className="rounded-xl border border-line bg-surface p-4">
                        <div className="flex items-start gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-white">{a.subject}</div>
                            <div className="text-xs text-neutral-500">Requested {fmtDate(a.createdAt)}</div>
                            {a.decidedAt && <div className="mt-0.5 text-xs text-neutral-400">{a.status === 'APPROVED' ? 'Approved' : 'Changes requested'} {fmtDate(a.decidedAt)}</div>}
                            {a.note && <div className="mt-1 rounded-lg bg-white/[0.03] px-2.5 py-1.5 text-xs text-neutral-300">&ldquo;{a.note}&rdquo;</div>}
                          </div>
                          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${a.status === 'APPROVED' ? 'bg-emerald-400/15 text-emerald-300' : a.status === 'CHANGES_REQUESTED' ? 'bg-amber-400/15 text-amber-300' : 'bg-white/10 text-neutral-300'}`}>{a.status.replace('_', ' ')}</span>
                        </div>
                        {a.status === 'PENDING' && (isOwner
                          ? <ApprovalPanel targetId={a.id} onDecided={load} />
                          : <p className="mt-3 text-xs text-amber-400/90">Only an account owner can approve or request changes.</p>)}
                      </div>
                    ))}
                  </div>
                ) : <p className="text-neutral-400">No approvals yet. When your team needs a sign-off, it appears on your Home page and here.</p>
              )}

              {tab === 'Team' && (
                p.members.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {p.members.map((m) => (
                      <div key={m.id} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-5">
                        <span className="grid h-11 w-11 place-items-center rounded-full bg-elevated text-sm font-bold text-primary-light">{initials(m.name)}</span>
                        <div><div className="font-semibold text-white">{m.name}</div><div className="text-sm text-neutral-500">{m.role}</div></div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-neutral-400">Your delivery team will appear here once assigned.</p>
              )}

              {tab === 'Activity' && (
                <ActivityTimeline items={p.activities ?? []} emptyLabel="No milestones or moments recorded for this project yet." />
              )}
            </div>
          </>
        )}
      </div>
    </PortalShell>
  );
}

function ApprovalPanel({ targetId, onDecided }: { targetId: string; onDecided: () => void | Promise<void> }) {
  const [note, setNote] = useState('');
  const [deciding, setDeciding] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function decide(decision: 'APPROVED' | 'CHANGES_REQUESTED') {
    setErr(null); setDeciding(true);
    const r = await api(`/portal/approvals/${targetId}/decide`, { method: 'POST', body: JSON.stringify({ decision, note: note.trim() || undefined }) });
    setDeciding(false);
    if (!r.ok) { setErr(r.status === 403 ? 'Only an account owner can approve or request changes.' : 'Could not submit your decision. Please try again.'); return; }
    setNote(''); await onDecided();
  }
  return (
    <div className="mt-3 border-t border-line pt-3">
      <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={2000}
        placeholder="Add a note (optional) — shared with the delivery team"
        className="w-full resize-none rounded-lg border border-line bg-base px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-primary focus:outline-none" />
      <div className="mt-2 flex justify-end gap-2">
        <button type="button" disabled={deciding} onClick={() => decide('CHANGES_REQUESTED')}
          className="rounded-lg border border-line-strong px-3.5 py-2 text-sm font-semibold text-neutral-200 hover:bg-white/[0.05] disabled:opacity-60">Request changes</button>
        <button type="button" disabled={deciding} onClick={() => decide('APPROVED')}
          className="rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60">Review &amp; approve</button>
      </div>
      {err && <p className="mt-2 text-right text-xs text-red-400">{err}</p>}
    </div>
  );
}
