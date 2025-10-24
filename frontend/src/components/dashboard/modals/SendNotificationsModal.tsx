"use client";

import * as React from "react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Modal from "@mui/joy/Modal";
import ModalDialog from "@mui/joy/ModalDialog";
import ModalClose from "@mui/joy/ModalClose";
import Typography from "@mui/joy/Typography";
import Stack from "@mui/joy/Stack";
import Select from "@mui/joy/Select";
import Option from "@mui/joy/Option";
import Button from "@mui/joy/Button";
import FormHelperText from "@mui/joy/FormHelperText";
import IconButton from "@mui/joy/IconButton";
import Autocomplete from "@mui/joy/Autocomplete";
import { X as CloseIcon } from "@phosphor-icons/react/dist/ssr/X";
import { getCustomers } from "@/lib/api/customers";
import { getUsers } from "@/lib/api/users";
import { sendNotification } from "@/lib/api/notifications";
import { toast } from "@/components/core/toaster";
import { queryClient } from "@/lib/react-query";
import { ApiUser } from "@/contexts/auth/types";
import Box from "@mui/joy/Box";

interface HttpError {
  response?: {
    data?: {
      message?: string;
    };
  };
}

interface SendNotificationsProps {
  open: boolean;
  onClose: () => void;
  selectedNotificationId: number;
}

export default function SendNotifications({ open, onClose, selectedNotificationId }: SendNotificationsProps) {
  const [selectedCustomer, setSelectedCustomer] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<"users" | "customers">("users");
  const [error, setError] = useState<{ customer?: string; user?: string; type?: string }>({});

  const resetForm = () => {
    setSelectedCustomer([]);
    setSelectedUser([]);
    setSelectedType("users");
    setError({});
  };

  const { data: customers, isLoading: isCustomersLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: getCustomers,
  });

  const { data: usersData, isLoading: isUsersLoading } = useQuery({
    queryKey: ["users", 1],
    queryFn: () => getUsers({ page: 1, perPage: 10000, statusId: ["active"], orderBy: "name", orderDirection: "asc" }),
  });
  const users = usersData?.data || [];

  const handleSend = async (selectedNotificationId: number) => {
    let hasError = false;
    const newError: { customer?: string; user?: string; type?: string } = {};
    if (selectedType === "users" && selectedUser.length === 0) {
      newError.user = "User is required";
      hasError = true;
    }
    if (selectedType === "customers" && !selectedCustomer) {
      newError.customer = "Customer is required";
      hasError = true;
    }
    setError(newError);
    if (!hasError) {
      try {
        onClose();
        await sendNotification({
          customerId: selectedCustomer.length > 0 ? parseInt(selectedCustomer[0] ?? "0", 10) : 0,
          userIds: selectedUser.map(id => parseInt(id, 10)),
        }, selectedNotificationId);
        toast.success("Notifications have been sent successfully.");
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
        resetForm();
      } catch (error) {
        const httpError = error as HttpError;
        const errorMessage = httpError.response?.data?.message || "Failed to send notifications. Please try again.";
        toast.error(errorMessage);
      }
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedUser(selectedUser.filter(id => id !== userId));
  };

  const handleRemoveCustomer = (customerId: string) => {
    setSelectedCustomer(selectedCustomer.filter(id => id !== customerId));
  };

  return (
    <Modal open={open} onClose={handleClose}>
      <ModalDialog
        sx={{
          width: { xs: "90%", sm: 400 },
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
          Send notifications
        </Typography>
        <Stack spacing={2}>
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
              Send to
            </Typography>
            <Select
              placeholder="Select type"
              value={selectedType}
              onChange={(_, newValue) => {
                setSelectedType(newValue as "users" | "customers");
                setSelectedUser([]);
                setSelectedCustomer([]);
              }}
              sx={{
                borderRadius: "6px",
                fontSize: { xs: "12px", sm: "14px" },
              }}
            >
              <Option value="users">Users</Option>
              <Option value="customers">Customers</Option>
            </Select>
          </Stack>
          {selectedType === "users" ? (
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
                Select recipients
              </Typography>
              <Autocomplete
                multiple
                disableCloseOnSelect
                value={users.filter(user => selectedUser.includes(user.id.toString()))}
                onChange={(_, newValue) => {
                  setSelectedUser(newValue.map(user => user.id.toString()));
                }}
                options={users}
                getOptionKey={(option) => option.id.toString()}
                getOptionLabel={(option) => {
                  let displayName = '';
                  if (option.firstName && option.lastName) {
                    displayName = `${option.firstName.slice(0, 10)} ${option.lastName.slice(0, 10)}`;
                  } else if (option.email) {
                    displayName = option.email.slice(0, 10);
                  }
                  return option.customer?.name ? `${displayName} (${option.customer.name})` : displayName;
                }}
                renderOption={(props, option) => {
                  let displayName = '';
                  if (option.firstName && option.lastName) {
                    displayName = `${option.firstName.slice(0, 10)} ${option.lastName.slice(0, 10)}`;
                  } else if (option.email) {
                    displayName = option.email.slice(0, 15);
                  }
                  
                  const { key, ownerState, ...otherProps } = props as React.HTMLAttributes<HTMLLIElement> & { key?: string; ownerState?: unknown };
                  
                  return (
                    <Box
                      component="li"
                      key={option.id}
                      {...otherProps}
                      sx={{
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: 'var(--joy-palette-background-mainBg)'
                        }
                      }}
                    >
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        width: '100%',
                        alignItems: 'center',
                        padding: '5px 10px',
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: 'var(--joy-palette-background-mainBg)'
                        }
                      }}>
                        <Typography sx={{
                          color: 'var(--joy-palette-text-primary)',
                          fontSize: '14px',
                          fontWeight: 300
                        }}>{displayName}</Typography>
                        <Typography sx={{ 
                          color: 'var(--joy-palette-text-secondary)', 
                          fontSize: '12px',
                          marginLeft: '8px'
                        }}>
                          {option.customer?.name ? `(${option.customer.name})` : ''}
                        </Typography>
                      </Box>
                    </Box>
                  );
                }}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                placeholder={selectedUser.length > 0 ? `Selected users: ${selectedUser.length}` : "Select users"}
                renderTags={() => null}
                filterOptions={(options, { inputValue }) => {
                  const searchTerm = inputValue.toLowerCase();
                  return options.filter(option => 
                    (option.firstName?.toLowerCase().includes(searchTerm) || '') ||
                    (option.lastName?.toLowerCase().includes(searchTerm) || '') ||
                    (option.email?.toLowerCase().includes(searchTerm) || '')
                  );
                }}
                sx={{
                  borderRadius: "6px",
                  fontSize: { xs: "12px", sm: "14px" },
                  border: error.user ? "1px solid var(--joy-palette-danger-500)" : undefined,
                }}
                disabled={isUsersLoading}
                slotProps={{
                  listbox: {
                    sx: {
                      maxHeight: "300px",
                    },
                    placement: "top",
                  }
                }}
              />
              {error.user && (
                <FormHelperText sx={{ color: "var(--joy-palette-danger-500)", fontSize: { xs: "10px", sm: "12px" } }}>{error.user}</FormHelperText>
              )}
              {selectedUser.length > 0 && (
                <Stack
                  spacing={0.5}
                  sx={{
                    maxHeight: "100px",
                    overflowY: "auto",
                    display: "flex",
                    flexWrap: "wrap",
                    flexDirection: "row",
                    gap: 1,
                    mt: 2,
                  }}
                >
                  {selectedUser.map((userId) => {
                    const user = users.find((u) => u.id.toString() === userId);
                    return (
                      <Stack
                        key={userId}
                        direction="row"
                        alignItems="center"
                        spacing={0.5}
                        sx={{
                          fontSize: "12px",
                          color: "#4F46E5",
                          borderRadius: "5px",
                          border: "1px solid #4F46E5",
                          width: "fit-content",
                          padding: "3px 5px",
                        }}
                      >
                        <Typography level="body-sm" sx={{ fontSize: "12px", color: "#4F46E5" }}>
                          {user ? `${user.firstName?.slice(0, 10)} ${user.lastName?.slice(0, 10)}` : userId}
                        </Typography>
                        <IconButton
                          size="sm"
                          variant="plain"
                          onClick={() => handleRemoveUser(userId)}
                          sx={{
                            '--IconButton-size': '16px',
                            '&:hover': { backgroundColor: 'transparent' },
                            color: "#4F46E5",
                          }}
                        >
                          <CloseIcon />
                        </IconButton>
                      </Stack>
                    );
                  })}
                </Stack>
              )}
            </Stack>
          ) : (
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
                Select recipients
              </Typography>
              <Select
                placeholder="Select customers"
                value={selectedCustomer}
                multiple
                onChange={(_, newValue) => setSelectedCustomer(newValue as string[])}
                slotProps={{
                  listbox: {
                    sx: {
                      maxHeight: "300px",
                    },
                    placement: "top",
                  }
                }}
                sx={{
                  borderRadius: "6px",
                  fontSize: { xs: "12px", sm: "14px" },
                  border: error.customer ? "1px solid var(--joy-palette-danger-500)" : undefined,
                }}
                renderValue={(selected) => {
                  if (selected.length === 0) {
                    return (
                      <Typography sx={{ color: "var(--joy-palette-text-primary)", fontSize: "14px" }}>Select customers</Typography>
                    );
                  }
                  return <Typography sx={{ color: "var(--joy-palette-text-primary)", fontSize: "14px" }}>Selected customers: {selected.length}</Typography>;
                }}
              >
                {customers && customers.map((customer) => (
                  <Option key={customer.id} value={customer.id.toString()}>
                    {customer.name}
                  </Option>
                ))}
              </Select>
              {error.customer && (
                <FormHelperText sx={{ color: "var(--joy-palette-danger-500)", fontSize: { xs: "10px", sm: "12px" } }}>{error.customer}</FormHelperText>
              )}
              {selectedCustomer.length > 0 && (
                <Stack
                  spacing={0.5}
                  sx={{
                    maxHeight: "100px",
                    overflowY: "auto",
                    display: "flex",
                    flexWrap: "wrap",
                    flexDirection: "row",
                    gap: 1,
                    mt: 2,
                  }}
                >
                  {selectedCustomer.map((customerId) => {
                    const customer = customers?.find((c) => c.id.toString() === customerId);
                    return (
                      <Stack
                        key={customerId}
                        direction="row"
                        alignItems="center"
                        spacing={0.5}
                        sx={{
                          fontSize: "12px",
                          color: "#4F46E5",
                          borderRadius: "5px",
                          border: "1px solid #4F46E5",
                          width: "fit-content",
                          padding: "3px 5px",
                        }}
                      >
                        <Typography level="body-sm" sx={{ fontSize: "12px", color: "#4F46E5" }}>
                          {customer ? customer.name.slice(0, 10) : customerId}
                        </Typography>
                        <IconButton
                          size="sm"
                          variant="plain"
                          onClick={() => handleRemoveCustomer(customerId)}
                          sx={{
                            '--IconButton-size': '16px',
                            '&:hover': { backgroundColor: 'transparent' },
                            color: "#4F46E5",
                          }}
                        >
                          <CloseIcon />
                        </IconButton>
                      </Stack>
                    );
                  })}
                </Stack>
              )}
            </Stack>
          )}
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button
              variant="outlined"
              onClick={handleClose}
              sx={{ fontSize: { xs: "12px", sm: "14px" }, px: { xs: 2, sm: 3 }, width: { xs: "100%", sm: "auto" } }}
            >
              Cancel
            </Button>
            <Button
              variant="solid"
              onClick={() => handleSend(selectedNotificationId)}
              disabled={selectedCustomer.length === 0 && selectedUser.length === 0}
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
              Send
            </Button>
          </Stack>
        </Stack>
      </ModalDialog>
    </Modal>
  );
} 