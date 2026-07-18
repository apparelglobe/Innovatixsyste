'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, UserPlus, ShieldCheck, User as UserIcon } from 'lucide-react';
import { usePortal } from '@/lib/usePortal';
import { PortalShell } from '@/components/PortalShell';
import { apiJson } from '@/lib/portal-api';
import { activeOwnerCount, canChangeRole, canDeactivate, isSelf } from '@/lib/team-guards';

type Member = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: 'OWNER' | 'MEMBER';
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

const fullName = (m: Member) => [m.firstName, m.lastName].filter(Boolean).join(' ') || m.email;

export default function SettingsPage() {
  const { me, userName, isOwner, loading } = usePortal();
  const [members, setMembers] = useState<Member[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'MEMBER' | 'OWNER'>('MEMBER');
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    if (!isOwner) return;
    const res = await apiJson<{ ok: boolean; users: Member[] }>('/portal/client-users');
    if (res.status === 200) setMembers(res.body.users);
  }, [isOwner]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const activeOwners = activeOwnerCount(members ?? []);

  async function setActive(m: Member, active: boolean) {
    setError(null);
    setBusyId(m.id);
    const path = `/portal/client-users/${m.id}/${active ? 'reactivate' : 'deactivate'}`;
    const res = await apiJson<{ ok: boolean; message?: string }>(path, { method: 'POST' });
    setBusyId(null);
    if (res.status !== 200) {
      setError(res.body?.message || 'Could not update this member. Please try again.');
      return;
    }
    await loadMembers();
  }

  async function changeRole(m: Member, role: 'OWNER' | 'MEMBER') {
    setError(null);
    setBusyId(m.id);
    const res = await apiJson<{ ok: boolean; message?: string }>(`/portal/client-users/${m.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
    setBusyId(null);
    if (res.status !== 200) {
      setError(res.body?.message || 'Could not change this role. Please try again.');
      return;
    }
    await loadMembers();
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setInviteMsg(null);
    setError(null);
    if (!inviteEmail.trim()) return;
    setInviting(true);
    const res = await apiJson<{ ok: boolean; message?: string }>('/portal/client-users', {
      method: 'POST',
      body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
    });
    setInviting(false);
    if (res.status !== 200) {
      setError(res.body?.message || 'Could not send the invitation. Please try again.');
      return;
    }
    setInviteEmail('');
    setInviteRole('MEMBER');
    setInviteMsg('Invitation sent. They will receive an email to set up their account.');
    await loadMembers();
  }

  if (loading || !me) {
    return (
      <div className="grid min-h-screen place-items-center bg-base text-neutral-400">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <PortalShell orgName={me.org.name} userName={userName} active="settings">
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">Settings</h1>
          <p className="mt-1 text-sm text-neutral-500">Your account, organization, and team members.</p>
        </div>

        {/* Account */}
        <section className="rounded-2xl border border-line bg-surface p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <UserIcon size={16} className="text-primary-light" /> Your account
          </div>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-neutral-500">Name</dt>
              <dd className="mt-0.5 text-sm text-neutral-200">{userName}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-neutral-500">Email</dt>
              <dd className="mt-0.5 text-sm text-neutral-200">{me.user.email ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-neutral-500">Role</dt>
              <dd className="mt-0.5">
                <span className="inline-flex items-center gap-1 rounded-full border border-line bg-base px-2.5 py-0.5 text-xs font-semibold text-primary-light">
                  {isOwner ? <ShieldCheck size={12} /> : null}
                  {me.user.role ?? 'MEMBER'}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-neutral-500">Organization</dt>
              <dd className="mt-0.5 text-sm text-neutral-200">{me.org.name}</dd>
            </div>
          </dl>
        </section>

        {/* Team members (OWNER only) */}
        {isOwner ? (
          <section className="rounded-2xl border border-line bg-surface p-6">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-white">Team members</div>
              <span className="text-xs text-neutral-500">{activeOwners} active owner{activeOwners === 1 ? '' : 's'}</span>
            </div>

            {error ? (
              <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>
            ) : null}

            <div className="mt-4 divide-y divide-line">
              {members === null ? (
                <div className="py-6 text-center text-neutral-500"><Loader2 className="mx-auto animate-spin" size={18} /></div>
              ) : members.length === 0 ? (
                <div className="py-6 text-sm text-neutral-500">No team members yet.</div>
              ) : (
                members.map((m) => {
                  const self = isSelf(m, me.user.email);
                  const deact = canDeactivate(m, me.user.email, activeOwners);
                  const roleChangeable = canChangeRole(m, me.user.email);
                  const busy = busyId === m.id;
                  return (
                    <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium text-white">{fullName(m)}</span>
                          {!m.active ? (
                            <span className="rounded-full bg-neutral-700/60 px-2 py-0.5 text-[11px] font-semibold text-neutral-300">Deactivated</span>
                          ) : null}
                          {self ? <span className="text-[11px] text-neutral-500">(you)</span> : null}
                        </div>
                        <div className="truncate text-xs text-neutral-500">{m.email}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={m.role}
                          disabled={busy || !roleChangeable}
                          onChange={(e) => changeRole(m, e.target.value as 'OWNER' | 'MEMBER')}
                          className="rounded-lg border border-line bg-base px-2 py-1 text-xs text-neutral-200 disabled:opacity-40"
                          title={self ? 'You cannot change your own role' : undefined}
                        >
                          <option value="OWNER">Owner</option>
                          <option value="MEMBER">Member</option>
                        </select>
                        {m.active ? (
                          <button
                            onClick={() => setActive(m, false)}
                            disabled={busy || !deact.allowed}
                            title={deact.reason}
                            className="rounded-lg border border-line px-2.5 py-1 text-xs font-medium text-neutral-300 transition hover:border-red-500/40 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {busy ? '…' : 'Deactivate'}
                          </button>
                        ) : (
                          <button
                            onClick={() => setActive(m, true)}
                            disabled={busy}
                            className="rounded-lg border border-line px-2.5 py-1 text-xs font-medium text-primary-light transition hover:border-primary/40 disabled:opacity-40"
                          >
                            {busy ? '…' : 'Reactivate'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Invite */}
            <form onSubmit={invite} className="mt-5 border-t border-line pt-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Invite a teammate</div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="teammate@company.com"
                  className="min-w-0 flex-1 rounded-lg border border-line bg-base px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-600 focus:border-primary/50 focus:outline-none"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'MEMBER' | 'OWNER')}
                  className="rounded-lg border border-line bg-base px-2 py-2 text-sm text-neutral-200"
                >
                  <option value="MEMBER">Member</option>
                  <option value="OWNER">Owner</option>
                </select>
                <button
                  type="submit"
                  disabled={inviting}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50"
                >
                  {inviting ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />} Invite
                </button>
              </div>
              {inviteMsg ? <p className="mt-2 text-xs text-primary-light">{inviteMsg}</p> : null}
            </form>
          </section>
        ) : (
          <section className="rounded-2xl border border-line bg-surface p-6 text-sm text-neutral-400">
            Team management is available to account owners. Contact an owner in your organization to change roles or add
            teammates.
          </section>
        )}
      </div>
    </PortalShell>
  );
}
