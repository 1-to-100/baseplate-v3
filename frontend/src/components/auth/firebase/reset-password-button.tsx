'use client';

import * as React from 'react';
import Alert from '@mui/joy/Alert';
import Button from '@mui/joy/Button';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import { sendPasswordResetEmail } from 'firebase/auth';
import type { Auth } from 'firebase/auth';

import { getFirebaseAuth } from '@/lib/auth/firebase/client';

export interface ResetPasswordButtonProps {
  children: React.ReactNode;
  email: string;
}

export function ResetPasswordButton({ children, email }: ResetPasswordButtonProps): React.JSX.Element {
  const [firebaseAuth] = React.useState<Auth>(getFirebaseAuth());

  const [isPending, setIsPending] = React.useState<boolean>(false);
  const [submitError, setSubmitError] = React.useState<string>();

  const handle = React.useCallback(async (): Promise<void> => {
    try {
      await sendPasswordResetEmail(firebaseAuth, email);
    } catch (err) {
      setSubmitError((err as { message: string }).message);
      setIsPending(false);
    }
  }, [firebaseAuth, email]);

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
      </Stack>
    </Stack>
  );
}
