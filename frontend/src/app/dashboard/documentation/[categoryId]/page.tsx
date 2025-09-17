"use client";

import * as React from "react";
import Box from "@mui/joy/Box";
import Typography from "@mui/joy/Typography";
import Button from "@mui/joy/Button";
import IconButton from "@mui/joy/IconButton";
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
import { Popper } from "@mui/base/Popper";
import { DotsThreeVertical } from "@phosphor-icons/react/dist/ssr/DotsThreeVertical";
import { PencilSimple as PencilIcon } from "@phosphor-icons/react/dist/ssr/PencilSimple";
import { Eye as EyeIcon } from "@phosphor-icons/react/dist/ssr/Eye";
import { Trash as TrashIcon } from "@phosphor-icons/react/dist/ssr/Trash";
import { Star as StarIcon } from "@phosphor-icons/react/dist/ssr/Star";
import { X as XIcon } from "@phosphor-icons/react/dist/ssr/X";
import { useCallback, useState, useEffect } from "react";
import AddEditUser from "@/components/dashboard/modals/AddEditUser";
import DeleteDeactivateUserModal from "@/components/dashboard/modals/DeleteItemModal";
import Pagination from "@/components/dashboard/layout/pagination";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Article } from "@/contexts/auth/types";
import { getCategoryById } from "@/lib/api/categories";
import { deleteArticle, editArticle, getArticlesList } from "@/lib/api/articles";
import { useRouter } from "next/navigation";
import {toast} from '@/components/core/toaster';
import { useColorScheme } from '@mui/joy/styles';
import { useGlobalSearch } from "@/hooks/use-global-search";

const RouterLink = Link;

interface HttpError {
  response?: {
    data?: {
      message?: string;
    };
  };
}

const CategoryInfo: React.FC = () => {
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [addUserAnchorEl, setAddUserAnchorEl] = useState<null | HTMLElement>(
    null
  );
  const [menuRowIndex, setMenuRowIndex] = useState<number | null>(null);

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [rowsToDelete, setRowsToDelete] = useState<number[]>([]);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openAddUserModal, setOpenAddUserModal] = useState(false);
  const [openEditRoleModal, setOpenEditRoleModal] = useState(false);
  const [userToEditId, setUserToEditId] = useState<number | null>(null);
  const [sortColumn, setSortColumn] = useState<keyof Article | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const { colorScheme } = useColorScheme();
  const { debouncedSearchValue } = useGlobalSearch();

  const queryClient = useQueryClient();
  const params = useParams();
  const categoryId = params.categoryId;

  const router = useRouter();

  const rowsPerPage = 10;

  const {
    data: categoryData,
    isLoading: isCategoryLoading,
    error: categoryError,
  } = useQuery({
    queryKey: ["category", categoryId],
    queryFn: () => {
      if (!categoryId) {
        throw new Error("Category ID is missing");
      }
      return getCategoryById(Number(categoryId));
    },
    enabled: !!categoryId,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: [
      "articles",
      currentPage,
      debouncedSearchValue,
      sortColumn,
      sortDirection,
      categoryId,
    ],
    queryFn: async () => {
      const response = await getArticlesList({
        page: currentPage,
        perPage: rowsPerPage,
        search: debouncedSearchValue || undefined,
        orderBy: sortColumn || undefined,
        orderDirection: sortDirection,
        categoryId: categoryId ? [Number(categoryId)] : undefined,
      });
      return {
        ...response,
        data: response.data.map((article) => article),
      };
    },
  });

  const articles = data?.data || [];
  const totalPages = data?.meta?.lastPage || 1;
  const hasResults = articles.length > 0;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (anchorEl && !anchorEl.contains(event.target as Node)) {
        handleMenuClose();
      }
      if (addUserAnchorEl && !addUserAnchorEl.contains(event.target as Node)) {
        handleAddArticleMenuClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [anchorEl, addUserAnchorEl]);


  const handleMenuOpen = (
    event: React.MouseEvent<HTMLElement>,
    index: number
  ) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setMenuRowIndex(index);
  };

  const handleAddArticleMenuClose = () => {
    setAddUserAnchorEl(null);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuRowIndex(null);
  };

  const handleEdit = (articleId: number) => {
    setUserToEditId(articleId);
    setOpenEditModal(true);
    handleMenuClose();
  };

  const handleAddArticle = () => {
    router.push("/dashboard/documentation/add");
  };

  const handleDeleteRow = useCallback((articleId: number) => {
    setRowsToDelete([articleId]);
    setOpenDeleteModal(true);
  }, []);

  const handleDelete = () => {
    if (selectedRows.length > 0) {
      setRowsToDelete(selectedRows);
      setOpenDeleteModal(true);
    }
  };

  const deleteArticleMutation = useMutation({
    mutationFn: (id: number) => deleteArticle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Articles have been deleted successfully!");
    },
    onError: (error: HttpError) => {
      const errorMessage = error.response?.data?.message;
      if (errorMessage) {
        toast.error(errorMessage);
      } else {
        toast.error("An error occurred while deleting articles.");
      }
    },
  });

  const confirmDelete = async () => {
    try {
      await Promise.all(rowsToDelete.map((id) => deleteArticleMutation.mutate(id)));
      setOpenDeleteModal(false);
      setRowsToDelete([]);
      setSelectedRows([]);
    } catch (error) {
      console.error("Failed to delete articles:", error);
    }
  };

  const handleCloseAddUserModal = () => {
    setOpenAddUserModal(false);
  };

  const handleRowCheckboxChange = (articleId: number) => {
    setSelectedRows((prev) =>
      prev.includes(articleId)
        ? prev.filter((id) => id !== articleId)
        : [...prev, articleId]
    );
  };

  const handleSelectAllChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!hasResults) return;
    if (event.target.checked) {
      setSelectedRows(articles.map((article) => article.id));
    } else {
      setSelectedRows([]);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setSelectedRows([]);
  };

  const handleSort = (column: keyof Article) => {
    const isAsc = sortColumn === column && sortDirection === "asc";
    const newDirection = isAsc ? "desc" : "asc";
    setSortColumn(column);
    setSortDirection(newDirection);
  };

  const editArticleMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { status: "draft" | "published" } }) => editArticle(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Article status has been updated successfully!");
    },
    onError: (error: HttpError) => {
      const errorMessage = error.response?.data?.message;
      if (errorMessage) {
        toast.error(errorMessage);
      } else {
        toast.error("An error occurred while updating article status.");
      }
    },
  });

  const handleSaveDraft = async (articleId: number) => {
    editArticleMutation.mutate({ 
      id: articleId, 
      data: { status: "draft" } 
    });
  };

  const articlesToDelete = rowsToDelete
    .map((articleId) => {
      const article = articles.find((u) => u.id === articleId);
      return article ? article.title : undefined;
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  // if (roleError || error) {
  //   return <Typography>Error: {(roleError || error)?.message}</Typography>;
  // }

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
              {categoryData?.name.slice(0, 30)}
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
            {/* <Button
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
            </Button> */}
            <Button
              variant="solid"
              color="primary"
              onClick={handleAddArticle}
              startDecorator={<PlusIcon fontSize="var(--Icon-fontSize)" />}
              sx={{
                width: { xs: "100%", sm: "auto" },
                py: { xs: 1, sm: 0.75 },
              }}
            >
              Add article
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
          <BreadcrumbsItem href={paths.dashboard.documentation.list}>
            Documentation
          </BreadcrumbsItem>
          <BreadcrumbsItem type="end">{categoryData?.name.slice(0, 30)}</BreadcrumbsItem>
        </Breadcrumbs>
      </Stack>

      <Box
        sx={{
          display: { xs: "block", sm: "flex" },
          gap: 3,
          mb: 6,
        }}
      >
        <Box
          sx={{
            flex: 2,
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
            <Stack sx={{ alignItems: "center", ml: "auto", mr: 2 }}>
              {selectedRows.length > 0 ? (
                <Box
                  sx={{
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
          </Box>

          {isLoading ? (
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
              {articles.length === 0 ? (
                <Box sx={{ textAlign: "center", mt: "150px" }}>
                  <Typography
                    sx={{
                      fontSize: "24px",
                      fontWeight: "600",
                      color: "var(--joy-palette-text-primary)",
                    }}
                  >
                    You do not have any articles
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "14px",
                      fontWeight: "300",
                      color: "var(--joy-palette-text-secondary)",
                      mt: 1,
                    }}
                  >
                    Add articles avialable for this category.
                  </Typography>
                  <Button
                    onClick={handleAddArticle}
                    variant="outlined"
                    startDecorator={<Plus size={20} weight="bold" />}
                    sx={{ mt: 2, color: "var(--joy-palette-text-secondary)" }}
                  >
                    Add article
                  </Button>
                  <AddEditUser
                    open={openAddUserModal}
                    onClose={handleCloseAddUserModal}
                  />
                </Box>
              ) : (
                <Box>
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
                      aria-label="documentation table"
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
                                hasResults &&
                                selectedRows.length === articles.length
                              }
                              indeterminate={
                                hasResults &&
                                selectedRows.length > 0 &&
                                selectedRows.length < articles.length
                              }
                              onChange={handleSelectAllChange}
                              disabled={!hasResults}
                            />
                          </th>
                          <th style={{ width: "30%", minWidth: "150px" }}>Article name</th>
                          <th style={{ width: "15%", minWidth: "50px" }}>Last edit</th>
                          <th style={{ width: "15%", minWidth: "50px" }}>Status</th>
                          <th
                            onClick={() => handleSort("title")}
                            style={{ width: "25%", minWidth: "150px" }}
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
                              Author
                            </Box>
                          </th>
                          <th style={{ width: "15%", minWidth: "50px" }} onClick={() => handleSort("updatedAt")}>
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
                              Performance
                            </Box>
                          </th>
                          <th style={{ width: "60px" }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {articles.map((article, index) => (
                          <tr key={article.id}>
                            <td>
                              <Checkbox
                                checked={selectedRows.includes(article.id)}
                                onChange={() =>
                                  handleRowCheckboxChange(article.id)
                                }
                              />
                            </td>
                            <td>{article.title.slice(0, 80)}</td>
                            <td>{formatDate(article.updatedAt)}</td>
                            <td>
                              <Box
                                sx={{
                                  bgcolor:
                                    article.status === "draft"
                                      ? colorScheme === "light" ? "#FFF8C5" : "#fffad2"
                                      : colorScheme === "light" ? "#EEEFF0" : "#e9e9e9",
                                  display: "inline-block",
                                  padding: "8px 8px",
                                  borderRadius: "25px", 
                                  color: colorScheme === "light" ? "var(--joy-palette-text-primary)" : "#000",
                                }}
                              >
                                {article.status.charAt(0).toUpperCase() +
                                  article.status.slice(1)}
                              </Box>
                            </td>
                            <td>
                              <Stack
                                direction="row"
                                spacing={1}
                                sx={{ alignItems: "center" }}
                              >
                                <Avatar
                                  sx={{
                                    width: 28,
                                    height: 28,
                                    fontWeight: "bold",
                                    fontSize: "13px",
                                  }}
                                  {...getAvatarProps(
                                    `${article.Creator.firstName} ${article.Creator.lastName}`.trim()
                                  )}
                                >
                                  {`${article.Creator.firstName} ${article.Creator.lastName}`
                                    .trim()
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </Avatar>
                                <Typography sx={{ wordBreak: "break-all" }}>
                                  {article.Creator.firstName.slice(0, 30)}{" "}
                                  {article.Creator.lastName.slice(0, 30)}
                                </Typography>
                              </Stack>
                            </td>
                            <td>
                              <Stack
                                direction="row"
                                sx={{ alignItems: "center" }}
                              >
                                <EyeIcon fontSize="18px" style={iconStyle} />
                                <Typography sx={{ wordBreak: "break-all" }}>
                                  {article.viewsNumber}
                                </Typography>
                              </Stack>
                            </td>
                            <td>
                              <IconButton
                                size="sm"
                                onClick={(event) =>
                                  handleMenuOpen(event, index)
                                }
                              >
                                <DotsThreeVertical
                                  weight="bold"
                                  size={22}
                                  color="var(--joy-palette-text-secondary)"
                                />
                              </IconButton>
                              <Popper
                                open={
                                  menuRowIndex === index && Boolean(anchorEl)
                                }
                                anchorEl={anchorEl}
                                placement="bottom-start"
                                style={{
                                  minWidth: "150px",
                                  borderRadius: "8px",
                                  boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
                                  backgroundColor:
                                    "var(--joy-palette-background-surface)",
                                  zIndex: 1300,
                                  border:
                                    "1px solid var(--joy-palette-divider)",
                                }}
                              >
                                <Box
                                  onMouseDown={(event) => {
                                    event.preventDefault();
                                    router.push(
                                      `/dashboard/documentation/article/${article.id}`
                                    );
                                  }}
                                  sx={menuItemStyle}
                                >
                                  <EyeIcon fontSize="20px" style={iconStyle} />
                                  Open article
                                </Box>
                                <Box
                                  onMouseDown={(event) => {
                                    event.preventDefault();
                                    router.push(
                                      `/dashboard/documentation/edit/${article.id}`
                                    );
                                  }}
                                  sx={menuItemStyle}
                                >
                                  <PencilIcon
                                    fontSize="20px"
                                    style={iconStyle}
                                  />
                                  Edit
                                </Box>
                                {article.status === 'published' && (
                                  <Box
                                  onMouseDown={(event) => {
                                    event.preventDefault();
                                    handleSaveDraft(article.id);
                                  }}
                                  sx={menuItemStyle}
                                >
                                  <XIcon fontSize="20px" style={iconStyle} />
                                  Unpublish
                                </Box>
                                )}
                                <Box
                                  // onMouseDown={(event) => {
                                  //   event.preventDefault();
                                  //   handleEdit(article.id);
                                  // }}
                                  sx={menuItemStyle}
                                >
                                  <StarIcon fontSize="20px" style={iconStyle} />
                                  Add to favorite
                                </Box>
                                <Box
                                  onMouseDown={(event) => {
                                    event.preventDefault();
                                    handleDeleteRow(article.id);
                                    handleMenuClose();
                                  }}
                                  sx={{ ...menuItemStyle, color: "#EF4444" }}
                                >
                                  <TrashIcon
                                    fontSize="20px"
                                    style={iconStyle}
                                  />
                                  Delete
                                </Box>
                              </Popper>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                    {(articles.length > 0 || isLoading) && (
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
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Box>

      <DeleteDeactivateUserModal
        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        onConfirm={confirmDelete}
        usersToDelete={articlesToDelete}
        title="Delete article"
        description="Are you sure you want to delete this article?"
      />
    </Box>
  );
};

export default CategoryInfo;
