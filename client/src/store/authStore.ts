// client/src/store/authStore.ts
import { create } from 'zustand';
import { apiClient } from '../api/client';

interface AuthUser {
  id: string; name: string; email: string;
  role: string; hospitalId?: string; photoUrl?: string;
  staff_type?: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  restoreSession: () => void;
}

// ── Default user — login screen is skipped, app opens directly ───────────────
const DEFAULT_USER: AuthUser = {
  id: 'usr-admin-001',
  name: 'Adinath Admin',
  email: 'adinathmade@medicos.com',
  role: 'admin',
  hospitalId: 'hsp-001',
};

export const useAuthStore = create<AuthState>((set) => ({
  // Pre-set admin user so the login page is never shown
  user: DEFAULT_USER,
  token: 'no-auth',
  isLoading: false,

  restoreSession: () => {
    // No-op — login is disabled; user is always pre-set
  },

  login: async (email, password) => {
    try {
      const res = await apiClient.post('/auth/login', { email, password });
      const { user } = res.data;
      localStorage.setItem('emr_user', JSON.stringify(user));
      localStorage.removeItem('emr_is_demo');
      set({ user, token: 'cookie-auth' });
      return true;
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401 || status === 422 || status === 400) return false;
    }
    return false;
  },

  logout: () => {
    apiClient.post('/auth/logout').catch(() => { /* ignore */ });
    localStorage.removeItem('emr_user');
    localStorage.removeItem('emr_is_demo');
    // Re-set default user instead of clearing — keeps the app usable
    set({ user: DEFAULT_USER, token: 'no-auth' });
  },
}));

// Listen for 401 logout event from API interceptor
window.addEventListener('emr:logout', () => useAuthStore.getState().logout());
