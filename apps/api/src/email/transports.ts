/**
 * Email transports. The Outbox transport (dev) records the message so it can be
 * viewed at /v1/dev/outbox without digging through logs. The Postmark transport
 * (prod) sends via Postmark's transactional stream.
 */
import { ServerClient } from 'postmark';
import type { EmailMessage, EmailSendResult, EmailTransport } from './types';
import { config } from '../config';

/** Dev transport: the caller persists to EmailOutbox; here we just succeed. */
export class OutboxTransport implements EmailTransport {
  readonly name = 'outbox' as const;
  async send(_msg: EmailMessage): Promise<EmailSendResult> {
    return { providerMessageId: null, transport: 'outbox' };
  }
}

/** Prod transport: Postmark transactional. */
export class PostmarkTransport implements EmailTransport {
  readonly name = 'postmark' as const;
  private client: ServerClient;
  constructor(token: string) {
    if (!token) throw new Error('[email] POSTMARK_SERVER_TOKEN is required for the postmark transport');
    this.client = new ServerClient(token);
  }
  async send(msg: EmailMessage): Promise<EmailSendResult> {
    const res = await this.client.sendEmail({
      From: msg.from,
      To: msg.to,
      Subject: msg.subject,
      HtmlBody: msg.html,
      TextBody: msg.text,
      MessageStream: msg.stream || config.POSTMARK_MESSAGE_STREAM,
    });
    return { providerMessageId: res.MessageID ?? null, transport: 'postmark' };
  }
}

export function makeTransport(): EmailTransport {
  if (config.EMAIL_TRANSPORT === 'postmark') return new PostmarkTransport(config.POSTMARK_SERVER_TOKEN);
  return new OutboxTransport();
}
