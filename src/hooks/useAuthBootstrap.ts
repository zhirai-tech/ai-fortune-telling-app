import { useEffect } from 'react';
import { apiRequest } from '../api/client';
import { useAppStore } from '../store';

export function useAuthBootstrap() {
  const setProfile = useAppStore((s) => s.setProfile);
  const setLanguage = useAppStore((s) => s.setLanguage);
  const clearAuth = useAppStore((s) => s.clearAuth);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const s = useAppStore.getState().session;
      if (!s?.accessToken) return;
      try {
        const data = await apiRequest<{ profile: any }>('/api/me');
        if (cancelled) return;
        setProfile(data.profile ?? null);
        if (data.profile?.locale) setLanguage(data.profile.locale);
      } catch {
        if (cancelled) return;
        clearAuth();
      }
    }

    hydrate();

    return () => {
      cancelled = true;
    };
  }, [clearAuth, setLanguage, setProfile]);
}
