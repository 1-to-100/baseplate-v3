"use client";

import * as React from "react";
import Sheet from "@mui/joy/Sheet";
import Typography from "@mui/joy/Typography";
import Stack from "@mui/joy/Stack";
import Box from "@mui/joy/Box";
import Button from "@mui/joy/Button";
import { X as XIcon } from "@phosphor-icons/react/dist/ssr/X";
import { DotsThreeVertical as DotsIcon } from "@phosphor-icons/react/dist/ssr/DotsThreeVertical";
import { PencilSimple as PencilIcon } from "@phosphor-icons/react/dist/ssr/PencilSimple";
import { Trash as TrashIcon } from "@phosphor-icons/react/dist/ssr/Trash";
import { useState, useRef, forwardRef } from "react";
import DeleteItemModal from "../modals/DeleteItemModal";
import { Popper } from "@mui/base/Popper";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getNotificationById, deleteNotification } from "@/lib/api/notifications";
import AddEditNotification from "../modals/AddEditNotification";
import { ApiNotification } from "@/contexts/auth/types";
import CircularProgress from "@mui/joy/CircularProgress";
import { useColorScheme } from "@mui/joy/styles";

interface NotificationDetailsPopoverProps {
  open: boolean;
  onClose: () => void;
  anchorEl: HTMLElement | null;
  notificationId: number;
}

const NotificationDetailsPopover = forwardRef<HTMLDivElement, NotificationDetailsPopoverProps>(({
  open,
  onClose,
  anchorEl,
  notificationId,
}, ref) => {
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const popperRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { colorScheme } = useColorScheme();

  const { data: notificationData, isLoading: isNotificationLoading } = useQuery({
    queryKey: ["notification", notificationId],
    queryFn: () => getNotificationById(notificationId),
    enabled: !!notificationId && open,
    select: (data) => data as unknown as ApiNotification,
    staleTime: 0,
    gcTime: 0,
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notification", notificationId] });
      onClose();
    },
    onError: (error) => {
      console.error("Error deleting notification:", error);
    },
  });

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handleEdit = () => {
    setOpenEditModal(true);
    handleMenuClose();
  };

  const handleCloseEditModal = () => {
    setOpenEditModal(false);
  };

  const handleDelete = () => {
    setOpenDeleteModal(true);
    handleMenuClose();
  };

  const confirmDelete = () => {
    deleteNotificationMutation.mutate(notificationId);
    setOpenDeleteModal(false);
  };

  const menuItemStyle = {
    padding: { xs: "6px 12px", sm: "8px 16px" },
    fontSize: { xs: "14px", sm: "16px" },
    fontWeight: "400",
    display: "flex",
    alignItems: "center",
    cursor: "pointer",
    color: "var(--joy-palette-text-primary)",
    "&:hover": { backgroundColor: "var(--joy-palette-background-mainBg)" },
  };

  const iconStyle = {
    marginRight: "10px",
    color: "var(--joy-palette-text-primary)",
  };

  if (!open || !anchorEl || notificationId <= 0) {
    return null;
  }

  return (
    <>
      <Sheet
        ref={ref}
        sx={{
          position: { xs: "fixed", sm: "fixed" },
          top: { xs: "10%", sm: "20.3%" },
          right: { xs: "5%", sm: "2.5%" },
          width: { xs: "90%", sm: 400, md: 500 },
          maxWidth: "100%",
          borderRadius: "8px",
          boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
          overflow: "auto",
          maxHeight: { xs: "80vh", sm: "70vh" },
          zIndex: 1300,
          border: "1px solid var(--joy-palette-divider)",
        }}
      >
        <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
          <Stack
            direction="row"
            spacing={2}
            sx={{
              alignItems: "center",
              justifyContent: "space-between",
              mb: { xs: 1, sm: 2 },
              borderBottom: "1px solid var(--joy-palette-divider)",
              paddingBottom: { xs: 1, sm: 2 },
            }}
          >
            <Typography
              level="title-lg"
              sx={{ fontSize: { xs: "18px", sm: "22px", md: "24px" } }}
              fontWeight="600"
            >
              Notification Details
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                variant="plain"
                size="sm"
                onClick={onClose}
                sx={{ p: { xs: 0.5, sm: 1 } }}
              >
                <XIcon fontSize="16px" weight="bold" />
              </Button>
            </Stack>
          </Stack>

          {isNotificationLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
              <CircularProgress />
            </Box>
          ) : (
            <Stack spacing={{ xs: 1, sm: 2 }}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <Typography
                  level="body-sm"
                  fontWeight="300"
                  sx={{
                    color: "#636B74",
                    width: { xs: "100%", sm: "100px" },
                    fontSize: { xs: "12px", sm: "14px" },
                  }}
                >
                  Title
                </Typography>
                <Typography
                  level="body-sm"
                  fontWeight="300"
                  sx={{
                    color: "var(--joy-palette-text-primary)",
                    fontSize: { xs: "12px", sm: "14px" },
                  }}
                >
                  {notificationData?.title}
                </Typography>
              </Stack>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <Typography
                  level="body-sm"
                  fontWeight="300"
                  sx={{
                    color: "#636B74",
                    width: { xs: "100%", sm: "100px" },
                    fontSize: { xs: "12px", sm: "14px" },
                  }}
                >
                  Message
                </Typography>
                <Typography
                  level="body-sm"
                  component="div"
                  sx={{
                    fontSize: { xs: "12px", sm: "14px" },
                    '& img': {
                      width: '400px',
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
                  <div dangerouslySetInnerHTML={{ __html: notificationData?.message || '' }} />
                </Typography>
              </Stack>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <Typography
                  level="body-sm"
                  fontWeight="300"
                  sx={{
                    color: "#636B74",
                    width: { xs: "100%", sm: "100px" },
                    fontSize: { xs: "12px", sm: "14px" },
                  }}
                >
                  Type
                </Typography>
                <Typography
                  level="body-sm"
                  fontWeight="300"
                  sx={{
                    color: "var(--joy-palette-text-primary)",
                    fontSize: { xs: "12px", sm: "14px" },
                  }}
                >
                  {notificationData?.type}
                </Typography>
              </Stack>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <Typography
                  level="body-sm"
                  fontWeight="300"
                  sx={{
                    color: "#636B74",
                    width: { xs: "100%", sm: "100px" },
                    fontSize: { xs: "12px", sm: "14px" },
                  }}
                >
                  Channel
                </Typography>
                <Typography
                  level="body-sm"
                  fontWeight="300"
                  sx={{
                    color: "var(--joy-palette-text-primary)",
                    fontSize: { xs: "12px", sm: "14px" },
                  }}
                >
                  {notificationData?.channel}
                </Typography>
              </Stack>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <Typography
                  level="body-sm"
                  fontWeight="300"
                  sx={{
                    color: "#636B74",
                    width: { xs: "100%", sm: "100px" },
                    fontSize: { xs: "12px", sm: "14px" },
                  }}
                >
                  Comment
                </Typography>
                <Typography
                  level="body-sm"
                  fontWeight="300"
                  sx={{
                    color: "var(--joy-palette-text-primary)",
                    fontSize: { xs: "12px", sm: "14px" },
                  }}
                >
                  {notificationData?.comment}
                </Typography>
              </Stack>
            </Stack>
          )}
        </Box>
      </Sheet>

      <DeleteItemModal
        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        onConfirm={confirmDelete}
        usersToDelete={[notificationData?.title || ""]}
        title="Delete notification"
        description="Are you sure you want to delete this notification?"
      />

      <AddEditNotification
        open={openEditModal}
        onClose={handleCloseEditModal}
        notificationToEditId={notificationId}
      />
    </>
  );
});

NotificationDetailsPopover.displayName = 'NotificationDetailsPopover';

export default NotificationDetailsPopover; 