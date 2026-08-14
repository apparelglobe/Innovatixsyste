'use client';

import { Loader2, ShieldCheck, User as UserIcon } from 'lucide-react';
import { AdminShell } from '@/components/AdminShell';
import { useStaff, staffCan } from '@/lib/useStaff';

const ROLE_LABEL: Record<string, string> = { ADMIN: 'Admin', DELIVERY_LEAD: 'Delivery Lead', ENGINEER: 'Engineer', VIEWER: 'Viewer' };

// The capabilities each role has, mirrored from the server RBAC matrix, shown so
// staff can see exactly what their role allows.
const CAPS: { action: string; label: string }[] = [
  { action: 'project:write', label: 'Create & edit projects' },
  { action: 'milestone:write', label: 'Manage milestones' },
  { action: 'report:publish', label: 'Publish reports' },
  { action: 'file:write', label: 'Upload & manage files' },
  { action: 'message:reply', label: 'Reply to client messages' },
  { action: 'approval:create', label: 'Request approvals' },
  { action: 'team:assign', label: 'Assign delivery team' },
  { action: 'invoice:write', label: 'Create & send invoices' },
  { action: 'proposal:write', label: 'Create & send proposals' },
  { action: 'lead:convert', label: 'Convert leads to clients' },
];

export default function AdminSettingsPage() {
  const { me, name } = useStaff();
  if (!me) return <div className="grid min-h-screen place-items-center bg-base text-neutral-400"><Loader2 className="animate-spin" /></div>;

  return (
    <AdminShell staffName={name} role={me.role} active="settings">
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">Settings</h1>
          <p className="mt-1 text-sm text-neutral-500">Your staff account and permissions.</p>
        </div>

        <section className="rounded-2xl border border-line bg-surface p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <UserIcon size={16} className="text-primary-light" /> Your account
          </div>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-neutral-500">Name</dt>
              <dd className="mt-0.5 text-sm text-neutral-200">{name}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-neutral-500">Email</dt>
              <dd className="mt-0.5 text-sm text-neutral-200">{me.email ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-neutral-500">Role</dt>
              <dd className="mt-0.5">
                <span className="inline-flex items-center gap-1 rounded-full border border-line bg-base px-2.5 py-0.5 text-xs font-semibold text-primary-light">
                  <ShieldCheck size={12} /> {ROLE_LABEL[me.role] ?? me.role}
                </span>
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-line bg-surface p-6">
          <div className="text-sm font-semibold text-white">What your role can do</div>
          <p className="mt-1 text-xs text-neutral-500">Permissions are enforced by the server; this reflects your current role.</p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {CAPS.map((c) => {
              const allowed = staffCan(me.role, c.action);
              return (
                <li key={c.action} className="flex items-center gap-2 text-sm">
                  <span className={`grid h-4 w-4 place-items-center rounded-full text-[10px] font-bold ${allowed ? 'bg-primary/20 text-primary-light' : 'bg-neutral-800 text-neutral-600'}`}>
                    {allowed ? '✓' : '—'}
                  </span>
                  <span className={allowed ? 'text-neutral-200' : 'text-neutral-600'}>{c.label}</span>
                </li>
              );
            })}
          </ul>
        </section>

        <p className="text-xs text-neutral-600">
          Need a role change or a new staff account? Contact an administrator — staff accounts and roles are managed by
          Innovatix administrators.
        </p>
      </div>
    </AdminShell>
  );
}
