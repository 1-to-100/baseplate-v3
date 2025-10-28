'use client';

import * as React from 'react';
import Image from 'next/image';
import RouterLink from 'next/link';
import {useRouter, useSearchParams} from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/joy/Alert';
import Box from '@mui/joy/Box';
import Button from '@mui/joy/Button';
import Divider from '@mui/joy/Divider';
import FormControl from '@mui/joy/FormControl';
import FormHelperText from '@mui/joy/FormHelperText';
import FormLabel from '@mui/joy/FormLabel';
import IconButton from '@mui/joy/IconButton';
import Input from '@mui/joy/Input';
import Link from '@mui/joy/Link';
import Stack from '@mui/joy/Stack';
import Tab from '@mui/joy/Tab';
import TabList from '@mui/joy/TabList';
import Tabs from '@mui/joy/Tabs';
import { Eye as EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';
import { EyeSlash as EyeSlashIcon } from '@phosphor-icons/react/dist/ssr/EyeSlash';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Controller, useForm } from 'react-hook-form';
import { z as zod } from 'zod';

import { paths } from '@/paths';
import { createClient as createSupabaseClient } from '@/lib/supabase/client';
import { DynamicLogo } from '@/components/core/logo';
import { toast } from '@/components/core/toaster';
import {OAuthProvider, oAuthProviders} from "@/lib/auth/supabase/auth-providers";

const schema = zod.object({
  email: zod.string().min(1, { message: 'Email is required' }).email(),
  password: zod.string().min(1, { message: 'Password is required' }),
});

type Values = zod.infer<typeof schema>;

const defaultValues = { email: '', password: '' } satisfies Values;

export function SignInForm(): React.JSX.Element {
  const [supabaseClient] = React.useState<SupabaseClient>(createSupabaseClient());
  const router = useRouter();
  const [showPassword, setShowPassword] = React.useState<boolean>();
  const [isPending, setIsPending] = React.useState<boolean>(false);
  const searchParams = useSearchParams();
  const hasShownMessage = React.useRef(false);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Values>({ defaultValues, resolver: zodResolver(schema) });

  React.useEffect(() => {
    const message = searchParams.get('message');
    if (message && !hasShownMessage.current) {
      hasShownMessage.current = true;
      toast.success(message);
    }
  }, [searchParams]);

  const onAuth = React.useCallback(
    async (providerId: OAuthProvider['id']): Promise<void> => {
      setIsPending(true);

      const redirectToUrl = new URL(paths.auth.supabase.callback.pkce, window.location.origin);
      redirectToUrl.searchParams.set('next', paths.dashboard.overview);

      const { data, error } = await supabaseClient.auth.signInWithOAuth({
        provider: providerId,
        options: {
          ...(providerId == 'azure' ? { scopes: 'email profile' } : {}),
          redirectTo: redirectToUrl.href
        },
      });

      if (error) {
        setIsPending(false);
        toast.error(error.message);
        return;
      }

      window.location.href = data.url;
    },
    [supabaseClient]
  );

  const onSubmit = React.useCallback(
    async (values: Values): Promise<void> => {
      setIsPending(true);

      const { error } = await supabaseClient.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) {
        if (error.message.includes('Email not confirmed')) {
          // You should resend the verification email.
          // For the sake of simplicity, we will just redirect to the confirmation page.
          const searchParams = new URLSearchParams({ email: values.email });
          router.push(`${paths.auth.supabase.signUpConfirm}?${searchParams.toString()}`);
        } else {
          setError('root', { type: 'server', message: error.message });
          setIsPending(false);
        }
      } else {
        // UserProvider will handle Router refresh
        // After refresh, GuestGuard will handle the redirect
      }
    },
    [supabaseClient, router, setError]
  );

  return (
    <Stack spacing={5}>
      <Box sx={{display: "flex", justifyContent: "center"}}>
        <Box
          component={RouterLink}
          href={paths.home}
          sx={{display: "inline-block", fontSize: 0}}
        >
          <DynamicLogo
            colorDark="light"
            colorLight="dark"
            height={24}
            width={150}
          />
        </Box>
      </Box>
      <Box
        sx={{
          textAlign: "center",
          fontSize: "30px",
          color: "var(--joy-palette-text-primary)",
          fontWeight: "600",
          lineHeight: "32px",
        }}
      >
        Welcome to Baseplate <br/> admin panel
      </Box>
      <Tabs value="sign-in" variant="custom">
        <TabList>
          <Tab
            component={RouterLink}
            href={paths.auth.supabase.signIn}
            value="sign-in"
          >
            Sign In
          </Tab>
          <Tab
            component={RouterLink}
            href={paths.auth.supabase.signUp}
            value="sign-up"
          >
            Sign Up
          </Tab>
        </TabList>
      </Tabs>
      <Stack spacing={3}>
        <Stack spacing={2}>
          {oAuthProviders.map(
            (provider): React.JSX.Element => (
              <Button
                disabled={isPending}
                endDecorator={
                  <Image alt="" height={24} src={provider.logo} width={24}/>
                }
                key={provider.id}
                onClick={(): void => {
                  onAuth(provider.id).catch(() => {
                    // noop
                  });
                }}
                variant="outlined"
              >
                Continue with {provider.name}
              </Button>
            )
          )}
        </Stack>
        <Divider>or</Divider>
      </Stack>
      
      <Stack spacing={3}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack spacing={2}>
            <Controller
              control={control}
              name="email"
              render={({ field }) => (
                <FormControl error={Boolean(errors.email)}>
                  <FormLabel>Email Address</FormLabel>
                  <Input {...field} type="email" />
                  {errors.email ? <FormHelperText>{errors.email.message}</FormHelperText> : null}
                </FormControl>
              )}
            />
            <Controller
              control={control}
              name="password"
              render={({ field }) => (
                <FormControl error={Boolean(errors.password)}>
                  <FormLabel>Password</FormLabel>
                  <Input
                    {...field}
                    endDecorator={
                      <IconButton
                        onClick={(): void => {
                          setShowPassword(!showPassword);
                        }}
                      >
                        {showPassword ? (
                          <EyeSlashIcon fontSize="var(--Icon-fontSize)" weight="bold" />
                        ) : (
                          <EyeIcon fontSize="var(--Icon-fontSize)" weight="bold" />
                        )}
                      </IconButton>
                    }
                    type={showPassword ? 'text' : 'password'}
                  />
                  {errors.password ? <FormHelperText>{errors.password.message}</FormHelperText> : null}
                </FormControl>
              )}
            />
            <div>
              <Link component={RouterLink} href={paths.auth.supabase.resetPassword}>
                Forgot password?
              </Link>
            </div>
            {errors.root ? <Alert color="danger">{errors.root.message}</Alert> : null}
            <Button disabled={isPending} type="submit">
              Sign In
            </Button>
          </Stack>
        </form>
      </Stack>
    </Stack>
  );
}
