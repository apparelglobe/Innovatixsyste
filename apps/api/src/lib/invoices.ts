// Invoice enrichment — resolve the billing-contact name and each line item's related
// milestone name. Like approvals, billingContactUserId has no FK relation (kept loose so a
// contact can be removed without cascading), so we resolve names in code.
import { prisma } from '../db';

const fullName = (u: { firstName: string | null; lastName: string | null; email: string }) =>
  [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.email;

type LineItem = { milestoneId?: string | null; [k: string]: unknown };
type InvoiceLike = { billingContactUserId?: string | null; lineItems?: LineItem[]; [k: string]: unknown };

export async function enrichInvoice<T extends InvoiceLike>(inv: T) {
  const milestoneIds = [...new Set((inv.lineItems ?? []).map((li) => li.milestoneId).filter(Boolean) as string[])];
  const [contact, milestones] = await Promise.all([
    inv.billingContactUserId
      ? prisma.clientUser.findUnique({ where: { id: inv.billingContactUserId }, select: { firstName: true, lastName: true, email: true } })
      : Promise.resolve(null),
    milestoneIds.length
      ? prisma.milestone.findMany({ where: { id: { in: milestoneIds } }, select: { id: true, name: true } })
      : Promise.resolve([]),
  ]);
  const mName = new Map(milestones.map((m) => [m.id, m.name]));
  return {
    ...inv,
    billingContactName: contact ? fullName(contact) : null,
    lineItems: (inv.lineItems ?? []).map((li) => ({ ...li, milestoneName: li.milestoneId ? mName.get(li.milestoneId) ?? null : null })),
  };
}
