const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type Params = Record<string, string | number | undefined>;

async function request<T>(path: string, init: RequestInit = {}, params?: Params): Promise<T> {
  const url = new URL(BASE_URL + path, window.location.origin);
    if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const res = await fetch(url, { credentials: "include", ...init });
  const json = await res.json().catch(() => null);

  if (!res.ok || !json?.success) {
      throw new ApiError(
      res.status,
      json?.error?.code ?? "UNKNOWN",
      json?.error?.message ?? "Terjadi kesalahan",
      json?.error?.details
    );
  }
  return json.data as T;
}

export function apiGet<T>(path: string, params?: Params) {
  return request<T>(path, {}, params);
}

export function apiPost<T>(path: string, body?: unknown) {
  return request<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function apiPut<T>(path: string, body?: unknown) {
  return request<T>(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function apiDelete<T>(path: string) {
  return request<T>(path, { method: "DELETE" });
}

export function apiPatch<T>(path: string, body?: unknown) {
  return request<T>(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

// Untuk unggah berkas: Content-Type diatur browser sendiri (termasuk boundary)
export function apiUpload<T>(path: string, formData: FormData) {
  return request<T>(path, { method: "POST", body: formData });
}