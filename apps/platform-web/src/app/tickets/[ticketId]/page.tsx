'use client';

/**
 * Slice 3 — ticket detail + reply. Org-scoped (foreign/missing → the API 404s → "not found" state).
 * The reply form sends a per-submit Idempotency-Key (regenerated after each successful send) so a
 * double-click can never post the same reply twice; the server dedups on it.
 */
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, ArrowLeft, LifeBuoy } from 'lucide-react';
import { PortalShell } from '@/components/PortalShell';
import { api, apiJson, apiUpload, API_BASE } from '@/lib/portal-api';
import { Timestamp } from '@/components/Timestamp';
import { useRelationship } from '@/lib/useRelationship';
import { TONE_CLASS } from '@/lib/proposal-stage';
import { TicketAttachmentList, AttachmentPicker } from '@/components/TicketAttachments';
import { TICKET_STATUS_LABEL, TICKET_STATUS_TONE, TICKET_CATEGORY_LABEL, type TicketDetail } from '@/lib/tickets-ui';

const freshKey = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.round(Math.random() * 1e9)}`);

export default function TicketDetailPage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const { me, projects, userName, canBilling, loading } = useRelationship();
  const [ticket, setTicket] = useState<TicketDetail | null | undefined>(undefined); // undefined=loading, null=404
  const [reply, setReply] = useState('');
  const [replyKey, setReplyKey] = useState(freshKey);
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await apiJson<{ ticket: TicketDetail }>(`/portal/tickets/${ticketId}`);
    setTicket(r.status === 200 ? r.body.ticket : null);
  }, [ticketId]);
  useEffect(() => { load(); }, [load]);

  async function send() {
    if (!reply.trim()) return;
    setErr(null); setSending(true);
    const res = file
      ? await apiUpload(`/portal/tickets/${ticketId}/replies`, (() => { const fd = new FormData(); fd.append('body', reply.trim()); fd.append('file', file); return fd; })(), { 'idempotency-key': replyKey })
      : await api(`/portal/tickets/${ticketId}/replies`, { method: 'POST', headers: { 'idempotency-key': replyKey }, body: JSON.stringify({ body: reply.trim() }) });
    setSending(false);
    if (res.status === 201 || res.status === 200) { setReply(''); setFile(null); setReplyKey(freshKey()); await load(); return; }
    if (res.status === 413) { setErr('That file is too large (max 25 MB).'); return; }
    if (res.status === 400) { setErr('That file type isn’t supported.'); return; }
    setErr(res.status === 409 ? 'This reply was already sent.' : 'Could not send your reply. Please try again.');
  }

  const closed = ticket?.status === 'CLOSED';

  return (
    <PortalShell orgName={me?.org.name ?? ''} userName={userName} active="tickets" billingAllowed={canBilling} projects={projects}>
      <div className="mx-auto max-w-3xl">
        <a href="/tickets" className="inline-flex items-center gap-1.5 text-sm text-neutral-400 transition hover:text-white"><ArrowLeft size={14} /> Support</a>
        {loading || !me || ticket === undefined ? (
          <div className="grid place-items-center py-24 text-neutral-400"><Loader2 className="animate-spin" /></div>
        ) : ticket === null ? (
          <div className="mt-4 rounded-2xl border border-line bg-surface p-6 text-neutral-400">This ticket could not be found in your account.</div>
        ) : (
          <>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${TONE_CLASS[TICKET_STATUS_TONE[ticket.status]]}`}>{TICKET_STATUS_LABEL[ticket.status]}</span>
              <span className="text-xs text-neutral-500">{ticket.number}</span>
            </div>
            <h1 className="mt-2 flex items-center gap-2 text-xl font-extrabold tracking-tight text-white"><LifeBuoy size={18} className="text-primary-light" /> {ticket.subject}</h1>
            <p className="mt-1 text-sm text-neutral-500">{TICKET_CATEGORY_LABEL[ticket.category]} · opened <Timestamp value={ticket.createdAt} /></p>

            <div className="mt-5 space-y-3">
              {ticket.messages.map((m) => (
                <div key={m.id} className={`rounded-2xl border p-4 ${m.authorType === 'CLIENT' ? 'border-primary/25 bg-primary/[0.05]' : 'border-line bg-surface'}`}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-neutral-200">{m.authorName ?? (m.authorType === 'TEAM' ? 'Innovatix team' : 'Client')}</span>
                    <span className="text-neutral-500"><Timestamp value={m.createdAt} /></span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-200">{m.body}</p>
                  <TicketAttachmentList attachments={m.attachments} downloadHref={(a) => `${API_BASE}/portal/tickets/${ticketId}/attachments/${a.id}/download`} />
                </div>
              ))}
            </div>

            {closed ? (
              <p className="mt-5 rounded-xl border border-line bg-surface p-4 text-sm text-neutral-400">This ticket is closed. Open a new ticket if you need more help.</p>
            ) : (
              <div className="mt-5 rounded-2xl border border-line bg-surface p-4">
                <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={3} maxLength={8000}
                  placeholder="Write a reply to the team" className="w-full resize-none rounded-lg border border-line bg-base px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-primary focus:outline-none" />
                <AttachmentPicker file={file} onPick={setFile} />
                {err && <p className="mt-2 text-sm text-red-400">{err}</p>}
                <div className="mt-2 flex justify-end">
                  <button type="button" onClick={send} disabled={sending || !reply.trim()} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60">
                    {sending && <Loader2 size={14} className="animate-spin" />} Send reply
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </PortalShell>
  );
}
