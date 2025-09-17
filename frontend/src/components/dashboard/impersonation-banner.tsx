"use client";

import * as React from "react";
import Box from "@mui/joy/Box";
import Alert from "@mui/joy/Alert";
import Typography from "@mui/joy/Typography";
import Link from "@mui/joy/Link";
import Tooltip from "@mui/joy/Tooltip";
import { SignOut as SignOutIcon } from "@phosphor-icons/react/dist/ssr/SignOut";
import { useImpersonation } from "@/contexts/impersonation-context";
import { useQuery } from "@tanstack/react-query";
import { getUserById } from "@/lib/api/users";

export function ImpersonationBanner(): React.JSX.Element | null {
  const { impersonatedUserId, setImpersonatedUserId, isImpersonating } =
    useImpersonation();

  const { data: _impersonatedUser } = useQuery({
    queryKey: ["user", impersonatedUserId],
    queryFn: () => getUserById(impersonatedUserId!),
    enabled: !!impersonatedUserId,
  });

  if (!isImpersonating || !impersonatedUserId) {
    return null;
  }

  const handleStopImpersonation = () => {
    setImpersonatedUserId(null);
    window.location.reload();
  };

  return (
    <Alert
      variant="solid"
      color="warning"
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        borderRadius: 0,
        borderBottom: "1px solid var(--joy-palette-warning-200)",
        minHeight: "24px",
        py: 0.5,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography level="body-xs" sx={{ color: "#000" }}>
            Impersonating mode is currently enabled
          </Typography>
        </Box>
        <Link
          component="button"
          onClick={handleStopImpersonation}
          sx={{
            display: "flex",
            alignItems: "center",
            color: "#000",
            textDecoration: "none",
            "&:hover": {
              textDecoration: "none",
            },
          }}
        >
          <Tooltip
            title="Return to own account"
            placement="bottom"
            sx={{
              background: "#DAD8FD",
              color: "#3D37DD",
            }}
          >
            <SignOutIcon size={16} />
          </Tooltip>
        </Link>
      </Box>
    </Alert>
  );
}
