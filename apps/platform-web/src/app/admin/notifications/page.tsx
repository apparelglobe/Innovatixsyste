'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Bell, CheckCheck } from 'lucide-react';
import { AdminShell } from '@/components/AdminShell';
import { useStaff } from '@/lib/useStaff';
import { api, apiJson } from '@/lib/portal-api';
import { fmtDateTime } from '@/lib/fmt';

type Notif = { id: string; type: string; title: string; body: string | null; linkPath: string | null; read: boolean; createdAt: string };

export default function AdminNotificationsPage() {
  const { me, name } = useStaff();
  const router = useRouter();
  const [items, setItems] = useState<Notif[] | null>(null);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    const r = await apiJson<{ unread: number; notifications: Notif[] }>('/admin/notifications');
    if (r.status === 200) {
      setItems(r.body.notifications || []);
      setUnread(r.body.unread || 0);
    }
  }, []);
  useEffect(() => {
    if (me) load();
  }, [me, load]);

  async function open(n: Notif) {
    if (!n.read) await api(`/admin/notifications/${n.id}/read`, { method: 'POST' });
    await load();
    if (n.linkPath) router.push(n.linkPath);
  }
  async function markAll() {
    await api('/admin/notifications/read-all', { method: 'POST' });
    await load();
  }

  if (!me || items === null) {
    return <div className="grid min-h-screen place-items-center bg-base text-neutral-400"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <AdminShell staffName={name} role={me.role} active="notifications">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white">Notifications</h1>
            <p className="mt-1 text-sm text-neutral-500">{unread > 0 ? `${unread} unread` : 'You’re all caught up.'}</p>
          </div>
          {unread > 0 && (
            <button onClick={markAll} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm font-semibold text-primary-light transition hover:border-primary/40">
              <CheckCheck size={16} /> Mark all read
            </button>
          )}
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-surface">
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-12 text-neutral-500">
              <Bell size={24} className="opacity-40" />
              <p className="text-sm">No notifications yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-line">
              {items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => open(n)}
                  className={`flex w-full items-start gap-3 p-4 text-left transition hover:bg-white/[0.03] ${n.read ? '' : 'bg-primary/[0.04]'}`}
                >
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? 'bg-transparent' : 'bg-primary'}`} />
                  <div className="min-w-0 flex-1">
                    <div className={`text-sm ${n.read ? 'font-medium text-neutral-300' : 'font-semibold text-white'}`}>{n.title}</div>
                    {n.body ? <div className="mt-0.5 text-xs leading-relaxed text-neutral-500">{n.body}</div> : null}
                    <div className="mt-1 text-[11px] uppercase tracking-wide text-neutral-600">{fmtDateTime(n.createdAt)}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
