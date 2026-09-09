'use client';

/**
 * Slice 3 — client support tickets list + compose. Relationship-level (org-wide) list; both OWNER and
 * MEMBER can open a ticket. The compose form sends a per-submit Idempotency-Key header (DB-backed
 * idempotency): the key is generated when the form opens and reused across retries until it succeeds.
 */
import { useCallback, useEffect, useState } from 'react';
import { Loader2, LifeBuoy, Plus, ArrowUpRight } from 'lucide-react';
import { PortalShell } from '@/components/PortalShell';
import { apiJson, api } from '@/lib/portal-api';
import { Timestamp } from '@/components/Timestamp';
import { useRelationship } from '@/lib/useRelationship';
import { TONE_CLASS } from '@/lib/proposal-stage';
import { TICKET_STATUS_LABEL, TICKET_STATUS_TONE, TICKET_CATEGORY_LABEL, TICKET_CATEGORIES, type TicketListItem } from '@/lib/tickets-ui';

export default function TicketsPage() {
  const { me, projects, userName, canBilling, loading } = useRelationship();
  const [tickets, setTickets] = useState<TicketListItem[] | undefined>(undefined);
  const [composing, setComposing] = useState(false);

  const load = useCallback(async () => {
    const r = await apiJson<{ tickets: TicketListItem[] }>('/portal/tickets');
    if (r.status === 200) setTickets(r.body.tickets);
  }, []);
  useEffect(() => { load(); }, [load]);

  const ready = !!me && !loading && tickets !== undefined;

  return (
    <PortalShell orgName={me?.org.name ?? ''} userName={userName} active="tickets" billingAllowed={canBilling} projects={projects}>
      <div className="mx-auto max-w-4xl">
        {!ready ? (
          <div className="grid place-items-center py-24 text-neutral-400"><Loader2 className="animate-spin" /></div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-white"><LifeBuoy size={18} className="text-primary-light" /> Support</h1>
                <p className="mt-0.5 text-sm text-neutral-500">Open a request and talk to our team. Everyone on your account can see and reply.</p>
              </div>
              {!composing && (
                <button onClick={() => setComposing(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-white shadow-cta transition-colors hover:bg-primary-dark">
                  <Plus size={15} /> New ticket
                </button>
              )}
            </div>

            {composing && (
              <NewTicket projects={projects} onCancel={() => setComposing(false)} onCreated={async () => { setComposing(false); await load(); }} />
            )}

            <div className="mt-5 space-y-3">
              {(tickets ?? []).length === 0 && !composing ? (
                <div className="rounded-2xl border border-line bg-surface p-6 text-neutral-400">No tickets yet. Open one and we&rsquo;ll get right on it.</div>
              ) : (
                (tickets ?? []).map((t) => (
                  <a key={t.id} href={`/tickets/${t.id}`} className="block rounded-2xl border border-line bg-surface p-4 transition hover:border-line-strong">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${TONE_CLASS[TICKET_STATUS_TONE[t.status]]}`}>{TICKET_STATUS_LABEL[t.status]}</span>
                      <span className="inline-flex items-center gap-1 text-xs text-neutral-500">{t.number} <ArrowUpRight size={13} /></span>
                    </div>
                    <h2 className="mt-2 font-bold text-white">{t.subject}</h2>
                    <p className="mt-1 text-xs text-neutral-500">{TICKET_CATEGORY_LABEL[t.category]} · updated <Timestamp value={t.lastMessageAt} /></p>
                  </a>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </PortalShell>
  );
}

function NewTicket({ projects, onCancel, onCreated }: { projects: { id: string; name: string }[]; onCancel: () => void; onCreated: () => void | Promise<void> }) {
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<(typeof TICKET_CATEGORIES)[number]>('GENERAL');
  const [projectId, setProjectId] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // One Idempotency-Key per compose session — reused across retries so a double-submit can never
  // create two tickets (the server dedups on it). Regenerated only when a fresh compose opens (remount).
  const [idempotencyKey] = useState(() => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.round(Math.random() * 1e9)}`));

  async function submit() {
    if (!subject.trim() || !body.trim()) { setErr('Please add a subject and a message.'); return; }
    setErr(null); setSubmitting(true);
    const res = await api('/portal/tickets', {
      method: 'POST',
      headers: { 'idempotency-key': idempotencyKey },
      body: JSON.stringify({ subject: subject.trim(), category, projectId: projectId || undefined, body: body.trim() }),
    });
    setSubmitting(false);
    if (res.status === 201 || res.status === 200) { await onCreated(); return; }
    setErr(res.status === 409 ? 'This request was already submitted.' : 'Could not open the ticket. Please try again.');
  }

  return (
    <section className="mt-4 rounded-2xl border border-primary/30 bg-primary/[0.05] p-5">
      <h2 className="text-base font-bold text-white">New support ticket</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-neutral-400">Subject</span>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200}
            className="w-full rounded-lg border border-line bg-base px-3 py-2 text-neutral-100 placeholder:text-neutral-600 focus:border-primary focus:outline-none" placeholder="Brief summary" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-neutral-400">Category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value as typeof category)}
            className="w-full rounded-lg border border-line bg-base px-3 py-2 text-neutral-100 focus:border-primary focus:outline-none">
            {TICKET_CATEGORIES.map((c) => <option key={c} value={c}>{TICKET_CATEGORY_LABEL[c]}</option>)}
          </select>
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block text-neutral-400">Related project <span className="text-neutral-600">(optional)</span></span>
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)}
            className="w-full rounded-lg border border-line bg-base px-3 py-2 text-neutral-100 focus:border-primary focus:outline-none">
            <option value="">None — general request</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block text-neutral-400">How can we help?</span>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} maxLength={8000}
            className="w-full resize-none rounded-lg border border-line bg-base px-3 py-2 text-neutral-100 placeholder:text-neutral-600 focus:border-primary focus:outline-none" placeholder="Describe your request" />
        </label>
      </div>
      {err && <p className="mt-2 text-sm text-red-400">{err}</p>}
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={onCancel} disabled={submitting} className="rounded-lg border border-line-strong px-3.5 py-2 text-sm font-semibold text-neutral-200 hover:bg-white/[0.05] disabled:opacity-60">Cancel</button>
        <button type="button" onClick={submit} disabled={submitting} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60">
          {submitting && <Loader2 size={14} className="animate-spin" />} Open ticket
        </button>
      </div>
    </section>
  );
}
