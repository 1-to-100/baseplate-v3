'use client';

import * as React from 'react';
import Image from 'next/image';
import RouterLink from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/joy/Alert';
import Box from '@mui/joy/Box';
import Button from '@mui/joy/Button';
import Checkbox from '@mui/joy/Checkbox';
import Divider from '@mui/joy/Divider';
import FormControl from '@mui/joy/FormControl';
import FormHelperText from '@mui/joy/FormHelperText';
import FormLabel from '@mui/joy/FormLabel';
import Input from '@mui/joy/Input';
import Link from '@mui/joy/Link';
import Stack from '@mui/joy/Stack';
import Tab from '@mui/joy/Tab';
import TabList from '@mui/joy/TabList';
import Tabs from '@mui/joy/Tabs';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Controller, useForm } from 'react-hook-form';
import { z as zod } from 'zod';

import { paths } from '@/paths';
import { createClient as createSupabaseClient } from '@/lib/supabase/client';
import { DynamicLogo } from '@/components/core/logo';
import { toast } from '@/components/core/toaster';
import {OAuthProvider, oAuthProviders} from "@/lib/auth/supabase/auth-providers";
import {IconButton, Typography} from "@mui/joy";
import {config} from "@/config";
import {apiFetch} from "@/lib/api/api-fetch";
import {ApiUser} from "@/contexts/auth/types";
import {registerUser, validateEmail} from "@/lib/api/users";
import { Eye as EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';
import { EyeSlash as EyeSlashIcon } from '@phosphor-icons/react/dist/ssr/EyeSlash';

const schema = zod.object({
  firstName: zod.string().min(1, { message: 'First name is required' }).max(255, { message: 'First name must be less than 255 characters' }),
  lastName: zod.string().min(1, { message: 'Last name is required' }).max(255, { message: 'Last name must be less than 255 characters' }),
  email: zod.string().min(1, { message: 'Email is required' }).email(),
  password: zod.string()
    .min(8, { message: 'Password must be at least 8 characters long' })
    .max(100, { message: 'Password must be less than 100 characters' })
    .regex(/^(?=.*[a-z])/, { message: 'Password must contain at least one lowercase letter' })
    .regex(/^(?=.*[A-Z])/, { message: 'Password must contain at least one uppercase letter' })
    .regex(/^(?=.*\d)/, { message: 'Password must contain at least one number' })
    .regex(/^[^\s]*$/, { message: 'Password cannot contain spaces' }),
  terms: zod.boolean().refine((value) => value, 'You must accept the terms and conditions'),
});

type Values = zod.infer<typeof schema>;

const defaultValues = { firstName: '', lastName: '', email: '', password: '', terms: false } satisfies Values;

export function SignUpForm(): React.JSX.Element {
  const [supabaseClient] = React.useState<SupabaseClient>(createSupabaseClient());
  const searchParams = useSearchParams();
  const hasShownErrorMessage = React.useRef(false);
  const router = useRouter();
  const [showPassword, setShowPassword] = React.useState<boolean>();

  const [isPending, setIsPending] = React.useState<boolean>(false);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Values>({ defaultValues, resolver: zodResolver(schema) });

  React.useEffect(() => {
    const errorMessage = searchParams.get('error');
    if (errorMessage && !hasShownErrorMessage.current) {
      hasShownErrorMessage.current = true;
      toast.error(errorMessage);
    }
  }, []);

  const onAuth = React.useCallback(
    async (providerId: OAuthProvider['id']): Promise<void> => {
      setIsPending(true);

      const redirectToUrl = new URL(paths.auth.supabase.callback.pkce, window.location.origin);
      redirectToUrl.searchParams.set('next', paths.dashboard.overview);

      const { data, error } = await supabaseClient.auth.signInWithOAuth({
        provider: providerId,
        options: { redirectTo: redirectToUrl.href },
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

      try {
        const isSuccessEmail = await validateEmail(values.email);
        if (!isSuccessEmail) {
          throw new Error("Email validation failed");
        }

        const registeredUser = await registerUser({
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          password: values.password,
        });

        // It is really important that you read the official notes
        // under "If signUp() is called for an existing confirmed user"
        // https://supabase.com/docs/reference/javascript/auth-signup
        // If a user already exists with this email, they will not
        // receive a confirmation email.
        /*
        const redirectToUrl = new URL(paths.auth.supabase.callback.pkce, window.location.origin);
        redirectToUrl.searchParams.set('next', paths.dashboard.overview);

        const {data, error} = await supabaseClient.auth.signUp({
          email: values.email,
          password: values.password,
          options: {emailRedirectTo: redirectToUrl.href, data: {firstName: values.firstName, lastName: values.lastName}},
        });

        if (error) {
          setError('root', { type: 'server', message: error.message });
          setIsPending(false);
          return;
        }

        if (data.session) {
          // UserProvider will handle Router refresh
          // After refresh, GuestGuard will handle the redirect
          return;
        }
         */

        if (registeredUser) {
          const searchParams = new URLSearchParams({ email: values.email });
          router.push(`${paths.auth.supabase.signUpConfirm}?${searchParams.toString()}`);
          return;
        }
      } catch (error) {
        const errorMessage = (error as { message: string }).message;
        toast.error(errorMessage);
        setError("root", {
          type: "server",
          message: errorMessage,
        });
      }

      setIsPending(false);
    },
    [supabaseClient, router, setError]
  );

  return (
    <Stack spacing={5}>
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Box component={RouterLink} href={paths.home} sx={{ display: 'inline-block', fontSize: 0 }}>
          <DynamicLogo colorDark="light" colorLight="dark" height={32} width={154} />
        </Box>
      </Box>
      <Tabs value="sign-up" variant="custom">
        <TabList>
          <Tab component={RouterLink} href={paths.auth.supabase.signIn} value="sign-in">
            Sign In
          </Tab>
          <Tab component={RouterLink} href={paths.auth.supabase.signUp} value="sign-up">
            Create Account
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
        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack spacing={2}>
            <Controller
              control={control}
              name="firstName"
              render={({ field }) => (
                <FormControl error={Boolean(errors.firstName)}>
                  <FormLabel>First Name</FormLabel>
                  <Input 
                    {...field} 
                    slotProps={{ input: { maxLength: 255 } }} 
                    onChange={(e) => field.onChange(e.target.value.trimStart())}
                  />
                  {errors.firstName ? <FormHelperText>{errors.firstName.message}</FormHelperText> : null}
                </FormControl>
              )}
            />
            <Controller
              control={control}
              name="lastName"
              render={({ field }) => (
                <FormControl error={Boolean(errors.lastName)}>
                  <FormLabel>Last Name</FormLabel>
                  <Input 
                    {...field} 
                    slotProps={{ input: { maxLength: 255 } }} 
                    onChange={(e) => field.onChange(e.target.value.trimStart())}
                  />
                  {errors.lastName ? <FormHelperText>{errors.lastName.message}</FormHelperText> : null}
                </FormControl>
              )}
            />
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
                  <Input {...field} type={showPassword ? 'text' : 'password'}
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
                  />
                  {errors.password ? <FormHelperText>{errors.password.message}</FormHelperText> : null}
                </FormControl>
              )}
            />
            <Controller
              control={control}
              name="terms"
              render={({ field }) => (
                <FormControl error={Boolean(errors.terms)}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                    }}
                  >
                    <Checkbox checked={field.value} onChange={field.onChange} />
                    <Typography
                      level="body-sm"
                      sx={{
                        fontSize: "14px",
                        color: "var(--joy-palette-text-primary)",
                      }}
                    >
                      I have read the <Link>terms and conditions</Link>
                    </Typography>
                  </Box>
                  {errors.terms ? (
                    <FormHelperText>{errors.terms.message}</FormHelperText>
                  ) : null}
                </FormControl>
              )}
            />
            {errors.root ? <Alert color="warning">{errors.root.message}</Alert> : null}
            <Button disabled={isPending} type="submit">
              Create Account
            </Button>
          </Stack>
        </form>
      </Stack>
    </Stack>
  );
}
