/**
 * API Fetch wrapper that automatically injects Authorization headers
 * and configures sensible defaults (e.g., Content-Type for JSON)
 * without compromising standard fetch structure.
 */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = localStorage.getItem('offline_token');
  const headers = new Headers(init?.headers);

  // Auto-inject JWT token if available
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Auto-inject Content-Type if we have a body and it is not specified
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(input, {
    ...init,
    headers
  });
}
