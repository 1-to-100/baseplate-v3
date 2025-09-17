"use client";

import * as React from "react";
import RouterLink from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/joy/Alert";
import Box from "@mui/joy/Box";
import Button from "@mui/joy/Button";
import FormControl from "@mui/joy/FormControl";
import FormHelperText from "@mui/joy/FormHelperText";
import FormLabel from "@mui/joy/FormLabel";
import Input from "@mui/joy/Input";
import Stack from "@mui/joy/Stack";
import Typography from "@mui/joy/Typography";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Controller, useForm } from "react-hook-form";
import { z as zod } from "zod";

import { paths } from "@/paths";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import { DynamicLogo } from "@/components/core/logo";
import { resetPassword } from "@/lib/api/users";

const schema = zod.object({
  email: zod.string().min(1, { message: "Email is required" }).email(),
});

type Values = zod.infer<typeof schema>;

const defaultValues = { email: "" } satisfies Values;

export function ResetPasswordForm(): React.JSX.Element {
  const [supabaseClient] = React.useState<SupabaseClient>(
    createSupabaseClient()
  );

  const router = useRouter();

  const [isPending, setIsPending] = React.useState<boolean>(false);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Values>({ defaultValues, resolver: zodResolver(schema) });

  const onSubmit = React.useCallback(
    async (values: Values): Promise<void> => {
      setIsPending(true);

      try {
        const response = await resetPassword(values.email);
        if (response.status === "ok" && response.message) {
          const searchParams = new URLSearchParams({ email: values.email });
          router.push(
            `${paths.auth.supabase.recoveryLinkSent}?${searchParams.toString()}`
          );
        } else {
          setError("root", {
            type: "server",
            message: "Failed to send reset email",
          });
        }
      } catch (error) {
        setError("root", { type: "server", message: (error as Error).message });
      } finally {
        setIsPending(false);
      }
    },
    [router, setError]
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
      <Stack spacing={3}>
        <Typography level="h3" textAlign="center">
          Reset Password
        </Typography>
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
              Send Recovery Link
            </Button>
          </Stack>
        </form>
      </Stack>
    </Stack>
  );
}
