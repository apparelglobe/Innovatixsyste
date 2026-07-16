/**
 * Product-UI mockups of the Innovatix connected client portal — the real
 * capability described across the site. These are HTML/CSS illustrations with
 * neutral demo data (not customer metrics), used as hero + section visuals.
 */
import {
  LayoutGrid, Flag, CheckSquare, FileText, Files, Receipt, Users, Settings,
  Bell, CircleDot, CheckCircle2,
} from 'lucide-react';

const NAV = [
  { icon: <LayoutGrid size={13} />, label: 'Overview', active: true },
  { icon: <Flag size={13} />, label: 'Milestones' },
  { icon: <CheckSquare size={13} />, label: 'Tasks' },
  { icon: <FileText size={13} />, label: 'Reports' },
  { icon: <Files size={13} />, label: 'Files' },
  { icon: <Receipt size={13} />, label: 'Invoices' },
  { icon: <Users size={13} />, label: 'Team' },
  { icon: <Settings size={13} />, label: 'Settings' },
];

function Stat({ value, label, sub }: { value: string; label: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5">
      <div className="text-lg font-bold text-white">{value}</div>
      <div className="text-[10px] leading-tight text-neutral-400">{label}</div>
      {sub && <div className="text-[9px] text-neutral-500">{sub}</div>}
    </div>
  );
}

/** Hero visual — "Project Alpha" delivery dashboard (dark). */
export function HeroProjectMockup() {
  const milestones = [
    { name: 'Discovery & Planning', when: 'Feb 10', state: 'done' },
    { name: 'System Architecture', when: 'Feb 24', state: 'done' },
    { name: 'Development', when: 'Mar 10', state: 'active' },
    { name: 'Testing & QA', when: 'Apr 14', state: 'todo' },
    { name: 'Deployment', when: 'May 24', state: 'todo' },
  ];
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-elevated shadow-pop">
      <div className="flex">
        {/* sidebar */}
        <div className="hidden w-32 shrink-0 border-r border-white/10 bg-white/[0.02] p-3 sm:block">
          <div className="mb-3 flex items-center gap-1.5 px-1">
            <span className="grid h-5 w-5 place-items-center rounded bg-brand-gradient text-[9px] font-black text-white">iX</span>
            <span className="text-[10px] font-bold text-white">Portal</span>
          </div>
          <nav className="space-y-0.5">
            {NAV.map((n) => (
              <div key={n.label} className={`flex items-center gap-1.5 rounded px-1.5 py-1 text-[10px] ${n.active ? 'bg-primary/15 text-primary-light' : 'text-neutral-400'}`}>
                {n.icon} {n.label}
              </div>
            ))}
          </nav>
        </div>
        {/* main */}
        <div className="min-w-0 flex-1 p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-white">Project Alpha</h4>
                <span className="rounded-full bg-amber-400/15 px-1.5 py-0.5 text-[9px] font-semibold text-amber-300">In Progress</span>
              </div>
              <p className="text-[10px] text-neutral-500">Operations platform build</p>
            </div>
            <div className="text-right text-[9px] text-neutral-500">Due date<br /><span className="text-neutral-300">May 24</span></div>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2">
            <Stat value="72%" label="Progress" />
            <Stat value="8/12" label="Milestones" />
            <Stat value="24" label="Tasks" />
            <Stat value="3" label="Issues" />
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
              <div className="mb-2 text-[10px] font-semibold text-neutral-300">Milestone timeline</div>
              <ul className="space-y-1.5">
                {milestones.map((m) => (
                  <li key={m.name} className="flex items-center gap-1.5 text-[10px]">
                    {m.state === 'done' ? <CheckCircle2 size={11} className="text-emerald-400" />
                      : m.state === 'active' ? <CircleDot size={11} className="text-primary-light" />
                      : <CircleDot size={11} className="text-neutral-600" />}
                    <span className={m.state === 'todo' ? 'text-neutral-500' : 'text-neutral-300'}>{m.name}</span>
                    <span className="ml-auto text-neutral-600">{m.when}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
              <div className="mb-2 text-[10px] font-semibold text-neutral-300">Activity feed</div>
              <ul className="space-y-2">
                {['Daily report generated', 'Milestone approved', 'Design system updated'].map((a, i) => (
                  <li key={a} className="flex items-start gap-1.5 text-[10px]">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-light" />
                    <span className="text-neutral-300">{a}<br /><span className="text-[9px] text-neutral-600">{['Today', 'Yesterday', 'Mar 8'][i]}</span></span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Differentiator visual — client portal "Overview" (light card). */
export function PortalOverviewMockup() {
  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xl">
      <div className="flex">
        <div className="hidden w-32 shrink-0 border-r border-neutral-100 bg-neutral-50 p-3 sm:block">
          <div className="mb-3 flex items-center gap-1.5 px-1">
            <span className="grid h-5 w-5 place-items-center rounded bg-brand-gradient text-[9px] font-black text-white">iX</span>
            <span className="text-[10px] font-bold text-neutral-900">Portal</span>
          </div>
          <nav className="space-y-0.5">
            {NAV.map((n) => (
              <div key={n.label} className={`flex items-center gap-1.5 rounded px-1.5 py-1 text-[10px] ${n.active ? 'bg-primary/10 text-primary' : 'text-neutral-500'}`}>
                {n.icon} {n.label}
              </div>
            ))}
          </nav>
        </div>
        <div className="min-w-0 flex-1 p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-neutral-900">Overview</h4>
            <div className="flex items-center gap-2 text-neutral-400">
              <Bell size={13} />
              <span className="grid h-5 w-5 place-items-center rounded-full bg-primary text-[9px] font-bold text-white">JD</span>
            </div>
          </div>

          <div className="mt-3 rounded-lg border border-neutral-200 p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-neutral-900">Project Alpha</div>
                <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700">In Progress</span>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-neutral-900">72%</div>
                <div className="text-[9px] text-neutral-400">Complete</div>
              </div>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
              <div className="h-full w-[72%] rounded-full bg-brand-gradient" />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-neutral-200 p-2.5">
              <div className="text-[10px] text-neutral-400">Milestones</div>
              <div className="text-sm font-bold text-neutral-900">8 / 12</div>
            </div>
            <div className="rounded-lg border border-neutral-200 p-2.5">
              <div className="text-[10px] text-neutral-400">Tasks</div>
              <div className="text-sm font-bold text-neutral-900">24</div>
            </div>
          </div>

          <div className="mt-3 rounded-lg border border-neutral-200 p-2.5">
            <div className="mb-2 text-[10px] font-semibold text-neutral-700">Recent activity</div>
            <ul className="space-y-1.5">
              {[['Daily report generated', 'Today'], ['Milestone approved', 'Yesterday'], ['New file uploaded', 'Mar 9']].map(([a, t]) => (
                <li key={a} className="flex items-center gap-1.5 text-[10px]">
                  <CheckCircle2 size={11} className="text-emerald-500" />
                  <span className="text-neutral-700">{a}</span>
                  <span className="ml-auto text-neutral-400">{t}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <div className="flex -space-x-1.5">
              {['bg-primary', 'bg-emerald-500', 'bg-amber-500'].map((c) => (
                <span key={c} className={`h-5 w-5 rounded-full ${c} ring-2 ring-white`} />
              ))}
            </div>
            <span className="text-[10px] text-neutral-500">Project team · +3</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Small dark dashboard thumbnail for case-study cards. */
export function MiniDashboard({ variant = 'dark' }: { variant?: 'dark' | 'light' }) {
  const dark = variant === 'dark';
  return (
    <div className={`h-full w-full overflow-hidden rounded-lg border ${dark ? 'border-white/10 bg-elevated' : 'border-neutral-200 bg-white'}`}>
      <div className="flex h-full">
        <div className={`w-10 shrink-0 border-r p-1.5 ${dark ? 'border-white/10 bg-white/[0.02]' : 'border-neutral-100 bg-neutral-50'}`}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`mb-1 h-1.5 rounded ${i === 0 ? 'bg-primary/60' : dark ? 'bg-white/10' : 'bg-neutral-200'}`} />
          ))}
        </div>
        <div className="flex-1 p-2">
          <div className="grid grid-cols-3 gap-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={`rounded p-1 ${dark ? 'bg-white/[0.04]' : 'bg-neutral-100'}`}>
                <div className={`h-1 w-4 rounded ${dark ? 'bg-white/20' : 'bg-neutral-300'}`} />
                <div className="mt-1 h-2 w-6 rounded bg-primary/50" />
              </div>
            ))}
          </div>
          <div className={`mt-1.5 rounded p-1.5 ${dark ? 'bg-white/[0.03]' : 'bg-neutral-50'}`}>
            <div className="flex items-end gap-0.5">
              {[6, 10, 7, 12, 9, 14, 11].map((h, i) => (
                <div key={i} className="w-1.5 rounded-sm bg-primary/60" style={{ height: h }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
