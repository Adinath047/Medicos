// client/src/api/client.ts
// Axios instance with offline-fallback: tries server first, falls back to IndexedDB

import axios from 'axios';

const _env = (import.meta as any).env ?? {};
const isDev = _env.DEV === true || _env.MODE === 'development';

const getBaseURL = () => {
  if (_env.VITE_API_URL) return _env.VITE_API_URL;
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:4000/api';
    }
  }
  return '/api';
};

const SERVER_URL = getBaseURL();

export const apiClient = axios.create({
  baseURL: SERVER_URL,
  timeout: 8000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Helper to get cookie value by name
function getCookie(name: string) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
  return null;
}

// Attach CSRF token to every request
apiClient.interceptors.request.use(config => {
  const csrf = getCookie('csrf_token');
  if (csrf) config.headers['X-CSRF-Token'] = csrf;
  
  // Keep fallback for mobile/offline/cross-site
  const localToken = localStorage.getItem('emr_token');
  if (localToken) {
    config.headers.Authorization = `Bearer ${localToken}`;
  }
  return config;
});

// Global error handler
apiClient.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('emr_token');
      const url = err.config?.url || '';
      if (!url.endsWith('/auth/logout') && !url.endsWith('/auth/me')) {
        window.dispatchEvent(new Event('emr:logout'));
      }
    }
    return Promise.reject(err);
  }
);

export default apiClient;
