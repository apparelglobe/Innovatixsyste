/**
 * Email transports. Outbox (dev) records the message so it can be viewed at
 * /v1/dev/outbox. Postmark and SMTP (e.g. Google Workspace) actually deliver mail;
 * SMTP lets a deployment reuse an existing mailbox instead of a paid API service.
 */
import { ServerClient } from 'postmark';
import nodemailer, { type Transporter } from 'nodemailer';
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

/** Prod transport: any standard SMTP server (Google Workspace, etc.). */
export class SmtpTransport implements EmailTransport {
  readonly name = 'smtp' as const;
  private transporter: Transporter;
  constructor(opts: { host: string; port: number; secure: boolean; user: string; pass: string }) {
    if (!opts.host || !opts.user || !opts.pass) {
      throw new Error('[email] SMTP_HOST, SMTP_USER and SMTP_PASS are required for the smtp transport');
    }
    this.transporter = nodemailer.createTransport({
      host: opts.host,
      port: opts.port,
      secure: opts.secure, // true = implicit TLS (465); false = STARTTLS (587)
      auth: { user: opts.user, pass: opts.pass },
    });
  }
  async send(msg: EmailMessage): Promise<EmailSendResult> {
    const info = await this.transporter.sendMail({
      from: msg.from,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
    });
    return { providerMessageId: info.messageId ?? null, transport: 'smtp' };
  }
  /** Verify the connection + credentials without sending mail (used by the test script). */
  verify(): Promise<true> {
    return this.transporter.verify().then(() => true);
  }
}

export function makeTransport(): EmailTransport {
  if (config.EMAIL_TRANSPORT === 'postmark') return new PostmarkTransport(config.POSTMARK_SERVER_TOKEN);
  if (config.EMAIL_TRANSPORT === 'smtp') {
    return new SmtpTransport({ host: config.SMTP_HOST, port: config.SMTP_PORT, secure: config.SMTP_SECURE, user: config.SMTP_USER, pass: config.SMTP_PASS });
  }
  return new OutboxTransport();
}
