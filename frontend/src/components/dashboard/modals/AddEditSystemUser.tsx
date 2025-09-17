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
import Autocomplete from "@mui/joy/Autocomplete";
import Button from "@mui/joy/Button";
import IconButton from "@mui/joy/IconButton";
import Avatar from "@mui/joy/Avatar";
import Switch from "@mui/joy/Switch";
import FormHelperText from "@mui/joy/FormHelperText";
import { Upload as UploadIcon } from "@phosphor-icons/react/dist/ssr/Upload";
import { Trash as Trash } from "@phosphor-icons/react/dist/ssr/Trash";
import { Box } from "@mui/joy";
import { useColorScheme } from "@mui/joy/styles";
import {
  createSystemUser,
  updateSystemUser,
  getSystemUserById,
} from "./../../../lib/api/system-users";
import { getSystemRoles } from "./../../../lib/api/system-users";
import { getCustomers } from "./../../../lib/api/customers";
import { toast } from "@/components/core/toaster";
import {SystemRolesHumanNames} from "@/lib/constants/system-roles";
import {SystemRole} from "@/contexts/auth/types";

interface HttpError {
  response?: {
    data?: {
      message?: string;
    };
  };
}

interface AddEditSystemUserProps {
  open: boolean;
  onClose: () => void;
  userId?: number | null;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  customer?: string;
  systemRole?: string;
}

export default function AddEditSystemUser({
  open,
  onClose,
  userId,
}: AddEditSystemUserProps) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    customer: "",
    systemRole: "customer_success",
  });

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [showDeleteConfirmation, setShowDeleteConfirmation] =
    useState<boolean>(false);
  const [errors, setErrors] = useState<FormErrors | null>(null);
  const [emailWarnings, setEmailWarnings] = useState<string[]>([]);
  const { colorScheme } = useColorScheme();
  const isLightTheme = colorScheme === "light";
  const queryClient = useQueryClient();
  const [localSystemRoles, setLocalSystemRoles] = useState<SystemRole[]>([]);

  const formatSystemRole = (role: string): string => {
    return role
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const { data: roles, isLoading: isRolesLoading } = useQuery({
    queryKey: ["system-roles"],
    queryFn: getSystemRoles,
  });

  const { data: customers, isLoading: isCustomersLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: getCustomers,
  });

  const { data: userData, isLoading: isUserLoading } = useQuery({
    queryKey: ["user", userId],
    queryFn: () => getSystemUserById(userId!),
    enabled: !!userId && open,
  });

  useEffect(() => {
    if (Array.isArray(roles)) {
      setLocalSystemRoles(roles);
    } else {
      setLocalSystemRoles([]);
    }
  }, [roles]);

  useEffect(() => {
    if (userId && userData && open) {
      setFormData({
        firstName: userData.firstName || "",
        lastName: userData.lastName || "",
        email: userData.email || "",
        customer: userData.customer?.name || "",
        systemRole: userData.isSuperadmin ? 'system_admin' : 'customer_success',
      });
      setAvatarPreview(userData.avatar || null);
      setIsActive(userData.status === "active");
      setErrors(null);
      setEmailWarnings([]);
    } else if (!userId && open) {
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        customer: "",
        systemRole: "",
      });
      setAvatarPreview(null);
      setIsActive(false);
      setErrors(null);
      setEmailWarnings([]);
    }
  }, [userId, userData, open]);

  const createUserMutation = useMutation({
    mutationFn: createSystemUser,
    onSuccess: () => {
      // queryClient.invalidateQueries({ queryKey: ["system-users"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onClose();
      toast.success("User created successfully.");
    },
    onError: (error: HttpError) => {
      const errorMessage = error.response?.data?.message;
      if (errorMessage) {
        toast.error(errorMessage);
      } else {
        toast.error("An error occurred while creating the user.");
      }
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: updateSystemUser,
    onSuccess: () => {
      // queryClient.invalidateQueries({ queryKey: ["system-users"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["system-user", userId] });
      onClose();
      toast.success("User updated successfully.");
    },
    onError: (error: HttpError) => {
      const errorMessage = error.response?.data?.message;
      if (errorMessage) {
        toast.error(errorMessage);
      } else {
        toast.error("An error occurred while updating the user.");
      }
    },
  });

  const validateEmail = (email: string): string | null => {
    if (!email.trim()) {
      return "Email is required";
    }

    if (email.startsWith(".") || email.endsWith(".")) {
      return "Invalid email format";
    }

    if (email.includes("..")) {
      return "Invalid email format";
    }

    if (email.includes("/")) {
      return "Invalid email format";
    }

    const atIndex = email.indexOf("@");
    if (atIndex > 0 && email[atIndex - 1] === ".") {
      return "Invalid email format";
    }
    
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!emailRegex.test(email)) {
      return "Invalid email format";
    }

    return null;
  };

  const validateForm = (): FormErrors => {
    const newErrors: FormErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }

    const emailError = validateEmail(formData.email);
    if (emailError) {
      newErrors.email = emailError;
    }

    if (!formData.systemRole) {
      newErrors.systemRole = "System role is required";
    }

    if (formData.systemRole !== "system_admin" && !formData.customer) {
      newErrors.customer = "Customer is required";
    }

    return newErrors;
  };

  const handleInputChange = async (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (field === "email") {
      const emailError = validateEmail(value);
      setErrors((prev) => ({ ...prev, email: emailError || undefined }));
    } else if (field === "firstName" && value.trim()) {
      setErrors((prev) => ({ ...prev, firstName: undefined }));
    } else if (field === "lastName" && value.trim()) {
      setErrors((prev) => ({ ...prev, lastName: undefined }));
    } else if (field === "customer" && value) {
      setErrors((prev) => ({ ...prev, customer: undefined }));
    } else if (field === "systemRole" && value) {
      setErrors((prev) => ({ ...prev, systemRole: undefined }));
    }
  };

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.size <= 3 * 1024 * 1024) {
      const fileTypes = ["image/png", "image/jpeg", "image/gif"];
      if (fileTypes.includes(file.type)) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setAvatarPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        alert("Please upload a PNG, JPEG, or GIF file.");
      }
    } else {
      alert("File size must be less than 3MB.");
    }
  };

  const handleDeleteAvatar = () => {
    setAvatarPreview(null);
    setShowDeleteConfirmation(false);
  };

  const getCustomerId = (customerName: string): number => {
    if (!customers) return 0;
    const customer = customers.find((c) => c.name === customerName);
    return customer ? customer.id : 0;
  };

  const handleSystemRoleChange = (newValue: string) => {
    const isSuperadmin = newValue === "system_admin";
    setFormData((prev) => ({
      ...prev,
      systemRole: newValue as SystemRole,
      isSuperadmin,
      isCustomerSuccess: !isSuperadmin,
      customer: isSuperadmin ? "" : prev.customer,
    }));
    setErrors((prev) => ({ 
      ...prev, 
      systemRole: undefined,
      customer: isSuperadmin ? undefined : prev?.customer 
    }));
  };

  const handleSave = async () => {
    const validationErrors = validateForm();
    setErrors(validationErrors);

    const hasEmailWarnings = emailWarnings.some((warning) => warning);
    if (Object.keys(validationErrors).length === 0 && !hasEmailWarnings) {
      const payload = {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        status: isActive ? "active" : ("inactive" as "active" | "inactive"),
        systemRole: formData.systemRole,
        ...(formData.systemRole !== "system_admin" && formData.customer
          ? { customerId: getCustomerId(formData.customer) }
          : {}),
      };

      if (userId) {
        updateUserMutation.mutate({
          id: userId,
          ...payload,
        });
      } else {
        createUserMutation.mutate(payload);
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
          {userId ? "Edit system user" : "Add system user"}
        </Typography>
        <Stack spacing={{ xs: 1.5, sm: 2 }}>
          <Stack spacing={1}>
            <Stack
              direction={{ xs: "row", sm: "row" }}
              spacing={{ xs: 1, sm: 2 }}
              alignItems={{ xs: "flex-start", sm: "center" }}
              mb={2}
              justifyContent="space-between"
            >
              <Box
                display="flex"
                alignItems={{ xs: "flex-start", sm: "center" }}
                gap={{ xs: 1, sm: 2 }}
                flexDirection={{ xs: "column", sm: "row" }}
              >
                {avatarPreview ? (
                  <Avatar
                    src={avatarPreview}
                    sx={{
                      width: { xs: 48, sm: 64 },
                      height: { xs: 48, sm: 64 },
                      borderRadius: "50%",
                    }}
                  />
                ) : (
                  <IconButton
                    component="label"
                    sx={{
                      bgcolor: "#E5E7EB",
                      borderRadius: "50%",
                      width: { xs: 48, sm: 64 },
                      height: { xs: 48, sm: 64 },
                      color: "#4F46E5",
                    }}
                  >
                    <UploadIcon style={{ fontSize: "16px" }} />
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/gif"
                      hidden
                      onChange={handleAvatarUpload}
                    />
                  </IconButton>
                )}
                <Typography
                  level="body-sm"
                  sx={{
                    fontSize: { xs: "10px", sm: "12px" },
                    color: "#6B7280",
                    lineHeight: "16px",
                    textAlign: { xs: "left", sm: "left" },
                  }}
                >
                  Upload Avatar
                  <br />
                  Joyful supports PNGs, JPEGs and GIFs under 3MB
                </Typography>
              </Box>
              <IconButton
                onClick={() => setShowDeleteConfirmation(true)}
                disabled={!avatarPreview}
                sx={{
                  bgcolor: "transparent",
                  color: "#6B7280",
                  "&:hover": { bgcolor: "transparent" },
                }}
              >
                <Trash fontSize="20px" />
              </IconButton>
            </Stack>

            {showDeleteConfirmation && (
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                alignItems={{ xs: "flex-start", sm: "center" }}
                sx={{
                  bgcolor: isLightTheme ? "#DDDEE0" : "transparent",
                  borderRadius: "6px",
                  p: { xs: 1, sm: 1.5 },
                  justifyContent: "space-between",
                  border: "1px solid var(--joy-palette-divider)",
                }}
              >
                <Typography
                  level="body-md"
                  sx={{
                    fontSize: { xs: "12px", sm: "14px" },
                    color: isLightTheme
                      ? "#272930"
                      : "var(--joy-palette-text-secondary)",
                  }}
                >
                  Are you sure you want to delete image?
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="solid"
                    color="neutral"
                    onClick={() => setShowDeleteConfirmation(false)}
                    sx={{
                      fontSize: { xs: "12px", sm: "14px" },
                      px: { xs: 2, sm: 3 },
                    }}
                  >
                    No
                  </Button>
                  <Button
                    variant="solid"
                    color="danger"
                    onClick={handleDeleteAvatar}
                    sx={{
                      fontSize: { xs: "12px", sm: "14px" },
                      px: { xs: 2, sm: 3 },
                    }}
                  >
                    Yes
                  </Button>
                </Stack>
              </Stack>
            )}
          </Stack>

          {userId && (
            <Stack spacing={1}>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                mb={{ xs: 1, sm: 2 }}
              >
                <Switch
                  checked={isActive}
                  onChange={(event) => setIsActive(event.target.checked)}
                  sx={{ transform: { xs: "scale(0.9)", sm: "scale(1)" } }}
                />
                <Typography
                  level="body-sm"
                  sx={{
                    fontSize: { xs: "12px", sm: "14px" },
                    color: "var(--joy-palette-text-secondary)",
                  }}
                >
                  Active
                </Typography>
              </Stack>
            </Stack>
          )}

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
                First Name
              </Typography>
              <Input
                placeholder="Enter first name"
                value={formData.firstName}
                onChange={(e) => handleInputChange("firstName", e.target.value)}
                error={!!errors?.firstName}
                slotProps={{ input: { maxLength: 255 } }}
                sx={{
                  borderRadius: "6px",
                  fontSize: { xs: "12px", sm: "14px" },
                }}
              />
              {errors?.firstName && (
                <FormHelperText
                  sx={{
                    color: "var(--joy-palette-danger-500)",
                    fontSize: { xs: "10px", sm: "12px" },
                  }}
                >
                  {errors.firstName}
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
                Last Name
              </Typography>
              <Input
                placeholder="Enter last name"
                value={formData.lastName}
                onChange={(e) => handleInputChange("lastName", e.target.value)}
                error={!!errors?.lastName}
                slotProps={{ input: { maxLength: 255 } }}
                sx={{
                  borderRadius: "6px",
                  fontSize: { xs: "12px", sm: "14px" },
                }}
              />
              {errors?.lastName && (
                <FormHelperText
                  sx={{
                    color: "var(--joy-palette-danger-500)",
                    fontSize: { xs: "10px", sm: "12px" },
                  }}
                >
                  {errors.lastName}
                </FormHelperText>
              )}
            </Stack>
          </Stack>

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
                Email
              </Typography>
              <Input
                placeholder="Enter email"
                disabled={!!userId}
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                error={!!errors?.email}
                slotProps={{ input: { maxLength: 255 } }}
                sx={{
                  borderRadius: "6px",
                  fontSize: { xs: "12px", sm: "14px" },
                }}
              />
              {errors?.email && (
                <FormHelperText
                  sx={{
                    color: "var(--joy-palette-danger-500)",
                    fontSize: { xs: "10px", sm: "12px" },
                  }}
                >
                  {errors.email}
                </FormHelperText>
              )}
              {emailWarnings[0] && (
                <FormHelperText
                  sx={{
                    color: "var(--joy-palette-warning-500)",
                    fontSize: { xs: "10px", sm: "12px" },
                  }}
                >
                  {emailWarnings[0]}
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
                Customer
              </Typography>
              <Autocomplete
                placeholder="Select customer"
                value={formData.customer}
                onChange={(event, newValue) =>
                  handleInputChange("customer", newValue as string)
                }
                options={customers?.sort((a, b) => a.name.localeCompare(b.name)).map((customer) => customer.name) || []}
                disabled={formData.systemRole === "system_admin"}
                slotProps={{
                  listbox: {
                    placement: 'top',
                  },
                }}
                sx={{
                  borderRadius: "6px",
                  fontSize: { xs: "12px", sm: "14px" },
                  border: errors?.customer
                    ? "1px solid var(--joy-palette-danger-500)"
                    : undefined,
                  opacity: formData.systemRole === "system_admin" ? 0.5 : 1,
                }}
              />
              {errors?.customer && (
                <FormHelperText
                  sx={{
                    color: "var(--joy-palette-danger-500)",
                    fontSize: { xs: "10px", sm: "12px" },
                  }}
                >
                  {errors.customer}
                </FormHelperText>
              )}
            </Stack>
          </Stack>

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
                System Role
              </Typography>
              <Select
                placeholder="Select system role"
                value={formData.systemRole}
                onChange={(e, newValue) =>
                  handleSystemRoleChange(newValue as SystemRole)
                }
                color={errors?.systemRole ? "danger" : "neutral"}
                sx={{
                  borderRadius: "6px",
                  fontSize: { xs: "12px", sm: "14px" },
                }}
              >
                {Object.entries(SystemRolesHumanNames).map(([systemRole, systemRoleName]) => {
                  return (
                    <Option key={systemRole} value={systemRole}>
                      {systemRoleName}
                    </Option>
                  );
                })}
              </Select>
              {errors?.systemRole && (
                <FormHelperText
                  sx={{
                    color: "var(--joy-palette-danger-500)",
                    fontSize: { xs: "10px", sm: "12px" },
                  }}
                >
                  {errors.systemRole}
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
                createUserMutation.isPending || updateUserMutation.isPending
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
