"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Modal from "@mui/joy/Modal";
import ModalDialog from "@mui/joy/ModalDialog";
import ModalClose from "@mui/joy/ModalClose";
import Typography from "@mui/joy/Typography";
import Stack from "@mui/joy/Stack";
import Input from "@mui/joy/Input";
import Select from "@mui/joy/Select";
import Option from "@mui/joy/Option";
import Button from "@mui/joy/Button";
import FormHelperText from "@mui/joy/FormHelperText";
import { useColorScheme } from "@mui/joy/styles";
import { toast } from "@/components/core/toaster";
import { createNotification, CreateNotificationRequest, editNotification, getNotificationById, getNotificationsTypes } from "@/lib/api/notifications";
import TiptapEditor from "@/components/TiptapEditor";

interface HttpError {
  response?: {
    data?: {
      message?: string;
    };
  };
}

interface AddEditUserProps {
  open: boolean;
  onClose: () => void;
  notificationToEditId?: number | null;
}

interface FormErrors {
  title?: string;
  message?: string;
  comment?: string;
  channel?: string;
  type?: string;
}

export default function AddEditUser({
  open,
  onClose,
  notificationToEditId,
}: AddEditUserProps) {
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    comment: "",
    channel: "",
    type: [] as string[],
  });
  const [errors, setErrors] = useState<FormErrors | null>(null);
  const { colorScheme } = useColorScheme();
  const isLightTheme = colorScheme === "light";
  const queryClient = useQueryClient();
 

  const { data: userData, isLoading: isUserLoading } = useQuery({
    queryKey: ["user", notificationToEditId],
    queryFn: () => getNotificationById(notificationToEditId!),
    enabled: !!notificationToEditId && open,
  });

  const { data: notificationTypes, isLoading: isNotificationTypesLoading } = useQuery({
    queryKey: ["notificationTypes"],
    queryFn: getNotificationsTypes,
  });

  useEffect(() => {
    if (notificationToEditId  && open) {
      const notification = userData;
      setFormData({
        title: notification?.title || "",
        message: notification?.message || "",
        comment: "",
        channel: notification?.channel || "",
        type: notification?.type ? (Array.isArray(notification.type) ? notification.type : [notification.type]) : [],
      });
      setErrors(null);
    } else if (!notificationToEditId && open) {
      setFormData({
        title: "",
        message: "",
        comment: "",
        channel: "",
        type: [],
      });
      setErrors(null);
    }
  }, [notificationToEditId, userData, open]);

  const createNotificationMutation = useMutation({
    mutationFn: createNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      onClose();
      toast.success("Notification created successfully.");
    },
    onError: (error: HttpError) => {
      const errorMessage = error.response?.data?.message;
      if (errorMessage) {
        toast.error(errorMessage);
      } else {
        toast.error("An error occurred while creating the notification.");
      }
    },
  });

  const updateNotificationMutation = useMutation({
    mutationFn: (data: CreateNotificationRequest) => editNotification(notificationToEditId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["user", notificationToEditId] });
      onClose();
      toast.success("Notification updated successfully.");
    },
    onError: (error: HttpError) => {
      const errorMessage = error.response?.data?.message;
      if (errorMessage) {
        toast.error(errorMessage);
      } else {
        toast.error("An error occurred while updating the notification.");
      }
    },
  });


  const validateForm = (): FormErrors => {
    const newErrors: FormErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    }
      
    if (!formData.message.trim()) {
      newErrors.message = "Message is required";
    }

    if (!formData.type.length) {
      newErrors.type = "Type is required";
    }

    if (!formData.channel) {
      newErrors.channel = "Channel is required";
    }

    return newErrors;
  };

  const handleInputChange = async (field: string, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({
      ...prev,
      [field]: undefined,
    }));
  };

  const handleMessageChange = (html: string) => {
    setFormData((prev) => ({ ...prev, message: html }));
  };

  const handleSave = async () => {
    const validationErrors = validateForm();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length === 0) {
      const payload = {
        title: formData.title,
        message: formData.message,
        comment: formData.comment,
        channel: formData.channel,
        type: formData.type,
      };

      if (notificationToEditId) {
        updateNotificationMutation.mutate(payload);
      } else {
        createNotificationMutation.mutate(payload);
      }
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog
        sx={{
          width: { xs: "90%", sm: 600, md: 800 },
          maxWidth: "100%",
          p: { xs: 2, sm: 3 },
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <ModalClose sx={{ color: "#6B7280" }} />
        <Typography
          level="h3"
          sx={{
            fontSize: { xs: "20px", sm: "22px", md: "24px" },
            fontWeight: 600,
            color: "var(--joy-palette-text-primary)",
            mb: { xs: 1.5, sm: 2 },
          }}
        >
          {notificationToEditId ? "Edit notification" : "Add notification"}
        </Typography>
        <Stack spacing={{ xs: 1.5, sm: 2 }}>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={{ xs: 1.5, sm: 2 }}
          >
            <Stack sx={{ flex: 1 }}>
              <Typography
                level="body-sm"
                sx={{
                  fontSize: { xs: "12px", sm: "14px" },
                  color: "var(--joy-palette-text-primary)",
                  mb: 0.5,
                  fontWeight: 500,
                }}
              >
                Type
              </Typography>
              <Select
                placeholder="Select type"
                value={formData.type[0] || ""}
                onChange={(e, newValue) =>
                  handleInputChange("type", newValue ? [newValue as string] : [])
                }
                sx={{
                  borderRadius: "6px",
                  fontSize: { xs: "12px", sm: "14px" },
                  border: errors?.type
                    ? "1px solid var(--joy-palette-danger-500)"
                    : undefined,
                }}
              >
                {notificationTypes?.types?.map((type: string) => (
                  <Option key={type} value={type}>{type}</Option>
                ))}
              </Select>
              {errors?.type && (
                <FormHelperText
                  sx={{
                    color: "var(--joy-palette-danger-500)",
                    fontSize: { xs: "10px", sm: "12px" },
                  }}
                >
                  {errors.type}
                </FormHelperText>
              )}
            </Stack>
            <Stack sx={{ flex: 1 }}>
              <Typography
                level="body-sm"
                sx={{
                  fontSize: { xs: "12px", sm: "14px" },
                  color: "var(--joy-palette-text-primary)",
                  mb: 0.5,
                  fontWeight: 500,
                }}
              >
                Channel
              </Typography>
              <Select
                placeholder="Select channel"
                value={formData.channel}
                onChange={(e, newValue) =>
                  handleInputChange("channel", newValue as string)
                }
                sx={{
                  borderRadius: "6px",
                  fontSize: { xs: "12px", sm: "14px" },
                  border: errors?.channel
                    ? "1px solid var(--joy-palette-danger-500)"
                    : undefined,
                }}
              >
                {notificationTypes?.channels?.map((channel: string) => (
                  <Option key={channel} value={channel}>{channel}</Option>
                ))}
              </Select>
              {errors?.channel && (
                <FormHelperText
                  sx={{
                    color: "var(--joy-palette-danger-500)",
                    fontSize: { xs: "10px", sm: "12px" },
                  }}
                >
                  {errors.channel}
                </FormHelperText>
              )}
            </Stack>
          </Stack>

          <Stack
            direction="column"
            spacing={{ xs: 1.5, sm: 2 }}
          >
            <Stack>
            <Typography
                level="body-sm"
                sx={{
                  fontSize: { xs: "12px", sm: "14px" },
                  color: "var(--joy-palette-text-primary)",
                  mb: 0.5,
                  fontWeight: 500,
                }}
              >
                Title
              </Typography>
              <Input
                placeholder="Enter title"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                error={!!errors?.title}
                slotProps={{ input: { maxLength: 100 } }}
                sx={{
                  borderRadius: "6px",
                  fontSize: { xs: "12px", sm: "14px" },
                }}
              />
              <Typography
                level="body-sm"
                sx={{
                  fontSize: "12px",
                  color: formData.title.length > 100 ? "red" : "var(--joy-palette-text-secondary)",
                  ml: "auto"
                }}
              >
                {formData.title.length}/100 characters
              </Typography>
              {errors?.title && (
                <FormHelperText
                  sx={{
                    color: "var(--joy-palette-danger-500)",
                    fontSize: { xs: "10px", sm: "12px" },
                  }}
                >
                  {errors.title}
                </FormHelperText>
              )}
              
            </Stack>

            <Stack>
              <Typography
                level="body-sm"
                sx={{
                  fontSize: { xs: "12px", sm: "14px" },
                  color: "var(--joy-palette-text-primary)",
                  mb: 0.5,
                  fontWeight: 500,
                }}
              >
                Message
              </Typography>
              <Stack sx={{ border: "1px solid var(--joy-palette-divider)", borderRadius: "6px", p: 1 }}>
              <TiptapEditor
                content={formData.message}
                onChange={handleMessageChange}
                isPreview={false}
              />
              </Stack>
              {errors?.message && (
                <FormHelperText
                  sx={{
                    color: "var(--joy-palette-danger-500)",
                    fontSize: { xs: "10px", sm: "12px" },
                  }}
                >
                  {errors.message}
                </FormHelperText>
              )}
            </Stack>
          </Stack>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={{ xs: 1, sm: 2 }}
            justifyContent="flex-end"
          >
            <Button
              variant="outlined"
              onClick={onClose}
              sx={{
                fontSize: { xs: "12px", sm: "14px" },
                px: { xs: 2, sm: 3 },
                width: { xs: "100%", sm: "auto" },
              }}
            >
              Cancel
            </Button>
            <Button
              variant="solid"
              onClick={handleSave}
              disabled={
                createNotificationMutation.isPending || updateNotificationMutation.isPending
              }
              sx={{
                borderRadius: "20px",
                bgcolor: "#4F46E5",
                color: "#FFFFFF",
                fontWeight: 500,
                fontSize: { xs: "12px", sm: "14px" },
                px: { xs: 2, sm: 3 },
                py: 1,
                "&:hover": { bgcolor: "#4338CA" },
                width: { xs: "100%", sm: "auto" },
              }}
            >
              Save
            </Button>
          </Stack>
        </Stack>
      </ModalDialog>
    </Modal>
  );
}
