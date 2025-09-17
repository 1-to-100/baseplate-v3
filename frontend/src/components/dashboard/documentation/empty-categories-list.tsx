import * as React from "react";
import Box from "@mui/joy/Box";
import Typography from "@mui/joy/Typography";
import Button from "@mui/joy/Button";
import { Plus } from "@phosphor-icons/react/dist/ssr/Plus";
import AddEditCategoryModal from "../modals/AddEditCategoryModal";
import { useState } from "react";

interface EmptyCategoriesListProps {
  fetchCategories: () => void;
}

const EmptyCategoriesList: React.FC<EmptyCategoriesListProps> = ({ fetchCategories }) => {
  const [openAddCategoryModal, setOpenAddCategoryModal] = useState(false);

  const handleAddCategoryModal = () => {
    setOpenAddCategoryModal(true);
  };

  const handleCloseAddCategoryModal = () => {
    setOpenAddCategoryModal(false);
  };

  return (
    <Box sx={{ textAlign: "center", mt: 20 }}>
      <Typography
        sx={{
          fontSize: "24px",
          fontWeight: "600",
          color: "var(--joy-palette-text-primary)",
        }}
      >
        No categories created yet
      </Typography>
      <Typography
        sx={{
          fontSize: "14px",
          fontWeight: "300",
          color: "var(--joy-palette-text-secondary)",
          mt: 1,
        }}
      >
        Create a category. <br />
        Once a category is set up, you can add articles to it.
      </Typography>
      <Button
        onClick={handleAddCategoryModal}
        variant="outlined"
        startDecorator={<Plus size={20} weight="bold" />}
        sx={{ mt: 2, color: "var(--joy-palette-text-secondary)" }}
      >
        Add category
      </Button>
      <AddEditCategoryModal 
        open={openAddCategoryModal} 
        onClose={handleCloseAddCategoryModal} 
        fetchCategories={fetchCategories}
      />
    </Box>
  );
};

export default EmptyCategoriesList;