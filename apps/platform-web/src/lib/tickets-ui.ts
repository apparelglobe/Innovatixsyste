import type { Tone } from './proposal-stage';

/** Slice 3 — client-facing ticket display maps (mirror apps/api enums TicketStatus/TicketCategory). */
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_ON_CLIENT' | 'RESOLVED' | 'CLOSED';
export type TicketCategory = 'GENERAL' | 'PROJECT' | 'BILLING' | 'TECHNICAL' | 'CARE_PLAN' | 'OTHER';

export const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In progress',
  WAITING_ON_CLIENT: 'Awaiting your reply',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

export const TICKET_STATUS_TONE: Record<TicketStatus, Tone> = {
  OPEN: 'info',
  IN_PROGRESS: 'progress',
  WAITING_ON_CLIENT: 'warn',
  RESOLVED: 'success',
  CLOSED: 'neutral',
};

export const TICKET_CATEGORY_LABEL: Record<TicketCategory, string> = {
  GENERAL: 'General',
  PROJECT: 'Project',
  BILLING: 'Billing',
  TECHNICAL: 'Technical',
  CARE_PLAN: 'Care Plan',
  OTHER: 'Other',
};

export const TICKET_CATEGORIES: TicketCategory[] = ['GENERAL', 'PROJECT', 'BILLING', 'TECHNICAL', 'CARE_PLAN', 'OTHER'];

export type TicketListItem = { id: string; number: string; subject: string; category: TicketCategory; status: TicketStatus; projectId: string | null; lastMessageAt: string; createdAt: string };
export type TicketMessage = { id: string; authorType: 'CLIENT' | 'TEAM'; authorName: string | null; body: string; createdAt: string };
export type TicketDetail = TicketListItem & { closedAt: string | null; messages: TicketMessage[] };
