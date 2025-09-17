'use client';

import * as React from 'react';
import Image from 'next/image';
import RouterLink from 'next/link';
import {zodResolver} from '@hookform/resolvers/zod';
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
import {Eye as EyeIcon} from '@phosphor-icons/react/dist/ssr/Eye';
import {EyeSlash as EyeSlashIcon} from '@phosphor-icons/react/dist/ssr/EyeSlash';
import {Auth, sendSignInLinkToEmail, signInWithEmailLink} from 'firebase/auth';
import {GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup} from 'firebase/auth';
import {Controller, useForm} from 'react-hook-form';
import {z as zod} from 'zod';

import {paths} from '@/paths';
import {getFirebaseAuth} from '@/lib/auth/firebase/client';
import {DynamicLogo} from '@/components/core/logo';
import {toast} from '@/components/core/toaster';

interface OAuthProvider {
    id: 'google' | 'github';
    name: string;
    logo: string;
}

const oAuthProviders = [{id: 'google', name: 'Google', logo: '/assets/logo-google.svg'}] satisfies OAuthProvider[];

const schema = zod.object({
    email: zod.string().min(1, {message: 'Email is required'}).email(),
    password: zod.string().min(1, {message: 'Password is required'}),
});

type Values = zod.infer<typeof schema>;

const defaultValues = {email: '', password: ''} satisfies Values;

const magicLinkSchema = zod.object({
    email: zod.string().min(1, {message: 'Email is required'}).email(),
});

type MagicLinkValues = zod.infer<typeof magicLinkSchema>;

const magicLinkDefaultValues = {email: ''} satisfies MagicLinkValues;

export function SignInForm(): React.JSX.Element {
    const [firebaseAuth] = React.useState<Auth>(getFirebaseAuth());

    const [isPending, setIsPending] = React.useState<boolean>(false);


    const onAuth = React.useCallback(
        async (providerId: OAuthProvider['id']): Promise<void> => {
            setIsPending(true);

            let provider: GoogleAuthProvider;

            switch (providerId) {
                case 'google':
                    provider = new GoogleAuthProvider();
                    break;
                default:
                    throw new Error(`Unknown provider: ${providerId}`);
            }

            try {
                await signInWithPopup(firebaseAuth, provider);
                // UserProvider will handle Router refresh
                // After refresh, GuestGuard will handle the redirect
            } catch (err) {
                setIsPending(false);
                toast.error((err as { message: string }).message);
            }
        },
        [firebaseAuth]
    );


    return (
        <Stack spacing={5}>
            <Box sx={{display: 'flex', justifyContent: 'center'}}>
                <Box component={RouterLink} href={paths.home} sx={{display: 'inline-block', fontSize: 0}}>
                    <DynamicLogo colorDark="light" colorLight="dark" height={32} width={154}/>
                </Box>
            </Box>
            <Tabs value="sign-in" variant="custom">
                <TabList>
                    <Tab component={RouterLink} href={paths.auth.firebase.signIn} value="sign-in">
                        Sign In
                    </Tab>
                    <Tab component={RouterLink} href={paths.auth.firebase.signUp} value="sign-up">
                        Create Account
                    </Tab>
                </TabList>
            </Tabs>
            <Stack spacing={3}>
                <Stack spacing={2}>
                    {oAuthProviders.map(
                        (provider): React.JSX.Element => (
                            <Button
                                color="neutral"
                                disabled={isPending}
                                endDecorator={<Image alt="" height={24} src={provider.logo} width={24}/>}
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
                <MagicLinkSignInForm/>
                <Divider>or</Divider>
                <CredentialsSignInForm/>
            </Stack>
        </Stack>
    );
}

const CredentialsSignInForm = () => {

    const [firebaseAuth] = React.useState<Auth>(getFirebaseAuth());

    const [showPassword, setShowPassword] = React.useState<boolean>();

    const [isPending, setIsPending] = React.useState<boolean>(false);

    const {
        control,
        handleSubmit,
        setError,
        formState: {errors},
    } = useForm<Values>({defaultValues, resolver: zodResolver(schema)});


    const onSubmit = React.useCallback(
        async (values: Values): Promise<void> => {
            setIsPending(true);

            try {
                await signInWithEmailAndPassword(firebaseAuth, values.email, values.password);
                // UserProvider will handle Router refresh
                // After refresh, GuestGuard will handle the redirect
            } catch (err) {
                setError('root', {type: 'server', message: (err as { message: string }).message});
                setIsPending(false);
            }
        },
        [firebaseAuth, setError]
    );

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <Stack spacing={2}>
                <Controller
                    control={control}
                    name="email"
                    render={({field}) => (
                        <FormControl error={Boolean(errors.email)}>
                            <FormLabel>Email Address</FormLabel>
                            <Input {...field} type="email"/>
                            {errors.email ? <FormHelperText>{errors.email.message}</FormHelperText> : null}
                        </FormControl>
                    )}
                />

                <Controller
                    control={control}
                    name="password"
                    render={({field}) => (
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
                                            <EyeSlashIcon fontSize="var(--Icon-fontSize)" weight="bold"/>
                                        ) : (
                                            <EyeIcon fontSize="var(--Icon-fontSize)" weight="bold"/>
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
                    <Link component={RouterLink} href={paths.auth.firebase.resetPassword}>
                        Forgot password?
                    </Link>
                </div>
                {errors.root ? <Alert color="danger">{errors.root.message}</Alert> : null}
                <Button disabled={isPending} type="submit">
                    Sign In
                </Button>
            </Stack>
        </form>
    )
}

const MagicLinkSignInForm = () => {

    const [firebaseAuth] = React.useState<Auth>(getFirebaseAuth());
    const [isPending, setIsPending] = React.useState<boolean>(false);

    const {
        control,
        handleSubmit,
        setError,
        formState: {errors},
    } = useForm<MagicLinkValues>({defaultValues: magicLinkDefaultValues, resolver: zodResolver(magicLinkSchema)});


    const onSubmit = React.useCallback(
        async (values: MagicLinkValues): Promise<void> => {
            setIsPending(true);

            try {
                console.log('magic link sign in', values);
                // await signInWithEmailAndPassword(firebaseAuth, values.email, values.password);
                await sendSignInLinkToEmail(firebaseAuth, values.email, {
                    url: `${window.location.origin}${paths.auth.firebase.signInComplete}?email=${values.email}`,
                    handleCodeInApp: true,
                })
                // UserProvider will handle Router refresh
                // After refresh, GuestGuard will handle the redirect
            } catch (err) {
                console.error('magic link sign in error', err);
                setError('root', {type: 'server', message: (err as { message: string }).message});
                setIsPending(false);
            } finally {
                setIsPending(false);
            }
        },
        [firebaseAuth, setError]
    );

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <Stack spacing={2}>
                <Controller
                    control={control}
                    name="email"
                    render={({field}) => (
                        <FormControl error={Boolean(errors.email)}>
                            <FormLabel>Email Address</FormLabel>
                            <Input {...field} type="email"/>
                            {errors.email ? <FormHelperText>{errors.email.message}</FormHelperText> : null}
                        </FormControl>
                    )}
                />
                {errors.root ? <Alert color="danger">{errors.root.message}</Alert> : null}
                <Button disabled={isPending} type="submit">
                    Send Magic Link
                </Button>
            </Stack>
        </form>
    )
}
