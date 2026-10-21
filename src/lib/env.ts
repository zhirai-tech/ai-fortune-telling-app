type EnvLike = Record<string, string | undefined>;

export function getSupabaseEnv(env: EnvLike) {
  const url = (env.VITE_SUPABASE_URL ?? '').trim();
  const anonKey = (env.VITE_SUPABASE_ANON_KEY ?? '').trim();

  if (!url) throw new Error('VITE_SUPABASE_URL is required');
  if (!anonKey) throw new Error('VITE_SUPABASE_ANON_KEY is required');

  return { url, anonKey };
}

export function getSupabaseEnvFromImportMeta() {
  const env = (import.meta as any).env as EnvLike | undefined;
  return getSupabaseEnv(env ?? {});
}

export function getApiEnv(env: EnvLike) {
  const baseUrl = (env.VITE_API_BASE_URL ?? '').trim();
  return { baseUrl };
}

export function getApiEnvFromImportMeta() {
  const env = (import.meta as any).env as EnvLike | undefined;
  return getApiEnv(env ?? {});
}
