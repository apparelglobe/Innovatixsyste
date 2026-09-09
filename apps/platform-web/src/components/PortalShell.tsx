'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from './Logo';
import {
  Home, FolderKanban, Receipt, MessageSquare, LifeBuoy, LogOut, Settings, ChevronDown,
} from 'lucide-react';
import { api } from '@/lib/portal-api';
import { NotificationBell } from './NotificationBell';

// S5.1 — minimal nav (Canon §6): Home · Projects · Billing · Messages · Support.
// Milestones / Reports / Files / Team fold under Projects; Settings moves to the account menu.
// Keys are kept stable (`overview`, `invoices`) so existing pages resolve their highlight unchanged.
const NAV = [
  { key: 'overview', icon: <Home size={16} />, label: 'Home', href: '/' },
  { key: 'projects', icon: <FolderKanban size={16} />, label: 'Projects', href: '/projects' },
  { key: 'invoices', icon: <Receipt size={16} />, label: 'Billing', href: '/invoices' },
  { key: 'messages', icon: <MessageSquare size={16} />, label: 'Messages', href: '/messages' },
  { key: 'tickets', icon: <LifeBuoy size={16} />, label: 'Support', href: '/tickets' }, // Slice 3
];

export function PortalShell({
  orgName, userName, active, children, billingAllowed = false, projects = [], currentProjectId,
}: { orgName: string; userName: string; active: string; children: React.ReactNode; billingAllowed?: boolean; projects?: { id: string; name: string; status: string }[]; currentProjectId?: string }) {
  const router = useRouter();
  const initials = userName.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase() || 'U';
  // Slice 1: the project switcher is NAVIGATION ONLY (selecting → /projects/:id), never persistent
  // "current project" state. It is shown only on the relationship Home + project surfaces and hidden on
  // /messages, /billing (invoices), and /settings — where a selected project would mislead (Messages still
  // posts to the legacy project). `currentProjectId` comes from the /projects/:id URL, nothing else.
  const showSwitcher = (active === 'overview' || active === 'projects') && projects.length > 0;
  // Billing is OWNER-only (P3.3). Hiding the nav item is cosmetic only — every billing route is
  // enforced server-side — but it keeps a member from clicking into a screen they can't use.
  const nav = NAV.filter((n) => n.key !== 'invoices' || billingAllowed);

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
          {nav.map((n) => (
            <a key={n.key} href={n.href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${active === n.key ? 'bg-primary/15 font-semibold text-primary-light' : 'text-neutral-400 hover:bg-white/[0.04] hover:text-white'}`}>
              {n.icon} {n.label}
            </a>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-line bg-base/80 px-6 backdrop-blur">
          {showSwitcher
            ? <ProjectSwitcher projects={projects} currentProjectId={currentProjectId} orgName={orgName} />
            : <div className="text-sm font-semibold text-neutral-300">{orgName}</div>}
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
        {nav.map((n) => (
          <a key={n.key} href={n.href}
            className={`flex h-[var(--portal-bottom-nav-h)] flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition ${active === n.key ? 'text-primary-light' : 'text-neutral-500 hover:text-neutral-300'}`}>
            {n.icon} {n.label}
          </a>
        ))}
      </nav>
    </div>
  );
}

/** URL-navigation project switcher (Slice 1). Selecting a project navigates to /projects/:id; the
 *  "Relationship home" entry returns to /. Never sets persistent app state — the highlighted project is
 *  whatever `currentProjectId` (from the /projects/:id URL) says, or none on Home. */
function ProjectSwitcher({ projects, currentProjectId, orgName }: { projects: { id: string; name: string; status: string }[]; currentProjectId?: string; orgName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);
  const current = projects.find((p) => p.id === currentProjectId);
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-neutral-300 transition hover:bg-white/[0.06]"
        aria-haspopup="menu" aria-expanded={open} aria-label="Switch project">
        <FolderKanban size={15} className="text-neutral-500" />
        <span className="max-w-[13rem] truncate">{current ? current.name : orgName}</span>
        <ChevronDown size={13} className="text-neutral-500" />
      </button>
      {open && (
        <div role="menu" className="absolute left-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-line bg-elevated shadow-pop">
          <button role="menuitem" onClick={() => { setOpen(false); router.push('/'); }}
            className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition ${!currentProjectId ? 'font-semibold text-primary-light' : 'text-neutral-300 hover:bg-white/[0.04]'}`}>
            <Home size={15} /> Relationship home
          </button>
          <div className="max-h-72 overflow-y-auto border-t border-line/60 py-1">
            {projects.map((p) => (
              <button key={p.id} role="menuitem" onClick={() => { setOpen(false); router.push(`/projects/${p.id}`); }}
                className={`flex w-full items-center justify-between gap-2 px-4 py-2 text-left text-sm transition ${p.id === currentProjectId ? 'font-semibold text-primary-light' : 'text-neutral-300 hover:bg-white/[0.04]'}`}>
                <span className="truncate">{p.name}</span>
                <span className="shrink-0 text-[10px] uppercase tracking-wide text-neutral-500">{p.status.replace(/_/g, ' ')}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
