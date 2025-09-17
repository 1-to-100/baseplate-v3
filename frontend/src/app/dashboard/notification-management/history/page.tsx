"use client";

import * as React from "react";
import type { Metadata } from "next";
import Box from "@mui/joy/Box";
import Stack from "@mui/joy/Stack";
import Typography from "@mui/joy/Typography";
import Table from "@mui/joy/Table";
import { ArrowsDownUp as SortIcon } from "@phosphor-icons/react/dist/ssr/ArrowsDownUp";
import { config } from "@/config";
import { useState } from "react";
import Pagination from "@/components/dashboard/layout/pagination";
import SearchInput from "@/components/dashboard/layout/search-input";
import { useQuery } from "@tanstack/react-query";
import { getNotificationsHistory } from "@/lib/api/notifications";
import { useGlobalSearch } from "@/hooks/use-global-search";
import CircularProgress from "@mui/joy/CircularProgress";
import NotificationFilter from "@/components/dashboard/notification-management/notification-filter";
import { ApiNotification } from "@/contexts/auth/types";
import { useColorScheme } from "@mui/joy/styles";

const metadata = {
  title: `Notification History | Dashboard | ${config.site.name}`,
} satisfies Metadata;

export default function Page(): React.JSX.Element {
  const { colorScheme } = useColorScheme();
  const { debouncedSearchValue } = useGlobalSearch();
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<{
    type: string[];
    channel: string[];
    customer: number[];
    user: number[];
  }>({
    type: [],
    channel: [],
    customer: [],
    user: [],
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const rowsPerPage = 10;

  const { data, isLoading, error } = useQuery({
    queryKey: [
      "notifications",
      currentPage,
      debouncedSearchValue,
      sortColumn,
      sortDirection,
      filters.type,
      filters.channel,
      filters.customer,
      filters.user,
    ],
    queryFn: async () => {
      const response = await getNotificationsHistory ({
        page: currentPage,
        perPage: rowsPerPage,
        orderBy: sortColumn || undefined,
        orderDirection: sortDirection || undefined,
        search: debouncedSearchValue || undefined,
        type: filters.type.length > 0 ? filters.type[0] : undefined,
        channel: filters.channel.length > 0 ? filters.channel : undefined,
        customer: filters.customer.length > 0 ? filters.customer[0] : undefined,
        user: filters.user.length > 0 ? filters.user[0] : undefined,
      });
      return response;
    },
  });

  const notifications = data?.data || [];
  const totalPages = data?.meta?.lastPage || 1;
  const hasResults = notifications.length > 0;

  const handleCloseFilter = () => {
    setIsFilterOpen(false);
  };

  const getFirstLine = (html: string) => {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;

    const nodes = Array.from(tempDiv.childNodes);

    if (nodes.length === 0) return "";

    const firstNode = nodes[0];

    switch (firstNode?.nodeType) {
      case Node.TEXT_NODE:
        return firstNode.textContent?.split("\n")[0] || "";
      case Node.ELEMENT_NODE:
        return (firstNode as Element).outerHTML;
      default:
        return "";
    }
  };

  const handleOpenFilter = () => {
    setIsFilterOpen(true);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleFilter = (filters: {
    type: string[];
    channel: string[];
    customer: number[];
    user: number[];
  }) => {
    setFilters(filters);
    setCurrentPage(1);
  };

  const handleSort = (column: string) => {
    const isAsc = sortColumn === column && sortDirection === "asc";
    const newDirection = isAsc ? "desc" : "asc";
    setSortColumn(column);
    setSortDirection(newDirection);
  };

 

  return (
    <Box sx={{ p: { xs: 2, sm: "var(--Content-padding)" } }}>
      <Stack spacing={{ xs: 2, sm: 3 }} sx={{ mt: { xs: 6, sm: 0 } }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={{ xs: 2, sm: 3 }}
          sx={{ alignItems: { xs: "stretch", sm: "flex-start" } }}
        >
          <Stack spacing={1} sx={{ flex: "1 1 auto" }}>
            <Typography
              fontSize={{ xs: "xl2", sm: "xl3" }}
              level="h1"
              sx={{ wordBreak: "break-word" }}
            >
              Notification History
            </Typography>
          </Stack>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={{ xs: 1, sm: 2 }}
            sx={{
              alignItems: { xs: "stretch", sm: "center" },
              width: { xs: "100%", sm: "auto" },
            }}
          >
            <NotificationFilter
              onFilter={handleFilter}
              onClose={handleCloseFilter}
              open={isFilterOpen}
              onOpen={handleOpenFilter}
            />
          </Stack>
        </Stack>

        {isLoading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: { xs: "40vh", sm: "50vh" },
            }}
          >
            <CircularProgress size="lg" />
          </Box>
        ) : (
          <>
            <Box>
              <Box
                sx={{
                  overflowX: "auto",
                  width: "100%",
                  WebkitOverflowScrolling: "touch",
                  scrollbarWidth: { xs: "thin", sm: "auto" },
                  "&::-webkit-scrollbar": {
                    height: { xs: "8px", sm: "12px" },
                  },
                  "&::-webkit-scrollbar-thumb": {
                    backgroundColor: "var(--joy-palette-divider)",
                    borderRadius: "4px",
                  },
                }}
              >
                <Table
                  aria-label="notification history table"
                  sx={{
                    minWidth: "800px",
                    tableLayout: "fixed",
                    "& th, & td": {
                      px: { xs: 1, sm: 2 },
                      py: { xs: 1, sm: 1.5 },
                    },
                  }}
                >
                  <thead>
                    <tr>
                      <th
                        style={{ width: "130px" }}
                        onClick={() => handleSort("createdAt")}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            "& .sort-icon": {
                              opacity: 0,
                              transition: "opacity 0.2s ease-in-out",
                            },
                            "&:hover .sort-icon": { opacity: 1 },
                          }}
                        >
                          Date
                          <SortIcon
                            className="sort-icon"
                            fontSize="16"
                            color="var(--joy-palette-text-secondary)"
                          />
                        </Box>
                      </th>
                      <th
                        style={{ width: "15%" }}
                        onClick={() => handleSort("user")}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            "& .sort-icon": {
                              opacity: 0,
                              transition: "opacity 0.2s ease-in-out",
                            },
                            "&:hover .sort-icon": { opacity: 1 },
                          }}
                        >
                          User
                          <SortIcon
                            className="sort-icon"
                            fontSize="16"
                            color="var(--joy-palette-text-secondary)"
                          />
                        </Box>
                      </th>
                      <th
                        style={{ width: "15%" }}
                        onClick={() => handleSort("customer")}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            "& .sort-icon": {
                              opacity: 0,
                              transition: "opacity 0.2s ease-in-out",
                            },
                            "&:hover .sort-icon": { opacity: 1 },
                          }}
                        >
                          Customer
                          <SortIcon
                            className="sort-icon"
                            fontSize="16"
                            color="var(--joy-palette-text-secondary)"
                          />
                        </Box>
                      </th>
                      <th
                        style={{ width: "100px" }}
                        onClick={() => handleSort("type")}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            "& .sort-icon": {
                              opacity: 0,
                              transition: "opacity 0.2s ease-in-out",
                            },
                            "&:hover .sort-icon": { opacity: 1 },
                          }}
                        >
                          Type
                          <SortIcon
                            className="sort-icon"
                            fontSize="16"
                            color="var(--joy-palette-text-secondary)"
                          />
                        </Box>
                      </th>
                      <th
                        style={{ width: "110px" }}
                        onClick={() => handleSort("channel")}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            "& .sort-icon": {
                              opacity: 0,
                              transition: "opacity 0.2s ease-in-out",
                            },
                            "&:hover .sort-icon": { opacity: 1 },
                          }}
                        >
                          Channel
                          <SortIcon
                            className="sort-icon"
                            fontSize="16"
                            color="var(--joy-palette-text-secondary)"
                          />
                        </Box>
                      </th>
                      <th
                        
                        onClick={() => handleSort("message")}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            "& .sort-icon": {
                              opacity: 0,
                              transition: "opacity 0.2s ease-in-out",
                            },
                            "&:hover .sort-icon": { opacity: 1 },
                          }}
                        >
                          Message
                          <SortIcon
                            className="sort-icon"
                            fontSize="16"
                            color="var(--joy-palette-text-secondary)"
                          />
                        </Box>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {notifications.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          style={{ textAlign: "center", padding: "20px" }}
                        >
                          <Typography level="body-md" color="neutral">
                            No items found
                          </Typography>
                        </td>
                      </tr>
                    ) : (
                      notifications.map((notification) => (
                        <tr key={notification.id}>
                          <td>
                            <Typography
                              sx={{
                                wordBreak: "break-all",
                                fontSize: { xs: "12px", sm: "14px" },
                              }}
                            >
                              {new Date(notification.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </Typography>
                          </td>
                          <td>
                            <Typography
                              sx={{
                                color: "var(--joy-palette-text-secondary)",
                                fontSize: { xs: "12px", sm: "14px" },
                                whiteSpace: "normal",
                                wordBreak: "break-word",
                                maxWidth: "100%"
                              }}
                            >
                              {notification.User?.firstName?.slice(0, 40) || notification.User?.lastName?.slice(0, 40) ? (
                                <>
                                  {notification.User?.firstName?.slice(0, 40) || ''} {notification.User?.lastName?.slice(0, 40) || ''}
                                </>
                              ) : (
                                notification.User?.email?.slice(0, 40) || ''
                              )}
                            </Typography>
                          </td>
                          <td>
                            <Typography
                              sx={{
                                color: "var(--joy-palette-text-secondary)",
                                fontSize: { xs: "12px", sm: "14px" },
                                whiteSpace: "normal",
                                wordBreak: "break-word",
                                maxWidth: "100%"
                              }}
                            >
                              {notification.Customer?.name?.slice(0, 40) || ''}
                            </Typography>
                          </td>
                          <td
                            style={{
                              fontWeight: 400,
                              color: "var(--joy-palette-text-secondary)",
                            }}
                          >
                            <Box
                              sx={{
                                fontSize: { xs: "12px", sm: "14px" },
                                wordBreak: "break-all",
                                fontWeight: 500,
                                backgroundColor: notification?.type?.includes(
                                  "IN_APP"
                                )
                                  ? colorScheme === "dark"
                                    ? "rgba(79, 70, 229, 0.2)"
                                    : "#E0E7FF"
                                  : notification?.type?.includes("EMAIL")
                                  ? colorScheme === "dark"
                                    ? "rgba(22, 163, 74, 0.2)"
                                    : "#DCFCE7"
                                  : colorScheme === "dark"
                                  ? "rgba(107, 114, 128, 0.2)"
                                  : "#F3F4F6",
                                color: notification?.type?.includes("IN_APP")
                                  ? colorScheme === "dark"
                                    ? "#818CF8"
                                    : "#4F46E5"
                                  : notification?.type?.includes("EMAIL")
                                  ? colorScheme === "dark"
                                    ? "#4ADE80"
                                    : "#16A34A"
                                  : colorScheme === "dark"
                                  ? "#9CA3AF"
                                  : "#6B7280",
                                borderRadius: "10px",
                                padding: "2px 8px",
                                display: "inline-block",
                              }}
                            >
                              {notification.type?.includes("IN_APP")
                                ? "In-App"
                                : notification.type?.includes("EMAIL")
                                ? "Email"
                                : notification.type?.[0] || ""}
                            </Box>
                          </td>
                          <td
                            style={{
                              color: "var(--joy-palette-text-secondary)",
                            }}
                          >
                            <Box
                              sx={{
                                fontSize: { xs: "12px", sm: "14px" },
                                wordBreak: "break-all",
                                fontWeight: 500,
                                backgroundColor:
                                  notification?.channel === "info"
                                    ? colorScheme === "dark"
                                      ? "rgba(107, 114, 128, 0.2)"
                                      : "#EEEFF0"
                                    : notification?.channel === "article"
                                    ? colorScheme === "dark"
                                      ? "rgba(107, 114, 128, 0.2)"
                                      : "#EEEFF0"
                                    : notification?.channel === "warning"
                                    ? colorScheme === "dark"
                                      ? "rgba(183, 76, 6, 0.2)"
                                      : "#FFF8C5"
                                    : notification?.channel === "alert"
                                    ? colorScheme === "dark"
                                      ? "rgba(211, 35, 47, 0.2)"
                                      : "#FFE9E8"
                                    : colorScheme === "dark"
                                    ? "rgba(79, 70, 229, 0.2)"
                                    : "#4F46E5",
                                color:
                                  notification?.channel === "info"
                                    ? colorScheme === "dark"
                                      ? "#D1D5DB"
                                      : "#6B7280"
                                    : notification?.channel === "article"
                                    ? colorScheme === "dark"
                                      ? "#D1D5DB"
                                      : "#6B7280"
                                    : notification?.channel === "warning"
                                    ? colorScheme === "dark"
                                      ? "#FDBA74"
                                      : "#b74c06"
                                    : notification?.channel === "alert"
                                    ? colorScheme === "dark"
                                      ? "#FCA5A5"
                                      : "#D3232F"
                                    : colorScheme === "dark"
                                    ? "#818CF8"
                                    : "#4F46E5",
                                borderRadius: "10px",
                                padding: "2px 8px",
                                display: "inline-block",
                              }}
                            >
                              {notification.channel}
                            </Box>
                          </td>
                          <td>
                            <Typography
                              component="div"
                              sx={{
                                color: "var(--joy-palette-text-secondary)",
                                fontSize: { xs: "12px", sm: "14px" },
                                '& img': {
                                  width: '100%',
                                  maxWidth: '600px',
                                  height: 'auto'
                                },
                                p: {
                                  ...(colorScheme === "dark" && {
                                    "&[style*='color: black'], &[style*='color: #000'], &[style*='color: rgb(0, 0, 0)'], &[style*='color: rgba(0,0,0'], &[style*='color: rgb(11, 13, 14)']": {
                                      color: "var(--joy-palette-text-secondary) !important"
                                    }
                                  }),
                                },
                                span: {
                                  ...(colorScheme === "dark" && {
                                    "&[style*='color: black'], &[style*='color: #000'], &[style*='color: rgb(0, 0, 0)'], &[style*='color: rgba(0,0,0'], &[style*='color: rgb(11, 13, 14)']": {
                                      color: "var(--joy-palette-text-secondary) !important"
                                    }
                                  }),
                                },
                              }}
                            >
                              <div
                                dangerouslySetInnerHTML={{
                                  __html: getFirstLine(notification.message),
                                }}
                              />
                            </Typography>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </Box>

              <Pagination
                totalPages={totalPages}
                currentPage={currentPage}
                onPageChange={handlePageChange}
                disabled={!hasResults}
              />
            </Box>
          </>
        )}
      </Stack>
    </Box>
  );
} 