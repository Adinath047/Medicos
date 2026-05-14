// client/src/store/authStore.ts
import { create } from 'zustand';
import { apiClient } from '../api/client';

interface AuthUser {
  id: string; name: string; email: string;
  role: string; hospitalId?: string; photoUrl?: string;
  staff_type?: string; // 'front_desk' | 'pharmacy' — for receptionist sub-roles
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  restoreSession: () => void;
}

// ── Offline demo accounts (DEV only) ─────────────────────────────────────────
// These are only used when the server is unreachable AND we are in dev mode.
const DEV_FALLBACK_USERS: Record<string, AuthUser & { password: string }> = {
  'adinathmade@medicos.com': { id:'usr-admin-001', name:'Adinath Admin', email:'adinathmade@medicos.com', role:'admin', hospitalId:'hsp-001', password:'adinathmade33' },
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,

  restoreSession: () => {
    const raw = localStorage.getItem('emr_user');
    // We can't read httpOnly emr_token, but csrf_token is readable by JS
    const hasCsrfCookie = document.cookie.includes('csrf_token=');
    const isOfflineDemo = localStorage.getItem('emr_is_demo') === 'true';

    if (raw) {
      try {
        const user = JSON.parse(raw) as AuthUser;
        
        if (isOfflineDemo && import.meta.env.PROD) {
          localStorage.removeItem('emr_user');
          localStorage.removeItem('emr_is_demo');
          set({ isLoading: false });
          return;
        }

        if (hasCsrfCookie || isOfflineDemo) {
          set({ user, token: 'cookie-auth', isLoading: false });
          return;
        }
      } catch { /* fall through */ }
    }
    
    // Clear dead state if no cookie/demo active
    localStorage.removeItem('emr_user');
    localStorage.removeItem('emr_is_demo');
    set({ isLoading: false });
  },

  login: async (email, password) => {
    // ── Always try the real server first ─────────────────────────────────
    try {
      const res = await apiClient.post('/auth/login', { email, password });
      const { user } = res.data;
      localStorage.setItem('emr_user', JSON.stringify(user));
      localStorage.removeItem('emr_is_demo');
      set({ user, token: 'cookie-auth' });
      return true;
    } catch (err: any) {
      // If the server is reachable and returned 401/422, don't fall through to offline
      const status = err?.response?.status;
      if (status === 401 || status === 422 || status === 400) return false;
      // Server offline (network error, 5xx) — fall through to offline fallback if DEV
    }

    // ── Offline dev fallback (built-in accounts) — DEV only ─────────────
    if (import.meta.env.DEV) {
      const demo = DEV_FALLBACK_USERS[email.toLowerCase().trim()];
      if (demo && demo.password === password) {
        const { password: _, ...user } = demo;
        const fakeToken = 'offline-demo-token';
        localStorage.setItem('emr_is_demo', 'true');
        localStorage.setItem('emr_user', JSON.stringify(user));
        set({ user, token: fakeToken });
        return true;
      }
    }

    return false;
  },

  logout: () => {
    // Fire-and-forget — don't block UI on server response
    apiClient.post('/auth/logout').catch(() => { /* ignore */ });
    
    localStorage.removeItem('emr_user');
    localStorage.removeItem('emr_is_demo');
    set({ user: null, token: null });
  },
}));

// Listen for 401 logout event from API interceptor
window.addEventListener('emr:logout', () => useAuthStore.getState().logout());
