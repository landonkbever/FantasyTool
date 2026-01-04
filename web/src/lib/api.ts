const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:3001";

export async function apiGet<T>(path: string): Promise<T> {
  const resp = await fetch(`${API_BASE}${path}`);
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`API error ${resp.status}: ${text}`);
  }
  return (await resp.json()) as T;
}
