import * as React from "react";
import Box from "@mui/joy/Box";
import Typography from "@mui/joy/Typography";
import Card from "@mui/joy/Card";
import Stack from "@mui/joy/Stack";
import Link from "@mui/joy/Link";
import { Star, RocketLaunch, CodeSimple, Gear, Wrench, IdentificationBadge, WebhooksLogo } from "@phosphor-icons/react/dist/ssr";
import { DotsThree } from "@phosphor-icons/react/dist/ssr/DotsThree";
import { IconButton } from "@mui/joy";
import { Popper } from "@mui/base/Popper";
import { Category } from "@/contexts/auth/types";
import Button from "@mui/joy/Button";
import Input from "@mui/joy/Input";
import Image from "next/image";
import { MagnifyingGlass as SearchIcon } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { paths } from "@/paths";
import { PencilSimple as PencilIcon } from "@phosphor-icons/react/dist/ssr/PencilSimple";
import { Trash as TrashIcon } from "@phosphor-icons/react/dist/ssr/Trash";
import AddEditCategoryModal from "../modals/AddEditCategoryModal";
import DeleteDeactivateUserModal from "../modals/DeleteItemModal";
import { deleteCategory } from "@/lib/api/categories";
import { queryClient } from "@/lib/react-query";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useColorScheme } from '@mui/joy/styles';

const popularArticles = [
  { title: "Best Practices for Data Management and Security", href: "#" },
  { title: "How to Leverage Analytics for Better Decision-Making", href: "#" },
  { title: "API & Developer Tools: Everything You Need to Know", href: "#" },
  { title: "Understanding the Dashboard and Key Features", href: "#" },
];

const teamFavourite = [
  { title: "Setting Up Your Account: A Step-by-Step Guide", href: "#" },
  { title: "Understanding the Dashboard and Key Features", href: "#" },
  { title: "Managing Multi-Tenant Access and Security", href: "#" },
  { title: "How to Integrate with Third-Party Services", href: "#" },
  { title: "Common Issues and How to Fix Them", href: "#" },
];

const iconMap: { [key: string]: React.JSX.Element } = {
  Star: <Star size={22} />,
  RocketLaunch: <RocketLaunch size={22} />,
  Api: <WebhooksLogo size={22} />,
  Code: <CodeSimple size={22} />,
  Settings: <Gear size={22} />,
  Fix: <Wrench size={22} />,
  Badge: <IdentificationBadge size={22} />,
};

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);
}

interface CategoriesListComponentForUsersProps {
  categories: Category[];
  fetchCategories: () => void;
}

interface HttpError {
    response?: {
      data?: {
        message?: string;
      };
    };
  }

const CategoriesListComponentForUsers: React.FC<CategoriesListComponentForUsersProps> = ({ categories, fetchCategories }) => {
  const { colorScheme } = useColorScheme();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const categoryToDeleteRef = useRef<number | null>(null);
  const [openEditCategoryModal, setOpenEditCategoryModal] = useState(false);
  const [openDeleteCategoryModal, setOpenDeleteCategoryModal] = useState(false);
  const [pendingEditId, setPendingEditId] = useState<number | null>(null);

  const handleSearch = () => {
    router.push(`/dashboard/documentation?search=${search}`);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (anchorEl && !anchorEl.contains(event.target as Node)) {
        handleMenuClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [anchorEl]);

  const handleCardClick = async (categoryId: number) => {
    try {
      router.push(paths.dashboard.documentation.details(categoryId.toString()));
    } catch (error) {
      console.error("Error fetching category:", error);
    }
  };

  const handleMenuOpen = (
    event: React.MouseEvent<HTMLElement>,
    categoryId: number
  ) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedCategoryId(categoryId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedCategoryId(null);
  };

  const handleEditCategory = (categoryId: number) => {
    setPendingEditId(categoryId);
    handleMenuClose();
  };

  useEffect(() => {
    if (pendingEditId !== null) {
      setSelectedCategoryId(pendingEditId);
      setOpenEditCategoryModal(true);
      setPendingEditId(null);
    }
  }, [pendingEditId]);

  const handleDeleteCategoryModalOpen = (categoryId: number) => {
    categoryToDeleteRef.current = categoryId;
    setSelectedCategoryId(categoryId);
    setOpenDeleteCategoryModal(true);
    handleMenuClose();
  };

  const handleCloseEditCategoryModal = () => {
    setOpenEditCategoryModal(false);
    setSelectedCategoryId(null);
  };

  const handleCloseDeleteCategoryModal = () => {
    setOpenDeleteCategoryModal(false);
    setSelectedCategoryId(null);
    categoryToDeleteRef.current = null;
  };

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: number) => {
      return deleteCategory(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      handleCloseDeleteCategoryModal();
      toast.success("Category has been deleted successfully!");
    },
    onError: (error: unknown) => {
      const httpError = error as HttpError;
      const errorMessage = httpError.response?.data?.message;
      if (errorMessage) {
        toast.error(errorMessage);
      } else {
        toast.error("An error occurred while deleting the category.");
      }
    },
  });

  const handleDeleteCategory = async (categoryId: number) => {
    if (categoryId) {
      deleteCategoryMutation.mutate(categoryId);
    }
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

  return (
    <>
      {/* Banner */}
      <Box
        sx={{
          background: colorScheme === "light" ? "#E9EFF8" : "transparent",
          border: "1px solid var(--joy-palette-divider)",
          borderRadius: "20px",
          px: { xs: 2, sm: 4 },
          py: { xs: 3, sm: 4 },
          mb: 3,
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          alignItems: "center",
          gap: { xs: 2, md: 4 },
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: { xs: 28, sm: 36 },
              mb: 1,
              color: "var(--joy-palette-text-primary)",
            }}
          >
            Your Guide to Getting Things Done
          </Typography>
          <Typography
            sx={{
              color: "var(--joy-palette-text-secondary)",
              fontSize: { xs: 14, sm: 16 },
              fontWeight: 400,
              mb: 6,
              maxWidth: 510,
            }}
          >
            Discover step-by-step guides, best practices, and expert tips to streamline your workflow, solve challenges, and make the most of every feature.
          </Typography>
          <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 2, alignItems: "center", maxWidth: 620 }}>
            <Input
              placeholder="Search in  knowledge base"
              sx={{ flex: 1, backgroundColor: "var(--joy-palette-background-mainBg)", borderRadius: "30px", px: 2, color: "var(--joy-palette-text-secondary)", fontSize: 14, fontWeight: 400 }}
              size="lg"
              endDecorator={null}
              startDecorator={<SearchIcon size={18} color="var(--joy-palette-text-secondary)" />}
            />
            <Button
              variant="solid"
              color="primary"
              sx={{ borderRadius: "30px", px: 3, fontWeight: 600, fontSize: 16 }}
            >
              Search
            </Button>
          </Box>
        </Box>
        <Box
          sx={{
            flex: { xs: "unset", md: 1 },
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            mt: { xs: 3, md: 0 },
            width: { xs: "100%", md: 260 },
            minWidth: 196,
            maxWidth: 196,
          }}
        >
          <Image src="/assets/documents-banner-icon.svg" alt="Banner" width={196} height={196} />
        </Box>
      </Box>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: { xs: 3, md: 4 },
          width: "100%",
          mt: 2,
          alignItems: "flex-start",
        }}
      >
        <Box
          sx={{
            flex: { xs: "unset", md: "0 0 420px" },
            width: { xs: "100%", md: 420 },
            minWidth: 0,
          }}
        >
          <Typography level="h3" fontWeight={600} mb={2}>
            Selected article
          </Typography>
          <Typography level="body-xs" fontWeight={400} fontSize={14} mb={2} sx={{ color: "var(--joy-palette-text-secondary)" }}>
            Popular
          </Typography>
          <Stack spacing={2} mb={5}>
            {popularArticles.map((a) => (
              <Link key={a.title} href={a.href} underline="hover" sx={{ fontSize: 14, color: "#3D37DD" }}>{a.title}</Link>
            ))}
          </Stack>
          <Typography level="body-xs" fontWeight={400} fontSize={14} mb={2} sx={{ color: "var(--joy-palette-text-secondary)" }}>
            Team favourite
          </Typography>
          <Stack spacing={2}>
            {teamFavourite.map((a) => (
              <Typography key={a.title} sx={{ fontSize: 14, color: "var(--joy-palette-text-primary)" }}>{a.title}</Typography>
            ))}
          </Stack>
        </Box>
        <Box sx={{ flex: 1, width: "100%" }}>
          <Typography level="h3" fontWeight={600} mb={2}>
            Explore topics
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "1fr 1fr",
                md: "1fr",
                lg: "1fr",
                xl: "1fr 1fr",
              },
              gap: 2,
              maxWidth: 700,
            }}
          >
            {categories.map((category) => (
              <Card
                key={category.id}
                variant="outlined"
                sx={{
                  p: "16px",
                  borderRadius: "8px",
                  border: "1px solid var(--joy-palette-divider)",
                  boxShadow: "none",
                  backgroundColor: "var(--joy-palette-background-body)",
                  display: "flex",
                  flexDirection: "column",
                  minHeight: "210px",
                  cursor: "pointer",
                  "&:hover": {
                    borderColor: "var(--joy-palette-text-secondary)",
                  },
                  maxWidth: { xs: "100%", sm: "336px" },
                }}
                onClick={() => handleCardClick(category.id)}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '8px',
                      backgroundColor: '#E9EFF8',
                      color: '#3D37DD',
                    }}
                  >
                    {iconMap[category.icon] || <Star size={28} />}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      level="title-md"
                      sx={{
                        fontWeight: "500",
                        fontSize: "14px",
                        color: "var(--joy-palette-text-primary)",
                        wordBreak: "break-word",
                      }}
                    >
                      {category.name.slice(0, 59)}
                    </Typography>
                    <Typography
                      level="body-xs"
                      sx={{
                        mt: 0.5,
                        color: "var(--joy-palette-text-secondary)",
                        fontWeight: "400",
                        fontSize: "12px",
                      }}
                    >
                      {category.subcategory}
                    </Typography>
                  </Box>
                  <IconButton
                    size="sm"
                    onClick={(event) => handleMenuOpen(event, category.id)}
                  >
                    <DotsThree
                      weight="bold"
                      size={22}
                      color="var(--joy-palette-text-secondary)"
                    />
                  </IconButton>
                  <Popper
                    open={selectedCategoryId === category.id && Boolean(anchorEl)}
                    anchorEl={anchorEl}
                    placement="bottom-start"
                    style={{
                      minWidth: "150px",
                      borderRadius: "8px",
                      backgroundColor: "var(--joy-palette-background-surface)",
                      zIndex: 1300,
                      border: "1px solid var(--joy-palette-divider)",
                    }}
                  >
                    <Box
                      onMouseDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        handleEditCategory(category.id);
                      }}
                      sx={menuItemStyle}
                    >
                      <PencilIcon fontSize="20px" style={iconStyle} />
                      Edit
                    </Box>
                    <Box
                      onMouseDown={(event) => {
                        event.preventDefault();
                        handleMenuClose();
                        handleDeleteCategoryModalOpen(category.id);
                      }}
                      sx={{ ...menuItemStyle, color: "#EF4444" }}
                    >
                      <TrashIcon fontSize="20px" style={iconStyle} />
                      Delete
                    </Box>
                  </Popper>
                </Box>
                <Box
                  sx={{
                    mt: 1.5,
                    flexGrow: 1,
                  }}
                >
                  <Typography
                    level="body-sm"
                    sx={{
                      color: "var(--joy-palette-text-secondary)",
                      fontWeight: "300",
                      fontSize: "14px",
                      lineHeight: "1.5",
                      wordBreak: "break-word",
                    }}
                  >
                    {category.about.slice(0, 89)}
                  </Typography>
                </Box>
                <Typography
                  level="body-md"
                  sx={{
                    fontWeight: "400",
                    fontSize: "12px",
                    color: "var(--joy-palette-text-secondary)",
                    pt: 1.5,
                    borderTop: "1px solid var(--joy-palette-divider)",
                    mt: "auto",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>
                    {category._count?.Articles ?? 0} articles
                  </span>
                  <span>
                    Last updated: {formatDate(category.updatedAt)}
                  </span>
                </Typography>
              </Card>
            ))}
          </Box>
        </Box>
      </Box>
      <AddEditCategoryModal
        key={selectedCategoryId || 'new'}
        open={openEditCategoryModal}
        onClose={handleCloseEditCategoryModal}
        categoryId={selectedCategoryId ?? undefined}
        fetchCategories={fetchCategories}
      />
      <DeleteDeactivateUserModal
        open={openDeleteCategoryModal}
        onClose={handleCloseDeleteCategoryModal}
        onConfirm={() => {
          console.log('Delete confirmation clicked, categoryToDelete:', categoryToDeleteRef.current);
          if (categoryToDeleteRef.current) {
            handleDeleteCategory(categoryToDeleteRef.current);
          }
        }}
        usersToDelete={selectedCategoryId ? [categories.find(cat => cat.id === selectedCategoryId)?.name || ''] : undefined}
        isDeactivate={false}
        title="Delete Category"
        description="Are you sure you want to delete this category?"
      />
    </>
  );
};

export default CategoriesListComponentForUsers; 