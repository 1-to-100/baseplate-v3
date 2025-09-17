"use client";

import * as React from "react";
import { useState, useEffect, useRef } from "react";
import Modal from "@mui/joy/Modal";
import ModalDialog from "@mui/joy/ModalDialog";
import ModalClose from "@mui/joy/ModalClose";
import Typography from "@mui/joy/Typography";
import Stack from "@mui/joy/Stack";
import Input from "@mui/joy/Input";
import Select from "@mui/joy/Select";
import Option from "@mui/joy/Option";
import Button from "@mui/joy/Button";
import {
  Star,
  RocketLaunch,
  CodeSimple,
  Gear,
  Wrench,
  IdentificationBadge,
  Plus,
  Check,
  X,
  WebhooksLogo,
} from "@phosphor-icons/react/dist/ssr";
import {
  createCategory,
  getSubcategories,
  getCategoryById,
  editCategory,
} from "@/lib/api/categories";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/core/toaster";

interface HttpError {
  response?: {
    data?: {
      message?: string;
    };
  };
}

interface AddEditCategoryProps {
  open: boolean;
  onClose: () => void;
  categoryId?: number;
  fetchCategories: () => void;
}

interface CategoryFormData {
  name: string;
  subcategory: string;
  about: string;
  icon: string;
}

export default function AddEditCategory({
  open,
  onClose,
  categoryId,
  fetchCategories,
}: AddEditCategoryProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<CategoryFormData>({
    name: "",
    subcategory: "",
    about: "",
    icon: "",
  });

  const [isAddingSubcategory, setIsAddingSubcategory] = useState(false);
  const [newSubcategory, setNewSubcategory] = useState("");
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [localSubcategories, setLocalSubcategories] = useState<string[]>([]);

  const selectRef = useRef<HTMLButtonElement>(null);

  const { data: subcategories, isLoading: isSubcategoriesLoading } = useQuery({
    queryKey: ["subcategories"],
    queryFn: getSubcategories,
    enabled: open,
  });

  useEffect(() => {
    if (Array.isArray(subcategories)) {
      setLocalSubcategories(subcategories);
    } else {
      setLocalSubcategories([]);
    }
  }, [subcategories]);

  useEffect(() => {
    const loadCategoryData = async () => {
      if (open && categoryId) {
        try {
          const categoryData = await getCategoryById(categoryId);
          setFormData({
            name: categoryData.name,
            subcategory: categoryData.subcategory,
            about: categoryData.about,
            icon: categoryData.icon,
          });
        } catch (error) {
          console.error("Error loading category data:", error);
        }
      } else if (open) {
        setFormData({
          name: "",
          subcategory: "",
          about: "",
          icon: "",
        });
      }
      setIsAddingSubcategory(false);
      setNewSubcategory("");
    };

    loadCategoryData();
  }, [open, categoryId]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubcategoryChange = (
    e: React.SyntheticEvent | null,
    newValue: string | null
  ) => {
    if (newValue && newValue !== "Add new category") {
      setIsAddingSubcategory(false);
      handleInputChange("subcategory", newValue);
      setIsSelectOpen(false);
    }
  };

  const handleAddNewCategoryClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAddingSubcategory(true);
  };

  const handleAddSubcategory = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (newSubcategory.trim()) {
      handleInputChange("subcategory", newSubcategory.trim());
      if (!localSubcategories.includes(newSubcategory.trim())) {
        setLocalSubcategories((prev) => [...prev, newSubcategory.trim()]);
      }
    }
    setIsAddingSubcategory(false);
    setNewSubcategory("");
    setIsSelectOpen(false);
  };

  const handleCancelAddSubcategory = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAddingSubcategory(false);
    setNewSubcategory("");
    setIsSelectOpen(false);
  };

  const createCategoryMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["subcategories"] });
      onClose();
      toast.success("Category created successfully.");
    },
    onError: (error: HttpError) => {
      const errorMessage = error.response?.data?.message;
      if (errorMessage) {
        toast.error(errorMessage);
      } else {
        toast.error("An error occurred while creating the category.");
      }
    },
  });

  const editCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CategoryFormData }) => editCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["subcategories"] });
      queryClient.invalidateQueries({ queryKey: ["category", categoryId] });
      onClose();
      toast.success("Category updated successfully.");
    },
    onError: (error: HttpError) => {
      const errorMessage = error.response?.data?.message;
      if (errorMessage) {
        toast.error(errorMessage);
      } else {
        toast.error("An error occurred while updating the category.");
      }
    },
  });

  const handleSave = async () => {
    if (categoryId) {
      editCategoryMutation.mutate({ id: categoryId, data: formData });
    } else {
      createCategoryMutation.mutate(formData);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: "",
      subcategory: "",
      about: "",
      icon: "",
    });
    setIsAddingSubcategory(false);
    setNewSubcategory("");
    setLocalSubcategories(subcategories || []);
    onClose();
  };

  const iconMap: { [key: string]: React.JSX.Element } = {
    Star: <Star size={16} />,
    RocketLaunch: <RocketLaunch size={16} />,
    Api: <WebhooksLogo size={16} />,
    Code: <CodeSimple size={16} />,
    Settings: <Gear size={16} />,
    Fix: <Wrench size={16} />,
    Badge: <IdentificationBadge size={16} />,
  };

  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog
        sx={{
          width: 520,
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
          {categoryId ? "Edit category" : "Add category"}
        </Typography>
        <Stack spacing={2}>
          <Stack sx={{ flex: 1 }}>
            <Typography
              level="body-sm"
              sx={{
                fontSize: "14px",
                color: "var(--joy-palette-text-primary)",
                mb: 0.5,
                fontWeight: 500,
              }}
            >
              Name
            </Typography>
            <Input
              placeholder="Enter category name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              sx={{
                borderRadius: "6px",
                fontSize: "14px",
              }}
            />
          </Stack>

          <Stack sx={{ flex: 1 }}>
            <Typography
              level="body-sm"
              sx={{
                fontSize: "14px",
                color: "var(--joy-palette-text-primary)",
                mb: 0.5,
                fontWeight: 500,
              }}
            >
              Subcategory
            </Typography>
            <Select
              placeholder="Select or create new one"
              value={formData.subcategory}
              onChange={handleSubcategoryChange}
              ref={selectRef}
              listboxOpen={isSelectOpen}
              onListboxOpenChange={(open) => setIsSelectOpen(open)}
              sx={{
                borderRadius: "6px",
                fontSize: "14px",
              }}
            >
              {localSubcategories.map((option) => (
                <Option key={option} value={option}>
                  {option}
                </Option>
              ))}
              <div onClick={handleAddNewCategoryClick}>
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  sx={{ p: 1, cursor: "pointer" }}
                >
                  <Plus size={16} color="#3D37DD" />
                  <span style={{ color: "#3D37DD", fontSize: "14px" }}>
                    Add new category
                  </span>
                </Stack>
              </div>
              {isAddingSubcategory && (
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{
                    p: 1,
                    borderTop: "1px solid #E5E7EB",
                    bgcolor: "var(--joy-palette-background-surface)",
                  }}
                >
                  <Input
                    placeholder="Enter new subcategory"
                    value={newSubcategory}
                    onChange={(e) => {
                      setNewSubcategory(e.target.value);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    sx={{
                      borderRadius: "6px",
                      fontSize: "14px",
                      flex: 1,
                    }}
                  />
                  <Check
                    size={20}
                    color="#4F46E5"
                    onClick={handleAddSubcategory}
                    style={{ cursor: "pointer" }}
                  />
                  <X
                    size={20}
                    color="#6B7280"
                    onClick={handleCancelAddSubcategory}
                    style={{ cursor: "pointer" }}
                  />
                </Stack>
              )}
            </Select>
          </Stack>

          <Stack sx={{ flex: 1 }}>
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
            <Input
              placeholder="Enter description"
              value={formData.about}
              onChange={(e) => handleInputChange("about", e.target.value)}
              sx={{
                borderRadius: "6px",
                fontSize: "14px",
              }}
            />
          </Stack>

          <Stack sx={{ flex: 1 }}>
            <Typography
              level="body-sm"
              sx={{
                fontSize: "14px",
                color: "var(--joy-palette-text-primary)",
                mb: 0.5,
                fontWeight: 500,
              }}
            >
              Add icon
            </Typography>
            <Select
              placeholder="Select icon"
              value={formData.icon}
              onChange={(e, newValue) =>
                handleInputChange("icon", newValue as string)
              }
              renderValue={(option) => {
                if (!option) return <span>Select icon</span>;
                const value = option.value as string;
                return (
                  <Stack direction="row" alignItems="center" spacing={1}>
                    {iconMap[value]}
                    <span>{value}</span>
                  </Stack>
                );
              }}
              sx={{
                borderRadius: "6px",
                fontSize: "14px",
              }}
            >
              <Option value="Star">
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Star size={16} />
                  <span>Star</span>
                </Stack>
              </Option>
              <Option value="RocketLaunch">
                <Stack direction="row" alignItems="center" spacing={1}>
                  <RocketLaunch size={16} />
                  <span>Rocket</span>
                </Stack>
              </Option>
              <Option value="Api">
                <Stack direction="row" alignItems="center" spacing={1}>
                  <WebhooksLogo size={16} />
                  <span>Api</span>
                </Stack>
              </Option>
              <Option value="Code">
                <Stack direction="row" alignItems="center" spacing={1}>
                  <CodeSimple size={16} />
                  <span>Code</span>
                </Stack>
              </Option>
              <Option value="Settings">
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Gear size={16} />
                  <span>Settings</span>
                </Stack>
              </Option>
              <Option value="Fix">
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Wrench size={16} />
                  <span>Fix</span>
                </Stack>
              </Option>
              <Option value="Badge">
                <Stack direction="row" alignItems="center" spacing={1}>
                  <IdentificationBadge size={16} />
                  <span>Badge</span>
                </Stack>
              </Option>
            </Select>
          </Stack>

          <Stack direction="row" spacing={2} justifyContent="flex-end" mt={2}>
            <Button variant="outlined" onClick={handleCancel}>
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
              {categoryId ? "Update category" : "Add category"}
            </Button>
          </Stack>
        </Stack>
      </ModalDialog>
    </Modal>
  );
}