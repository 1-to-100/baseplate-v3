'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@mui/joy/Alert';
import type { SupabaseClient } from '@supabase/supabase-js';

import { paths } from '@/paths';
import { logger } from '@/lib/default-logger';
import { createClient as createSupabaseClient } from '@/lib/supabase/client';
import { supabaseDB } from '@/lib/supabase/database';
import { UserStatus } from '@/lib/constants/user-status';
import { toast } from '@/components/core/toaster';

// This page handles Supabase auth callbacks (invitations, password resets, etc.)
// It processes the hash parameters from the URL and sets the session

const executedRef = { current: false };

export default function Page(): React.JSX.Element | null {
  const [supabaseClient] = React.useState<SupabaseClient>(createSupabaseClient());
  const router = useRouter();

  const [displayError, setDisplayError] = React.useState<string | null>(null);

  const handle = React.useCallback(async (): Promise<void> => {
    // Prevent rerun on DEV mode
    if (executedRef.current) {
      return;
    }

    executedRef.current = true;

    // Callback `error` is received as a URL hash `#error=value`
    // Callback `access_token` is received as a URL hash `#access_token=value`

    const hash = window.location.hash || '#';
    const hashParams = new URLSearchParams(hash.split('#')[1]);
    const searchParams = new URLSearchParams(window.location.search);

    if (hashParams.get('error')) {
      logger.debug(hashParams.get('error_description'));
      const errorDescription = hashParams.get('error_description') || 'Something went wrong';
      setDisplayError(errorDescription);
      toast.error(errorDescription);
      const errorParams = new URLSearchParams({ error: errorDescription });
      router.replace(`${paths.auth.supabase.signIn}?${errorParams.toString()}`);
      return;
    }

    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    const type = hashParams.get('type'); // 'invite', 'recovery', etc.

    if (!accessToken || !refreshToken) {
      setDisplayError('Access token or refresh token is missing');
      toast.error('Access token or refresh token is missing');
      const errorParams = new URLSearchParams({
        error: 'Access token or refresh token is missing',
      });
      router.replace(`${paths.auth.supabase.signIn}?${errorParams.toString()}`);
      return;
    }

    const { error, data } = await supabaseClient.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      logger.debug(error.message);
      toast.error(error.message || 'Something went wrong');
      router.replace(paths.auth.supabase.signIn);
      return;
    }

    // Check user status after successful authentication
    if (data?.user) {
      try {
        const dbUser = await supabaseDB.getCurrentUser();

        // Always check if user is soft-deleted (even for invites)
        if (dbUser.deleted_at) {
          await supabaseClient.auth.signOut();
          toast.error('Your account has been deleted. Please contact support.');
          router.replace(paths.auth.supabase.signIn);
          return;
        }

        // If this is an invite, activate the user and redirect to set password page
        // Users become active as soon as they open the invitation link
        if (type === 'invite') {
          // Activate user if they are currently inactive or invited
          if (dbUser.status === UserStatus.INACTIVE || dbUser.status === 'invited') {
            try {
              await supabaseDB.updateUser(dbUser.user_id, {
                status: UserStatus.ACTIVE,
              });
              logger.debug(`User ${dbUser.user_id} activated on invitation link open`);
            } catch (activateError) {
              // Log error but don't block the flow - user can still set password
              logger.debug('Failed to activate user on invitation:', activateError);
            }
          }
          router.replace(paths.auth.supabase.setNewPassword);
          return;
        }

        // For non-invite flows, check if user is inactive or suspended
        if (dbUser.status === UserStatus.INACTIVE || dbUser.status === UserStatus.SUSPENDED) {
          // Sign out the user immediately
          await supabaseClient.auth.signOut();
          toast.error('Your account is not active. Please contact support.');
          router.replace(paths.auth.supabase.signIn);
          return;
        }
      } catch (dbError) {
        // If we can't fetch user from database, log but don't block
        // The backend guard will catch this on API calls
        logger.debug('Failed to check user status in callback:', dbError);
      }
    }

    // Otherwise, redirect to dashboard or next parameter
    let next = searchParams.get('next');

    if (!next) {
      next = paths.dashboard.overview;
    }

    router.replace(next);
  }, [supabaseClient, router]);

  React.useEffect((): void => {
    // Reset executedRef when component unmounts (for development hot reload)
    executedRef.current = false;
    handle().catch(logger.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Expected
  }, []);

  if (displayError) {
    return <Alert color='danger'>{displayError}</Alert>;
  }

  return null;
}
