'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowRight } from 'lucide-react';
import { api } from '@/lib/portal-api';

export default function AdminLoginPage() {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'submitting' | 'error'>('idle');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState('submitting');
    const fd = new FormData(e.currentTarget);
    const res = await api('/admin/auth/login', { method: 'POST', body: JSON.stringify({ email: fd.get('email'), password: fd.get('password') }) });
    if (res.ok) router.replace('/admin');
    else setState('error');
  }

  return (
    <main className="grid min-h-screen place-items-center bg-base px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-btn bg-brand-gradient text-sm font-black text-white">iX</span>
          <span className="text-lg font-extrabold tracking-tight text-white">Innovatix <span className="text-primary-light">Delivery OS</span></span>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-card">
          <h1 className="text-lg font-bold text-white">Staff sign in</h1>
          <p className="mt-1 text-sm text-neutral-400">Delivery workspace — Innovatix staff only.</p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <label className="block"><span className="mb-1.5 block text-sm font-medium text-neutral-200">Email</span>
              <input name="email" type="email" required autoComplete="email" className="w-full rounded-lg border border-line-strong bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="you@innovatixmarketing.com" /></label>
            <label className="block"><span className="mb-1.5 block text-sm font-medium text-neutral-200">Password</span>
              <input name="password" type="password" required autoComplete="current-password" className="w-full rounded-lg border border-line-strong bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="••••••••" /></label>
            {state === 'error' && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">Invalid email or password.</p>}
            <button type="submit" disabled={state === 'submitting'} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 font-semibold text-white shadow-cta transition-colors hover:bg-primary-dark disabled:opacity-60">
              {state === 'submitting' ? <><Loader2 size={18} className="animate-spin" /> Signing in…</> : <>Sign in <ArrowRight size={18} /></>}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
