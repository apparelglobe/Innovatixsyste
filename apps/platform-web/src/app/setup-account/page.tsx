'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, ArrowRight, CheckCircle2, ShieldAlert, ShieldCheck } from 'lucide-react';
import { api, apiJson } from '@/lib/portal-api';
import { Logo } from '@/components/Logo';

type TerminalStatus = 'EXPIRED' | 'REVOKED' | 'ACCEPTED' | 'INVALID';
type Inspect =
  | { status: 'loading' }
  | { status: 'VALID'; orgName: string; email: string; expiresAt: string; passwordMinLength: number }
  | { status: TerminalStatus };

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center bg-base px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center">
          <Logo className="h-9 w-auto sm:h-10" priority />
        </div>
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-card">{children}</div>
        <p className="mt-6 text-center text-xs text-neutral-500">Innovatix Systems · secure client portal</p>
      </div>
    </main>
  );
}

function Notice({ tone, icon, title, body }: { tone: 'bad' | 'ok'; icon: React.ReactNode; title: string; body: string }) {
  const cls = tone === 'bad' ? 'border-red-500/30 bg-red-500/10 text-red-200' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
  return (
    <div>
      <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${cls}`}>
        <span className="mt-0.5 shrink-0">{icon}</span>
        <div>
          <p className="font-semibold">{title}</p>
          <p className="mt-1 text-sm opacity-90">{body}</p>
        </div>
      </div>
      <a href="/login" className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 font-semibold text-white shadow-cta transition-colors hover:bg-primary-dark">
        Go to sign in <ArrowRight size={18} />
      </a>
    </div>
  );
}

function SetupInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') || '';
  const [inspect, setInspect] = useState<Inspect>({ status: 'loading' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!token) { setInspect({ status: 'INVALID' }); return; }
      const { body } = await apiJson<{ ok: boolean; status: Inspect['status']; orgName?: string; email?: string; expiresAt?: string; passwordMinLength?: number }>(
        `/auth/invitations/${encodeURIComponent(token)}`,
      );
      if (!alive) return;
      if (body?.status === 'VALID') {
        setInspect({ status: 'VALID', orgName: body.orgName || 'your organization', email: body.email || '', expiresAt: body.expiresAt || '', passwordMinLength: body.passwordMinLength || 12 });
      } else {
        const terminal: TerminalStatus = (['EXPIRED', 'REVOKED', 'ACCEPTED', 'INVALID'] as const).includes(body?.status as TerminalStatus)
          ? (body!.status as TerminalStatus)
          : 'INVALID';
        setInspect({ status: terminal });
      }
    })().catch(() => alive && setInspect({ status: 'INVALID' }));
    return () => { alive = false; };
  }, [token]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    if (inspect.status !== 'VALID') return;
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get('password') || '');
    const confirm = String(fd.get('confirm') || '');
    if (password.length < inspect.passwordMinLength) { setFormError(`Password must be at least ${inspect.passwordMinLength} characters.`); return; }
    if (password !== confirm) { setFormError('Passwords do not match.'); return; }
    setSubmitting(true);
    const res = await api(`/auth/invitations/${encodeURIComponent(token)}/accept`, { method: 'POST', body: JSON.stringify({ password }) });
    const body = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (res.ok && body?.ok) {
      setDone(true);
      setTimeout(() => router.replace('/login'), 1800);
      return;
    }
    setFormError(body?.message || 'We could not complete setup. The link may have expired — ask your Innovatix contact to resend it.');
  }

  if (done) {
    return <Shell><Notice tone="ok" icon={<CheckCircle2 size={20} />} title="Your account is ready" body="Password set successfully. Redirecting you to sign in…" /></Shell>;
  }

  switch (inspect.status) {
    case 'loading':
      return <Shell><div className="flex items-center justify-center gap-2 py-8 text-neutral-400"><Loader2 size={18} className="animate-spin" /> Checking your invitation…</div></Shell>;
    case 'EXPIRED':
      return <Shell><Notice tone="bad" icon={<ShieldAlert size={20} />} title="This invitation has expired" body="For your security the setup link is time-limited. Ask your Innovatix contact to resend the invitation." /></Shell>;
    case 'REVOKED':
      return <Shell><Notice tone="bad" icon={<ShieldAlert size={20} />} title="This invitation is no longer valid" body="It was revoked. Please contact your Innovatix representative for a new invitation." /></Shell>;
    case 'ACCEPTED':
      return <Shell><Notice tone="ok" icon={<ShieldCheck size={20} />} title="This invitation was already used" body="Your account is already set up. Please sign in with the password you chose." /></Shell>;
    case 'INVALID':
      return <Shell><Notice tone="bad" icon={<ShieldAlert size={20} />} title="This link is invalid" body="We couldn't find a matching invitation. Check that you used the full link from your email, or ask your Innovatix contact to resend it." /></Shell>;
    case 'VALID':
      return (
        <Shell>
          <h1 className="text-lg font-bold text-white">Set up your portal account</h1>
          <p className="mt-1 text-sm text-neutral-400">
            for <span className="font-medium text-neutral-200">{inspect.orgName}</span>
            {inspect.email ? <> · <span className="text-neutral-300">{inspect.email}</span></> : null}
          </p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-neutral-200">Create a password</span>
              <input name="password" type="password" required autoComplete="new-password" minLength={inspect.passwordMinLength}
                className="w-full rounded-lg border border-line-strong bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="••••••••••••" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-neutral-200">Confirm password</span>
              <input name="confirm" type="password" required autoComplete="new-password" minLength={inspect.passwordMinLength}
                className="w-full rounded-lg border border-line-strong bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="••••••••••••" />
            </label>
            <ul className="space-y-1 text-xs text-neutral-500">
              <li>• At least {inspect.passwordMinLength} characters</li>
              <li>• Avoid common or demo passwords</li>
              <li>• Don&apos;t reuse your email address</li>
            </ul>
            {formError && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">{formError}</p>}
            <button type="submit" disabled={submitting}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 font-semibold text-white shadow-cta transition-colors hover:bg-primary-dark disabled:opacity-60">
              {submitting ? <><Loader2 size={18} className="animate-spin" /> Setting up…</> : <>Create account <ArrowRight size={18} /></>}
            </button>
          </form>
        </Shell>
      );
  }
}

export default function SetupAccountPage() {
  return (
    <Suspense fallback={<Shell><div className="flex items-center justify-center gap-2 py-8 text-neutral-400"><Loader2 size={18} className="animate-spin" /> Loading…</div></Shell>}>
      <SetupInner />
    </Suspense>
  );
}
