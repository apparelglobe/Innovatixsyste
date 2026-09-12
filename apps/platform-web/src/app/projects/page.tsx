'use client';

/**
 * Slice 1 — the Projects list (relationship hub). Lists all of the org's projects (lean, financial-data-
 * free) via useRelationship → /portal/projects; each links to /projects/:id. Replaces the old single
 * usePortal().project hub. No dependency on the legacy /portal/project.
 */
import { useEffect } from 'react';
import { Loader2, FolderKanban, ArrowUpRight } from 'lucide-react';
import { PortalShell } from '@/components/PortalShell';
import { useRelationship } from '@/lib/useRelationship';

const STATUS_LABEL: Record<string, string> = { DISCOVERY: 'Discovery', IN_PROGRESS: 'In progress', UAT: 'Quality assurance', LAUNCHED: 'Live', ON_HOLD: 'On hold', COMPLETE: 'Complete' };

type Item = { id: string; name: string; status: string; archivedAt: string | null };

function ProjectRow({ p, past }: { p: Item; past?: boolean }) {
  return (
    <a href={`/projects/${p.id}`}
      className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface p-4 transition hover:border-line-strong hover:bg-white/[0.02]">
      <div className="flex min-w-0 items-center gap-3">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-base ${past ? 'text-neutral-500' : 'text-primary-light'}`}><FolderKanban size={16} /></span>
        <div className="min-w-0">
          <div className="truncate font-semibold text-white">{p.name}</div>
          <div className="text-xs text-neutral-500">{STATUS_LABEL[p.status] ?? p.status}{past ? ' · Archived' : ''}</div>
        </div>
      </div>
      <ArrowUpRight size={16} className="shrink-0 text-neutral-500" />
    </a>
  );
}

export default function ProjectsListPage() {
  const { me, projects, userName, canBilling, loading } = useRelationship();
  // Slice 7: the #past section mounts only AFTER the async list resolves, so a fresh navigation to
  // /projects#past (from Home links or the switcher) has no target when the browser first tries to jump.
  // Retry the fragment scroll once data is ready. Hook runs unconditionally (before the early return) to
  // keep hook order stable; it no-ops unless the hash is #past.
  useEffect(() => {
    if (!loading && me && typeof window !== 'undefined' && window.location.hash === '#past') {
      document.getElementById('past')?.scrollIntoView();
    }
  }, [loading, me]);
  if (loading || !me) return <div className="grid min-h-screen place-items-center bg-base text-neutral-400"><Loader2 className="animate-spin" /></div>;
  // Slice 7: split into current work vs the Past Projects archive. Past projects still open read-only via
  // the same /projects/:id detail — this is only a presentation split.
  const current = projects.filter((p) => !p.archivedAt);
  const past = projects.filter((p) => p.archivedAt);
  return (
    <PortalShell orgName={me.org.name} userName={userName} active="projects" billingAllowed={canBilling} projects={projects}>
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-extrabold tracking-tight text-white">Projects</h1>
        {projects.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-line bg-surface p-6 text-neutral-400">Your project workspace will appear here once a project is active.</div>
        ) : (
          <>
            <h2 className="mt-5 text-sm font-semibold uppercase tracking-wide text-neutral-500">Current projects</h2>
            {current.length === 0 ? (
              <div className="mt-3 rounded-2xl border border-line bg-surface p-6 text-neutral-400">No current projects. See past projects below.</div>
            ) : (
              <div className="mt-3 space-y-2.5">{current.map((p) => <ProjectRow key={p.id} p={p} />)}</div>
            )}
            {past.length > 0 && (
              <section id="past" className="mt-8 scroll-mt-6">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Past projects</h2>
                <p className="mt-0.5 text-xs text-neutral-500">Completed and archived work. Still fully readable.</p>
                <div className="mt-3 space-y-2.5">{past.map((p) => <ProjectRow key={p.id} p={p} past />)}</div>
              </section>
            )}
          </>
        )}
      </div>
    </PortalShell>
  );
}
