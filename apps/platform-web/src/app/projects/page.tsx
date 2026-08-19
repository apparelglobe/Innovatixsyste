'use client';

import Link from 'next/link';
import { Flag, FileText, Files, Users, Loader2, ChevronRight } from 'lucide-react';
import { usePortal } from '@/lib/usePortal';
import { PortalShell } from '@/components/PortalShell';

// S5.1 — Projects landing. Minimal by design: it gives the new "Projects" nav item a real
// destination and keeps the folded surfaces (Milestones / Reports / Files / Team) reachable
// now that they've left the sidebar. S5.2 replaces these link cards with in-page tabs on the
// same route. Kept deliberately independent of any single-project assumption so the S5.2 hub
// can extend it (multi-project switching stays deferred to Phase 4).
export default function ProjectsPage() {
  const { me, project, userName, loading } = usePortal();
  if (loading || !me) return <div className="grid min-h-screen place-items-center bg-base text-neutral-400"><Loader2 className="animate-spin" /></div>;

  const done = project?.milestones.filter((m) => m.status === 'DONE').length ?? 0;
  const total = project?.milestones.length ?? 0;

  const sections = project ? [
    { href: '/milestones', icon: <Flag size={18} className="text-primary-light" />, label: 'Milestones', hint: total ? `${done} of ${total} complete` : 'No milestones yet' },
    { href: '/reports', icon: <FileText size={18} className="text-primary-light" />, label: 'Reports', hint: project.reports.length ? `${project.reports.length} report${project.reports.length === 1 ? '' : 's'}` : 'No reports yet' },
    { href: '/files', icon: <Files size={18} className="text-primary-light" />, label: 'Files', hint: project.files.length ? `${project.files.length} file${project.files.length === 1 ? '' : 's'}` : 'No files yet' },
    { href: '/team', icon: <Users size={18} className="text-primary-light" />, label: 'Delivery team', hint: project.members.length ? `${project.members.length} ${project.members.length === 1 ? 'person' : 'people'}` : 'Not assigned yet' },
  ] : [];

  return (
    <PortalShell orgName={me.org.name} userName={userName} active="projects">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-extrabold tracking-tight text-white">Projects</h1>
        {project
          ? <p className="mt-1 text-sm text-neutral-500">{project.name}</p>
          : <p className="mt-1 text-sm text-neutral-500">Your project workspace will appear here once a project is active.</p>}

        {project && (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {sections.map((s) => (
              <Link key={s.href} href={s.href}
                className="flex items-center gap-3 rounded-xl border border-line bg-surface p-4 transition hover:border-primary/40 hover:bg-white/[0.02]">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10">{s.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-white">{s.label}</span>
                  <span className="block text-xs text-neutral-500">{s.hint}</span>
                </span>
                <ChevronRight size={16} className="shrink-0 text-neutral-600" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </PortalShell>
  );
}
