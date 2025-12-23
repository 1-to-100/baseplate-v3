// TypeScript types for process.env (provides autocomplete only)
type Env = {
  NEXT_PUBLIC_AUTH_STRATEGY?: string;
  NEXT_PUBLIC_SITE_URL?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
};

declare global {
  namespace NodeJS {
    type ProcessEnv = Env;
  }
}

