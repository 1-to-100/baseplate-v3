"use client";

import * as React from "react";
import Alert from "@mui/joy/Alert";
import Button from "@mui/joy/Button";
import Stack from "@mui/joy/Stack";
import Typography from "@mui/joy/Typography";
import type { SupabaseClient } from "@supabase/supabase-js";
import RouterLink from "next/link";

import { paths } from "@/paths";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import { toast } from "@/components/core/toaster";
import { resetPassword } from "@/lib/api/users";

export interface ResetPasswordButtonProps {
  children: React.ReactNode;
  email: string;
}

export function ResetPasswordButton({
  children,
  email,
}: ResetPasswordButtonProps): React.JSX.Element {
  const [supabaseClient] = React.useState<SupabaseClient>(
    createSupabaseClient()
  );

  const [isPending, setIsPending] = React.useState<boolean>(false);
  const [submitError, setSubmitError] = React.useState<string>();

  const handle = React.useCallback(async (): Promise<void> => {
    setIsPending(true);
    setSubmitError(undefined);

    try {
      const response = await resetPassword(email);
      if (response.status === "ok" && response.message) {
        toast.success("Recovery email sent successfully");
      } else {
        setSubmitError("Failed to send recovery email");
      }
    } catch (error) {
      const errorMessage =
        (error as Error).message ||
        "Failed to send recovery email. Please try again later.";
      setSubmitError(errorMessage);
    } finally {
      setIsPending(false);
    }
  }, [email]);

  return (
    <Stack spacing={2}>
      {submitError ? <Alert color="danger">{submitError}</Alert> : null}
      <Stack spacing={1}>
        <Button disabled={!email || isPending} onClick={handle}>
          {children}
        </Button>
        <Typography level="body-sm" textAlign="center">
          Wait a few minutes then try again
        </Typography>
        <Button
          component={RouterLink}
          href={paths.auth.supabase.signIn}
          sx={{
            mt: 4,
          }}
        >
          Back to Login
        </Button>
      </Stack>
    </Stack>
  );
}
