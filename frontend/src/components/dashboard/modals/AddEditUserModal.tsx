"use client";

import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Modal from "@mui/joy/Modal";
import ModalDialog from "@mui/joy/ModalDialog";
import ModalClose from "@mui/joy/ModalClose";
import Typography from "@mui/joy/Typography";
import Stack from "@mui/joy/Stack";
import Input from "@mui/joy/Input";
import Autocomplete from "@mui/joy/Autocomplete";
import Button from "@mui/joy/Button";
import IconButton from "@mui/joy/IconButton";
import Avatar from "@mui/joy/Avatar";
import Switch from "@mui/joy/Switch";
import FormHelperText from "@mui/joy/FormHelperText";
import { UploadSimple as UploadIcon } from "@phosphor-icons/react/dist/ssr/UploadSimple";
import { Trash as Trash } from "@phosphor-icons/react/dist/ssr/Trash";
import { Box } from "@mui/joy";
import { useColorScheme } from "@mui/joy/styles";
import { createUser, updateUser, getUserById } from "./../../../lib/api/users";
import { getRolesList } from "./../../../lib/api/roles";
import { getCustomers } from "./../../../lib/api/customers";
import { getManagers } from "./../../../lib/api/managers";
import { toast } from "@/components/core/toaster";
import { useUserInfo } from "@/hooks/use-user-info";
import { isSystemAdministrator } from "@/lib/user-utils";

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
  userId?: string | null;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  customer?: string;
  role?: string;
  additionalEmails?: string[];
}

export default function AddEditUser({
  open,
  onClose,
  userId,
}: AddEditUserProps) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    customer: "",
    role: "",
    manager: "",
  });
  const [additionalEmails, setAdditionalEmails] = useState<string[]>([]);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] =
    useState<boolean>(false);
  const [errors, setErrors] = useState<FormErrors | null>(null);
  const [emailWarnings, setEmailWarnings] = useState<string[]>([]);
  const { colorScheme } = useColorScheme();
  const isLightTheme = colorScheme === "light";
  const queryClient = useQueryClient();

  const { data: roles, isLoading: isRolesLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: () => getRolesList(),
  });

  const { data: customers, isLoading: isCustomersLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: getCustomers,
  });

  const { data: managers, isLoading: isManagersLoading } = useQuery({
    queryKey: ["managers"],
    queryFn: () => getManagers(),
  });

  const { data: userData, isLoading: isUserLoading } = useQuery({
    queryKey: ["user", userId],
    queryFn: () => getUserById(userId!),
    enabled: !!userId && open,
  });

  const { userInfo } = useUserInfo();
  const isCurrentUserSystemAdmin = useMemo(() => isSystemAdministrator(userInfo), [userInfo]);

  const roleOptions = useMemo(() => {
    // Only show Standard User and Manager roles
    const standardRoles = roles?.filter(
      (role) => role.name === "standard_user" || role.name === "manager"
    );
    return standardRoles?.map((role) => role.display_name).sort() || [];
  }, [roles]);

  useEffect(() => {
    if (userId && userData && open) {
      setFormData({
        firstName: userData.firstName || "",
        lastName: userData.lastName || "",
        email: userData.email || "",
        customer: userData?.customer?.name || "",
        role: userData?.role?.displayName || "",
        manager: userData?.manager?.id.toString() || "",
      });
      setAvatarPreview(userData.avatar || null);
      setIsActive(userData.status === "active");
      setErrors(null);
      setEmailWarnings([]);
    } else if (!userId && open) {
      // If current user is not a system admin, preselect their customer
      const initialCustomer = !isCurrentUserSystemAdmin && userInfo?.customer?.name 
        ? userInfo.customer.name 
        : "";
      
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        customer: initialCustomer,
        role: "",
        manager: "",
      });
      setAdditionalEmails([]);
      setAvatarPreview(null);
      setIsActive(false);
      setErrors(null);
      setEmailWarnings([]);
    }
  }, [userId, userData, open, isCurrentUserSystemAdmin, userInfo]);

  const createUserMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onClose();
      toast.success("User created successfully.");
    },
    onError: (error: HttpError | Error) => {
      // Handle both HTTP errors and regular Error objects
      const errorMessage = (error as HttpError).response?.data?.message || (error as Error).message;
      
      if (errorMessage === "User with this email already exists" || errorMessage?.includes("already exists")) {
        setErrors((prev) => ({ ...prev, email: "User with this email already exists" }));
        toast.error("User with this email already exists");
      } else if (errorMessage) {
        toast.error(errorMessage);
      } else {
        toast.error("An error occurred while creating the user.");
      }
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: updateUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["user", userId] });
      onClose();
      toast.success("User updated successfully.");
    },
    onError: (error: HttpError | Error) => {
      // Handle both HTTP errors and regular Error objects
      const errorMessage = (error as HttpError).response?.data?.message || (error as Error).message;
      
      if (errorMessage === "User with this email already exists" || errorMessage?.includes("already exists")) {
        setErrors((prev) => ({ ...prev, email: "User with this email already exists" }));
        toast.error("User with this email already exists");
      } else if (errorMessage) {
        toast.error(errorMessage);
      } else {
        console.error('Update user error:', error);
        toast.error("An error occurred while updating the user.");
      }
    },
  });

  const validateEmail = (email: string): string | null => {
    if (!email.trim()) {
      return "Email is required";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return "Invalid email format";
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
    if (email[atIndex - 1] === ".") {
      return "Invalid email format";
    }

    return null;
  };

  const checkEmailUniqueness = async (
    email: string,
    index?: number
  ): Promise<boolean> => {
    if (!email || !validateEmail(email)) return false;
    try {
      setEmailWarnings((prev) => {
        const newWarnings = [...prev];
        if (index !== undefined) {
          if (index !== undefined && newWarnings[index] !== undefined) {
            newWarnings[index] = "";
          }
        } else {
          newWarnings[0] = "";
        }
        return newWarnings;
      });
      return false;
    } catch (error) {
      console.error("Error checking email uniqueness:", error);
      return false;
    }
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

    if (!formData.role.trim()) {
      newErrors.role = "Role is required";
    }

    const additionalEmailErrors = additionalEmails.map((email) => {
      if (email) {
        return validateEmail(email) || "";
      }
      return "";
    });

    if (additionalEmailErrors.some((error) => error)) {
      newErrors.additionalEmails = additionalEmailErrors;
    }

    return newErrors;
  };

  const handleInputChange = async (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({
      ...prev,
      [field]: undefined,
      additionalEmails: field === "email" ? undefined : prev?.additionalEmails,
    }));

    if (field === "email" && value) {
      const emailError = validateEmail(value);
      if (emailError) {
        setErrors((prev) => ({ ...prev, email: emailError }));
      }
    }
  };

  const handleCustomerChange = (event: React.SyntheticEvent, newValue: string | null) => {
    handleInputChange("customer", newValue || "");
  };

  const handleRoleChange = (event: React.SyntheticEvent, newValue: string | null) => {
    handleInputChange("role", newValue || "");
  };

  const handleAdditionalEmailChange = async (index: number, value: string) => {
    const updatedEmails = [...additionalEmails];
    updatedEmails[index] = value;
    setAdditionalEmails(updatedEmails);

    setErrors((prev) => {
      const newErrors = { ...prev };
      if (!newErrors.additionalEmails) {
        newErrors.additionalEmails = [];
      }
      newErrors.additionalEmails[index] = value
        ? validateEmail(value) || ""
        : "";
      return newErrors;
    });

    if (value) {
      await checkEmailUniqueness(value, index);
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

  const getCustomerId = (customerName: string): string => {
    if (!customers) return "";
    const customer = customers.find((c) => c.name === customerName);
    return customer ? customer.id : "";
  };

  const getRoleId = (roleName: string): string | undefined => {
    if (!roles) return undefined;
    const role = roles.find((r) => r.display_name === roleName);
    return role?.role_id;
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
        customerId: formData.customer
          ? getCustomerId(formData.customer)
          : undefined,
        roleId: formData.role ? getRoleId(formData.role) : undefined,
        managerId: formData.manager || undefined,
        additionalEmails: additionalEmails.filter((email) => email.trim()),
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
          {userId ? "Edit user" : "Add user"}
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
                      bgcolor: "#E9EFF8",
                      borderRadius: "50%",
                      width: { xs: 48, sm: 64 },
                      height: { xs: 48, sm: 64 },
                      color: "#4F46E5",
                    }}
                  >
                    <UploadIcon style={{ fontSize: "16px" }} weight="bold" />
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
                    fontSize: { xs: "12px", sm: "14px" },
                    fontWeight: 500,
                    color: "var(--joy-palette-text-primary)",
                    lineHeight: "16px",
                    textAlign: { xs: "left", sm: "left" },
                  }}
                >
                  Upload Avatar
                  <br />
                  <span
                    style={{
                      color: "var(--joy-palette-text-secondary)",
                      fontSize: "12px",
                      fontWeight: 300,
                    }}
                  >
                    Joyful supports PNGs, JPEGs and GIFs under 3MB
                  </span>
                </Typography>
              </Box>
              {avatarPreview && (
                <IconButton
                  onClick={() => setShowDeleteConfirmation(true)}
                  sx={{
                    bgcolor: "transparent",
                    color: "#6B7280",
                    "&:hover": { bgcolor: "transparent" },
                  }}
                >
                  <Trash fontSize="20px" />
                </IconButton>
              )}
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
                sx={{ fontSize: { xs: "12px", sm: "14px" }, color: "#6B7280" }}
              >
                Active
              </Typography>
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
                type="email"
                disabled={!!userId} 
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
                onChange={handleCustomerChange}
                options={customers?.sort((a, b) => a.name.localeCompare(b.name)).map((customer) => customer.name) || []}
                disabled={!isCurrentUserSystemAdmin}
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
            <Stack sx={{ flex: 0.49 }}>
              <Typography
                level="body-sm"
                sx={{
                  fontSize: { xs: "12px", sm: "14px" },
                  color: "var(--joy-palette-text-primary)",
                  mb: 0.5,
                  fontWeight: 500,
                }}
              >
                Role <span style={{ color: "var(--joy-palette-danger-500)" }}>*</span>
              </Typography>
              <Autocomplete
                placeholder="Select role"
                value={formData.role}
                onChange={handleRoleChange}
                options={roleOptions}
                slotProps={{
                  listbox: {
                    placement: 'top',
                  },
                }}
                sx={{
                  borderRadius: "6px",
                  fontSize: { xs: "12px", sm: "14px" },
                  border: errors?.role
                    ? "1px solid var(--joy-palette-danger-500)"
                    : undefined,
                }}
              />
              {errors?.role && (
                <FormHelperText
                  sx={{
                    color: "var(--joy-palette-danger-500)",
                    fontSize: { xs: "10px", sm: "12px" },
                  }}
                >
                  {errors.role}
                </FormHelperText>
              )}
            </Stack>
            {/* <Stack sx={{ flex: 1 }}>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography
                  level="body-sm"
                  sx={{
                    fontSize: { xs: "12px", sm: "14px" },
                    color: "var(--joy-palette-text-primary)",
                    mb: 0.5,
                    fontWeight: 500,
                  }}
                >
                  Manager
                </Typography>
                <Tooltip
                  title="You can't select a manager if your role is set as Manager"
                  placement="top"
                  sx={{
                    background: "#DAD8FD",
                    color: "#3D37DD",
                    width: { xs: "180px", sm: "206px" },
                    fontSize: { xs: "10px", sm: "12px" },
                  }}
                >
                  <Box sx={{ background: "none", cursor: "pointer" }}>
                    <WarningCircle
                      style={{ fontSize: "16px" }}
                      color="#6B7280"
                    />
                  </Box>
                </Tooltip>
              </Box>
              <Select
                placeholder="Select manager"
                value={formData.manager}
                onChange={(e, newValue) =>
                  handleInputChange("manager", newValue as string)
                }
                sx={{
                  borderRadius: "6px",
                  fontSize: { xs: "12px", sm: "14px" },
                }}
              >
                <Option value="">None</Option>
                {managers?.map((manager) => (
                  <Option key={manager.id} value={manager.id.toString()}>
                    {manager.name}
                  </Option>
                ))}
              </Select>
            </Stack> */}
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
