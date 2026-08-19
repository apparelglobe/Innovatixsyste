'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from './Logo';
import {
  Home, FolderKanban, Receipt, MessageSquare, LogOut, Settings, ChevronDown,
} from 'lucide-react';
import { api } from '@/lib/portal-api';
import { NotificationBell } from './NotificationBell';

// S5.1 — minimal nav (Canon §6): Home · Projects · Billing · Messages.
// Milestones / Reports / Files / Team fold under Projects; Settings moves to the account menu.
// Keys are kept stable (`overview`, `invoices`) so existing pages resolve their highlight unchanged.
const NAV = [
  { key: 'overview', icon: <Home size={16} />, label: 'Home', href: '/' },
  { key: 'projects', icon: <FolderKanban size={16} />, label: 'Projects', href: '/projects' },
  { key: 'invoices', icon: <Receipt size={16} />, label: 'Billing', href: '/invoices' },
  { key: 'messages', icon: <MessageSquare size={16} />, label: 'Messages', href: '/messages' },
];

export function PortalShell({
  orgName, userName, active, children,
}: { orgName: string; userName: string; active: string; children: React.ReactNode }) {
  const router = useRouter();
  const initials = userName.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase() || 'U';

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  async function logout() {
    await api('/portal/auth/logout', { method: 'POST' });
    router.replace('/clientportal');
  }

  return (
    <div className="flex min-h-[100dvh] bg-base [--portal-bottom-nav-h:3.25rem]">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-line bg-surface md:flex">
        <div className="flex items-center px-5 py-5">
          <Logo className="h-7 w-auto" />
        </div>
        <nav className="flex-1 space-y-0.5 px-3 py-2">
          {NAV.map((n) => (
            <a key={n.key} href={n.href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${active === n.key ? 'bg-primary/15 font-semibold text-primary-light' : 'text-neutral-400 hover:bg-white/[0.04] hover:text-white'}`}>
              {n.icon} {n.label}
            </a>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-line bg-base/80 px-6 backdrop-blur">
          <div className="text-sm font-semibold text-neutral-300">{orgName}</div>
          <div className="flex items-center gap-3">
            <NotificationBell base="/portal" />
            <div ref={menuRef} className="relative">
              <button onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-1.5 transition hover:bg-white/[0.06]"
                aria-haspopup="menu" aria-expanded={menuOpen} aria-label="Account menu">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-xs font-bold text-white">{initials}</span>
                <span className="hidden text-sm text-neutral-400 sm:block">{userName}</span>
                <ChevronDown size={14} className="hidden text-neutral-500 sm:block" />
              </button>
              {menuOpen && (
                <div role="menu" className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-line bg-elevated shadow-pop">
                  <div className="border-b border-line px-4 py-3">
                    <div className="truncate text-sm font-semibold text-white">{userName}</div>
                    <div className="truncate text-xs text-neutral-500">{orgName}</div>
                  </div>
                  <a href="/settings" role="menuitem"
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-neutral-300 transition hover:bg-white/[0.04] hover:text-white">
                    <Settings size={16} /> Account settings
                  </a>
                  <button onClick={logout} role="menuitem"
                    className="flex w-full items-center gap-2.5 border-t border-line/60 px-4 py-2.5 text-left text-sm text-neutral-300 transition hover:bg-white/[0.04] hover:text-white">
                    <LogOut size={16} /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        {/* Bottom padding on mobile = the fixed bottom-nav's real height + safe-area inset + 1rem gap,
            so normal-flow pages clear the bar without an arbitrary magic number. Desktop keeps pb-8. */}
        <main className="flex-1 px-6 pt-8 pb-[calc(var(--portal-bottom-nav-h)_+_env(safe-area-inset-bottom)_+_1rem)] md:pb-8">{children}</main>
      </div>

      {/* Mobile bottom nav — the sidebar is desktop-only, so this is the sole nav (and Sign out is in the account menu above) on phones. */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {NAV.map((n) => (
          <a key={n.key} href={n.href}
            className={`flex h-[var(--portal-bottom-nav-h)] flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition ${active === n.key ? 'text-primary-light' : 'text-neutral-500 hover:text-neutral-300'}`}>
            {n.icon} {n.label}
          </a>
        ))}
      </nav>
    </div>
  );
}
