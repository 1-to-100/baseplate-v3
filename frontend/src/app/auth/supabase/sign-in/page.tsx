import * as React from "react";
import type { Metadata } from "next";

import { config } from "@/config";
import { GuestGuard } from "@/components/auth/guest-guard";
import { SplitLayout } from "@/components/auth/split-layout";
import { SignInForm } from "@/components/auth/supabase/sign-in-form";

export const metadata = {
  title: `Sign in | Supabase | Auth | ${config.site.name}`,
} satisfies Metadata;

export default function Page() {
  return (
    <GuestGuard>
      <SplitLayout>
        <SignInForm />
      </SplitLayout>
    </GuestGuard>
  );
}
