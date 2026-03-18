import { create } from 'zustand';
import { Profile } from '@/types';
import { authService } from '@/services/auth.service';

interface AuthState {
  user: Profile | null;
  session: any | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;

  // Actions
  setUser: (user: Profile | null) => void;
  setSession: (session: any | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Async actions
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,

  setUser: (user) => set({ 
    user, 
    isAuthenticated: !!user,
    isLoading: false 
  }),

  setSession: (session) => set({ session }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  refreshProfile: async () => {
    const { session } = get();
    if (!session?.user?.id) return;

    try {
      const profile = await authService.getProfile(session.user.id);
      set({ user: profile, isAuthenticated: !!profile });
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  },

  signOut: async () => {
    try {
      await authService.signOut();
      set({ user: null, session: null, isAuthenticated: false });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  },
}));
