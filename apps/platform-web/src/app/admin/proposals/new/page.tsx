'use client';

import { useRouter } from 'next/navigation';
import { Loader2, ArrowLeft } from 'lucide-react';
import { AdminShell } from '@/components/AdminShell';
import { useStaff, staffCan } from '@/lib/useStaff';
import { api } from '@/lib/portal-api';
import { ProposalForm, type ProposalPayload } from '@/components/ProposalForm';

export default function NewProposalPage() {
  const router = useRouter();
  const { me, name } = useStaff();

  if (!me) return <div className="grid min-h-screen place-items-center bg-base text-neutral-400"><Loader2 className="animate-spin" /></div>;

  const canWrite = staffCan(me.role, 'proposal:write');

  async function create(payload: ProposalPayload): Promise<{ ok: boolean; message?: string }> {
    try {
      const res = await api('/admin/proposals', { method: 'POST', body: JSON.stringify(payload) });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body?.proposal?.id) { router.push(`/admin/proposals/${body.proposal.id}`); return { ok: true }; }
      return { ok: false, message: body?.message || `Could not save (HTTP ${res.status}).` };
    } catch {
      return { ok: false, message: 'Network error — could not reach the server. Please try again.' };
    }
  }

  return (
    <AdminShell staffName={name} role={me.role} active="proposals">
      <div className="mx-auto max-w-3xl">
        <a href="/admin/proposals" className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white"><ArrowLeft size={15} /> Proposals</a>
        <h1 className="text-2xl font-extrabold tracking-tight text-white">New proposal</h1>
        <p className="mt-1 text-sm text-neutral-400">Assemble line items, set the activation deposit, and save a draft — then send it to the prospect.</p>
        {canWrite ? (
          <ProposalForm mode="new" submitLabel="Save draft" onSubmit={create} />
        ) : (
          <p className="mt-6 rounded-2xl border border-line bg-surface px-5 py-4 text-sm text-neutral-400">You don&apos;t have permission to create proposals.</p>
        )}
      </div>
    </AdminShell>
  );
}
