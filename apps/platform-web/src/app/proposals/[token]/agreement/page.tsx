'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, ArrowRight, Download, PenLine, CheckCircle2 } from 'lucide-react';
import { api, apiJson } from '@/lib/portal-api';
import { ProposalShell, ProposalLoading, ProposalTerminal, ProposalSteps } from '@/components/proposal-ui';
import { STAGE } from '@/lib/proposal-stage';
import { Timestamp } from '@/components/Timestamp';

const API_BASE = process.env.NEXT_PUBLIC_PORTAL_API_URL || 'http://localhost:4040/v1';

type Contract = { number: string; title: string; bodyMarkdown: string; signedAt: string | null };
type Status = 'loading' | 'READY' | 'SIGNED' | 'NOT_ACCEPTED' | 'INVALID';

function AgreementBody({ md }: { md: string }) {
  const lines = md.split('\n');
  return (
    <div className="space-y-1.5">
      {lines.map((raw, i) => {
        const l = raw.replace(/\*\*/g, '');
        if (l.trim() === '') return <div key={i} className="h-1.5" />;
        if (l.startsWith('# ')) return <h2 key={i} className="text-lg font-bold text-white">{l.slice(2)}</h2>;
        if (l.startsWith('## ')) return <h3 key={i} className="pt-2 text-[11px] font-semibold uppercase tracking-wider text-primary-light">{l.slice(3)}</h3>;
        if (l.startsWith('- ')) return <p key={i} className="pl-4 text-sm leading-relaxed text-neutral-300">• {l.slice(2)}</p>;
        return <p key={i} className="text-sm leading-relaxed text-neutral-300">{l}</p>;
      })}
    </div>
  );
}

export default function AgreementPage() {
  const router = useRouter();
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<Status>('loading');
  const [contract, setContract] = useState<Contract | null>(null);
  const [depositPaid, setDepositPaid] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [signerTitle, setSignerTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const pdfUrl = `${API_BASE}/proposals/${encodeURIComponent(token)}/agreement/pdf`;

  const load = useCallback(async () => {
    const { body } = await apiJson<{ ok: boolean; status: string; contract?: Contract }>(`/proposals/${encodeURIComponent(token)}/agreement`);
    if ((body.status === 'READY' || body.status === 'SIGNED') && body.contract) {
      setContract(body.contract); setStatus(body.status);
      if (body.status === 'SIGNED') {
        // Already-signed link may also already be paid — check so we don't tell a paid client they still owe.
        const dep = await apiJson<{ status: string }>(`/proposals/${encodeURIComponent(token)}/deposit`);
        setDepositPaid(dep.body?.status === 'PAID');
      }
    } else setStatus(body.status === 'NOT_ACCEPTED' ? 'NOT_ACCEPTED' : 'INVALID');
  }, [token]);

  useEffect(() => { load().catch(() => setStatus('INVALID')); }, [load]);

  async function sign(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setErr(null);
    const trimmed = signerName.trim();
    if (!trimmed) { setBusy(false); setErr('Please type your full name to sign.'); return; }
    try {
      const res = await api(`/proposals/${encodeURIComponent(token)}/sign`, { method: 'POST', body: JSON.stringify({ signerName: trimmed, signerTitle: signerTitle.trim() || undefined }) });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body?.ok) { router.push(`/proposals/${encodeURIComponent(token)}/deposit`); return; }
      setBusy(false);
      setErr(body?.message || 'We could not record your signature. Please try again.');
    } catch {
      setBusy(false);
      setErr('We could not reach the server. Please try again.');
    }
  }

  if (status === 'loading') return <ProposalLoading label="Loading your agreement…" />;
  if (status === 'NOT_ACCEPTED') return <ProposalTerminal tone="bad" title="Accept the proposal first" body="Open your proposal link and accept it — then you can sign the agreement." />;
  if (status === 'INVALID' || !contract) return <ProposalTerminal tone="bad" title="This link is invalid" body="Check that you used the full link from your email, or ask your Innovatix contact to resend it." />;

  return (
    <ProposalShell>
      <ProposalSteps current="agreement" token={token} complete={status === 'SIGNED'} />
      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary-light">Agreement · {contract.number}</p>
            <h1 className="mt-1.5 text-xl font-extrabold tracking-tight text-white">Your Services Agreement</h1>
          </div>
          <a href={pdfUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-3 py-2 text-xs font-semibold text-neutral-200 hover:border-primary/50 hover:text-white">
            <Download size={14} /> PDF copy
          </a>
        </div>

        <div className="border-b border-line px-6 py-5">
          <AgreementBody md={contract.bodyMarkdown} />
        </div>

        {status === 'SIGNED' ? (
          <div className="px-6 py-6">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <p className="flex items-center gap-2 font-semibold text-emerald-100"><CheckCircle2 size={18} /> {(depositPaid ? STAGE.PAID : STAGE.SIGNED).prospectTitle}</p>
              <p className="mt-1 text-sm text-neutral-300">{(depositPaid ? STAGE.PAID : STAGE.SIGNED).prospectBody}</p>
              {contract.signedAt && (
                <p className="mt-2 text-xs text-emerald-200/70">
                  Signed <Timestamp value={contract.signedAt} withTime withZone className="font-medium text-emerald-100" />
                </p>
              )}
            </div>
            <button onClick={() => router.push(`/proposals/${encodeURIComponent(token)}/deposit`)} className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 font-semibold text-white shadow-cta transition-colors hover:bg-primary-dark">
              {depositPaid ? 'View confirmation' : 'Continue to deposit'} <ArrowRight size={18} />
            </button>
          </div>
        ) : (
          <form onSubmit={sign} className="px-6 py-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-sm font-medium text-neutral-200">Type your full name to sign</span>
                <div className="mb-2 grid min-h-[64px] place-items-center rounded-lg border border-dashed border-line-strong bg-white/[0.02] px-4 py-3">
                  {signerName.trim()
                    ? <span className="text-3xl leading-none text-white" style={{ fontFamily: "'Snell Roundhand', 'Segoe Script', 'Brush Script MT', cursive" }}>{signerName}</span>
                    : <span className="text-sm text-neutral-600">Your signature will appear here</span>}
                </div>
                <input name="signerName" value={signerName} onChange={(e) => setSignerName(e.target.value)} required autoComplete="name" placeholder="Your full name"
                  className="w-full rounded-lg border border-line-strong bg-white/[0.03] px-3.5 py-2.5 text-base text-white placeholder:text-neutral-500 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-sm font-medium text-neutral-200">Your title <span className="font-normal text-neutral-500">(optional)</span></span>
                <input name="signerTitle" value={signerTitle} onChange={(e) => setSignerTitle(e.target.value)} autoComplete="organization-title" placeholder="e.g. COO"
                  className="w-full rounded-lg border border-line-strong bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </label>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-neutral-500">By typing your name and clicking Sign, you agree to this agreement and to the proposal it references. This is a legally binding electronic signature.</p>
            {err && <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">{err}</p>}
            <button type="submit" disabled={busy} className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 font-semibold text-white shadow-cta transition-colors hover:bg-primary-dark disabled:opacity-60">
              {busy ? <><Loader2 size={18} className="animate-spin" /> Signing…</> : <><PenLine size={18} /> Sign &amp; continue</>}
            </button>
          </form>
        )}
      </div>
    </ProposalShell>
  );
}
