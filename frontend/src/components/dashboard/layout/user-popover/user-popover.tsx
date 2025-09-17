"use client";

import * as React from "react";
import RouterLink from "next/link";
import Avatar from "@mui/joy/Avatar";
import List from "@mui/joy/List";
import ListItemButton from "@mui/joy/ListItemButton";
import ListItemContent from "@mui/joy/ListItemContent";
import ListItemDecorator from "@mui/joy/ListItemDecorator";
import Stack from "@mui/joy/Stack";
import Typography from "@mui/joy/Typography";
import { CreditCard as CreditCardIcon } from "@phosphor-icons/react/dist/ssr/CreditCard";
import { GearSix as GearSixIcon } from "@phosphor-icons/react/dist/ssr/GearSix";
import { User as UserIcon } from "@phosphor-icons/react/dist/ssr/User";

import type { User } from "@/types/user";
import { config } from "@/config";
import { paths } from "@/paths";
import { AuthStrategy } from "@/lib/auth/strategy";
import { Popup, PopupContent } from "@/components/core/popup";

import { Auth0SignOut } from "./auth0-sign-out";
import { CognitoSignOut } from "./cognito-sign-out";
import { CustomSignOut } from "./custom-sign-out";
import { FirebaseSignOut } from "./firebase-sign-out";
import { SupabaseSignOut } from "./supabase-sign-out";
import { Divider } from "@mui/material";

export interface UserPopoverProps {
  anchorEl?: HTMLElement | null;
  onClose?: () => void;
  open: boolean;
}

export function UserPopover({
  anchorEl,
  onClose,
  open,
}: UserPopoverProps): React.JSX.Element {
  return (
    <Popup
      anchorEl={anchorEl}
      onClose={onClose}
      open={open}
      placement="bottom-start"
      sx={{ maxWidth: "250px", px: 1, py: 1 }}
    >
      <PopupContent sx={{ p: 2 }}>
        <Stack spacing={2}>
          {/* <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
            <Avatar src={user.avatar} />
            <div>
              <Typography fontWeight="lg" textColor="inherit">
                {user.firstName} {user.lastName}
              </Typography>
              <Typography level="body-sm" textColor="neutral.500">
                {user.email}
              </Typography>
            </div>
          </Stack> */}
          <List
            sx={{
              "--List-padding": 0,
              // bgcolor: "var(--joy-palette-background-level1)",
              borderRadius: "var(--joy-radius-sm)",
              overflow: "hidden",
              fontSize: "var(--joy-fontSize-md)",
              fontWeight: "var(--joy-fontWeight-md)",
              "& .MuiListItemButton-root": {
                "&:not(.Mui-selected):hover": {
                  bgcolor: "var(--joy-palette-background-level2)",
                },
              },
            }}
          >
            <ListItemButton
              component={RouterLink}
              href={paths.dashboard.profile.profile}
              onClick={onClose}
            >
              <ListItemDecorator>
                <UserIcon fontSize="var(--Icon-fontSize)" weight="bold" style={{ color: "var(--joy-palette-text-secondary)" }} />
              </ListItemDecorator>
              <ListItemContent>Profile</ListItemContent>
            </ListItemButton>
            <ListItemButton
              component={RouterLink}
              href={paths.dashboard.settings.settings}
              onClick={onClose}
            >
              <ListItemDecorator>
                <GearSixIcon fontSize="var(--Icon-fontSize)" weight="bold" style={{ color: "var(--joy-palette-text-secondary)" }}/>
              </ListItemDecorator>
              <ListItemContent>Settings</ListItemContent>
            </ListItemButton>
            {/* <ListItemButton component={RouterLink} href={paths.dashboard.settings.billing} onClick={onClose}>
              <ListItemDecorator>
                <CreditCardIcon fontSize="var(--Icon-fontSize)" weight="bold" />
              </ListItemDecorator>
              <ListItemContent>Billing</ListItemContent>
            </ListItemButton> */}

            <Divider />
            {config.auth.strategy === AuthStrategy.CUSTOM ? (
              <CustomSignOut />
            ) : null}
            {config.auth.strategy === AuthStrategy.AUTH0 ? (
              <Auth0SignOut />
            ) : null}{" "}
            {config.auth.strategy === AuthStrategy.COGNITO ? (
              <CognitoSignOut />
            ) : null}
            {config.auth.strategy === AuthStrategy.FIREBASE ? (
              <FirebaseSignOut />
            ) : null}
            {config.auth.strategy === AuthStrategy.SUPABASE ? (
              <SupabaseSignOut />
            ) : null}
          </List>
        </Stack>
      </PopupContent>
    </Popup>
  );
}
