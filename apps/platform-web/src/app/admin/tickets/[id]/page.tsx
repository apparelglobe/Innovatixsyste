'use client';

/**
 * Slice 4 — staff ticket detail. Full conversation incl. internal notes (badged). Client-visible reply +
 * a visually UNMISTAKABLE internal-note composer + status control (expectedStatus compare-and-swap). Reply/
 * note/status are gated by staffCan; each reply/note submit sends a fresh Idempotency-Key. A stale status
 * change (409) reloads and surfaces the current status.
 */
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, ArrowLeft, LifeBuoy, Lock } from 'lucide-react';
import { AdminShell } from '@/components/AdminShell';
import { useStaff, staffCan } from '@/lib/useStaff';
import { api, apiJson } from '@/lib/portal-api';
import { Timestamp } from '@/components/Timestamp';
import { TONE_CLASS } from '@/lib/proposal-stage';
import { TICKET_STATUS_LABEL, TICKET_STATUS_TONE, TICKET_CATEGORY_LABEL, type TicketStatus, type TicketCategory } from '@/lib/tickets-ui';

type Msg = { id: string; authorType: 'CLIENT' | 'TEAM'; authorId: string | null; authorName: string | null; internal: boolean; body: string; createdAt: string };
type Detail = { id: string; number: string; subject: string; category: TicketCategory; status: TicketStatus; clientOrg: { id: string; name: string }; project: { id: string; name: string } | null; createdByName: string | null; createdAt: string; lastMessageAt: string; closedAt: string | null; messages: Msg[] };

const TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  OPEN: ['IN_PROGRESS', 'WAITING_ON_CLIENT', 'RESOLVED', 'CLOSED'],
  IN_PROGRESS: ['OPEN', 'WAITING_ON_CLIENT', 'RESOLVED', 'CLOSED'],
  WAITING_ON_CLIENT: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  RESOLVED: ['IN_PROGRESS', 'CLOSED'],
  CLOSED: ['OPEN', 'IN_PROGRESS'],
};
const freshKey = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.round(Math.random() * 1e9)}`);

export default function AdminTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { me, name } = useStaff();
  const [t, setT] = useState<Detail | null | undefined>(undefined);
  const [reply, setReply] = useState(''); const [replyKey, setReplyKey] = useState(freshKey);
  const [note, setNote] = useState(''); const [noteKey, setNoteKey] = useState(freshKey);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await apiJson<{ ticket: Detail }>(`/admin/tickets/${id}`);
    setT(r.status === 200 ? r.body.ticket : null);
  }, [id]);
  useEffect(() => { if (me) load(); }, [me, load]);

  async function sendReply() {
    if (!reply.trim()) return;
    setErr(null); setBusy('reply');
    const r = await api(`/admin/tickets/${id}/replies`, { method: 'POST', headers: { 'idempotency-key': replyKey }, body: JSON.stringify({ body: reply.trim() }) });
    setBusy(null);
    if (r.status === 201 || r.status === 200) { setReply(''); setReplyKey(freshKey()); await load(); return; }
    if (r.status === 409) { const j = await r.json().catch(() => ({})); setErr(j.error === 'ticket_not_repliable' ? 'Reopen this ticket before sending a client reply.' : 'This reply was already sent.'); await load(); return; }
    setErr('Could not send the reply.');
  }
  async function addNote() {
    if (!note.trim()) return;
    setErr(null); setBusy('note');
    const r = await api(`/admin/tickets/${id}/notes`, { method: 'POST', headers: { 'idempotency-key': noteKey }, body: JSON.stringify({ body: note.trim() }) });
    setBusy(null);
    if (r.status === 201 || r.status === 200) { setNote(''); setNoteKey(freshKey()); await load(); return; }
    setErr('Could not add the internal note.');
  }
  async function changeStatus(target: TicketStatus, expected: TicketStatus) {
    setErr(null); setBusy(`status:${target}`);
    const r = await api(`/admin/tickets/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: target, expectedStatus: expected }) });
    setBusy(null);
    if (r.status === 200) { await load(); return; }
    if (r.status === 409) { setErr('Ticket status changed since you loaded it — reloaded.'); await load(); return; }
    setErr('Could not change status.');
  }

  const canReply = staffCan(me?.role, 'ticket:reply');
  const canNote = staffCan(me?.role, 'ticket:note');
  const canStatus = staffCan(me?.role, 'ticket:status');

  return (
    <AdminShell staffName={name} role={me?.role ?? ''} active="tickets">
      <div className="mx-auto max-w-3xl">
        <a href="/admin/tickets" className="inline-flex items-center gap-1.5 text-sm text-neutral-400 transition hover:text-white"><ArrowLeft size={14} /> Support queue</a>
        {t === undefined || !me ? (
          <div className="grid place-items-center py-24 text-neutral-400"><Loader2 className="animate-spin" /></div>
        ) : t === null ? (
          <div className="mt-4 rounded-2xl border border-line bg-surface p-6 text-neutral-400">Ticket not found.</div>
        ) : (
          <>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${TONE_CLASS[TICKET_STATUS_TONE[t.status]]}`}>{TICKET_STATUS_LABEL[t.status]}</span>
              <span className="text-xs text-neutral-500">{t.number}</span>
            </div>
            <h1 className="mt-2 flex items-center gap-2 text-xl font-extrabold tracking-tight text-white"><LifeBuoy size={18} className="text-primary-light" /> {t.subject}</h1>
            <p className="mt-1 text-sm text-neutral-500">{t.clientOrg.name} · {TICKET_CATEGORY_LABEL[t.category]}{t.project ? ` · ${t.project.name}` : ''} · opened by {t.createdByName ?? 'client'} <Timestamp value={t.createdAt} /></p>

            {canStatus && (
              <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface p-3">
                <span className="text-xs font-semibold text-neutral-400">Set status:</span>
                {TRANSITIONS[t.status].map((s) => (
                  <button key={s} disabled={busy === `status:${s}`} onClick={() => changeStatus(s, t.status)}
                    className="inline-flex items-center gap-1 rounded-lg border border-line-strong px-2.5 py-1 text-xs font-semibold text-neutral-200 hover:bg-white/[0.05] disabled:opacity-60">
                    {busy === `status:${s}` && <Loader2 size={12} className="animate-spin" />} {TICKET_STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-5 space-y-3">
              {t.messages.map((m) => (
                <div key={m.id} className={`rounded-2xl border p-4 ${m.internal ? 'border-amber-500/40 bg-amber-500/[0.06]' : m.authorType === 'TEAM' ? 'border-primary/25 bg-primary/[0.05]' : 'border-line bg-surface'}`}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                    <span className="flex items-center gap-1.5 font-semibold text-neutral-200">
                      {m.internal && <span className="inline-flex items-center gap-1 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300"><Lock size={10} /> Internal</span>}
                      {m.authorName ?? (m.authorType === 'TEAM' ? 'Team' : 'Client')} <span className="font-normal text-neutral-500">· {m.authorType === 'TEAM' ? 'staff' : 'client'}</span>
                    </span>
                    <span className="text-neutral-500"><Timestamp value={m.createdAt} /></span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-200">{m.body}</p>
                </div>
              ))}
            </div>

            {err && <p className="mt-4 text-sm text-red-400">{err}</p>}

            {(canReply || canNote) && (
              <div className="mt-5 grid gap-4">
                {canReply && (
                  <div className="rounded-2xl border border-primary/30 bg-primary/[0.04] p-4">
                    <div className="mb-1.5 text-xs font-bold uppercase tracking-wide text-primary-light">Reply to client</div>
                    <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={3} maxLength={8000} placeholder="This message is sent to the client."
                      className="w-full resize-none rounded-lg border border-line bg-base px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-primary focus:outline-none" />
                    <div className="mt-2 flex justify-end">
                      <button onClick={sendReply} disabled={busy === 'reply' || !reply.trim()} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60">
                        {busy === 'reply' && <Loader2 size={14} className="animate-spin" />} Send to client
                      </button>
                    </div>
                  </div>
                )}
                {canNote && (
                  <div className="rounded-2xl border border-amber-500/40 bg-amber-500/[0.05] p-4">
                    <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-amber-300"><Lock size={12} /> Internal note — staff only, never sent to the client</div>
                    <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={8000} placeholder="Visible to your team only."
                      className="w-full resize-none rounded-lg border border-amber-500/30 bg-base px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-amber-400 focus:outline-none" />
                    <div className="mt-2 flex justify-end">
                      <button onClick={addNote} disabled={busy === 'note' || !note.trim()} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/50 bg-amber-500/10 px-3.5 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-500/20 disabled:opacity-60">
                        {busy === 'note' && <Loader2 size={14} className="animate-spin" />} Add internal note
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </AdminShell>
  );
}
