'use client';

import * as React from 'react';
import {useRouter} from 'next/navigation';
import type { Session, SupabaseClient } from '@supabase/supabase-js';

import type { User } from '@/types/user';
import { logger } from '@/lib/default-logger';
import { createClient as createSupabaseClient } from '@/lib/supabase/client';
import { supabaseDB } from '@/lib/supabase/database';
import { UserStatus } from '@/lib/constants/user-status';
import { toast } from '@/components/core/toaster';

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
    
    // Check if this is an invite or password recovery flow - skip status checks for these
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    const hashParams = new URLSearchParams(hash.slice(1));
    const type = hashParams.get('type');
    const isInviteFlow = type === 'invite';
    const isRecoveryFlow = type === 'recovery';
    
    // Activate user if they just confirmed their email
    // This will set status to 'active' and assign standard_user role if missing
    // The function is idempotent - it only activates if user is inactive and email is confirmed
    try {
      const { error: activateError } = await supabaseClient.rpc('activate_user_on_email_confirmation');
      if (activateError) {
        logger.debug('Failed to activate user on email confirmation:', activateError);
        // Don't block the flow if activation fails
      }
    } catch (err) {
      logger.debug('Error calling activate_user_on_email_confirmation:', err);
      // Don't block the flow if activation fails
    }

    // Skip status checks for invite and recovery flows
    // Invited users need to set their password first, and recovery flows are handled separately
    if (isInviteFlow || isRecoveryFlow) {
      return;
    }

    // Check user status after authentication
    try {
      const dbUser = await supabaseDB.getCurrentUser();
      
      // Check if user is soft-deleted
      if (dbUser.deleted_at) {
        await supabaseClient.auth.signOut();
        toast.error('Your account has been deleted. Please contact support.');
        logger.warn(`User ${user.id} attempted to sign in but account is deleted`);
        return;
      }
      
      if (
        dbUser.status === UserStatus.INACTIVE ||
        dbUser.status === UserStatus.SUSPENDED
      ) {
        // Sign out the user immediately
        await supabaseClient.auth.signOut();
        toast.error('Your account is not active. Please contact support.');
        logger.warn(`User ${user.id} attempted to sign in with status: ${dbUser.status}`);
        return;
      }
    } catch (dbError) {
      // If we can't fetch user from database, log but don't block
      // The backend guard will catch this on API calls
      logger.debug('Failed to check user status in syncUser:', dbError);
    }
  }, [supabaseClient])

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
