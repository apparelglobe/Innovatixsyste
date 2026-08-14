'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, ArrowLeft } from 'lucide-react';
import { AdminShell } from '@/components/AdminShell';
import { useStaff, staffCan } from '@/lib/useStaff';
import { api, apiJson } from '@/lib/portal-api';
import { ProposalForm, type ProposalLine, type ProposalPayload } from '@/components/ProposalForm';

type Line = { description: string; quantity: number; unitCents: number };
type Proposal = {
  id: string; number: string; title: string; status: string; notes: string | null; depositPercent: number | null;
  changeRequest: string | null;
  lineItems: Line[];
  lead: { email: string; firstName: string | null; lastName: string | null; company: string | null };
};
type View = 'loading' | 'ok' | 'locked' | 'notfound' | 'error';

export default function EditProposalPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { me, name } = useStaff();
  const [p, setP] = useState<Proposal | null>(null);
  const [view, setView] = useState<View>('loading');

  const load = useCallback(async () => {
    try {
      const r = await apiJson<{ proposal: Proposal }>(`/admin/proposals/${id}`);
      if (r.status === 200 && r.body.proposal) {
        setP(r.body.proposal);
        setView(r.body.proposal.status === 'DRAFT' || r.body.proposal.status === 'CHANGES_REQUESTED' ? 'ok' : 'locked');
      } else if (r.status === 404) {
        setView('notfound');
      } else {
        setView('error');
      }
    } catch { setView('error'); }
  }, [id]);
  useEffect(() => { if (me) load(); }, [me, load]);

  async function saveEdit(payload: ProposalPayload): Promise<{ ok: boolean; message?: string }> {
    try {
      const res = await api(`/admin/proposals/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: payload.title, notes: payload.notes ?? null, depositPercent: payload.depositPercent, lineItems: payload.lineItems }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body?.ok) { router.push(`/admin/proposals/${id}`); return { ok: true }; }
      return { ok: false, message: body?.message || `Could not save (HTTP ${res.status}).` };
    } catch {
      return { ok: false, message: 'Network error — could not reach the server. Please try again.' };
    }
  }

  if (!me || view === 'loading') return <div className="grid min-h-screen place-items-center bg-base text-neutral-400"><Loader2 className="animate-spin" /></div>;

  const backToDetail = `/admin/proposals/${id}`;
  const Frame = ({ children }: { children: React.ReactNode }) => (
    <AdminShell staffName={name} role={me.role} active="proposals">
      <div className="mx-auto max-w-3xl">
        <a href={backToDetail} className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white"><ArrowLeft size={15} /> Back to proposal</a>
        {children}
      </div>
    </AdminShell>
  );

  if (!staffCan(me.role, 'proposal:write')) return <Frame><p className="rounded-2xl border border-line bg-surface px-5 py-4 text-sm text-neutral-400">You don&apos;t have permission to edit proposals.</p></Frame>;
  if (view === 'notfound') return <Frame><p className="rounded-2xl border border-line bg-surface px-5 py-4 text-sm text-neutral-400">This proposal could not be found.</p></Frame>;
  if (view === 'error') return (
    <Frame>
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4">
        <p className="text-sm text-red-200">We couldn&apos;t load this proposal — your session may have expired.</p>
        <button onClick={() => { setView('loading'); load(); }} className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-3 py-1.5 text-sm font-semibold text-neutral-100 hover:border-primary/50 hover:text-white">Try again</button>
      </div>
    </Frame>
  );
  if (view === 'locked' || !p) return (
    <Frame>
      <div className="rounded-2xl border border-line bg-surface px-5 py-4">
        <p className="text-sm text-neutral-300">This proposal has already been sent or accepted, so it can no longer be edited.</p>
        <a href={backToDetail} className="mt-2 inline-block text-sm font-semibold text-primary-light hover:underline">View the proposal →</a>
      </div>
    </Frame>
  );

  const leadLabel = p.lead.company || [p.lead.firstName, p.lead.lastName].filter(Boolean).join(' ') || p.lead.email;
  const initialLines: ProposalLine[] = p.lineItems.map((li) => ({
    description: li.description,
    quantity: li.quantity,
    unit: li.unitCents ? String(li.unitCents / 100) : '',
  }));

  return (
    <Frame>
      <h1 className="text-2xl font-extrabold tracking-tight text-white">Edit proposal <span className="text-base font-semibold text-neutral-500">· {p.number}</span></h1>
      <p className="mt-1 text-sm text-neutral-400">Adjust the line items, deposit, or note, then save. The prospect only sees it once you send.</p>
      {p.changeRequest && (
        <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/10 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-300">The prospect asked for a change</p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-neutral-200">{p.changeRequest}</p>
        </div>
      )}
      <ProposalForm
        mode="edit"
        lockedLeadLabel={leadLabel}
        initial={{ title: p.title, notes: p.notes ?? '', depositPercent: p.depositPercent ?? 33, lines: initialLines }}
        submitLabel="Save changes"
        onSubmit={saveEdit}
      />
    </Frame>
  );
}
