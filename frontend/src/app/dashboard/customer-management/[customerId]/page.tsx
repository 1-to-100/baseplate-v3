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
import { useSearchParams } from "next/navigation";
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
import AddEditUser from "@/components/dashboard/modals/AddEditUser";
import DeleteDeactivateUserModal from "@/components/dashboard/modals/DeleteItemModal";
import Pagination from "@/components/dashboard/layout/pagination";
import InviteUser from "@/components/dashboard/modals/InviteUserModal";
import ResetPasswordUser from "@/components/dashboard/modals/ResetPasswordUserModal";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getUsers, getUserById } from "../../../../lib/api/users";
import { getCustomerById } from "../../../../lib/api/customers";
import Tooltip from "@mui/joy/Tooltip";
import { ApiUser } from "@/contexts/auth/types";
import { useGlobalSearch } from "@/hooks/use-global-search";
import AddRoleModal from "@/components/dashboard/modals/AddRoleModal";
import { useParams } from "next/navigation";
import { DotsThreeVertical as DotsIcon } from "@phosphor-icons/react/dist/ssr/DotsThreeVertical";
import AddEditCustomerModal from "@/components/dashboard/modals/AddEditCustomerModal";

const Customer: React.FC = () => {
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
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
  const [rowsToDelete, setRowsToDelete] = useState<number[]>([]);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openAddUserModal, setOpenAddUserModal] = useState(false);
  const [openEditRoleModal, setOpenEditRoleModal] = useState(false);
  const [openResetPasswordModal, setOpenResetPasswordModal] = useState(false);
  const [userToResetPassword, setUserToResetPassword] =
    useState<ApiUser | null>(null);
  const [userToEditId, setUserToEditId] = useState<number | null>(null);
  const [sortColumn, setSortColumn] = useState<keyof ApiUser | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);

  const params = useParams();
  const { debouncedSearchValue } = useGlobalSearch();
  const customerId = params.customerId;
  const queryClient = useQueryClient();

  const rowsPerPage = 10;

  const {
    data: customerData,
    isLoading: isCustomerLoading,
    error: customerError,
  } = useQuery({
    queryKey: ["customer", customerId],
    queryFn: () => {
      if (!customerId) {
        throw new Error("Customer ID is missing");
      }
      return getCustomerById(Number(customerId));
    },
    enabled: !!customerId,
  });

  const transformUser = (apiUser: ApiUser): ApiUser => {
    return {
      managerId: apiUser.managerId,
      id: apiUser.id,
      firstName: apiUser.firstName,
      lastName: apiUser.lastName,
      name: `${apiUser.firstName} ${apiUser.lastName}`.trim(),
      email: apiUser.email,
      customerId: apiUser.customerId,
      roleId: apiUser.roleId,
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
      customerId,
    ],
    queryFn: async () => {
      const response = await getUsers({
        page: currentPage,
        perPage: rowsPerPage,
        search: debouncedSearchValue || undefined,
        orderBy: sortColumn || undefined,
        orderDirection: sortDirection,
        customerId: customerId ? (Array.isArray(customerId) ? customerId : [customerId]) : undefined,
      });
      return {
        ...response,
        data: response.data.map(transformUser),
      };
    },
    // enabled: ,
  });

  const users = data?.data || [];
  const totalPages = data?.meta?.lastPage || 1;
  const hasResults = users.length > 0;

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
    userId: number
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

  const handleEdit = (userId: number) => {
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

  const handleResetPassword = (userId: number) => {
    const user = users.find((u) => u.id === userId);
    if (user) {
      setUserToResetPassword(user);
      setOpenResetPasswordModal(true);
    }
    handleMenuClose();
  };

  const handleDeleteRow = useCallback((userId: number) => {
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

  const handleCloseEditRoleModal = async () => {
    if (customerId) {
      await queryClient.invalidateQueries({
        queryKey: ["customer", customerId],
      });
    }
    setOpenEditRoleModal(false);
  };

  const handleRowCheckboxChange = (userId: number) => {
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

  const handleCustomerMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    setMenuRowIndex(null);
  };

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
              {customerData?.name.slice(0, 45)}
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
          href={paths.dashboard.customerManagement.list}
          type="start"
        />
        <BreadcrumbsItem href={paths.dashboard.customerManagement.list}>
          Customer Management
        </BreadcrumbsItem>
        <BreadcrumbsItem type="end">
          {customerData?.name.slice(0, 45)}
        </BreadcrumbsItem>
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
            {users.length > 0 && (
              <Typography
                level="title-md"
                sx={{ fontWeight: "500", fontSize: "18px" }}
                component="div"
              >
                Users{" "}
                {users.length > 0 ? (
                  <Box
                    sx={{
                      bgcolor: "var(--joy-palette-divider)",
                      borderRadius: "50%",
                      width: "20px",
                      height: "20px",
                      display: "inline-flex",
                      justifyContent: "center",
                      alignItems: "center",
                      p: 1.5,
                      fontSize: "14px",
                      color: "var(--joy-palette-text-primary)",
                    }}
                  >
                    {users.length}
                  </Box>
                ) : (
                  ""
                )}
              </Typography>
            )}
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
            {users.length > 0 && (
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
            )}
          </Box>

          {isLoading || isCustomerLoading ? (
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
                  <AddEditUser
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
                                {user.name.slice(0, 95)}
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
                                ? user.email.slice(0, 95)
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
                        <Avatar
                          sx={{
                            width: 40,
                            height: 40,
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
                          {user.name.slice(0, 45)}
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
                            ? user.email.slice(0, 45)
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

        <Box sx={{ flex: 0.7, mt: { xs: 4, sm: 2 } }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "1px solid var(--joy-palette-divider)",
              paddingBottom: 2,
              mb: 2,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <Stack>
                <Typography
                  level="body-lg"
                  sx={{
                    fontSize: "18px",
                    color: "var(--joy-palette-text-primary)",
                  }}
                  fontWeight="600"
                >
                  {customerData?.name.slice(0, 45)}
                </Typography>
                {/* {customerData && customerData.status && (
                  <Typography
                    level="body-sm"
                    sx={{
                      color:
                        customerData.status === "active"
                          ? "#1A7D36"
                          : customerData.status === "suspended"
                          ? "#4D2D00"
                          : "#D3232F",
                      bgcolor:
                        customerData.status === "active"
                          ? "#DCFCE7"
                          : customerData.status === "suspended"
                          ? "#FFF8C5"
                          : "#FEE2E2",
                      borderRadius: "10px",
                      px: 1,
                      display: "inline-block",
                      width: "fit-content",
                      fontSize: "12px",
                      fontWeight: 500,
                    }}
                  >
                    {customerData.status.charAt(0).toUpperCase() +
                      customerData.status.slice(1)}
                  </Typography>
                )} */}
              </Stack>
            </Box>

            <Button
              variant="plain"
              size="sm"
              sx={{
                color: "#636B74",
                background: "transparent",
                p: 0,
                "&:hover": {
                  background: "transparent",
                  opacity: "0.8",
                },
              }}
              onClick={handleCustomerMenuOpen}
            >
              <DotsIcon
                weight="bold"
                size={22}
                color="var(--joy-palette-text-secondary)"
              />
            </Button>
          </Box>

          <Stack spacing={2}>
            <Stack direction="row" spacing={2}>
              <Typography
                level="body-sm"
                fontWeight="300"
                sx={{ color: "#636B74", width: "100px" }}
              >
                Customer administrator
              </Typography>
              <Typography
                level="body-sm"
                fontWeight="300"
                sx={{ color: "var(--joy-palette-text-primary)" }}
              >
                {customerData?.owner?.firstName.slice(0, 45)} {customerData?.owner?.lastName.slice(0, 45)}
              </Typography>
            </Stack>

            <Stack direction="row" spacing={2}>
              <Typography
                level="body-sm"
                fontWeight="300"
                sx={{ color: "#636B74", width: "100px" }}
              >
                Email
              </Typography>
              <Stack spacing={0}>
                <Typography
                  level="body-sm"
                  fontWeight="300"
                  sx={{ color: "var(--joy-palette-text-primary)", whiteSpace: "wrap", wordBreak: "break-all" }}
                >
                  {customerData?.email.slice(0, 45)}
                </Typography>
              </Stack>
            </Stack>

            <Stack direction="row" spacing={2}>
              <Typography
                level="body-sm"
                fontWeight="300"
                sx={{ color: "#636B74", width: "100px" }}
              >
                Customer success manager
              </Typography>
              <Typography
                level="body-sm"
                fontWeight="300"
                sx={{ color: "var(--joy-palette-text-primary)" }}
              >
                {customerData?.customerSuccess?.name.slice(0, 45)} <br />
                {customerData?.customerSuccess?.email.slice(0, 45)}
              </Typography>
            </Stack>
            

            <Stack
              direction="row"
              spacing={2}
              sx={{
                borderTop: "1px solid var(--joy-palette-divider)",
                paddingTop: 2,
              }}
            >
              <Typography
                level="body-sm"
                fontWeight="300"
                sx={{ color: "#6B7280", width: "100px" }}
              >
                Billing
              </Typography>
              <Stack spacing={0.5}>
                <Box
                  sx={{
                    padding: "2px 8px",
                    borderRadius: "12px",
                    fontWeight: 500,
                    fontSize: "12px",
                    width: "fit-content",
                    color:
                      customerData?.subscriptionName === "Premium"
                        ? "#3D37DD"
                        : customerData?.subscriptionName === "Enterprise"
                        ? "#4D2D00"
                        : "#272930",
                    bgcolor:
                      customerData?.subscriptionName === "Premium"
                        ? "#DAD8FD"
                        : customerData?.subscriptionName === "Enterprise"
                        ? "#FFF8C5"
                        : "#EEEFF0",
                  }}
                >
                  {customerData?.subscriptionName}
                </Box>
              </Stack>
            </Stack>
          </Stack>
        </Box>
      </Box>

      <DeleteDeactivateUserModal
        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        onConfirm={confirmDelete}
        usersToDelete={usersToDelete}
        title="Delete customer"
        description="Are you sure you want to delete this customer?"
      />

      <AddEditUser
        open={openEditModal}
        onClose={handleCloseEditModal}
        userId={userToEditId}
      />

      <AddEditUser open={openAddUserModal} onClose={handleCloseAddUserModal} />

      <AddEditCustomerModal
        open={openEditRoleModal}
        onClose={handleCloseEditRoleModal}
        customerId={customerData?.id}
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
        userId={selectedUser?.id ?? 0}
      />
    </Box>
  );
};

export default Customer;
