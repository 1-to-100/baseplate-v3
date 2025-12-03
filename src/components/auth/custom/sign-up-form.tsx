'use client';

import * as React from 'react';
import Image from 'next/image';
import RouterLink from 'next/link';
import { useRouter } from 'next/navigation';
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
import Typography from '@mui/joy/Typography';
import { Controller, useForm } from 'react-hook-form';
import { z as zod } from 'zod';

import { paths } from '@/paths';
import { authClient } from '@/lib/auth/custom/client';
import { useUser } from '@/hooks/use-user';
import { DynamicLogo } from '@/components/core/logo';
import { toast } from '@/components/core/toaster';

interface OAuthProvider {
  id: 'google' | 'microsoft' | 'linkedin';
  name: string;
  logo: string;
}

const oAuthProviders = [
  { id: 'google', name: 'Google', logo: '/assets/logo-google.svg' },
  { id: 'microsoft', name: 'Microsoft', logo: '/assets/logo-microsoft.svg' },
  { id: 'linkedin', name: 'LinkedIn', logo: '/assets/logo-linkedin.svg' },
] satisfies OAuthProvider[];

const schema = zod.object({
  firstName: zod.string().min(1, { message: 'First name is required' }),
  lastName: zod.string().min(1, { message: 'Last name is required' }),
  email: zod.string().min(1, { message: 'Email is required' }).email(),
  password: zod.string().min(6, { message: 'Password should be at least 6 characters' }),
  terms: zod.boolean().refine((value) => value, 'You must accept the terms and conditions'),
});

type Values = zod.infer<typeof schema>;

const defaultValues = { firstName: '', lastName: '', email: '', password: '', terms: false } satisfies Values;

export function SignUpForm(): React.JSX.Element {
  const router = useRouter();

  const { checkSession } = useUser();

  const [isPending, setIsPending] = React.useState<boolean>(false);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Values>({ defaultValues, resolver: zodResolver(schema) });

  const onAuth = React.useCallback(async (providerId: OAuthProvider['id']): Promise<void> => {
    setIsPending(true);

    const { error } = await authClient.signInWithOAuth({ provider: providerId });

    if (error) {
      setIsPending(false);
      toast.error(error);
      return;
    }

    setIsPending(false);

    // Redirect to OAuth provider
  }, []);

  const onSubmit = React.useCallback(
    async (values: Values): Promise<void> => {
      setIsPending(true);

      const { error } = await authClient.signUp(values);

      if (error) {
        setError('root', { type: 'server', message: error });
        setIsPending(false);
        return;
      }

      // Refresh the auth state
      await checkSession?.();

      // UserProvider, for this case, will not refresh the router
      // After refresh, GuestGuard will handle the redirect
      router.refresh();
    },
    [checkSession, router, setError]
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
          <Tab component={RouterLink} href={paths.auth.custom.signIn} value="sign-in">
            Sign In
          </Tab>
          <Tab component={RouterLink} href={paths.auth.custom.signUp} value="sign-up">
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
                endDecorator={<Image alt="" height={24} src={provider.logo} width={24} />}
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
                  <Input {...field} />
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
                  <Input {...field} />
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
                  <Input {...field} type="password" />
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
                    <Checkbox
                      checked={field.value}
                      onChange={field.onChange}
                    />
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
                  {errors.terms ? <FormHelperText>{errors.terms.message}</FormHelperText> : null}
                </FormControl>
              )}
            />
            {errors.root ? <Alert color="danger">{errors.root.message}</Alert> : null}
            <Button disabled={isPending} type="submit">
              Create Account
            </Button>
          </Stack>
        </form>
        <Alert color="warning" variant="soft">
          <Typography fontSize="sm">Created users are not persisted</Typography>
        </Alert>
      </Stack>
    </Stack>
  );
}
