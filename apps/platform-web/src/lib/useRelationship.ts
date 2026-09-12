'use client';

/**
 * Slice 1 — the relationship/multi-project data hook for the NEW Home + project surfaces.
 * Loads /portal/me (with the additive canBilling gate) + /portal/projects (the lean switcher list).
 * It deliberately does NOT touch the legacy /portal/project — that stays only under usePortal() for the
 * legacy Billing / invoice-detail / Messages / Settings pages. Pages that need the Home aggregate or a
 * project's full detail fetch /portal/relationship-overview or /portal/projects/:id themselves.
 */
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiJson } from './portal-api';

// Slice 7: archivedAt (null = current, non-null = past). The list is fetched WITHOUT a scope (backward-
// compatible default = all), so consumers that represent current work (switcher, new-ticket picker) filter
// to archivedAt == null client-side, while relationship-wide surfaces (e.g. the Billing project filter)
// keep showing all — archive is a view partition, never an access filter.
export type ProjectListItem = { id: string; name: string; status: string; archivedAt: string | null };
export type RelMe = { user: { firstName?: string; lastName?: string; role?: 'OWNER' | 'MEMBER' }; org: { name: string }; canBilling: boolean };

export function useRelationship() {
  const router = useRouter();
  const [me, setMe] = useState<RelMe | null>(null);
  const [projects, setProjects] = useState<ProjectListItem[] | undefined>(undefined);

  const load = useCallback(async () => {
    const meRes = await apiJson<{ user?: RelMe['user']; org?: RelMe['org']; canBilling?: boolean }>('/portal/me');
    if (meRes.status === 401) { router.replace('/clientportal'); return; }
    if (meRes.status === 200) setMe({ user: meRes.body.user || {}, org: meRes.body.org || { name: '' }, canBilling: !!meRes.body.canBilling });
    const list = await apiJson<{ projects: ProjectListItem[] }>('/portal/projects');
    if (list.status === 200) setProjects(list.body.projects);
  }, [router]);
  useEffect(() => { load(); }, [load]);

  const userName = me ? [me.user.firstName, me.user.lastName].filter(Boolean).join(' ') || 'Client' : '';
  return {
    me, projects: projects ?? [], userName,
    canBilling: !!me?.canBilling, isOwner: me?.user.role === 'OWNER',
    reload: load, loading: !me || projects === undefined,
  };
}
