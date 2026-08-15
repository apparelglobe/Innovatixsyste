/**
 * Single source of truth for a proposal's lifecycle stage and every status-dependent
 * string that hangs off it. Screens NEVER infer a stage or hardcode stage copy locally —
 * they call deriveStage() and read from STAGE. This is the fix for the copy-drift class
 * of bugs (e.g. "activation proceeds once paid" showing on an already-paid deal).
 *
 * The stage is DERIVED from four signals, not from proposal.status alone:
 *   proposal.status + contract.status + deposit-invoice.status + clientOrgId.
 * Later gates win (activated > paid > signed > accepted).
 */

export type Stage =
  // happy path, in order
  | 'DRAFT' | 'SENT' | 'VIEWED' | 'ACCEPTED' | 'SIGNED' | 'PAID' | 'ACTIVATED'
  // off the happy path
  | 'CHANGES_REQUESTED' | 'DECLINED' | 'EXPIRED';

export type Tone = 'neutral' | 'info' | 'progress' | 'success' | 'warn' | 'bad';

/** The happy-path lifecycle in order — drives the horizontal status rail. */
export const RAIL: Stage[] = ['DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'SIGNED', 'PAID', 'ACTIVATED'];

type StageMeta = {
  label: string;          // pill / rail label
  tone: Tone;             // color family
  staff: string;          // staff detail status line
  prospectTitle?: string; // prospect terminal-card heading (where a prospect can land here)
  prospectBody?: string;  // prospect terminal-card body
};

export const STAGE: Record<Stage, StageMeta> = {
  DRAFT: {
    label: 'Draft', tone: 'neutral',
    staff: 'Draft — not sent yet. Assemble the line items and send when ready.',
  },
  SENT: {
    label: 'Sent', tone: 'info',
    staff: 'Sent — the prospect was emailed a secure link to review.',
  },
  VIEWED: {
    label: 'Viewed', tone: 'info',
    staff: 'Viewed — the prospect has opened the proposal.',
  },
  ACCEPTED: {
    label: 'Accepted', tone: 'progress',
    staff: 'Accepted — awaiting the signed agreement and deposit to activate.',
    prospectTitle: "You've already accepted this proposal",
    prospectBody: "Continue to your agreement and deposit — you'll pick up right where you left off.",
  },
  SIGNED: {
    label: 'Signed', tone: 'progress',
    staff: 'Agreement signed — awaiting the activation deposit.',
    prospectTitle: 'Agreement signed — thank you',
    prospectBody: 'One last step to kick things off: the activation deposit.',
  },
  PAID: {
    label: 'Paid', tone: 'success',
    staff: 'Deposit paid — activating the client…',
    prospectTitle: "You're all set — welcome aboard",
    prospectBody: 'Your deposit is in and your project is activated. Check your email for the link to set up your workspace login.',
  },
  ACTIVATED: {
    label: 'Activated', tone: 'success',
    staff: 'Activated — client onboarded and the engagement project created.',
    prospectTitle: "You're all set — welcome aboard",
    prospectBody: 'Your deposit is in and your project is activated. Check your email for the link to set up your workspace login.',
  },
  CHANGES_REQUESTED: {
    label: 'Changes requested', tone: 'warn',
    staff: 'The prospect requested changes — edit the proposal and re-send.',
  },
  DECLINED: {
    label: 'Declined', tone: 'bad',
    staff: 'This proposal was declined.',
    prospectTitle: 'This proposal was declined',
    prospectBody: "If that wasn't intended, contact your Innovatix representative.",
  },
  EXPIRED: {
    label: 'Expired', tone: 'neutral',
    staff: 'The review link expired — re-send to issue a fresh one.',
    prospectTitle: 'This proposal link has expired',
    prospectBody: 'Ask your Innovatix contact to resend it — your details are saved.',
  },
};

/** Pill / rail color classes per tone (dark house theme). */
export const TONE_CLASS: Record<Tone, string> = {
  neutral: 'bg-white/10 text-neutral-300',
  info: 'bg-blue-500/15 text-blue-300',
  progress: 'bg-indigo-500/15 text-indigo-300',
  success: 'bg-emerald-500/15 text-emerald-300',
  warn: 'bg-amber-500/15 text-amber-300',
  bad: 'bg-red-500/15 text-red-300',
};

/** Derive the one lifecycle stage from all the signals. Later gates win.
 *  ACTIVATED keys off the RECORDED `activatedAt`, not `clientOrgId` — so pre-migration
 *  rows (org set, activatedAt null) read as PAID, consistent with the evidence-gated rail. */
export function deriveStage(p: {
  status: string;
  contractStatus?: string | null;
  depositStatus?: string | null;
  activatedAt?: string | null;
}): Stage {
  if (p.activatedAt) return 'ACTIVATED';
  if (p.depositStatus === 'PAID') return 'PAID';
  if (p.contractStatus === 'SIGNED') return 'SIGNED';
  if (p.status === 'DECLINED') return 'DECLINED';
  if (p.status === 'EXPIRED') return 'EXPIRED';
  if (p.status === 'CHANGES_REQUESTED') return 'CHANGES_REQUESTED';
  if (p.status === 'ACCEPTED') return 'ACCEPTED';
  if (p.status === 'VIEWED') return 'VIEWED';
  if (p.status === 'SENT') return 'SENT';
  return 'DRAFT';
}

/** Rail position (0-based) for a stage, or null if it's off the happy path. */
export function railIndex(stage: Stage): number | null {
  const i = RAIL.indexOf(stage);
  return i === -1 ? null : i;
}

/**
 * Per-node evidence: a rail node is "complete" ONLY if its own event is on record —
 * never inferred from a later stage being reached. Prevents a rail node asserting an
 * event (e.g. "Viewed") the record says never happened.
 */
export function stageEvidence(f: {
  sentAt?: string | null; viewedAt?: string | null; acceptedAt?: string | null;
  contractStatus?: string | null; depositStatus?: string | null; activatedAt?: string | null;
}): Record<Stage, boolean> {
  return {
    DRAFT: true, // the proposal exists
    SENT: !!f.sentAt,
    VIEWED: !!f.viewedAt,
    ACCEPTED: !!f.acceptedAt,
    SIGNED: f.contractStatus === 'SIGNED',
    PAID: f.depositStatus === 'PAID',
    ACTIVATED: !!f.activatedAt,
    // off-path stages carry no positive happy-path evidence
    CHANGES_REQUESTED: false,
    DECLINED: false,
    EXPIRED: false,
  };
}
