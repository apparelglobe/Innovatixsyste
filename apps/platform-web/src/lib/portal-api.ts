/** Client-portal API helper. Always sends the session cookie (credentials). */
const BASE = process.env.NEXT_PUBLIC_PORTAL_API_URL || 'http://localhost:4040/v1';

/** Absolute API base — for building cookie-authed download links (<a href>). */
export const API_BASE = BASE;

export async function api(path: string, opts: RequestInit = {}): Promise<Response> {
  return fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'content-type': 'application/json', ...(opts.headers || {}) },
    ...opts,
  });
}

/**
 * Multipart upload — a RAW fetch that does NOT set content-type (the browser sets the multipart boundary),
 * so it must bypass api()/apiJson() which force application/json. Used by the ticket composers to send an
 * optional attachment alongside the message. Still cookie-authed. Extra headers (e.g. idempotency-key) pass through.
 */
export async function apiUpload(path: string, form: FormData, headers: Record<string, string> = {}): Promise<Response> {
  return fetch(`${BASE}${path}`, { method: 'POST', credentials: 'include', headers, body: form });
}

export async function apiJson<T = unknown>(path: string, opts: RequestInit = {}): Promise<{ status: number; body: T }> {
  const res = await api(path, opts);
  const body = (await res.json().catch(() => ({}))) as T;
  return { status: res.status, body };
}
