import { describe, expect, it } from 'vitest';

import { getSupabaseEnv } from './env';

describe('getSupabaseEnv', () => {
  it('throws when url missing', () => {
    expect(() => getSupabaseEnv({ VITE_SUPABASE_ANON_KEY: 'k' })).toThrow();
  });

  it('throws when anon key missing', () => {
    expect(() => getSupabaseEnv({ VITE_SUPABASE_URL: 'http://localhost:54321' })).toThrow();
  });

  it('returns url and anon key', () => {
    const env = getSupabaseEnv({
      VITE_SUPABASE_URL: 'http://localhost:54321',
      VITE_SUPABASE_ANON_KEY: 'anon',
    });
    expect(env).toEqual({ url: 'http://localhost:54321', anonKey: 'anon' });
  });
});
