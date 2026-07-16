/**
 * Server-side password policy for client-portal account setup.
 *
 * Deliberately minimal (length + a denylist of known weak/demo passwords). We do
 * NOT impose arbitrary character-class rules — length + a breach/demo denylist is
 * both stronger and friendlier than "must contain a symbol". Validation always
 * runs on the server; the password itself is never logged or echoed.
 */
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 200;

// Known development/demo/common passwords that must never be accepted as a real
// client password. Kept lowercase; comparison is case-insensitive. The seed's
// local demo password is included so it can never be reused as a real credential.
const DENYLIST = new Set<string>([
  'portal-demo-2026',
  'password',
  'password1',
  'password123',
  'passw0rd',
  '123456',
  '12345678',
  '123456789',
  '1234567890',
  'qwerty',
  'qwertyuiop',
  'letmein',
  'welcome',
  'welcome1',
  'admin',
  'admin123',
  'changeme',
  'change-me',
  'innovatix',
  'innovatix123',
  'demo',
  'test1234',
  'iloveyou',
]);

export type PasswordCheck = { ok: true } | { ok: false; reason: string };

/** Validate a proposed password. `context` values (email/name) are rejected as-is. */
export function validatePassword(raw: string, context: { email?: string } = {}): PasswordCheck {
  if (typeof raw !== 'string') return { ok: false, reason: 'Password is required.' };
  const pw = raw;
  if (pw.length < PASSWORD_MIN_LENGTH) {
    return { ok: false, reason: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.` };
  }
  if (pw.length > PASSWORD_MAX_LENGTH) {
    return { ok: false, reason: `Password must be at most ${PASSWORD_MAX_LENGTH} characters.` };
  }
  if (pw.trim().length < PASSWORD_MIN_LENGTH) {
    return { ok: false, reason: 'Password cannot be mostly whitespace.' };
  }
  const lower = pw.toLowerCase();
  if (DENYLIST.has(lower)) {
    return { ok: false, reason: 'That password is too common. Please choose a stronger one.' };
  }
  const emailLocal = context.email?.split('@')[0]?.toLowerCase();
  if (emailLocal && emailLocal.length >= 4 && lower === emailLocal) {
    return { ok: false, reason: 'Password must not be your email address.' };
  }
  return { ok: true };
}

/** Exposed for the repository demo-password scan test. */
export const KNOWN_DEMO_PASSWORDS = Array.from(DENYLIST);
