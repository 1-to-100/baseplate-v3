"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import Avatar from "@mui/joy/Avatar";
import Box from "@mui/joy/Box";
import Button from "@mui/joy/Button";
import Divider from "@mui/joy/Divider";
import FormControl from "@mui/joy/FormControl";
import FormHelperText from "@mui/joy/FormHelperText";
import FormLabel from "@mui/joy/FormLabel";
import Input from "@mui/joy/Input";
import Stack from "@mui/joy/Stack";
import Typography from "@mui/joy/Typography";
import { Controller, useForm } from "react-hook-form";
import { z as zod } from "zod";
import { logger } from "@/lib/default-logger";
import { toast } from "@/components/core/toaster";
import { CircularProgress, IconButton } from "@mui/joy";
import { Upload as UploadIcon } from "@phosphor-icons/react/dist/ssr/Upload";
import { Eye as EyeIcon } from "@phosphor-icons/react/dist/ssr/Eye";
import { EyeSlash as EyeSlashIcon } from "@phosphor-icons/react/dist/ssr/EyeSlash";
import ChangePasswordModal from "../modals/ChangePasswordModal";
import { useUserInfo } from "@/hooks/use-user-info";
import { editUserInfo } from "@/lib/api/users";
import { FormActionsContext } from "@/contexts/form-actions";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

const schema = zod.object({
  avatar: zod.string().optional(),
  firstName: zod
    .string()
    .min(1, { message: "First name is required" })
    .max(255),
  lastName: zod.string().min(1, { message: "Last name is required" }).max(255),
  email: zod.string().min(1, { message: "Email is required" }).email(),
  phoneNumber: zod
    .string()
    .regex(/^[0-9]*$/, { message: "Invalid phone number format" })
    .optional(),
  password: zod.string().optional(),
});

type Values = zod.infer<typeof schema>;

export function UpdateProfileForm(): React.JSX.Element {
  const { userInfo } = useUserInfo();
  const formActions = React.useContext(FormActionsContext);
  const [isModalOpen, setIsModalOpen] = React.useState<boolean>(false);
  const formRef = React.useRef<HTMLFormElement>(null);
  const phoneInputRef = React.useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<Values>({
    defaultValues: {
      avatar: "",
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      password: "123456",
    },
    resolver: zodResolver(schema),
  });

  const onSubmit = React.useCallback(
    async (values: Values): Promise<void> => {
      try {
        const payload = {
          firstName: values.firstName,
          lastName: values.lastName,
          phoneNumber: values.phoneNumber || undefined,
        };

        await editUserInfo(payload);
        await queryClient.invalidateQueries({ queryKey: ["userInfo"] });

        toast.success("User info has been successfully updated");
      } catch (err) {
        logger.error(err);
        toast.error("Failed to update details");
      }
    },
    [queryClient]
  );

  useEffect(() => {
    if (userInfo) {
      reset({
        avatar: userInfo.avatar || "",
        firstName: userInfo.firstName || "",
        lastName: userInfo.lastName || "",
        email: userInfo.email || "",
        phoneNumber: userInfo.phoneNumber || "",
        password: "123456",
      });

      setTimeout(() => {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }, 0);
    }
  }, [userInfo, reset]);

  useEffect(() => {
    if (formActions) {
      formActions.onReset = () => reset();
      formActions.setSubmitHandler?.(() => {
        handleSubmit(onSubmit)();
      });
    }
  }, [formActions, reset, handleSubmit, onSubmit]);

  useEffect(() => {
    const removeAllFocus = () => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }

      if (phoneInputRef.current) {
        phoneInputRef.current.blur();
      }

      if (formRef.current) {
        const inputs = formRef.current.querySelectorAll("input");
        inputs.forEach((input) => input.blur());
      }
    };

    removeAllFocus();

    const focusTimeout = setTimeout(removeAllFocus, 100);

    return () => {
      clearTimeout(focusTimeout);
    };
  }, [userInfo]);

  const [showPassword, setShowPassword] = React.useState<boolean>(false);

  return (
    <>
      <form ref={formRef} onSubmit={handleSubmit(onSubmit)}>
        {!userInfo ? (
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
          <Stack spacing={4}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Controller
                control={control}
                name="avatar"
                render={({ field }) => (
                  <Box sx={{ "--Avatar-size": "120px", position: "relative" }}>
                    <Box
                      display="flex"
                      alignItems={{ xs: "flex-start", sm: "center" }}
                      gap={{ xs: 1, sm: 2 }}
                      flexDirection={{ xs: "column", sm: "row" }}
                    >
                      {field.value ? (
                        <Avatar
                          src={field.value}
                          sx={{
                            width: { xs: 48, sm: 64 },
                            height: { xs: 48, sm: 64 },
                            borderRadius: "50%",
                          }}
                        />
                      ) : (
                        <IconButton
                          component="label"
                          sx={{
                            bgcolor: "#E5E7EB",
                            borderRadius: "50%",
                            width: { xs: 48, sm: 64 },
                            height: { xs: 48, sm: 64 },
                            color: "#4F46E5",
                          }}
                        >
                          <UploadIcon style={{ fontSize: "16px" }} />
                          <input
                            type="file"
                            accept="image/png, image/jpeg, image/gif"
                            hidden
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  field.onChange(reader.result as string);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </IconButton>
                      )}
                      <Box sx={{ display: "flex", flexDirection: "column" }}>
                        <Typography
                          level="body-sm"
                          sx={{
                            fontSize: { xs: "12px", sm: "14px" },
                            fontWeight: 500,
                            color: "var(--joy-palette-text-primary)",
                            lineHeight: "16px",
                            textAlign: { xs: "left", sm: "left" },
                          }}
                        >
                          Upload Avatar
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: { xs: "10px", sm: "12px" },
                            fontWeight: 400,
                            color: "var(--joy-palette-text-secondary)",
                            lineHeight: "16px",
                            textAlign: { xs: "left", sm: "left" },
                          }}
                        >
                          We support PNGs, JPEGs, and GIFs under 3MB
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                )}
              />
            </Stack>
            <Divider sx={{ maxWidth: "512px" }} />
            <Stack spacing={2}>
              <Typography sx={{ fontSize: "14px", fontWeight: 300 }}>
                General info
              </Typography>
              <Box sx={{ maxWidth: "512px" }}>
                <Stack
                  flexDirection={{ px: "column", sm: "row" }}
                  spacing={3}
                  sx={{ mb: 3 }}
                >
                  <Controller
                    control={control}
                    name="firstName"
                    render={({ field }) => (
                      <FormControl
                        error={Boolean(errors.firstName)}
                        sx={{ flex: 1 }}
                      >
                        <FormLabel>First Name</FormLabel>
                        <Input {...field} autoFocus={false} />
                        {errors.firstName ? (
                          <FormHelperText>
                            {errors.firstName.message}
                          </FormHelperText>
                        ) : null}
                      </FormControl>
                    )}
                  />
                  <Controller
                    control={control}
                    name="lastName"
                    render={({ field }) => (
                      <FormControl
                        error={Boolean(errors.lastName)}
                        sx={{ flex: 1 }}
                      >
                        <FormLabel>Last Name</FormLabel>
                        <Input {...field} autoFocus={false} />
                        {errors.lastName ? (
                          <FormHelperText>
                            {errors.lastName.message}
                          </FormHelperText>
                        ) : null}
                      </FormControl>
                    )}
                  />
                </Stack>
                <Stack spacing={3}>
                  <Controller
                    control={control}
                    name="email"
                    render={({ field }) => (
                      <FormControl error={Boolean(errors.email)}>
                        <FormLabel>Email</FormLabel>
                        <Input
                          {...field}
                          type="email"
                          disabled
                          autoFocus={false}
                          sx={{ maxWidth: "512px" }}
                        />
                        {errors.email ? (
                          <FormHelperText>
                            {errors.email.message}
                          </FormHelperText>
                        ) : null}
                      </FormControl>
                    )}
                  />
                  {/* <Controller
                    control={control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormControl error={Boolean(errors.phoneNumber)}>
                        <FormLabel>Phone number</FormLabel>
                        <Input
                          {...field}
                          ref={phoneInputRef}
                          type="tel"
                          autoFocus={false}
                          placeholder="Enter phone number"
                          onFocus={(e) => {
                            const input = e.target as HTMLInputElement;
                            if (input.value.includes("@")) {
                              input.value = "";
                              field.onChange("");
                            }
                          }}
                          sx={{ maxWidth: "512px" }}
                        />
                        {errors.phoneNumber ? (
                          <FormHelperText>
                            {errors.phoneNumber.message}
                          </FormHelperText>
                        ) : null}
                      </FormControl>
                    )}
                  /> */}
                </Stack>
              </Box>
            </Stack>

            <Divider sx={{ maxWidth: "512px" }} />

            <Stack spacing={2}>
              <Typography sx={{ fontSize: "14px", fontWeight: 300 }}>
                Security
              </Typography>
              <Controller
                control={control}
                name="password"
                render={({ field }) => (
                  <FormControl
                    error={Boolean(errors.password)}
                    sx={{ maxWidth: "512px" }}
                  >
                    <FormLabel>Password</FormLabel>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Input
                        {...field}
                        autoFocus={false}
                        disabled
                        sx={{ width: "100%", maxWidth: "360px" }}
                        type={showPassword ? "text" : "password"}
                      />
                      <Box
                        sx={{
                          color: "#3D37DD",
                          fontSize: "14px",
                          fontWeight: "600",
                          whiteSpace: "nowrap",
                          cursor: "pointer",
                        }}
                        onClick={() => setIsModalOpen(true)}
                      >
                        Change password
                      </Box>
                    </Box>
                    {errors.password ? (
                      <FormHelperText>{errors.password.message}</FormHelperText>
                    ) : null}
                  </FormControl>
                )}
              />
            </Stack>
          </Stack>
        )}
      </form>
      <ChangePasswordModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
