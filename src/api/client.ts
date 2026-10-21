import { getApiEnvFromImportMeta } from '../lib/env';
import { useAppStore } from '../store';

export type ApiError = { error: string };

declare global {
  interface Window {
    __YJ_CONFIG__?: { apiBaseUrl?: string };
  }
}

function joinUrl(baseUrl: string, path: string) {
  const b = (baseUrl ?? '').trim().replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return b ? `${b}${p}` : p;
}

export function resolveApiBaseUrl() {
  const runtimeBaseUrl = (window.__YJ_CONFIG__?.apiBaseUrl ?? '').trim();
  const { baseUrl: envBaseUrl } = getApiEnvFromImportMeta();
  return (runtimeBaseUrl || envBaseUrl).trim().replace(/\/$/, '');
}

export function buildApiUrl(path: string) {
  return joinUrl(resolveApiBaseUrl(), path);
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = resolveApiBaseUrl();
  const token = useAppStore.getState().session?.accessToken;

  const headers = new Headers(init?.headers ?? {});
  if (!headers.has('content-type') && init?.body) headers.set('content-type', 'application/json');
  if (token) headers.set('authorization', `Bearer ${token}`);

  const res = await fetch(joinUrl(baseUrl, path), { ...init, headers });
  const text = await res.text();
  const ct = String(res.headers.get('content-type') ?? '').toLowerCase();
  const isJson = ct.includes('application/json') || ct.includes('+json');
  let data: any = null;
  if (text) {
    if (isJson) {
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }
    } else {
      data = { _raw: text };
    }
  }
  if (!res.ok) {
    const title =
      !isJson && text
        ? (text.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '').trim()
        : '';
    const msg = String((data as any)?.error || (data as any)?.message || title || `http_${res.status}`);
    if (res.status === 401) useAppStore.getState().clearAuth();
    throw new Error(msg);
  }
  if (text && !isJson) throw new Error('invalid_response_not_json');
  return data as T;
}
