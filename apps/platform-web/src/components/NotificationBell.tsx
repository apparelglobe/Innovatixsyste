'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import { api, apiJson } from '@/lib/portal-api';
import { fmtDateTime } from '@/lib/fmt';

type Notif = { id: string; type: string; title: string; body: string | null; linkPath: string | null; read: boolean; createdAt: string };

/** base = '/portal' (client) or '/admin' (staff). Polls every 30s. */
export function NotificationBell({ base }: { base: '/portal' | '/admin' }) {
  const router = useRouter();
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const r = await apiJson<{ unread: number; notifications: Notif[] }>(`${base}/notifications`);
    if (r.status === 200) { setItems(r.body.notifications || []); setUnread(r.body.unread || 0); }
  }, [base]);

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('click', onDoc);
    return () => { clearInterval(t); document.removeEventListener('click', onDoc); };
  }, [load]);

  async function openNotif(n: Notif) {
    if (!n.read) { await api(`${base}/notifications/${n.id}/read`, { method: 'POST' }); }
    setOpen(false);
    await load();
    if (n.linkPath) router.push(n.linkPath);
  }
  async function markAll() { await api(`${base}/notifications/read-all`, { method: 'POST' }); await load(); }

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((v) => !v)} className="relative grid h-9 w-9 place-items-center rounded-lg text-neutral-300 hover:bg-white/[0.06]" aria-label="Notifications">
        <Bell size={18} />
        {unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-line bg-elevated shadow-pop">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <span className="text-sm font-bold text-white">Notifications</span>
            {unread > 0 && <button onClick={markAll} className="text-xs font-semibold text-primary-light hover:underline">Mark all read</button>}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? <p className="p-4 text-sm text-neutral-500">No notifications.</p> : items.map((n) => (
              <button key={n.id} onClick={() => openNotif(n)} className={`flex w-full gap-2.5 border-b border-line/60 px-4 py-3 text-left transition hover:bg-white/[0.03] ${n.read ? '' : 'bg-primary/[0.04]'}`}>
                <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${n.read ? 'bg-transparent' : 'bg-primary-light'}`} />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-neutral-100">{n.title}</span>
                  {n.body && <span className="block truncate text-xs text-neutral-500">{n.body}</span>}
                  <span className="block text-[11px] text-neutral-600">{fmtDateTime(n.createdAt)}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
