"use client";

import * as React from "react";
import Avatar from "@mui/joy/Avatar";
import Badge from "@mui/joy/Badge";
import Box from "@mui/joy/Box";
import IconButton from "@mui/joy/IconButton";
import Stack from "@mui/joy/Stack";
import { Bell as BellIcon } from "@phosphor-icons/react/dist/ssr/Bell";
import { List as ListIcon } from "@phosphor-icons/react/dist/ssr/List";
import Typography from "@mui/joy/Typography";

import type { NavItemConfig } from "@/types/nav";
import { usePopover } from "@/hooks/use-popover";

import { MobileNav } from "./mobile-nav";
import { NotificationsPopover } from "./notifications-popover";
import { UserPopover } from "./user-popover/user-popover";
import { useUserInfo } from "@/hooks/use-user-info";
import { CustomerSelect } from "./customer-select";
import { useUnreadNotificationsChannel } from "@/hooks/use-notifications";
import { useImpersonation } from "@/contexts/impersonation-context";
import { useSearch } from "@/contexts/search-context";
import SearchInput from "./search-input";
import { isSystemAdministrator } from "@/lib/user-utils";

export interface MainNavProps {
  items: NavItemConfig[];
}

export function MainNav({ items }: MainNavProps): React.JSX.Element {
  const [openNav, setOpenNav] = React.useState<boolean>(false);
  const [invisibleBadge, setInvisibleBadge] = React.useState<boolean>(true);
  const notificationsPopover = usePopover<HTMLButtonElement>();
  const userPopover = usePopover<HTMLButtonElement>();
  const { userInfo } = useUserInfo();
  const { isImpersonating } = useImpersonation();
  const { setSearchValue } = useSearch();
  
  const handleNotification = React.useCallback(({ count }: { count: number }) => {
    setInvisibleBadge(count === 0);
  }, []);
  useUnreadNotificationsChannel(handleNotification);
  
  const handleSearch = React.useCallback((value: string) => {
    setSearchValue(value);
  }, [setSearchValue]);

  return (
    <React.Fragment>
      <Box
        component="header"
        sx={{
          bgcolor: "var(--Layout-bg)",
          left: 0,
          position: "sticky",
          pt: { lg: "var(--Layout-gap)" },
          top: 0,
          zIndex: "var(--MainNav-zIndex)",
          mt: { xs: isImpersonating ? "20px" : 0, lg: 0 },
        }}
      >
        <Box
          sx={{
            bgcolor: "var(--Content-background)",
            borderRadius: {
              lg: "var(--Content-radius) var(--Content-radius) 0 0",
            },
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flex: "1 1 auto",
            minHeight: "var(--MainNav-height, 72px)",
            px: { xs: 2, lg: 3 },
          }}
        >
          <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
            <IconButton
              color="neutral"
              onClick={(): void => {
                setOpenNav(true);
              }}
              sx={{ display: { lg: "none" } }}
              variant="plain"
            >
              <ListIcon fontSize="var(--Icon-fontSize)" weight="bold" />
            </IconButton>
            <SearchInput onSearch={handleSearch} />
          </Stack>
          <Stack
            direction="row"
            spacing={2}
            sx={{
              alignItems: "center",
              flex: "1 1 auto",
              justifyContent: "flex-end",
            }}
          >
            {isSystemAdministrator(userInfo) ? (
              <Box sx={{ display: { xs: "none", md: "block" } }} >
                <CustomerSelect />
              </Box>
            ) : null}
            <Badge
              invisible={invisibleBadge}
              color="danger"
              sx={{ "& .MuiBadge-badge": { top: "6px", right: "6px" } }}
            >
              <IconButton
                color="neutral"
                onClick={notificationsPopover.handleOpen}
                ref={notificationsPopover.anchorRef}
                variant="plain"
              >
                <BellIcon fontSize="var(--Icon-fontSize)" weight="bold" />
              </IconButton>
            </Badge>
            <Badge
              anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
              color="success"
              onClick={userPopover.handleOpen}
              ref={userPopover.anchorRef}
              sx={{
                cursor: "pointer",
                "& .MuiBadge-badge": { bottom: "4px", right: "4px" },
              }}
            >
              <Avatar src={userInfo?.avatar} />
            </Badge>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <Typography fontWeight="lg" textColor="inherit" sx={{ color: "var(--joy-palette-text-primary)" }}>
                {userInfo?.firstName?.slice(0, 10)} {userInfo?.lastName?.slice(0, 10)}
              </Typography>
              <Typography level="body-xs" textColor="neutral.500">
                {userInfo?.email}
              </Typography>
            </Box>
          </Stack>
        </Box>
      </Box>
      <MobileNav
        items={items}
        onClose={(): void => {
          setOpenNav(false);
        }}
        open={openNav}
      />
      <NotificationsPopover
        anchorEl={notificationsPopover.anchorRef.current}
        onClose={notificationsPopover.handleClose}
        open={notificationsPopover.open}
      />
      <UserPopover
        anchorEl={userPopover.anchorRef.current}
        onClose={userPopover.handleClose}
        open={userPopover.open}
      />
    </React.Fragment>
  );
}
