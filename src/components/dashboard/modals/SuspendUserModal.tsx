import * as React from "react";
import Modal from "@mui/joy/Modal";
import ModalDialog from "@mui/joy/ModalDialog";
import ModalClose from "@mui/joy/ModalClose";
import Typography from "@mui/joy/Typography";
import Stack from "@mui/joy/Stack";
import Select from "@mui/joy/Select";
import Option from "@mui/joy/Option";
import Textarea from "@mui/joy/Textarea";
import Button from "@mui/joy/Button";
import { X as XIcon } from "@phosphor-icons/react/dist/ssr/X";
import { useState } from "react";

interface SuspendUserModalProps {
  open: boolean;
  onClose: () => void;
  userName: string;
  onConfirm: (reason: string, customReason?: string) => void;
}

export default function SuspendUserModal({
  open,
  onClose,
  userName,
  onConfirm,
}: SuspendUserModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [customReason, setCustomReason] = useState<string>("");

  const reasons = [
    "Unpaid account",
    "Suspicious activity",
    "Violation of terms",
    "Incomplete verification",
    "Multiple failed login attempts",
    "Other",
  ];

  const handleConfirm = () => {
    onConfirm(selectedReason, selectedReason === "Other" ? customReason : undefined);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog
        sx={{
          maxWidth: 520,
          borderRadius: "8px",
          p: 3,
          boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
        }}
      >
        <ModalClose
          sx={{
            top: 8,
            right: 8,
            "&:hover": { bgcolor: "transparent" },
          }}
        >
          <XIcon fontSize="var(--Icon-fontSize)" />
        </ModalClose>
        <Typography level="h4" sx={{ mb: 0 }}>
          Suspend user?
        </Typography>
        <Typography
          level="body-sm"
          fontWeight="500"
          sx={{ mb: 0, color: "var(--joy-palette-text-secondary)" }}
        >
          <span style={{ color: "var(--joy-palette-text-primary)" }}>
            {userName}
          </span>{" "} will be temporarily suspended and unable to access their account. You can reactivate them later.
        </Typography>
        <Stack spacing={0.5}>
          <Typography
            level="body-sm"
            fontWeight="500"
            sx={{ color: "var(--joy-palette-text-primary)", mt: 1 }}
          >
            Reason
          </Typography>
          <Select
            value={selectedReason}
            onChange={(event, newValue) => setSelectedReason(newValue as string)}
            placeholder="Select reason"
            sx={{
              bgcolor: "var(--joy-palette-background-level1)",
              "&:hover": { bgcolor: "var(--joy-palette-background-level1)" },
            }}
          >
            {reasons.map((reason, index) => (
              <Option key={index} value={reason}>
                {reason}
              </Option>
            ))}
          </Select>
          {selectedReason === "Other" && (
            <Textarea
              placeholder="Enter reason"
              value={customReason}
              onChange={(event) => setCustomReason(event.target.value)}
              minRows={3}
              sx={{
                mt: 1,
                bgcolor: "var(--joy-palette-background-level1)",
                "&:hover": { bgcolor: "var(--joy-palette-background-level1)" },
              }}
            />
          )}
          <Stack
            direction="row"
            spacing={1}
            sx={{ mt: 2, justifyContent: "flex-end" }}
          >
            <Button
              variant="outlined"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              variant="solid"
              onClick={handleConfirm}
              sx={{
                borderRadius: "20px",
                bgcolor: "#4F46E5",
                color: "#FFFFFF",
                "&:hover": { bgcolor: "#4338CA" },
                padding: "8px 24px",
                minWidth: "140px",
              }}
            >
              Save
            </Button>
          </Stack>
        </Stack>
      </ModalDialog>
    </Modal>
  );
}