import * as React from "react";
import Box from "@mui/joy/Box";
import Typography from "@mui/joy/Typography";
import Button from "@mui/joy/Button";
import Modal from "@mui/joy/Modal";
import ModalDialog from "@mui/joy/ModalDialog";
import { X as XIcon } from "@phosphor-icons/react/dist/ssr/X";

interface DeleteItemModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  usersToDelete?: string[];
  isDeactivate?: boolean;
  title: string;
  description: string;
}

export default function DeleteItemModal({
  open,
  onClose,
  onConfirm,
  usersToDelete,
  isDeactivate = false,
  title,
  description,
}: DeleteItemModalProps) {
  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog sx={{ maxWidth: 520, borderRadius: "8px", p: 2 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography level="h3">
            {title}
          </Typography>
          <Button variant="plain" onClick={onClose} sx={{ p: 0, minWidth: 0, "&:hover": { bgcolor: "transparent" } }}>
            <XIcon fontSize="var(--Icon-fontSize)" />
          </Button>
        </Box>
        <Typography level="body-md" sx={{ mt: 2, color: "#636B74" }}>
          {/* <Typography component="span" sx={{ color: 'var(--joy-palette-text-primary)' }}>
            {usersToDelete?.join(", ")}
          </Typography>{" "} */}
          {description}
          {!isDeactivate && " This action cannot be undone."}
        </Typography>
        <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end", gap: 2 }}>
          <Button
            variant="outlined"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="solid"
            onClick={onConfirm}
            style={{background: isDeactivate ? "#4F46E5" : "#EF4444"}}
            sx={{
              borderRadius: "20px",
              color: "#FFFFFF",
              padding: "8px 16px",
              "&:hover": {
                bgcolor: isDeactivate ? "#4338CA" : "#DC2626",
              },
            }}
          >
            {isDeactivate ? "Deactivate" : "Delete permanently"}
          </Button>
        </Box>
      </ModalDialog>
    </Modal>
  );
}