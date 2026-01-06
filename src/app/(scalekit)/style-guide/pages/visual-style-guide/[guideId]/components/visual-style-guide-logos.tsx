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
import { Download, FileImage, Plus, Trash, Upload } from "@phosphor-icons/react";
import * as React from "react";
import {
  useCreateLogoAsset,
  useDeleteLogoAsset,
  useLogoAssets,
  useLogoTypeOptions,
  useUpdateLogoAsset,
  useUpdateVisualStyleGuide,
} from "@/app/(scalekit)/style-guide/lib/hooks";
import type { LogoAsset, LogoTypeOption } from "@/app/(scalekit)/style-guide/lib/types";
import Image from "next/image";
import { Logo } from "@/components/core/logo";
import { createClient } from "@/lib/supabase/client";

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

type LogoEditItemProps = {
  logoType: LogoTypeOption;
  logo: LogoAsset | undefined;
  onDeleteClick: () => void;
};

type LogoEditItemPropsWithUpload = LogoEditItemProps & {
  onUploadClick: (logoTypeId: string) => void;
  onDownloadClick: (logo: LogoAsset) => void;
};

function LogoEditItem({
  logoType,
  logo,
  onDeleteClick,
  onUploadClick,
  onDownloadClick,
}: LogoEditItemPropsWithUpload): React.JSX.Element {
  const getImageSrc = () => {
    if (logo?.file_url) return logo.file_url;
    if (logo?.storage_path) {
      // For storage_path, we'll need to generate a signed URL or use public URL
      // For now, we'll handle this in the parent component
      return null;
    }
    if (logo?.file_blob) return logo.file_blob;
    return null;
  };

  const imageSrc = getImageSrc();

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
              {imageSrc ? (
                <Image
                  src={imageSrc}
                  alt={String(logoType.display_name || "")}
                  fill
                  style={{ objectFit: "contain" }}
                  unoptimized
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
                {(logo as { filename?: string })?.filename
                  ? String((logo as { filename?: string }).filename)
                  : logo?.storage_path
                  ? logo.storage_path.split("/").pop() || "logo.png"
                  : "imagename.png"}
              </Typography>
              <Stack direction="row" spacing={1}>
                {logo && (
                  <IconButton
                    variant="plain"
                    size="sm"
                    sx={{ p: 1 }}
                    onClick={() => onDownloadClick(logo)}
                    title="Download"
                  >
                    <Download />
                  </IconButton>
                )}
                <IconButton
                  variant="plain"
                  size="sm"
                  sx={{ p: 1 }}
                  onClick={() => onUploadClick(String(logoType.logo_type_option_id))}
                  title="Upload"
                >
                  <Upload />
                </IconButton>
                {logo && (
                  <IconButton
                    variant="plain"
                    size="sm"
                    color="danger"
                    sx={{ p: 1 }}
                    onClick={onDeleteClick}
                    title="Delete"
                  >
                    <Trash />
                  </IconButton>
                )}
              </Stack>
            </Stack>
          </Grid>
        </Grid>
      </Box>
    </ListItem>
  );
}

type LogoPreviewItemProps = {
  logoType: LogoTypeOption;
  logo: LogoAsset | undefined;
  onDownloadClick: (logo: LogoAsset) => void;
};

function LogoPreviewItem({
  logoType,
  logo,
  onDownloadClick,
}: LogoPreviewItemProps): React.JSX.Element {
  const getImageSrc = () => {
    if (logo?.file_url) return logo.file_url;
    if (logo?.storage_path) {
      // For storage_path, we'll need to generate a signed URL or use public URL
      // For now, we'll handle this in the parent component
      return null;
    }
    if (logo?.file_blob) return logo.file_blob;
    return null;
  };

  const imageSrc = getImageSrc();

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
          {logo && (
            <Button
              variant="plain"
              size="sm"
              startDecorator={<Download />}
              sx={{ p: 1 }}
              onClick={() => onDownloadClick(logo)}
            >
              Download
            </Button>
          )}
        </Grid>
        <Grid xs={12} sm={4}>
          <Typography level="body-sm">
            {/* @TODO: Add description to the api response */}
            {String(
              (logo as { description?: string })?.description ||
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
            {imageSrc ? (
              <Image
                src={imageSrc}
                alt={String(logoType.display_name || "")}
                fill
                style={{ objectFit: "contain" }}
                unoptimized
              />
            ) : (
              <FileImage size={32} />
            )}
          </Stack>
        </Grid>
      </Grid>
    </ListItem>
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
  const [uploadingLogoId, setUploadingLogoId] = React.useState<string | null>(null);
  const supabase = React.useMemo(() => createClient(), []);

  const handleUploadClick = (logoTypeId?: string) => {
    if (logoTypeId && fileInputRef.current) {
      fileInputRef.current.setAttribute("data-logo-type-id", logoTypeId);
    }
    fileInputRef.current?.click();
  };

  const ensureBucketExists = async (): Promise<void> => {
    // Check if bucket exists by trying to list it
    const { error: listError } = await supabase.storage
      .from("logos")
      .list("", { limit: 1 });

    if (listError && (listError.message.includes("not found") || listError.message.includes("Bucket not found"))) {
      // Try to create the bucket (requires admin/service role, may fail)
      const { error: createError } = await supabase.storage.createBucket("logos", {
        public: false,
        allowedMimeTypes: ["image/svg+xml", "image/png", "image/jpeg", "image/jpg"],
      });

      if (createError) {
        const errorMessage = 
          "Storage bucket 'logos' does not exist. " +
          "Please create it using one of these methods:\n\n" +
          "1. Via Supabase Dashboard:\n" +
          "   - Go to Storage > New bucket\n" +
          "   - Name: logos\n" +
          "   - Public: false\n\n" +
          "2. Via SQL (run in Supabase SQL Editor):\n" +
          "   INSERT INTO storage.buckets (id, name, public, allowed_mime_types)\n" +
          "   VALUES ('logos', 'logos', false, ARRAY['image/svg+xml', 'image/png', 'image/jpeg', 'image/jpg'])\n" +
          "   ON CONFLICT (id) DO NOTHING;\n\n" +
          "3. Run the migration file:\n" +
          "   supabase/migrations/20250101000000_create_logos_storage_bucket.sql";
        
        throw new Error(errorMessage);
      }
    } else if (listError) {
      throw new Error(`Failed to access storage bucket: ${listError.message}`);
    }
  };

  const uploadFileToStorage = async (
    file: File,
    storagePath: string
  ): Promise<string> => {
    // Ensure bucket exists before uploading
    await ensureBucketExists();

    const { data, error } = await supabase.storage
      .from("logos")
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: true,
      });

    if (error) {
      if (error.message.includes("not found") || error.message.includes("Bucket not found")) {
        const errorMessage = 
          "Storage bucket 'logos' does not exist. " +
          "Please create it using one of these methods:\n\n" +
          "1. Via Supabase Dashboard:\n" +
          "   - Go to Storage > New bucket\n" +
          "   - Name: logos\n" +
          "   - Public: false\n\n" +
          "2. Via SQL (run in Supabase SQL Editor):\n" +
          "   INSERT INTO storage.buckets (id, name, public, allowed_mime_types)\n" +
          "   VALUES ('logos', 'logos', false, ARRAY['image/svg+xml', 'image/png', 'image/jpeg', 'image/jpg'])\n" +
          "   ON CONFLICT (id) DO NOTHING;\n\n" +
          "3. Run the migration file:\n" +
          "   supabase/migrations/20250101000000_create_logos_storage_bucket.sql";
        throw new Error(errorMessage);
      }
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    return storagePath;
  };

  const getSignedUrl = async (storagePath: string): Promise<string> => {
    const { data, error } = await supabase.storage
      .from("logos")
      .createSignedUrl(storagePath, 3600); // 1 hour expiry

    if (error || !data?.signedUrl) {
      throw new Error(`Failed to create signed URL: ${error?.message || "Unknown error"}`);
    }

    return data.signedUrl;
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

        // Generate storage path: {guideId}/{logoTypeId}/{timestamp}-{filename}
        const timestamp = Date.now();
        const fileExtension = file.name.split(".").pop() || (isSvg ? "svg" : "png");
        const sanitizedFileName = file.name
          .replace(/[^a-zA-Z0-9.-]/g, "_")
          .toLowerCase();
        const storagePath = `${guideId}/${logoTypeOptionId}/${timestamp}-${sanitizedFileName}`;

        setUploadingLogoId(logoTypeOptionId);

        // Upload file to Supabase Storage
        await uploadFileToStorage(file, storagePath);

        // Get signed URL for immediate display
        const signedUrl = await getSignedUrl(storagePath);

        // Check if a logo already exists for this type
        const existingLogo = logos?.find(
          (l) => l.logo_type_option_id === logoTypeOptionId
        );

        if (existingLogo) {
          // Delete old file from storage if it exists
          if (existingLogo.storage_path && existingLogo.storage_path !== storagePath) {
            const { error: storageError } = await supabase.storage
              .from("logos")
              .remove([existingLogo.storage_path]);
            
            if (storageError) {
              console.error("Failed to delete old file from storage:", storageError);
              // Continue with update even if old file deletion fails
            }
          }

          // Update existing logo
          await updateLogo.mutateAsync({
            id: String(existingLogo.logo_asset_id),
            input: {
              is_vector: isSvg,
              svg_text: isSvg ? await file.text() : null,
              file_blob: null, // Clear old blob data
              storage_path: storagePath,
              file_url: signedUrl,
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
            svg_text: isSvg ? await file.text() : null,
            file_blob: null,
            storage_path: storagePath,
            file_url: signedUrl,
            created_by_user_id: null,
          });
        }

        toast.success("Logo uploaded successfully");
      } catch (error) {
        console.error("Upload error:", error);
        toast.error(error instanceof Error ? error.message : "Failed to upload logo");
      } finally {
        setUploadingLogoId(null);
        // Reset the file input
        if (event.target) {
          event.target.value = "";
        }
      }
    },
    [guideId, logoTypes, logos, createLogo, updateLogo, supabase]
  );

  const handleDownloadLogo = React.useCallback(
    async (logo: LogoAsset) => {
      try {
        let downloadUrl: string;
        let filename: string;

        if (logo.storage_path) {
          // Get signed URL from storage
          downloadUrl = await getSignedUrl(logo.storage_path);
          filename = logo.storage_path.split("/").pop() || "logo.png";
        } else if (logo.file_url) {
          // Use existing file URL
          downloadUrl = logo.file_url;
          filename = "logo.png";
        } else if (logo.file_blob) {
          // Convert base64 blob to download
          downloadUrl = logo.file_blob;
          filename = logo.is_vector ? "logo.svg" : "logo.png";
        } else {
          toast.error("No file available for download");
          return;
        }

        // Create a temporary anchor element to trigger download
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = filename;
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success("Download started");
      } catch (error) {
        console.error("Download error:", error);
        toast.error(error instanceof Error ? error.message : "Failed to download logo");
      }
    },
    [supabase]
  );

  const handleDownloadAll = React.useCallback(async () => {
    if (!logos || logos.length === 0) {
      toast.error("No logos available to download");
      return;
    }

    try {
      for (const logo of logos) {
        await handleDownloadLogo(logo);
        // Small delay between downloads to avoid overwhelming the browser
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      toast.success("All logos downloaded");
    } catch (error) {
      console.error("Download all error:", error);
      toast.error("Failed to download some logos");
    }
  }, [logos, handleDownloadLogo]);

  const handleSetDefaultLogoFromTable = React.useCallback(
    async (logo: LogoAsset) => {
      await handleSetDefaultLogo(String(logo.logo_asset_id));
    },
    [handleSetDefaultLogo]
  );

  const handleDeleteLogo = React.useCallback(async () => {
    if (!logoToDelete) return;

    try {
      // Delete file from storage if it exists
      if (logoToDelete.storage_path) {
        const { error: storageError } = await supabase.storage
          .from("logos")
          .remove([logoToDelete.storage_path]);
        
        if (storageError) {
          console.error("Failed to delete file from storage:", storageError);
          // Continue with database deletion even if storage deletion fails
        }
      }

      // Delete from database
      await deleteLogo.mutateAsync(String(logoToDelete.logo_asset_id));
      setDeleteLogoDialogOpen(false);
      setLogoToDelete(null);
      toast.success("Logo deleted successfully");
    } catch (error) {
      toast.error("Failed to delete logo");
    }
  }, [logoToDelete, deleteLogo, supabase]);

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

  // Generate signed URLs for logos with storage_path
  const [logoImageUrls, setLogoImageUrls] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    const generateImageUrls = async () => {
      if (!logos) return;

      const urlMap: Record<string, string> = {};
      
      for (const logo of logos) {
        const logoId = String(logo.logo_asset_id);
        
        if (logo.file_url) {
          urlMap[logoId] = logo.file_url;
        } else if (logo.storage_path) {
          try {
            const { data, error } = await supabase.storage
              .from("logos")
              .createSignedUrl(logo.storage_path, 3600); // 1 hour expiry
            
            if (!error && data?.signedUrl) {
              urlMap[logoId] = data.signedUrl;
            }
          } catch (error) {
            console.error(`Failed to generate URL for logo ${logoId}:`, error);
          }
        } else if (logo.file_blob) {
          urlMap[logoId] = logo.file_blob;
        }
      }

      setLogoImageUrls(urlMap);
    };

    generateImageUrls();
  }, [logos, supabase]);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/svg+xml,image/png,image/jpeg,image/jpg"
        style={{ display: "none" }}
        onChange={handleFileSelect}
      />
      <Box>
        <Stack direction="row" sx={{ mb: 1, justifyContent: "space-between", alignItems: "center" }}>
          <Typography level="title-sm" color="primary">
            Logos
          </Typography>
          {logos && logos.length > 0 && (
            <Button variant="plain" startDecorator={<Download />} onClick={handleDownloadAll}>
              Download All
            </Button>
          )}
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
                  const logoId = logo ? String(logo.logo_asset_id) : null;
                  const imageUrl = logoId ? logoImageUrls[logoId] : null;

                  return (
                    <Box key={String(logoType.logo_type_option_id)}>
                      <LogoEditItem
                        logoType={logoType}
                        logo={logo ? { ...logo, file_url: imageUrl || logo.file_url } : undefined}
                        onDeleteClick={() => {
                          if (logo) {
                            setLogoToDelete(logo);
                          }
                          setDeleteLogoDialogOpen(true);
                        }}
                        onUploadClick={handleUploadClick}
                        onDownloadClick={handleDownloadLogo}
                      />
                      {uploadingLogoId === String(logoType.logo_type_option_id) && (
                        <Box sx={{ display: "flex", justifyContent: "center", py: 1 }}>
                          <CircularProgress size="sm" />
                        </Box>
                      )}
                    </Box>
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
                  const logoId = logo ? String(logo.logo_asset_id) : null;
                  const imageUrl = logoId ? logoImageUrls[logoId] : null;

                  return (
                    <LogoPreviewItem
                      key={String(logoType.logo_type_option_id)}
                      logoType={logoType}
                      logo={logo ? { ...logo, file_url: imageUrl || logo.file_url } : undefined}
                      onDownloadClick={handleDownloadLogo}
                    />
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
