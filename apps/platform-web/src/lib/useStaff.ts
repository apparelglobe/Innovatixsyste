'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiJson } from './portal-api';

export type StaffMe = { firstName?: string; lastName?: string; email?: string; role: string };

export function useStaff() {
  const router = useRouter();
  const [me, setMe] = useState<StaffMe | null>(null);
  useEffect(() => {
    (async () => {
      const r = await apiJson<{ user?: StaffMe }>('/admin/me');
      if (r.status === 401 || !r.body.user) { router.replace('/admin/login'); return; }
      setMe(r.body.user);
    })();
  }, [router]);
  const name = me ? [me.firstName, me.lastName].filter(Boolean).join(' ') || me.email || 'Staff' : '';
  return { me, name };
}

/** Actions permitted for a role — mirrors the server RBAC matrix for UI gating. */
export function staffCan(role: string | undefined, action: string): boolean {
  if (!role) return false;
  const M: Record<string, string[]> = {
    ADMIN: ['project:write', 'milestone:write', 'report:publish', 'file:write', 'message:reply', 'approval:create', 'team:assign', 'invoice:write', 'lead:convert', 'proposal:write', 'ticket:reply', 'ticket:note', 'ticket:status'],
    DELIVERY_LEAD: ['project:write', 'milestone:write', 'report:publish', 'file:write', 'message:reply', 'approval:create', 'team:assign', 'invoice:write', 'lead:convert', 'proposal:write', 'ticket:reply', 'ticket:note', 'ticket:status'],
    ENGINEER: ['milestone:write', 'report:publish', 'file:write', 'message:reply', 'ticket:reply', 'ticket:note', 'ticket:status'],
    VIEWER: [],
  };
  return (M[role] ?? []).includes(action);
}
