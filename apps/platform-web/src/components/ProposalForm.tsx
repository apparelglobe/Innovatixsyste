'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { apiJson } from '@/lib/portal-api';
import { fmtMoney } from '@/lib/fmt';

type Lead = { id: string; email: string; name: string | null; company: string | null; status: string; converted: boolean };
type Service = { id: string; name: string; categoryLabel: string | null };

/** A line as the form holds it — unit price is dollars, kept as a string for the input. */
export type ProposalLine = { description: string; quantity: number; unit: string };
/** What the form hands back on submit — money already normalized to integer cents. */
export type ProposalPayload = { leadId: string; title: string; notes?: string; depositPercent: number; lineItems: { description: string; quantity: number; unitCents: number }[] };

const INPUT = 'w-full rounded-lg border border-line-strong bg-white/[0.03] px-3 py-2 text-sm text-white focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30';

/** Whole-dollar helpers for the price field: display with thousands separators, store raw digits. */
const withCommas = (raw: string) => (raw ? Number(raw).toLocaleString('en-US') : '');
const onlyDigits = (s: string) => s.replace(/[^\d]/g, '');

/**
 * The shared proposal builder body — used by both the create page (mode="new",
 * picks a lead) and the edit page (mode="edit", lead is fixed and shown read-only,
 * since the PATCH endpoint does not accept a lead change). Money in, money out is
 * integer cents; the dollars↔cents conversion lives here so callers never repeat it.
 */
export function ProposalForm({
  mode, initial, lockedLeadLabel, submitLabel, onSubmit,
}: {
  mode: 'new' | 'edit';
  initial?: { title?: string; notes?: string; depositPercent?: number; lines?: ProposalLine[] };
  lockedLeadLabel?: string;
  submitLabel: string;
  onSubmit: (payload: ProposalPayload) => Promise<{ ok: boolean; message?: string }>;
}) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [leadId, setLeadId] = useState('');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [depositPercent, setDepositPercent] = useState(initial?.depositPercent ?? 33);
  const [lines, setLines] = useState<ProposalLine[]>(initial?.lines?.length ? initial.lines : [{ description: '', quantity: 1, unit: '' }]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const svcReq = apiJson<{ services: Service[] }>('/admin/services');
      if (mode === 'new') {
        const [l, s] = await Promise.all([apiJson<{ leads: Lead[] }>('/admin/leads'), svcReq]);
        setLeads(l.body.leads || []);
        setServices(s.body.services || []);
      } else {
        setServices((await svcReq).body.services || []);
      }
    })();
  }, [mode]);

  const totals = useMemo(() => {
    const subtotal = lines.reduce((sum, li) => sum + Math.round((parseFloat(li.unit) || 0) * 100) * (li.quantity || 1), 0);
    return { subtotal, deposit: Math.round((subtotal * depositPercent) / 100) };
  }, [lines, depositPercent]);

  function addCustom() { setLines((v) => [...v, { description: '', quantity: 1, unit: '' }]); }
  function addFromCatalog(id: string) {
    const svc = services.find((s) => s.id === id);
    if (!svc) return;
    setLines((v) => {
      // Fill the first blank row (e.g. the initial empty line) rather than leaving a stray one.
      const emptyIdx = v.findIndex((li) => !li.description.trim() && !li.unit.trim());
      if (emptyIdx >= 0) return v.map((li, i) => (i === emptyIdx ? { ...li, description: svc.name } : li));
      return [...v, { description: svc.name, quantity: 1, unit: '' }];
    });
  }
  function update(i: number, patch: Partial<ProposalLine>) { setLines((v) => v.map((li, idx) => (idx === i ? { ...li, ...patch } : li))); }
  function remove(i: number) { setLines((v) => (v.length === 1 ? v : v.filter((_, idx) => idx !== i))); }
  function move(i: number, dir: -1 | 1) {
    setLines((v) => {
      const j = i + dir;
      const a = v[i];
      const b = v[j];
      if (!a || !b) return v;
      const next = [...v];
      next[i] = b;
      next[j] = a;
      return next;
    });
  }

  async function submit() {
    setErr(null);
    if (mode === 'new' && !leadId) { setErr('Pick a lead to build this proposal for.'); return; }
    if (!title.trim()) { setErr('Give the proposal a title.'); return; }
    const lineItems = lines
      .filter((li) => li.description.trim())
      .map((li) => ({ description: li.description.trim(), quantity: li.quantity || 1, unitCents: Math.round((parseFloat(li.unit) || 0) * 100) }));
    if (lineItems.length === 0) { setErr('Add at least one line item with a description.'); return; }
    setSaving(true);
    try {
      const result = await onSubmit({ leadId, title: title.trim(), notes: notes.trim() || undefined, depositPercent, lineItems });
      if (!result.ok) { setSaving(false); setErr(result.message || 'Could not save the proposal. Please try again.'); }
      // On success the caller navigates away — keep `saving` true so the button doesn't flash back.
    } catch {
      setSaving(false);
      setErr('Something went wrong while saving. Please check your connection and try again.');
    }
  }

  return (
    <div className="mt-6 space-y-5 rounded-2xl border border-line bg-surface p-6">
      {err && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5">
          <p className="text-sm text-red-200">{err}</p>
          <button type="button" onClick={submit} disabled={saving} className="shrink-0 rounded-md border border-red-400/40 px-2.5 py-1 text-xs font-semibold text-red-100 transition hover:bg-red-500/20 disabled:opacity-50">Retry</button>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-neutral-200">For lead</span>
          {mode === 'new' ? (
            <select value={leadId} onChange={(e) => setLeadId(e.target.value)} className={INPUT}>
              <option value="">Select a lead…</option>
              {leads.map((l) => <option key={l.id} value={l.id}>{(l.company || l.name || l.email)}{l.converted ? ' (client)' : ''} — {l.email}</option>)}
            </select>
          ) : (
            <div className="w-full truncate rounded-lg border border-line-strong bg-white/[0.02] px-3 py-2 text-sm text-neutral-400" title={lockedLeadLabel}>{lockedLeadLabel || '—'}</div>
          )}
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

        <div className="mb-1 hidden grid-cols-[20px_1fr_56px_104px_24px] gap-2 px-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500 sm:grid">
          <span /><span>Description</span><span className="text-center">Qty</span><span>Unit price</span><span />
        </div>
        <div className="space-y-2">
          {lines.map((li, i) => {
            const unitCents = Math.round((parseFloat(li.unit) || 0) * 100);
            const amountCents = unitCents * (li.quantity || 1);
            return (
              <div key={i}>
                <div className="grid grid-cols-[20px_1fr_48px_88px_22px] items-center gap-1.5 sm:grid-cols-[20px_1fr_56px_104px_24px] sm:gap-2">
                  <div className="flex flex-col items-center text-neutral-600">
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="transition hover:text-neutral-200 disabled:opacity-25" aria-label="Move line up"><ChevronUp size={14} /></button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === lines.length - 1} className="transition hover:text-neutral-200 disabled:opacity-25" aria-label="Move line down"><ChevronDown size={14} /></button>
                  </div>
                  <input value={li.description} onChange={(e) => update(i, { description: e.target.value })} placeholder="What's included" className="rounded-lg border border-line-strong bg-white/[0.03] px-3 py-2 text-sm text-white focus:border-primary/60 focus:outline-none" />
                  <input type="number" min={1} value={li.quantity} onChange={(e) => update(i, { quantity: parseInt(e.target.value) || 1 })} className="rounded-lg border border-line-strong bg-white/[0.03] px-1.5 py-2 text-center text-sm text-white focus:border-primary/60 focus:outline-none" />
                  <div className="relative">
                    <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-neutral-500">$</span>
                    <input inputMode="numeric" value={withCommas(li.unit)} onChange={(e) => update(i, { unit: onlyDigits(e.target.value) })} placeholder="0" className="w-full rounded-lg border border-line-strong bg-white/[0.03] py-2 pl-6 pr-2 text-sm tabular-nums text-white focus:border-primary/60 focus:outline-none" />
                  </div>
                  <button type="button" onClick={() => remove(i)} disabled={lines.length === 1} className="grid h-8 w-6 place-items-center rounded-lg text-neutral-500 transition hover:text-red-400 disabled:opacity-25" aria-label="Remove line"><Trash2 size={15} /></button>
                </div>
                {li.unit && (
                  <div className="mt-0.5 pr-7 text-right text-[11px] text-neutral-500">
                    {li.quantity > 1 && <>Qty {li.quantity} × {fmtMoney(unitCents)} = </>}
                    <span className="font-semibold text-neutral-300">{fmtMoney(amountCents)}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-x-6 gap-y-1 border-t border-line pt-4 text-sm">
        <span className="text-neutral-400">Total <b className="tabular-nums text-white">{fmtMoney(totals.subtotal)}</b></span>
        <span className="text-neutral-400">Deposit ({depositPercent}%) <b className="tabular-nums text-amber-300">{fmtMoney(totals.deposit)}</b></span>
      </div>

      <button onClick={submit} disabled={saving} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 font-semibold text-white hover:bg-primary-dark disabled:opacity-60">
        {saving ? <><Loader2 size={18} className="animate-spin" /> Saving…</> : submitLabel}
      </button>
    </div>
  );
}
