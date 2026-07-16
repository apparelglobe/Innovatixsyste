'use client';

import { FileText, Download, Loader2 } from 'lucide-react';
import { usePortal } from '@/lib/usePortal';
import { PortalShell } from '@/components/PortalShell';
import { fmtDate } from '@/lib/fmt';

const CAT_LABEL: Record<string, string> = { CONTRACT: 'Contract', INVOICE: 'Invoice', DELIVERABLE: 'Deliverable', OTHER: 'File' };
const kb = (b?: number | null) => (b ? `${Math.round(b / 1024).toLocaleString()} KB` : '');

export default function FilesPage() {
  const { me, project, userName, loading } = usePortal();
  if (loading || !me) return <div className="grid min-h-screen place-items-center bg-base text-neutral-400"><Loader2 className="animate-spin" /></div>;

  return (
    <PortalShell orgName={me.org.name} userName={userName} active="files">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-extrabold tracking-tight text-white">Files</h1>
        <p className="mt-1 text-sm text-neutral-500">Contracts, deliverables, and shared documents.</p>
        <div className="mt-6 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {project && project.files.length > 0 ? project.files.map((f) => (
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
          )) : <p className="p-6 text-neutral-400">No files shared yet.</p>}
        </div>
      </div>
    </PortalShell>
  );
}
