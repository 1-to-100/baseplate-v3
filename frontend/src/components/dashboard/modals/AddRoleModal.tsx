"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import Switch from "@mui/joy/Switch";
import Tooltip from "@mui/joy/Tooltip";
import { getSystemModules } from "./../../../lib/api/system-modules";
import {
  createRole,
  addRolePermissions,
  editRole,
  getRoleById,
} from "../../../lib/api/roles";
import { Box, CircularProgress } from "@mui/joy";
import { Role } from "@/contexts/auth/types";
import { toast } from "@/components/core/toaster";

interface Permission {
  enabled: boolean;
  accessLevel: string[];
}

interface FormData {
  roleName: string;
  description: string;
  permissions: { [key: string]: Permission };
}

interface CreateRolePayload {
  name: string;
  description: string;
}

interface AddRolePermissionsPayload {
  id: number;
  permissionNames: string[];
}

interface Errors {
  roleName?: string;
  description?: string;
  permissions?: string;
}

interface ApiError {
  response?: {
    data?: {
      message: string | string[];
    };
  };
}

interface AddRoleModalProps {
  open: boolean;
  onClose: () => void;
  onRoleCreated?: () => void;
  roleId?: number;
}

export default function AddRoleModal({
  open,
  onClose,
  onRoleCreated,
  roleId,
}: AddRoleModalProps) {
  const [formData, setFormData] = useState<FormData>({
    roleName: "",
    description: "",
    permissions: {},
  });
  const [errors, setErrors] = useState<Errors>({});
  const queryClient = useQueryClient();

  const { data: systemModules, isLoading: isModulesLoading } = useQuery({
    queryKey: ["systemModules"],
    queryFn: getSystemModules,
  });

  const {
    data: roleData,
    isLoading: isRoleLoading,
    error: roleError,
  } = useQuery({
    queryKey: ["role", roleId],
    queryFn: async () => {
      if (!roleId) {
        return null; 
      }
      return getRoleById(roleId);
    },
    enabled: !!roleId && open,
  });

  useEffect(() => {
    if (open && !isModulesLoading) {
      const initialPermissions: { [key: string]: Permission } = {};
      if (systemModules) {
        systemModules.forEach((module) => {
          initialPermissions[module.name] = {
            enabled: false,
            accessLevel: [],
          };
        });
      }

      if (roleData && roleId) {
        setFormData({
          roleName: roleData.name || "",
          description: roleData.description || "",
          permissions: Object.keys(initialPermissions).reduce(
            (acc, moduleName) => {
              const modulePermissions =
                roleData.permissions?.[moduleName] || [];
              acc[moduleName] = {
                enabled: modulePermissions.length > 0,
                accessLevel: modulePermissions.map((perm: { name: string }) => perm.name),
              };
              return acc;
            },
            initialPermissions
          ),
        });
      } else {
        setFormData({
          roleName: "",
          description: "",
          permissions: initialPermissions,
        });
      }
      setErrors({});
    }
  }, [systemModules, roleData, open, isModulesLoading, roleId]);

  const handleInputChange = (field: string, value: string) => {
    if (field === "description" && value.length > 255) {
      return;
    }
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handlePermissionToggle = (permissionKey: string) => {
    setFormData((prev) => {
      const currentPermission = prev.permissions[permissionKey] || {
        enabled: false,
        accessLevel: [],
      };
      return {
        ...prev,
        permissions: {
          ...prev.permissions,
          [permissionKey]: {
            ...currentPermission,
            enabled: !currentPermission.enabled,
            accessLevel: !currentPermission.enabled
              ? currentPermission.accessLevel
              : [],
          },
        },
      };
    });
    setErrors((prev) => ({ ...prev, permissions: undefined }));
  };

  const handleAccessLevelChange = (permissionKey: string, value: string[]) => {
    setFormData((prev) => {
      const currentPermission = prev.permissions[permissionKey] || {
        enabled: false,
        accessLevel: [],
      };
      return {
        ...prev,
        permissions: {
          ...prev.permissions,
          [permissionKey]: {
            ...currentPermission,
            enabled: value.length > 0,
            accessLevel: value,
          },
        },
      };
    });
    setErrors((prev) => ({ ...prev, permissions: undefined }));
  };

  const validateForm = () => {
    const newErrors: Errors = {};
    if (!formData.roleName.trim()) {
      newErrors.roleName = "Role name is required";
    } else if (formData.roleName.length > 96) {
      newErrors.roleName = "Role name must be shorter than or equal to 96 characters";
    }
    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    } else if (formData.description.length > 255) {
      newErrors.description = "Description cannot exceed 255 characters";
    }

    let hasValidPermissions = false;
    for (const [moduleName, permission] of Object.entries(
      formData.permissions
    )) {
      if (permission.enabled) {
        if (permission.accessLevel.length === 0) {
          newErrors.permissions =
            "Modules with enabled permissions must have at least one permission selected";
          break;
        } else {
          hasValidPermissions = true;
        }
      }
    }
    if (!hasValidPermissions && !newErrors.permissions) {
      newErrors.permissions =
        "At least one module must have permissions enabled and selected";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const rolePayload: CreateRolePayload = {
        name: formData.roleName,
        description: formData.description,
      };

      let role: Role;
      if (roleData && roleId) {
        role = await editRole(roleId, rolePayload);
        onClose();
        toast.success("Role has been successfully updated");
      } else {
        role = await createRole(rolePayload);
        onClose();
        toast.success("Role has been successfully created");
      }

      const permissionNames: string[] = [];
      Object.entries(formData.permissions).forEach(
        ([moduleName, permission]) => {
          if (permission.enabled && permission.accessLevel.length > 0) {
            permission.accessLevel.forEach((perm) => {
              const prefix = `${moduleName}:`;
              const cleanPerm = perm.startsWith(prefix)
                ? perm.slice(prefix.length)
                : perm;
              permissionNames.push(`${moduleName}:${cleanPerm}`);
            });
          }
        }
      );

      if (permissionNames.length > 0) {
        const permissionsPayload: AddRolePermissionsPayload = {
          id: roleData ? roleData.id : role.id,
          permissionNames,
        };
        await addRolePermissions(permissionsPayload);
      }

      
      if (roleId) {
        await queryClient.invalidateQueries({
          queryKey: ["role", roleId],
        });
        toast.success("Role has been successfully updated");
      }
      
      await queryClient.invalidateQueries({
        queryKey: ["roles"],
      });

      if (onRoleCreated) {
        onRoleCreated();
      }
    } catch (error) {
      console.error(
        "Error creating or editing role or adding permissions:",
        error
      );
      
      const apiError = error as ApiError;
      if (apiError.response?.data?.message) {
        const errorMessage = Array.isArray(apiError.response.data.message) 
          ? apiError.response.data.message[0] 
          : apiError.response.data.message;
        
        if (errorMessage && errorMessage.includes("name")) {
          setErrors({
            ...errors,
            roleName: errorMessage
          });
        } else {
          setErrors({
            ...errors,
            permissions: errorMessage || "Failed to save role. Please try again."
          });
        }
      } else {
        setErrors({
          ...errors,
          permissions: "Failed to save role. Please try again."
        });
      }
    }
  };

  if (roleError) {
    return (
      <Modal open={open} onClose={onClose}>
        <ModalDialog
          sx={{
            width: 500,
            p: 3,
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
          }}
        >
          <Typography color="danger">Error: {roleError.message}</Typography>
        </ModalDialog>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog
        sx={{
          width: 500,
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
          {roleData ? "Edit Role" : "Add Role"}
        </Typography>
        {isModulesLoading || isRoleLoading ? (
          <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "45vh",
          }}
        >
          <CircularProgress />
        </Box>
        ) : (
          <Stack spacing={2}>
            <Stack>
              <Typography
                level="body-sm"
                sx={{
                  fontSize: "14px",
                  color: "var(--joy-palette-text-primary)",
                  mb: 0.5,
                  fontWeight: 500,
                }}
              >
                Role name
              </Typography>
              <Input
                placeholder="Enter role name"
                value={formData.roleName}
                onChange={(e) => handleInputChange("roleName", e.target.value)}
                error={!!errors.roleName}
                sx={{
                  borderRadius: "6px",
                  fontSize: "14px",
                  borderColor: errors.roleName ? "red" : undefined,
                  "&:focus-within": {
                    borderColor: errors.roleName ? "red" : undefined,
                  },
                }}
              />
              {errors.roleName && (
                <Typography
                  level="body-sm"
                  sx={{ fontSize: "12px", color: "red", mt: 0.5 }}
                >
                  {errors.roleName}
                </Typography>
              )}
            </Stack>

            <Stack>
              <Typography
                level="body-sm"
                sx={{
                  fontSize: "14px",
                  color: "var(--joy-palette-text-primary)",
                  mb: 0.5,
                  fontWeight: 500,
                }}
              >
                About
              </Typography>
              <Textarea
                placeholder="Describe this role's permissions and responsibilities"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                minRows={3}
                error={!!errors.description}
                sx={{
                  borderRadius: "6px",
                  fontSize: "14px",
                  borderColor: errors.description ? "red" : undefined,
                  "&:focus-within": {
                    borderColor: errors.description ? "red" : undefined,
                  },
                }}
              />
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                {errors.description && (
                  <Typography
                    level="body-sm"
                    sx={{ fontSize: "12px", color: "red" }}
                  >
                    {errors.description}
                  </Typography>
                )}
                <Typography
                  level="body-sm"
                  sx={{
                    fontSize: "12px",
                    color: formData.description.length > 255 ? "red" : "var(--joy-palette-text-secondary)",
                    ml: "auto"
                  }}
                >
                  {formData.description.length}/255 characters
                </Typography>
              </Stack>
            </Stack>

            <Stack spacing={1}>
              <Typography
                level="body-sm"
                sx={{
                  fontSize: "14px",
                  color: "var(--joy-palette-text-secondary)",
                  mb: 0.5,
                  fontWeight: 500,
                }}
              >
                Permission
              </Typography>
              {errors.permissions && (
                <Typography
                  level="body-sm"
                  sx={{ fontSize: "12px", color: "red", mb: 1 }}
                >
                  {errors.permissions}
                </Typography>
              )}
              {systemModules?.map((module) => {
                const selectedPermissions =
                  formData.permissions[module.name]?.accessLevel || [];
                return (
                  <Stack key={module.name} spacing={1}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Tooltip
                        title="Enable or disable this permission group for the role"
                        placement="top"
                        sx={{
                          background: "#DAD8FD",
                          color: "#3D37DD",
                        }}
                      >
                        <Box sx={{ background: "transparent", display: "flex" }}>
                          <Switch
                            checked={
                              formData.permissions[module.name]?.enabled ||
                              false
                            }
                            onChange={() => handlePermissionToggle(module.name)}
                          />
                        </Box>
                      </Tooltip>
                      <Typography
                        level="body-sm"
                        sx={{ fontSize: "14px", color: "#6B7280", flex: 1 }}
                      >
                        {module.label}
                      </Typography>
                      <Select
                        multiple
                        value={selectedPermissions}
                        onChange={(e, newValue) =>
                          handleAccessLevelChange(
                            module.name,
                            newValue as string[]
                          )
                        }
                        placeholder="Select permissions"
                        disabled={!formData.permissions[module.name]?.enabled}
                        renderValue={(selected) => {
                          if (selected.length === 0) {
                            return (
                              <Typography
                                sx={{
                                  color: "var(--joy-palette-text-primary)",
                                  fontSize: "14px",
                                }}
                              >
                                Select permissions
                              </Typography>
                            );
                          }
                          return (
                            <Typography
                              sx={{
                                color: "var(--joy-palette-text-primary)",
                                fontSize: "14px",
                              }}
                            >
                              Selected permissions: {selected.length}
                            </Typography>
                          );
                        }}
                        sx={{
                          borderRadius: "6px",
                          fontSize: "14px",
                          minWidth: "120px",
                          "& .MuiSelect-placeholder": {
                            fontSize: "14px",
                            color: "var(--joy-palette-text-primary)",
                          },
                        }}
                        slotProps={{
                          listbox: {
                            sx: {
                              fontSize: "13px",
                              "& .MuiOption-root.Mui-selected": {
                                fontSize: "12px",
                                color: "var(--joy-palette-text-primary)",
                                "&:after": {
                                  content: '"✓"',
                                  marginRight: "8px",
                                  color: "#4F46E5",
                                },
                              },
                            },
                          },
                        }}
                      >
                        {module.permissions
                          .sort((a, b) => a.order - b.order)
                          .map((permission) => (
                            <Option
                              key={permission.name}
                              value={permission.name}
                            >
                              {permission.label}
                            </Option>
                          ))}
                      </Select>
                    </Stack>
                    {selectedPermissions.length > 0 && (
                      <Stack
                        spacing={0.5}
                        sx={{
                          maxHeight: "100px",
                          overflowY: "auto",
                          display: "flex",
                          flexWrap: "wrap",
                          flexDirection: "row",
                          gap: 1,
                        }}
                      >
                        {selectedPermissions.map((permName) => {
                          const permission = module.permissions.find(
                            (p) => p.name === permName
                          );
                          return (
                            <Typography
                              key={permName}
                              level="body-sm"
                              sx={{
                                fontSize: "12px",
                                color: "#4F46E5",
                                borderRadius: "5px",
                                border: "1px solid #4F46E5",
                                width: "fit-content",
                                padding: "3px 5px",
                              }}
                            >
                              {permission?.label || permName}
                            </Typography>
                          );
                        })}
                      </Stack>
                    )}
                  </Stack>
                );
              })}
            </Stack>

            <Stack direction="row" spacing={2} justifyContent="flex-end" mt={2}>
              <Button variant="outlined" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="solid"
                onClick={handleSave}
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
                {roleData ? "Save Changes" : "Create Role"}
              </Button>
            </Stack>
          </Stack>
        )}
      </ModalDialog>
    </Modal>
  );
}