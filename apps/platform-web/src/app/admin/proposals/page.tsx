'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { AdminShell } from '@/components/AdminShell';
import { useStaff, staffCan } from '@/lib/useStaff';
import { apiJson } from '@/lib/portal-api';
import { fmtDate, fmtMoney } from '@/lib/fmt';
import { PROPOSAL_STATUS } from '@/lib/proposal-status';

type Row = {
  id: string; number: string; title: string; status: string;
  totalCents: number; depositCents: number; currency: string; items: number;
  lead: { email: string; name: string | null; company: string | null };
  sentAt: string | null; viewedAt: string | null; acceptedAt: string | null; createdAt: string;
};

export default function ProposalsListPage() {
  const { me, name } = useStaff();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loadErr, setLoadErr] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await apiJson<{ proposals: Row[] }>('/admin/proposals');
      if (r.status === 200 && Array.isArray(r.body.proposals)) { setRows(r.body.proposals); setLoadErr(false); }
      else { setRows([]); setLoadErr(true); }
    } catch { setRows([]); setLoadErr(true); }
  }, []);
  useEffect(() => { if (me) load(); }, [me, load]);

  if (!me || !rows) return <div className="grid min-h-screen place-items-center bg-base text-neutral-400"><Loader2 className="animate-spin" /></div>;
  const canWrite = staffCan(me.role, 'proposal:write');

  return (
    <AdminShell staffName={name} role={me.role} active="proposals">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold tracking-tight text-white">Proposals</h1>
          {canWrite && <a href="/admin/proposals/new" className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-white hover:bg-primary-dark"><Plus size={16} /> New proposal</a>}
        </div>

        {loadErr ? (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
            <p className="text-sm text-red-200">We couldn&apos;t load your proposals — your session may have expired.</p>
            <button onClick={() => load()} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-3.5 py-2 text-sm font-semibold text-neutral-100 hover:border-primary/50 hover:text-white">Try again</button>
          </div>
        ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="divide-y divide-line">
            {rows.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-neutral-400">No proposals yet.</p>
                {canWrite && <a href="/admin/proposals/new" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-light hover:underline"><Plus size={15} /> Build one from a lead</a>}
              </div>
            ) : rows.map((p) => {
              const s = PROPOSAL_STATUS[p.status] || { label: p.status, cls: 'bg-white/10 text-neutral-300' };
              return (
                <a key={p.id} href={`/admin/proposals/${p.id}`} className="flex flex-wrap items-center gap-3 p-4 transition hover:bg-white/[0.03]">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-white">{p.title} <span className="text-xs text-neutral-500">· {p.number}</span></div>
                    <div className="text-xs text-neutral-500">{p.lead.company || p.lead.name || p.lead.email} · {p.items} item{p.items === 1 ? '' : 's'} · {fmtDate(p.createdAt)}</div>
                  </div>
                  <div className="text-right text-sm font-semibold tabular-nums text-white">{fmtMoney(p.totalCents, p.currency)}</div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.cls}`}>{s.label}</span>
                </a>
              );
            })}
          </div>
        </div>
        )}
      </div>
    </AdminShell>
  );
}
