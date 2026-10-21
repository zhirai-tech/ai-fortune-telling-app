import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CodeType = 'monthly' | 'quarterly' | 'yearly' | 'permanent';

export type AppRole = 'free' | 'paid' | 'admin';
export type AppUserStatus = 'active' | 'banned';

export interface ProfileRow {
  id: string;
  email: string | null;
  role: AppRole;
  status: AppUserStatus;
  locale: string;
  name: string;
  gender: string;
  birth_date: string | null;
  birth_time: string | null;
  relationship_status: string | null;
  birth_place: string;
  current_residence: string;
  daily_remaining: number;
  daily_date: string;
  monthly_remaining: number;
  monthly_month: string;
  vip_expiry: string | null;
  created_at: string;
  updated_at: string;
}

export type AppTheme = 'glass' | 'solid';

export interface AuthSession {
  accessToken: string;
}

interface AppState {
  session: AuthSession | null;
  profile: ProfileRow | null;
  language: string;
  theme: AppTheme;
  setLanguage: (lang: string) => void;
  setTheme: (theme: AppTheme) => void;
  setSession: (session: AuthSession | null) => void;
  setProfile: (profile: ProfileRow | null) => void;
  clearAuth: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      session: null,
      profile: null,
      language: 'en',
      theme: 'solid',
      setLanguage: (language) => set({ language }),
      setTheme: (theme) => set({ theme }),
      setSession: (session) => set({ session }),
      setProfile: (profile) => set({ profile }),
      clearAuth: () => set({ session: null, profile: null }),
    }),
    {
      name: 'yijing-storage',
      partialize: (state) => ({
        session: state.session,
        profile: state.profile,
        language: state.language,
        theme: state.theme,
      }),
    },
  ),
);
