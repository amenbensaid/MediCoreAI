export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5101/api';

const createRequestId = () => `mobile-${Date.now()}-${Math.random().toString(16).slice(2)}`;

type ApiOptions = RequestInit & {
  token?: string | null;
  params?: Record<string, string | number | boolean | null | undefined>;
};

export const buildApiUrl = (path: string, params?: ApiOptions['params']) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${API_BASE_URL}${normalizedPath}`);

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
};

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { token, params, headers, ...rest } = options;
  const response = await fetch(buildApiUrl(path, params), {
    ...rest,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'x-client-request-id': createRequestId(),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.message || `Request failed with status ${response.status}`);
  }

  return payload as T;
}
