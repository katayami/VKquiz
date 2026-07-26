import { getToken } from './token';

export async function apiFetch(path, { method = 'GET', body, isForm = false, headers = {} } = {}) {
  const token = getToken();

  const res = await fetch(`/api${path}`, {
    method,
    headers: {
      ...(isForm ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    throw new Error(data?.error || `Ошибка запроса (${res.status})`);
  }
  return data;
}
