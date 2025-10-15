"use client";

import * as React from "react";
import { useState } from "react";
import Box from "@mui/joy/Box";
import Stack from "@mui/joy/Stack";
import Typography from "@mui/joy/Typography";
import SearchInput from "@/components/dashboard/layout/search-input";
import { Plus as PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import Button from "@mui/joy/Button";
import { useGlobalSearch } from "@/hooks/use-global-search";
import CircularProgress from "@mui/joy/CircularProgress";
import { useUserInfo } from "@/hooks/use-user-info";
import EmptyCategoriesList from "@/components/dashboard/documentation/empty-categories-list";
import CategoriesListComponent from "@/components/dashboard/documentation/categories-list-component";
import AddEditCategoryModal from "@/components/dashboard/modals/AddEditCategoryModal";
import { getCategoriesList } from "@/lib/api/categories";
import { Category } from "@/contexts/auth/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import CategoriesListComponentForUsers from "@/components/dashboard/documentation/categories-list-component-for-users";

interface HttpError extends Error {
  response?: {
    status: number;
  };
}

export default function Page(): React.JSX.Element {
  const [openAddCategoryModal, setOpenAddCategoryModal] = useState(false);
  const { userInfo } = useUserInfo();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { debouncedSearchValue } = useGlobalSearch();

  const { data, isLoading, error } = useQuery<Category[]>({
    queryKey: [
      "categories",
      debouncedSearchValue,
    ],
    queryFn: async () => {
      const response = await getCategoriesList({
        search: debouncedSearchValue || undefined,
      });
      return Array.isArray(response) ? response : response.data;
    },
  });
 
  const categories = data || [];

  const handleAddCategoryModal = () => {
    setOpenAddCategoryModal(true);
  };

  const handleCloseAddCategoryModal = () => {
    setOpenAddCategoryModal(false);
  };

  const handleFetchCategories = () => {
    queryClient.invalidateQueries({ queryKey: ["categories"] });
  };


  const handleAddArticle = () => {
    router.push("/dashboard/documentation/add");
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
          spacing={{ xs: 1, sm: 2 }}
          sx={{
            alignItems: { xs: "stretch", sm: "center" },
            width: { xs: "100%", sm: "auto" },
          }}
        >
          <Stack spacing={1} sx={{ flex: "1 1 auto" }}>
            <Typography
              fontSize={{ xs: "xl2", sm: "xl3" }}
              level="h1"
              sx={{ wordBreak: "break-word" }}
            >
              Documentation
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
            <Button
              sx={{
                width: { xs: "100%", sm: "auto" },
                py: { xs: 1, sm: 0.75 },
              }}
              variant="outlined"
              color="primary"
              onClick={handleAddCategoryModal}
              startDecorator={<PlusIcon fontSize="var(--Icon-fontSize)" />}
            >
              Add category
            </Button>
            <Button
              variant="solid"
              color="primary"
              startDecorator={<PlusIcon fontSize="var(--Icon-fontSize)" />}
              sx={{
                width: { xs: "100%", sm: "auto" },
                py: { xs: 1, sm: 0.75 },
              }}
              onClick={handleAddArticle}
            >
              Add article
            </Button>
          </Stack>
        </Stack>

        {isSystemAdministrator(userInfo) ? (
          isLoading ? (
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
          ) : categories.length > 0 ? (
            <CategoriesListComponent
              categories={categories}
              fetchCategories={handleFetchCategories}
            />
          ) : (
            <EmptyCategoriesList fetchCategories={handleFetchCategories} />
          )
        ) : isLoading ? (
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
        ) : categories.length > 0 ? (
          <CategoriesListComponentForUsers categories={categories} fetchCategories={handleFetchCategories} />
        ) : (
          <EmptyCategoriesList fetchCategories={handleFetchCategories} />
        )}
      </Stack>
      <AddEditCategoryModal
        open={openAddCategoryModal}
        onClose={handleCloseAddCategoryModal}
        fetchCategories={handleFetchCategories}
      />
    </Box>
  );
}
