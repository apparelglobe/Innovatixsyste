'use client';

import { CheckCircle2, CircleDot, Circle, Loader2 } from 'lucide-react';
import { usePortal } from '@/lib/usePortal';
import { PortalShell } from '@/components/PortalShell';
import { fmtDate } from '@/lib/fmt';

const LABEL: Record<string, string> = { DONE: 'Complete', IN_PROGRESS: 'In progress', PLANNED: 'Planned' };

export default function MilestonesPage() {
  const { me, project, userName, loading } = usePortal();
  if (loading || !me) return <div className="grid min-h-screen place-items-center bg-base text-neutral-400"><Loader2 className="animate-spin" /></div>;

  return (
    <PortalShell orgName={me.org.name} userName={userName} active="milestones">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-extrabold tracking-tight text-white">Milestones</h1>
        <p className="mt-1 text-sm text-neutral-500">{project?.name}</p>
        <ol className="mt-6 space-y-3">
          {project?.milestones.map((m) => (
            <li key={m.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-4">
              {m.status === 'DONE' ? <CheckCircle2 size={20} className="text-emerald-400" />
                : m.status === 'IN_PROGRESS' ? <CircleDot size={20} className="text-primary-light" />
                : <Circle size={20} className="text-neutral-600" />}
              <div className="min-w-0">
                <div className={`font-semibold ${m.status === 'PLANNED' ? 'text-neutral-400' : 'text-white'}`}>{m.name}</div>
                <div className="text-xs text-neutral-500">{LABEL[m.status] ?? m.status}{m.completedAt ? ` · completed ${fmtDate(m.completedAt)}` : m.dueDate ? ` · due ${fmtDate(m.dueDate)}` : ''}</div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </PortalShell>
  );
}
