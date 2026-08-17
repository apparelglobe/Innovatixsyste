/**
 * Single source of truth for the ACTIVE-client workspace: the one primary status and the
 * one clear next action shown on Home. Screens never infer status or hardcode this copy —
 * they call deriveWorkspaceState() and render what it returns. This is the active-stage
 * sibling of proposal-stage.ts (the prospect stage), sharing its Tone vocabulary.
 *
 * Canon §6: every login must answer "What is happening?" and "What do I need to do next?"
 *   - YOUR TURN  → the client must act (approve a deliverable, pay an invoice, upload files).
 *   - OUR TURN   → Innovatix is working; the card says so AND (when set) gives the next
 *                  expected update, so silence never reads as neglect ("never goes dark").
 *
 * The state is DERIVED from the live signals, not from Project.status alone. Client actions
 * win over "our turn", and among competing client actions the most-pressing wins.
 */

import { fmtMoney } from './fmt';
import type { Tone } from './proposal-stage';

/** Delivery phase enum (mirrors the API ProjectStatus; kept local so the client bundle
 *  doesn't import Prisma). */
export type ProjectStatus = 'DISCOVERY' | 'IN_PROGRESS' | 'UAT' | 'LAUNCHED' | 'ON_HOLD' | 'COMPLETE';

/** Whose move it is. YOU = client action required; US = we're working; PAUSED = on hold;
 *  DONE = terminal (complete). */
export type Turn = 'YOU' | 'US' | 'PAUSED' | 'DONE';

/** The one clear next action. `href` is set for navigate-style actions (pay → invoice page);
 *  approval is decided inline on Home, so it carries only the targetId. `ownerOnly` actions
 *  (pay / approve) render as an "ask an account owner" note for non-owners. */
export type NextAction = {
  kind: 'approval' | 'invoice' | 'upload';
  label: string;
  targetId: string;
  href?: string;
  ownerOnly: boolean;
};

export type WorkspaceState = {
  turn: Turn;
  tone: Tone;
  /** Short primary-status line: "Your turn" while YOU act; the delivery phase otherwise. */
  statusLabel: string;
  /** Card headline — the specific thing happening / to do. */
  title: string;
  /** Sub-copy. Self-sufficient: reads correctly even when no next-update date is set. */
  body: string;
  /** The single next action, or null when it's our turn / paused / done. */
  action: NextAction | null;
  /** Only populated while turn === 'US' AND staff have committed a date. Null otherwise —
   *  the card must degrade gracefully (body already conveys "we're on it"). */
  nextUpdate: { at: string; note?: string | null } | null;
};

/** Signals the engine derives from — assembled from /portal/overview (+ the S3 next-update
 *  fields). `payableInvoice`/`pendingApproval` are the two client-action triggers today;
 *  `upload` is reserved for a future "requested files" feature. */
export type WorkspaceSignals = {
  projectStatus: ProjectStatus;
  pendingApproval?: { id: string; subject: string; type?: string | null } | null;
  payableInvoice?: { id: string; number: string; amountCents: number; overdue?: boolean } | null;
  nextUpdateAt?: string | null;
  nextUpdateNote?: string | null;
};

/** Button copy per approval type; falls back to a generic review label. */
const APPROVAL_LABEL: Record<string, string> = {
  MILESTONE: 'Review & approve',
  DELIVERABLE: 'Review the deliverable',
  UAT: 'Sign off on testing',
  CHANGE_REQUEST: 'Review the change',
  DEPLOYMENT: 'Approve the deployment',
};

/** Delivery-phase → "our turn"/terminal copy. Mapped from the coarse ProjectStatus enum onto
 *  the Canon §6 Our-Turn vocabulary. Each body is self-sufficient without a next-update date. */
const PHASE: Record<ProjectStatus, { turn: Turn; tone: Tone; statusLabel: string; title: string; body: string }> = {
  DISCOVERY: {
    turn: 'US', tone: 'progress', statusLabel: 'Discovery in progress',
    title: "We're getting started", body: 'Your team is scoping the work and setting up your project.',
  },
  IN_PROGRESS: {
    turn: 'US', tone: 'progress', statusLabel: 'Development in progress',
    title: "We're building your project", body: "Development is underway — we'll flag anything that needs you.",
  },
  UAT: {
    turn: 'US', tone: 'info', statusLabel: 'Quality assurance',
    title: "We're testing before launch", body: 'Your project is in quality assurance to make sure everything works.',
  },
  LAUNCHED: {
    turn: 'US', tone: 'success', statusLabel: 'Monitoring & support',
    title: "Live — we've got you covered", body: "Your project is launched. We're monitoring it and here whenever you need us.",
  },
  ON_HOLD: {
    turn: 'PAUSED', tone: 'warn', statusLabel: 'On hold',
    title: 'This project is on hold', body: 'Work is paused for now. Your team will reach out about next steps.',
  },
  COMPLETE: {
    turn: 'DONE', tone: 'success', statusLabel: 'Complete',
    title: 'Project complete', body: 'This engagement is wrapped up — thank you for working with us.',
  },
};

function approvalState(a: { id: string; subject: string; type?: string | null }): WorkspaceState {
  return {
    turn: 'YOU', tone: 'warn', statusLabel: 'Your turn',
    title: a.subject || 'Your approval is needed',
    body: 'Your delivery team is waiting on your review to move forward.',
    action: { kind: 'approval', label: APPROVAL_LABEL[a.type ?? ''] ?? 'Review & approve', targetId: a.id, ownerOnly: true },
    nextUpdate: null,
  };
}

function payInvoiceState(inv: { id: string; number: string; amountCents: number }, overdue: boolean): WorkspaceState {
  return {
    turn: 'YOU', tone: overdue ? 'bad' : 'warn', statusLabel: 'Your turn',
    title: overdue ? `Invoice ${inv.number} is overdue` : `Invoice ${inv.number} is due`,
    body: overdue
      ? 'This payment is past due — settling it keeps your project moving.'
      : 'A payment is due to keep your project moving.',
    action: { kind: 'invoice', label: `Pay ${fmtMoney(inv.amountCents)}`, targetId: inv.id, href: `/invoices/${inv.id}`, ownerOnly: true },
    nextUpdate: null,
  };
}

/**
 * Derive the one workspace state from all signals. Priority (client actions win, most-pressing
 * first): overdue invoice → pending approval → invoice due → the delivery phase (our turn /
 * paused / done). Adjust this chain to change which single action surfaces when several compete.
 */
export function deriveWorkspaceState(s: WorkspaceSignals): WorkspaceState {
  const inv = s.payableInvoice ?? null;

  if (inv && inv.overdue) return payInvoiceState(inv, true);
  if (s.pendingApproval) return approvalState(s.pendingApproval);
  if (inv) return payInvoiceState(inv, false);

  const phase = PHASE[s.projectStatus] ?? PHASE.IN_PROGRESS;
  return {
    turn: phase.turn, tone: phase.tone, statusLabel: phase.statusLabel,
    title: phase.title, body: phase.body, action: null,
    // The next-update promise only applies while WE hold the ball, and only once staff set it.
    nextUpdate: phase.turn === 'US' && s.nextUpdateAt ? { at: s.nextUpdateAt, note: s.nextUpdateNote ?? null } : null,
  };
}
