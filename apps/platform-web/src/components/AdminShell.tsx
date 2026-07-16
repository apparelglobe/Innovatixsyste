'use client';

import { useRouter } from 'next/navigation';
import { FolderKanban, UserPlus, Bell, Settings, LogOut } from 'lucide-react';
import { api } from '@/lib/portal-api';
import { NotificationBell } from './NotificationBell';

const NAV = [
  { key: 'projects', icon: <FolderKanban size={16} />, label: 'Projects', href: '/admin' },
  { key: 'leads', icon: <UserPlus size={16} />, label: 'Leads', href: '/admin/leads' },
  { key: 'notifications', icon: <Bell size={16} />, label: 'Notifications', soon: true },
  { key: 'settings', icon: <Settings size={16} />, label: 'Settings', soon: true },
];

const ROLE_LABEL: Record<string, string> = { ADMIN: 'Admin', DELIVERY_LEAD: 'Delivery Lead', ENGINEER: 'Engineer', VIEWER: 'Viewer' };

export function AdminShell({
  staffName, role, active, children,
}: { staffName: string; role: string; active: string; children: React.ReactNode }) {
  const router = useRouter();
  const initials = staffName.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase() || 'S';
  async function logout() { await api('/admin/auth/logout', { method: 'POST' }); router.replace('/admin/login'); }

  return (
    <div className="flex min-h-screen bg-base">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-line bg-surface md:flex">
        <div className="flex items-center gap-2 px-5 py-5">
          <span className="grid h-8 w-8 place-items-center rounded-btn bg-brand-gradient text-xs font-black text-white">iX</span>
          <div className="leading-tight">
            <div className="text-sm font-extrabold tracking-tight text-white">Innovatix</div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-primary-light">Delivery OS</div>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 px-3 py-2">
          {NAV.map((n) => n.soon ? (
            <div key={n.key} title="Available soon" className="flex cursor-default items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-neutral-500">{n.icon} {n.label}</div>
          ) : (
            <a key={n.key} href={n.href} className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${active === n.key ? 'bg-primary/15 font-semibold text-primary-light' : 'text-neutral-400 hover:bg-white/[0.04] hover:text-white'}`}>{n.icon} {n.label}</a>
          ))}
        </nav>
        <div className="border-t border-line px-3 py-3">
          <button onClick={logout} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-neutral-400 transition hover:bg-white/[0.04] hover:text-white"><LogOut size={16} /> Sign out</button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-line bg-base/80 px-6 backdrop-blur">
          <div className="text-sm font-semibold text-neutral-300">Delivery workspace</div>
          <div className="flex items-center gap-3">
            <NotificationBell base="/admin" />
            <div className="hidden text-right sm:block"><div className="text-sm text-neutral-300">{staffName}</div><div className="text-[10px] uppercase tracking-wide text-primary-light">{ROLE_LABEL[role] ?? role}</div></div>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-xs font-bold text-white">{initials}</span>
          </div>
        </header>
        <main className="flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
