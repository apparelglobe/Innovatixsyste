'use client';

/**
 * Slice 1 — the Projects list (relationship hub). Lists all of the org's projects (lean, financial-data-
 * free) via useRelationship → /portal/projects; each links to /projects/:id. Replaces the old single
 * usePortal().project hub. No dependency on the legacy /portal/project.
 */
import { Loader2, FolderKanban, ArrowUpRight } from 'lucide-react';
import { PortalShell } from '@/components/PortalShell';
import { useRelationship } from '@/lib/useRelationship';

const STATUS_LABEL: Record<string, string> = { DISCOVERY: 'Discovery', IN_PROGRESS: 'In progress', UAT: 'Quality assurance', LAUNCHED: 'Live', ON_HOLD: 'On hold', COMPLETE: 'Complete' };

export default function ProjectsListPage() {
  const { me, projects, userName, canBilling, loading } = useRelationship();
  if (loading || !me) return <div className="grid min-h-screen place-items-center bg-base text-neutral-400"><Loader2 className="animate-spin" /></div>;
  return (
    <PortalShell orgName={me.org.name} userName={userName} active="projects" billingAllowed={canBilling} projects={projects}>
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-extrabold tracking-tight text-white">Projects</h1>
        {projects.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-line bg-surface p-6 text-neutral-400">Your project workspace will appear here once a project is active.</div>
        ) : (
          <div className="mt-4 space-y-2.5">
            {projects.map((p) => (
              <a key={p.id} href={`/projects/${p.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface p-4 transition hover:border-line-strong hover:bg-white/[0.02]">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-base text-primary-light"><FolderKanban size={16} /></span>
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-white">{p.name}</div>
                    <div className="text-xs text-neutral-500">{STATUS_LABEL[p.status] ?? p.status}</div>
                  </div>
                </div>
                <ArrowUpRight size={16} className="shrink-0 text-neutral-500" />
              </a>
            ))}
          </div>
        )}
      </div>
    </PortalShell>
  );
}
