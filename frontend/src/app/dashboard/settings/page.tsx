"use client";

import * as React from "react";
import Stack from "@mui/joy/Stack";
import Typography from "@mui/joy/Typography";
import Table from "@mui/joy/Table";
import Checkbox from "@mui/joy/Checkbox";
import { Box } from "@mui/joy";

export default function Page(): React.JSX.Element {
  const [notifications, setNotifications] = React.useState({
    documentation: { email: false, inApp: true },
    importantNotices: { email: false, inApp: false },
    authentication: { email: false, inApp: false },
    sharing: { email: false, inApp: false },
    billing: { email: false, inApp: false },
    subscription: { email: false, inApp: false },
  });

  const handleCheckboxChange = (category: string, type: "email" | "inApp") => {
    setNotifications((prev) => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof notifications],
        [type]: !prev[category as keyof typeof notifications][type],
      },
    }));
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 }, overflowX: "auto" }}>
      <Stack spacing={{ xs: 2, sm: 3 }}>
        <Typography
          fontSize={{ xs: "xl2", sm: "xl3", lg: "xl4" }}
          level="h1"
        >
          Settings
        </Typography>
        <Box
          sx={{
            width: "100%",
            maxWidth: "700px",
            overflowX: "auto",
            minWidth: 0,
            "&::-webkit-scrollbar": {
              height: "8px",
            },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: "rgba(0,0,0,0.2)",
              borderRadius: "4px",
            },
          }}
        >
          <Table
            sx={{
              width: "100%",
              maxWidth: "100%",
              border: "none !important",
              "& th, & td": {
                border: "none !important",
                backgroundColor: "transparent !important",
              },
              minWidth: { xs: "auto", sm: 400 },
              "& thead th": {
                padding: { xs: "6px", sm: "8px" },
              },
              "& tbody td": {
                padding: { xs: "6px", sm: "8px" },
              },
            }}
          >
            <thead>
              <tr>
                <th style={{ width: "50%", textAlign: "left" }}>
                  <Typography
                    sx={{
                      fontSize: { xs: "14px", sm: "16px" },
                      fontWeight: "400",
                      color: "var(--joy-palette-text-secondary)",
                    }}
                  >
                    Type
                  </Typography>
                </th>
                <th style={{ width: "25%", textAlign: "center" }}>
                  <Typography
                    sx={{
                      fontSize: { xs: "14px", sm: "16px" },
                      fontWeight: "400",
                      color: "var(--joy-palette-text-secondary)",
                    }}
                  >
                    Email
                  </Typography>
                </th>
                <th style={{ width: "25%", textAlign: "center" }}>
                  <Typography
                    sx={{
                      fontSize: { xs: "14px", sm: "16px" },
                      fontWeight: "400",
                      color: "var(--joy-palette-text-secondary)",
                    }}
                  >
                    In-app
                  </Typography>
                </th>
              </tr>
            </thead>
            <tbody>
            <tr>
              <td>
                <Typography
                  sx={{
                    fontSize: { xs: "12px", sm: "14px" },
                    fontWeight: "300",
                    color: "var(--joy-palette-text-primary)",
                  }}
                >
                  Documentation updates
                </Typography>
                <Typography
                  sx={{
                    fontSize: { xs: "10px", sm: "12px" },
                    fontWeight: "400",
                    color: "var(--joy-palette-text-secondary)",
                  }}
                >
                  New articles, guides
                </Typography>
              </td>
              <td style={{ textAlign: "center" }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Checkbox
                    checked={notifications.documentation.email}
                    onChange={() =>
                      handleCheckboxChange("documentation", "email")
                    }
                  />
                </Box>
              </td>
              <td style={{ textAlign: "center" }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Checkbox
                    checked={notifications.documentation.inApp}
                    onChange={() =>
                      handleCheckboxChange("documentation", "inApp")
                    }
                  />
                </Box>
              </td>
            </tr>
              <tr>
                <td>
                  <Typography
                    sx={{
                      fontSize: { xs: "12px", sm: "14px" },
                      fontWeight: "300",
                      color: "var(--joy-palette-text-primary)",
                    }}
                  >
                    Important notices (coming soon)
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: { xs: "10px", sm: "12px" },
                      fontWeight: "400",
                      color: "var(--joy-palette-text-secondary)",
                    }}
                  >
                    System issues, failures, or security alerts
                  </Typography>
                </td>
                <td style={{ textAlign: "center" }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Checkbox
                      checked={notifications.importantNotices.email}
                      onChange={() =>
                        handleCheckboxChange("importantNotices", "email")
                      }
                    />
                  </Box>
                </td>
                <td style={{ textAlign: "center" }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Checkbox
                      checked={notifications.importantNotices.inApp}
                      onChange={() =>
                        handleCheckboxChange("importantNotices", "inApp")
                      }
                    />
                  </Box>
                </td>
              </tr>
              <tr>
                <td>
                  <Typography
                    sx={{
                      fontSize: { xs: "12px", sm: "14px" },
                      fontWeight: "300",
                      color: "var(--joy-palette-text-primary)",
                    }}
                  >
                    Authentication & Access (coming soon)
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: { xs: "10px", sm: "12px" },
                      fontWeight: "400",
                      color: "var(--joy-palette-text-secondary)",
                    }}
                  >
                    New logins, role changes, permission updates
                  </Typography>
                </td>
                <td style={{ textAlign: "center" }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Checkbox
                      checked={notifications.authentication.email}
                      onChange={() =>
                        handleCheckboxChange("authentication", "email")
                      }
                    />
                  </Box>
                </td>
                <td style={{ textAlign: "center" }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Checkbox
                      checked={notifications.authentication.inApp}
                      onChange={() =>
                        handleCheckboxChange("authentication", "inApp")
                      }
                    />
                  </Box>
                </td>
              </tr>
              <tr>
                <td>
                  <Typography
                    sx={{
                      fontSize: { xs: "12px", sm: "14px" },
                      fontWeight: "300",
                      color: "var(--joy-palette-text-primary)",
                    }}
                  >
                    Sharing & Permissions (coming soon)
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: { xs: "10px", sm: "12px" },
                      fontWeight: "400",
                      color: "var(--joy-palette-text-secondary)",
                    }}
                  >
                    Data or resources shared with you, permission changes
                  </Typography>
                </td>
                <td style={{ textAlign: "center" }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Checkbox
                      checked={notifications.sharing.email}
                      onChange={() => handleCheckboxChange("sharing", "email")}
                    />
                  </Box>
                </td>
                <td style={{ textAlign: "center" }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Checkbox
                      checked={notifications.sharing.inApp}
                      onChange={() => handleCheckboxChange("sharing", "inApp")}
                    />
                  </Box>
                </td>
              </tr>
              <tr>
                <td>
                  <Typography
                    sx={{
                      fontSize: { xs: "12px", sm: "14px" },
                      fontWeight: "300",
                      color: "var(--joy-palette-text-primary)",
                    }}
                  >
                    Billing & Payments (coming soon)
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: { xs: "10px", sm: "12px" },
                      fontWeight: "400",
                      color: "var(--joy-palette-text-secondary)",
                    }}
                  >
                    Invoices, payment failures, subscription renewals
                  </Typography>
                </td>
                <td style={{ textAlign: "center" }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Checkbox
                      checked={notifications.billing.email}
                      onChange={() => handleCheckboxChange("billing", "email")}
                    />
                  </Box>
                </td>
                <td style={{ textAlign: "center" }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Checkbox
                      checked={notifications.billing.inApp}
                      onChange={() => handleCheckboxChange("billing", "inApp")}
                    />
                  </Box>
                </td>
              </tr>
              <tr>
                <td>
                  <Typography
                    sx={{
                      fontSize: { xs: "12px", sm: "14px" },
                      fontWeight: "300",
                      color: "var(--joy-palette-text-primary)",
                    }}
                  >
                    Subscription Changes (coming soon)
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: { xs: "10px", sm: "12px" },
                      fontWeight: "400",
                      color: "var(--joy-palette-text-secondary)",
                    }}
                  >
                    Upgrades, downgrades, or feature access updates
                  </Typography>
                </td>
                <td style={{ textAlign: "center" }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Checkbox
                      checked={notifications.subscription.email}
                      onChange={() =>
                        handleCheckboxChange("subscription", "email")
                      }
                    />
                  </Box>
                </td>
                <td style={{ textAlign: "center" }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Checkbox
                      checked={notifications.subscription.inApp}
                      onChange={() =>
                        handleCheckboxChange("subscription", "inApp")
                      }
                    />
                  </Box>
                </td>
              </tr>
            </tbody>
          </Table>
        </Box>
      </Stack>
    </Box>
  );
}