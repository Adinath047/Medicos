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
  token:          string | null;
  isLoading:      boolean;
  loginError:     string | null;
  login:          (email: string, password: string) => Promise<boolean>;
  logout:         () => void;
  restoreSession: () => Promise<void>;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function clearLocalAuth() {
  localStorage.removeItem('emr_token');
  localStorage.removeItem('emr_user');
}

function persistLocalAuth(user: AuthUser, token: string) {
  localStorage.setItem('emr_token', token);
  localStorage.setItem('emr_user', JSON.stringify(user));
}

// ── Store ──────────────────────────────────────────────────────────────────
export const useAuthStore = create<AuthState>((set, get) => ({
  user:       null,
  token:      null,
  isLoading:  true,
  loginError: null,

  // ── restoreSession ───────────────────────────────────────────────────────
  // Called once on app mount. Hits /auth/me with the cookie (or the token
  // stored in localStorage via the Axios interceptor) to re-hydrate the user.
  restoreSession: async () => {
    // FIX: Try a cached user first so the UI renders instantly, then validate
    // against the server in the background. This eliminates the blank-screen
    // flash on page refresh.
    const cachedUser = localStorage.getItem('emr_user');
    if (cachedUser) {
      try {
        const parsed = JSON.parse(cachedUser) as AuthUser;
        set({ user: parsed, token: localStorage.getItem('emr_token'), isLoading: true });
      } catch {
        clearLocalAuth();
      }
    }

    try {
      const res = await apiClient.get('/auth/me');
      const { user } = res.data as { user: AuthUser };

      // Server may have issued a refreshed token in a Set-Cookie header;
      // preserve whatever token we currently have in localStorage.
      const token = localStorage.getItem('emr_token') || 'cookie-auth';
      persistLocalAuth(user, token);
      set({ user, token, isLoading: false });

      // Kick off a sync after restoring the session
      import('../sync/syncManager').then(m => m.syncNow()).catch(console.error);
    } catch (err: any) {
      const status = err?.response?.status;

      if (status === 401) {
        // Token expired — clear everything
        clearLocalAuth();
        set({ user: null, token: null, isLoading: false });
      } else {
        // Network error (CORS / Render cold-start / offline) — keep cached
        // user so the app still works offline; just stop the loading spinner.
        console.warn('[authStore] Could not reach server to verify session:', err?.message);
        const cached = localStorage.getItem('emr_user');
        if (cached) {
          try {
            set({ user: JSON.parse(cached), token: localStorage.getItem('emr_token'), isLoading: false });
          } catch {
            set({ user: null, token: null, isLoading: false });
          }
        } else {
          set({ user: null, token: null, isLoading: false });
        }
      }
    }
  },

  // ── login ────────────────────────────────────────────────────────────────
  login: async (email, password) => {
    set({ loginError: null });
    try {
      const res = await apiClient.post('/auth/login', { email, password });
      const { user, token } = res.data as { user: AuthUser; token: string };

      persistLocalAuth(user, token);
      set({ user, token, loginError: null });

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
    set({ user: null, token: null, loginError: null });
  },
}));

// ── Global 401 listener (from Axios interceptor) ──────────────────────────
// FIX: guard added so this doesn't fire during SSR / non-browser environments
if (typeof window !== 'undefined') {
  window.addEventListener('emr:logout', () => {
    useAuthStore.getState().logout();
  });
}