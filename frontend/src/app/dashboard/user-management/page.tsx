"use client";

import * as React from "react";
import type { Metadata } from "next";
import Box from "@mui/joy/Box";
import Stack from "@mui/joy/Stack";
import Typography from "@mui/joy/Typography";
import IconButton from "@mui/joy/IconButton";
import Table from "@mui/joy/Table";
import Checkbox from "@mui/joy/Checkbox";
import Avatar from "@mui/joy/Avatar";
import Button from "@mui/joy/Button";
import Tooltip from "@mui/joy/Tooltip";
import { Plus as PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { Trash as TrashIcon } from "@phosphor-icons/react/dist/ssr/Trash";
import { DotsThreeVertical } from "@phosphor-icons/react/dist/ssr/DotsThreeVertical";
import { Copy as CopyIcon } from "@phosphor-icons/react/dist/ssr/Copy";
import { X as X } from "@phosphor-icons/react/dist/ssr/X";
import { Eye as EyeIcon } from "@phosphor-icons/react/dist/ssr/Eye";
import { PencilSimple as PencilIcon } from "@phosphor-icons/react/dist/ssr/PencilSimple";
import { ToggleLeft } from "@phosphor-icons/react/dist/ssr/ToggleLeft";
import { ArrowsDownUp as SortIcon } from "@phosphor-icons/react/dist/ssr/ArrowsDownUp";
import { config } from "@/config";
import DeleteDeactivateUserModal from "@/components/dashboard/modals/DeleteItemModal";
import UserDetailsPopover from "@/components/dashboard/user-management/user-details-popover";
import { useState, useCallback, useEffect } from "react";
import AddEditUserModal from "@/components/dashboard/modals/AddEditUserModal";
import Pagination from "@/components/dashboard/layout/pagination";
import Filter from "@/components/dashboard/filter";
import { Popper } from "@mui/base/Popper";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiUser } from "@/contexts/auth/types";
import CircularProgress from "@mui/joy/CircularProgress";
import { ColorPaletteProp, VariantProp } from "@mui/joy";
import { useUserInfo } from "@/hooks/use-user-info";
import InviteUserModal from "@/components/dashboard/modals/InviteUserModal";
import {PaperPlaneRight, ToggleRight, TrashSimple} from "@phosphor-icons/react";
import { toast } from "@/components/core/toaster";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import { isUserOwner, isSystemAdministrator, isCustomerSuccess, SYSTEM_ROLES, isCustomerAdminOrManager } from "@/lib/user-utils";
import { ArrowRight as ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { useImpersonation } from "@/contexts/impersonation-context";
import {getCustomers} from "@/lib/api/customers";
import {getRoles} from "@/lib/api/roles";
import {deleteUser, getUserById, getUsers, resendInviteUser, updateUser} from "@/lib/api/users";
import { useGlobalSearch } from "@/hooks/use-global-search";

interface HttpError extends Error {
  response?: {
    status: number;
    data: {
      message: string;
    };
  };
}

const metadata = {
  title: `User Management | Dashboard | ${config.site.name}`,
} satisfies Metadata;

export default function Page(): React.JSX.Element {
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [anchorEl, setAnchorPopper] = useState<null | HTMLElement>(null);
  const [menuRowIndex, setMenuRowIndex] = useState<number | null>(null);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [openDeactivateModal, setOpenDeactivateModal] = useState(false);
  const [rowsToDelete, setRowsToDelete] = useState<string[]>([]);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [popoverAnchorEl, setPopoverAnchorEl] = useState<null | HTMLElement>(
    null
  );
  const [selectedUser, setSelectedUser] = useState<ApiUser | null>(null);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openAddUserModal, setOpenAddUserModal] = useState(false);
  const [userToEditId, setUserToEditId] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<keyof ApiUser | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<{
    statusId: string[];
    customerId: string[];
    roleId: string[];
  }>({
    statusId: [],
    customerId: [],
    roleId: [],
  });
  const { userInfo } = useUserInfo();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [openInviteModal, setOpenInviteModal] = useState(false);
  const [addUserAnchorEl, setAddUserAnchorEl] = useState<null | HTMLElement>(
    null
  );
  const queryClient = useQueryClient();
  const [supabaseClient] = React.useState<SupabaseClient>(
    createSupabaseClient()
  );
  const { setImpersonatedUserId, isImpersonating } = useImpersonation();
  const { debouncedSearchValue } = useGlobalSearch();

  const rowsPerPage = 10;

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
    };
  };

  const { data, isLoading, error } = useQuery({
    queryKey: [
      "users",
      currentPage,
      debouncedSearchValue,
      sortColumn,
      sortDirection,
      filters.statusId,
      filters.customerId,
      filters.roleId,
    ],
    queryFn: async () => {
      const response = await getUsers({
        page: currentPage,
        perPage: rowsPerPage,
        search: debouncedSearchValue || undefined,
        orderBy: sortColumn || undefined,
        orderDirection: sortDirection,
        statusId: filters.statusId.length > 0 ? filters.statusId : undefined,
        customerId:
          filters.customerId.length > 0 ? filters.customerId : undefined,
        roleId: filters.roleId.length > 0 ? filters.roleId : undefined,
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (anchorEl && !anchorEl.contains(event.target as Node)) {
        handleMenuClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [anchorEl]);

  // useEffect(() => {}, [popoverAnchorEl, selectedUser]);

  const handleRowCheckboxChange = (userId: string) => {
    setSelectedRows((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  useEffect(() => {
    const handleClickOutsidePopover = (event: MouseEvent) => {
      if (popoverAnchorEl && !popoverAnchorEl.contains(event.target as Node)) {
        handleClosePopover();
      }
    };

    document.addEventListener("mousedown", handleClickOutsidePopover);

    return () => {
      document.removeEventListener("mousedown", handleClickOutsidePopover);
    };
  }, [popoverAnchorEl]);

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

  const handleCloseFilter = () => {
    setIsFilterOpen(false);
  };

  const handleOpenFilter = () => {
    setIsFilterOpen(true);
    handleClosePopover();
  };

  const handleDelete = () => {
    if (selectedRows.length > 0) {
      setRowsToDelete(selectedRows);
      setOpenDeleteModal(true);
    }
  };

  const handleDeleteUser = (userId: string) => {
    setRowsToDelete([userId]);
    setOpenDeleteModal(true);
  };

  const handleDeleteRow = useCallback((userId: string) => {
    setRowsToDelete([userId]);
    setOpenDeleteModal(true);
  }, []);

  const handleDeactivate = async (userId: string) => {
    setSelectedRows([userId]);
    setOpenDeactivateModal(true)
  };

  const confirmDeactivate = async () => {
    if(selectedRows.length > 0) {
      try {
        setOpenDeactivateModal(false);
        for (const userId of selectedRows) {
          await updateUser({ id: userId, status: 'suspended' });
        }
        toast.success('User deactivated successfully');
        queryClient.invalidateQueries({ queryKey: ["users"] });
      } catch (error) {
        const httpError = error as HttpError;
        toast.error(httpError.response?.data?.message || 'Failed to deactivate user');
      }
      handleMenuClose();
    }

    setOpenDeactivateModal(false);
    setRowsToDelete([]);
    setSelectedRows([]);
  };

  const handleActivate = async (userId: string) => {
    try {
      await updateUser({ id: userId, status: 'active' });
      toast.success('User activated successfully');
      queryClient.invalidateQueries({ queryKey: ["users"] });
    } catch (error) {
      const httpError = error as HttpError;
      toast.error(httpError.response?.data?.message || 'Failed to activate user');
    }
    handleMenuClose();
  };

  const handleBulkDeactivate = () => {
    if (selectedRows.length > 0) {
      setRowsToDelete(selectedRows);
      setIsDeactivating(true);
      setOpenDeactivateModal(true);
    }
  };

  const confirmDelete = async () => {
    if (rowsToDelete.length > 0) {
      try {
        for (const userId of rowsToDelete) {
          try {
            setOpenDeleteModal(false);
            await deleteUser(userId);
            toast.success('User successfully deleted');
          } catch (error) {
            const httpError = error as HttpError;
            toast.error(httpError.response?.data?.message);
          }
        }
        queryClient.invalidateQueries({ queryKey: ["users"] });
      } catch (error) {
        // toast.error('An error occurred while deleting users');
      }
    }
    setOpenDeleteModal(false);
    setRowsToDelete([]);
    setSelectedRows([]);
  };

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email).then(() => {
      setCopiedEmail(email);
      setTimeout(() => setCopiedEmail(null), 2000);
    });
  };

  const handleMenuOpen = (
    event: React.MouseEvent<HTMLElement>,
    index: number
  ) => {
    event.stopPropagation();
    setAnchorPopper(event.currentTarget);
    setMenuRowIndex(index);
  };

  const handleMenuClose = () => {
    setAnchorPopper(null);
    setMenuRowIndex(null);
  };

  const handleClosePopover = () => {
    setSelectedUser(null);
    setPopoverAnchorEl(null);
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
      handleCloseFilter();
    } catch (err) {
      // Handle error
    }
    handleMenuClose();
  };

  const handleEdit = async (userId: string) => {
    try {
      setUserToEditId(userId);
      setOpenEditModal(true);
    } catch (err) {
      // Handle error
    }
    handleMenuClose();
  };

  const handleAddUser = () => {
    setOpenAddUserModal(true);
    handleMenuClose();
  };

  const handleCloseEditModal = () => {
    setOpenEditModal(false);
    setUserToEditId(null);
  };

  const handleCloseAddUserModal = () => {
    setOpenAddUserModal(false);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setSelectedRows([]);
  };

  const handleFilter = (filters: {
    statusId: string[];
    customerId: string[];
    roleId: string[];
  }) => {
    setFilters(filters);
    setCurrentPage(1);
  };

  const handleSort = (column: keyof ApiUser) => {
    const isAsc = sortColumn === column && sortDirection === "asc";
    const newDirection = isAsc ? "desc" : "asc";
    setSortColumn(column);
    setSortDirection(newDirection);
  };


  const usersToDelete = rowsToDelete
    .map((userId) => {
      const user = users.find((u) => u.id === userId);
      return user ? user.name : undefined;
    })
    .filter((name): name is string => name !== undefined);

  const menuItemStyle = {
    padding: { xs: "6px 12px", sm: "8px 16px" },
    fontSize: { xs: "12px", sm: "14px" },
    fontWeight: "400",
    display: "flex",
    alignItems: "center",
    cursor: "pointer",
    color: "var(--joy-palette-text-primary)",
    "&:hover": { backgroundColor: "var(--joy-palette-background-mainBg)" },
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (addUserAnchorEl && !addUserAnchorEl.contains(event.target as Node)) {
        handleAddUserClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [addUserAnchorEl]);

  const handleAddUserClick = (event: React.MouseEvent<HTMLElement>) => {
    if (addUserAnchorEl) {
      handleAddUserClose();
    } else {
      setAddUserAnchorEl(event.currentTarget);
    }
  };

  const handleAddUserClose = () => {
    setAddUserAnchorEl(null);
  };

  const handleInviteUser = () => {
    setOpenInviteModal(true);
    handleAddUserClose();
  };

  const handleCloseInviteModal = () => {
    setOpenInviteModal(false);
  };

  const handleInviteConfirm = () => {
    handleCloseInviteModal();
    queryClient.invalidateQueries({ queryKey: ["users"] });
  };

  const handleImpersonateUser = (userId: string) => {
    setImpersonatedUserId(userId);
    handleMenuClose();
    // Note: Page reload is handled automatically by the impersonation context after JWT update
  };

  if (error) {
    const httpError = error as HttpError;
    let status: number | undefined = httpError.response?.status;

    if (!status && httpError.message.includes("status:")) {
      const match = httpError.message.match(/status: (\d+)/);
      status = match ? parseInt(match[1] ?? "0", 10) : undefined;
    }

    if (status === 403) {
      return (
        <Box sx={{ textAlign: "center", mt: { xs: 10, sm: 20, md: 35 } }}>
          <Typography
            sx={{
              fontSize: { xs: "20px", sm: "24px" },
              fontWeight: "600",
              color: "var(--joy-palette-text-primary)",
            }}
          >
            Access Denied
          </Typography>
          <Typography
            sx={{
              fontSize: { xs: "12px", sm: "14px" },
              fontWeight: "300",
              color: "var(--joy-palette-text-secondary)",
              mt: 1,
            }}
          >
            You do not have the required permissions to view this page. <br />
            Please contact your administrator if you believe this is a mistake.
          </Typography>
        </Box>
      );
    }
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
              fontWeight="600"
            >
              User Management
            </Typography>
          </Stack>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={{ xs: 1, sm: 2 }}
            sx={{
              alignItems: { xs: "stretch", sm: "center" },
              width: { xs: "100%", sm: "auto" },
            }}
          >
            {selectedRows.length > 0 ? (
              <Box
                sx={{
                  borderRight: { xs: "none", sm: "1px solid #E5E7EB" },
                  borderBottom: { xs: "1px solid #E5E7EB", sm: "none" },
                  display: "flex",
                  alignItems: "center",
                  justifyContent: { xs: "space-between", sm: "flex-start" },
                  padding: { xs: "8px 0", sm: "0 16px 0 0" },
                  gap: { xs: 1, sm: "12px" },
                  flexWrap: "wrap",
                }}
              >
                <Typography level="body-sm">
                  {selectedRows.length} row{selectedRows.length > 1 ? "s" : ""}{" "}
                  selected
                </Typography>
                <Stack direction="row" spacing={1}>
                  <IconButton
                    onClick={handleDelete}
                    sx={{
                      bgcolor: "#FEE2E2",
                      color: "#EF4444",
                      borderRadius: "50%",
                      width: { xs: 28, sm: 32 },
                      height: { xs: 28, sm: 32 },
                      "&:hover": { bgcolor: "#FECACA" },
                    }}
                  >
                    <TrashIcon fontSize="var(--Icon-fontSize)" />
                  </IconButton>
                  <IconButton
                    onClick={handleBulkDeactivate}
                    sx={{
                      bgcolor: "var(--joy-palette-background-mainBg)",
                      color: "#636B74",
                      borderRadius: "50%",
                      width: { xs: 28, sm: 32 },
                      height: { xs: 28, sm: 32 },
                    }}
                  >
                    <ToggleLeft fontSize="var(--Icon-fontSize)" />
                  </IconButton>
                </Stack>
              </Box>
            ) : null}
            <Filter
              users={users}
              onFilter={handleFilter}
              onClose={handleCloseFilter}
              open={isFilterOpen}
              onOpen={handleOpenFilter}
            />
            {isSystemAdministrator(userInfo) ||
            isUserOwner(userInfo) ||
            isCustomerSuccess(userInfo) ||
            isCustomerAdminOrManager(userInfo) ||
            userInfo?.permissions?.includes("inviteUser") ||
            userInfo?.permissions?.includes("createUser") ? (
              <Box sx={{ position: "relative" }}>
                <Button
                  variant="solid"
                  color="primary"
                  onClick={handleAddUserClick}
                  startDecorator={<PlusIcon fontSize="var(--Icon-fontSize)" />}
                  sx={{
                    width: { xs: "100%", sm: "auto" },
                    py: { xs: 1, sm: 0.75 },
                  }}
                >
                  Add user
                </Button>
                <Popper
                  open={Boolean(addUserAnchorEl)}
                  anchorEl={addUserAnchorEl}
                  placement="bottom-start"
                  style={{
                    minWidth: "150px",
                    borderRadius: "8px",
                    boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
                    backgroundColor: "var(--joy-palette-background-surface)",
                    zIndex: 1300,
                    border: "1px solid var(--joy-palette-divider)",
                  }}
                  className="custom-popper-top"
                >
                  <Box
                    onMouseDown={(event) => {
                      event.preventDefault();
                      handleAddUser();
                      handleAddUserClose();
                    }}
                    sx={{
                      ...menuItemStyle,
                      gap: { xs: "10px", sm: "14px" },
                    }}
                  >
                    <PlusIcon fontSize="18px" />
                    Add User
                  </Box>
                  <Box
                    onMouseDown={(event) => {
                      event.preventDefault();
                      handleInviteUser();
                    }}
                    sx={{
                      ...menuItemStyle,
                      gap: { xs: "10px", sm: "14px" },
                    }}
                  >
                    <PlusIcon fontSize="18px" />
                    Add Users
                  </Box>
                </Popper>
              </Box>
            ) : (
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
            )}
          </Stack>
        </Stack>

        {isLoading || isRolesLoading || isCustomersLoading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: { xs: "40vh", sm: "50vh" },
            }}
          >
            <CircularProgress size="lg" />
          </Box>
        ) : (
          <>
            <Box>
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
                  aria-label="user management table"
                  sx={{
                    minWidth: "800px",
                    tableLayout: "fixed",
                    "& th, & td": {
                      px: { xs: 1, sm: 2 },
                      py: { xs: 1, sm: 1.5 },
                    },
                  }}
                >
                  <thead>
                    <tr>
                      <th style={{ width: "60px" }}>
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
                      <th
                        style={{ width: "30%" }}
                        onClick={() => handleSort("name")}
                      >
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
                          User name
                          <SortIcon
                            className="sort-icon"
                            fontSize="16"
                            color="var(--joy-palette-text-secondary)"
                          />
                        </Box>
                      </th>
                      <th
                        style={{ width: "25%" }}
                        onClick={() => handleSort("email")}
                      >
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
                          <SortIcon
                            className="sort-icon"
                            fontSize="16"
                            color="var(--joy-palette-text-secondary)"
                          />
                        </Box>
                      </th>
                      <th style={{ width: "20%" }}>
                        Customer
                      </th>
                      <th style={{ width: "15%" }}>
                        Role
                      </th>
                      <th style={{ width: "60px" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          style={{ textAlign: "center", padding: "20px" }}
                        >
                          <Typography level="body-md" color="neutral">
                            No items found
                          </Typography>
                        </td>
                      </tr>
                    ) : (
                      users.map((user, index) => {
                        // Permission checks
                        const canResendInvite = user.status != "active" && user.status != "suspended" &&
                          (isUserOwner(userInfo, user) ||
                            isCustomerAdminOrManager(userInfo) ||
                            userInfo?.permissions?.includes("inviteUser") ||
                            userInfo?.permissions?.includes("createUser"));

                        const canImpersonate = user.status == "active" &&
                          !isImpersonating &&
                          user.role?.name !== SYSTEM_ROLES.SYSTEM_ADMINISTRATOR &&
                          userInfo &&
                          (isSystemAdministrator(userInfo) || isCustomerSuccess(userInfo));

                        const canDeactivate = user?.status === 'active' &&
                          (isUserOwner(userInfo, user) ||
                            isCustomerAdminOrManager(userInfo) ||
                            userInfo?.permissions?.includes("editUser"));

                        const canActivate = user.status && user.status == 'suspended' &&
                          (isUserOwner(userInfo, user) ||
                            isCustomerAdminOrManager(userInfo) ||
                            userInfo?.permissions?.includes("editUser"));

                        const canDelete = user.role?.name !== SYSTEM_ROLES.SYSTEM_ADMINISTRATOR &&
                          user.role?.name !== SYSTEM_ROLES.CUSTOMER_SUCCESS &&
                          (isUserOwner(userInfo, user) ||
                            isCustomerAdminOrManager(userInfo) ||
                            userInfo?.permissions?.includes("deleteUser"));

                        return (
                        <tr
                          key={user.id}
                          onMouseEnter={() => setHoveredRow(index)}
                          onMouseLeave={() => setHoveredRow(null)}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleOpenDetail(event, user.id);
                          }}
                        >
                          <td>
                            <Checkbox
                              checked={selectedRows.includes(user.id)}
                              onChange={(event) => {
                                event.stopPropagation();
                                handleRowCheckboxChange(user.id);
                              }}
                              onClick={(event) => {
                                event.stopPropagation();
                              }}
                            />
                          </td>
                          <td>
                            <Stack
                              direction="row"
                              spacing={1}
                              sx={{ alignItems: "center" }}
                            >
                              <Avatar
                                sx={{
                                  width: { xs: 24, sm: 28 },
                                  height: { xs: 24, sm: 28 },
                                  fontWeight: "bold",
                                  fontSize: { xs: "12px", sm: "13px" },
                                }}
                                {...getAvatarProps(user.firstName && user.lastName ? user.name : (user.email || ''))}
                              >
                                {user.firstName && user.lastName
                                  ? user.name
                                      .split(" ")
                                      .slice(0, 2)
                                      .map((n) => n[0]?.toUpperCase() || "")
                                      .join("")
                                  : typeof user.email === 'string'
                                    ? (user.email.split("@")[0] || '').slice(0, 2).toUpperCase()
                                    : '??'}
                              </Avatar>
                              <Typography
                                sx={{
                                  wordBreak: "break-all",
                                  fontSize: { xs: "12px", sm: "14px" },
                                }}
                              >
                                {user.firstName && user.lastName ? user.name.slice(0, 85) : ''}
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
                                fontSize: { xs: "12px", sm: "14px" },
                              }}
                            >
                              {typeof user.email === "string"
                                ? user.email.slice(0, 75)
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
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      if (typeof user.email === "string") {
                                        handleCopyEmail(user.email);
                                      }
                                    }}
                                    sx={{
                                      position: "absolute",
                                      right: { xs: "-24px", sm: "-30px" },
                                      top: "50%",
                                      transform: "translateY(-50%)",
                                      bgcolor: "transparent",
                                      "&:hover": { bgcolor: "transparent" },
                                    }}
                                  >
                                    <CopyIcon fontSize="var(--Icon-fontSize)" color="var(--joy-palette-text-secondary)"/>
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
                                    fontSize: { xs: "10px", sm: "12px" },
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
                          <td
                            style={{
                              fontWeight: 400,
                              color: "var(--joy-palette-text-secondary)",
                            }}
                          >
                            <Box
                              sx={{
                                fontSize: { xs: "12px", sm: "14px" },
                                wordBreak: "break-all",
                              }}
                            >
                              {user.customer?.name.slice(0, 45)}
                            </Box>
                          </td>
                          <td
                            style={{
                              color: "var(--joy-palette-text-secondary)",
                            }}
                          >
                            <Box
                              sx={{
                                fontSize: { xs: "12px", sm: "14px" },
                                wordBreak: "break-all",
                              }}
                            >
                              {user.role?.display_name?.slice(0, 75)}
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
                                sx={{
                                  ...menuItemStyle,
                                  gap: { xs: "10px", sm: "14px" },
                                }}
                              >
                                <EyeIcon fontSize="20px" />
                                Open detail
                              </Box>
                              {canResendInvite && (
                                  <Box
                                    onMouseDown={(event) => {
                                      event.preventDefault();
                                      resendInviteUser(user.email)
                                        .then(() => {
                                          toast.success(
                                            "Invite sent successfully"
                                          );
                                        })
                                        .catch((error) => {
                                          toast.error(
                                            `Failed to send invite: ${error.message}`
                                          );
                                        });
                                    }}
                                    sx={{
                                      ...menuItemStyle,
                                      gap: { xs: "10px", sm: "14px" },
                                    }}
                                  >
                                    <PaperPlaneRight size={20} />
                                    Resend invite
                                  </Box>
                                )}
                              {canImpersonate && (
                                  <Box
                                    onMouseDown={(event) => {
                                      event.preventDefault();
                                      handleImpersonateUser(user.id);
                                    }}
                                    sx={{
                                      ...menuItemStyle,
                                      gap: { xs: "10px", sm: "14px" },
                                    }}
                                  >
                                    <ArrowRightIcon size={20} />
                                    Impersonate user
                                  </Box>
                                )}
                              <Box
                                onMouseDown={(event) => {
                                  event.preventDefault();
                                  handleEdit(user.id);
                                }}
                                sx={{
                                  ...menuItemStyle,
                                  gap: { xs: "10px", sm: "14px" },
                                }}
                              >
                                <PencilIcon fontSize="20px" />
                                Edit
                              </Box>
                              {canDeactivate && (
                                <Box
                                  onMouseDown={(event) => {
                                    event.preventDefault();
                                    handleDeactivate(user.id);
                                  }}
                                  sx={{
                                    ...menuItemStyle,
                                    gap: { xs: "10px", sm: "14px" },
                                  }}
                                >
                                  <ToggleLeft fontSize="20px" />
                                  Deactivate
                                </Box>
                              )}
                              {canActivate && (
                                <Box
                                  onMouseDown={(event) => {
                                    event.preventDefault();
                                    handleActivate(user.id);
                                  }}
                                  sx={{
                                    ...menuItemStyle,
                                    gap: { xs: "10px", sm: "14px" },
                                  }}
                                >
                                  <ToggleRight fontSize="20px" />
                                  Activate
                                </Box>
                              )}
                              {canDelete && (
                                <Box
                                  onMouseDown={(event) => {
                                    event.preventDefault();
                                    handleDeleteUser(user.id);
                                  }}
                                  sx={{
                                    ...menuItemStyle,
                                    gap: { xs: "10px", sm: "14px" },
                                  }}
                                >
                                  <TrashSimple size={20} />
                                  Delete user
                                </Box>
                              )}
                            </Popper>
                          </td>
                        </tr>
                        );
                      })
                    )}
                  </tbody>
                </Table>
              </Box>
                <Pagination
                  totalPages={totalPages}
                  currentPage={currentPage}
                  onPageChange={handlePageChange}
                  disabled={!hasResults}
                />
            </Box>
          </>
        )}
      </Stack>

      <DeleteDeactivateUserModal
        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        onConfirm={confirmDelete}
        usersToDelete={usersToDelete}
        title="Delete user"
        description="This user will be permanently removed from the system. They will not be able to log in or register again with this email. Are you sure you want to continue?"
      />

      <DeleteDeactivateUserModal
        open={openDeactivateModal}
        onClose={() => setOpenDeactivateModal(false)}
        onConfirm={confirmDeactivate}
        usersToDelete={usersToDelete}
        isDeactivate={true}
        title="Deactivate user"
        description="Are you sure you want to deactivate this user?"
      />

      <UserDetailsPopover
        open={Boolean(popoverAnchorEl)}
        onClose={handleClosePopover}
        anchorEl={popoverAnchorEl}
        userId={selectedUser?.id ?? ""}
      />

      <AddEditUserModal
        open={openEditModal}
        onClose={handleCloseEditModal}
        userId={userToEditId}
      />

      <AddEditUserModal open={openAddUserModal} onClose={handleCloseAddUserModal} />

      <InviteUserModal
        open={openInviteModal}
        onClose={handleCloseInviteModal}
        onConfirm={handleInviteConfirm}
      />
    </Box>
  );
}
