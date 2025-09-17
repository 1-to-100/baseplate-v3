"use client";

import * as React from "react";
import Box from "@mui/joy/Box";
import Card from "@mui/joy/Card";
import Typography from "@mui/joy/Typography";
import { DotsThree } from "@phosphor-icons/react/dist/ssr/DotsThree";
import { IconButton } from "@mui/joy";
import { useRouter } from "next/navigation";
import { paths } from "@/paths";
import { PencilSimple as PencilIcon } from "@phosphor-icons/react/dist/ssr/PencilSimple";
import { Trash as TrashIcon } from "@phosphor-icons/react/dist/ssr/Trash";
import { useState, useEffect, useRef } from "react";
import { Popper } from "@mui/base/Popper";
import AddEditCategoryModal from "../modals/AddEditCategoryModal";
import { Category } from "@/contexts/auth/types";
import {
  Star,
  RocketLaunch,
  CodeSimple,
  Gear,
  Wrench,
  IdentificationBadge,
  WebhooksLogo
} from "@phosphor-icons/react/dist/ssr";
import { deleteCategory } from "@/lib/api/categories";
import DeleteDeactivateUserModal from "../modals/DeleteItemModal";
import {toast} from '@/components/core/toaster';
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface CategoriesListProps {
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

const CategoriesListComponent: React.FC<CategoriesListProps> = ({ categories, fetchCategories }) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [openEditCategoryModal, setOpenEditCategoryModal] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [openDeleteCategoryModal, setOpenDeleteCategoryModal] = useState(false);
  const categoryToDeleteRef = useRef<number | null>(null);
  const [pendingEditId, setPendingEditId] = useState<number | null>(null);
 

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);
  };

  const iconMap: { [key: string]: React.JSX.Element } = {
    Star: <Star size={22} />,
    RocketLaunch: <RocketLaunch size={22} />,
    Api: <WebhooksLogo size={22} />,
    Code: <CodeSimple size={22} />,
    Settings: <Gear size={22} />,
    Fix: <Wrench size={22} />,
    Badge: <IdentificationBadge size={22} />,
  };

  return (
    <Box
    sx={{
      display: "grid",
      gridTemplateColumns: {
        xs: "1fr",
        sm: "1fr 1fr",
        md: "1fr 1fr 1fr",
      },
      gap: 2,
      maxWidth: 1000,
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
      <AddEditCategoryModal
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
    </Box>
  );
};

export default CategoriesListComponent;