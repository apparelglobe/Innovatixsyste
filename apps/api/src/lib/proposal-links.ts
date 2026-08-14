/**
 * Secure-link helpers for proposals — the ClientInvitation token pattern applied to
 * proposals. Token generation + hashing are reused verbatim from the invitation lib
 * (they carry no invitation-specific logic; only the raw token ever leaves the server,
 * and only inside the emailed link). Only the status derivation is proposal-shaped.
 */
export { generateInvitationToken as generateProposalToken, hashInvitationToken as hashProposalToken } from './invitations';

export type ProposalLinkStatus = 'VALID' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'INVALID';

/**
 * Derive a proposal secure-link's reviewable status.
 * CHANGES_REQUESTED stays VALID (staff revise + resend without a new link).
 * A null expiresAt means no link was ever issued (still DRAFT) → not reviewable.
 */
export function proposalLinkStatus(
  p: { status: string; acceptedAt: Date | null; declinedAt: Date | null; expiresAt: Date | null },
  now: Date = new Date(),
): ProposalLinkStatus {
  if (p.acceptedAt || p.status === 'ACCEPTED') return 'ACCEPTED';
  if (p.declinedAt || p.status === 'DECLINED') return 'DECLINED';
  if (!p.expiresAt || p.expiresAt.getTime() <= now.getTime()) return 'EXPIRED';
  return 'VALID';
}
