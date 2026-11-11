import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mock-hospital-g05.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const isSupabaseConfigured = (): boolean => {
  return (
    Boolean(supabaseUrl) &&
    Boolean(supabaseAnonKey) &&
    !supabaseUrl.includes('mock-hospital') &&
    !supabaseUrl.includes('your-project-id') &&
    !supabaseAnonKey.includes('placeholder')
  );
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export const checkSupabaseConnection = async (): Promise<{ connected: boolean; latency: number; error?: string }> => {
  if (!isSupabaseConfigured()) {
    return {
      connected: false,
      latency: 0,
      error: 'Supabase credentials not configured in .env (running in local interactive mode).',
    };
  }

  const start = performance.now();
  try {
    const { data, error } = await supabase.from('clinics').select('count', { count: 'exact', head: true });
    const latency = Math.round(performance.now() - start);
    if (error) {
      return { connected: false, latency, error: error.message };
    }
    return { connected: true, latency };
  } catch (err: any) {
    const latency = Math.round(performance.now() - start);
    return { connected: false, latency, error: err.message || 'Connection failed' };
  }
};
