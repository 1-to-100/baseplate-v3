import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

import { config } from '@/config';

export function createClient(): SupabaseClient {
  // Supabase SSR client handles:
  // - Cookie configuration automatically
  // - Auto token refresh (enabled by default)
  // - Session persistence across page reloads
  // Token refresh events are handled in UserContext via onAuthStateChange
  return createBrowserClient(config.supabase.url!, config.supabase.anonKey!, {
    global: {
      fetch: (url, init) => fetch(url, { ...init, cache: 'no-store' as RequestCache }),
    },
  });
}
