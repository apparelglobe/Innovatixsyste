/**
 * Pure client-side guards for team-member management, mirroring the server-side
 * rules in the portal API (self-deactivation blocked; the last active OWNER
 * cannot be removed). Kept pure and dependency-free so the UI and its tests
 * share one source of truth. The server remains authoritative — these only drive
 * button enable/disable and tooltips.
 */
export type TeamMember = {
  id: string;
  email: string;
  role: 'OWNER' | 'MEMBER';
  active: boolean;
};

/** Count of currently-active OWNERs in a member list. */
export function activeOwnerCount(members: TeamMember[]): number {
  return members.filter((m) => m.active && m.role === 'OWNER').length;
}

/** True when this member is the caller (matched case-insensitively by email). */
export function isSelf(member: TeamMember, selfEmail: string | undefined): boolean {
  return !!selfEmail && member.email.toLowerCase() === selfEmail.toLowerCase();
}

/** True when deactivating this member would remove the org's last active OWNER. */
export function isLastActiveOwner(member: TeamMember, activeOwners: number): boolean {
  return member.active && member.role === 'OWNER' && activeOwners <= 1;
}

/**
 * Whether the caller may deactivate `member`. Returns a reason when blocked so
 * the UI can show a tooltip that matches the server's 400 responses.
 */
export function canDeactivate(
  member: TeamMember,
  selfEmail: string | undefined,
  activeOwners: number,
): { allowed: boolean; reason?: string } {
  if (!member.active) return { allowed: false, reason: 'Already deactivated.' };
  if (isSelf(member, selfEmail)) return { allowed: false, reason: 'You cannot deactivate your own account.' };
  if (isLastActiveOwner(member, activeOwners)) return { allowed: false, reason: 'You cannot deactivate the last active owner.' };
  return { allowed: true };
}

/** The caller may change roles for anyone except themselves, and only on active members. */
export function canChangeRole(member: TeamMember, selfEmail: string | undefined): boolean {
  return member.active && !isSelf(member, selfEmail);
}
