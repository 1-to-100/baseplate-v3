'use client';

import * as React from 'react';
import {useRouter} from 'next/navigation';
import type { Session, SupabaseClient } from '@supabase/supabase-js';

import type { User } from '@/types/user';
import { logger } from '@/lib/default-logger';
import { createClient as createSupabaseClient } from '@/lib/supabase/client';

import type { UserContextValue } from '../types';

export const UserContext = React.createContext<UserContextValue | undefined>(undefined);

export interface UserProviderProps {
  children: React.ReactNode;
}

export function UserProvider({ children }: UserProviderProps): React.JSX.Element {
  const router = useRouter();
  const [supabaseClient] = React.useState<SupabaseClient>(() => createSupabaseClient());
  const isInvite = React.useMemo(() => {
    const { type } = Object.fromEntries(
      new URLSearchParams(typeof window !== 'undefined' ? window.location.hash.slice(1) : '')
    );
    return type === 'invite';
  }, []);

  const isUpdatePassword = React.useMemo(() => {
    const { type } = Object.fromEntries(
      new URLSearchParams(typeof window !== 'undefined' ? window.location.hash.slice(1) : '')
    );
    return type === 'recovery';
  }, []);

  const [state, setState] = React.useState<{ user: User | null; error: string | null; isLoading: boolean }>({
    user: null,
    error: null,
    isLoading: true,
  });

  const syncUser = React.useCallback(async (session: Session | null) => {
    console.log("[syncUser]" );
    const user = session?.user;
    if(!user) return;
    // API call removed
  }, [])

  React.useEffect(() => {
    function handleInitialSession(session: Session | null): void {
      const user = session?.user;

      setState((prev) => ({
        ...prev,
        user: user
          ? ({
              id: user.id ?? undefined,
              email: user.email ?? undefined,
              name: (user.user_metadata?.full_name as string) ?? undefined,
              avatar: (user.user_metadata?.avatar_url as string) ?? undefined,
            } satisfies User)
          : null,
        error: null,
        isLoading: false,
      }));
    }

    function handleSignedIn(session: Session | null): void {
      const user = session?.user;

      setState((prev) => ({
        ...prev,
        user: user
          ? ({
              id: user.id ?? undefined,
              email: user.email ?? undefined,
              name: (user.user_metadata?.full_name as string) ?? undefined,
              avatar: (user.user_metadata?.avatar_url as string) ?? undefined,
            } satisfies User)
          : null,
        error: null,
        isLoading: false,
      }));

      router.refresh();
    }

    function handleSignedOut(): void {
      setState((prev) => ({ ...prev, user: null, error: null, isLoading: false }));

      router.refresh();
    }

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((event, session) => {
      if(isInvite || isUpdatePassword) {
        return;
      }

      logger.debug('[Auth] onAuthStateChange:', event, session);
      
      if (event === 'INITIAL_SESSION') {
        handleInitialSession(session);
        syncUser(session).then();
      }

      if (event === 'SIGNED_IN') {
        handleSignedIn(session);
        syncUser(session).then();
      }

      if (event === 'TOKEN_REFRESHED') {
        logger.debug('[Auth] Token refreshed successfully');
        // Update user state with refreshed session to maintain app_metadata context
        handleInitialSession(session);
      }

      if (event === 'SIGNED_OUT') {
        handleSignedOut();
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [router, supabaseClient, syncUser, isInvite, isUpdatePassword]);

  return <UserContext.Provider value={{ ...state }}>{children}</UserContext.Provider>;
}

export const UserConsumer = UserContext.Consumer;
