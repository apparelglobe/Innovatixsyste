'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiJson } from './portal-api';

export type Project = {
  id: string; name: string; code: string | null; status: string; percentComplete: number; dueDate: string | null;
  milestones: { id: string; name: string; status: string; dueDate: string | null; completedAt: string | null }[];
  reports: { id: string; kind: string; title: string; summary: string; periodStart: string | null; periodEnd: string | null; publishedAt: string }[];
  approvals: { id: string; subject: string; status: string; createdAt: string; decidedAt: string | null; note: string | null }[];
  files: { id: string; name: string; category: string; sizeBytes: number | null; uploadedAt: string }[];
  members: { id: string; name: string; role: string }[];
  messages: { id: string; authorType: 'CLIENT' | 'TEAM'; body: string; createdAt: string }[];
};
// A client-visible invoice. `kind`/billing-period fields are set on RETAINER (Care Plan) invoices.
export type ClientInvoice = {
  id: string; number: string; amountCents: number; currency: string; status: string;
  issuedAt: string | null; dueAt: string | null; paidAt: string | null; overdue: boolean;
  kind?: string; billingPeriodStart?: string | null; billingPeriodEnd?: string | null;
};
export type CarePlanStatus = 'ACTIVE' | 'PAUSED' | 'PAST_DUE' | 'COMPLETED' | 'CANCELED';
export type ClientCarePlan = {
  name: string; monthlyAmountCents: number; currency: string;
  status: CarePlanStatus; nextInvoiceAt: string | null; includedSummary: string | null;
};
// The billing surface is OWNER-only, enforced server-side: the API returns `billing: null` for a
// member (or removed account), so its presence IS the client-side authorization signal (canBilling).
export type Billing = { invoices: ClientInvoice[]; carePlan: ClientCarePlan | null };
export type ClientRole = 'OWNER' | 'MEMBER';
export type Me = { user: { firstName?: string; lastName?: string; email?: string; role?: ClientRole }; org: { name: string } };

export function usePortal() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [project, setProject] = useState<Project | null | undefined>(undefined); // undefined = loading
  const [billing, setBilling] = useState<Billing | null>(null);

  const load = useCallback(async () => {
    const meRes = await apiJson<{ user?: Me['user']; org?: Me['org'] }>('/portal/me');
    if (meRes.status === 401) { router.replace('/clientportal'); return; }
    setMe({ user: meRes.body.user || {}, org: meRes.body.org || { name: '' } });
    const pr = await apiJson<{ project: Project | null; billing: Billing | null }>('/portal/project');
    setProject(pr.body.project);
    setBilling(pr.body.billing ?? null);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const userName = me ? [me.user.firstName, me.user.lastName].filter(Boolean).join(' ') || 'Client' : '';
  const isOwner = me?.user.role === 'OWNER';
  // Server-authoritative billing gate: null billing block ⇒ the caller is not authorized for Billing.
  // Today that equals isOwner; a future dedicated "billing access" role would simply arrive as a
  // non-null block with no UI change needed.
  const canBilling = billing != null;
  return { me, project, billing, userName, isOwner, canBilling, reload: load, loading: !me || project === undefined };
}
