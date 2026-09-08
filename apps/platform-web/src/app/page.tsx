'use client';

/**
 * Relationship Home (Slice 1). A card PER project (the aggregate) + one money-free Care Plan band.
 * Uses the additive /portal/relationship-overview + useRelationship (me + lean projects list) — NOT the
 * legacy /portal/project. Care Plan is a single relationship band, not per-card, so each card's next
 * action is derived from project-level signals only. Approvals are decided on /projects/:id; the
 * relationship activity feed (Slice 2) is the org-wide curated timeline below the project cards.
 */
import { useCallback, useEffect, useState } from 'react';
import { Loader2, Clock, ArrowRight, ArrowUpRight } from 'lucide-react';
import { PortalShell } from '@/components/PortalShell';
import { apiJson } from '@/lib/portal-api';
import { Timestamp } from '@/components/Timestamp';
import { ActivityTimeline } from '@/components/ActivityTimeline';
import { useRelationship } from '@/lib/useRelationship';
import { deriveWorkspaceState, type ProjectStatus } from '@/lib/workspace-stage';
import { TONE_CLASS } from '@/lib/proposal-stage';
import type { ActivityItem } from '@/lib/usePortal';

type Card = {
  id: string; name: string; status: string; percentComplete: number; dueDate: string | null;
  nextUpdateAt?: string | null; nextUpdateNote?: string | null;
  milestonesDone: number; milestonesTotal: number;
  nextMilestone?: { name: string; dueDate: string | null } | null;
  openApprovals: number;
  pendingApproval?: { id: string; subject: string; type?: string | null } | null;
  payableInvoice: { id: string; number: string; amountCents: number; overdue?: boolean } | null;
};
type CarePlan = { active: boolean; nextReportAt?: string | null } | null;

export default function HomePage() {
  const { me, projects, userName, canBilling, isOwner, loading } = useRelationship();
  const [cards, setCards] = useState<Card[] | undefined>(undefined);
  const [carePlan, setCarePlan] = useState<CarePlan>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  const load = useCallback(async () => {
    const [rel, act] = await Promise.all([
      apiJson<{ projects: Card[]; carePlan: CarePlan }>('/portal/relationship-overview'),
      apiJson<{ activities: ActivityItem[] }>('/portal/relationship-activity'),
    ]);
    if (rel.status === 200) { setCards(rel.body.projects); setCarePlan(rel.body.carePlan ?? null); }
    if (act.status === 200) setActivity(act.body.activities ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const firstName = me?.user.firstName || '';
  const ready = !!me && !loading && cards !== undefined;

  return (
    <PortalShell orgName={me?.org.name ?? ''} userName={userName} active="overview" billingAllowed={canBilling} projects={projects}>
      <div className="mx-auto max-w-4xl">
        {!ready ? (
          <div className="grid place-items-center py-24 text-neutral-400"><Loader2 className="animate-spin" /></div>
        ) : (
          <>
            <p className="text-sm text-neutral-500">Welcome back{firstName ? `, ${firstName}` : ''}</p>

            {carePlan?.active && (
              <section className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.06] p-4">
                <div>
                  <div className="text-sm font-bold text-white">Care Plan active — we&rsquo;ve got you covered</div>
                  <div className="text-xs text-neutral-400">We&rsquo;re monitoring and supporting your account.</div>
                </div>
                {carePlan.nextReportAt && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-neutral-200">
                    <Clock size={13} className="text-emerald-300" /> Next report <Timestamp value={carePlan.nextReportAt} className="font-semibold text-white" />
                  </span>
                )}
              </section>
            )}

            <h1 className="mt-6 text-lg font-extrabold tracking-tight text-white">Your projects</h1>
            {(cards ?? []).length === 0 ? (
              <div className="mt-3 rounded-2xl border border-line bg-surface p-6 text-neutral-400">
                No active projects yet. Your delivery team will set this up shortly.
              </div>
            ) : (
              <div className="mt-3 space-y-4">
                {(cards ?? []).map((c) => <ProjectCard key={c.id} card={c} isOwner={isOwner} />)}
              </div>
            )}

            {activity.length > 0 && (
              <section className="mt-8">
                <h2 className="text-lg font-extrabold tracking-tight text-white">Recent activity</h2>
                <p className="mt-0.5 text-sm text-neutral-500">Milestones and moments across your relationship with us.</p>
                <div className="mt-3"><ActivityTimeline items={activity} /></div>
              </section>
            )}
          </>
        )}
      </div>
    </PortalShell>
  );
}

function ProjectCard({ card: c, isOwner }: { card: Card; isOwner: boolean }) {
  const state = deriveWorkspaceState({
    projectStatus: c.status as ProjectStatus,
    pendingApproval: c.pendingApproval ?? null,
    payableInvoice: c.payableInvoice ?? null,
    carePlan: null, // relationship band, not per-card
    nextUpdateAt: c.nextUpdateAt,
    nextUpdateNote: c.nextUpdateNote,
  });
  return (
    <section className={`rounded-2xl border p-5 ${state.turn === 'YOU' ? 'border-primary/40 bg-primary/[0.06]' : 'border-line bg-surface'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${TONE_CLASS[state.tone]}`}>{state.statusLabel}</span>
        <a href={`/projects/${c.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-neutral-300 transition hover:text-white">{c.name} <ArrowUpRight size={14} /></a>
      </div>
      <h2 className="mt-2.5 text-base font-bold text-white">{state.title}</h2>
      <p className="mt-1 text-sm leading-relaxed text-neutral-300">{state.body}</p>

      {state.nextUpdate && (
        <p className="mt-2.5 inline-flex flex-wrap items-center gap-1.5 rounded-lg bg-white/[0.04] px-3 py-1.5 text-xs text-neutral-200">
          <Clock size={13} className="text-primary-light" /> {state.nextUpdate.label ?? 'Next update by'} <Timestamp value={state.nextUpdate.at} withZone className="font-semibold text-white" />
        </p>
      )}

      {state.action && (
        <div className="mt-3">
          {state.action.ownerOnly && !isOwner ? (
            <p className="text-xs text-amber-400/90">Only an account owner can {state.action.kind === 'invoice' ? 'pay this' : 'approve this'}.</p>
          ) : (
            <a href={state.action.kind === 'invoice' && state.action.href ? state.action.href : `/projects/${c.id}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-white shadow-cta transition-colors hover:bg-primary-dark">
              {state.action.label} <ArrowRight size={14} />
            </a>
          )}
        </div>
      )}

      {state.turn !== 'DONE' && c.milestonesTotal > 0 && (
        <div className="mt-4 border-t border-line pt-3">
          <div className="flex items-end justify-between gap-3">
            <span className="text-xs text-neutral-500">{c.milestonesDone} of {c.milestonesTotal} milestones{c.nextMilestone ? ` · next: ${c.nextMilestone.name}` : ''}</span>
            <span className="text-sm font-bold leading-none text-white">{c.percentComplete}%</span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-brand-gradient" style={{ width: `${c.percentComplete}%` }} /></div>
        </div>
      )}
    </section>
  );
}
