/**
 * Transactional email templates. All user-supplied values are HTML-escaped.
 * Dark, minimal, on-brand. No marketing content — transactional only.
 */
import { escapeHtml } from '../lib/sanitize';
import { config } from '../config';

type Built = { subject: string; html: string; text: string };

const BRAND = '#2563EB';
function shell(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:#0A0F1C;font-family:Inter,Arial,sans-serif;color:#e5e7eb">
    <div style="max-width:560px;margin:0 auto;padding:32px 24px">
      <div style="font-weight:800;font-size:18px;color:#fff;margin-bottom:24px">Innovatix <span style="color:${BRAND}">Systems</span></div>
      <div style="background:#0F172A;border:1px solid #1f2937;border-radius:12px;padding:28px">
        <h1 style="margin:0 0 12px;font-size:20px;color:#fff">${escapeHtml(title)}</h1>
        ${bodyHtml}
      </div>
      <div style="color:#64748b;font-size:12px;margin-top:20px">Innovatix Systems · Enterprise software, AI &amp; platforms</div>
    </div></body></html>`;
}

/** Sent to the visitor after a lead is received. */
export function leadAckEmail(to: string, firstName?: string | null): Built {
  const hi = firstName ? `Hi ${escapeHtml(firstName)},` : 'Hi,';
  const subject = 'We received your request — Innovatix Systems';
  const html = shell('Thanks — we received your request', `
    <p style="color:#cbd5e1;line-height:1.6">${hi}</p>
    <p style="color:#cbd5e1;line-height:1.6">Thanks for reaching out to Innovatix Systems. Our team has received your request and will get back to you shortly to discuss your project.</p>
    <p style="color:#94a3b8;line-height:1.6;font-size:14px">If you'd like to schedule a consultation now, you can book a time here:</p>
    <p><a href="${config.CALCOM_EVENT_URL}" style="display:inline-block;background:${BRAND};color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">Book a Consultation</a></p>`);
  const text = `${hi}\n\nThanks for reaching out to Innovatix Systems. We've received your request and will get back to you shortly.\n\nBook a consultation: ${config.CALCOM_EVENT_URL}\n\n— Innovatix Systems`;
  return { subject, html, text };
}

/** Sent internally when a new lead / inquiry arrives. */
export function internalLeadNotifyEmail(params: {
  leadEmail: string;
  name?: string | null;
  company?: string | null;
  serviceInterest?: string | null;
  budgetRange?: string | null;
  isNewLead: boolean;
  inquiryCount: number;
}): Built {
  const subject = `${params.isNewLead ? 'New lead' : 'New inquiry'}: ${params.leadEmail}`;
  const row = (k: string, v?: string | null) =>
    v ? `<tr><td style="color:#64748b;padding:4px 12px 4px 0">${escapeHtml(k)}</td><td style="color:#e5e7eb">${escapeHtml(v)}</td></tr>` : '';
  const html = shell(subject, `
    <table style="font-size:14px;line-height:1.6">
      ${row('Email', params.leadEmail)}
      ${row('Name', params.name)}
      ${row('Company', params.company)}
      ${row('Service interest', params.serviceInterest)}
      ${row('Budget', params.budgetRange)}
      <tr><td style="color:#64748b;padding:4px 12px 4px 0">Type</td><td style="color:#e5e7eb">${params.isNewLead ? 'New lead' : `Repeat (inquiry #${params.inquiryCount})`}</td></tr>
    </table>`);
  const text = `${subject}\nEmail: ${params.leadEmail}\nName: ${params.name ?? '-'}\nCompany: ${params.company ?? '-'}\nService: ${params.serviceInterest ?? '-'}\nBudget: ${params.budgetRange ?? '-'}\nType: ${params.isNewLead ? 'New lead' : `Repeat inquiry #${params.inquiryCount}`}`;
  return { subject, html, text };
}

export function bookingConfirmEmail(to: string, whenIso?: string | null, meetingUrl?: string | null): Built {
  const subject = 'Your consultation is confirmed — Innovatix Systems';
  const when = whenIso ? new Date(whenIso).toUTCString() : 'the scheduled time';
  const html = shell('Your consultation is confirmed', `
    <p style="color:#cbd5e1;line-height:1.6">Your consultation with Innovatix Systems is confirmed for <strong style="color:#fff">${escapeHtml(when)}</strong>.</p>
    ${meetingUrl ? `<p><a href="${escapeHtml(meetingUrl)}" style="color:${BRAND}">Join / manage meeting</a></p>` : ''}`);
  const text = `Your consultation with Innovatix Systems is confirmed for ${when}.${meetingUrl ? `\nMeeting: ${meetingUrl}` : ''}`;
  return { subject, html, text };
}

export function assignmentNotifyEmail(assignee: string, leadEmail: string): Built {
  const subject = `Lead assigned to you: ${leadEmail}`;
  const html = shell(subject, `<p style="color:#cbd5e1;line-height:1.6">A lead (${escapeHtml(leadEmail)}) has been assigned to you. Please follow up within the response SLA.</p>`);
  return { subject, html, text: `${subject}\nA lead (${leadEmail}) has been assigned to you.` };
}

export function slaWarningEmail(leadEmail: string, dueIso: string): Built {
  const subject = `SLA warning: ${leadEmail}`;
  const html = shell(subject, `<p style="color:#cbd5e1;line-height:1.6">The response SLA for ${escapeHtml(leadEmail)} is due at ${escapeHtml(new Date(dueIso).toUTCString())}. Please respond.</p>`);
  return { subject, html, text: `${subject}\nDue at ${new Date(dueIso).toUTCString()}` };
}

export function sideEffectFailureAlertEmail(jobType: string, jobId: string, lastError: string): Built {
  const subject = `Side-effect permanently failed: ${jobType}`;
  const html = shell(subject, `<p style="color:#cbd5e1;line-height:1.6">Job <code>${escapeHtml(jobId)}</code> of type <strong>${escapeHtml(jobType)}</strong> reached max attempts.</p><p style="color:#94a3b8;font-size:13px">Last error: ${escapeHtml(lastError)}</p>`);
  return { subject, html, text: `${subject}\nJob ${jobId} reached max attempts.\nLast error: ${lastError}` };
}

/**
 * Secure client-portal invitation. Carries a one-time setup LINK — never a
 * password. The recipient sets their own password on the linked page. No
 * internal IDs, no secrets beyond the single-use setup URL itself.
 *
 * (Replaces the former `portalInviteEmail`, which emailed a temporary password.)
 */
export function clientInvitationEmail(params: {
  orgName: string;
  setupUrl: string;
  expiresAt: Date;
  supportEmail: string;
}): Built {
  const { orgName, setupUrl, expiresAt, supportEmail } = params;
  const expires = expiresAt.toUTCString();
  const subject = `Set up your Innovatix client portal — ${orgName}`;
  const html = shell('Set up your Innovatix portal access', `
    <p style="color:#cbd5e1;line-height:1.6">You've been invited to the <strong style="color:#fff">Innovatix Systems</strong> client portal for <strong style="color:#fff">${escapeHtml(orgName)}</strong>. From the portal you can track progress, review reports, approve milestones, view invoices, and message your delivery team.</p>
    <p style="color:#cbd5e1;line-height:1.6">To get started, choose your own password using the secure link below:</p>
    <p><a href="${escapeHtml(setupUrl)}" style="display:inline-block;background:${BRAND};color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">Set up my account</a></p>
    <p style="color:#94a3b8;font-size:13px;line-height:1.6">This one-time link expires on <strong style="color:#cbd5e1">${escapeHtml(expires)}</strong>. If it has expired, ask your Innovatix contact to resend the invitation.</p>
    <p style="color:#64748b;font-size:12px;line-height:1.6;margin-top:16px">If you weren't expecting this invitation, no action is required — you can safely ignore this email. Questions? Contact us at <a href="mailto:${escapeHtml(supportEmail)}" style="color:${BRAND}">${escapeHtml(supportEmail)}</a>.</p>`);
  const text = [
    `You've been invited to the Innovatix Systems client portal for ${orgName}.`,
    ``,
    `Set up your account (choose your own password):`,
    setupUrl,
    ``,
    `This one-time link expires on ${expires}. If it has expired, ask your Innovatix contact to resend the invitation.`,
    ``,
    `If you weren't expecting this invitation, no action is required — you can ignore this email.`,
    `Questions? Contact ${supportEmail}.`,
  ].join('\n');
  return { subject, html, text };
}

/** Generic in-app notification mirrored to email. */
export function notificationEmail(title: string, body: string | null, linkUrl?: string): Built {
  const html = shell(title, `
    ${body ? `<p style="color:#cbd5e1;line-height:1.6">${escapeHtml(body)}</p>` : ''}
    ${linkUrl ? `<p><a href="${escapeHtml(linkUrl)}" style="display:inline-block;background:${BRAND};color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">Open in portal</a></p>` : ''}`);
  return { subject: title, html, text: `${title}${body ? `\n\n${body}` : ''}${linkUrl ? `\n\n${linkUrl}` : ''}` };
}
