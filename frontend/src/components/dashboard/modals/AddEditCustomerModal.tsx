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
import Autocomplete from "@mui/joy/Autocomplete";
import { useColorScheme } from "@mui/joy/styles";
import {
  createCustomer,
  getCustomerById,
  updateCustomer,
} from "../../../lib/api/customers";
import { getManagers } from "@/lib/api/managers";
import { getSubscriptions } from "../../../lib/api/customers";
import { ApiUser, Customer } from "@/contexts/auth/types";
import { toast } from "@/components/core/toaster";
import { getStatuses, getUsers, GetUsersParams } from "@/lib/api/users";

interface HttpError {
  response?: {
    data?: {
      message?: string;
    };
  };
}

interface AddEditCustomerProps {
  open: boolean;
  onClose: () => void;
  customerId?: number | null;
}

interface FormErrors {
  name?: string;
  email?: string;
  customerSuccessId?: string;
  subscriptionId?: string;
  status?: string;
  ownerId?: string;
}

interface SelectUser {
  id: number;
  firstName: string;
  lastName: string;
}

export default function AddEditCustomer({
  open,
  onClose,
  customerId,
}: AddEditCustomerProps) {
  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    customerSuccessId: number | null;
    subscriptionId: number | null;
    status: string;
    ownerId: number | null;
  }>({
    name: "",
    email: "",
    customerSuccessId: null,
    subscriptionId: null,
    status: "",
    ownerId: null,
  });

  const [errors, setErrors] = useState<FormErrors | null>(null);
  const [emailWarnings, setEmailWarnings] = useState<string[]>([]);
  const { colorScheme } = useColorScheme();
  const queryClient = useQueryClient();

  const { data: managers, isLoading: isManagersLoading } = useQuery({
    queryKey: ["managers"],
    queryFn: getManagers,
    enabled: open,
  });

  const { data: subscriptions, isLoading: isSubscriptionsLoading } = useQuery({
    queryKey: ["subscriptions"],
    queryFn: getSubscriptions,
    enabled: open,
  });

  const { data: customerData, isLoading: isCustomerLoading } = useQuery({
    queryKey: ["customers", customerId],
    queryFn: () => getCustomerById(customerId!),
    enabled: !!customerId && open,
  });

  const { data: statuses, isLoading: isStatusesLoading } = useQuery({
    queryKey: ["statuses"],
    queryFn: getStatuses,
    enabled: open,
  });

  const { data: users, isLoading: isUsersLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const params: GetUsersParams = {
        perPage: 1000,
      };
      return getUsers(params);
    },
    enabled: open,
  });

  useEffect(() => {
    if (customerId && customerData && open) {
      setFormData({
        name: customerData.name || "",
        email:
          typeof customerData.email === "string"
            ? customerData.email
            : customerData.email[0] || "",
        subscriptionId: customerData.subscriptionId ?? null,
        customerSuccessId: customerData.customerSuccess?.id ?? null,
        status: customerData.status || "",
        ownerId: customerData.owner?.id ?? null,
      });
      setErrors(null);
      setEmailWarnings([]);
    } else if (!customerId && open) {
      setFormData({
        name: "",
        email: "",
        customerSuccessId: null,
        subscriptionId: null,
        status: "",
        ownerId: null,
      });
      setErrors(null);
      setEmailWarnings([]);
    }
  }, [customerId, customerData, open]);

  const createCustomerMutation = useMutation({
    mutationFn: createCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      onClose();
      toast.success("Customer created successfully.");
    },
    onError: (error: HttpError) => {
      const errorMessage = error.response?.data?.message;
      if (errorMessage) {
        toast.error(errorMessage);
      } else {
        toast.error("An error occurred while creating the customer.");
      }
    },
  });

  const updateCustomerMutation = useMutation({
    mutationFn: updateCustomer,
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customers", customerId] });
      await queryClient.refetchQueries({ queryKey: ["customers", customerId] });
      onClose();
      toast.success("Customer updated successfully.");
    },
    onError: (error: HttpError) => {
      const errorMessage = error.response?.data?.message;
      if (errorMessage) {
        toast.error(errorMessage);
      } else {
        toast.error("An error occurred while updating the customer.");
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

  const validateForm = (): FormErrors => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Customer name is required";
    }

    const emailError = validateEmail(formData.email);
    if (emailError) {
      newErrors.email = emailError;
    }


    if (!formData.subscriptionId) {
      newErrors.subscriptionId = "Subscription is required";
    }

    if (!formData.ownerId) {
      newErrors.ownerId = "Customer admin is required";
    }

    return newErrors;
  };

  const handleInputChange = (field: string, value: string | number | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({
      ...prev,
      [field]: undefined,
    }));

    if (field === "email" && typeof value === "string") {
      const emailError = validateEmail(value);
      if (emailError) {
        setErrors((prev) => ({ ...prev, email: emailError }));
      }
    }
  };

  const handleSave = async () => {
    const validationErrors = validateForm();
    setErrors(validationErrors);

    const hasEmailWarnings = emailWarnings.some((warning) => warning);
    if (Object.keys(validationErrors).length === 0 && !hasEmailWarnings) {
      const payload = {
        email: formData.email,
        name: formData.name,
        status: formData.status,
        customerSuccessId: formData.customerSuccessId ?? undefined,
        ownerId: formData.ownerId ?? undefined,
        subscriptionId: formData.subscriptionId ?? undefined,
      };

      if (customerId) {
        updateCustomerMutation.mutate({
          id: customerId,
          ...payload,
        });
      } else {
        createCustomerMutation.mutate(payload);
      }
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog
        sx={{
          width: { xs: "90%", sm: 520 },
          p: 3,
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
        }}
      >
        <ModalClose sx={{ color: "#6B7280" }} />
        <Typography
          level="h3"
          sx={{
            fontSize: "24px",
            fontWeight: 600,
            color: "var(--joy-palette-text-primary)",
            mb: 2,
          }}
        >
          {customerId ? "Edit customer" : "Add customer"}
        </Typography>
        <Stack spacing={2}>
          {/* {customerId && (
            <Stack sx={{ flex: 1 }}>
              <Typography
                level="body-sm"
                sx={{
                  fontSize: "14px",
                  color: "var(--joy-palette-text-primary)",
                  mb: 0.5,
                  fontWeight: 500,
                }}
              >
                Status
              </Typography>
              <Select
                placeholder="Select status"
                value={formData.status}
                onChange={(e, newValue) =>
                  handleInputChange("status", newValue)
                }
                sx={{
                  borderRadius: "6px",
                  fontSize: "14px",
                  border: errors?.status
                    ? "1px solid var(--joy-palette-danger-500)"
                    : undefined,
                }}
              >
                {statuses &&
                  statuses.map((status, index) => (
                    <Option key={index} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Option>
                  ))}
              </Select>
            </Stack>
          )} */}
          <Stack sx={{ flex: 1 }}>
            <Typography
              level="body-sm"
              sx={{
                fontSize: "14px",
                color: "var(--joy-palette-text-primary)",
                mb: 0.5,
                fontWeight: 500,
              }}
            >
              Customer Name
            </Typography>
            <Input
              placeholder="Enter customer name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              error={!!errors?.name}
              slotProps={{ input: { maxLength: 255 } }}
              sx={{
                borderRadius: "6px",
                fontSize: "14px",
              }}
            />
            {errors?.name && (
              <FormHelperText
                sx={{
                  color: "var(--joy-palette-danger-500)",
                  fontSize: "12px",
                }}
              >
                {errors.name}
              </FormHelperText>
            )}
          </Stack>

          <Stack direction="row" spacing={2}>
            <Stack sx={{ flex: 1 }}>
              <Typography
                level="body-sm"
                sx={{
                  fontSize: "14px",
                  color: "var(--joy-palette-text-primary)",
                  mb: 0.5,
                  fontWeight: 500,
                }}
              >
                Customer administrator
              </Typography>
              <Autocomplete
                placeholder="Search users"
                options={users?.data.sort((a, b) => a.firstName?.localeCompare(b.firstName)) || []}
                getOptionLabel={(user: ApiUser) =>
                  `${user.firstName?.slice(0, 25) || ''} ${user.lastName?.slice(0, 25) || ''}`
                }
                getOptionKey={(user: ApiUser) => user.id}
                value={
                  users?.data?.find((user: ApiUser) => user.id === formData.ownerId) ||
                  (customerData?.owner ? {
                    id: customerData.owner.id,
                    firstName: customerData.owner.firstName,
                    lastName: customerData.owner.lastName,
                    email: ""
                  } as ApiUser : null)
                }
                onChange={(event, newValue) => {
                  handleInputChange("ownerId", newValue ? newValue.id : null);
                  if (!customerId) {
                    if (newValue && newValue.email) {
                      handleInputChange("email", newValue.email);
                    } else if (!newValue) {
                      handleInputChange("email", "");
                    }
                  }
                }}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                sx={{
                  borderRadius: "6px",
                  fontSize: "14px",
                  border: errors?.ownerId
                    ? "1px solid var(--joy-palette-danger-500)"
                    : undefined,
                }}
              />
              {errors?.ownerId && (
                <FormHelperText
                  sx={{
                    color: "var(--joy-palette-danger-500)",
                    fontSize: "12px",
                  }}
                >
                  {errors.ownerId}
                </FormHelperText>
              )}
            </Stack>
          </Stack>

          <Stack sx={{ flex: 1 }}>
            <Typography
              level="body-sm"
              sx={{
                fontSize: "14px",
                color: "var(--joy-palette-text-primary)",
                mb: 0.5,
                fontWeight: 500,
              }}
            >
              Email
            </Typography>
            <Input
              placeholder="Enter email"
              disabled
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              error={!!errors?.email}
              slotProps={{ input: { maxLength: 255 } }}
              sx={{
                borderRadius: "6px",
                fontSize: "14px",
              }}
            />
            {errors?.email && (
              <FormHelperText
                sx={{
                  color: "var(--joy-palette-danger-500)",
                  fontSize: "12px",
                }}
              >
                {errors.email}
              </FormHelperText>
            )}
            {emailWarnings[0] && (
              <FormHelperText
                sx={{
                  color: "var(--joy-palette-warning-500)",
                  fontSize: "12px",
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
                fontSize: "14px",
                color: "var(--joy-palette-text-primary)",
                mb: 0.5,
                fontWeight: 500,
              }}
            >
              Subscription
            </Typography>
            <Select
              placeholder="Select subscription"
              value={formData.subscriptionId}
              onChange={(e, newValue) =>
                handleInputChange("subscriptionId", newValue)
              }
              slotProps={{
                listbox: {
                  placement: 'top'
                }
              }}
              sx={{
                borderRadius: "6px",
                fontSize: "14px",
                border: errors?.subscriptionId
                  ? "1px solid var(--joy-palette-danger-500)"
                  : undefined,
              }}
            >
              {subscriptions &&
                subscriptions?.map((subscription) => (
                  <Option key={subscription.id} value={subscription.id}>
                    {subscription.name}
                  </Option>
                ))}
            </Select>
            {errors?.subscriptionId && (
              <FormHelperText
                sx={{
                  color: "var(--joy-palette-danger-500)",
                  fontSize: "12px",
                }}
              >
                {errors.subscriptionId}
              </FormHelperText>
            )}
          </Stack>

          <Stack direction="row" spacing={2}>
            <Stack sx={{ flex: 1 }}>
              <Typography
                level="body-sm"
                sx={{
                  fontSize: "14px",
                  color: "var(--joy-palette-text-primary)",
                  mb: 0.5,
                  fontWeight: 500,
                }}
              >
                Customer Success Manager
              </Typography>
              <Autocomplete
                placeholder="Select user"
                options={managers?.sort((a, b) => a.name.localeCompare(b.name)) || []}
                value={managers?.find((manager) => manager.id === formData.customerSuccessId) || null}
                onChange={(event, newValue) => handleInputChange("customerSuccessId", newValue ? newValue.id : null)}
                getOptionLabel={(option) => option.name}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                sx={{
                  borderRadius: "6px",
                  fontSize: "14px",
                  border: errors?.customerSuccessId
                    ? "1px solid var(--joy-palette-danger-500)"
                    : undefined,
                }}
                slotProps={{
                  listbox: {
                    placement: 'top',
                  },
                }}
              />
              {errors?.customerSuccessId && (
                <FormHelperText
                  sx={{
                    color: "var(--joy-palette-danger-500)",
                    fontSize: "12px",
                  }}
                >
                  {errors.customerSuccessId}
                </FormHelperText>
              )}
            </Stack>
          </Stack>

          <Stack direction="row" spacing={2} justifyContent="flex-end" mt={2}>
            <Button variant="outlined" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="solid"
              onClick={handleSave}
              disabled={
                createCustomerMutation.isPending ||
                updateCustomerMutation.isPending
              }
              sx={{
                borderRadius: "20px",
                bgcolor: "#4F46E5",
                color: "#FFFFFF",
                fontWeight: 500,
                px: 3,
                py: 1,
                "&:hover": { bgcolor: "#4338CA" },
              }}
            >
              {customerId ? "Save" : "Add customer"}
            </Button>
          </Stack>
        </Stack>
      </ModalDialog>
    </Modal>
  );
}
