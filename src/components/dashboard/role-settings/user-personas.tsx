import * as React from "react";
import Box from "@mui/joy/Box";
import Typography from "@mui/joy/Typography";
import Button from "@mui/joy/Button";
import { Plus } from "@phosphor-icons/react/dist/ssr/Plus";
import AddRoleModal from "../modals/AddRoleModal";
import { useState } from "react";

const UserPersonas: React.FC = () => {
  const [openAddRoleModal, setOpenAddRoleModal] = useState(false);

  const handleAddRoleModal = () => {
    setOpenAddRoleModal(true);
  };

  const handleCloseAddRoleModal = () => {
    setOpenAddRoleModal(false);
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
        No roles created yet
      </Typography>
      <Typography
        sx={{
          fontSize: "14px",
          fontWeight: "300",
          color: "var(--joy-palette-text-secondary)",
          mt: 1,
        }}
      >
        Create a role to define access levels and responsibilities. <br />
        Once a role is set up, you can assign users to it.
      </Typography>
      <Button
        onClick={handleAddRoleModal}
        variant="outlined"
        startDecorator={<Plus size={20} weight="bold" />}
        sx={{ mt: 2, color: "var(--joy-palette-text-secondary)" }}
      >
        Add role
      </Button>
      <AddRoleModal open={openAddRoleModal} onClose={handleCloseAddRoleModal} />
    </Box>
  );
};

export default UserPersonas;