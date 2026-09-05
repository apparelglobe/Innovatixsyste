'use client';

import { useEffect, useState } from 'react';
import { Loader2, Send, Check, CheckCheck } from 'lucide-react';
import { usePortal } from '@/lib/usePortal';
import { PortalShell } from '@/components/PortalShell';
import { api } from '@/lib/portal-api';
import { fmtDateTime } from '@/lib/fmt';

export default function MessagesPage() {
  const { me, project, userName, loading, reload, canBilling } = usePortal();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  // Mark the team's messages as read whenever this thread is opened / refreshed.
  const hasTeamMsg = !!project?.messages.some((m) => m.authorType === 'TEAM');
  useEffect(() => {
    if (hasTeamMsg) void api('/portal/messages/read', { method: 'POST' });
  }, [hasTeamMsg, project?.messages.length]);

  if (loading || !me) return <div className="grid min-h-screen place-items-center bg-base text-neutral-400"><Loader2 className="animate-spin" /></div>;

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    const res = await api('/portal/messages', { method: 'POST', body: JSON.stringify({ body }) });
    if (res.ok) { setText(''); await reload(); }
    setSending(false);
  }

  return (
    <PortalShell orgName={me.org.name} userName={userName} active="messages" billingAllowed={canBilling}>
      <div className="mx-auto flex h-[calc(100dvh_-_7rem_-_var(--portal-bottom-nav-h)_-_env(safe-area-inset-bottom))] max-w-2xl flex-col md:h-[calc(100vh-8rem)]">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">Messages</h1>
          <p className="mt-1 text-sm text-neutral-500">Direct line to your delivery team.</p>
        </div>

        <div className="mt-6 flex-1 space-y-4 overflow-y-auto rounded-2xl border border-line bg-surface p-5">
          {project && project.messages.length > 0 ? project.messages.map((m) => {
            const mine = m.authorType === 'CLIENT';
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${mine ? 'bg-primary text-white' : 'border border-line bg-base text-neutral-200'}`}>
                  <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide opacity-70">{mine ? 'You' : 'Innovatix team'}</div>
                  <div className="leading-relaxed">{m.body}</div>
                  <div className="mt-1 flex items-center gap-1 text-[10px] opacity-60">
                    {fmtDateTime(m.createdAt)}
                    {mine && ((m as { readByTeamAt?: string | null }).readByTeamAt
                      ? <CheckCheck size={12} className="opacity-90" aria-label="Read by team" />
                      : <Check size={12} aria-label="Sent" />)}
                  </div>
                </div>
              </div>
            );
          }) : <p className="text-center text-sm text-neutral-500">No messages yet — say hello.</p>}
        </div>

        <form onSubmit={send} className="mt-4 flex items-end gap-2">
          <textarea
            value={text} onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(e); } }}
            rows={2} placeholder="Write a message…"
            className="flex-1 resize-none rounded-lg border border-line-strong bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button type="submit" disabled={sending || !text.trim()}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-4 font-semibold text-white hover:bg-primary-dark disabled:opacity-60">
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Send
          </button>
        </form>
      </div>
    </PortalShell>
  );
}
