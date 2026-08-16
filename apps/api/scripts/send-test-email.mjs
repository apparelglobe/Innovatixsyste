// Verify SMTP (e.g. Google Workspace) credentials and send ONE test email — standalone,
// no app boot, no database. Use it to confirm your app password works before switching
// EMAIL_TRANSPORT=smtp for the whole platform.
//
// Usage (on the box or locally):
//   SMTP_HOST=smtp.gmail.com SMTP_PORT=465 SMTP_SECURE=true \
//   SMTP_USER=hello@innovatixmarketing.com SMTP_PASS='your-app-password' \
//   EMAIL_FROM='Innovatix Systems <hello@innovatixmarketing.com>' \
//   node scripts/send-test-email.mjs you@somewhere.com
import nodemailer from 'nodemailer';

const to = process.argv[2];
if (!to) {
  console.error('usage: node scripts/send-test-email.mjs <recipient-email>');
  process.exit(1);
}

const { SMTP_HOST, SMTP_PORT = '465', SMTP_SECURE = 'true', SMTP_USER, SMTP_PASS, EMAIL_FROM } = process.env;
for (const [k, v] of Object.entries({ SMTP_HOST, SMTP_USER, SMTP_PASS })) {
  if (!v) { console.error(`✗ missing required env var: ${k}`); process.exit(1); }
}
const from = EMAIL_FROM || SMTP_USER;
const secure = /^(1|true|yes)$/i.test(SMTP_SECURE);

const transporter = nodemailer.createTransport({
  host: SMTP_HOST, port: Number(SMTP_PORT), secure,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

try {
  console.log(`▶ verifying ${SMTP_USER} @ ${SMTP_HOST}:${SMTP_PORT} (secure=${secure}) …`);
  await transporter.verify();
  console.log('✓ connection + authentication OK');
  console.log(`▶ sending test email to ${to} …`);
  const info = await transporter.sendMail({
    from, to,
    subject: 'Innovatix SMTP test ✓',
    text: 'If you can read this, your Google Workspace SMTP is wired up correctly. — Innovatix',
    html: '<p>If you can read this, your Google Workspace SMTP is wired up correctly.</p><p>— Innovatix</p>',
  });
  console.log('✓ sent — messageId:', info.messageId);
  console.log('  Check the recipient inbox (and the Spam folder, just in case).');
} catch (e) {
  console.error('✗ FAILED:', e?.message || e);
  console.error('  Common causes: wrong app password, 2-Step Verification not enabled, or the');
  console.error('  sending address is not a Workspace mailbox on your domain.');
  process.exit(1);
}
