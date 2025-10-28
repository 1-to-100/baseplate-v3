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
          // Enhance security: Ensure sameSite and secure flags are set
          // while preserving Supabase's httpOnly decisions per cookie
          const secureOptions: CookieOptions = {
            ...options,
            path: options.path || '/',
            sameSite: options.sameSite || 'lax', // CSRF protection
            secure: options.secure ?? (process.env.NODE_ENV === 'production'), // HTTPS in production
            // Note: httpOnly is NOT forced here - Supabase sets it per cookie type
            // Auth tokens get httpOnly=true, but client-accessible cookies need httpOnly=false
          };
          store.set({ name, value, ...secureOptions });
        } catch (error) {
          // The `set` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
      async remove(name: string, options: CookieOptions) {
        try {
          const store = await cookieStore;
          const secureOptions: CookieOptions = {
            ...options,
            path: options.path || '/',
            sameSite: options.sameSite || 'lax',
            secure: options.secure ?? (process.env.NODE_ENV === 'production'),
          };
          store.set({ name, value: "", ...secureOptions });
        } catch (error) {
          // The `delete` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  });
}
