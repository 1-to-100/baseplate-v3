"use client";

import { toast } from "@/components/core/toaster";
import { Card, Grid, IconButton } from "@mui/joy";
import Box from "@mui/joy/Box";
import Button from "@mui/joy/Button";
import CircularProgress from "@mui/joy/CircularProgress";
import Input from "@mui/joy/Input";
import List from "@mui/joy/List";
import ListItem from "@mui/joy/ListItem";
import Modal from "@mui/joy/Modal";
import ModalClose from "@mui/joy/ModalClose";
import ModalDialog from "@mui/joy/ModalDialog";
import Option from "@mui/joy/Option";
import Select from "@mui/joy/Select";
import Stack from "@mui/joy/Stack";
import Typography from "@mui/joy/Typography";
import { Download, FileImage, Plus, Trash } from "@phosphor-icons/react";
import * as React from "react";
import {
  useCreateLogoAsset,
  useDeleteLogoAsset,
  useLogoAssets,
  useLogoTypeOptions,
  useUpdateLogoAsset,
  useUpdateVisualStyleGuide,
} from "@/app/(scalekit)/style-guide/lib/hooks";
import type { LogoAsset } from "@/app/(scalekit)/style-guide/lib/types";
import Image from "next/image";
import { Logo } from "@/components/core/logo";

type VisualStyleGuideLogosProps = {
  guideId: string;
  isEditableView?: boolean;
  defaultLogoAssetId?: string | number | null;
  onDefaultLogoChange?: (logoId: string | null) => void;
};

type DefaultLogoSelectorProps = {
  guideId: string;
  logos?: LogoAsset[];
  defaultLogoId: string | null;
  onDefaultLogoChange?: (logoId: string | null) => void;
};

type DeleteLogoModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

function useDefaultLogoHandler(
  guideId: string,
  onDefaultLogoChange?: (logoId: string | null) => void
): (logoId: string) => Promise<void> {
  const updateGuide = useUpdateVisualStyleGuide();

  return React.useCallback(
    async (logoId: string) => {
      try {
        await updateGuide.mutateAsync({
          id: guideId,
          input: { default_logo_asset_id: logoId },
        });
        onDefaultLogoChange?.(logoId);
        toast.success("Default logo updated");
      } catch (error) {
        toast.error("Failed to set default logo");
      }
    },
    [guideId, onDefaultLogoChange, updateGuide]
  );
}

function DeleteLogoModal({
  open,
  onClose,
  onConfirm,
}: DeleteLogoModalProps): React.JSX.Element {
  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog>
        <ModalClose />
        <Typography level="title-lg">Delete Logo</Typography>
        <Typography level="body-md" sx={{ mt: 2 }}>
          Are you sure you want to delete this logo? This action cannot be
          undone.
        </Typography>
        <Stack
          direction="row"
          spacing={2}
          sx={{ mt: 3, justifyContent: "flex-end" }}
        >
          <Button variant="outlined" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="solid" color="danger" onClick={onConfirm}>
            Delete
          </Button>
        </Stack>
      </ModalDialog>
    </Modal>
  );
}

export function DefaultLogoSelector({
  guideId,
  logos,
  defaultLogoId,
  onDefaultLogoChange,
}: DefaultLogoSelectorProps): React.JSX.Element | null {
  const handleSetDefaultLogo = useDefaultLogoHandler(
    guideId,
    onDefaultLogoChange
  );

  if (!logos || logos.length === 0) {
    return null;
  }

  return (
    <Select
      value={defaultLogoId || ""}
      onChange={(_, newValue) => {
        if (newValue) handleSetDefaultLogo(String(newValue));
      }}
      placeholder="Select default logo"
      sx={{ width: 300 }}
    >
      {logos.map((logo) => (
        <Option
          key={String(logo.logo_asset_id)}
          value={String(logo.logo_asset_id)}
        >
          {String(logo.logo_asset_id) === defaultLogoId ? "⭐ " : ""}
          Logo Asset {String(logo.logo_asset_id).slice(0, 8)}
        </Option>
      ))}
    </Select>
  );
}

export default function VisualStyleGuideLogos({
  guideId,
  isEditableView,
  defaultLogoAssetId,
  onDefaultLogoChange,
}: VisualStyleGuideLogosProps): React.JSX.Element {
  const { data: logos, isLoading: logosLoading } = useLogoAssets(guideId);
  const { data: logoTypes } = useLogoTypeOptions();
  const createLogo = useCreateLogoAsset();
  const updateLogo = useUpdateLogoAsset();
  const deleteLogo = useDeleteLogoAsset();

  const [defaultLogoId, setDefaultLogoId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (defaultLogoAssetId == null) {
      setDefaultLogoId(null);
      return;
    }

    setDefaultLogoId(String(defaultLogoAssetId));
  }, [defaultLogoAssetId]);

  const handleSetDefaultLogo = useDefaultLogoHandler(guideId, (logoId) => {
    setDefaultLogoId(logoId);
    onDefaultLogoChange?.(logoId);
  });

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [logoToDelete, setLogoToDelete] = React.useState<LogoAsset | null>(
    null
  );
  const [deleteLogoDialogOpen, setDeleteLogoDialogOpen] = React.useState(false);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = React.useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const validTypes = [
        "image/svg+xml",
        "image/png",
        "image/jpeg",
        "image/jpg",
      ];
      if (!validTypes.includes(file.type)) {
        toast.error("Please upload a valid image file (SVG, PNG, or JPEG)");
        return;
      }

      try {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const fileData = e.target?.result as string;
          const isSvg = file.type === "image/svg+xml";

          // Get logo type from data attribute if set (from placeholder upload), otherwise use first available
          const selectedLogoTypeId =
            fileInputRef.current?.getAttribute("data-logo-type-id");
          const logoTypeOptionId =
            selectedLogoTypeId || logoTypes?.[0]?.logo_type_option_id || "";

          if (!logoTypeOptionId) {
            toast.error("No logo types available to upload against.");
            return;
          }

          // Clear the data attribute after reading
          if (fileInputRef.current) {
            fileInputRef.current.removeAttribute("data-logo-type-id");
          }

          // Check if a logo already exists for this type (for placeholders that might have been created)
          const existingLogo = logos?.find(
            (l) => l.logo_type_option_id === logoTypeOptionId
          );

          if (existingLogo) {
            // Update existing placeholder logo
            await updateLogo.mutateAsync({
              id: String(existingLogo.logo_asset_id),
              input: {
                is_vector: isSvg,
                svg_text: isSvg ? fileData : null,
                file_blob: !isSvg ? fileData : null,
              },
            });
          } else {
            // Create new logo
            await createLogo.mutateAsync({
              visual_style_guide_id: guideId,
              logo_type_option_id: logoTypeOptionId,
              is_default: false,
              is_vector: isSvg,
              is_circular_crop: false,
              circular_safe_area: null,
              width: null,
              height: null,
              svg_text: isSvg ? fileData : null,
              file_blob: !isSvg ? fileData : null,
              storage_path: null,
              file_url: null,
              created_by_user_id: null,
            });
          }

          toast.success("Logo uploaded successfully");
        };

        if (file.type === "image/svg+xml") {
          reader.readAsText(file);
        } else {
          reader.readAsDataURL(file);
        }
      } catch (error) {
        toast.error("Failed to upload logo");
      }

      // Reset the file input
      if (event.target) {
        event.target.value = "";
      }
    },
    [guideId, logoTypes, logos, createLogo, updateLogo]
  );

  const handleSetDefaultLogoFromTable = React.useCallback(
    async (logo: LogoAsset) => {
      await handleSetDefaultLogo(String(logo.logo_asset_id));
    },
    [handleSetDefaultLogo]
  );

  const handleDeleteLogo = React.useCallback(async () => {
    if (!logoToDelete) return;

    try {
      await deleteLogo.mutateAsync(String(logoToDelete.logo_asset_id));
      setDeleteLogoDialogOpen(false);
      setLogoToDelete(null);
      toast.success("Logo deleted successfully");
    } catch (error) {
      toast.error("Failed to delete logo");
    }
  }, [logoToDelete, deleteLogo]);

  const handleToggleVector = React.useCallback(
    async (logo: LogoAsset) => {
      try {
        await updateLogo.mutateAsync({
          id: String(logo.logo_asset_id),
          input: { is_vector: !Boolean(logo.is_vector) },
        });
      } catch (error) {
        toast.error("Failed to update logo");
      }
    },
    [updateLogo]
  );

  const handleToggleCircularCrop = React.useCallback(
    async (logo: LogoAsset) => {
      try {
        await updateLogo.mutateAsync({
          id: String(logo.logo_asset_id),
          input: { is_circular_crop: !Boolean(logo.is_circular_crop) },
        });
      } catch (error) {
        toast.error("Failed to update logo");
      }
    },
    [updateLogo]
  );

  return (
    <>
      <Box>
        <Stack direction="row" sx={{ mb: 1, justifyContent: "space-between", alignItems: "center" }}>
          <Typography level="title-sm" color="primary">
            Logos
          </Typography>
          <Button variant="plain" startDecorator={<Download />}>
            Download All
          </Button>
        </Stack>

        {(() => {
          if (logosLoading) return <CircularProgress />;

          if (!logos?.length)
            return (
              <Typography
                level="body-sm"
                color="neutral"
                sx={{ textAlign: "center", py: 2 }}
              >
                No logos added yet.{" "}
              </Typography>
            );

          // edit mode
          if (isEditableView)
            return (
              <List sx={{ p: 0, gap: 2 }}>
                {logoTypes?.map((logoType) => {
                  const logo = logos?.find(
                    (l) =>
                      l.logo_type_option_id === logoType.logo_type_option_id
                  );
                  const isDefault = logo
                    ? String(defaultLogoId || "") === String(logo.logo_asset_id)
                    : false;

                  return (
                    <ListItem
                      key={String(logoType.logo_type_option_id)}
                      sx={{ p: 0 }}
                    >
                      <Box sx={{ width: "100%" }}>
                        <Typography level="body-sm" sx={{ mb: 1 }}>
                          {String(logoType.display_name || "")}
                        </Typography>
                        <Grid container spacing={1} sx={{ width: "100%" }}>
                          <Grid
                            xs={12}
                            sm={4}
                            alignItems="center"
                            justifyContent="center"
                          >
                            <Stack
                              direction="row"
                              justifyContent="center"
                              alignItems="center"
                              sx={{
                                height: "72px",
                                position: "relative",
                                backgroundColor: "background.level2",
                                borderRadius: "var(--joy-radius-sm)",
                                py: 1.5,
                                px: 2,
                              }}
                            >
                              {logo?.file_url || logo?.file_blob ? (
                                <Image
                                  src={String(
                                    logo?.file_url || logo?.file_blob || ""
                                  )}
                                  alt={String(logoType.display_name || "")}
                                  fill
                                  style={{ objectFit: "contain" }}
                                />
                              ) : (
                                <FileImage size={32} />
                              )}
                            </Stack>
                          </Grid>
                          <Grid
                            xs={12}
                            sm={8}
                            sx={{ display: "flex", alignItems: "center" }}
                          >
                            <Stack
                              direction="row"
                              justifyContent="space-between"
                              alignItems="center"
                              sx={{ height: "100%", width: "100%" }}
                            >
                              <Typography level="body-sm">
                                {/* @TODO: Add actual filename from the api response */}
                                {logo?.filename
                                  ? String(logo.filename)
                                  : "imagename.png"}
                              </Typography>
                              <IconButton
                                variant="plain"
                                size="sm"
                                color="danger"
                                sx={{ p: 1 }}
                                onClick={() => {
                                  setDeleteLogoDialogOpen(true);
                                }}
                              >
                                <Trash />
                              </IconButton>
                            </Stack>
                          </Grid>
                        </Grid>
                      </Box>
                    </ListItem>
                  );
                })}
              </List>
            );

          // Preview
          return (
            <Card variant="outlined" sx={{ p: 0 }}>
              <List>
                {logoTypes?.map((logoType) => {
                  const logo = logos?.find(
                    (l) =>
                      l.logo_type_option_id === logoType.logo_type_option_id
                  );
                  const isDefault = logo
                    ? String(defaultLogoId || "") === String(logo.logo_asset_id)
                    : false;

                  return (
                    <ListItem
                      key={String(logoType.logo_type_option_id)}
                      sx={{
                        p: 1,
                        borderBottom: "1px solid",
                        borderColor: "divider",
                        "&:last-of-type": { borderBottom: "none" },
                      }}
                    >
                      <Grid
                        container
                        spacing={1}
                        sx={{ width: "100%", alignItems: "flex-start" }}
                      >
                        <Grid xs={12} sm={4}>
                          <Typography level="body-sm">
                            {String(logoType.display_name || "")}
                          </Typography>
                          <Button
                            variant="plain"
                            size="sm"
                            startDecorator={<Download />}
                            sx={{ p: 1 }}
                          >
                            Download
                          </Button>
                        </Grid>
                        <Grid xs={12} sm={4}>
                          <Typography level="body-sm">
                            {/* @TODO: Add description to the api response */}
                            {String(
                              logo?.description ||
                                "Primary logo for websites, marketing materials, print collateral"
                            )}
                          </Typography>
                        </Grid>
                        <Grid
                          xs={12}
                          sm={4}
                          alignItems="center"
                          justifyContent="center"
                        >
                          <Stack
                            direction="row"
                            justifyContent="center"
                            alignItems="center"
                            sx={{
                              backgroundColor: "background.level2",
                              borderRadius: "var(--joy-radius-sm)",
                              height: "72px",
                              position: "relative",
                              py: 1.5,
                              px: 2,
                            }}
                          >
                            {logo?.file_url || logo?.file_blob ? (
                              <Image
                                src={String(
                                  logo?.file_url || logo?.file_blob || ""
                                )}
                                alt={String(logoType.display_name || "")}
                                fill
                                style={{ objectFit: "contain" }}
                              />
                            ) : (
                              <FileImage size={32} />
                            )}
                          </Stack>
                        </Grid>
                      </Grid>
                    </ListItem>
                  );
                })}
              </List>
            </Card>
          );
        })()}
      </Box>
      {/* Delete Logo Modal */}
      <DeleteLogoModal
        open={deleteLogoDialogOpen}
        onClose={() => setDeleteLogoDialogOpen(false)}
        onConfirm={handleDeleteLogo}
      />
    </>
  );
}
