'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, Plus, Trash2, Lock } from 'lucide-react';
import { AdminShell } from '@/components/AdminShell';
import { useStaff, staffCan } from '@/lib/useStaff';
import { api, apiJson } from '@/lib/portal-api';
import { fmtDate, fmtDateTime, fmtMoney } from '@/lib/fmt';

/* eslint-disable @typescript-eslint/no-explicit-any */
const TABS = ['Overview', 'Milestones', 'Reports', 'Approvals', 'Messages', 'Team', 'Files', 'Invoices', 'Care Plan', 'Activity'] as const;
const CARE_PLAN_TONE: Record<string, string> = { DRAFT: 'bg-white/10 text-neutral-300', ACTIVE: 'bg-emerald-400/15 text-emerald-300', PAUSED: 'bg-amber-400/15 text-amber-300', CANCELED: 'bg-white/10 text-neutral-400', COMPLETED: 'bg-primary/15 text-primary-light', PAST_DUE: 'bg-red-400/15 text-red-300' };
const PROJECT_STATUS = ['DISCOVERY', 'IN_PROGRESS', 'UAT', 'LAUNCHED', 'ON_HOLD', 'COMPLETE'];
const MS_STATUS = ['PLANNED', 'IN_PROGRESS', 'DONE'];
const APPROVAL_TYPES = ['MILESTONE', 'DELIVERABLE', 'UAT', 'CHANGE_REQUEST', 'DEPLOYMENT'];

export default function AdminProjectPage() {
  const { me, name } = useStaff();
  const { id } = useParams<{ id: string }>();
  const [p, setP] = useState<any>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]>('Overview');
  const [busy, setBusy] = useState(false);
  const [invLines, setInvLines] = useState<{ description: string; quantity: string; unit: string; milestoneId: string }[]>([{ description: '', quantity: '1', unit: '', milestoneId: '' }]);
  const [clientUsers, setClientUsers] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [historyFor, setHistoryFor] = useState<Record<string, any[] | undefined>>({});
  const [voidInv, setVoidInv] = useState<{ id: string; number: string } | null>(null);

  const load = useCallback(async () => {
    const r = await apiJson<{ project: any }>(`/admin/projects/${id}`);
    // Only commit on success — a non-200 refetch must not null `p` and flip the page back to the
    // loading state (which tears down and rebuilds the tab content).
    if (r.status === 200) setP(r.body.project);
    const cu = await apiJson<{ users: any[] }>(`/admin/projects/${id}/client-users`);
    if (cu.status === 200) setClientUsers(cu.body.users || []);
    const inv = await apiJson<{ invitations: any[] }>(`/admin/projects/${id}/client-invitations`);
    if (inv.status === 200) setInvitations(inv.body.invitations || []);
  }, [id]);
  useEffect(() => { if (me) load(); }, [me, load]);

  // When the Messages tab is opened, mark the client's messages as read for the team.
  useEffect(() => {
    if (tab === 'Messages' && p?.messages?.some((m: any) => m.authorType === 'CLIENT' && !m.readByTeamAt)) {
      void api(`/admin/projects/${id}/messages/read`, { method: 'POST' }).then(load);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, p?.messages?.length]);

  async function act(method: string, path: string, body?: any) {
    setBusy(true);
    await api(path, { method, ...(body ? { body: JSON.stringify(body) } : {}) });
    await load();
    setBusy(false);
  }

  async function createInvoice(meta: { number: string; currency: string; status: string; dueAt: string; billingContactUserId: string }) {
    const lineItems = invLines
      .filter((l) => l.description.trim() && l.unit !== '')
      .map((l) => ({ description: l.description.trim(), quantity: Math.max(1, parseInt(l.quantity || '1', 10) || 1), unitCents: Math.round(parseFloat(l.unit || '0') * 100), milestoneId: l.milestoneId || undefined }));
    if (!meta.number.trim() || lineItems.length === 0) return;
    setBusy(true);
    await api(`/admin/projects/${id}/invoices`, { method: 'POST', body: JSON.stringify({ number: meta.number.trim(), currency: (meta.currency || 'USD').toUpperCase(), status: meta.status, dueAt: meta.dueAt || undefined, billingContactUserId: meta.billingContactUserId || undefined, lineItems }) });
    setInvLines([{ description: '', quantity: '1', unit: '', milestoneId: '' }]);
    await load();
    setBusy(false);
  }

  const API_BASE = process.env.NEXT_PUBLIC_PORTAL_API_URL || 'http://localhost:4040/v1';
  async function uploadFile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const file = fd.get('file') as File;
    if (!file || file.size === 0) return;
    setBusy(true);
    const clientVisible = fd.get('clientVisible') === 'on';
    const category = String(fd.get('category') || 'DELIVERABLE');
    const body = new FormData();
    body.append('file', file);
    // credentials + no content-type header (browser sets the multipart boundary)
    await fetch(`${API_BASE}/admin/projects/${id}/files?category=${category}&clientVisible=${clientVisible}`, { method: 'POST', credentials: 'include', body });
    form.reset();
    await load();
    setBusy(false);
  }

  async function uploadVersion(replaceId: string, file: File | undefined) {
    if (!file || file.size === 0) return;
    setBusy(true);
    const body = new FormData();
    body.append('file', file);
    const res = await fetch(`${API_BASE}/admin/projects/${id}/files?replaceId=${replaceId}`, { method: 'POST', credentials: 'include', body });
    if (!res.ok) { const j = await res.json().catch(() => ({})); alert(`Upload rejected: ${j.reason || j.message || res.status}`); }
    setHistoryFor((s) => ({ ...s, [replaceId]: undefined }));
    await load();
    setBusy(false);
  }

  async function toggleHistory(fileId: string) {
    if (historyFor[fileId]) { setHistoryFor((s) => ({ ...s, [fileId]: undefined })); return; }
    const r = await apiJson<{ versions: any[] }>(`/admin/files/${fileId}/versions`);
    setHistoryFor((s) => ({ ...s, [fileId]: r.body.versions || [] }));
  }

  if (!me || !p) return <div className="grid min-h-screen place-items-center bg-base text-neutral-400"><Loader2 className="animate-spin" /></div>;
  const can = (a: string) => staffCan(me.role, a);
  const input = 'w-full rounded-lg border border-line-strong bg-white/[0.03] px-3 py-2 text-sm text-white';

  return (
    <AdminShell staffName={name} role={me.role} active="projects">
      <div className="mx-auto max-w-4xl">
        <a href="/admin" className="text-sm text-neutral-500 hover:text-white">← Projects</a>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-extrabold tracking-tight text-white">{p.name}</h1>
          <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-neutral-200">{p.status}</span>
          <span className="text-sm text-neutral-500">{p.clientOrg?.name} · {p.percentComplete}%</span>
        </div>

        <div className="mt-5 flex flex-wrap gap-1 border-b border-line">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`rounded-t-lg px-3 py-2 text-sm font-medium transition ${tab === t ? 'border-b-2 border-primary text-white' : 'text-neutral-400 hover:text-white'}`}>{t}</button>
          ))}
        </div>

        <div className="mt-6">
          {tab === 'Overview' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-line bg-surface p-5">
                <h3 className="text-sm font-bold text-white">Project status</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
                  <select disabled={!can('project:write')} defaultValue={p.status} onChange={(e) => act('PATCH', `/admin/projects/${id}`, { status: e.target.value })} className={input}>
                    {PROJECT_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <input disabled={!can('project:write')} type="number" min={0} max={100} defaultValue={p.percentComplete} onBlur={(e) => act('PATCH', `/admin/projects/${id}`, { percentComplete: Number(e.target.value) })} className={`${input} w-24`} />
                  <span className="self-center text-sm text-neutral-500">% complete</span>
                </div>
                {/* Slice 7: archive is SEPARATE from delivery status — it only moves the project out of the
                    client's current workspace (Past Projects). Archiving/unarchiving never changes status. */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Workspace visibility</h4>
                    <p className="mt-1 text-xs text-neutral-500">{p.archivedAt ? `Archived — hidden from the client's current workspace (still fully readable). Delivery status stays ${p.status}.` : "Current — shown in the client's active workspace."}</p>
                  </div>
                  {p.archivedAt ? (
                    <button disabled={!can('project:write')} onClick={() => act('POST', `/admin/projects/${id}/unarchive`)}
                      className="shrink-0 rounded-lg border border-line-strong px-3 py-2 text-sm font-semibold text-neutral-200 transition hover:bg-white/[0.05] disabled:opacity-50">Unarchive</button>
                  ) : (
                    <button disabled={!can('project:write')} onClick={() => act('POST', `/admin/projects/${id}/archive`)}
                      className="shrink-0 rounded-lg border border-line-strong px-3 py-2 text-sm font-semibold text-neutral-300 transition hover:bg-white/[0.05] disabled:opacity-50">Archive</button>
                  )}
                </div>
                <div className="mt-4 border-t border-line pt-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Next update to the client</h4>
                  <p className="mt-1 text-xs text-neutral-500">While it&rsquo;s our turn, the client&rsquo;s workspace shows &ldquo;next update by this date.&rdquo; Set a real commitment; leave blank for none.</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-[auto_1fr]">
                    <input disabled={!can('project:write')} type="date" defaultValue={p.nextUpdateAt ? new Date(p.nextUpdateAt).toISOString().slice(0, 10) : ''} onChange={(e) => act('PATCH', `/admin/projects/${id}`, { nextUpdateAt: e.target.value || null })} className={`${input} w-44`} />
                    <input disabled={!can('project:write')} defaultValue={p.nextUpdateNote ?? ''} maxLength={280} placeholder="Optional note (e.g. demo build ready)" onBlur={(e) => act('PATCH', `/admin/projects/${id}`, { nextUpdateNote: e.target.value.trim() || null })} className={input} />
                  </div>
                </div>
                {!can('project:write') && <p className="mt-2 text-xs text-neutral-500">Read-only for your role.</p>}
              </div>
            </div>
          )}

          {tab === 'Milestones' && (
            <div className="space-y-3">
              {p.milestones.map((m: any) => (
                <div key={m.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
                  <div className="min-w-0 flex-1"><div className="truncate font-semibold text-white">{m.name}</div><div className="text-xs text-neutral-500">due {fmtDate(m.dueDate)}</div></div>
                  <select disabled={!can('milestone:write')} defaultValue={m.status} onChange={(e) => act('PATCH', `/admin/milestones/${m.id}`, { status: e.target.value })} className="w-36 shrink-0 rounded-lg border border-line-strong bg-white/[0.03] px-3 py-2 text-sm text-white">{MS_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}</select>
                </div>
              ))}
              {can('milestone:write') && (
                <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); act('POST', `/admin/projects/${id}/milestones`, { name: f.get('name'), dueDate: f.get('dueDate') || undefined }); (e.currentTarget as HTMLFormElement).reset(); }} className="flex gap-2">
                  <input name="name" required placeholder="New milestone" className={input} />
                  <input name="dueDate" type="date" className={`${input} w-40`} />
                  <button className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-dark"><Plus size={16} /></button>
                </form>
              )}
            </div>
          )}

          {tab === 'Reports' && (
            <div className="space-y-4">
              {can('report:publish') && (
                <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); act('POST', `/admin/projects/${id}/reports`, { kind: f.get('kind'), title: f.get('title'), summary: f.get('summary') }); (e.currentTarget as HTMLFormElement).reset(); }} className="space-y-2 rounded-2xl border border-line bg-surface p-5">
                  <div className="flex gap-2">
                    <select name="kind" className={`${input} w-32`}><option value="WEEKLY">Weekly</option><option value="DAILY">Daily</option></select>
                    <input name="title" required placeholder="Report title" className={input} />
                  </div>
                  <textarea name="summary" required rows={3} placeholder="Summary (verified activity only)" className={input} />
                  <button disabled={busy} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60">Publish report</button>
                </form>
              )}
              {p.reports.map((r: any) => (
                <div key={r.id} className="rounded-xl border border-line bg-surface p-4">
                  <div className="text-xs font-bold uppercase tracking-widest text-primary-light">{r.kind} · {fmtDate(r.publishedAt)}</div>
                  <div className="mt-1 font-bold text-white">{r.title}</div>
                  <p className="mt-1 text-sm text-neutral-400">{r.summary}</p>
                </div>
              ))}
            </div>
          )}

          {tab === 'Approvals' && (
            <div className="space-y-3">
              {can('approval:create') && (
                <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); act('POST', `/admin/projects/${id}/approvals`, { type: f.get('type'), subject: f.get('subject'), milestoneId: f.get('milestoneId') || undefined }); (e.currentTarget as HTMLFormElement).reset(); }} className="flex flex-wrap gap-2 rounded-2xl border border-line bg-surface p-5">
                  <select name="type" className={`${input} w-44`}>{APPROVAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
                  <input name="subject" required placeholder="What needs approval?" className={`${input} flex-1`} />
                  {/* Link a milestone — required for a MILESTONE approval to mark it done + emit the "Milestone approved" moment. */}
                  <select name="milestoneId" defaultValue="" className="w-52 shrink-0 rounded-lg border border-line-strong bg-white/[0.03] px-3 py-2 text-sm text-white">
                    <option value="">Link a milestone…</option>
                    {p.milestones.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                  <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark">Request approval</button>
                </form>
              )}
              {p.approvals.map((a: any) => (
                <div key={a.id} className="flex items-start gap-3 rounded-xl border border-line bg-surface p-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-white">{a.subject}</div>
                    <div className="text-xs text-neutral-500">{a.type} · requested {fmtDate(a.createdAt)}{a.requestedByName ? ` by ${a.requestedByName}` : ''}{a.milestoneId ? ` · milestone: ${p.milestones.find((m: any) => m.id === a.milestoneId)?.name ?? '—'}` : ''}</div>
                    {a.decidedAt && (
                      <div className="mt-0.5 text-xs text-neutral-400">
                        {a.status === 'APPROVED' ? 'Approved' : 'Changes requested'} {fmtDate(a.decidedAt)}{a.decidedByName ? ` by ${a.decidedByName}` : ''}
                      </div>
                    )}
                    {a.note && <div className="mt-1 rounded-lg bg-white/[0.03] px-2.5 py-1.5 text-xs text-neutral-300">“{a.note}”</div>}
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${a.status === 'APPROVED' ? 'bg-emerald-400/15 text-emerald-300' : a.status === 'CHANGES_REQUESTED' ? 'bg-amber-400/15 text-amber-300' : 'bg-white/10 text-neutral-300'}`}>{a.status}</span>
                </div>
              ))}
            </div>
          )}

          {tab === 'Messages' && (
            <div className="space-y-4">
              <div className="space-y-3 rounded-2xl border border-line bg-surface p-5">
                {p.messages.length === 0 ? <p className="text-sm text-neutral-500">No messages.</p> : p.messages.map((m: any) => (
                  <div key={m.id} className={`rounded-xl px-3.5 py-2.5 text-sm ${m.internal ? 'border border-amber-400/30 bg-amber-400/[0.06]' : m.authorType === 'TEAM' ? 'border border-primary/30 bg-primary/[0.06]' : 'border border-line bg-base'}`}>
                    <div className="mb-0.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                      {m.internal && <Lock size={10} className="text-amber-300" />}{m.authorType === 'TEAM' ? (m.internal ? 'Internal note' : 'Team') : 'Client'} · {fmtDateTime(m.createdAt)}
                      {m.authorType === 'TEAM' && !m.internal && m.readByClientAt && <span className="text-emerald-300">· Read</span>}
                    </div>
                    <div className="text-neutral-200">{m.body}</div>
                  </div>
                ))}
              </div>
              {can('message:reply') && (
                <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); act('POST', `/admin/projects/${id}/messages`, { body: f.get('body'), internal: f.get('internal') === 'on' }); (e.currentTarget as HTMLFormElement).reset(); }} className="space-y-2">
                  <textarea name="body" required rows={2} placeholder="Reply to the client…" className={input} />
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm text-neutral-400"><input type="checkbox" name="internal" className="h-4 w-4" /> Internal note (hidden from client)</label>
                    <button disabled={busy} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60">Send</button>
                  </div>
                </form>
              )}
            </div>
          )}

          {tab === 'Team' && (
            <div className="space-y-3">
              {p.members.map((m: any) => (
                <div key={m.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
                  <div className="min-w-0 flex-1"><div className="font-semibold text-white">{m.name} {!m.clientVisible && <span className="text-xs text-amber-300">· internal</span>}</div><div className="text-xs text-neutral-500">{m.role}</div></div>
                  {can('team:assign') && <button onClick={() => act('DELETE', `/admin/members/${m.id}`)} className="text-neutral-500 hover:text-red-400"><Trash2 size={16} /></button>}
                </div>
              ))}
              {can('team:assign') && (
                <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); act('POST', `/admin/projects/${id}/members`, { name: f.get('name'), role: f.get('role'), clientVisible: f.get('clientVisible') === 'on' }); (e.currentTarget as HTMLFormElement).reset(); }} className="flex flex-wrap gap-2">
                  <input name="name" required placeholder="Name" className={`${input} flex-1`} />
                  <input name="role" required placeholder="Role" className={`${input} w-40`} />
                  <label className="flex items-center gap-1.5 text-xs text-neutral-400"><input type="checkbox" name="clientVisible" defaultChecked className="h-4 w-4" /> visible</label>
                  <button className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-dark"><Plus size={16} /></button>
                </form>
              )}

              <div className="pt-4 text-xs font-semibold uppercase tracking-wider text-neutral-500">Client contacts (portal access)</div>
              {clientUsers.map((u: any) => (
                <div key={u.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface p-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-white">{[u.firstName, u.lastName].filter(Boolean).join(' ') || u.email}</div>
                    <div className="text-xs text-neutral-500">{u.email} · {u.lastLoginAt ? `last in ${fmtDate(u.lastLoginAt)}` : 'never signed in'}</div>
                  </div>
                  {can('team:assign') ? (
                    <select value={u.role} onChange={(e) => act('PATCH', `/admin/client-users/${u.id}`, { role: e.target.value })} className={`${input} w-28`}>
                      <option value="OWNER">Owner</option><option value="MEMBER">Member</option>
                    </select>
                  ) : <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-neutral-300">{u.role}</span>}
                </div>
              ))}
              {can('team:assign') && (
                <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); act('POST', `/admin/projects/${id}/client-users`, { email: f.get('email'), firstName: f.get('firstName'), lastName: f.get('lastName'), role: f.get('role') }); (e.currentTarget as HTMLFormElement).reset(); }} className="flex flex-wrap gap-2">
                  <input name="email" type="email" required placeholder="teammate@client.com" className={`${input} flex-1`} />
                  <input name="firstName" placeholder="First" className={`${input} w-28`} />
                  <input name="lastName" placeholder="Last" className={`${input} w-28`} />
                  <select name="role" className={`${input} w-28`}><option value="MEMBER">Member</option><option value="OWNER">Owner</option></select>
                  <button disabled={busy} className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60">Invite</button>
                </form>
              )}

              {invitations.some((iv: any) => iv.status === 'VALID' || iv.status === 'EXPIRED') && (
                <>
                  <div className="pt-4 text-xs font-semibold uppercase tracking-wider text-neutral-500">Pending invitations</div>
                  {invitations.filter((iv: any) => iv.status === 'VALID' || iv.status === 'EXPIRED').map((iv: any) => (
                    <div key={iv.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-line bg-surface/50 p-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-neutral-200">{iv.email}</div>
                        <div className="text-xs text-neutral-500">{iv.role} · invited {fmtDate(iv.createdAt)}{iv.sendCount > 1 ? ` · sent ${iv.sendCount}×` : ''}</div>
                      </div>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${iv.status === 'EXPIRED' ? 'bg-amber-400/15 text-amber-300' : 'bg-white/10 text-neutral-300'}`}>{iv.status === 'EXPIRED' ? 'Expired' : 'Awaiting setup'}</span>
                      {can('team:assign') && (
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => act('POST', `/admin/client-invitations/${iv.id}/resend`)} className="rounded-md border border-line-strong px-2 py-1 text-xs text-primary-light hover:bg-white/[0.05]">Resend</button>
                          <button onClick={() => act('POST', `/admin/client-invitations/${iv.id}/revoke`)} className="rounded-md border border-line-strong px-2 py-1 text-xs text-neutral-400 hover:bg-white/[0.05]">Revoke</button>
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {tab === 'Files' && (
            <div className="space-y-3">
              {can('file:write') && (
                <form onSubmit={uploadFile} className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface p-4">
                  <input name="file" type="file" required className="text-sm text-neutral-300 file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white" />
                  <select name="category" className={`${input} w-40`}><option value="DELIVERABLE">Deliverable</option><option value="CONTRACT">Contract</option><option value="INVOICE">Invoice</option><option value="OTHER">Other</option></select>
                  <label className="flex items-center gap-1.5 text-xs text-neutral-400"><input type="checkbox" name="clientVisible" defaultChecked className="h-4 w-4" /> client-visible</label>
                  <button disabled={busy} className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60">Upload</button>
                </form>
              )}
              {p.files.length === 0 ? <p className="text-sm text-neutral-500">No files yet.</p> : p.files.map((f: any) => (
                <div key={f.id} className="rounded-xl border border-line bg-surface p-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-white">{f.name} <span className="ml-1 rounded bg-white/[0.07] px-1.5 py-0.5 text-[10px] text-neutral-400">v{f.version}</span> {!f.clientVisible && <span className="text-xs text-amber-300">· internal</span>}</div>
                      <div className="text-xs text-neutral-500">{f.category} · {fmtDate(f.uploadedAt)}</div>
                    </div>
                    {f.version > 1 && <button onClick={() => toggleHistory(f.id)} className="text-xs text-neutral-400 hover:text-white">{historyFor[f.id] ? 'Hide history' : 'History'}</button>}
                    <a href={`${API_BASE}/admin/files/${f.id}/download`} className="text-sm text-primary-light hover:underline">Download</a>
                    {can('file:write') && (
                      <label className="cursor-pointer text-sm text-neutral-300 hover:text-white">
                        New version
                        <input type="file" className="hidden" onChange={(e) => { void uploadVersion(f.id, e.target.files?.[0]); e.currentTarget.value = ''; }} />
                      </label>
                    )}
                    {can('file:write') && <button onClick={() => act('DELETE', `/admin/files/${f.id}`)} className="text-neutral-500 hover:text-red-400"><Trash2 size={16} /></button>}
                  </div>
                  {historyFor[f.id] && (
                    <div className="mt-2 space-y-1 border-t border-line/60 pt-2">
                      {historyFor[f.id]!.map((v: any) => (
                        <div key={v.id} className="flex items-center gap-2 text-xs text-neutral-400">
                          <span className="w-8 font-mono text-neutral-500">v{v.version}</span>
                          <span className="flex-1">{fmtDate(v.uploadedAt)}{v.isCurrent ? ' · current' : ''}{v.deletedAt ? ' · deleted' : ''}</span>
                          {!v.deletedAt && <a href={`${API_BASE}/admin/files/${v.id}/download`} className="text-primary-light hover:underline">download</a>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {tab === 'Invoices' && (
            <div className="space-y-4">
              {p.invoices.length === 0 ? <p className="text-sm text-neutral-500">No invoices yet.</p> : p.invoices.map((inv: any) => (
                <div key={inv.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface p-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-white">{inv.number}</div>
                    <div className="text-xs text-neutral-500">{inv.status === 'VOIDED' ? 'Voided' : inv.status === 'PAID' ? `Paid ${fmtDate(inv.paidAt)}` : inv.dueAt ? `Due ${fmtDate(inv.dueAt)}` : 'No due date'}</div>
                  </div>
                  <div className="font-bold text-white">{fmtMoney(inv.amountCents, inv.currency)}</div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${inv.status === 'PAID' ? 'bg-emerald-400/15 text-emerald-300' : inv.status === 'OVERDUE' ? 'bg-red-500/15 text-red-300' : inv.status === 'SENT' ? 'bg-amber-400/15 text-amber-300' : inv.status === 'VOIDED' ? 'bg-white/5 text-neutral-500 line-through' : 'bg-white/10 text-neutral-300'}`}>{inv.status}</span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {inv.status !== 'DRAFT' && <a href={`${API_BASE}/admin/invoices/${inv.id}/pdf`} target="_blank" rel="noopener noreferrer" className="rounded-md border border-line-strong px-2 py-1 text-xs text-neutral-200 hover:bg-white/[0.05]">PDF</a>}
                    {can('invoice:write') && <>
                      {inv.status === 'DRAFT' && <button onClick={() => act('PATCH', `/admin/invoices/${inv.id}`, { status: 'SENT' })} className="rounded-md border border-line-strong px-2 py-1 text-xs text-neutral-200 hover:bg-white/[0.05]">Send</button>}
                      {inv.status !== 'PAID' && inv.status !== 'VOIDED' && !inv.paymentUrl && <button onClick={() => act('POST', `/admin/invoices/${inv.id}/payment-link`)} className="rounded-md border border-line-strong px-2 py-1 text-xs text-primary-light hover:bg-white/[0.05]">Payment link</button>}
                      {inv.paymentUrl && inv.status !== 'PAID' && inv.status !== 'VOIDED' && <a href={inv.paymentUrl} target="_blank" rel="noopener noreferrer" className="rounded-md border border-primary/40 px-2 py-1 text-xs text-primary-light hover:bg-white/[0.05]">Link ✓</a>}
                      {inv.status !== 'PAID' && inv.status !== 'VOIDED' && <button onClick={() => act('PATCH', `/admin/invoices/${inv.id}`, { status: 'PAID' })} className="rounded-md border border-line-strong px-2 py-1 text-xs text-emerald-300 hover:bg-white/[0.05]">Mark paid</button>}
                      {(inv.status === 'SENT') && <button onClick={() => act('PATCH', `/admin/invoices/${inv.id}`, { status: 'OVERDUE' })} className="rounded-md border border-line-strong px-2 py-1 text-xs text-red-300 hover:bg-white/[0.05]">Overdue</button>}
                      {(inv.status === 'SENT' || inv.status === 'OVERDUE') && <button onClick={() => setVoidInv({ id: inv.id, number: inv.number })} className="rounded-md border border-line-strong px-2 py-1 text-xs text-neutral-400 hover:bg-white/[0.05]">Void</button>}
                    </>}
                  </div>
                </div>
              ))}

              {can('invoice:write') && (
                <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); void createInvoice({ number: String(f.get('number') || ''), currency: String(f.get('currency') || 'USD'), status: String(f.get('status') || 'DRAFT'), dueAt: String(f.get('dueAt') || ''), billingContactUserId: String(f.get('billingContactUserId') || '') }); }} className="space-y-3 rounded-2xl border border-line bg-surface p-5">
                  <div className="text-sm font-semibold text-white">New invoice</div>
                  <div className="flex flex-wrap gap-2">
                    <input name="number" required placeholder="Invoice # e.g. INV-001" className={`${input} flex-1`} />
                    <input name="currency" defaultValue="USD" maxLength={3} className={`${input} w-20`} />
                    <select name="status" className={`${input} w-28`}><option value="DRAFT">Draft</option><option value="SENT">Send now</option></select>
                    <input name="dueAt" type="date" className={`${input} w-40`} />
                    <select name="billingContactUserId" className={`${input} w-52`} title="Billing contact">
                      <option value="">— billing contact —</option>
                      {clientUsers.map((u: any) => <option key={u.id} value={u.id}>{[u.firstName, u.lastName].filter(Boolean).join(' ') || u.email}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    {invLines.map((l, i) => (
                      <div key={i} className="flex flex-wrap gap-2">
                        <input value={l.description} onChange={(e) => setInvLines((s) => s.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} placeholder="Description" className={`${input} flex-1`} />
                        <input value={l.quantity} onChange={(e) => setInvLines((s) => s.map((x, j) => j === i ? { ...x, quantity: e.target.value } : x))} type="number" min={1} placeholder="Qty" className={`${input} w-20`} />
                        <input value={l.unit} onChange={(e) => setInvLines((s) => s.map((x, j) => j === i ? { ...x, unit: e.target.value } : x))} type="number" min={0} step="0.01" placeholder="Unit $" className={`${input} w-28`} />
                        <select value={l.milestoneId} onChange={(e) => setInvLines((s) => s.map((x, j) => j === i ? { ...x, milestoneId: e.target.value } : x))} className={`${input} w-40`}>
                          <option value="">— milestone —</option>
                          {p.milestones.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                        {invLines.length > 1 && <button type="button" onClick={() => setInvLines((s) => s.filter((_, j) => j !== i))} className="text-neutral-500 hover:text-red-400"><Trash2 size={16} /></button>}
                      </div>
                    ))}
                    <button type="button" onClick={() => setInvLines((s) => [...s, { description: '', quantity: '1', unit: '', milestoneId: '' }])} className="inline-flex items-center gap-1 text-xs font-semibold text-primary-light hover:underline"><Plus size={13} /> Add line</button>
                  </div>
                  <button disabled={busy} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60">Create invoice</button>
                </form>
              )}
            </div>
          )}

          {tab === 'Care Plan' && (() => {
            // Relationship-level retainer (Phase 3, additive to project/milestone billing). Recurring
            // RETAINER-invoice generation is P3.2; this tab models + controls the plan only.
            const plans: any[] = p.clientOrg?.carePlans ?? [];
            const plan = plans.find((c) => !['CANCELED', 'COMPLETED'].includes(c.status)) ?? null;
            const writable = can('invoice:write');
            const move = (status: string) => act('PATCH', `/admin/care-plans/${plan.id}`, { status });
            return (
              <div className="space-y-4">
                {plan ? (
                  <div className="rounded-2xl border border-line bg-surface p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-white">{plan.name}</h3>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${CARE_PLAN_TONE[plan.status] ?? 'bg-white/10 text-neutral-300'}`}>{plan.status}</span>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-neutral-300 sm:grid-cols-2">
                      <div><span className="text-neutral-500">Monthly:</span> {fmtMoney(plan.monthlyAmountCents, plan.currency)}</div>
                      <div><span className="text-neutral-500">Auto-pay:</span> {plan.autoPay ? 'On' : 'Off — Stripe not wired (P3.5)'}</div>
                      {plan.status === 'ACTIVE' && <div><span className="text-neutral-500">Next invoice:</span> {plan.nextInvoiceAt ? fmtDate(plan.nextInvoiceAt) : '—'}</div>}
                      <div><span className="text-neutral-500">Billing day:</span> {plan.status === 'DRAFT' ? 'set on activation' : plan.billingAnchorDay}</div>
                      {plan.nextReportAt && <div className="sm:col-span-2"><span className="text-neutral-500">Next report:</span> {fmtDate(plan.nextReportAt)}{plan.nextReportNote ? ` · ${plan.nextReportNote}` : ''}</div>}
                    </div>
                    {plan.includedSummary && <p className="mt-3 whitespace-pre-wrap rounded-lg bg-white/[0.03] p-3 text-sm text-neutral-300">{plan.includedSummary}</p>}
                    <p className="mt-3 text-xs text-neutral-600">Recurring invoice generation is not live yet (P3.2). Activating sets the billing cursor; no invoices are created until the worker slice ships.</p>
                    {writable && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {plan.status === 'DRAFT' && <button onClick={() => move('ACTIVE')} disabled={busy} className="rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60">Activate</button>}
                        {plan.status === 'ACTIVE' && <button onClick={() => move('PAUSED')} disabled={busy} className="rounded-lg border border-line-strong px-3.5 py-2 text-sm font-semibold text-neutral-200 hover:bg-white/[0.05] disabled:opacity-60">Pause</button>}
                        {plan.status === 'PAUSED' && <button onClick={() => move('ACTIVE')} disabled={busy} className="rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60">Reactivate</button>}
                        {(plan.status === 'ACTIVE' || plan.status === 'PAUSED') && <button onClick={() => move('COMPLETED')} disabled={busy} className="rounded-lg border border-line-strong px-3.5 py-2 text-sm font-semibold text-neutral-200 hover:bg-white/[0.05] disabled:opacity-60">Complete</button>}
                        <button onClick={() => move('CANCELED')} disabled={busy} className="rounded-lg border border-line-strong px-3.5 py-2 text-sm font-semibold text-red-300 hover:bg-red-400/10 disabled:opacity-60">Cancel</button>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {plans.length > 0 && <div className="rounded-xl border border-line bg-surface p-3 text-sm text-neutral-400">Previous plan: {plans[0].name} · <span className="text-neutral-500">{plans[0].status}</span></div>}
                    {writable ? (
                      <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); const dollars = parseFloat(String(f.get('amount') || '')); if (!String(f.get('name') || '').trim() || !(dollars >= 0)) return; act('POST', `/admin/projects/${id}/care-plans`, { name: f.get('name'), monthlyAmountCents: Math.round(dollars * 100), currency: String(f.get('currency') || 'USD').toUpperCase(), includedSummary: f.get('includedSummary') || undefined, nextReportAt: f.get('nextReportAt') || undefined, nextReportNote: f.get('nextReportNote') || undefined }); (e.currentTarget as HTMLFormElement).reset(); }} className="space-y-3 rounded-2xl border border-line bg-surface p-5">
                        <h3 className="text-sm font-bold text-white">New Care Plan</h3>
                        <input name="name" required placeholder="Plan name (e.g. Care Plan — Growth)" className={input} />
                        <div className="flex gap-2">
                          <input name="amount" type="number" min="0" step="0.01" required placeholder="Monthly amount" className={input} />
                          <input name="currency" defaultValue="USD" maxLength={3} className="w-24 shrink-0 rounded-lg border border-line-strong bg-white/[0.03] px-3 py-2 text-sm uppercase text-white" />
                        </div>
                        <textarea name="includedSummary" rows={3} placeholder="What's included (scope / hours) — shown to the client" className={input} />
                        <div className="flex flex-wrap gap-2">
                          <input name="nextReportAt" type="date" className="rounded-lg border border-line-strong bg-white/[0.03] px-3 py-2 text-sm text-white" />
                          <input name="nextReportNote" placeholder="Next report note (optional)" className={`${input} flex-1`} />
                        </div>
                        <button disabled={busy} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60">Create Care Plan (draft)</button>
                      </form>
                    ) : <p className="text-neutral-400">No Care Plan. Billing permission is required to create one.</p>}
                  </>
                )}
              </div>
            );
          })()}

          {tab === 'Activity' && (
            <ul className="space-y-2.5">
              {p.activities.map((a: any, i: number) => (
                <li key={i} className="flex items-start gap-2.5 text-sm"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-light" /><div><div className="text-neutral-200">{a.message}</div><div className="text-xs text-neutral-600">{fmtDateTime(a.createdAt)}</div></div></li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {voidInv && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-4" onClick={() => setVoidInv(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl border border-line bg-surface p-5 shadow-card">
            <h3 className="text-base font-bold text-white">Void {voidInv.number}?</h3>
            <p className="mt-2 text-sm text-neutral-400">This cancels the invoice — it drops off the client&rsquo;s payable list and no payment is recorded. This can&rsquo;t be undone here.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setVoidInv(null)} className="rounded-lg border border-line-strong px-3.5 py-2 text-sm font-semibold text-neutral-200 hover:bg-white/[0.05]">Cancel</button>
              <button onClick={() => { const v = voidInv; setVoidInv(null); act('PATCH', `/admin/invoices/${v.id}`, { status: 'VOIDED' }); }} className="rounded-lg bg-red-500/90 px-3.5 py-2 text-sm font-semibold text-white hover:bg-red-500">Void invoice</button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
