'use client';

import type { ReactNode } from 'react';
import { Loader2, ShieldAlert, ShieldCheck, ArrowRight } from 'lucide-react';
import { Logo } from '@/components/Logo';

/** Standalone shell for the public prospect pages (no session — like setup-account). */
export function ProposalShell({ children, width = 'max-w-2xl' }: { children: ReactNode; width?: string }) {
  return (
    <main className="min-h-screen bg-base px-5 py-10">
      <div className={`mx-auto w-full ${width}`}>
        <div className="mb-7 flex items-center justify-center">
          <Logo className="h-8 w-auto" priority />
        </div>
        {children}
        <p className="mt-7 text-center text-xs text-neutral-500">Innovatix Systems · secure link · no account needed</p>
      </div>
    </main>
  );
}

export function ProposalLoading({ label = 'Loading…' }: { label?: string }) {
  return (
    <ProposalShell width="max-w-md">
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-line bg-surface py-10 text-neutral-400">
        <Loader2 size={18} className="animate-spin" /> {label}
      </div>
    </ProposalShell>
  );
}

/** Terminal status card (expired / invalid / already-done). Optional CTA for states that can still move forward. */
export function ProposalTerminal({ tone, title, body, action }: { tone: 'bad' | 'ok'; title: string; body: string; action?: { label: string; href: string } }) {
  const ok = tone === 'ok';
  return (
    <ProposalShell width="max-w-md">
      <div className={`rounded-2xl border p-6 ${ok ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-red-500/30 bg-red-500/10'}`}>
        <div className="flex items-start gap-3">
          <span className={`mt-0.5 shrink-0 ${ok ? 'text-emerald-300' : 'text-red-300'}`}>
            {ok ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
          </span>
          <div>
            <p className={`font-semibold ${ok ? 'text-emerald-100' : 'text-red-100'}`}>{title}</p>
            <p className="mt-1 text-sm text-neutral-300">{body}</p>
            {action && (
              <a href={action.href} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-cta transition-colors hover:bg-primary-dark">
                {action.label} <ArrowRight size={15} />
              </a>
            )}
          </div>
        </div>
      </div>
    </ProposalShell>
  );
}

/** Small progress trail across the three prospect steps. */
export function ProposalSteps({ current }: { current: 'review' | 'agreement' | 'deposit' }) {
  const steps: { key: string; label: string }[] = [
    { key: 'review', label: 'Review' },
    { key: 'agreement', label: 'Sign' },
    { key: 'deposit', label: 'Deposit' },
  ];
  const idx = steps.findIndex((s) => s.key === current);
  return (
    <div className="mb-5 flex items-center justify-center gap-2 text-xs">
      {steps.map((s, i) => (
        <span key={s.key} className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold ${i <= idx ? 'bg-primary/15 text-primary-light' : 'bg-white/5 text-neutral-500'}`}>
            <span className={`grid h-4 w-4 place-items-center rounded-full text-[10px] ${i < idx ? 'bg-primary text-white' : i === idx ? 'bg-primary-light text-white' : 'bg-white/10 text-neutral-400'}`}>{i + 1}</span>
            {s.label}
          </span>
          {i < steps.length - 1 && <span className="text-neutral-600">→</span>}
        </span>
      ))}
    </div>
  );
}
