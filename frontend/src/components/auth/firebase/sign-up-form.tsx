"use client";

import * as React from "react";
import Image from "next/image";
import RouterLink from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/joy/Alert";
import Box from "@mui/joy/Box";
import Button from "@mui/joy/Button";
import Checkbox from "@mui/joy/Checkbox";
import Divider from "@mui/joy/Divider";
import FormControl from "@mui/joy/FormControl";
import FormHelperText from "@mui/joy/FormHelperText";
import FormLabel from "@mui/joy/FormLabel";
import Input from "@mui/joy/Input";
import Link from "@mui/joy/Link";
import Stack from "@mui/joy/Stack";
import Tab from "@mui/joy/Tab";
import TabList from "@mui/joy/TabList";
import Tabs from "@mui/joy/Tabs";
import type { Auth } from "firebase/auth";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { Controller, useForm } from "react-hook-form";
import { z as zod } from "zod";

import { paths } from "@/paths";
import { getFirebaseAuth } from "@/lib/auth/firebase/client";
import { DynamicLogo } from "@/components/core/logo";
import { toast } from "@/components/core/toaster";
import { Typography } from "@mui/joy";
import { useAuth } from "@/contexts/auth/user-context";

interface OAuthProvider {
  id: "google" | "github";
  name: string;
  logo: string;
}

const oAuthProviders = [
  { id: "google", name: "Google", logo: "/assets/logo-google.svg" },
] satisfies OAuthProvider[];

const schema = zod.object({
  firstName: zod.string().min(1, { message: "First name is required" }),
  lastName: zod.string().min(1, { message: "Last name is required" }),
  email: zod.string().min(1, { message: "Email is required" }).email(),
  password: zod
    .string()
    .min(6, { message: "Password should be at least 6 characters" }),
  terms: zod
    .boolean()
    .refine((value) => value, "You must accept the terms and conditions"),
});

type Values = zod.infer<typeof schema>;

const defaultValues = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  terms: false,
} satisfies Values;

export function SignUpForm(): React.JSX.Element {
  const [firebaseAuth] = React.useState<Auth>(getFirebaseAuth());
  const auth = useAuth();

  const [isPending, setIsPending] = React.useState<boolean>(false);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Values>({ defaultValues, resolver: zodResolver(schema) });

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
        const validateEmailUrl = `${
          process.env.NEXT_PUBLIC_API_URL
        }/register/validate-email/${encodeURIComponent(values.email)}`;
        const emailValidationResponse = await fetch(validateEmailUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!emailValidationResponse.ok) {
          const errorData = await emailValidationResponse.json();
          throw new Error(errorData.message || "Email validation failed");
        }
       
        const userCredentials = await createUserWithEmailAndPassword(
          firebaseAuth,
          values.email,
          values.password
        );

        if (values.firstName && values.lastName) {
          const displayName = `${values.firstName} ${values.lastName}`;
          const user = userCredentials.user;
          await updateProfile(user, { displayName });
          auth?.updateUser?.({
            id: user.uid,
            email: user.email || "",
            name: displayName,
            avatar: user.photoURL || "",
          });
        }

        const token = await userCredentials.user.getIdToken();
        console.log("token", token);
        if (token) {
          auth?.syncUser?.();
        }
        
      } catch (err) {
        setIsPending(false);
        const errorMessage = (err as { message: string }).message;
        toast.error(errorMessage);
        setError("root", {
          type: "server",
          message: errorMessage,
        });
      }
    },
    [firebaseAuth, setError, auth]
  );

  return (
    <Stack spacing={5}>
      <Box sx={{ display: "flex", justifyContent: "center" }}>
        <Box
          component={RouterLink}
          href={paths.home}
          sx={{ display: "inline-block", fontSize: 0 }}
        >
          <DynamicLogo
            colorDark="light"
            colorLight="dark"
            height={32}
            width={154}
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
        Welcome to Baseplate <br /> admin panel
      </Box>
      <Stack spacing={2}>
        {oAuthProviders.map(
          (provider): React.JSX.Element => (
            <Button
              disabled={isPending}
              endDecorator={
                <Image alt="" height={24} src={provider.logo} width={24} />
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
      <Tabs value="sign-up" variant="custom">
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
              name="firstName"
              render={({ field }) => (
                <FormControl error={Boolean(errors.firstName)}>
                  <FormLabel>First Name</FormLabel>
                  <Input {...field} />
                  {errors.firstName ? (
                    <FormHelperText>{errors.firstName.message}</FormHelperText>
                  ) : null}
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
                  {errors.lastName ? (
                    <FormHelperText>{errors.lastName.message}</FormHelperText>
                  ) : null}
                </FormControl>
              )}
            />
            <Controller
              control={control}
              name="email"
              render={({ field }) => (
                <FormControl error={Boolean(errors.email)}>
                  <FormLabel>Email Address</FormLabel>
                  <Input {...field} type="email" autoComplete="username" />
                  {errors.email ? (
                    <FormHelperText>{errors.email.message}</FormHelperText>
                  ) : null}
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
                    type="password"
                    autoComplete="new-password"
                  />
                  {errors.password ? (
                    <FormHelperText>{errors.password.message}</FormHelperText>
                  ) : null}
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
            {errors.root ? (
              <Alert color="danger">{errors.root.message}</Alert>
            ) : null}
            <Button disabled={isPending} type="submit">
              Create Account
            </Button>
          </Stack>
        </form>
      </Stack>
    </Stack>
  );
}
