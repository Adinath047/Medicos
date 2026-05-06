// client/src/api/client.ts
// Axios instance with offline-fallback: tries server first, falls back to IndexedDB

import axios from 'axios';

const isDev = import.meta.env.DEV;
const SERVER_URL = isDev
  ? ((import.meta as any).env?.VITE_API_URL || 'http://localhost:4000/api')
  : '/api';  // Same origin in production (Railway serves both)

export const apiClient = axios.create({
  baseURL: SERVER_URL,
  timeout: 8000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('emr_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Global error handler
apiClient.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('emr_token');
      window.dispatchEvent(new Event('emr:logout'));
    }
    return Promise.reject(err);
  }
);

export default apiClient;
