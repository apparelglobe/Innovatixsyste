/**
 * Spam scoring. Honeypot is decisive; the rest is heuristic. The PUBLIC response
 * never reveals the outcome — rejected submissions are still persisted (as an
 * inquiry with spamResult=REJECTED) so nothing is silently discarded and we keep
 * an abuse record, but they are not routed to sales.
 */
export type SpamAssessment = { result: 'CLEAN' | 'SUSPECT' | 'REJECTED'; score: number; reasons: string[] };

const URL_RE = /https?:\/\/|www\.|\[url|\bhref=/gi;

export function assessSpam(input: {
  honeypot?: string | null;
  name?: string | null;
  email: string;
  projectDescription?: string | null;
  submitElapsedMs?: number | null;
}): SpamAssessment {
  const reasons: string[] = [];
  let score = 0;

  // Honeypot: a hidden field only a bot fills.
  if (input.honeypot && input.honeypot.trim().length > 0) {
    return { result: 'REJECTED', score: 100, reasons: ['honeypot_filled'] };
  }

  const desc = input.projectDescription ?? '';
  const urlMatches = desc.match(URL_RE);
  const urlCount = urlMatches ? urlMatches.length : 0;
  if (urlCount >= 4) {
    score += 60;
    reasons.push('excessive_links');
  } else if (urlCount >= 2) {
    score += 25;
    reasons.push('multiple_links');
  }

  // Suspiciously instant submit (likely automated).
  if (typeof input.submitElapsedMs === 'number' && input.submitElapsedMs >= 0 && input.submitElapsedMs < 1500) {
    score += 40;
    reasons.push('submitted_too_fast');
  }

  // Name equals email local part repeated / gibberish signals.
  if (input.name && /(.)\1{6,}/.test(input.name)) {
    score += 25;
    reasons.push('repeated_chars_name');
  }

  // All-caps shouty body over some length.
  if (desc.length > 40 && desc === desc.toUpperCase()) {
    score += 15;
    reasons.push('all_caps_body');
  }

  const result = score >= 70 ? 'REJECTED' : score >= 30 ? 'SUSPECT' : 'CLEAN';
  return { result, score, reasons };
}
