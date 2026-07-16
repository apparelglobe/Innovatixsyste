'use client';

import { FileText, Loader2 } from 'lucide-react';
import { usePortal } from '@/lib/usePortal';
import { PortalShell } from '@/components/PortalShell';
import { fmtDate } from '@/lib/fmt';

export default function ReportsPage() {
  const { me, project, userName, loading } = usePortal();
  if (loading || !me) return <div className="grid min-h-screen place-items-center bg-base text-neutral-400"><Loader2 className="animate-spin" /></div>;

  return (
    <PortalShell orgName={me.org.name} userName={userName} active="reports">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-extrabold tracking-tight text-white">Development reports</h1>
        <p className="mt-1 text-sm text-neutral-500">Daily and weekly progress, summarized from verified activity.</p>
        <div className="mt-6 space-y-4">
          {project && project.reports.length > 0 ? project.reports.map((r) => (
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
          )) : <p className="text-neutral-400">No reports published yet.</p>}
        </div>
      </div>
    </PortalShell>
  );
}
