'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiJson } from './portal-api';

export type Project = {
  id: string; name: string; code: string | null; status: string; percentComplete: number; dueDate: string | null;
  milestones: { id: string; name: string; status: string; dueDate: string | null; completedAt: string | null }[];
  reports: { id: string; kind: string; title: string; summary: string; periodStart: string | null; periodEnd: string | null; publishedAt: string }[];
  approvals: { id: string; subject: string; status: string; createdAt: string; decidedAt: string | null; note: string | null }[];
  invoices: { id: string; number: string; amountCents: number; currency: string; status: string; issuedAt: string | null; dueAt: string | null; paidAt: string | null }[];
  files: { id: string; name: string; category: string; sizeBytes: number | null; uploadedAt: string }[];
  members: { id: string; name: string; role: string }[];
  messages: { id: string; authorType: 'CLIENT' | 'TEAM'; body: string; createdAt: string }[];
};
export type ClientRole = 'OWNER' | 'MEMBER';
export type Me = { user: { firstName?: string; lastName?: string; role?: ClientRole }; org: { name: string } };

export function usePortal() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [project, setProject] = useState<Project | null | undefined>(undefined); // undefined = loading

  const load = useCallback(async () => {
    const meRes = await apiJson<{ user?: Me['user']; org?: Me['org'] }>('/portal/me');
    if (meRes.status === 401) { router.replace('/login'); return; }
    setMe({ user: meRes.body.user || {}, org: meRes.body.org || { name: '' } });
    const pr = await apiJson<{ project: Project | null }>('/portal/project');
    setProject(pr.body.project);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const userName = me ? [me.user.firstName, me.user.lastName].filter(Boolean).join(' ') || 'Client' : '';
  const isOwner = me?.user.role === 'OWNER';
  return { me, project, userName, isOwner, reload: load, loading: !me || project === undefined };
}
