import * as React from "react";
import type { Metadata, Viewport } from "next";

import "@/styles/global.css";

import { config } from "@/config";
import { applyDefaultSettings } from "@/lib/settings/apply-default-settings";
import { getSettings as getPersistedSettings } from "@/lib/settings/get-settings";
import { UserProvider } from "@/contexts/auth/user-context";
import { ImpersonationProvider } from "@/contexts/impersonation-context";
import { SettingsProvider } from "@/contexts/settings";
import { SearchProvider } from "@/contexts/search-context";
import { Analytics } from "@/components/core/analytics";
import { LocalizationProvider } from "@/components/core/localization-provider";
import { SettingsButton } from "@/components/core/settings/settings-button";
import { ThemeProvider } from "@/components/core/theme-provider/theme-provider";
import { Toaster } from "@/components/core/toaster";
import { QueryProvider } from "@/components/QueryProvider";

export const metadata = { title: config.site.name } satisfies Metadata;

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: config.site.themeColor,
} satisfies Viewport;

interface LayoutProps {
  children: React.ReactNode;
}

export default async function Layout({
  children,
}: LayoutProps): Promise<React.JSX.Element> {
  const settings = applyDefaultSettings(await getPersistedSettings());

  return (
    <html data-joy-color-scheme={settings.colorScheme} lang="en">
      <body>
        <Analytics>
          <LocalizationProvider>
            <UserProvider>
              <ImpersonationProvider>
                <SearchProvider>
                  <SettingsProvider settings={settings}>
                    <ThemeProvider>
                      <QueryProvider>
                        {children}
                        <SettingsButton />
                        <Toaster position="bottom-right" />
                      </QueryProvider>
                    </ThemeProvider>
                  </SettingsProvider>
                </SearchProvider>
              </ImpersonationProvider>
            </UserProvider>
          </LocalizationProvider>
        </Analytics>
        {/* <TestApiKey /> */}
      </body>
    </html>
  );
}
