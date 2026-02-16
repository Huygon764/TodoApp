const getBaseUrl = () => {
  if (import.meta.env.DEV) return "";
  return import.meta.env.VITE_API_BASE_URL ?? "";
};

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ data?: T; message?: string; success: boolean }> {
  const res = await fetch(getBaseUrl() + path, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.message ?? "Request failed");
  }
  return json;
}

export function apiGet<T>(path: string) {
  return api<T>(path, { method: "GET" });
}

export function apiPost<T>(path: string, body: unknown) {
  return api<T>(path, { method: "POST", body: JSON.stringify(body) });
}

export function apiPatch<T>(path: string, body: unknown) {
  return api<T>(path, { method: "PATCH", body: JSON.stringify(body) });
}

export function apiDelete<T>(path: string) {
  return api<T>(path, { method: "DELETE" });
}
