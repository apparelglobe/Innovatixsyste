import type { LucideIcon } from 'lucide-react';
import { Send, CheckCircle2, PenLine, BadgeCheck, Rocket, PartyPopper, Circle } from 'lucide-react';
import type { Tone } from './proposal-stage';

/**
 * S4 — visual treatment (tone + icon) per curated relationship-timeline moment. The moment TYPE
 * keys mirror apps/api/src/lib/relationship-moments.ts (MOMENT) — keep the two in sync. The row's
 * client-voice label comes from the stored PortalActivity.message; this map only styles the row.
 */
export const MOMENT_META: Record<string, { tone: Tone; icon: LucideIcon }> = {
  PROPOSAL_SENT: { tone: 'info', icon: Send },
  PROPOSAL_ACCEPTED: { tone: 'progress', icon: CheckCircle2 },
  AGREEMENT_SIGNED: { tone: 'progress', icon: PenLine },
  ACTIVATION_PAYMENT_RECEIVED: { tone: 'success', icon: BadgeCheck },
  PROJECT_STARTED: { tone: 'success', icon: Rocket },
  MILESTONE_APPROVED: { tone: 'success', icon: CheckCircle2 },
  PROJECT_LAUNCHED: { tone: 'success', icon: PartyPopper },
  RETAINER_ACTIVATED: { tone: 'success', icon: BadgeCheck },
  NEW_PROJECT_STARTED: { tone: 'info', icon: Rocket },
};

export const MOMENT_FALLBACK: { tone: Tone; icon: LucideIcon } = { tone: 'neutral', icon: Circle };
