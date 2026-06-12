// client/src/store/authStore.ts
import { create } from 'zustand';
import { apiClient } from '../api/client';

export interface AuthUser {
  id:               string;
  name:             string;
  email:            string;
  role:             string;
  hospitalId?:      string;
  photoUrl?:        string;
  staff_type?:      string;
  specialization?:  string;
  licenseNumber?:   string;
  consultationFee?: number;
  followupFee?:     number;
  letterhead?:      string;
}

interface AuthState {
  user:           AuthUser | null;
  isLoading:      boolean;
  loginError:     string | null;
  login:          (email: string, password: string) => Promise<boolean>;
  logout:         () => void;
  restoreSession: () => Promise<void>;
}

// ── Helpers ────────────────────────────────────────────────────────────────
// Only the non-sensitive user PROFILE is cached in localStorage for instant UI
// restore and offline support. The JWT token lives only in the HttpOnly cookie
// — it is never accessible to JavaScript, preventing XSS token theft.
function clearLocalAuth() {
  localStorage.removeItem('emr_user');
}

function persistLocalAuth(user: AuthUser) {
  localStorage.setItem('emr_user', JSON.stringify(user));
}

// ── Store ──────────────────────────────────────────────────────────────────
export const useAuthStore = create<AuthState>((set, get) => ({
  user:       null,
  isLoading:  true,
  loginError: null,

  // ── restoreSession ───────────────────────────────────────────────────────
  // Called once on app mount. Hits /auth/me using the HttpOnly cookie to
  // re-hydrate the user. Shows cached profile instantly then validates server-side.
  restoreSession: async () => {
    // Show cached user instantly so UI renders without a blank-screen flash
    const cachedUser = localStorage.getItem('emr_user');
    if (cachedUser) {
      try {
        const parsed = JSON.parse(cachedUser) as AuthUser;
        set({ user: parsed, isLoading: true });
      } catch {
        clearLocalAuth();
      }
    }

    try {
      const res = await apiClient.get('/auth/me');
      const { user } = res.data as { user: AuthUser };

      persistLocalAuth(user);
      set({ user, isLoading: false });

      // Kick off a sync after restoring the session
      import('../sync/syncManager').then(m => m.syncNow()).catch(console.error);
    } catch (err: any) {
      const status = err?.response?.status;

      if (status === 401) {
        // Cookie expired — clear cached profile
        clearLocalAuth();
        set({ user: null, isLoading: false });
      } else {
        // Network error (offline) — keep cached profile so app still works offline
        console.warn('[authStore] Could not reach server to verify session:', err?.message);
        const cached = localStorage.getItem('emr_user');
        if (cached) {
          try {
            set({ user: JSON.parse(cached), isLoading: false });
          } catch {
            set({ user: null, isLoading: false });
          }
        } else {
          set({ user: null, isLoading: false });
        }
      }
    }
  },

  // ── login ────────────────────────────────────────────────────────────────
  login: async (email, password) => {
    set({ loginError: null });
    try {
      const res = await apiClient.post('/auth/login', { email, password });
      const { user } = res.data as { user: AuthUser; token: string };

      // Token is in the HttpOnly cookie set by the server — do NOT store in localStorage
      persistLocalAuth(user);
      set({ user, loginError: null });

      // Kick off sync after login
      import('../sync/syncManager').then(m => m.syncNow()).catch(console.error);

      return true;
    } catch (err: any) {
      const message: string =
        err?.response?.data?.error ||
        (err?.message === 'Network Error'
          ? 'Cannot reach server. Check your connection.'
          : 'Login failed. Please try again.');
      set({ loginError: message });
      return false;
    }
  },

  // ── logout ───────────────────────────────────────────────────────────────
  logout: () => {
    // Fire-and-forget the server-side logout (clears httpOnly cookie)
    apiClient.post('/auth/logout').catch(() => { /* ignore — local state cleared anyway */ });
    clearLocalAuth();
    set({ user: null, loginError: null });
  },
}));

// ── Global 401 listener (from Axios interceptor) ──────────────────────────
if (typeof window !== 'undefined') {
  window.addEventListener('emr:logout', () => {
    useAuthStore.getState().logout();
  });
}