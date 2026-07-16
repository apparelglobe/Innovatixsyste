/**
 * Input sanitization + normalization for lead fields. Strips HTML/script,
 * collapses whitespace, and clamps length. Sanitization is defense-in-depth on
 * top of strict zod validation — we store clean values and never render raw
 * user input into HTML emails without escaping.
 */

const TAG = /<\/?[a-z][\s\S]*?>/gi;
// ASCII control chars 0x00–0x1F + DEL (0x7F). \t \n \r are handled per-variant.
const CONTROL_ALL = /[\x00-\x1F\x7F]/g;
const CONTROL_KEEP_NL = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

/** Remove tags/control chars, collapse whitespace, trim, clamp length. */
export function cleanText(input: unknown, maxLen = 2000): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(TAG, '')
    .replace(CONTROL_ALL, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

/** Multi-line variant (preserves newlines) for project descriptions. */
export function cleanMultiline(input: unknown, maxLen = 5000): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(TAG, '')
    .replace(CONTROL_KEEP_NL, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, maxLen);
}

/** Escape a string for safe interpolation into HTML email bodies. */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Lowercase + trim for dedup identity. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Normalize a company name for COMPARISON only (never destroys the original).
 * Lowercases, strips punctuation and common suffixes, collapses whitespace.
 */
export function normalizeCompany(company: string | undefined | null): string | null {
  if (!company) return null;
  const n = company
    .toLowerCase()
    .replace(/[.,]/g, ' ')
    .replace(/\b(inc|llc|ltd|co|corp|corporation|company|gmbh|plc)\b/g, ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return n || null;
}
