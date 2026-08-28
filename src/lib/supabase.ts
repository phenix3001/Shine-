import { createClient } from '@supabase/supabase-js';

// Ключи берутся из .env локально и из Vercel → Settings → Environment Variables на проде.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

export async function getGoogleAuthStatus(): Promise<'enabled' | 'disabled' | 'unknown'> {
  if (!url || !anonKey) return 'disabled';

  try {
    const response = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: anonKey },
    });
    if (!response.ok) return 'unknown';
    const settings = await response.json() as { external?: { google?: boolean } };
    return settings.external?.google === true ? 'enabled' : 'disabled';
  } catch {
    return 'unknown';
  }
}

// Запасные значения позволяют показать понятную подсказку в интерфейсе вместо белого экрана.
export const supabase = createClient(
  url ?? 'https://not-configured.supabase.co',
  anonKey ?? 'not-configured',
  {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
    },
  },
);
