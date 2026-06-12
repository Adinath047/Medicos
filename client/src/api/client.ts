// client/src/api/client.ts
// Axios instance — tries server first, dispatches logout on 401

import axios from 'axios';

const _env = (import.meta as any).env ?? {};

// Backend runs as a Vercel Serverless Function on the same domain as the frontend.
// In production: use relative '/api' — same domain, no CORS, works on all devices.
// In local dev: proxy to localhost:4000 (configured in vite.config.ts).
const getBaseURL = (): string => {
  // Allow override for special deployments (e.g. self-hosted backend)
  if (_env.VITE_API_URL) return _env.VITE_API_URL;

  if (typeof window !== 'undefined') {
    const { hostname } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:4000/api';
    }
  }

  // Production on Vercel — backend is on the same domain, use relative URL
  return '/api';
};

export const apiClient = axios.create({
  baseURL: getBaseURL(),
  timeout: 12000,          // FIX: raised from 8s — Render free tier cold-starts can take ~10s
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,   // required for cross-origin cookies (sameSite: 'none')
});

// ── Cookie helper ─────────────────────────────────────────────────────────
function getCookie(name: string): string | undefined {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
  return undefined;
}

// ── Request interceptor ───────────────────────────────────────────────────
apiClient.interceptors.request.use(config => {
  // FIX: CSRF cookie may not arrive cross-origin in some browsers even with
  // sameSite:'none'. Only attach the header when the cookie actually exists.
  const csrf = getCookie('csrf_token');
  if (csrf) {
    config.headers['X-CSRF-Token'] = csrf;
  }

  // FIX: Was reading from localStorage('emr_token') AND relying on cookies —
  // two competing auth mechanisms that can get out of sync.
  // Strategy: prefer the cookie (httpOnly, set by server on login).
  // Fall back to localStorage token for mobile / environments that block
  // third-party cookies (e.g. Safari ITP). This keeps both paths working.
  if (!csrf) {
    // No cookie present → cross-origin cookie was blocked, use Bearer token
    const localToken = localStorage.getItem('emr_token');
    if (localToken && !config.headers['Authorization']) {
      config.headers['Authorization'] = `Bearer ${localToken}`;
    }
  } else {
    // Cookie present → also send Authorization header so the server can use
    // whichever mechanism it finds first (auth middleware checks both).
    const localToken = localStorage.getItem('emr_token');
    if (localToken && !config.headers['Authorization']) {
      config.headers['Authorization'] = `Bearer ${localToken}`;
    }
  }

  return config;
});

// ── Response interceptor ──────────────────────────────────────────────────
apiClient.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('emr_token');
      localStorage.removeItem('emr_user');
      const url: string = err.config?.url || '';
      // Don't trigger logout loop on the logout/me endpoints themselves
      if (!url.endsWith('/auth/logout') && !url.endsWith('/auth/me')) {
        window.dispatchEvent(new Event('emr:logout'));
      }
    }

    // FIX: Surface network errors (CORS, ERR_FAILED) with a clear message
    // instead of a cryptic AxiosError so devs can act on it immediately.
    if (!err.response && err.message === 'Network Error') {
      console.error(
        '[client] Network Error — likely CORS or server unreachable.\n' +
        `  Attempted URL: ${err.config?.baseURL}${err.config?.url}\n` +
        '  Check: 1) VITE_API_URL is correct  2) Server CORS allows this origin  3) Server is running on Render'
      );
    }

    return Promise.reject(err);
  }
);

export default apiClient;