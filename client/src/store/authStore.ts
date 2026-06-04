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
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true, // Start with loading active to allow session restoration first

  restoreSession: async () => {
    try {
      const res = await apiClient.get('/auth/me');
      const { user } = res.data;
      localStorage.setItem('emr_user', JSON.stringify(user));
      set({ user, token: 'cookie-auth', isLoading: false });
    } catch (err) {
      localStorage.removeItem('emr_user');
      set({ user: null, token: null, isLoading: false });
    }
  },

  login: async (email, password) => {
    try {
      const res = await apiClient.post('/auth/login', { email, password });
      const { user } = res.data;
      localStorage.setItem('emr_user', JSON.stringify(user));
      set({ user, token: 'cookie-auth' });
      return true;
    } catch (err: any) {
      return false;
    }
  },

  logout: () => {
    apiClient.post('/auth/logout').catch(() => { /* ignore */ });
    localStorage.removeItem('emr_user');
    set({ user: null, token: null });
  },
}));

// Listen for 401 logout event from API interceptor
window.addEventListener('emr:logout', () => useAuthStore.getState().logout());
