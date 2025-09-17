"use client";

import * as React from "react";
import { useEffect, useState, useRef } from "react";
import Sheet from "@mui/joy/Sheet";
import Typography from "@mui/joy/Typography";
import Stack from "@mui/joy/Stack";
import Box from "@mui/joy/Box";
import Button from "@mui/joy/Button";
import Checkbox from "@mui/joy/Checkbox";
import { Funnel as FunnelIcon } from "@phosphor-icons/react/dist/ssr/Funnel";
import { CaretRight as ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { X as X } from "@phosphor-icons/react/dist/ssr/X";
import { ApiUser, Customer } from "@/contexts/auth/types";
import { useQuery } from "@tanstack/react-query";
import { getCustomers, getSubscriptions } from "@/lib/api/customers";
import { getRoles } from "@/lib/api/roles";
import { getManagers } from "@/lib/api/managers";
import { getStatuses } from "@/lib/api/users";

interface FilterProps {
  users?: ApiUser[];
  customers?: Customer[];
  onClose?: () => void;
  open?: boolean;
  onOpen?: () => void;
  onFilter?: (filters: {
    statusId: string[];
    customerId: number[];
    roleId: number[];
  }) => void;
  onFilterCustomers?: (filters: {
    customerSuccessId: number[];
    subscriptionId: number[];
    statusId: string[];
  }) => void;
  initialFilters?: {
    customerSuccessId: number[];
    subscriptionId: number[];
    statusId: string[];
  };
}

const Filter = ({
  users,
  customers,
  onFilter,
  onFilterCustomers,
  onClose,
  open = false,
  onOpen,
  initialFilters,
}: FilterProps) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(initialFilters?.statusId || []);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<number[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
  const [selectedManagerIds, setSelectedManagerIds] = useState<number[]>(initialFilters?.customerSuccessId || []);
  const [selectedSubscriptionIds, setSelectedSubscriptionIds] = useState<number[]>(initialFilters?.subscriptionId || []);
  const [activeCategory, setActiveCategory] = useState<string | null>(users && users?.length > 0 ? "Status" : "Manager");

  const sheetRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (initialFilters) {
      setSelectedStatuses(initialFilters.statusId);
      setSelectedManagerIds(initialFilters.customerSuccessId);
      setSelectedSubscriptionIds(initialFilters.subscriptionId);
    }
  }, [initialFilters]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        sheetRef.current &&
        !sheetRef.current.contains(event.target as Node) &&
        anchorEl &&
        !anchorEl.contains(event.target as Node)
      ) {
        handleClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [anchorEl]);

  useEffect(() => {
    const handleCloseFilter = () => {
      setAnchorEl(null);
      setActiveCategory("Status");
      if (onClose) {
        onClose();
      }
    };
  }, [onClose]);

  const { data: customersSelect, isLoading: isCustomersLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: getCustomers,
    enabled: open,
  });

  const { data: managersSelect, isLoading: isManagersLoading } = useQuery({
    queryKey: ["managers"],
    queryFn: getManagers,
    enabled: open,
  });

  const { data: roles, isLoading: isRolesLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: getRoles,
    enabled: open,
  });

  const { data: subscriptions, isLoading: isSubscriptionsLoading } = useQuery({
    queryKey: ["subscriptions"],
    queryFn: getSubscriptions,
    enabled: open,
  });

  const { data: statuses, isLoading: isStatusesLoading } = useQuery({
    queryKey: ["statuses"],
    queryFn: getStatuses,
    enabled: open,
  });

  const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
    if (onOpen) {
      onOpen();
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
    setActiveCategory("Status");
    if (onClose) {
      onClose();
    }
  };

  const handleCategoryClick = (category: string) => {
    setActiveCategory(category === activeCategory ? null : category);
  };

  const handleStatusChange = (status: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  const handleCustomerChange = (customerId: number) => {
    setSelectedCustomerIds((prev) =>
      prev.includes(customerId)
        ? prev.filter((c) => c !== customerId)
        : [...prev, customerId]
    );
  };

  const handleRoleChange = (roleId: number) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId)
        ? prev.filter((r) => r !== roleId)
        : [...prev, roleId]
    );
  };

  const handleManagerChange = (managerId: number) => {
    setSelectedManagerIds((prev) =>
      prev.includes(managerId)
        ? prev.filter((m) => m !== managerId)
        : [...prev, managerId]
    );
  };

  const handleSubscriptionChange = (subscriptionId: number) => {
    setSelectedSubscriptionIds((prev) =>
      prev.includes(subscriptionId)
        ? prev.filter((s) => s !== subscriptionId)
        : [...prev, subscriptionId]
    );
  };

  const handleApply = () => {
    if (users && onFilter) {
      onFilter({
        statusId: selectedStatuses,
        customerId: selectedCustomerIds,
        roleId: selectedRoleIds,
      });
    }
    if (customers && onFilterCustomers) {
      onFilterCustomers({
        customerSuccessId: selectedManagerIds,
        subscriptionId: selectedSubscriptionIds,
        statusId: selectedStatuses,
      });
    }
    handleClose();
  };

  const handleReset = (
    event: React.MouseEvent<SVGSVGElement | HTMLButtonElement>
  ) => {
    event.stopPropagation();
    setSelectedStatuses([]);
    setSelectedCustomerIds([]);
    setSelectedRoleIds([]);
    setSelectedManagerIds([]);
    setSelectedSubscriptionIds([]);
    if (users && onFilter) {
      onFilter({ statusId: [], customerId: [], roleId: [] });
    }
    if (customers && onFilterCustomers) {
      onFilterCustomers({ customerSuccessId: [], subscriptionId: [], statusId: [] });
    }
  };

  const totalFiltersApplied =
    selectedStatuses.length +
    selectedCustomerIds.length +
    selectedRoleIds.length +
    selectedManagerIds.length +
    selectedSubscriptionIds.length;

  return (
    <>
      <Button
        variant="outlined"
        startDecorator={
          totalFiltersApplied > 0 ? (
            <X fontSize="var(--Icon-fontSize)" onClick={handleReset} />
          ) : (
            <FunnelIcon fontSize="var(--Icon-fontSize)" color="var(--joy-palette-text-secondary)" />
          )
        }
        onClick={handleOpen}
        sx={{
          borderColor:
            totalFiltersApplied > 0
              ? "transparent"
              : "transparent",
          borderRadius: "20px",
          background:
            totalFiltersApplied > 0
              ? "#C7C5FC"
              : "var(--joy-palette-background-mainBg)",
          color:
            totalFiltersApplied > 0
              ? "#3D37DD"
              : "var(--joy-palette-text-primary)",
          padding: { xs: "6px 12px", sm: "7px 14px" },
          fontSize: { xs: "12px", sm: "14px" },
          width: { xs: "100%", sm: "auto" },
          "&:hover": {
            background: "#DDDEE0",
          },
        }}
      >
        {totalFiltersApplied > 0
          ? `${totalFiltersApplied} filter${
              totalFiltersApplied !== 1 ? "s" : ""
            } apply`
          : "Filter"}
      </Button>

      {open && anchorEl && (
        <Sheet
          ref={sheetRef}
          sx={{
            position: "absolute",
            top: {
              xs: anchorEl.getBoundingClientRect().bottom + 5,
              sm: anchorEl.getBoundingClientRect().bottom + 10,
            },
            left: { xs: "10px", sm: "auto" },
            right: { xs: "10px", sm: "9.5vw" },
            width: { xs: "calc(100% - 20px)", sm: "550px", md: "600px" },
            maxHeight: { xs: "70vh", sm: "80vh" },
            overflowY: "auto",
            borderRadius: "8px",
            boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
            border: "1px solid var(--joy-palette-divider)",
            zIndex: 1300,
            p: { xs: 1.5, sm: 2 },
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={{ xs: 2, sm: 1 }}
          >
            <Box sx={{ width: { xs: "100%", sm: "58%" }, pr: { sm: 1 } }}>
              <Typography
                level="body-sm"
                sx={{
                  color: "var(--joy-palette-text-secondary)",
                  fontSize: { xs: "10px", sm: "12px" },
                  mb: { xs: 1, sm: 1.5 },
                }}
              >
                {totalFiltersApplied} filter
                {totalFiltersApplied !== 1 ? "s" : ""} apply
              </Typography>
              <Stack
                spacing={1}
                sx={{
                  paddingRight: { sm: "5px" },
                }}
              >
                {users && users?.length > 0 && (
                  <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    p: { xs: "4px 8px", sm: "6px 12px" },
                    bgcolor:
                      activeCategory === "Status"
                        ? "#EEEFF0"
                        : "transparent",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                  onClick={() => handleCategoryClick("Status")}
                >
                  <Typography
                    level="body-md"
                    fontWeight="400"
                    sx={{
                      color:
                        activeCategory === "Status"
                          ? "var(--joy-palette-text-primary)"
                          : "#32383E",
                      fontSize: { xs: "14px", sm: "16px" },
                    }}
                  >
                    Status
                  </Typography>
                  <ArrowRightIcon fontSize="var(--Icon-fontSize)" />
                </Box>
                )}
                {users && users?.length > 0 && (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      p: { xs: "4px 8px", sm: "6px 12px" },
                      bgcolor:
                        activeCategory === "Customer"
                          ? "#EEEFF0"
                          : "transparent",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                    onClick={() => handleCategoryClick("Customer")}
                  >
                    <Typography
                      level="body-md"
                      fontWeight="400"
                      sx={{
                        color:
                          activeCategory === "Customer"
                            ? "var(--joy-palette-text-primary)"
                            : "#32383E",
                        fontSize: { xs: "14px", sm: "16px" },
                      }}
                    >
                      Customer
                    </Typography>
                    <ArrowRightIcon fontSize="var(--Icon-fontSize)" />
                  </Box>
                )}
                {users && users?.length > 0 && (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      p: { xs: "4px 8px", sm: "6px 12px" },
                      bgcolor:
                        activeCategory === "Role"
                          ? "#EEEFF0"
                          : "transparent",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                    onClick={() => handleCategoryClick("Role")}
                  >
                    <Typography
                      level="body-md"
                      fontWeight="400"
                      sx={{
                        color:
                          activeCategory === "Role"
                            ? "var(--joy-palette-text-primary)"
                            : "#32383E",
                        fontSize: { xs: "14px", sm: "16px" },
                      }}
                    >
                      Role
                    </Typography>
                    <ArrowRightIcon fontSize="var(--Icon-fontSize)" />
                  </Box>
                )}
                {customers && customers?.length > 0 && (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      p: { xs: "4px 8px", sm: "6px 12px" },
                      bgcolor:
                        activeCategory === "Manager"
                          ? "var(--joy-palette-background-mainBg)"
                          : "transparent",
                      borderRadius: "4px",
                      border:
                        activeCategory === "Manager"
                          ? "1px solid var(--joy-palette-divider)"
                          : "none",
                      cursor: "pointer",
                    }}
                    onClick={() => handleCategoryClick("Manager")}
                  >
                    <Typography
                      level="body-md"
                      fontWeight="400"
                      sx={{
                        color:
                          activeCategory === "Manager"
                          ? "var(--joy-palette-text-primary)"
                          : "#32383E",
                        fontSize: { xs: "14px", sm: "16px" },
                      }}
                    >
                      Manager
                    </Typography>
                    <ArrowRightIcon fontSize="var(--Icon-fontSize)" />
                  </Box>
                )}
                {customers && customers?.length > 0 && (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      p: { xs: "4px 8px", sm: "6px 12px" },
                      bgcolor:
                        activeCategory === "Subscription"
                          ? "var(--joy-palette-background-mainBg)"
                          : "transparent",
                      borderRadius: "4px",
                      border:
                        activeCategory === "Subscription"
                          ? "1px solid var(--joy-palette-divider)"
                          : "none",
                      cursor: "pointer",
                    }}
                    onClick={() => handleCategoryClick("Subscription")}
                  >
                    <Typography
                      level="body-md"
                      fontWeight="400"
                      sx={{
                        color:
                          activeCategory === "Subscription"
                            ? "var(--joy-palette-text-primary)"
                            : "#32383E",
                        fontSize: { xs: "14px", sm: "16px" },
                      }}
                    >
                      Subscription
                    </Typography>
                    <ArrowRightIcon fontSize="var(--Icon-fontSize)" />
                  </Box>
                )}
              </Stack>
            </Box>

            <Box sx={{ width: { xs: "100%", sm: "42%" }, pl: { sm: '20px' }, borderLeft: { sm: "1px solid var(--joy-palette-divider)" }, }}>
              {activeCategory && (
                <>
                  <Typography
                    level="body-md"
                    fontWeight="600"
                    sx={{
                      fontSize: { xs: "10px", sm: "12px" },
                      mb: { xs: 1, sm: 1.5 },
                      color: "var(--joy-palette-text-primary)",
                    }}
                  >
                    Select {activeCategory.toLowerCase()}
                  </Typography>
                  <Stack spacing={1}>
                    {activeCategory === "Status" && users && users?.length > 0 &&
                      statuses?.map((status) => (
                        <Box
                          key={status}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1.5,
                          }}
                        >
                          <Checkbox
                            checked={selectedStatuses.includes(status)}
                            onChange={() => handleStatusChange(status)}
                            sx={{
                              transform: { xs: "scale(0.9)", sm: "scale(1)" },
                            }}
                          />
                          <Typography
                            level="body-sm"
                            sx={{
                              fontSize: { xs: "12px", sm: "14px" },
                              color: "var(--joy-palette-text-primary)",
                            }}
                          >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </Typography>
                        </Box>
                      ))}
                    {activeCategory === "Customer" && (
                      <Box
                        sx={{
                          maxHeight: "200px",
                          overflowY: "auto",
                          pr: 1,
                        }}
                      >
                        <Stack spacing={1}>
                          {customersSelect?.map((customer) => (
                            <Box
                              key={customer.id}
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1.5,
                              }}
                            >
                              <Checkbox
                                checked={selectedCustomerIds.includes(customer.id)}
                                onChange={() => handleCustomerChange(customer.id)}
                                sx={{
                                  transform: { xs: "scale(0.9)", sm: "scale(1)" },
                                }}
                              />
                              <Typography
                                level="body-sm"
                                sx={{
                                  fontSize: { xs: "12px", sm: "14px" },
                                  color: "var(--joy-palette-text-primary)",
                                }}
                              >
                                {customer.name}
                              </Typography>
                            </Box>
                          ))}
                        </Stack>
                      </Box>
                    )}
                    {activeCategory === "Role" && (
                      <Box
                        sx={{
                          maxHeight: "200px",
                          overflowY: "auto",
                          pr: 1,
                        }}
                      >
                        <Stack spacing={1}>
                          {roles?.map((role) => (
                            <Box
                              key={role.id}
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1.5,
                              }}
                            >
                              <Checkbox
                                checked={selectedRoleIds.includes(role.id)}
                                onChange={() => handleRoleChange(role.id)}
                                sx={{
                                  transform: { xs: "scale(0.9)", sm: "scale(1)" },
                                }}
                              />
                              <Typography
                                level="body-sm"
                                sx={{
                                  fontSize: { xs: "12px", sm: "14px" },
                                  color: "var(--joy-palette-text-primary)",
                                }}
                              >
                                {role.name}
                              </Typography>
                            </Box>
                          ))}
                        </Stack>
                      </Box>
                    )}
                    {activeCategory === "Manager" && (
                      <Box
                        sx={{
                          maxHeight: "200px",
                          overflowY: "auto",
                          pr: 1,
                        }}
                      >
                        <Stack spacing={1}>
                          {managersSelect?.map((manager) => (
                            <Box
                              key={manager.id}
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1.5,
                              }}
                            >
                              <Checkbox
                                checked={selectedManagerIds.includes(manager.id)}
                                onChange={() => handleManagerChange(manager.id)}
                                sx={{
                                  transform: { xs: "scale(0.9)", sm: "scale(1)" },
                                }}
                              />
                              <Typography
                                level="body-sm"
                                sx={{
                                  fontSize: { xs: "12px", sm: "14px" },
                                  color: "var(--joy-palette-text-primary)",
                                }}
                              >
                                {manager.name}
                              </Typography>
                            </Box>
                          ))}
                        </Stack>
                      </Box>
                    )}
                    {activeCategory === "Subscription" &&
                      subscriptions?.map((subscription) => (
                        <Box
                          key={subscription.id}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1.5,
                          }}
                        >
                          <Checkbox
                            checked={selectedSubscriptionIds.includes(
                              subscription.id
                            )}
                            onChange={() =>
                              handleSubscriptionChange(subscription.id)
                            }
                            sx={{
                              transform: { xs: "scale(0.9)", sm: "scale(1)" },
                            }}
                          />
                          <Typography
                            level="body-sm"
                            sx={{
                              fontSize: { xs: "12px", sm: "14px" },
                              color: "var(--joy-palette-text-primary)",
                            }}
                          >
                            {subscription.name}
                          </Typography>
                        </Box>
                      ))}
                  </Stack>
                </>
              )}
            </Box>
          </Stack>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={{ xs: 1, sm: 1 }}
            sx={{
              justifyContent: { xs: "center", sm: "space-between" },
              alignItems: { xs: "center", sm: "center" },
              mt: { xs: 2, sm: 3 },
            }}
          >
            <Button
              variant="plain"
              onClick={handleReset}
              sx={{
                fontSize: { xs: "12px", sm: "14px" },
                width: { xs: "100%", sm: "auto" },
              }}
            >
              Reset filters
            </Button>
            <Stack
              direction="row"
              spacing={1}
              sx={{
                width: { xs: "100%", sm: "auto" },
                justifyContent: { xs: "space-between", sm: "flex-end" },
                alignItems: { xs: "center", sm: "center" },
              }}
            >
              <Button
                variant="outlined"
                onClick={handleClose}
                sx={{
                  fontSize: { xs: "12px", sm: "14px" },
                  width: { xs: "48%", sm: "auto" },
                  height: { xs: "32px", sm: "40px" },
                }}
              >
                Cancel
              </Button>
              <Button
                variant="solid"
                onClick={handleApply}
                sx={{
                  borderRadius: "25px",
                  bgcolor: "#4F46E5",
                  color: "#FFFFFF",
                  fontSize: { xs: "12px", sm: "14px" },
                  fontWeight: 500,
                  px: { xs: 2, sm: 3 },
                  py: 1,
                  "&:hover": { bgcolor: "#4338CA" },
                  width: { xs: "48%", sm: "auto" },
                  height: { xs: "32px", sm: "45px" },
                }}
              >
                Apply
              </Button>
            </Stack>
          </Stack>
        </Sheet>
      )}
    </>
  );
};

export default Filter;
