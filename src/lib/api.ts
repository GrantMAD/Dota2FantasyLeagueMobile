import { getSupabaseClient } from './supabase';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function getApiBaseUrl(): string {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (!baseUrl) {
    throw new Error('Mobile API configuration is missing. Set EXPO_PUBLIC_API_URL.');
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(baseUrl);
  } catch {
    throw new Error('EXPO_PUBLIC_API_URL must be a valid absolute URL.');
  }

  const host = parsedUrl.hostname;
  const isPrivateIpv4 =
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host) ||
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(host);
  const isLocalHost = ['localhost', '127.0.0.1', '[::1]', '10.0.2.2'].includes(host) ||
    host.endsWith('.local') ||
    isPrivateIpv4;
  const isLocalDevelopment = __DEV__ && parsedUrl.protocol === 'http:' && isLocalHost;

  if (parsedUrl.username || parsedUrl.password || parsedUrl.search || parsedUrl.hash || parsedUrl.pathname !== '/') {
    throw new Error('EXPO_PUBLIC_API_URL must be an API origin without credentials, path, query, or fragment.');
  }
  if (parsedUrl.protocol !== 'https:' && !isLocalDevelopment) {
    throw new Error('The mobile API must use HTTPS outside local development.');
  }

  return parsedUrl.toString().replace(/\/+$/, '');
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (body && typeof body === 'object') {
      const record = body as Record<string, unknown>;
      if (typeof record.error === 'string') return record.error;
      if (typeof record.message === 'string') return record.message;
    }
  } catch {
    // Non-JSON error responses use the status-based message below.
  }

  return `Request failed (${response.status}). Please try again.`;
}

async function requestOnce(
  url: string,
  init: RequestInit,
  token: string
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  const externalSignal = init.signal;
  const abortFromCaller = () => controller.abort();
  if (externalSignal?.aborted) {
    controller.abort();
  } else {
    externalSignal?.addEventListener('abort', abortFromCaller, { once: true });
  }

  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    return await fetch(url, {
      ...init,
      credentials: 'omit',
      headers,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
    externalSignal?.removeEventListener('abort', abortFromCaller);
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!path.startsWith('/')) {
    throw new Error('API paths must start with /.');
  }

  const url = `${getApiBaseUrl()}${path}`;
  const supabase = getSupabaseClient();
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) throw new ApiError('Your session could not be verified. Please sign in again.', 401);
  if (!session?.access_token) throw new ApiError('Please sign in to continue.', 401);

  let response = await requestOnce(url, init, session.access_token);
  const method = (init.method ?? 'GET').toUpperCase();
  const safeToRetry = ['GET', 'HEAD', 'OPTIONS'].includes(method);

  if (response.status === 401) {
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session?.access_token) {
      throw new ApiError('Your session has expired. Please sign in again.', 401);
    }

    if (safeToRetry) {
      response = await requestOnce(url, init, data.session.access_token);
    } else {
      throw new ApiError(
        'Your session was refreshed, but this request was not repeated. Check its status before trying again.',
        401
      );
    }
  }

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }

  return (await response.json()) as T;
}

export async function unauthenticatedApiPost<T>(path: string, body: unknown): Promise<T> {
  if (!path.startsWith('/')) {
    throw new Error('API paths must start with /.');
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, {
      method: 'POST',
      credentials: 'omit',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }
  return (await response.json()) as T;
}
