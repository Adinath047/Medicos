import { create } from 'zustand';
import { USERS, type User, type UserRole } from '../data/mockData';

interface AuthState {
  user: User | null;
  role: UserRole | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  role: null,
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

  logout: () => set({ user: null, role: null }),
}));
