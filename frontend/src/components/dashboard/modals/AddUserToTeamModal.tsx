"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Modal from "@mui/joy/Modal";
import ModalDialog from "@mui/joy/ModalDialog";
import ModalClose from "@mui/joy/ModalClose";
import Typography from "@mui/joy/Typography";
import Stack from "@mui/joy/Stack";
import Button from "@mui/joy/Button";
import Select from "@mui/joy/Select";
import Option from "@mui/joy/Option";
import Chip from "@mui/joy/Chip";
import Box from "@mui/joy/Box";
import { Tabs, TabList, Tab } from "@mui/joy";
import { getAvailableUsersForTeam, addTeamMember } from "@/lib/api/teams";
import { toast } from "@/components/core/toaster";
import type { ApiUser } from "@/contexts/auth/types";

interface AddUserToTeamModalProps {
  open: boolean;
  onClose: () => void;
  teamId: string;
  customerId: string;
}

export default function AddUserToTeamModal({
  open,
  onClose,
  teamId,
  customerId,
}: AddUserToTeamModalProps): React.JSX.Element {
  const [selectedTab, setSelectedTab] = useState<"select" | "create">("select");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const queryClient = useQueryClient();

  // Fetch available users
  const { data: availableUsersData, isLoading: isUsersLoading } = useQuery({
    queryKey: ["available-users", customerId, teamId],
    queryFn: async () => {
      const response = await getAvailableUsersForTeam(customerId, teamId);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data || [];
    },
    enabled: !!customerId && open,
  });

  const availableUsers = availableUsersData || [];

  // Mutation for adding team members
  const addTeamMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await addTeamMember({
        team_id: teamId,
        user_id: userId,
      });
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members", teamId] });
      queryClient.invalidateQueries({ queryKey: ["team", teamId] });
      queryClient.invalidateQueries({ queryKey: ["available-users", customerId, teamId] });
    },
  });

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setSelectedTab("select");
      setSelectedUsers([]);
    }
  }, [open]);

  const handleSave = useCallback(async () => {
    if (selectedTab === "select" && selectedUsers.length === 0) {
      toast.error("Please select at least one user");
      return;
    }

    if (selectedTab === "select") {
      // Add all selected users to the team
      try {
        const promises = selectedUsers.map((userId) =>
          addTeamMemberMutation.mutateAsync(userId)
        );
        await Promise.all(promises);
        // Invalidate available users query to refresh the list
        queryClient.invalidateQueries({ queryKey: ["available-users", customerId, teamId] });
        toast.success(
          `Successfully added ${selectedUsers.length} user${selectedUsers.length > 1 ? "s" : ""} to the team`
        );
        onClose();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to add users to the team"
        );
      }
    } else {
      // Create new one tab - placeholder for now
      toast.info("Create new user functionality coming soon");
    }
  }, [selectedTab, selectedUsers, addTeamMemberMutation, queryClient, customerId, teamId, onClose]);

  const isSaving = addTeamMemberMutation.isPending;

  const handleTabChange = useCallback((event: React.SyntheticEvent, newValue: string | null) => {
    setSelectedTab((newValue as "select" | "create") || "select");
  }, []);

  const handleUsersChange = useCallback((event: React.SyntheticEvent | null, newValue: string | string[] | null) => {
    setSelectedUsers(newValue as string[]);
  }, []);

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
          Add User
        </Typography>

        <Tabs
          value={selectedTab}
          variant="custom"
          onChange={(event, newValue) => handleTabChange(event as React.SyntheticEvent, newValue as string | null)}
          sx={{ mt: 2, mb: 2 }}
        >
          <TabList
            sx={{
              display: "flex",
              gap: 1,
              p: 0,
              "& .MuiTab-root": {
                borderRadius: "20px",
                minWidth: "40px",
                p: 1,
                color: "var(--joy-palette-text-secondary)",
                "&[aria-selected='true']": {
                  border: "1px solid var(--joy-palette-divider)",
                  color: "var(--joy-palette-text-primary)",
                },
              },
            }}
          >
            <Tab value="select">Select user</Tab>
            <Tab value="create">Create new one</Tab>
          </TabList>
        </Tabs>

        <Stack spacing={{ xs: 1.5, sm: 2 }}>
          {selectedTab === "select" ? (
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
                Users
              </Typography>
              <Select
                multiple
                placeholder="Select users"
                value={selectedUsers}
                onChange={handleUsersChange}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {selected.map((item) => {
                      const user = availableUsers.find((u) => u.id.toString() === item.value);
                      return (
                        <Chip key={item.value} size="sm">
                          {user?.name || user?.email || item.value}
                        </Chip>
                      );
                    })}
                  </Box>
                )}
                sx={{
                  borderRadius: "6px",
                  fontSize: { xs: "12px", sm: "14px" },
                }}
                disabled={isUsersLoading}
                slotProps={{
                  listbox: {
                    placement: 'top',
                  },
                }}
              >
                {availableUsers
                  .sort((a, b) => (a.name || a.email || '').localeCompare(b.name || b.email || ''))
                  .map((user) => (
                    <Option key={user.id} value={user.id.toString()}>
                      {user.name || user.email}
                    </Option>
                  ))}
              </Select>
            </Stack>
          ) : (
            <Stack>
              <Typography
                level="body-md"
                sx={{
                  color: "var(--joy-palette-text-secondary)",
                  textAlign: "center",
                  py: 4,
                }}
              >
                Create new user functionality coming soon
              </Typography>
            </Stack>
          )}

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
              disabled={isSaving || (selectedTab === "select" && selectedUsers.length === 0)}
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
              {selectedTab === "select" ? "Save to list" : "Save"}
            </Button>
          </Stack>
        </Stack>
      </ModalDialog>
    </Modal>
  );
}

