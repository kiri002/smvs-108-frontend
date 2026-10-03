import axios, { AxiosError } from "axios";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5001/api/v1";

const TOKEN_KEY = "smvs108.token";
const EVENT_KEY = "smvs108.adminEventId";

const storage = {
  get(key: string) {
    try {
      return typeof window === "undefined" ? null : window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string | null) {
    try {
      if (value === null) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, value);
    } catch {
      // storage unavailable (private mode); session continues in memory only
    }
  },
};

let memoryToken: string | null = null;

export const tokenStore = {
  get: () => memoryToken ?? storage.get(TOKEN_KEY),
  set: (t: string | null) => {
    memoryToken = t;
    storage.set(TOKEN_KEY, t);
  },
};

/** Config admins can work on a draft event; everyone else always uses the live event. */
export const adminEventStore = {
  get: () => storage.get(EVENT_KEY),
  set: (id: string | null) => storage.set(EVENT_KEY, id),
};

// Shared HTTP client for the SMVS-108 backend.
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 20_000,
});

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const ev = adminEventStore.get();
  if (ev && config.url?.startsWith("/config")) config.headers["X-Event-Id"] = ev;
  return config;
});

let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: () => void) => {
  onUnauthorized = fn;
};

api.interceptors.response.use(
  (r) => r,
  (error: AxiosError) => {
    if (error.response?.status === 401 && !error.config?.url?.includes("/auth/login")) onUnauthorized?.();
    return Promise.reject(error);
  },
);

/** Unwraps { success, data }. */
export async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const r = await api.get(url, { params });
  return r.data.data as T;
}
export async function post<T>(url: string, body?: unknown): Promise<T> {
  const r = await api.post(url, body ?? {});
  return r.data.data as T;
}
export async function patch<T>(url: string, body?: unknown): Promise<T> {
  const r = await api.patch(url, body ?? {});
  return r.data.data as T;
}
export async function put<T>(url: string, body?: unknown): Promise<T> {
  const r = await api.put(url, body ?? {});
  return r.data.data as T;
}
export async function del<T>(url: string): Promise<T> {
  const r = await api.delete(url);
  return r.data.data as T;
}

/** A readable message for any API or network error. */
export function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (!err.response) return "No connection to the server. Check the network and try again.";
    const msg = (err.response.data as { message?: string } | undefined)?.message;
    return msg || `Request failed (${err.response.status}).`;
  }
  return err instanceof Error ? err.message : "Something went wrong.";
}

export const isNetworkError = (err: unknown) => axios.isAxiosError(err) && !err.response;
