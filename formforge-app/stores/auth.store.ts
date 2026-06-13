import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { SubscriptionTier } from '@/lib/types';

interface AuthState {
  session: Session | null;
  user: User | null;
  tier: SubscriptionTier;
  isLoading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  setSession: (session: Session | null) => void;
  setTier: (tier: SubscriptionTier) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  tier: 'free',
  isLoading: true,

  setSession: (session) =>
    set({ session, user: session?.user ?? null, isLoading: false }),

  setTier: (tier) => set({ tier }),

  signInWithEmail: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  },

  signUpWithEmail: async (email, password) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, tier: 'free' });
  },
}));
