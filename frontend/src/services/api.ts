const API_BASE = import.meta.env.VITE_API_BASE ?? "";

function requestUrl(path: string): string {
  return `${API_BASE}${path}`;
}

function reportError(body: any, status: number): Error {
  return new Error(body?.error?.message || body?.message || `Request failed (${status})`);
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(requestUrl(path), {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers ?? {}),
    },
  });
  const text = await response.text();
  let body: any = {};
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { message: text };
    }
  }
  if (!response.ok) throw reportError(body, response.status);
  return body as T;
}

export { API_BASE };
