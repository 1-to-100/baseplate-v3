import * as React from "react";
import type {Metadata} from "next";

import {config} from "@/config";
import {SplitLayout} from "@/components/auth/split-layout";
import {UpdatePasswordForm} from "@/components/auth/supabase/update-password-form";
import {CheckSessionInvite} from "@/components/auth/supabase/check-session-invite";

export const metadata = {
  title: `Set new password | ${config.site.name}`,
} satisfies Metadata;

export default function Page() {
  return (
    <SplitLayout>
      <CheckSessionInvite>
        <UpdatePasswordForm title={'Set new password'} updateName={true} />
      </CheckSessionInvite>
    </SplitLayout>
  );
}
