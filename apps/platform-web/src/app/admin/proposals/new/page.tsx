'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { AdminShell } from '@/components/AdminShell';
import { useStaff } from '@/lib/useStaff';
import { api, apiJson } from '@/lib/portal-api';
import { fmtMoney } from '@/lib/fmt';

type Lead = { id: string; email: string; name: string | null; company: string | null; status: string; converted: boolean };
type Service = { id: string; name: string; categoryLabel: string | null };
type Line = { description: string; quantity: number; unit: string }; // unit = dollars, kept as a string for the input

const INPUT = 'w-full rounded-lg border border-line-strong bg-white/[0.03] px-3 py-2 text-sm text-white focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30';

export default function NewProposalPage() {
  const router = useRouter();
  const { me, name } = useStaff();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [leadId, setLeadId] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [depositPercent, setDepositPercent] = useState(33);
  const [lines, setLines] = useState<Line[]>([{ description: '', quantity: 1, unit: '' }]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!me) return;
    (async () => {
      const [l, s] = await Promise.all([
        apiJson<{ leads: Lead[] }>('/admin/leads'),
        apiJson<{ services: Service[] }>('/admin/services'),
      ]);
      setLeads(l.body.leads || []);
      setServices(s.body.services || []);
    })();
  }, [me]);

  const totals = useMemo(() => {
    const subtotal = lines.reduce((sum, li) => sum + Math.round((parseFloat(li.unit) || 0) * 100) * (li.quantity || 1), 0);
    return { subtotal, deposit: Math.round((subtotal * depositPercent) / 100) };
  }, [lines, depositPercent]);

  function addCustom() { setLines((v) => [...v, { description: '', quantity: 1, unit: '' }]); }
  function addFromCatalog(id: string) { const svc = services.find((s) => s.id === id); if (svc) setLines((v) => [...v, { description: svc.name, quantity: 1, unit: '' }]); }
  function update(i: number, patch: Partial<Line>) { setLines((v) => v.map((li, idx) => (idx === i ? { ...li, ...patch } : li))); }
  function remove(i: number) { setLines((v) => (v.length === 1 ? v : v.filter((_, idx) => idx !== i))); }

  async function save() {
    setErr(null);
    if (!leadId) { setErr('Pick a lead to build this proposal for.'); return; }
    if (!title.trim()) { setErr('Give the proposal a title.'); return; }
    const lineItems = lines
      .filter((li) => li.description.trim())
      .map((li) => ({ description: li.description.trim(), quantity: li.quantity || 1, unitCents: Math.round((parseFloat(li.unit) || 0) * 100) }));
    if (lineItems.length === 0) { setErr('Add at least one line item with a description.'); return; }
    setSaving(true);
    const res = await api('/admin/proposals', { method: 'POST', body: JSON.stringify({ leadId, title: title.trim(), notes: notes.trim() || undefined, depositPercent, lineItems }) });
    const body = await res.json().catch(() => ({}));
    if (res.ok && body?.proposal?.id) { router.push(`/admin/proposals/${body.proposal.id}`); return; }
    setSaving(false);
    setErr(body?.message || 'Could not save the proposal. Please try again.');
  }

  if (!me) return <div className="grid min-h-screen place-items-center bg-base text-neutral-400"><Loader2 className="animate-spin" /></div>;

  return (
    <AdminShell staffName={name} role={me.role} active="proposals">
      <div className="mx-auto max-w-3xl">
        <a href="/admin/proposals" className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white"><ArrowLeft size={15} /> Proposals</a>
        <h1 className="text-2xl font-extrabold tracking-tight text-white">New proposal</h1>
        <p className="mt-1 text-sm text-neutral-400">Assemble line items, set the activation deposit, and save a draft — then send it to the prospect.</p>

        <div className="mt-6 space-y-5 rounded-2xl border border-line bg-surface p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-neutral-200">For lead</span>
              <select value={leadId} onChange={(e) => setLeadId(e.target.value)} className={INPUT}>
                <option value="">Select a lead…</option>
                {leads.map((l) => <option key={l.id} value={l.id}>{(l.company || l.name || l.email)}{l.converted ? ' (client)' : ''} — {l.email}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-neutral-200">Activation deposit %</span>
              <input type="number" min={0} max={100} value={depositPercent} onChange={(e) => setDepositPercent(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))} className={INPUT} />
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-neutral-200">Title</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Order Management System" className={INPUT} />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-neutral-200">Intro note <span className="font-normal text-neutral-500">(shown to the prospect · optional)</span></span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Scoped from our discovery call on…" className={INPUT} />
          </label>

          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium text-neutral-200">Line items</span>
              <div className="flex items-center gap-2">
                <select value="" onChange={(e) => { if (e.target.value) addFromCatalog(e.target.value); e.currentTarget.value = ''; }} className="max-w-[200px] rounded-lg border border-line-strong bg-white/[0.03] px-2 py-1.5 text-xs text-white focus:border-primary/60 focus:outline-none">
                  <option value="">+ Add from catalog…</option>
                  {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <button type="button" onClick={addCustom} className="inline-flex items-center gap-1 rounded-lg border border-line-strong px-2.5 py-1.5 text-xs font-semibold text-neutral-200 hover:border-primary/50 hover:text-white"><Plus size={13} /> Custom</button>
              </div>
            </div>

            <div className="mb-1 hidden grid-cols-[1fr_64px_110px_28px] gap-2 px-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500 sm:grid">
              <span>Description</span><span className="text-center">Qty</span><span>Unit price</span><span />
            </div>
            <div className="space-y-2">
              {lines.map((li, i) => (
                <div key={i} className="grid grid-cols-[1fr_56px_100px_28px] items-center gap-2 sm:grid-cols-[1fr_64px_110px_28px]">
                  <input value={li.description} onChange={(e) => update(i, { description: e.target.value })} placeholder="What's included" className="rounded-lg border border-line-strong bg-white/[0.03] px-3 py-2 text-sm text-white focus:border-primary/60 focus:outline-none" />
                  <input type="number" min={1} value={li.quantity} onChange={(e) => update(i, { quantity: parseInt(e.target.value) || 1 })} className="rounded-lg border border-line-strong bg-white/[0.03] px-2 py-2 text-center text-sm text-white focus:border-primary/60 focus:outline-none" />
                  <div className="relative">
                    <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-neutral-500">$</span>
                    <input type="number" min={0} step="1" value={li.unit} onChange={(e) => update(i, { unit: e.target.value })} placeholder="0" className="w-full rounded-lg border border-line-strong bg-white/[0.03] py-2 pl-6 pr-2 text-sm text-white focus:border-primary/60 focus:outline-none" />
                  </div>
                  <button type="button" onClick={() => remove(i)} className="grid h-8 w-7 place-items-center rounded-lg text-neutral-500 transition hover:text-red-400" aria-label="Remove line"><Trash2 size={15} /></button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-x-6 gap-y-1 border-t border-line pt-4 text-sm">
            <span className="text-neutral-400">Total <b className="tabular-nums text-white">{fmtMoney(totals.subtotal)}</b></span>
            <span className="text-neutral-400">Deposit ({depositPercent}%) <b className="tabular-nums text-amber-300">{fmtMoney(totals.deposit)}</b></span>
          </div>

          {err && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">{err}</p>}

          <button onClick={save} disabled={saving} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 font-semibold text-white hover:bg-primary-dark disabled:opacity-60">
            {saving ? <><Loader2 size={18} className="animate-spin" /> Saving…</> : 'Save draft'}
          </button>
        </div>
      </div>
    </AdminShell>
  );
}
