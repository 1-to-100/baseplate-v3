"use client";

import * as React from "react";
import type { Metadata } from "next";
import Box from "@mui/joy/Box";
import Stack from "@mui/joy/Stack";
import Typography from "@mui/joy/Typography";
import IconButton from "@mui/joy/IconButton";
import Table from "@mui/joy/Table";
import Checkbox from "@mui/joy/Checkbox";
import Button from "@mui/joy/Button";
import Tooltip from "@mui/joy/Tooltip";
import { Plus as PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { Trash as TrashIcon } from "@phosphor-icons/react/dist/ssr/Trash";
import { DotsThreeVertical } from "@phosphor-icons/react/dist/ssr/DotsThreeVertical";
import { Eye as EyeIcon } from "@phosphor-icons/react/dist/ssr/Eye";
import { PencilSimple as PencilIcon } from "@phosphor-icons/react/dist/ssr/PencilSimple";
import { ArrowsDownUp as SortIcon } from "@phosphor-icons/react/dist/ssr/ArrowsDownUp";
import { config } from "@/config";
import DeleteDeactivateUserModal from "@/components/dashboard/modals/DeleteItemModal";
import AddEditCustomer from "@/components/dashboard/modals/AddEditCustomerModal";
import Pagination from "@/components/dashboard/layout/pagination";
import Filter from "@/components/dashboard/filter";
import { Popper } from "@mui/base/Popper";
import SearchInput from "@/components/dashboard/layout/search-input";
import { useQuery } from "@tanstack/react-query";
import { getCustomersList, deleteCustomer } from "../../../lib/api/customers";
import { Customer } from "@/contexts/auth/types";
import CircularProgress from "@mui/joy/CircularProgress";
import { paths } from "@/paths";
import { useRouter } from "next/navigation";
import { useState, useCallback, useEffect } from "react";
import { useUserInfo } from "@/hooks/use-user-info";
import { useColorScheme } from '@mui/joy/styles';
import { useGlobalSearch } from "@/hooks/use-global-search";
import { isSystemAdministrator, isCustomerSuccess } from "@/lib/user-utils";

interface HttpError extends Error {
  response?: {
    status: number;
  };
}

const metadata = {
  title: `Customer Management | Dashboard | ${config.site.name}`,
} satisfies Metadata;

export default function Page(): React.JSX.Element {
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuRowIndex, setMenuRowIndex] = useState<number | null>(null);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [rowsToDelete, setRowsToDelete] = useState<string[]>([]);
  const [openEditCustomerModal, setOpenEditCustomerModal] = useState(false);
  const [openAddCustomerModal, setopenAddCustomerModal] = useState(false);
  const [customerToEditId, setCustomerToEditId] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<keyof Customer | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<{
    customerSuccessId: string[];
    subscriptionId: string[];
    statusId: string[];
  }>({
    customerSuccessId: [],
    subscriptionId: [],
    statusId: [],
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const { userInfo } = useUserInfo();
  const { colorScheme } = useColorScheme();
  const { debouncedSearchValue } = useGlobalSearch();

  const router = useRouter();
  const rowsPerPage = 10;

  const { data, isLoading, error } = useQuery({
    queryKey: [
      "customers",
      currentPage,
      debouncedSearchValue,
      sortColumn,
      sortDirection,
      filters.customerSuccessId,
      filters.subscriptionId,
      filters.statusId,
    ],
    queryFn: async () => {
      const response = await getCustomersList({
        page: currentPage,
        perPage: rowsPerPage,
        search: debouncedSearchValue || undefined,
        orderBy: sortColumn || undefined,
        orderDirection: sortDirection,
        managerId: filters.customerSuccessId.length > 0 ? filters.customerSuccessId : undefined,
        subscriptionId:
          filters.subscriptionId.length > 0
            ? filters.subscriptionId
            : undefined,
        statusId: filters.statusId.length > 0 ? filters.statusId : undefined,
      });
      return {
        ...response,
        data: response.data.map((customer) => ({
          ...customer,
          numberOfUsers: customer.numberOfUsers || 0,
          subscriptionId: customer.subscriptionId || "",
          status: customer.status || "inactive",
          email: customer.email || "",
        })),
      };
    },
  });

  const customers = data?.data || [];
  const totalPages = data?.meta?.lastPage || 1;
  const hasResults = customers.length > 0;

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

  const handleRowCheckboxChange = (customerId: string) => {
    setSelectedRows((prev) =>
      prev.includes(customerId)
        ? prev.filter((id) => id !== customerId)
        : [...prev, customerId]
    );
  };

  const handleSelectAllChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!hasResults) return;
    if (event.target.checked) {
      setSelectedRows(customers.map((customer) => customer.customer_id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleDelete = () => {
    if (selectedRows.length > 0) {
      setRowsToDelete(selectedRows);
      setOpenDeleteModal(true);
    }
  };

  const handleDeleteRow = useCallback((customerId: string) => {
    setRowsToDelete([customerId]);
    setOpenDeleteModal(true);
  }, []);

  const confirmDelete = async () => {
    try {
      await Promise.all(rowsToDelete.map((id) => deleteCustomer(id)));
      setOpenDeleteModal(false);
      setRowsToDelete([]);
      setSelectedRows([]);
    } catch (error) {
      console.error("Failed to delete customers:", error);
    }
  };

  const handleMenuOpen = (
    event: React.MouseEvent<HTMLElement>,
    index: number
  ) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setMenuRowIndex(index);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuRowIndex(null);
  };

  const handleCloseFilter = () => {
    setIsFilterOpen(false);
  };

  const handleOpenFilter = () => {
    setIsFilterOpen(true);
  };

  const handleOpenDetail = async (
    event: React.MouseEvent<HTMLElement>,
    customerId: string
  ) => {
    event.preventDefault();
    event.stopPropagation();
    router.push(
      paths.dashboard.customerManagement.details(customerId)
    );
    handleMenuClose();
    handleCloseFilter();
  };

  const handleEdit = async (customerId: string) => {
    try {
      setCustomerToEditId(customerId);
      handleCloseFilter();
      setOpenEditCustomerModal(true);
    } catch (err) {
      // Handle error
    }
    handleMenuClose();
  };

  const handleAddUser = () => {
    handleCloseFilter();
    setopenAddCustomerModal(true);
    handleMenuClose();
  };

  const handleCloseEditModal = () => {
    setOpenEditCustomerModal(false);
    setCustomerToEditId(null);
  };

  const handleCloseAddUserModal = () => {
    setopenAddCustomerModal(false);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setSelectedRows([]);
  };

  const handleFilter = (filters: {
    customerSuccessId: string[];
    subscriptionId: string[];
    statusId: string[];
  }) => {
    setFilters(filters);
    setCurrentPage(1);
  };

  const handleSort = (column: keyof Customer) => {
    const isAsc = sortColumn === column && sortDirection === "asc";
    const newDirection = isAsc ? "desc" : "asc";
    setSortColumn(column);
    setSortDirection(newDirection);
  };


  const customersToDelete = rowsToDelete
    .map((customerId) => {
      const customer = customers.find((u) => u.customer_id === customerId);
      return customer ? customer.name : undefined;
    })
    .filter((name): name is string => name !== undefined);

  const menuItemStyle = {
    padding: { xs: "6px 12px", sm: "8px 16px" },
    fontSize: { xs: "14px", sm: "16px" },
    fontWeight: "400",
    display: "flex",
    alignItems: "center",
    cursor: "pointer",
    color: "var(--joy-palette-text-primary)",
    "&:hover": { backgroundColor: "var(--joy-palette-background-mainBg)" },
  };

  const iconStyle = {
    marginRight: { xs: "10px", sm: "14px" },
  };

  if (!userInfo) {
    return (
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
    );
  }

  if (error || !isSystemAdministrator(userInfo)) {
    const httpError = error as HttpError;
    let status: number | undefined = httpError?.response?.status;

    if (!status && httpError?.message?.includes("status:")) {
      const match = httpError.message.match(/status: (\d+)/);
      status = match ? parseInt(match[1] ?? "0", 10) : undefined;
    }

    if (status === 403 || !(isSystemAdministrator(userInfo) || isCustomerSuccess(userInfo))) {
      return (
        <Box sx={{ textAlign: "center", mt: { xs: 10, sm: 20, md: 35 } }}>
          <Typography
            sx={{
              fontSize: { xs: "18px", sm: "22px", md: "24px" },
              fontWeight: "600",
              color: "var(--joy-palette-text-primary)",
            }}
          >
            Access Denied
          </Typography>
          <Typography
            sx={{
              fontSize: { xs: "12px", sm: "13px", md: "14px" },
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
            >
              Customer Management
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
                  borderRight: { sm: "1px solid #E5E7EB" },
                  display: "flex",
                  alignItems: "center",
                  paddingRight: { sm: "16px" },
                  paddingBottom: { xs: "8px", sm: 0 },
                  gap: { xs: "8px", sm: "12px" },
                  flexWrap: "wrap",
                }}
              >
                <Typography
                  level="body-sm"
                  sx={{ fontSize: { xs: "12px", sm: "14px" } }}
                >
                  {selectedRows.length} row
                  {selectedRows.length > 1 ? "s" : ""} selected
                </Typography>
                <IconButton
                  onClick={handleDelete}
                  sx={{
                    bgcolor: "#FEE2E2",
                    color: "#EF4444",
                    borderRadius: "50%",
                    width: { xs: 28, sm: 32 },
                    height: { xs: 28, sm: 32 },
                    "&:hover": {
                      bgcolor: "#FECACA",
                    },
                  }}
                >
                  <TrashIcon fontSize="var(--Icon-fontSize)" />
                </IconButton>
              </Box>
            ) : null}
            <Filter
              customers={customers}
              onFilterCustomers={handleFilter}
              onClose={handleCloseFilter}
              open={isFilterOpen}
              onOpen={handleOpenFilter}
              initialFilters={filters}
            />
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
              Add customer
            </Button>
          </Stack>
        </Stack>

        {isLoading ? (
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
            <Box
              sx={{
                overflowX: "auto",
                width: "100%",
                "&::-webkit-scrollbar": {
                  height: "8px",
                },
                "&::-webkit-scrollbar-thumb": {
                  backgroundColor: "var(--joy-palette-divider)",
                  borderRadius: "4px",
                },
              }}
            >
              <Table
                aria-label="customer management table"
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
                    <th style={{ width: "5%", minWidth: "40px" }}>
                      <Checkbox
                        checked={
                          hasResults && selectedRows.length === customers.length
                        }
                        indeterminate={
                          hasResults &&
                          selectedRows.length > 0 &&
                          selectedRows.length < customers.length
                        }
                        onChange={handleSelectAllChange}
                        disabled={!hasResults}
                        sx={{ transform: { xs: "scale(0.9)", sm: "scale(1)" } }}
                      />
                    </th>
                    <th
                      style={{ width: "30%", minWidth: "150px" }}
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
                          "&:hover .sort-icon": {
                            opacity: 1,
                          },
                        }}
                      >
                        Customer
                        <SortIcon
                          className="sort-icon"
                          fontSize="16"
                          color="var(--joy-palette-text-secondary)"
                        />
                      </Box>
                    </th>
                    <th
                      style={{ width: "25%", minWidth: "120px" }}
                      onClick={() => handleSort("customerSuccessId")}
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
                          "&:hover .sort-icon": {
                            opacity: 1,
                          },
                        }}
                      >
                        Manager
                        <SortIcon
                          className="sort-icon"
                          fontSize="16"
                          color="var(--joy-palette-text-secondary)"
                        />
                      </Box>
                    </th>
                    <th
                      style={{ width: "20%", minWidth: "100px" }}
                      onClick={() => handleSort("numberOfUsers")}
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
                          "&:hover .sort-icon": {
                            opacity: 1,
                          },
                        }}
                      >
                        Users
                        <SortIcon
                          className="sort-icon"
                          fontSize="16"
                          color="var(--joy-palette-text-secondary)"
                        />
                      </Box>
                    </th>
                    <th
                      style={{ width: "20%", minWidth: "100px" }}
                      onClick={() => handleSort("subscriptionId")}
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
                          "&:hover .sort-icon": {
                            opacity: 1,
                          },
                        }}
                      >
                        Subscription
                        <SortIcon
                          className="sort-icon"
                          fontSize="16"
                          color="var(--joy-palette-text-secondary)"
                        />
                      </Box>
                    </th>
                    <th style={{ width: "60px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {customers.length === 0 ? (
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
                    customers.map((customer, index) => (
                      <tr
                        key={customer.customer_id}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleOpenDetail(event, customer.customer_id);
                        }}
                      >
                        <td>
                          <Checkbox
                            checked={selectedRows.includes(customer.customer_id)}
                            onChange={(event) => {
                              event.stopPropagation();
                              handleRowCheckboxChange(customer.customer_id)
                            }}
                            onClick={(event) => {
                              event.stopPropagation();
                            }}
                            sx={{
                              transform: { xs: "scale(0.9)", sm: "scale(1)" },
                            }}
                          />
                        </td>
                        <td>
                          <Stack
                            direction="row"
                            spacing={1}
                            sx={{ alignItems: "center" }}
                          >
                            <Typography
                              sx={{
                                wordBreak: "break-all",
                                fontSize: { xs: "12px", sm: "14px" },
                                maxWidth: { xs: "100px", sm: "none" },
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {customer.name.slice(0, 85)}
                            </Typography>
                            {/* <Tooltip
                              title={customer.status}
                              placement="top"
                              sx={{
                                background: "#DAD8FD",
                                color: "#3D37DD",
                                textTransform: "capitalize",
                                fontSize: { xs: "10px", sm: "12px" },
                              }}
                            >
                              <Box
                                sx={{
                                  bgcolor:
                                    customer.status === "active"
                                      ? "#1A7D36"
                                      : customer.status === "inactive"
                                      ? "#D3232F"
                                      : "#FAE17D",
                                  borderRadius: "50%",
                                  width: { xs: "8px", sm: "10px" },
                                  minWidth: { xs: "8px", sm: "10px" },
                                  height: { xs: "8px", sm: "10px" },
                                  display: "inline-block",
                                }}
                              />
                            </Tooltip> */}
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
                              maxWidth: { xs: "80px", sm: "none" },
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {typeof customer.customerSuccess?.name === "string"
                              ? customer.customerSuccess?.name.slice(0, 75)
                              : customer.customerSuccess?.name || "N/A"}
                            <br />
                            {typeof customer.customerSuccess?.email === "string"
                              ? customer.customerSuccess?.email.slice(0, 75)
                              : customer.customerSuccess?.email || "N/A"}
                          </Box>
                        </td>
                        <td
                          style={{
                            fontWeight: 400,
                            color: "var(--joy-palette-text-secondary)",
                          }}
                        >
                          {customer?.numberOfUsers}
                        </td>
                        <td
                          style={{
                            color: "var(--joy-palette-text-secondary)",
                          }}
                        >
                          <Box
                            sx={{
                              padding: { xs: "2px 6px", sm: "2px 8px" },
                              borderRadius: "12px",
                              fontWeight: 500,
                              fontSize: { xs: "10px", sm: "12px" },
                              width: "fit-content",
                              color:
                                customer.subscriptionName === "Premium"
                                  ? colorScheme === 'dark' ? '#e8e8fc' : "#3D37DD"
                                  : customer.subscriptionName === "Enterprise"
                                  ? colorScheme === 'dark' ? '#ffe288' : "#4D2D00"
                                  : customer.subscriptionName === "Basic"
                                  ? colorScheme === 'dark' ? '#ffffff' : "#272930"
                                  : colorScheme === 'dark' ? '#9e9e9e' : "#272930",
                              bgcolor:
                                customer.subscriptionName === "Premium"
                                  ? colorScheme === 'dark' ? '#221f7b' : "#DAD8FD"
                                  : customer.subscriptionName === "Enterprise"
                                  ? colorScheme === 'dark' ? '#943a0c' : "#FFF8C5"
                                  : customer.subscriptionName === "Basic"
                                  ? colorScheme === 'dark' ? 'rgba(107, 114, 128, 0.2)' : "#EEEFF0"
                                  : colorScheme === 'dark' ? 'none' : "none"
                            }}
                          >
                            {customer?.subscriptionName || "N/A"}
                          </Box>
                        </td>
                        <td>
                          <IconButton
                            size="sm"
                            onClick={(event) => {
                              handleMenuOpen(event, index);
                            }}
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
                              minWidth: "120px",
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
                                handleEdit(customer.customer_id);
                              }}
                              sx={menuItemStyle}
                            >
                              <PencilIcon
                                fontSize="16px"
                                style={{ marginRight: "10px" }}
                              />
                              Edit
                            </Box>
                            <Box
                              onMouseDown={(event) => {
                                event.preventDefault();
                                handleOpenDetail(event, customer.customer_id);
                              }}
                              sx={menuItemStyle}
                            >
                              <EyeIcon
                                fontSize="16px"
                                style={{ marginRight: "10px" }}
                              />
                              View details
                            </Box>
                          </Popper>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </Box>
          </>
        )}

        {(customers.length > 0 || isLoading) && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              mt: { xs: 2, sm: 3 },
              mb: { xs: 2, sm: 0 },
              position: { xs: "relative", sm: "relative" },
              zIndex: 1000,
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
      </Stack>

      <DeleteDeactivateUserModal
        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        onConfirm={confirmDelete}
        usersToDelete={customersToDelete}
        title="Delete customer"
        description="Are you sure you want to delete this customer?"
      />

      <AddEditCustomer
        open={openEditCustomerModal}
        onClose={handleCloseEditModal}
        customerId={customerToEditId}
      />

      <AddEditCustomer
        open={openAddCustomerModal}
        onClose={handleCloseAddUserModal}
      />
    </Box>
  );
}
