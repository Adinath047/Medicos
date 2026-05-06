// client/src/store/authStore.ts
import { create } from 'zustand';
import { apiClient } from '../api/client';

interface AuthUser {
  id: string; name: string; email: string;
  role: string; hospitalId?: string; photoUrl?: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  restoreSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,

  restoreSession: () => {
    const token = localStorage.getItem('emr_token');
    const raw   = localStorage.getItem('emr_user');
    if (token && raw) {
      try { set({ user: JSON.parse(raw), token, isLoading: false }); return; }
      catch { /* fall through */ }
    }
    set({ isLoading: false });
  },

  login: async (email, password) => {
    // ── Try server first ──────────────────────────────────────────────
    try {
      const res = await apiClient.post('/auth/login', { email, password });
      const { token, user } = res.data;
      localStorage.setItem('emr_token', token);
      localStorage.setItem('emr_user', JSON.stringify(user));
      set({ user, token });
      return true;
    } catch { /* server offline — fall through to demo mode */ }

    // ── Offline demo fallback (built-in accounts) ─────────────────────
    const DEMO_USERS: Record<string, AuthUser & { password: string }> = {
      'admin@medicos.local':     { id:'usr-admin-001', name:'System Admin',    email:'admin@medicos.local',     role:'admin',        hospitalId:'hsp-001', password:'Admin@123' },
      'dr.sharma@medicos.local': { id:'usr-doc-001',   name:'Dr. Priya Sharma',email:'dr.sharma@medicos.local', role:'doctor',       hospitalId:'hsp-001', password:'Doctor@123' },
      'reception@medicos.local': { id:'usr-rcpt-001',  name:'Anita Patel',     email:'reception@medicos.local', role:'receptionist', hospitalId:'hsp-001', password:'Recept@123' },
    };

    const demo = DEMO_USERS[email.toLowerCase().trim()];
    if (demo && demo.password === password) {
      const { password: _, ...user } = demo;
      const fakeToken = 'offline-demo-token';
      localStorage.setItem('emr_token', fakeToken);
      localStorage.setItem('emr_user', JSON.stringify(user));
      set({ user, token: fakeToken });
      return true;
    }

    return false;
  },

  logout: () => {
    localStorage.removeItem('emr_token');
    localStorage.removeItem('emr_user');
    set({ user: null, token: null });
  },
}));

// Listen for 401 logout event from API interceptor
window.addEventListener('emr:logout', () => useAuthStore.getState().logout());
