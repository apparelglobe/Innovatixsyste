'use client';

import { Loader2 } from 'lucide-react';
import { usePortal } from '@/lib/usePortal';
import { PortalShell } from '@/components/PortalShell';

const initials = (name: string) => name.split(/[.\s]+/).map((s) => s[0]).slice(0, 2).join('').toUpperCase();

export default function TeamPage() {
  const { me, project, userName, loading } = usePortal();
  if (loading || !me) return <div className="grid min-h-screen place-items-center bg-base text-neutral-400"><Loader2 className="animate-spin" /></div>;

  return (
    <PortalShell orgName={me.org.name} userName={userName} active="projects">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-extrabold tracking-tight text-white">Your delivery team</h1>
        <p className="mt-1 text-sm text-neutral-500">The Innovatix engineers building {project?.name}.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {project?.members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-5">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-elevated text-sm font-bold text-primary-light">{initials(m.name)}</span>
              <div>
                <div className="font-semibold text-white">{m.name}</div>
                <div className="text-sm text-neutral-500">{m.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PortalShell>
  );
}
