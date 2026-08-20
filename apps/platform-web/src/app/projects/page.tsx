'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, CircleDot, Circle, FileText, Download, Loader2 } from 'lucide-react';
import { usePortal } from '@/lib/usePortal';
import { PortalShell } from '@/components/PortalShell';
import { fmtDate } from '@/lib/fmt';

// S5.2 — the Projects hub. One active-project workspace that folds Milestones / Reports / Files /
// Approvals / Team into in-context tabs (mirroring the admin admin/projects/[id] detail page), all
// from the single usePortal() graph — no new API. Single active project for now; kept free of any
// "most recent project" hardcoding so the Phase 4 multi-project switcher can wrap this later.
const TABS = ['Milestones', 'Reports', 'Files', 'Approvals', 'Team'] as const;
type Tab = (typeof TABS)[number];

// S5.3 — tab deep-linking: /projects?tab=<slug> lands on that tab; clicking a tab reflects into the URL,
// so the redirected /milestones,/reports,/files,/team routes deep-link to the right tab.
const TAB_SLUG: Record<Tab, string> = { Milestones: 'milestones', Reports: 'reports', Files: 'files', Approvals: 'approvals', Team: 'team' };
const SLUG_TAB: Record<string, Tab> = { milestones: 'Milestones', reports: 'Reports', files: 'Files', approvals: 'Approvals', team: 'Team' };

const MS_LABEL: Record<string, string> = { DONE: 'Complete', IN_PROGRESS: 'In progress', PLANNED: 'Planned' };
const CAT_LABEL: Record<string, string> = { CONTRACT: 'Contract', INVOICE: 'Invoice', DELIVERABLE: 'Deliverable', OTHER: 'File' };
const kb = (b?: number | null) => (b ? `${Math.round(b / 1024).toLocaleString()} KB` : '');
const initials = (name: string) => name.split(/[.\s]+/).map((s) => s[0]).slice(0, 2).join('').toUpperCase();

const Spinner = () => <div className="grid min-h-screen place-items-center bg-base text-neutral-400"><Loader2 className="animate-spin" /></div>;

// useSearchParams() must sit under a Suspense boundary for this statically-rendered route.
export default function ProjectsPage() {
  return <Suspense fallback={<Spinner />}><ProjectsHub /></Suspense>;
}

function ProjectsHub() {
  const { me, project, userName, loading } = usePortal();
  const router = useRouter();
  const params = useSearchParams();
  const tabParam = params.get('tab');
  const [tab, setTab] = useState<Tab>(() => SLUG_TAB[tabParam ?? ''] ?? 'Milestones');
  // Keep the URL the source of truth: a soft navigation that only changes ?tab= (e.g. clicking a
  // notification while already on /projects, or a redirected /reports link) does NOT remount this
  // page, so without this the tab would desync from the URL. selectTab keeps the click optimistic.
  useEffect(() => { const t = SLUG_TAB[tabParam ?? '']; if (t) setTab(t); }, [tabParam]);
  const selectTab = (t: Tab) => { setTab(t); router.replace(`/projects?tab=${TAB_SLUG[t]}`, { scroll: false }); };
  if (loading || !me) return <Spinner />;

  const done = project?.milestones.filter((m) => m.status === 'DONE').length ?? 0;
  const total = project?.milestones.length ?? 0;

  return (
    <PortalShell orgName={me.org.name} userName={userName} active="projects">
      <div className="mx-auto max-w-4xl">
        {!project ? (
          <>
            <h1 className="text-2xl font-extrabold tracking-tight text-white">Projects</h1>
            <div className="mt-4 rounded-2xl border border-line bg-surface p-6 text-neutral-400">
              Your project workspace will appear here once a project is active.
            </div>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-extrabold tracking-tight text-white">{project.name}</h1>
            <p className="mt-1 text-sm text-neutral-500">
              {total ? `${done} of ${total} milestones complete · ${project.percentComplete}%` : 'Your project workspace'}
            </p>

            {/* Tabs mirror the admin project detail; each reads one slice of the loaded project graph. */}
            <div className="mt-5 flex flex-wrap gap-1 border-b border-line">
              {TABS.map((t) => (
                <button key={t} onClick={() => selectTab(t)}
                  className={`rounded-t-lg px-3.5 py-2 text-sm font-medium transition ${tab === t ? 'border-b-2 border-primary text-white' : 'text-neutral-400 hover:text-white'}`}>{t}</button>
              ))}
            </div>

            <div className="mt-6">
              {tab === 'Milestones' && (
                project.milestones.length > 0 ? (
                  <ol className="space-y-3">
                    {project.milestones.map((m) => (
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
                project.reports.length > 0 ? (
                  <div className="space-y-4">
                    {project.reports.map((r) => (
                      <article key={r.id} className="rounded-2xl border border-line bg-surface p-6">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary-light">
                          <FileText size={14} /> {r.kind.toLowerCase()} report
                        </div>
                        <h2 className="mt-2 font-bold text-white">{r.title}</h2>
                        <p className="mt-2 text-sm leading-relaxed text-neutral-400">{r.summary}</p>
                        <p className="mt-3 text-xs text-neutral-600">
                          {r.periodStart && r.periodEnd ? `${fmtDate(r.periodStart)} – ${fmtDate(r.periodEnd)} · ` : ''}Published {fmtDate(r.publishedAt)}
                        </p>
                      </article>
                    ))}
                  </div>
                ) : <p className="text-neutral-400">No reports published yet.</p>
              )}

              {tab === 'Files' && (
                project.files.length > 0 ? (
                  <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
                    {project.files.map((f) => (
                      <div key={f.id} className="flex items-center gap-3 p-4">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-base text-primary-light"><FileText size={16} /></span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-semibold text-white">{f.name}</div>
                          <div className="text-xs text-neutral-500">{CAT_LABEL[f.category] ?? f.category} · {kb(f.sizeBytes)} · {fmtDate(f.uploadedAt)}</div>
                        </div>
                        <a href={`${process.env.NEXT_PUBLIC_PORTAL_API_URL || 'http://localhost:4040/v1'}/portal/files/${f.id}/download`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-3 py-1.5 text-sm text-neutral-300 hover:bg-white/[0.05]">
                          <Download size={14} /> Download
                        </a>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-neutral-400">No files shared yet.</p>
              )}

              {tab === 'Approvals' && (
                project.approvals.length > 0 ? (
                  <div className="space-y-3">
                    {project.approvals.map((a) => (
                      <div key={a.id} className="flex items-start gap-3 rounded-xl border border-line bg-surface p-4">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-white">{a.subject}</div>
                          <div className="text-xs text-neutral-500">Requested {fmtDate(a.createdAt)}</div>
                          {a.decidedAt && (
                            <div className="mt-0.5 text-xs text-neutral-400">
                              {a.status === 'APPROVED' ? 'Approved' : 'Changes requested'} {fmtDate(a.decidedAt)}
                            </div>
                          )}
                          {a.note && <div className="mt-1 rounded-lg bg-white/[0.03] px-2.5 py-1.5 text-xs text-neutral-300">“{a.note}”</div>}
                        </div>
                        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${a.status === 'APPROVED' ? 'bg-emerald-400/15 text-emerald-300' : a.status === 'CHANGES_REQUESTED' ? 'bg-amber-400/15 text-amber-300' : 'bg-white/10 text-neutral-300'}`}>{a.status.replace('_', ' ')}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-neutral-400">No approvals yet. When your team needs a sign-off, it appears on your Home page and here.</p>
              )}

              {tab === 'Team' && (
                project.members.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {project.members.map((m) => (
                      <div key={m.id} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-5">
                        <span className="grid h-11 w-11 place-items-center rounded-full bg-elevated text-sm font-bold text-primary-light">{initials(m.name)}</span>
                        <div>
                          <div className="font-semibold text-white">{m.name}</div>
                          <div className="text-sm text-neutral-500">{m.role}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-neutral-400">Your delivery team will appear here once assigned.</p>
              )}
            </div>
          </>
        )}
      </div>
    </PortalShell>
  );
}
