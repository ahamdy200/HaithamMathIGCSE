const STORAGE_KEY = 'haitham_api_base_url';

function normalizeBaseUrl(raw?: string | null): string {
  if (!raw) return '';
  return raw.trim().replace(/\/+$/, '');
}

export function getApiBaseUrl(): string {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && /^https?:\/\//i.test(saved.trim())) {
      return normalizeBaseUrl(saved);
    }
  } catch {
    // Ignore storage access failures
  }

  const envUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
  return normalizeBaseUrl(envUrl);
}

export function setApiBaseUrl(url: string): void {
  try {
    const clean = normalizeBaseUrl(url);
    if (clean) {
      window.localStorage.setItem(STORAGE_KEY, clean);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Ignore storage access failures
  }
}

export function apiUrl(path: string): string {
  const base = getApiBaseUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${normalizedPath}` : normalizedPath;
}
