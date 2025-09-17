import * as React from "react";
import Box from "@mui/joy/Box";
import Button from "@mui/joy/Button";
import Sheet from "@mui/joy/Sheet";
import Typography from "@mui/joy/Typography";
import Stack from "@mui/joy/Stack";
import Checkbox from "@mui/joy/Checkbox";
import { Funnel as FunnelIcon } from "@phosphor-icons/react/dist/ssr/Funnel";
import { X as XIcon } from "@phosphor-icons/react/dist/ssr/X";
import { ArrowRight as ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { Popper } from "@mui/base/Popper";
import { ClickAwayListener } from "@mui/base/ClickAwayListener";
import { useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/joy/styles";
import { useQuery } from "@tanstack/react-query";
import { getUsers } from "@/lib/api/users";
import { getCustomers } from "@/lib/api/customers";
import { getNotificationsTypes } from "@/lib/api/notifications";

interface NotificationFilterProps {
  onFilter: (filters: {
    type: string[];
    channel: string[];
    user: number[];
    customer: number[];
  }) => void;
  onClose: () => void;
  open: boolean;
  onOpen: () => void;
}

export default function NotificationFilter({
  onFilter,
  onClose,
  open,
  onOpen,
}: NotificationFilterProps): React.JSX.Element {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [selectedTypes, setSelectedTypes] = React.useState<string[]>([]);
  const [selectedChannels, setSelectedChannels] = React.useState<string[]>([]);
  const [selectedUserIds, setSelectedUserIds] = React.useState<number[]>([]);
  const [selectedCustomerIds, setSelectedCustomerIds] = React.useState<number[]>([]);
  const [activeCategory, setActiveCategory] = React.useState<string | null>("Type");
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const sheetRef = React.useRef<HTMLDivElement | null>(null);

  const { data: notificationTypes, isLoading: isNotificationTypesLoading } = useQuery({
    queryKey: ["notificationTypes"],
    queryFn: getNotificationsTypes,
  });

  const uniqueTypes = notificationTypes?.types || [];
  const uniqueChannels = notificationTypes?.channels || [];

  const { data: users, isLoading: isUsersLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => getUsers({}),
    enabled: open,
  });

  const { data: customers, isLoading: isCustomersLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: getCustomers,
    enabled: open,
  });

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    onOpen();
  };

  const handleClose = () => {
    setAnchorEl(null);
    onClose();
  };

  const handleCategoryClick = (category: string) => {
    setActiveCategory(category === activeCategory ? null : category);
  };

  const handleTypeToggle = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type]
    );
  };

  const handleChannelToggle = (channel: string) => {
    setSelectedChannels((prev) =>
      prev.includes(channel)
        ? prev.filter((c) => c !== channel)
        : [...prev, channel]
    );
  };

  const handleUserToggle = (userId: number) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((u) => u !== userId)
        : [...prev, userId]
    );
  };

  const handleCustomerToggle = (customerId: number) => {
    setSelectedCustomerIds((prev) =>
      prev.includes(customerId)
        ? prev.filter((c) => c !== customerId)
        : [...prev, customerId]
    );
  };

  const handleApply = () => {
    onFilter({
      type: selectedTypes,
      channel: selectedChannels,
      user: selectedUserIds,
      customer: selectedCustomerIds,
    });
    handleClose();
  };

  const handleClear = (event: React.MouseEvent<SVGSVGElement | HTMLButtonElement>) => {
    event.stopPropagation();
    setSelectedTypes([]);
    setSelectedChannels([]);
    setSelectedUserIds([]);
    setSelectedCustomerIds([]);
    onFilter({
      type: [],
      channel: [],
      user: [],
      customer: [],
    });
  };

  const filterCount = selectedTypes.length + selectedChannels.length + selectedUserIds.length + selectedCustomerIds.length;

  return (
    <>
      <Button
        variant="outlined"
        startDecorator={
          filterCount > 0 ? (
            <XIcon fontSize="var(--Icon-fontSize)" onClick={handleClear} />
          ) : (
            <FunnelIcon fontSize="var(--Icon-fontSize)" />
          )
        }
        onClick={handleClick}
        sx={{
          borderColor:
            filterCount > 0
              ? "transparent"
              : "var(--joy-palette-divider)",
          borderRadius: "20px",
          background:
            filterCount > 0
              ? "#C7C5FC"
              : "var(--joy-palette-background-mainBg)",
          color:
            filterCount > 0
              ? "#3D37DD"
              : "var(--joy-palette-text-primary)",
          padding: { xs: "6px 12px", sm: "7px 14px" },
          fontSize: { xs: "12px", sm: "14px" },
          width: { xs: "100%", sm: "auto" },
        }}
      >
        {filterCount > 0
          ? `${filterCount} filter${
              filterCount !== 1 ? "s" : ""
            } apply`
          : "Filter"}
      </Button>

      {open && anchorEl && (
        <ClickAwayListener onClickAway={handleClose}>
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
                  {filterCount} filter
                  {filterCount !== 1 ? "s" : ""} apply
                </Typography>
                <Stack
                  spacing={1}
                  sx={{
                    borderRight: { sm: "1px solid var(--joy-palette-divider)" },
                    paddingRight: { sm: "20px" },
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      p: { xs: "4px 8px", sm: "6px 12px" },
                      bgcolor:
                        activeCategory === "Type"
                          ? "var(--joy-palette-background-mainBg)"
                          : "transparent",
                      borderRadius: "4px",
                      border:
                        activeCategory === "Type"
                          ? "1px solid var(--joy-palette-divider)"
                          : "none",
                      cursor: "pointer",
                    }}
                    onClick={() => handleCategoryClick("Type")}
                  >
                    <Typography
                      level="body-md"
                      fontWeight="400"
                      sx={{
                        color:
                          activeCategory === "Type"
                            ? "var(--joy-palette-text-primary)"
                            : "#32383E",
                        fontSize: { xs: "14px", sm: "16px" },
                      }}
                    >
                      Type
                    </Typography>
                    <ArrowRightIcon fontSize="var(--Icon-fontSize)" />
                  </Box>

                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      p: { xs: "4px 8px", sm: "6px 12px" },
                      bgcolor:
                        activeCategory === "Channel"
                          ? "var(--joy-palette-background-mainBg)"
                          : "transparent",
                      borderRadius: "4px",
                      border:
                        activeCategory === "Channel"
                          ? "1px solid var(--joy-palette-divider)"
                          : "none",
                      cursor: "pointer",
                    }}
                    onClick={() => handleCategoryClick("Channel")}
                  >
                    <Typography
                      level="body-md"
                      fontWeight="400"
                      sx={{
                        color:
                          activeCategory === "Channel"
                            ? "var(--joy-palette-text-primary)"
                            : "#32383E",
                        fontSize: { xs: "14px", sm: "16px" },
                      }}
                    >
                      Channel
                    </Typography>
                    <ArrowRightIcon fontSize="var(--Icon-fontSize)" />
                  </Box>

                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      p: { xs: "4px 8px", sm: "6px 12px" },
                      bgcolor:
                        activeCategory === "User"
                          ? "var(--joy-palette-background-mainBg)"
                          : "transparent",
                      borderRadius: "4px",
                      border:
                        activeCategory === "User"
                          ? "1px solid var(--joy-palette-divider)"
                          : "none",
                      cursor: "pointer",
                    }}
                    onClick={() => handleCategoryClick("User")}
                  >
                    <Typography
                      level="body-md"
                      fontWeight="400"
                      sx={{
                        color:
                          activeCategory === "User"
                            ? "var(--joy-palette-text-primary)"
                            : "#32383E",
                        fontSize: { xs: "14px", sm: "16px" },
                      }}
                    >
                      User
                    </Typography>
                    <ArrowRightIcon fontSize="var(--Icon-fontSize)" />
                  </Box>

                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      p: { xs: "4px 8px", sm: "6px 12px" },
                      bgcolor:
                        activeCategory === "Customer"
                          ? "var(--joy-palette-background-mainBg)"
                          : "transparent",
                      borderRadius: "4px",
                      border:
                        activeCategory === "Customer"
                          ? "1px solid var(--joy-palette-divider)"
                          : "none",
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
                </Stack>
              </Box>

              <Box sx={{ width: { xs: "100%", sm: "42%" }, pl: { sm: 1 } }}>
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
                      {activeCategory === "Type" &&
                        uniqueTypes.map((type) => (
                          <Box
                            key={type}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1.5,
                            }}
                          >
                            <Checkbox
                              checked={selectedTypes.includes(type)}
                              onChange={() => handleTypeToggle(type)}
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
                              {type.charAt(0).toUpperCase() + type.slice(1)}
                            </Typography>
                          </Box>
                        ))}
                      {activeCategory === "Channel" &&
                        uniqueChannels.map((channel) => (
                          <Box
                            key={channel}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1.5,
                            }}
                          >
                            <Checkbox
                              checked={selectedChannels.includes(channel)}
                              onChange={() => handleChannelToggle(channel)}
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
                              {channel.charAt(0).toUpperCase() + channel.slice(1)}
                            </Typography>
                          </Box>
                        ))}
                      {activeCategory === "User" && (
                        <Box
                          sx={{
                            maxHeight: { xs: "200px", sm: "250px" },
                            overflowY: "auto",
                            borderRadius: "4px",
                            p: 1,
                          }}
                        >
                          <Stack spacing={1}>
                            {users?.data.map((user) => (
                              <Box
                                key={user.id}
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1.5,
                                }}
                              >
                                <Checkbox
                                  checked={selectedUserIds.includes(user.id)}
                                  onChange={() => handleUserToggle(user.id)}
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
                                  {user.firstName && user.lastName 
                                    ? `${user.firstName} ${user.lastName}`
                                    : user.email || 'Unknown User'
                                  }
                                </Typography>
                              </Box>
                            ))}
                          </Stack>
                        </Box>
                      )}
                      {activeCategory === "Customer" && (
                        <Box
                          sx={{
                            maxHeight: { xs: "200px", sm: "250px" },
                            overflowY: "auto",
                            borderRadius: "4px",
                            p: 1,
                          }}
                        >
                          <Stack spacing={1}>
                            {customers?.map((customer) => (
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
                                  onChange={() => handleCustomerToggle(customer.id)}
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
                onClick={handleClear}
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
                }}
              >
                <Button
                  variant="outlined"
                  onClick={handleClose}
                  sx={{
                    fontSize: { xs: "12px", sm: "14px" },
                    width: { xs: "48%", sm: "auto" },
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="solid"
                  onClick={handleApply}
                  sx={{
                    borderRadius: "20px",
                    bgcolor: "#4F46E5",
                    color: "#FFFFFF",
                    fontSize: { xs: "12px", sm: "14px" },
                    fontWeight: 500,
                    px: { xs: 2, sm: 3 },
                    py: 1,
                    "&:hover": { bgcolor: "#4338CA" },
                    width: { xs: "48%", sm: "auto" },
                  }}
                >
                  Apply
                </Button>
              </Stack>
            </Stack>
          </Sheet>
        </ClickAwayListener>
      )}
    </>
  );
} 