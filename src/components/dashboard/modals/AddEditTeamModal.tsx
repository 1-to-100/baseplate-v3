"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Modal from "@mui/joy/Modal";
import ModalDialog from "@mui/joy/ModalDialog";
import ModalClose from "@mui/joy/ModalClose";
import Typography from "@mui/joy/Typography";
import Stack from "@mui/joy/Stack";
import Input from "@mui/joy/Input";
import Textarea from "@mui/joy/Textarea";
import Select from "@mui/joy/Select";
import Option from "@mui/joy/Option";
import Button from "@mui/joy/Button";
import FormHelperText from "@mui/joy/FormHelperText";
import CircularProgress from "@mui/joy/CircularProgress";
import { createTeam, updateTeam, getTeamById } from "@/lib/api/teams";
import type { UpdateTeamInput } from "@/types/database";
import { toast } from "@/components/core/toaster";
import { useUserInfo } from "@/hooks/use-user-info";
import { edgeFunctions } from "@/lib/supabase/edge-functions";
import { isSystemAdministrator } from "@/lib/user-utils";
import { getCustomers } from "@/lib/api/customers";

interface AddEditTeamModalProps {
  open: boolean;
  onClose: () => void;
  teamId?: string;
}

interface FormData {
  name: string;
  description: string;
  managerId: string;
  customerId: string;
}

interface FormErrors {
  name?: string;
  customerId?: string;
}

export default function AddEditTeamModal({
  open,
  onClose,
  teamId,
}: AddEditTeamModalProps): React.JSX.Element {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    managerId: "",
    customerId: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const queryClient = useQueryClient();
  const { userInfo } = useUserInfo();
  const customerId = userInfo?.customerId;
  const isSystemAdmin = isSystemAdministrator(userInfo);

  // Get team data when editing
  const { data: teamData, isLoading: isTeamLoading } = useQuery({
    queryKey: ["team", teamId],
    queryFn: async () => {
      if (!teamId) return null;
      const response = await getTeamById(teamId);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    enabled: !!teamId && open,
  });

  // Get customers for system admin
  const { data: customersData, isLoading: isCustomersLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: getCustomers,
    enabled: isSystemAdmin && open,
  });

  // Build customers list: for system admin use all customers, for others use only current customer
  const customers = React.useMemo(() => {
    if (isSystemAdmin) {
      return customersData || [];
    } else {
      // For non-system admin, show only current customer
      if (customerId && userInfo?.customer) {
        return [{
          id: customerId,
          name: userInfo.customer.name,
        }];
      }
      return [];
    }
  }, [isSystemAdmin, customersData, customerId, userInfo?.customer]);

  // Get managers using edge function - use formData.customerId if available, otherwise fallback to user's customerId
  const managerCustomerId = formData.customerId || customerId;
  const { data: managersData, isLoading: isManagersLoading } = useQuery({
    queryKey: ["managers", managerCustomerId],
    queryFn: async () => {
      if (!managerCustomerId) {
        return [];
      }
      return edgeFunctions.getManagers(managerCustomerId);
    },
    enabled: !!managerCustomerId && open,
  });

  const managerUsers = managersData || [];

  // Populate form when team data is loaded or when opening for add
  useEffect(() => {
    if (teamId && teamData && open) {
      setFormData({
        name: teamData.team_name,
        description: teamData.description || "",
        managerId: teamData.manager_id || "",
        customerId: teamData.customer_id || "",
      });
      setErrors({});
    } else if (!teamId && open) {
      // For new team, set customerId based on user role
      const initialCustomerId = isSystemAdmin ? "" : (customerId || "");
      setFormData({ 
        name: "", 
        description: "", 
        managerId: "",
        customerId: initialCustomerId,
      });
      setErrors({});
    }
  }, [teamId, teamData, open, isSystemAdmin, customerId]);

  const createTeamMutation = useMutation({
    mutationFn: createTeam,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      onClose();
      setFormData({ name: "", description: "", managerId: "", customerId: "" });
      setErrors({});
      toast.success("Team created successfully.");
    },
    onError: (error: Error) => {
      const errorMessage = error.message;
      if (errorMessage.includes("already exists")) {
        setErrors((prev) => ({ ...prev, name: "A team with this name already exists" }));
        toast.error("A team with this name already exists");
      } else {
        toast.error(errorMessage || "An error occurred while creating the team.");
      }
    },
  });

  const updateTeamMutation = useMutation({
    mutationFn: ({ teamId, input }: { teamId: string; input: UpdateTeamInput }) => updateTeam(teamId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["team", teamId] });
      onClose();
      setFormData({ name: "", description: "", managerId: "", customerId: "" });
      setErrors({});
      toast.success("Team updated successfully.");
    },
    onError: (error: Error) => {
      const errorMessage = error.message;
      if (errorMessage.includes("already exists")) {
        setErrors((prev) => ({ ...prev, name: "A team with this name already exists" }));
        toast.error("A team with this name already exists");
      } else {
        toast.error(errorMessage || "An error occurred while updating the team.");
      }
    },
  });

  const handleInputChange = useCallback((field: keyof FormData, value: string) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      // Clear manager when customer changes (managers are customer-specific)
      if (field === "customerId" && value !== prev.customerId) {
        updated.managerId = "";
      }
      return updated;
    });
    // Clear error when user starts typing
    setErrors((prev) => {
      if (prev[field as keyof FormErrors]) {
        return { ...prev, [field]: undefined };
      }
      return prev;
    });
  }, []);

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.customerId) {
      newErrors.customerId = "Customer is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSave = useCallback(async () => {
    if (!validateForm() || !formData.customerId) {
      return;
    }

    const payload = {
      team_name: formData.name.trim(),
      description: formData.description.trim() || null,
      manager_id: formData.managerId || null,
    };

    if (teamId) {
      // Update existing team
      try {
        const updatePayload: UpdateTeamInput = {
          ...payload,
        };
        
        // Only include customer_id in update if system admin and it changed
        if (isSystemAdmin && formData.customerId) {
          updatePayload.customer_id = formData.customerId;
        }

        const response = await updateTeamMutation.mutateAsync({
          teamId,
          input: updatePayload,
        });

        if (response.error) {
          throw new Error(response.error);
        }
      } catch (error) {
        // Error is handled in mutation onError
      }
    } else {
      // Create new team
      try {
        const response = await createTeamMutation.mutateAsync({
          customer_id: formData.customerId,
          ...payload,
          is_primary: false,
        });

        if (response.error) {
          throw new Error(response.error);
        }
      } catch (error) {
        // Error is handled in mutation onError
      }
    }
  }, [formData, teamId, validateForm, updateTeamMutation, createTeamMutation, isSystemAdmin]);

  const isLoading = isTeamLoading || isManagersLoading || (isSystemAdmin && isCustomersLoading);
  const isSaving = createTeamMutation.isPending || updateTeamMutation.isPending;

  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog
        sx={{
          width: { xs: "90%", sm: 600, md: 800 },
          maxWidth: "100%",
          p: { xs: 2, sm: 3 },
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
          minHeight: { xs: "400px", sm: "450px" },
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
          {teamId ? "Edit Team" : "Add Team"}
        </Typography>
        {isLoading ? (
          <Stack sx={{ alignItems: "center", justifyContent: "center", minHeight: "300px" }}>
            <CircularProgress size="md" />
          </Stack>
        ) : (
          <Stack spacing={{ xs: 1.5, sm: 2 }} sx={{ minHeight: "300px" }}>
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
                  Name <span style={{ color: "var(--joy-palette-danger-500)" }}>*</span>
                </Typography>
                <Input
                  placeholder="Enter team name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  error={!!errors?.name}
                  slotProps={{ input: { maxLength: 255 } }}
                  sx={{
                    borderRadius: "6px",
                    fontSize: { xs: "12px", sm: "14px" },
                  }}
                />
                {errors?.name && (
                  <FormHelperText
                    sx={{
                      color: "var(--joy-palette-danger-500)",
                      fontSize: { xs: "10px", sm: "12px" },
                    }}
                  >
                    {errors.name}
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
                  Customer <span style={{ color: "var(--joy-palette-danger-500)" }}>*</span>
                </Typography>
                <Select
                  placeholder="Select customer"
                  value={formData.customerId}
                  onChange={(e, newValue) =>
                    handleInputChange("customerId", (newValue as string) || "")
                  }
                  color={errors?.customerId ? "danger" : undefined}
                  disabled={!isSystemAdmin || isCustomersLoading || !!teamId}
                  sx={{
                    borderRadius: "6px",
                    fontSize: { xs: "12px", sm: "14px" },
                  }}
                >
                  {customers.map((customer: { id: string; name: string }) => (
                    <Option key={customer.id} value={customer.id}>
                      {customer.name}
                    </Option>
                  ))}
                </Select>
                {errors?.customerId && (
                  <FormHelperText
                    sx={{
                      color: "var(--joy-palette-danger-500)",
                      fontSize: { xs: "10px", sm: "12px" },
                    }}
                  >
                    {errors.customerId}
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
                  Manager
                </Typography>
                <Select
                  placeholder="Select manager"
                  value={formData.managerId}
                  onChange={(e, newValue) =>
                    handleInputChange("managerId", (newValue as string) || "")
                  }
                  disabled={isManagersLoading || !managerCustomerId}
                  sx={{
                    borderRadius: "6px",
                    fontSize: { xs: "12px", sm: "14px" },
                  }}
                >
                  <Option value="">None</Option>
                  {managerUsers.map((manager: { id?: string; user_id?: string; name?: string; full_name?: string; email?: string }) => (
                    <Option key={manager.id || manager.user_id} value={manager.id || manager.user_id}>
                      {manager.name || manager.full_name || manager.email}
                    </Option>
                  ))}
                </Select>
              </Stack>
              <Stack sx={{ flex: 1 }}>
                {/* Empty space to align with Customer field */}
              </Stack>
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
                Description
              </Typography>
              <Textarea
                placeholder="Enter team description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                minRows={3}
                maxRows={6}
                slotProps={{ textarea: { maxLength: 1000 } }}
                sx={{
                  borderRadius: "6px",
                  fontSize: { xs: "12px", sm: "14px" },
                }}
              />
            </Stack>

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={{ xs: 1, sm: 2 }}
              justifyContent="flex-end"
              sx={{ mt: 2 }}
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
                disabled={isSaving}
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
        )}
      </ModalDialog>
    </Modal>
  );
}

