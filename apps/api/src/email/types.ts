/**
 * Transactional email transport interface. Kept deliberately narrow so we are
 * not coupled to Postmark: dev uses the DB-backed Outbox transport; prod uses
 * Postmark. Marketing/campaign email is a SEPARATE concern and must not be
 * routed through this transport.
 */
export type EmailMessage = {
  to: string;
  from: string;
  subject: string;
  html: string;
  text: string;
  /** Postmark message stream (transactional). */
  stream?: string;
};

export type EmailSendResult = {
  providerMessageId: string | null;
  transport: 'outbox' | 'postmark' | 'smtp';
};

export interface EmailTransport {
  readonly name: 'outbox' | 'postmark' | 'smtp';
  send(msg: EmailMessage): Promise<EmailSendResult>;
}
