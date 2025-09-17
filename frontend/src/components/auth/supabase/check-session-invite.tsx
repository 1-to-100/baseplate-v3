'use client';

import {ReactNode, useEffect, useState} from "react";
import {createClient as createSupabaseClient} from "@/lib/supabase/client";
import Alert from '@mui/joy/Alert';

export const CheckSessionInvite = ({children}: { children: ReactNode }) => {
  const {message} = useCheckSessionInvite();

  return message === null ? <>{children}</> : message === '' ? <></> : <Alert>{message}</Alert>;
}

export const useCheckSessionInvite = () => {
  const [supabaseClient] = useState(() => createSupabaseClient());
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleToken = async () => {
      try {
        const { access_token, refresh_token } = Object.fromEntries(
          new URLSearchParams(window.location.hash.slice(1))
        );

        if (!access_token || !refresh_token) {
          setMessage('Invalid or expired invitation link. Please request a new invitation.');
          return;
        }

        const { error } = await supabaseClient.auth.setSession({
          access_token,
          refresh_token,
        });

        if (error) {
          setMessage(
            "Invalid or expired reset link. Please request a new password reset."
          );
        }
      } catch (error) {
        setMessage('Failed to process reset link. Please try again.')
      }
    };

    handleToken();
  }, [supabaseClient]);

  return {message, supabaseClient};
};