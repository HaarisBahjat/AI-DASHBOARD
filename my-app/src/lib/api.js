const FALLBACK_API_BASE_URL = import.meta.env.DEV
  ? 'http://localhost:3004'
  : (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3004');

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || FALLBACK_API_BASE_URL).replace(/\/$/, '');

export const apiUrl = (path = '') => {
  const normalizedPath = String(path).startsWith('/') ? String(path) : `/${String(path)}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

export const socketUrl = API_BASE_URL;