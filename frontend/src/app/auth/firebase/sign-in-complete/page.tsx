import * as React from "react";
import type { Metadata } from "next";
import RouterLink from "next/link";
import Alert from "@mui/joy/Alert";
import Box from "@mui/joy/Box";
import Stack from "@mui/joy/Stack";
import Typography from "@mui/joy/Typography";

import { config } from "@/config";
import { paths } from "@/paths";
import { GuestGuard } from "@/components/auth/guest-guard";
import { SplitLayout } from "@/components/auth/split-layout";
import { DynamicLogo } from "@/components/core/logo";
import { PageProps } from "@/types/app";
import {SignInComplete} from '@/app/auth/firebase/sign-in-complete/sign-in-complete';

export const metadata = {
  title: `Sign up complete | Firebase | Auth | ${config.site.name}`,
} satisfies Metadata;

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;

  if (!params.email) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert color="danger">Email is required</Alert>
      </Box>
    );
  }

  return (
    <GuestGuard>
      <SplitLayout>
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
              Complete Sign In
            </Typography>
            <Typography textAlign="center">
              We&apos;ve sent a verification email to{" "}
              <Typography fontWeight="lg">&quot;{params.email}&quot;</Typography>.
            </Typography>
            <SignInComplete email={params.email as string} />
          </Stack>
        </Stack>
      </SplitLayout>
    </GuestGuard>
  );
}
