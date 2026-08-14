/** Staff-side proposal status → label + pill classes. Shared by the list and detail pages. */
export const PROPOSAL_STATUS: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: 'Draft', cls: 'bg-white/10 text-neutral-300' },
  SENT: { label: 'Sent', cls: 'bg-blue-500/15 text-blue-300' },
  VIEWED: { label: 'Viewed', cls: 'bg-indigo-500/15 text-indigo-300' },
  CHANGES_REQUESTED: { label: 'Changes requested', cls: 'bg-amber-500/15 text-amber-300' },
  ACCEPTED: { label: 'Accepted', cls: 'bg-emerald-500/15 text-emerald-300' },
  DECLINED: { label: 'Declined', cls: 'bg-red-500/15 text-red-300' },
  EXPIRED: { label: 'Expired', cls: 'bg-white/10 text-neutral-500' },
};
