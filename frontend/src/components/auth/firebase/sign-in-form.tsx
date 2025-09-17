"use client";

import * as React from "react";
import Image from "next/image";
import RouterLink from "next/link";
import {zodResolver} from "@hookform/resolvers/zod";
import Alert from "@mui/joy/Alert";
import Box from "@mui/joy/Box";
import Button from "@mui/joy/Button";
import Divider from "@mui/joy/Divider";
import FormControl from "@mui/joy/FormControl";
import FormHelperText from "@mui/joy/FormHelperText";
import FormLabel from "@mui/joy/FormLabel";
import IconButton from "@mui/joy/IconButton";
import Input from "@mui/joy/Input";
import Link from "@mui/joy/Link";
import Stack from "@mui/joy/Stack";
import Tab from "@mui/joy/Tab";
import TabList from "@mui/joy/TabList";
import Tabs from "@mui/joy/Tabs";
import {Eye as EyeIcon} from "@phosphor-icons/react/dist/ssr/Eye";
import {EyeSlash as EyeSlashIcon} from "@phosphor-icons/react/dist/ssr/EyeSlash";
import type {Auth} from "firebase/auth";
import {GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup,} from "firebase/auth";
import {Controller, useForm} from "react-hook-form";
import {z as zod} from "zod";

import {paths} from "@/paths";
import {getFirebaseAuth} from "@/lib/auth/firebase/client";
import {DynamicLogo} from "@/components/core/logo";
import {toast} from "@/components/core/toaster";
import {useAuth} from '@/contexts/auth/user-context';

interface OAuthProvider {
    id: "google" | "github";
    name: string;
    logo: string;
}

const oAuthProviders = [
    {id: "google", name: "Google", logo: "/assets/logo-google.svg"},
] satisfies OAuthProvider[];

const schema = zod.object({
    email: zod.string().min(1, {message: "Email is required"}).email(),
    password: zod.string().min(1, {message: "Password is required"}),
});

type Values = zod.infer<typeof schema>;

const defaultValues = {email: "", password: ""} satisfies Values;

export function SignInForm(): React.JSX.Element {
    const [firebaseAuth] = React.useState<Auth>(getFirebaseAuth());
    const [showPassword, setShowPassword] = React.useState<boolean>(false);
    const [isPending, setIsPending] = React.useState<boolean>(false);
    const auth = useAuth();

    const {
        control,
        handleSubmit,
        setError,
        formState: {errors},
    } = useForm<Values>({defaultValues, resolver: zodResolver(schema)});

    const onAuth = React.useCallback(
        async (providerId: OAuthProvider["id"]): Promise<void> => {
            setIsPending(true);

            let provider: GoogleAuthProvider;

            switch (providerId) {
                case "google":
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

    const onSubmit = React.useCallback(
        async (values: Values): Promise<void> => {
            setIsPending(true);

            try {
                await signInWithEmailAndPassword(
                    firebaseAuth,
                    values.email,
                    values.password
                );
                auth?.syncUser?.()
                // UserProvider will handle Router refresh
                // After refresh, GuestGuard will handle the redirect
            } catch (err) {
                setError("root", {
                    type: "server",
                    message: (err as { message: string }).message,
                });
                setIsPending(false);
            }
        },
        [firebaseAuth, setError]
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
            <Tabs value="sign-in" variant="custom">
                <TabList>
                    <Tab
                        component={RouterLink}
                        href={paths.auth.firebase.signIn}
                        value="sign-in"
                    >
                        Sign In
                    </Tab>
                    <Tab
                        component={RouterLink}
                        href={paths.auth.firebase.sso}
                        value="sso"
                    >
                        SSO
                    </Tab>
                    <Tab
                        component={RouterLink}
                        href={paths.auth.firebase.signUp}
                        value="sign-up"
                    >
                        Sign Up
                    </Tab>
                </TabList>
            </Tabs>
            <Stack spacing={3}>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <Stack spacing={2}>
                        <Controller
                            control={control}
                            name="email"
                            render={({field}) => (
                                <FormControl error={Boolean(errors.email)}>
                                    <FormLabel>Email Address</FormLabel>
                                    <Input
                                        {...field}
                                        autoComplete="username"
                                        type="email"/>
                                    {errors.email ? (
                                        <FormHelperText>{errors.email.message}</FormHelperText>
                                    ) : null}
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
                                        autoComplete="current-password"
                                        {...field}
                                        endDecorator={
                                            <IconButton
                                                onClick={(): void => {
                                                    setShowPassword(!showPassword);
                                                }}
                                            >
                                                {showPassword ? (
                                                    <EyeSlashIcon
                                                        fontSize="var(--Icon-fontSize)"
                                                        weight="bold"
                                                    />
                                                ) : (
                                                    <EyeIcon
                                                        fontSize="var(--Icon-fontSize)"
                                                        weight="bold"
                                                    />
                                                )}
                                            </IconButton>
                                        }
                                        type={showPassword ? "text" : "password"}
                                    />
                                    {errors.password ? (
                                        <FormHelperText>{errors.password.message}</FormHelperText>
                                    ) : null}
                                </FormControl>
                            )}
                        />
                        <div>
                            <Link
                                component={RouterLink}
                                href={paths.auth.firebase.resetPassword}
                                fontSize={"sm"}
                                fontWeight="sm"
                                marginBottom={2}
                            >
                                Forgot password?
                            </Link>
                        </div>
                        {errors.root ? (
                            <Alert color="danger">{errors.root.message}</Alert>
                        ) : null}
                        <Button disabled={isPending} type="submit">
                            Sign In
                        </Button>
                    </Stack>
                </form>
            </Stack>
        </Stack>
    );
}
