import { create } from 'zustand';
import { USERS, type User, type UserRole } from '../data/mockData';

interface AuthState {
  user: User | null;
  role: UserRole | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updatePhoto: (photoURL: string) => void;
}

// Default user — app opens directly as Admin without requiring login
const DEFAULT_USER = USERS.find((u) => u.role === 'admin') ?? USERS[0];

export const useAuthStore = create<AuthState>((set) => ({
  // Pre-set admin user so the login screen is never shown
  user: DEFAULT_USER,
  role: DEFAULT_USER.role,
  isLoading: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    await new Promise((r) => setTimeout(r, 800));
    const found = USERS.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    if (found) {
      set({ user: found, role: found.role, isLoading: false });
      return true;
    }
    set({ isLoading: false });
    return false;
  },

  logout: () => set({ user: DEFAULT_USER, role: DEFAULT_USER.role }),

  updatePhoto: (photoURL: string) =>
    set((state) => ({ user: state.user ? { ...state.user, photoURL } : null })),
}));
