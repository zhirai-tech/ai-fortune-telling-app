import { createClient } from '@supabase/supabase-js';
import { getSupabaseEnvFromImportMeta } from '../lib/env';

const { url: supabaseUrl, anonKey: supabaseAnonKey } = getSupabaseEnvFromImportMeta();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storageKey: 'sb-yijing-auth-token',
  },
});
