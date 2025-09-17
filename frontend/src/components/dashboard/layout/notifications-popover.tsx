"use client";

import * as React from "react";
import Button from "@mui/joy/Button";
import Stack from "@mui/joy/Stack";
import Typography from "@mui/joy/Typography";
import Box from "@mui/joy/Box";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { Popup, PopupContent } from "@/components/core/popup";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  GetNotificationsResponse,
} from "@/lib/api/notifications";
import { ApiNotification } from "@/contexts/auth/types";
import { Info, Article } from "@phosphor-icons/react/dist/ssr";
import CircularProgress from "@mui/joy/CircularProgress";
import { useInAppNotificationsChannel } from "@/hooks/use-notifications";
import { useColorScheme } from "@mui/joy/styles";
import { toast } from "@/components/core/toaster";

export interface NotificationsPopoverProps {
  anchorEl?: HTMLElement | null;
  onClose?: () => void;
  open: boolean;
}

export function NotificationsPopover({
  anchorEl,
  onClose,
  open,
}: NotificationsPopoverProps): React.JSX.Element {
  const queryClient = useQueryClient();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const { colorScheme } = useColorScheme();

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

  useInAppNotificationsChannel((payload) => {
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    toast(
      <Stack direction="row" spacing={2} alignItems="flex-start">
        <Stack direction="column" sx={{ marginLeft: "20px" }}>
          <Typography
            fontSize="15px"
            fontWeight="lg"
            sx={{ fontWeight: "500", color: "var(--joy-palette-text-primary)" }}
          >
            {payload.title}
          </Typography>
          <Box
            dangerouslySetInnerHTML={{
              __html: getFirstLine(payload.message || ""),
            }}
            sx={{
              "& a": {
                textDecoration: "none",
              },
              "& img": {
                width: "400px",
                height: "auto",
              },
            }}
          />
        </Stack>
      </Stack>,
      {
        duration: 5000,
        position: "top-right",
        className: "notification-toast",
        style: {
          backgroundColor:
            colorScheme === "dark"
              ? "var(--joy-palette-background-level1)"
              : "white",
          color: "var(--joy-palette-text-primary)",
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
        },
        icon: (
          <Stack
            sx={{
              backgroundColor:
                payload?.channel === "info"
                  ? colorScheme === "dark"
                    ? "rgba(107, 114, 128, 0.2)"
                    : "#EEEFF0"
                  : payload?.channel === "article"
                  ? colorScheme === "dark"
                    ? "rgba(107, 114, 128, 0.2)"
                    : "#EEEFF0"
                  : payload?.channel === "warning"
                  ? colorScheme === "dark"
                    ? "rgba(183, 76, 6, 0.2)"
                    : "#FFF8C5"
                  : payload?.channel === "alert"
                  ? colorScheme === "dark"
                    ? "rgba(211, 35, 47, 0.2)"
                    : "#FFE9E8"
                  : colorScheme === "dark"
                  ? "rgba(79, 70, 229, 0.2)"
                  : "#4F46E5",
              borderRadius: "50%",
              p: 0.7,
            }}
          >
            <Info
              size={24}
              style={{
                display: payload?.channel === "article" ? "none" : "block",
              }}
              color={
                payload?.channel === "info"
                  ? colorScheme === "dark"
                    ? "#D1D5DB"
                    : "#6B7280"
                  : payload?.channel === "article"
                  ? colorScheme === "dark"
                    ? "#D1D5DB"
                    : "#6B7280"
                  : payload?.channel === "warning"
                  ? colorScheme === "dark"
                    ? "#FDBA74"
                    : "#b74c06"
                  : payload?.channel === "alert"
                  ? colorScheme === "dark"
                    ? "#FCA5A5"
                    : "#D3232F"
                  : colorScheme === "dark"
                  ? "#818CF8"
                  : "#4F46E5"
              }
            />
            <Article
              size={24}
              style={{
                display: payload?.channel === "article" ? "block" : "none",
              }}
              color={colorScheme === "dark" ? "#D1D5DB" : "#6B7280"}
            />
          </Stack>
        ),
      }
    );
  });

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["notifications"],
      queryFn: ({ pageParam = 1 }) =>
        getNotifications({ isRead: false, type: "IN_APP", page: pageParam }),
      getNextPageParam: (lastPage: GetNotificationsResponse) =>
        lastPage.meta.next,
      initialPageParam: 1,
    });

  const { mutate: markAllAsRead } = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });
      const previousNotifications = queryClient.getQueryData(["notifications"]);

      queryClient.setQueryData(
        ["notifications"],
        (old: GetNotificationsResponse | undefined) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((n: ApiNotification) => ({
              ...n,
              isRead: true,
            })),
          };
        }
      );

      return { previousNotifications };
    },
    onError: (err, newTodo, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(
          ["notifications"],
          context.previousNotifications
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const notifications = React.useMemo(
    () => data?.pages.flatMap((page) => page.data) || [],
    [data]
  );

  const handleScroll = React.useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
      const scrollBottom = scrollHeight - scrollTop - clientHeight;

      if (scrollBottom < 100 && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  );

  return (
    <Popup
      anchorEl={anchorEl}
      onClose={onClose}
      open={open}
      placement="bottom-end"
      sx={{
        maxWidth: { xs: "95%", sm: "500px" },
        width: "100%",
      }}
    >
      <PopupContent sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Stack
            direction="row"
            spacing={2}
            sx={{
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              mb: 1,
            }}
          >
            <Typography level="h4">Notifications</Typography>
            <Button
              size="sm"
              variant="outlined"
              onClick={() => markAllAsRead()}
              disabled={notifications.length === 0}
            >
              Mark as read
            </Button>
          </Stack>
          {isLoading ? (
            <Stack alignItems="center" justifyContent="center" sx={{ py: 2 }}>
              <CircularProgress />
            </Stack>
          ) : (
            <Stack spacing={2}>
              <Stack
                ref={containerRef}
                onScroll={handleScroll}
                sx={{
                  maxHeight: "400px",
                  overflowY: "auto",
                  "&::-webkit-scrollbar": {
                    width: "4px",
                  },
                  "&::-webkit-scrollbar-track": {
                    background: "transparent",
                  },
                  "&::-webkit-scrollbar-thumb": {
                    background: "var(--joy-palette-neutral-300)",
                    borderRadius: "4px",
                  },
                }}
              >
                {notifications.map(
                  (notification: ApiNotification): React.JSX.Element => (
                    <Stack
                      direction="row"
                      key={notification.id}
                      spacing={2}
                      flexGrow={1}
                      sx={{ p: 0, mb: 2 }}
                    >
                      <NotificationContent notification={notification} />
                    </Stack>
                  )
                )}
                {isFetchingNextPage && (
                  <Stack
                    alignItems="center"
                    justifyContent="center"
                    sx={{ py: 2 }}
                  >
                    <CircularProgress size="sm" />
                  </Stack>
                )}
              </Stack>
            </Stack>
          )}
        </Stack>
      </PopupContent>
    </Popup>
  );
}

interface NotificationContentProps {
  notification: ApiNotification;
}

function NotificationContent({
  notification,
}: NotificationContentProps): React.JSX.Element {
  const queryClient = useQueryClient();
  const { colorScheme } = useColorScheme();
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [isVisible, setIsVisible] = React.useState(true);

  const { mutate: markAsRead } = useMutation({
    mutationFn: () => markNotificationAsRead(notification.id),
    onMutate: async () => {
      setIsVisible(false);
      await queryClient.cancelQueries({ queryKey: ["notifications"] });

      const previousNotifications = queryClient.getQueryData(["notifications"]);

      queryClient.setQueryData(
        ["notifications"],
        (old: GetNotificationsResponse | undefined) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((n: ApiNotification) =>
              n.id === notification.id ? { ...n, isRead: true } : n
            ),
          };
        }
      );

      return { previousNotifications };
    },
    onError: (err, newTodo, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(
          ["notifications"],
          context.previousNotifications
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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

  return (
    <Stack
      direction="row"
      spacing={2}
      alignItems="flex-start"
      flexGrow={1}
      sx={{
        p: 1,
        borderRadius: "8px",
        transition: "background-color 0.2s ease",
        "&:hover": {
          backgroundColor: "var(--joy-palette-background-mainBg)",
          cursor: "pointer",
        },
        position: "relative"
      }}
    >
      <Stack
        sx={{
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
          borderRadius: "50%",
          p: 0.7,
        }}
      >
        <Info
          size={24}
          style={{
            display: notification?.channel === "article" ? "none" : "block",
          }}
          color={
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
              : "#4F46E5"
          }
        />
        <Article
          size={24}
          style={{
            display: notification?.channel === "article" ? "block" : "none",
          }}
          color={colorScheme === "dark" ? "#D1D5DB" : "#6B7280"}
        />
      </Stack>
      <Stack direction="column" flexGrow={1}>
        <Typography
          fontSize="16px"
          fontWeight="lg"
          sx={{
            fontWeight: "500",
            color: "var(--joy-palette-text-primary)",
            wordBreak: "break-word",
            whiteSpace: "pre-wrap",
            overflowWrap: "break-word",
            wordWrap: "break-word",
          }}
        >
          {notification.title}
        </Typography>
        {isExpanded ? (
          <>
            <Box
              dangerouslySetInnerHTML={{ __html: notification.message }}
              sx={{
                "& a": {
                  textDecoration: "none",
                },
                "& ol, & ul": {
                  marginLeft: "20px",
                  marginTop: "8px",
                  marginBottom: "8px",
                },
                "& li": {
                  marginBottom: "4px",
                },
                "& img": {
                  width: "370px",
                  height: "auto",
                },
                "& p": {
                  wordBreak: "break-word",
                  whiteSpace: "pre-wrap",
                  overflowWrap: "break-word",
                  wordWrap: "break-word",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: "100%",
                },
                "& h1, & h2, & h3, & h4, & h5, & h6": {
                  wordBreak: "break-word",
                  whiteSpace: "pre-wrap",
                  overflowWrap: "break-word",
                  wordWrap: "break-word",
                  overflow: "hidden",
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
            />
            <Stack sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexDirection: "row",
              }}>
            <Typography
              level="body-sm"
              sx={{
                color: "var(--joy-palette-text-secondary)",
                fontSize: "12px",
              }}
            >
              {formatDate(notification.createdAt)}
            </Typography>
            <Stack>
              <Button
                size="sm"
                variant="plain"
                onClick={() => setIsExpanded(!isExpanded)}
                sx={{
                  flexShrink: 0,
                  fontSize: "10px",
                  width: "fit-content",
                  color: "var(--joy-palette-text-secondary) !important",
                  backgroundColor: "var(--joy-palette-text-secondary)",
                  "&:hover": {
                    opacity: 0.8,
                    backgroundColor: "var(--joy-palette-text-secondary)",
                  }
                }}
              >
                {isExpanded ? "Show less" : "Show details"}
              </Button>
            </Stack>
            </Stack>
          </>
        ) : (
          <>
            <Box
              dangerouslySetInnerHTML={{
                __html: getFirstLine(notification.message),
              }}
              sx={{
                "& a": {
                  textDecoration: "none",
                },
                "& img": {
                  width: "370px",
                  height: "auto",
                },
                "& p": {
                  wordBreak: "break-word",
                  whiteSpace: "pre-wrap",
                  overflowWrap: "break-word",
                  wordWrap: "break-word",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: "100%",
                },
                "& h1, & h2, & h3, & h4, & h5, & h6": {
                  wordBreak: "break-word",
                  whiteSpace: "pre-wrap",
                  overflowWrap: "break-word",
                  wordWrap: "break-word",
                  overflow: "hidden",
                },
                fontSize: "14px",
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
            />
            <Stack
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexDirection: "row",
              }}
            >
              <Typography
                level="body-sm"
                sx={{
                  color: "var(--joy-palette-text-secondary)",
                  fontSize: "12px",
                }}
              >
                {formatDate(notification.createdAt)}
              </Typography>
              <Stack>
                <Button
                  size="sm"
                  variant="plain"
                  onClick={() => setIsExpanded(!isExpanded)}
                  sx={{ flexShrink: 0, fontSize: "10px", width: "fit-content", color: "var(--joy-palette-text-secondary) !important", backgroundColor: "var(--joy-palette-text-secondary)", "&:hover": { opacity: 0.8, backgroundColor: "var(--joy-palette-text-secondary)" } }}
                >
                  {isExpanded ? "Show less" : "Show details"}
                </Button>
              </Stack>
            </Stack>
          </>
        )}
      </Stack>

      {!notification.isRead ? (
        <Button
          variant="solid"
          onClick={() => markAsRead()}
          sx={{
            borderRadius: "50%",
            flexGrow: 0,
            flexShrink: 0,
            height: "5px",
            mt: "3px",
            width: "5px",
            p: "5px",
            minHeight: "5px",
            marginLeft: "auto",
            transition: "all 0.3s ease",
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? "scale(1)" : "scale(0.8)",
            "&:active": {
              transform: "scale(0.8)",
              opacity: 0.5,
            },
            "&:hover": {
              transform: "scale(1.1)",
            },
            position: "absolute",
            right: '5px'
          }}
        />
      ) : null}
    </Stack>
  );
}
