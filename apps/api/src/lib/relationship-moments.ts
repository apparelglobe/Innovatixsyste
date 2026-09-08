/**
 * S4 — the curated relationship-timeline vocabulary (Canon §6 allow-list).
 *
 * Single source of truth used to EMIT curated PortalActivity rows and to FILTER the client feed
 * down to meaningful relationship moments only (never raw system events). The client timeline
 * shows ONLY these types; every other PortalActivity row stays internal (admin/staff view).
 *
 * The frontend mirrors these string values in apps/platform-web/src/lib/relationship-moment.ts
 * (tone + icon per moment) — keep the two in sync.
 */
export const MOMENT = {
  PROPOSAL_SENT: 'PROPOSAL_SENT',
  PROPOSAL_ACCEPTED: 'PROPOSAL_ACCEPTED',
  AGREEMENT_SIGNED: 'AGREEMENT_SIGNED',
  ACTIVATION_PAYMENT_RECEIVED: 'ACTIVATION_PAYMENT_RECEIVED',
  PROJECT_STARTED: 'PROJECT_STARTED',
  MILESTONE_APPROVED: 'MILESTONE_APPROVED',
  PROJECT_LAUNCHED: 'PROJECT_LAUNCHED',
  // Reserved — no producer until Phase 3 (retainers) / Phase 4 (multi-project). Listed so the
  // allow-list filter already accepts them when those phases wire the emitters.
  RETAINER_ACTIVATED: 'RETAINER_ACTIVATED',
  NEW_PROJECT_STARTED: 'NEW_PROJECT_STARTED',
} as const;

export type MomentType = (typeof MOMENT)[keyof typeof MOMENT];

/** The allow-list the client relationship timeline filters to. */
export const CURATED_MOMENT_TYPES: string[] = Object.values(MOMENT);

/** The five moments synthesized (back-dated to their real timestamps) at activation. */
export const BACKFILL_MOMENT_TYPES: string[] = [
  MOMENT.PROPOSAL_SENT,
  MOMENT.PROPOSAL_ACCEPTED,
  MOMENT.AGREEMENT_SIGNED,
  MOMENT.ACTIVATION_PAYMENT_RECEIVED,
  MOMENT.PROJECT_STARTED,
];

/** Client-voice copy per moment (base text; emitters may append a specific, e.g. a milestone name). */
export const MOMENT_MESSAGE: Record<string, string> = {
  [MOMENT.PROPOSAL_SENT]: 'Proposal sent',
  [MOMENT.PROPOSAL_ACCEPTED]: 'Proposal accepted',
  [MOMENT.AGREEMENT_SIGNED]: 'Agreement signed',
  [MOMENT.ACTIVATION_PAYMENT_RECEIVED]: 'Activation payment received',
  [MOMENT.PROJECT_STARTED]: 'Project started',
  [MOMENT.MILESTONE_APPROVED]: 'Milestone approved',
  [MOMENT.PROJECT_LAUNCHED]: 'Project launched',
  // P3.4 — static + money-free (rendered to all roles on the client timeline; never embed price/amount).
  [MOMENT.RETAINER_ACTIVATED]: 'Care Plan activated — monitoring & support',
  // Slice 2 — relationship-level (projectId=null): the engagement expanded to another project. Emitters
  // may append the new project's name; this is the base copy.
  [MOMENT.NEW_PROJECT_STARTED]: 'New project started',
};
