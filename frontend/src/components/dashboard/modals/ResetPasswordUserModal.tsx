import * as React from "react";
import Modal from "@mui/joy/Modal";
import ModalDialog from "@mui/joy/ModalDialog";
import ModalClose from "@mui/joy/ModalClose";
import Typography from "@mui/joy/Typography";
import Stack from "@mui/joy/Stack";
import Select from "@mui/joy/Select";
import Option from "@mui/joy/Option";
import Button from "@mui/joy/Button";
import { X as XIcon } from "@phosphor-icons/react/dist/ssr/X";
import {useEffect, useMemo, useState} from "react";

interface ResetPasswordUserProps {
  open: boolean;
  onClose: () => void;
  userName: string;
  userEmail: string | string[];
  onConfirm: (selectedEmail: string) => void;
}

export default function ResetPasswordUserModal({
  open,
  onClose,
  userName,
  userEmail,
  onConfirm,
}: ResetPasswordUserProps) {
  const emailArray = useMemo(() => {
      return Array.isArray(userEmail) ? userEmail : [userEmail];
  }, [userEmail]);

  const [selectedEmail, setSelectedEmail] = useState<string>(
    emailArray[0] || ""
  );

  useEffect(() => {
    setSelectedEmail(emailArray[0] || "");
  }, [emailArray]);

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
          Reset password?
        </Typography>
        <Typography
          level="body-sm"
          fontWeight="500"
          sx={{ mb: 0, color: "var(--joy-palette-text-secondary)" }}
        >
          By resetting the password,{" "}
          <span style={{ color: "var(--joy-palette-text-primary)" }}>
            {userName}
          </span>{" "}
          will receive an email with instructions to create a new password.
          Please ensure the email address is correct before proceeding.
        </Typography>
        <Stack spacing={1}>
          <Typography
            level="body-sm"
            fontWeight="500"
            sx={{ color: "var(--joy-palette-text-primary)" }}
          >
            Email
          </Typography>
          <Select
            value={selectedEmail}
            onChange={(event, newValue) => setSelectedEmail(newValue as string)}
            sx={{
              bgcolor: "var(--joy-palette-background-level1)",
              "&:hover": { bgcolor: "var(--joy-palette-background-level1)" },
            }}
          >
            {emailArray.map((email, index) => (
              <Option key={index} value={email}>
                {email}
              </Option>
            ))}
          </Select>
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
              onClick={() => {
                onConfirm(selectedEmail);
                onClose();
              }}
              sx={{
                borderRadius: "20px",
                bgcolor: "#4F46E5",
                color: "#FFFFFF",
                "&:hover": { bgcolor: "#4338CA" },
                padding: "8px 24px",
                minWidth: "140px",
              }}
            >
              Reset password
            </Button>
          </Stack>
        </Stack>
      </ModalDialog>
    </Modal>
  );
}
