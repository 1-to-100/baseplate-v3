"use client";

import * as React from "react";
import Box from "@mui/joy/Box";
import Typography from "@mui/joy/Typography";
import Button from "@mui/joy/Button";
import IconButton from "@mui/joy/IconButton";
import Tabs from "@mui/joy/Tabs";
import TabList from "@mui/joy/TabList";
import Tab from "@mui/joy/Tab";
import Card from "@mui/joy/Card";
import Table from "@mui/joy/Table";
import { Plus, Plus as PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { paths } from "@/paths";
import {
  Avatar,
  Breadcrumbs,
  Checkbox,
  CircularProgress,
  ColorPaletteProp,
  Stack,
  VariantProp,
} from "@mui/joy";
import { BreadcrumbsItem } from "@/components/core/breadcrumbs-item";
import { BreadcrumbsSeparator } from "@/components/core/breadcrumbs-separator";
import SearchInput from "@/components/dashboard/layout/search-input";
import { GridFour as GridFour } from "@phosphor-icons/react/dist/ssr/GridFour";
import { Table as TableIcon } from "@phosphor-icons/react/dist/ssr/Table";
import { CaretUp as CaretUp } from "@phosphor-icons/react/dist/ssr/CaretUp";
import { CaretDown as CaretDown } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { CheckCircle as CheckCircle } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { Popper } from "@mui/base/Popper";
import { DotsThreeVertical } from "@phosphor-icons/react/dist/ssr/DotsThreeVertical";
import { Password } from "@phosphor-icons/react/dist/ssr/Password";
import { PencilSimple as PencilIcon } from "@phosphor-icons/react/dist/ssr/PencilSimple";
import { Eye as EyeIcon } from "@phosphor-icons/react/dist/ssr/Eye";
import { Trash as TrashIcon } from "@phosphor-icons/react/dist/ssr/Trash";
import { User as UserIcon } from "@phosphor-icons/react/dist/ssr/User";
import { Copy as CopyIcon } from "@phosphor-icons/react/dist/ssr/Copy";
import { X as X } from "@phosphor-icons/react/dist/ssr/X";
import { useCallback, useState, useEffect } from "react";
import UserDetailsPopover from "@/components/dashboard/user-management/user-details-popover";
import AddEditUserModal from "@/components/dashboard/modals/AddEditUserModal";
import DeleteDeactivateUserModal from "@/components/dashboard/modals/DeleteItemModal";
import Pagination from "@/components/dashboard/layout/pagination";
import InviteUser from "@/components/dashboard/modals/InviteUserModal";
import ResetPasswordUser from "@/components/dashboard/modals/ResetPasswordUserModal";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getUsers, getUserById } from "../../../../lib/api/users";
import { getRoles, ModulePermission } from "../../../../lib/api/roles";
import { getCustomers } from "../../../../lib/api/customers";
import { useGlobalSearch } from "@/hooks/use-global-search";
import { getRoleById } from "../../../../lib/api/roles";
import Tooltip from "@mui/joy/Tooltip";
import { ApiUser } from "@/contexts/auth/types";
import AddRoleModal from "@/components/dashboard/modals/AddRoleModal";

const RouterLink = Link;

interface Permission {
  id: string;
  name: string;
  label: string;
  description?: string;
}

interface Module {
  id: string;
  name: string;
  permissions: Permission[];
}

const SystemAdminSettings: React.FC = () => {
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
  const [expandedPermissions, setExpandedPermissions] = useState<string[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [addUserAnchorEl, setAddUserAnchorEl] = useState<null | HTMLElement>(
    null
  );
  const [menuRowIndex, setMenuRowIndex] = useState<number | null>(null);
  const [popoverAnchorEl, setPopoverAnchorEl] = useState<null | HTMLElement>(
    null
  );
  const [selectedUser, setSelectedUser] = useState<ApiUser | null>(null);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [rowsToDelete, setRowsToDelete] = useState<string[]>([]);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openAddUserModal, setOpenAddUserModal] = useState(false);
  const [openEditRoleModal, setOpenEditRoleModal] = useState(false);
  const [openResetPasswordModal, setOpenResetPasswordModal] = useState(false);
  const [userToResetPassword, setUserToResetPassword] =
    useState<ApiUser | null>(null);
  const [userToEditId, setUserToEditId] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<keyof ApiUser | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);

  const queryClient = useQueryClient();
  const { debouncedSearchValue } = useGlobalSearch();
  const params = useParams();
  const roleId = params.roleId as string;

  const rowsPerPage = 10;

  const {
    data: roleData,
    isLoading: isRoleLoading,
    error: roleError,
  } = useQuery({
    queryKey: ["role", roleId],
    queryFn: () => {
      if (!roleId) {
        throw new Error("Role ID is missing");
      }
      return getRoleById(roleId);
    },
    enabled: !!roleId,
  });

  const { data: roles, isLoading: isRolesLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: getRoles,
  });

  const { data: customers, isLoading: isCustomersLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: getCustomers,
  });

  const transformUser = (apiUser: ApiUser): ApiUser => {
    const customer = customers?.find((c) => c.id === apiUser.customerId);
    const role = roles?.find((r) => r.id === apiUser.roleId);
    return {
      managerId: apiUser.managerId,
      id: apiUser.id,
      firstName: apiUser.firstName,
      lastName: apiUser.lastName,
      name: `${apiUser.firstName} ${apiUser.lastName}`.trim(),
      email: apiUser.email,
      customerId: apiUser.customerId,
      customer: customer || apiUser.customer,
      roleId: apiUser.roleId,
      role: role || apiUser.role,
      persona: apiUser.persona || "",
      status: apiUser.status,
      avatar: apiUser.avatar || undefined,
      activity: apiUser.activity,
      createdAt: apiUser.createdAt,
    };
  };

  const { data, isLoading, error } = useQuery({
    queryKey: [
      "users",
      currentPage,
      debouncedSearchValue,
      sortColumn,
      sortDirection,
      roleId,
      customers,
    ],
    queryFn: async () => {
      const response = await getUsers({
        page: currentPage,
        perPage: rowsPerPage,
        search: debouncedSearchValue || undefined,
        orderBy: sortColumn || undefined,
        orderDirection: sortDirection,
        roleId: roleId ? [roleId] : undefined,
      });
      return {
        ...response,
        data: response.data.map(transformUser),
      };
    },
    enabled: !isRolesLoading && !isCustomersLoading,
  });

  const users = data?.data || [];
  const totalPages = data?.meta?.lastPage || 1;
  const hasResults = users.length > 0;

  const permissionsByModule: Module[] = roleData?.permissions
    ? Object.keys(roleData.permissions).map((moduleName) => ({
        id: moduleName,
        name: moduleName,
        permissions: (roleData.permissions[moduleName] || []).map(
          (perm: ModulePermission) => ({
            id: perm.id.toString(),
            name: perm.name,
            label: perm.label,
            description: perm.label,
          })
        ),
      }))
    : [];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (anchorEl && !anchorEl.contains(event.target as Node)) {
        handleMenuClose();
      }
      if (addUserAnchorEl && !addUserAnchorEl.contains(event.target as Node)) {
        handleAddUserMenuClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [anchorEl, addUserAnchorEl]);


  const togglePermission = (id: string) => {
    setExpandedPermissions((prev) =>
      prev.includes(id) ? prev.filter((permId) => permId !== id) : [...prev, id]
    );
  };

  const handleMenuOpen = (
    event: React.MouseEvent<HTMLElement>,
    index: number
  ) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setMenuRowIndex(index);
  };

  const handleAddUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAddUserAnchorEl(event.currentTarget);
  };

  const handleAddUserMenuClose = () => {
    setAddUserAnchorEl(null);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuRowIndex(null);
  };

  const handleOpenDetail = async (
    event: React.MouseEvent<HTMLElement>,
    userId: string
  ) => {
    event.preventDefault();
    event.persist();
    const targetElement = event.currentTarget;
    try {
      const userData = await getUserById(userId);
      const transformedUser = transformUser(userData);
      setSelectedUser(transformedUser);
      setPopoverAnchorEl(targetElement);
    } catch (err) {
      console.error("Error fetching user details:", err);
    }
    handleMenuClose();
  };

  const handleClosePopover = () => {
    setSelectedUser(null);
    setPopoverAnchorEl(null);
  };

  const handleEdit = (userId: string) => {
    setUserToEditId(userId);
    setOpenEditModal(true);
    handleMenuClose();
  };

  const handleAddUser = () => {
    setOpenAddUserModal(true);
    handleAddUserMenuClose();
  };

  const handleEditRole = () => {
    setOpenEditRoleModal(true);
  };

  const handleResetPassword = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (user) {
      setUserToResetPassword(user);
      setOpenResetPasswordModal(true);
    }
    handleMenuClose();
  };

  const handleDeleteRow = useCallback((userId: string) => {
    setRowsToDelete([userId]);
    setOpenDeleteModal(true);
  }, []);

  const handleDelete = () => {
    if (selectedRows.length > 0) {
      setRowsToDelete(selectedRows);
      setOpenDeleteModal(true);
    }
  };

  const confirmDelete = () => {
    setOpenDeleteModal(false);
    setRowsToDelete([]);
    setSelectedRows([]);
  };

  const handleCloseEditModal = () => {
    setOpenEditModal(false);
    setUserToEditId(null);
  };

  const handleCloseAddUserModal = () => {
    setOpenAddUserModal(false);
  };

  const handleCloseEditRoleModal = () => {
    setOpenEditRoleModal(false);
  };

  const handleRoleEdited = async () => {
    if (roleId) {
      await queryClient.invalidateQueries({
        queryKey: ["role", roleId],
      });
    }
  };

  const handleRowCheckboxChange = (userId: string) => {
    setSelectedRows((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAllChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!hasResults) return;
    if (event.target.checked) {
      setSelectedRows(users.map((user) => user.id));
    } else {
      setSelectedRows([]);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setSelectedRows([]);
  };

  const handleSort = (column: keyof ApiUser) => {
    const isAsc = sortColumn === column && sortDirection === "asc";
    const newDirection = isAsc ? "desc" : "asc";
    setSortColumn(column);
    setSortDirection(newDirection);
  };

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email).then(() => {
      setCopiedEmail(email);
      setTimeout(() => setCopiedEmail(null), 2000);
    });
  };

  const usersToDelete = rowsToDelete
    .map((userId) => {
      const user = users.find((u) => u.id === userId);
      return user ? user.name : undefined;
    })
    .filter((name): name is string => name !== undefined);

  const menuItemStyle = {
    padding: "8px 16px",
    fontSize: "16px",
    fontWeight: "400",
    display: "flex",
    alignItems: "center",
    cursor: "pointer",
    color: "var(--joy-palette-text-primary)",
    "&:hover": { backgroundColor: "var(--joy-palette-background-mainBg)" },
  };

  const iconStyle = {
    marginRight: "14px",
  };

  const avatarColors: ColorPaletteProp[] = [
    "primary",
    "neutral",
    "danger",
    "warning",
    "success",
  ];

  const getAvatarProps = (name: string) => {
    const hash = Array.from(name).reduce(
      (acc: number, char: string) => acc + char.charCodeAt(0),
      0
    );
    const colorIndex = hash % avatarColors.length;
    return {
      color: avatarColors[colorIndex],
      variant: "soft" as VariantProp,
    };
  };

  if (roleError || error) {
    return <Typography>Error: {(roleError || error)?.message}</Typography>;
  }

  return (
    <Box sx={{ p: { xs: 2, sm: "var(--Content-padding)" } }}>
      <Stack spacing={{ xs: 2, sm: 3 }} sx={{ mt: { xs: 6, sm: 0 } }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={{ xs: 2, sm: 3 }}
          sx={{ alignItems: { xs: "stretch", sm: "flex-start" } }}
        >
          <Stack spacing={1} sx={{ flex: "1 1 auto" }}>
            <Typography
              fontSize={{ xs: "xl2", sm: "xl3" }}
              level="h1"
              sx={{ wordBreak: "break-word" }}
            >
              {roleData?.display_name}
            </Typography>
          </Stack>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={{ xs: 1, sm: 2 }}
            sx={{
              alignItems: { xs: "stretch", sm: "center" },
              width: { xs: "100%", sm: "auto" },
              position: "relative",
            }}
          >
            <Button
              sx={{
                width: { xs: "100%", sm: "auto" },
                py: { xs: 1, sm: 0.75 },
              }}
              variant="outlined"
              color="primary"
              onClick={handleEditRole}
              startDecorator={<PencilIcon fontSize="var(--Icon-fontSize)" />}
            >
              Edit
            </Button>
            <Button
              variant="solid"
              color="primary"
              onClick={handleAddUser}
              startDecorator={<PlusIcon fontSize="var(--Icon-fontSize)" />}
              sx={{
                width: { xs: "100%", sm: "auto" },
                py: { xs: 1, sm: 0.75 },
              }}
            >
              Add user
            </Button>
          </Stack>
        </Stack>
      </Stack>

      <Stack sx={{ mt: 4 }}>
        <Breadcrumbs separator={<BreadcrumbsSeparator />}>
          <BreadcrumbsItem
            href={paths.dashboard.roleSettings.list}
            type="start"
          />
          <BreadcrumbsItem href={paths.dashboard.roleSettings.list}>
            Role Settings
          </BreadcrumbsItem>
          <BreadcrumbsItem type="end">{roleData?.display_name}</BreadcrumbsItem>
        </Breadcrumbs>
      </Stack>

      <Box
        sx={{
          display: { xs: "block", sm: "flex" },
          gap: 3,
          borderTop: "1px solid var(--joy-palette-divider)",
          mt: 3,
          mb: 6,
        }}
      >
        <Box
          sx={{
            flex: 2,
            borderRight: {
              xs: "none",
              sm: "1px solid var(--joy-palette-divider)",
            },
            pr: 3,
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
              mt: 2,
            }}
          >
            <Typography
              level="title-md"
              sx={{ fontWeight: "500", fontSize: "18px" }}
            >
              Users who have access
            </Typography>
            <Stack sx={{ alignItems: "center", ml: "auto", mr: 2 }}>
              {selectedRows.length > 0 ? (
                <Box
                  sx={{
                    borderRight: "1px solid #E5E7EB",
                    display: "flex",
                    alignItems: "center",
                    paddingRight: "16px",
                    gap: "12px",
                  }}
                >
                  <Typography level="body-sm">
                    {selectedRows.length} row
                    {selectedRows.length > 1 ? "s" : ""} selected
                  </Typography>
                  <IconButton
                    onClick={handleDelete}
                    sx={{
                      bgcolor: "#FEE2E2",
                      color: "#EF4444",
                      borderRadius: "50%",
                      width: 32,
                      height: 32,
                      "&:hover": { bgcolor: "#FECACA" },
                    }}
                  >
                    <TrashIcon fontSize="var(--Icon-fontSize)" />
                  </IconButton>
                </Box>
              ) : null}
            </Stack>
            <Tabs
              value={viewMode}
              onChange={(event, newValue) =>
                setViewMode(newValue as "list" | "grid")
              }
              variant="custom"
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
                      color: "var(--joy-palette-background-primaryColor)",
                      "& svg": { fill: "url(#tab-gradient)" },
                    },
                  },
                }}
              >
                <svg width="0" height="0">
                  <defs>
                    <linearGradient
                      id="tab-gradient"
                      gradientTransform="rotate(120)"
                    >
                      <stop offset="0%" stopColor="#282490" />
                      <stop offset="100%" stopColor="#3F4DCF" />
                    </linearGradient>
                  </defs>
                </svg>
                <Tab value="grid">
                  <GridFour size={20} weight="bold" />
                </Tab>
                <Tab value="list">
                  <TableIcon size={20} weight="bold" />
                </Tab>
              </TabList>
            </Tabs>
          </Box>

          {isLoading ||
          isRoleLoading ||
          isRolesLoading ||
          isCustomersLoading ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "50vh",
              }}
            >
              <CircularProgress />
            </Box>
          ) : (
            <Box>
              {users.length === 0 ? (
                <Box sx={{ textAlign: "center", mt: "150px" }}>
                  <Typography
                    sx={{
                      fontSize: "24px",
                      fontWeight: "600",
                      color: "var(--joy-palette-text-primary)",
                    }}
                  >
                    You do not have any users
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "14px",
                      fontWeight: "300",
                      color: "var(--joy-palette-text-secondary)",
                      mt: 1,
                    }}
                  >
                    Add users and assigne them permissions avialable for this
                    role.
                  </Typography>
                  <Button
                    onClick={handleAddUser}
                    variant="outlined"
                    startDecorator={<Plus size={20} weight="bold" />}
                    sx={{ mt: 2, color: "var(--joy-palette-text-secondary)" }}
                  >
                    Add user
                  </Button>
                  <AddEditUserModal
                    open={openAddUserModal}
                    onClose={handleCloseAddUserModal}
                  />
                </Box>
              ) : viewMode === "list" ? (
                <Box
                  sx={{
                    overflowX: "auto",
                    width: "100%",
                    WebkitOverflowScrolling: "touch",
                    scrollbarWidth: { xs: "thin", sm: "auto" },
                    "&::-webkit-scrollbar": {
                      height: { xs: "8px", sm: "12px" },
                    },
                    "&::-webkit-scrollbar-thumb": {
                      backgroundColor: "var(--joy-palette-divider)",
                      borderRadius: "4px",
                    },
                  }}
                >
                  <Table
                    aria-label="system admin users table"
                    sx={{
                      minWidth: "400px",
                      tableLayout: "fixed",
                      "& th, & td": {
                        px: { xs: 1, sm: 2 },
                        py: { xs: 1, sm: 1.5 },
                      },
                    }}
                  >
                    <thead>
                      <tr>
                        <th style={{ width: "5%" }}>
                          <Checkbox
                            checked={
                              hasResults && selectedRows.length === users.length
                            }
                            indeterminate={
                              hasResults &&
                              selectedRows.length > 0 &&
                              selectedRows.length < users.length
                            }
                            onChange={handleSelectAllChange}
                            disabled={!hasResults}
                          />
                        </th>
                        <th style={{ width: "60px" }}></th>
                        <th onClick={() => handleSort("name")}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              "& .sort-icon": {
                                opacity: 0,
                                transition: "opacity 0.2s ease-in-out",
                              },
                              "&:hover .sort-icon": { opacity: 1 },
                            }}
                          >
                            Name
                          </Box>
                        </th>
                        <th onClick={() => handleSort("email")}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              "& .sort-icon": {
                                opacity: 0,
                                transition: "opacity 0.2s ease-in-out",
                              },
                              "&:hover .sort-icon": { opacity: 1 },
                            }}
                          >
                            Email
                          </Box>
                        </th>
                        <th style={{ width: "60px" }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user, index) => (
                        <tr
                          key={user.id}
                          onMouseEnter={() => setHoveredRow(index)}
                          onMouseLeave={() => setHoveredRow(null)}
                        >
                          <td>
                            <Checkbox
                              checked={selectedRows.includes(user.id)}
                              onChange={() => handleRowCheckboxChange(user.id)}
                            />
                          </td>
                          <td>
                            {user.avatar ? (
                              <Avatar
                                src={user.avatar}
                                sx={{ width: 28, height: 28 }}
                              />
                            ) : (
                              <Avatar
                                sx={{
                                  width: 28,
                                  height: 28,
                                  fontWeight: "bold",
                                  fontSize: "13px",
                                }}
                                {...getAvatarProps(user.name)}
                              >
                                {user.name
                                  .split(" ")
                                  .slice(0, 2)
                                  .map((n) => n[0]?.toUpperCase() || "")
                                  .join("")}
                              </Avatar>
                            )}
                          </td>
                          <td>
                            <Stack
                              direction="row"
                              spacing={1}
                              sx={{ alignItems: "center" }}
                            >
                              <Typography sx={{ wordBreak: "break-all" }}>
                                {user.name.slice(0, 85)}
                              </Typography>
                              <Tooltip
                                title={user.status}
                                placement="top"
                                sx={{
                                  background: "#DAD8FD",
                                  color: "#3D37DD",
                                  textTransform: "capitalize",
                                }}
                              >
                                <Box
                                  sx={{
                                    bgcolor:
                                      user.status === "active"
                                        ? "#1A7D36"
                                        : user.status === "inactive"
                                        ? "#D3232F"
                                        : "#FAE17D",
                                    borderRadius: "50%",
                                    width: "10px",
                                    minWidth: "10px",
                                    height: "10px",
                                    display: "inline-block",
                                  }}
                                />
                              </Tooltip>
                            </Stack>
                          </td>
                          <td>
                            <Box
                              sx={{
                                position: "relative",
                                display: "inline-block",
                                fontWeight: 400,
                                color: "var(--joy-palette-text-secondary)",
                                wordBreak: "break-all",
                              }}
                            >
                              {typeof user.email === "string"
                                ? user.email.slice(0, 85)
                                : user.email[0]}
                              {hoveredRow === index && (
                                <Tooltip
                                  title="Copy Email"
                                  placement="top"
                                  sx={{
                                    background: "#DAD8FD",
                                    color: "#3D37DD",
                                    textTransform: "capitalize",
                                  }}
                                >
                                  <IconButton
                                    size="sm"
                                    onClick={() => {
                                      if (typeof user.email === "string") {
                                        handleCopyEmail(user.email);
                                      }
                                    }}
                                    sx={{
                                      position: "absolute",
                                      right: "-30px",
                                      top: "50%",
                                      transform: "translateY(-50%)",
                                      bgcolor: "transparent",
                                      "&:hover": { bgcolor: "transparent" },
                                    }}
                                  >
                                    <CopyIcon fontSize="var(--Icon-fontSize)" />
                                  </IconButton>
                                </Tooltip>
                              )}
                              {copiedEmail === user.email && (
                                <Box
                                  sx={{
                                    position: "fixed",
                                    bottom: "20px",
                                    left: "50%",
                                    transform: "translateX(-50%)",
                                    bgcolor: "#DCFCE7",
                                    color: "#16A34A",
                                    padding: "4px 6px",
                                    borderRadius: "10px",
                                    fontSize: "12px",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    zIndex: 1000,
                                  }}
                                >
                                  Copied to clipboard
                                  <IconButton
                                    size="sm"
                                    onClick={() => setCopiedEmail(null)}
                                    sx={{ color: "#16A34A" }}
                                  >
                                    <X fontSize="var(--Icon-fontSize)" />
                                  </IconButton>
                                </Box>
                              )}
                            </Box>
                          </td>
                          <td>
                            <IconButton
                              size="sm"
                              onClick={(event) => handleMenuOpen(event, index)}
                            >
                              <DotsThreeVertical
                                weight="bold"
                                size={22}
                                color="var(--joy-palette-text-secondary)"
                              />
                            </IconButton>
                            <Popper
                              open={menuRowIndex === index && Boolean(anchorEl)}
                              anchorEl={anchorEl}
                              placement="bottom-start"
                              style={{
                                minWidth: "150px",
                                borderRadius: "8px",
                                boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
                                backgroundColor:
                                  "var(--joy-palette-background-surface)",
                                zIndex: 1300,
                                border: "1px solid var(--joy-palette-divider)",
                              }}
                            >
                              <Box
                                onMouseDown={(event) => {
                                  event.preventDefault();
                                  handleOpenDetail(event, user.id);
                                }}
                                sx={menuItemStyle}
                              >
                                <EyeIcon fontSize="20px" style={iconStyle} />
                                Open detail
                              </Box>
                              <Box
                                onMouseDown={(event) => {
                                  event.preventDefault();
                                  handleEdit(user.id);
                                }}
                                sx={menuItemStyle}
                              >
                                <PencilIcon fontSize="20px" style={iconStyle} />
                                Edit
                              </Box>
                              <Box
                                onMouseDown={(event) => {
                                  event.preventDefault();
                                  handleResetPassword(user.id);
                                }}
                                sx={menuItemStyle}
                              >
                                <Password fontSize="20px" style={iconStyle} />
                                Reset password
                              </Box>
                              <Box
                                onMouseDown={(event) => {
                                  event.preventDefault();
                                  handleDeleteRow(user.id);
                                  handleMenuClose();
                                }}
                                sx={{ ...menuItemStyle, color: "#EF4444" }}
                              >
                                <TrashIcon fontSize="20px" style={iconStyle} />
                                Delete
                              </Box>
                            </Popper>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                  {/* {(users.length > 0 || isLoading) && (
                    <Box
                      sx={{
                        position: { xs: "static", sm: "static" },
                        left: 0,
                        right: 0,
                        zIndex: 1000,
                        padding: "12px 24px",
                        display: "flex",
                        justifyContent: "center",
                      }}
                    >
                      <Pagination
                        totalPages={totalPages}
                        currentPage={currentPage}
                        onPageChange={handlePageChange}
                        disabled={!hasResults}
                      />
                    </Box>
                  )} */}
                </Box>
              ) : (
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
                    gap: 2,
                  }}
                >
                  {users.map((user, index) => (
                    <Card
                      key={user.id}
                      sx={{
                        mb: 0,
                        p: "16px",
                        display: "flex",
                        alignItems: "center",
                        maxWidth: {
                          xs: "92vw",
                          sm: "65vw",
                          md: "32vw",
                          lg: "25vw",
                          xl: "27vw",
                        },
                      }}
                    >
                      <Box
                        sx={{ position: "relative", display: "inline-block" }}
                      >
                        {user.avatar ? (
                          <Avatar
                            src={user.avatar}
                            sx={{ width: 48, height: 48 }}
                          />
                        ) : (
                          <Avatar
                            sx={{
                              width: 48,
                              height: 48,
                              fontWeight: "bold",
                              fontSize: "16px",
                            }}
                            {...getAvatarProps(user.name)}
                          >
                            {user.name
                              .split(" ")
                              .slice(0, 2)
                              .map((n) => n[0]?.toUpperCase() || "")
                              .join("")}
                          </Avatar>
                        )}
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: "50%",
                            backgroundColor:
                              user.status === "active"
                                ? "#1A7D36"
                                : user.status === "inactive"
                                ? "#D3232F"
                                : "#FAE17D",
                            position: "absolute",
                            bottom: 0,
                            right: 0,
                            border: "2px solid white",
                          }}
                        />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          sx={{
                            fontWeight: "300",
                            fontSize: "14px",
                            color: "var(--joy-palette-text-primary)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {user.name.slice(0, 85)}
                        </Typography>
                        <Typography
                          level="body-sm"
                          sx={{
                            color: "var(--joy-palette-text-secondary)",
                            fontWeight: "400",
                            fontSize: "12px",
                            whiteSpace: "wrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {typeof user.email === "string"
                            ? user.email.slice(0, 55)
                            : user.email[0]}
                        </Typography>
                      </Box>
                      <IconButton
                        size="sm"
                        onClick={(event) => handleMenuOpen(event, index)}
                      >
                        <DotsThreeVertical
                          weight="bold"
                          size={22}
                          color="var(--joy-palette-text-secondary)"
                        />
                      </IconButton>
                      <Popper
                        open={menuRowIndex === index && Boolean(anchorEl)}
                        anchorEl={anchorEl}
                        placement="bottom-start"
                        style={{
                          minWidth: "150px",
                          borderRadius: "8px",
                          boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
                          backgroundColor:
                            "var(--joy-palette-background-surface)",
                          zIndex: 1300,
                          border: "1px solid var(--joy-palette-divider)",
                        }}
                      >
                        <Box
                          onMouseDown={(event) => {
                            event.preventDefault();
                            handleOpenDetail(event, user.id);
                          }}
                          sx={menuItemStyle}
                        >
                          <EyeIcon fontSize="20px" style={iconStyle} />
                          Open detail
                        </Box>
                        <Box
                          onMouseDown={(event) => {
                            event.preventDefault();
                            handleEdit(user.id);
                          }}
                          sx={menuItemStyle}
                        >
                          <PencilIcon fontSize="20px" style={iconStyle} />
                          Edit
                        </Box>
                        <Box
                          onMouseDown={(event) => {
                            event.preventDefault();
                            handleResetPassword(user.id);
                          }}
                          sx={menuItemStyle}
                        >
                          <Password fontSize="20px" style={iconStyle} />
                          Reset password
                        </Box>
                        <Box
                          onMouseDown={(event) => {
                            event.preventDefault();
                            handleDeleteRow(user.id);
                            handleMenuClose();
                          }}
                          sx={{ ...menuItemStyle, color: "#EF4444" }}
                        >
                          <TrashIcon fontSize="20px" style={iconStyle} />
                          Delete
                        </Box>
                      </Popper>
                    </Card>
                  ))}
                </Box>
              )}
              {(users.length > 0 || isLoading) && (
                    <Box
                      sx={{
                        position: { xs: "static", sm: "static" },
                        left: 0,
                        right: 0,
                        zIndex: 1000,
                        padding: "12px 24px",
                        display: "flex",
                        justifyContent: "center",
                      }}
                    >
                      <Pagination
                        totalPages={totalPages}
                        currentPage={currentPage}
                        onPageChange={handlePageChange}
                        disabled={!hasResults}
                      />
                    </Box>
                  )}
            </Box>
          )}
        </Box>

        <Box sx={{ flex: 0.7, mt: { xs: 4, sm: 2 }, maxWidth: { xs: "100%", sm: "336px" } }}>
          <Box
            sx={{
              mb: 3,
              borderBottom: "1px solid var(--joy-palette-divider)",
              pb: 3,
            }}
          >
            <Typography
              sx={{
                fontWeight: "300",
                mb: 1,
                fontSize: "14px",
                color: "var(--joy-palette-text-secondary)",
              }}
            >
              About
            </Typography>
            <Typography
              level="body-md"
              sx={{
                color: "var(--joy-palette-text-primary)",
                fontWeight: "300",
                fontSize: "14px",
                wordWrap: "break-word",
                overflowWrap: "break-word",
                whiteSpace: "normal"
              }}
            >
              {roleData?.description}
            </Typography>
          </Box>

          <Typography
            sx={{
              fontWeight: "300",
              mb: 1,
              fontSize: "14px",
              color: "var(--joy-palette-text-secondary)",
            }}
          >
            Permission
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {permissionsByModule.length === 0 ? (
              <Typography
                sx={{
                  color: "var(--joy-palette-text-secondary)",
                  fontWeight: "400",
                  fontSize: "14px",
                }}
              >
                No permissions assigned
              </Typography>
            ) : (
              permissionsByModule.map((module) => {
                const isExpanded = expandedPermissions.includes(module.id);
                return (
                  <Card
                    key={module.id}
                    variant="outlined"
                    sx={{
                      p: "12px",
                      cursor: "pointer",
                      borderRadius: "8px",
                      bgcolor: "var(--joy-palette-background-mainBg)",
                      display: "flex",
                      flexDirection: "column",
                    }}
                    onClick={() => togglePermission(module.id)}
                  >
                    <Box
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        width: "100%",
                      }}
                    >
                      <Box
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 1,
                        }}
                      >
                        <Typography
                          sx={{
                            fontWeight: "300",
                            fontSize: "14px",
                            color: "var(--joy-palette-text-primary)",
                          }}
                        >
                          {module.name}
                        </Typography>
                        <Typography
                          sx={{
                            color: "var(--joy-palette-text-secondary)",
                            fontWeight: "400",
                            fontSize: "12px",
                            mr: 1,
                          }}
                        >
                          {/* Full access */}
                        </Typography>
                      </Box>
                      <Box sx={{ ml: "auto" }}>
                        {isExpanded ? (
                          <CaretUp size={16} weight="bold" />
                        ) : (
                          <CaretDown size={16} weight="bold" />
                        )}
                      </Box>
                    </Box>
                    {isExpanded && (
                      <Box
                        sx={{
                          borderTop: "1px solid var(--joy-palette-divider)",
                          pt: 1.5,
                        }}
                      >
                        {module.permissions.map((perm) => (
                          <Box
                            key={perm.id}
                            sx={{
                              display: "flex",
                              alignItems: "start",
                              gap: 1,
                              mb: 1,
                            }}
                          >
                            <CheckCircle
                              size={20}
                              weight="bold"
                              color="#1A7D36"
                              style={{ minWidth: "20px" }}
                            />
                            <Typography
                              sx={{
                                color: "var(--joy-palette-text-secondary)",
                                fontWeight: "400",
                                fontSize: "12px",
                              }}
                            >
                              {perm.label}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Card>
                );
              })
            )}
          </Box>
        </Box>
      </Box>

      <DeleteDeactivateUserModal
        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        onConfirm={confirmDelete}
        usersToDelete={usersToDelete}
        title="Delete role"
        description="Are you sure you want to delete this role?"
      />

      <AddEditUserModal
        open={openEditModal}
        onClose={handleCloseEditModal}
        userId={userToEditId}
      />

      <AddEditUserModal open={openAddUserModal} onClose={handleCloseAddUserModal} />

      <AddRoleModal
        open={openEditRoleModal}
        onClose={handleCloseEditRoleModal}
        roleId={roleData?.role_id}
        onRoleCreated={handleRoleEdited}
      />

      <ResetPasswordUser
        open={openResetPasswordModal}
        onClose={() => setOpenResetPasswordModal(false)}
        userName={userToResetPassword?.name || ""}
        userEmail={userToResetPassword?.email || ""}
        onConfirm={(selectedEmail) => {
          console.log(`Resetting password for ${selectedEmail}`);
        }}
      />

      <UserDetailsPopover
        open={Boolean(popoverAnchorEl)}
        onClose={handleClosePopover}
        anchorEl={popoverAnchorEl}
        userId={selectedUser?.id ?? ""}
      />
    </Box>
  );
};

export default SystemAdminSettings;
