'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, ArrowRightCircle, CheckCircle2 } from 'lucide-react';
import { AdminShell } from '@/components/AdminShell';
import { useStaff, staffCan } from '@/lib/useStaff';
import { api, apiJson } from '@/lib/portal-api';
import { fmtDate } from '@/lib/fmt';

type Lead = { id: string; email: string; name: string; company: string | null; status: string; inquiries: number; createdAt: string; converted: boolean };

export default function AdminLeadsPage() {
  const { me, name } = useStaff();
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [converting, setConverting] = useState<string | null>(null);
  const [result, setResult] = useState<{ email: string; tempPassword?: string } | null>(null);

  const load = useCallback(async () => {
    const r = await apiJson<{ leads: Lead[] }>('/admin/leads');
    setLeads(r.body.leads || []);
  }, []);
  useEffect(() => { if (me) load(); }, [me, load]);

  async function convert(id: string) {
    setConverting(id);
    const res = await api(`/admin/leads/${id}/convert`, { method: 'POST', body: JSON.stringify({}) });
    if (res.ok) { const j = await res.json(); setResult({ email: j.invitedEmail, tempPassword: j.tempPassword }); await load(); }
    setConverting(null);
  }

  if (!me || !leads) return <div className="grid min-h-screen place-items-center bg-base text-neutral-400"><Loader2 className="animate-spin" /></div>;
  const canConvert = staffCan(me.role, 'lead:convert');

  return (
    <AdminShell staffName={name} role={me.role} active="leads">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-extrabold tracking-tight text-white">Leads</h1>
        <p className="mt-1 text-sm text-neutral-500">Convert a won lead into a client organization + project + portal access.</p>

        {result && (
          <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] p-4 text-sm">
            <div className="flex items-center gap-2 font-semibold text-emerald-300"><CheckCircle2 size={16} /> Converted — portal invitation sent to {result.email}</div>
            {result.tempPassword && <div className="mt-1 text-neutral-400">Temporary password (dev): <code className="text-neutral-200">{result.tempPassword}</code></div>}
          </div>
        )}

        <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="divide-y divide-line">
            {leads.length === 0 ? <p className="p-6 text-neutral-400">No leads yet.</p> : leads.map((l) => (
              <div key={l.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-white">{l.company || l.name || l.email}</div>
                  <div className="text-xs text-neutral-500">{l.email} · {l.inquiries} inquir{l.inquiries === 1 ? 'y' : 'ies'} · {fmtDate(l.createdAt)}</div>
                </div>
                <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-neutral-300">{l.status}</span>
                {l.converted ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-300"><CheckCircle2 size={14} /> Client</span>
                ) : canConvert ? (
                  <button disabled={converting === l.id} onClick={() => convert(l.id)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60">
                    {converting === l.id ? <Loader2 size={14} className="animate-spin" /> : <ArrowRightCircle size={14} />} Convert
                  </button>
                ) : <span className="text-xs text-neutral-600">—</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
