'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { AdminShell } from '@/components/AdminShell';
import { useStaff, staffCan } from '@/lib/useStaff';
import { api, apiJson } from '@/lib/portal-api';
import { fmtDate } from '@/lib/fmt';

type Row = { id: string; name: string; code: string | null; status: string; percentComplete: number; dueDate: string | null; client: string; milestones: number; approvals: number };
type ClientOrg = { id: string; name: string };

const STATUS_LABEL: Record<string, string> = { DISCOVERY: 'Discovery', IN_PROGRESS: 'In Progress', UAT: 'UAT', LAUNCHED: 'Launched', ON_HOLD: 'On Hold', COMPLETE: 'Complete' };

export default function AdminProjectsPage() {
  const { me, name } = useStaff();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [clients, setClients] = useState<ClientOrg[]>([]);
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async () => {
    const [pr, cl] = await Promise.all([apiJson<{ projects: Row[] }>('/admin/projects'), apiJson<{ clients: ClientOrg[] }>('/admin/clients')]);
    setRows(pr.body.projects || []);
    setClients(cl.body.clients || []);
  }, []);
  useEffect(() => { if (me) load(); }, [me, load]);

  async function createProject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await api('/admin/projects', { method: 'POST', body: JSON.stringify({ clientOrgId: fd.get('clientOrgId'), name: fd.get('name'), code: fd.get('code') || undefined, dueDate: fd.get('dueDate') || undefined }) });
    if (res.ok) { setShowNew(false); await load(); }
  }

  if (!me || !rows) return <div className="grid min-h-screen place-items-center bg-base text-neutral-400"><Loader2 className="animate-spin" /></div>;
  const canWrite = staffCan(me.role, 'project:write');

  return (
    <AdminShell staffName={name} role={me.role} active="projects">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold tracking-tight text-white">Projects</h1>
          {canWrite && <button onClick={() => setShowNew((v) => !v)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-white hover:bg-primary-dark"><Plus size={16} /> New project</button>}
        </div>

        {showNew && (
          <form onSubmit={createProject} className="mt-4 grid gap-3 rounded-2xl border border-line bg-surface p-5 sm:grid-cols-2">
            <label className="block"><span className="mb-1 block text-xs font-medium text-neutral-300">Client</span>
              <select name="clientOrgId" required className="w-full rounded-lg border border-line-strong bg-white/[0.03] px-3 py-2 text-sm text-white"><option value="">Select…</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            <label className="block"><span className="mb-1 block text-xs font-medium text-neutral-300">Project name</span><input name="name" required className="w-full rounded-lg border border-line-strong bg-white/[0.03] px-3 py-2 text-sm text-white" placeholder="Operations platform build" /></label>
            <label className="block"><span className="mb-1 block text-xs font-medium text-neutral-300">Code</span><input name="code" className="w-full rounded-lg border border-line-strong bg-white/[0.03] px-3 py-2 text-sm text-white" placeholder="BETA" /></label>
            <label className="block"><span className="mb-1 block text-xs font-medium text-neutral-300">Due date</span><input name="dueDate" type="date" className="w-full rounded-lg border border-line-strong bg-white/[0.03] px-3 py-2 text-sm text-white" /></label>
            <div className="sm:col-span-2"><button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark">Create project</button></div>
          </form>
        )}

        <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="divide-y divide-line">
            {rows.length === 0 ? <p className="p-6 text-neutral-400">No projects yet.</p> : rows.map((p) => (
              <a key={p.id} href={`/admin/projects/${p.id}`} className="flex flex-wrap items-center gap-3 p-4 transition hover:bg-white/[0.03]">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-white">{p.name} {p.code && <span className="text-xs text-neutral-500">· {p.code}</span>}</div>
                  <div className="text-xs text-neutral-500">{p.client} · {p.milestones} milestones · {p.approvals} approvals · due {fmtDate(p.dueDate)}</div>
                </div>
                <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-neutral-200">{STATUS_LABEL[p.status] ?? p.status}</span>
                <div className="w-16 text-right font-bold text-white">{p.percentComplete}%</div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
