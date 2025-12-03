import type { cookies } from "next/headers";
import type { CookieOptions } from "@supabase/ssr";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { config } from "@/config";

type ResponseCookie = Pick<CookieOptions, "httpOnly" | "maxAge" | "priority">;

export function createClient(
  cookieStore: ReturnType<typeof cookies>
): SupabaseClient {
  return createServerClient(config.supabase.url!, config.supabase.anonKey!, {
    cookies: {
      async get(name: string) {
        const store = await cookieStore;
        return store.get(name)?.value;
      },
      async set(name: string, value: string, options: CookieOptions) {
        try {
          const store = await cookieStore;
          // Pass through Supabase's cookie options without modification
          // Supabase SSR handles security settings appropriately per environment
          store.set({ name, value, ...options });
        } catch (error) {
          // The `set` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
      async remove(name: string, options: CookieOptions) {
        try {
          const store = await cookieStore;
          store.set({ name, value: "", ...options });
        } catch (error) {
          // The `delete` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  });
}
