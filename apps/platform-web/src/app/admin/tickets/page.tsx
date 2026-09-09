'use client';

/**
 * Slice 4 — staff support queue. Tenant-wide, filterable, keyset-paginated ("Load more" via nextCursor).
 * CLOSED is excluded unless explicitly selected. Read-only for VIEWER (the whole queue is behind ticket:read).
 */
import { useCallback, useEffect, useState } from 'react';
import { Loader2, LifeBuoy, ArrowUpRight } from 'lucide-react';
import { AdminShell } from '@/components/AdminShell';
import { useStaff } from '@/lib/useStaff';
import { apiJson } from '@/lib/portal-api';
import { Timestamp } from '@/components/Timestamp';
import { TONE_CLASS } from '@/lib/proposal-stage';
import { TICKET_STATUS_LABEL, TICKET_STATUS_TONE, TICKET_CATEGORY_LABEL, type TicketStatus, type TicketCategory } from '@/lib/tickets-ui';

type Row = { id: string; number: string; subject: string; category: TicketCategory; status: TicketStatus; clientOrgId: string; clientOrgName: string; projectId: string | null; lastMessageAt: string; createdAt: string };

const FILTERS: { key: string; label: string; status?: string }[] = [
  { key: 'active', label: 'Active' }, // default: non-CLOSED
  { key: 'OPEN', label: 'Open', status: 'OPEN' },
  { key: 'IN_PROGRESS', label: 'In progress', status: 'IN_PROGRESS' },
  { key: 'WAITING_ON_CLIENT', label: 'Awaiting client', status: 'WAITING_ON_CLIENT' },
  { key: 'RESOLVED', label: 'Resolved', status: 'RESOLVED' },
  { key: 'CLOSED', label: 'Closed', status: 'CLOSED' },
];

export default function AdminTicketsPage() {
  const { me, name } = useStaff();
  const [filter, setFilter] = useState('active');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async (statusKey: string) => {
    setRows(null); setCursor(null);
    const f = FILTERS.find((x) => x.key === statusKey);
    const q = f?.status ? `?status=${f.status}` : '';
    const r = await apiJson<{ tickets: Row[]; nextCursor: string | null }>(`/admin/tickets${q}`);
    if (r.status === 200) { setRows(r.body.tickets); setCursor(r.body.nextCursor); }
    else setRows([]);
  }, []);
  useEffect(() => { if (me) load(filter); }, [me, filter, load]);

  async function more() {
    if (!cursor) return;
    setLoadingMore(true);
    const f = FILTERS.find((x) => x.key === filter);
    const q = `?${f?.status ? `status=${f.status}&` : ''}cursor=${encodeURIComponent(cursor)}`;
    const r = await apiJson<{ tickets: Row[]; nextCursor: string | null }>(`/admin/tickets${q}`);
    if (r.status === 200) { setRows((prev) => [...(prev ?? []), ...r.body.tickets]); setCursor(r.body.nextCursor); }
    setLoadingMore(false);
  }

  if (!me) return <div className="grid min-h-screen place-items-center bg-base text-neutral-400"><Loader2 className="animate-spin" /></div>;

  return (
    <AdminShell staffName={name} role={me.role} active="tickets">
      <div className="mx-auto max-w-5xl">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-white"><LifeBuoy size={20} className="text-primary-light" /> Support queue</h1>
        <p className="mt-1 text-sm text-neutral-500">Client support tickets across all organizations. Closed tickets are hidden unless selected.</p>

        <div className="mt-5 flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${filter === f.key ? 'bg-primary/20 text-primary-light' : 'bg-white/[0.04] text-neutral-400 hover:text-white'}`}>{f.label}</button>
          ))}
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-surface">
          {rows === null ? (
            <div className="grid place-items-center py-16 text-neutral-400"><Loader2 className="animate-spin" /></div>
          ) : rows.length === 0 ? (
            <p className="p-6 text-neutral-400">No tickets in this view.</p>
          ) : (
            <div className="divide-y divide-line">
              {rows.map((t) => (
                <a key={t.id} href={`/admin/tickets/${t.id}`} className="flex flex-wrap items-center gap-3 p-4 transition hover:bg-white/[0.02]">
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${TONE_CLASS[TICKET_STATUS_TONE[t.status]]}`}>{TICKET_STATUS_LABEL[t.status]}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-white">{t.subject}</div>
                    <div className="text-xs text-neutral-500">{t.number} · {t.clientOrgName} · {TICKET_CATEGORY_LABEL[t.category]} · <Timestamp value={t.lastMessageAt} /></div>
                  </div>
                  <ArrowUpRight size={15} className="text-neutral-500" />
                </a>
              ))}
            </div>
          )}
        </div>

        {cursor && (
          <div className="mt-4 grid place-items-center">
            <button onClick={more} disabled={loadingMore} className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-4 py-2 text-sm font-semibold text-neutral-200 hover:bg-white/[0.05] disabled:opacity-60">
              {loadingMore && <Loader2 size={14} className="animate-spin" />} Load more
            </button>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
