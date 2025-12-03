"use client";

import * as React from "react";
import Modal from "@mui/joy/Modal";
import ModalDialog from "@mui/joy/ModalDialog";
import ModalClose from "@mui/joy/ModalClose";
import Typography from "@mui/joy/Typography";
import Stack from "@mui/joy/Stack";
import Input from "@mui/joy/Input";
import Button from "@mui/joy/Button";
import IconButton from "@mui/joy/IconButton";
import FormControl from "@mui/joy/FormControl";
import FormLabel from "@mui/joy/FormLabel";
import FormHelperText from "@mui/joy/FormHelperText";
import List from "@mui/joy/List";
import ListItem from "@mui/joy/ListItem";
import { Check as CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { Eye as EyeIcon } from "@phosphor-icons/react/dist/ssr/Eye";
import { EyeSlash as EyeSlashIcon } from "@phosphor-icons/react/dist/ssr/EyeSlash";
import { toast } from "@/components/core/toaster";
import {useMemo} from "react";
import type {SupabaseClient} from "@supabase/supabase-js";
import {createClient as createSupabaseClient} from "@/lib/supabase/client";

interface ChangePasswordModalProps {
  open: boolean;
  onClose: () => void;
}

interface PasswordForm {
  newPassword: string;
  confirmPassword: string;
}

export default function ChangePasswordModal({
  open,
  onClose,
}: ChangePasswordModalProps) {
  const supabaseClient = useMemo<SupabaseClient>(() => createSupabaseClient(), []);
  const [formData, setFormData] = React.useState<PasswordForm>({
    newPassword: "",
    confirmPassword: "",
  });
  const [showCurrentPassword, setShowCurrentPassword] =
    React.useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = React.useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    React.useState<boolean>(false);
  const [errors, setErrors] = React.useState<Partial<PasswordForm>>({});
  const [requirements, setRequirements] = React.useState({
    minLength: false,
    uppercase: false,
    lowercase: false,
    number: false,
  });


  const validatePassword = (password: string) => {
    const minLength = password.length >= 8;
    const uppercase = /[A-Z]/.test(password);
    const lowercase = /[a-z]/.test(password);
    const number = /[0-9]/.test(password);

    setRequirements({
      minLength,
      uppercase,
      lowercase,
      number,
    });

    return minLength && uppercase && lowercase && number;
  };

  const handleInputChange = (field: keyof PasswordForm, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));

    if (field === "newPassword") {
      validatePassword(value);
    }

    if (field === "confirmPassword" && value !== formData.newPassword) {
      setErrors((prev) => ({
        ...prev,
        confirmPassword: "Passwords do not match",
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Partial<PasswordForm> = {};

    if (!formData.newPassword) {
      newErrors.newPassword = "New password is required";
    } else if (!validatePassword(formData.newPassword)) {
      newErrors.newPassword = "Password does not meet requirements";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.confirmPassword !== formData.newPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      supabaseClient.auth.updateUser({
        password: formData.newPassword,
      }).then(({ error }) => {
        if (error) {
          toast.error(`Error updating password: ${error.message}`);
        } else {
          toast.success("Password updated successfully");
          onClose();
        }
      })
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog
        sx={{
          width: { xs: "90%", sm: 520 },
          maxWidth: "100%",
          p: { xs: 2, sm: 3 },
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
        }}
      >
        <ModalClose sx={{ color: "#6B7280" }} />
        <Typography
          level="h3"
          sx={{
            fontSize: { xs: "18px", sm: "20px" },
            fontWeight: 600,
            color: "var(--joy-palette-text-primary)",
            mb: { xs: 1.5, sm: 2 },
          }}
        >
          Change Password
        </Typography>
        <Stack spacing={2}>
          <FormControl error={Boolean(errors.newPassword)}>
            <FormLabel>Enter new password</FormLabel>
            <Input
              type={showNewPassword ? "text" : "password"}
              value={formData.newPassword}
              onChange={(e) => handleInputChange("newPassword", e.target.value)}
              endDecorator={
                <IconButton
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
                    <EyeSlashIcon
                      fontSize="var(--Icon-fontSize)"
                      weight="bold"
                    />
                  ) : (
                    <EyeIcon fontSize="var(--Icon-fontSize)" weight="bold" />
                  )}
                </IconButton>
              }
            />
            {errors.newPassword && (
              <FormHelperText>{errors.newPassword}</FormHelperText>
            )}
            <List sx={{ mt: 1, py: 0 }}>
              <ListItem
                sx={{
                  alignItems: "center",
                  gap: 1,
                  py: 0.25,
                  minHeight: "10px",
                  pl: 0,
                }}
              >
                <CheckIcon
                  fontSize="12px"
                  weight="bold"
                  color={
                    requirements.minLength
                      ? "#4F46E5"
                      : "var(--joy-palette-text-primary)"
                  }
                />
                <Typography
                  sx={{
                    fontSize: "12px",
                    color: requirements.minLength
                      ? "#4F46E5"
                      : "var(--joy-palette-text-primary)",
                  }}
                >
                  Minimum 8 characters
                </Typography>
              </ListItem>
              <ListItem
                sx={{
                  alignItems: "center",
                  gap: 1,
                  py: 0.25,
                  minHeight: "10px",
                  pl: 0,
                }}
              >
                <CheckIcon
                  fontSize="12px"
                  weight="bold"
                  color={
                    requirements.uppercase
                      ? "#4F46E5"
                      : "var(--joy-palette-text-primary)"
                  }
                />
                <Typography
                  sx={{
                    fontSize: "12px",
                    color: requirements.uppercase
                      ? "#4F46E5"
                      : "var(--joy-palette-text-primary)",
                  }}
                >
                  At least one uppercase letter
                </Typography>
              </ListItem>
              <ListItem
                sx={{
                  alignItems: "center",
                  gap: 1,
                  py: 0.25,
                  minHeight: "10px",
                  pl: 0,
                }}
              >
                <CheckIcon
                  fontSize="12px"
                  weight="bold"
                  color={
                    requirements.lowercase
                      ? "#4F46E5"
                      : "var(--joy-palette-text-primary)"
                  }
                />
                <Typography
                  sx={{
                    fontSize: "12px",
                    color: requirements.lowercase
                      ? "#4F46E5"
                      : "var(--joy-palette-text-primary)",
                  }}
                >
                  At least one lowercase letter
                </Typography>
              </ListItem>
              <ListItem
                sx={{
                  alignItems: "center",
                  gap: 1,
                  py: 0.25,
                  minHeight: "10px",
                  pl: 0,
                }}
              >
                <CheckIcon
                  fontSize="12px"
                  weight="bold"
                  color={
                    requirements.number
                      ? "#4F46E5"
                      : "var(--joy-palette-text-primary)"
                  }
                />
                <Typography
                  sx={{
                    fontSize: "12px",
                    color: requirements.number
                      ? "#4F46E5"
                      : "var(--joy-palette-text-primary)",
                  }}
                >
                  At least one number
                </Typography>
              </ListItem>
            </List>
          </FormControl>

          <FormControl error={Boolean(errors.confirmPassword)}>
            <FormLabel>Confirm password</FormLabel>
            <Input
              type={showConfirmPassword ? "text" : "password"}
              value={formData.confirmPassword}
              onChange={(e) =>
                handleInputChange("confirmPassword", e.target.value)
              }
              placeholder="Enter password"
              endDecorator={
                <IconButton
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon
                      fontSize="var(--Icon-fontSize)"
                      weight="bold"
                    />
                  ) : (
                    <EyeIcon fontSize="var(--Icon-fontSize)" weight="bold" />
                  )}
                </IconButton>
              }
            />
            {errors.confirmPassword && (
              <FormHelperText>{errors.confirmPassword}</FormHelperText>
            )}
          </FormControl>

          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button
              variant="outlined"
              onClick={onClose}
              sx={{
                fontSize: { xs: "12px", sm: "14px" },
                px: { xs: 2, sm: 3 },
              }}
            >
              Cancel
            </Button>
            <Button
              variant="solid"
              onClick={handleSave}
              sx={{
                bgcolor: "#4F46E5",
                color: "#FFFFFF",
                fontSize: { xs: "12px", sm: "14px" },
                px: { xs: 2, sm: 3 },
                "&:hover": { bgcolor: "#4338CA" },
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
