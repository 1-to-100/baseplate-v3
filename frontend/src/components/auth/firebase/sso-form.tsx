"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/joy/Alert";
import Image from "next/image";
import Box from "@mui/joy/Box";
import Button from "@mui/joy/Button";
import Divider from "@mui/joy/Divider";
import FormControl from "@mui/joy/FormControl";
import FormHelperText from "@mui/joy/FormHelperText";
import FormLabel from "@mui/joy/FormLabel";
import Input from "@mui/joy/Input";
import Stack from "@mui/joy/Stack";
import Tabs from "@mui/joy/Tabs";
import TabList from "@mui/joy/TabList";
import Tab from "@mui/joy/Tab";
import Typography from "@mui/joy/Typography";
import {
  GoogleAuthProvider,
  sendSignInLinkToEmail,
  signInWithPopup,
} from "firebase/auth";
import { Controller, useForm } from "react-hook-form";
import { z as zod } from "zod";
import RouterLink from "next/link";
import { toast } from "@/components/core/toaster";
import { getFirebaseAuth } from "@/lib/auth/firebase/client";
import { paths } from "@/paths";
import { DynamicLogo } from "@/components/core/logo";

interface OAuthProvider {
  id: "google" | "github";
  name: string;
  logo: string;
}

const oAuthProviders = [
  { id: "google", name: "Google", logo: "/assets/logo-google.svg" },
] satisfies OAuthProvider[];

const magicLinkSchema = zod.object({
  email: zod.string().min(1, { message: "Email is required" }).email(),
});

type MagicLinkValues = zod.infer<typeof magicLinkSchema>;

const magicLinkDefaultValues = { email: "" } satisfies MagicLinkValues;

export function SSOForm(): React.JSX.Element {
  const [firebaseAuth] = React.useState(getFirebaseAuth());
  const [isPending, setIsPending] = React.useState<boolean>(false);
  const [showMessage, setShowMessage] = React.useState<boolean>(false);
  const [email, setEmail] = React.useState<string>("");

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<MagicLinkValues>({
    defaultValues: magicLinkDefaultValues,
    resolver: zodResolver(magicLinkSchema),
  });

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
    async (values: MagicLinkValues): Promise<void> => {
      setIsPending(true);
      try {
        await sendSignInLinkToEmail(firebaseAuth, values.email, {
          url: `${window.location.origin}${paths.auth.firebase.signInComplete}?email=${values.email}`,
          handleCodeInApp: true,
        });
        setEmail(values.email);
        setShowMessage(true);
      } catch (err) {
        console.error("magic link sign in error", err);
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
      <Box sx={{ display: "flex", justifyContent: "center" }}>
        <Box
          component={RouterLink}
          href={paths.home}
          sx={{ display: "inline-block", fontSize: 0 }}
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
        Welcome to Baseplate <br /> admin panel
      </Box>
      <Stack spacing={3}>
        <Stack spacing={2}>
          {oAuthProviders.map((provider) => (
            <Button
              disabled={isPending}
              endDecorator={
                <Image alt="" height={24} src={provider.logo} width={24} />
              }
              key={provider.id}
              onClick={(): void => {
                onAuth(provider.id).catch(() => {});
              }}
              variant="outlined"
            >
              Continue with {provider.name}
            </Button>
          ))}
        </Stack>
        <Divider>or</Divider>
      </Stack>
      <Tabs value="sso" variant="custom">
        <TabList>
          <Tab
            component={RouterLink}
            href={paths.auth.firebase.signIn}
            value="sign-in"
          >
            Sign In
          </Tab>
          <Tab value="sso">SSO</Tab>
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
        {showMessage ? (
          <Stack spacing={2}>
            <Typography level="h3" textAlign="center">
              Check your email
            </Typography>
            <Typography textAlign="center">
              We emailed a magic link to{" "}
              <Typography fontWeight="lg">&quot;{email}&quot;</Typography>.
            </Typography>
          </Stack>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)}>
            <Stack spacing={2}>
              <Controller
                control={control}
                name="email"
                render={({ field }) => (
                  <FormControl error={Boolean(errors.email)}>
                    <FormLabel>Email Address</FormLabel>
                    <Input {...field} type="email" />
                    {errors.email ? (
                      <FormHelperText>{errors.email.message}</FormHelperText>
                    ) : null}
                  </FormControl>
                )}
              />
              {errors.root ? (
                <Alert color="danger">{errors.root.message}</Alert>
              ) : null}
              <Button disabled={isPending} type="submit">
                Send Magic Link
              </Button>
            </Stack>
          </form>
        )}
      </Stack>
    </Stack>
  );
}
