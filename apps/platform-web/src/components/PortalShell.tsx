'use client';

import { useRouter } from 'next/navigation';
import {
  LayoutGrid, Flag, FileText, Files, Receipt, MessageSquare, Users, Settings, LogOut,
} from 'lucide-react';
import { api } from '@/lib/portal-api';
import { NotificationBell } from './NotificationBell';

const NAV = [
  { key: 'overview', icon: <LayoutGrid size={16} />, label: 'Overview', href: '/' },
  { key: 'milestones', icon: <Flag size={16} />, label: 'Milestones', href: '/milestones' },
  { key: 'reports', icon: <FileText size={16} />, label: 'Reports', href: '/reports' },
  { key: 'files', icon: <Files size={16} />, label: 'Files', href: '/files' },
  { key: 'invoices', icon: <Receipt size={16} />, label: 'Invoices', href: '/invoices' },
  { key: 'messages', icon: <MessageSquare size={16} />, label: 'Messages', href: '/messages' },
  { key: 'team', icon: <Users size={16} />, label: 'Team', href: '/team' },
  { key: 'settings', icon: <Settings size={16} />, label: 'Settings', soon: true },
];

export function PortalShell({
  orgName, userName, active, children,
}: { orgName: string; userName: string; active: string; children: React.ReactNode }) {
  const router = useRouter();
  const initials = userName.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase() || 'U';

  async function logout() {
    await api('/portal/auth/logout', { method: 'POST' });
    router.replace('/login');
  }

  return (
    <div className="flex min-h-screen bg-base">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-line bg-surface md:flex">
        <div className="flex items-center gap-2 px-5 py-5">
          <span className="grid h-8 w-8 place-items-center rounded-btn bg-brand-gradient text-xs font-black text-white">iX</span>
          <span className="text-sm font-extrabold tracking-tight text-white">Innovatix <span className="text-primary-light">Portal</span></span>
        </div>
        <nav className="flex-1 space-y-0.5 px-3 py-2">
          {NAV.map((n) =>
            n.soon ? (
              <div key={n.key} title="Available soon" className="flex cursor-default items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-neutral-500">
                {n.icon} {n.label}
              </div>
            ) : (
              <a key={n.key} href={n.href}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${active === n.key ? 'bg-primary/15 font-semibold text-primary-light' : 'text-neutral-400 hover:bg-white/[0.04] hover:text-white'}`}>
                {n.icon} {n.label}
              </a>
            ),
          )}
        </nav>
        <div className="border-t border-line px-3 py-3">
          <button onClick={logout} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-neutral-400 transition hover:bg-white/[0.04] hover:text-white">
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-line bg-base/80 px-6 backdrop-blur">
          <div className="text-sm font-semibold text-neutral-300">{orgName}</div>
          <div className="flex items-center gap-3">
            <NotificationBell base="/portal" />
            <span className="hidden text-sm text-neutral-400 sm:block">{userName}</span>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-xs font-bold text-white">{initials}</span>
          </div>
        </header>
        <main className="flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
