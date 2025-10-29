import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

import { config } from '@/config';

export function createClient(): SupabaseClient {
  return createBrowserClient(config.supabase.url!, config.supabase.anonKey!, {
    cookieOptions: {
      name: 'sb',
      path: '/',
      sameSite: 'none', // Required for cross-origin in production
      secure: true, // Required for sameSite='none'
      maxAge: 60 * 60 * 24 * 7, // 7 days
    },
  });
}
