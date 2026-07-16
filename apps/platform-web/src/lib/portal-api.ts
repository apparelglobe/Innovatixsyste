/** Client-portal API helper. Always sends the session cookie (credentials). */
const BASE = process.env.NEXT_PUBLIC_PORTAL_API_URL || 'http://localhost:4040/v1';

export async function api(path: string, opts: RequestInit = {}): Promise<Response> {
  return fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'content-type': 'application/json', ...(opts.headers || {}) },
    ...opts,
  });
}

export async function apiJson<T = unknown>(path: string, opts: RequestInit = {}): Promise<{ status: number; body: T }> {
  const res = await api(path, opts);
  const body = (await res.json().catch(() => ({}))) as T;
  return { status: res.status, body };
}
