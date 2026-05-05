const getBaseUrl = () => {
  if (import.meta.env.DEV) return "";
  return import.meta.env.VITE_API_BASE_URL ?? "";
};

export class ApiError extends Error {
  status: number;
  data?: unknown;
  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }

  get isAuth() {
    return this.status === 401 || this.status === 403;
  }
  get isNotFound() {
    return this.status === 404;
  }
  get isNetwork() {
    return this.status === 0;
  }
  get isServer() {
    return this.status >= 500;
  }
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<{ data?: T; message?: string; success: boolean }> {
  let res: Response;
  try {
    res = await fetch(getBaseUrl() + path, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  } catch (cause) {
    throw new ApiError(0, "Network request failed", cause);
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, json.message ?? "Request failed", json);
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
