import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

import { config } from '@/config';

export function createClient(): SupabaseClient {
  // Let Supabase SSR handle cookie configuration automatically
  // It will use appropriate settings based on the environment
  return createBrowserClient(config.supabase.url!, config.supabase.anonKey!);
}
