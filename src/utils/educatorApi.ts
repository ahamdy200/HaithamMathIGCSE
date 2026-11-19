import { apiUrl } from './apiBase';
import { readStored, writeStored, removeStored } from './safeStorage';

const EDUCATOR_TOKEN_KEY = 'igcse_educator_api_token';
const EDUCATOR_SESSION_KEY = 'igcse_educator_session';

export function getEducatorApiToken(): string | null {
  try {
    const s = window.sessionStorage.getItem(EDUCATOR_TOKEN_KEY);
    if (s) return s;
  } catch {
    // ignore
  }
  return readStored(EDUCATOR_TOKEN_KEY);
}

export function setEducatorApiToken(token: string, rememberMe = false): void {
  try {
    window.sessionStorage.setItem(EDUCATOR_TOKEN_KEY, token);
  } catch {
    // ignore
  }
  if (rememberMe) {
    writeStored(EDUCATOR_TOKEN_KEY, token);
  } else {
    removeStored(EDUCATOR_TOKEN_KEY);
  }
}

export function clearEducatorApiToken(): void {
  try {
    window.sessionStorage.removeItem(EDUCATOR_TOKEN_KEY);
    window.sessionStorage.removeItem(EDUCATOR_SESSION_KEY);
  } catch {
    // ignore
  }
  removeStored(EDUCATOR_TOKEN_KEY);
  removeStored(EDUCATOR_SESSION_KEY);
}

export function educatorAuthHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = getEducatorApiToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'X-Educator-Token': token } : {}),
    ...extra,
  };
}

export async function authenticateEducator(
  password: string,
  rememberMe = false
): Promise<{ ok: boolean; error?: string; expiresIn?: number }> {
  try {
    const res = await fetch(apiUrl('/api/educator/auth'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, rememberMe }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.token) {
      return { ok: false, error: data?.error || 'Incorrect instructor password.' };
    }
    setEducatorApiToken(String(data.token), rememberMe);
    return { ok: true, expiresIn: Number(data.expiresIn) || undefined };
  } catch {
    return { ok: false, error: 'Unable to reach server for verification.' };
  }
}

export async function verifyEducatorSessionServer(): Promise<boolean> {
  const token = getEducatorApiToken();
  if (!token) return false;
  try {
    const res = await fetch(apiUrl('/api/educator/verify'), {
      headers: { 'X-Educator-Token': token },
    });
    if (!res.ok) {
      clearEducatorApiToken();
      return false;
    }
    return true;
  } catch {
    return Boolean(token);
  }
}
