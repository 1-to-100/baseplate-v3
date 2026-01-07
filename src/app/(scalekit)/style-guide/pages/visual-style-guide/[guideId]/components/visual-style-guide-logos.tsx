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
import Stack from "@mui/joy/Stack";
import Typography from "@mui/joy/Typography";
import { Download, FileImage, Trash, Upload } from "@phosphor-icons/react";
import * as React from "react";
import {
  useCreateLogoAsset,
  useDeleteLogoAsset,
  useLogoAssets,
  useLogoTypeOptions,
  useUpdateLogoAsset,
} from "@/app/(scalekit)/style-guide/lib/hooks";
import type { LogoAsset, LogoTypeOption } from "@/app/(scalekit)/style-guide/lib/types";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

type VisualStyleGuideLogosProps = {
  guideId: string;
  isEditableView?: boolean;
};


type DeleteLogoModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

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



type LogoEditItemProps = {
  logoType: LogoTypeOption;
  logo: LogoAsset | undefined;
  onDeleteClick: () => void;
  onImageError?: (logo: LogoAsset) => void;
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
  onImageError,
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
                  onError={() => (logo ? onImageError?.(logo) : undefined)}
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
  onImageError?: (logo: LogoAsset) => void;
};

function LogoPreviewItem({
  logoType,
  logo,
  onDownloadClick,
  onImageError,
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
                onError={() => (logo ? onImageError?.(logo) : undefined)}
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
}: VisualStyleGuideLogosProps): React.JSX.Element {
  const { data: logos, isLoading: logosLoading } = useLogoAssets(guideId);
  const { data: logoTypes } = useLogoTypeOptions();
  const createLogo = useCreateLogoAsset();
  const updateLogo = useUpdateLogoAsset();
  const deleteLogo = useDeleteLogoAsset();

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
        throw new Error("Failed to access storage bucket");
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
        throw new Error("Failed to access storage bucket");
      }
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    return storagePath;
  };

  const SIGNED_URL_TTL_SECONDS = 6 * 60 * 60; // 6 hours to reduce churn

  const getSignedUrl = React.useCallback(
    async (storagePath: string): Promise<string> => {
    // Validate and clean the storage path
    const cleanPath = storagePath.trim().startsWith('/') ? storagePath.trim().slice(1) : storagePath.trim();
    
    if (!cleanPath) {
      throw new Error('Storage path is empty');
    }

    const { data, error } = await supabase.storage
      .from("logos")
      .createSignedUrl(cleanPath, SIGNED_URL_TTL_SECONDS); // 6 hour expiry

    if (error || !data?.signedUrl) {
      throw new Error(`Failed to create signed URL: ${error?.message || "Unknown error"}`);
    }

    return data.signedUrl;
    },
    [supabase]
  );

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
            const cleanOldPath = existingLogo.storage_path.trim().startsWith('/') 
              ? existingLogo.storage_path.trim().slice(1) 
              : existingLogo.storage_path.trim();
            
            if (cleanOldPath) {
              const { error: storageError } = await supabase.storage
                .from("logos")
                .remove([cleanOldPath]);
              
              if (storageError) {
                console.error("Failed to delete old file from storage:", storageError);
                // Continue with update even if old file deletion fails
              }
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

  const handleDeleteLogo = React.useCallback(async () => {
    if (!logoToDelete) return;

    try {
      // Delete file from storage if it exists
      if (logoToDelete.storage_path) {
        const cleanPath = logoToDelete.storage_path.trim().startsWith('/') 
          ? logoToDelete.storage_path.trim().slice(1) 
          : logoToDelete.storage_path.trim();
        
        if (cleanPath) {
          const { error: storageError } = await supabase.storage
            .from("logos")
            .remove([cleanPath]);
          
          if (storageError) {
            console.error("Failed to delete file from storage:", storageError);
            // Continue with database deletion even if storage deletion fails
          }
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

  const refreshLogoUrl = React.useCallback(
    async (logo: LogoAsset) => {
      if (!logo.storage_path) return;
      
      try {
        const signedUrl = await getSignedUrl(logo.storage_path);
        const cacheBusted = `${signedUrl}${signedUrl.includes("?") ? "&" : "?"}ts=${Date.now()}`;
        setLogoImageUrls((prev) => ({
          ...prev,
          [String(logo.logo_asset_id)]: cacheBusted,
        }));
      } catch (error) {
        console.error("Failed to refresh logo URL:", error);
      }
    },
    [getSignedUrl]
  );


  const addCacheBust = React.useCallback((url: string): string => {
    return `${url}${url.includes("?") ? "&" : "?"}ts=${Date.now()}`;
  }, []);

  // Generate signed URLs for logos with storage_path
  const [logoImageUrls, setLogoImageUrls] = React.useState<Record<string, string>>({});
  const [isGeneratingUrls, setIsGeneratingUrls] = React.useState(false);
  const SIGNED_URL_REFRESH_MS = 30 * 60 * 1000; // refresh every 30 minutes to stay well ahead of 6h expiry

  React.useEffect(() => {
    let isCancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const buildUrlForLogo = async (
      logo: LogoAsset
    ): Promise<{ logoId: string; url: string | null }> => {
      const logoId = String(logo.logo_asset_id);

      // Priority: file_url > storage_path (signed URL) > file_blob
      if (logo.file_url) {
        return { logoId, url: logo.file_url };
      }

      if (logo.storage_path) {
        try {
          const signedUrl = await getSignedUrl(logo.storage_path);
          return { logoId, url: signedUrl };
        } catch (error) {
          console.warn(`Failed to generate signed URL for logo ${logoId}:`, {
            error: error instanceof Error ? error.message : String(error),
            storagePath: logo.storage_path,
          });
        }
        return { logoId, url: null };
      }

      if (logo.file_blob) {
        return { logoId, url: logo.file_blob };
      }

      return { logoId, url: null };
    };

    const generateImageUrls = async () => {
      if (!logos || logos.length === 0) {
        setLogoImageUrls({});
        return;
      }

      setIsGeneratingUrls(true);
      
      // Process logos in parallel for better performance
      const urlPromises = logos.map(buildUrlForLogo);

      const results = await Promise.all(urlPromises);
      const urlMap: Record<string, string> = {};
      
      for (const { logoId, url } of results) {
        if (url) {
          urlMap[logoId] = addCacheBust(url);
        }
      }
      
      if (!isCancelled) {
        setLogoImageUrls(urlMap);
        setIsGeneratingUrls(false);
      }
    };

    generateImageUrls();
    // Refresh signed URLs periodically so they don't expire in the UI
    intervalId = setInterval(generateImageUrls, SIGNED_URL_REFRESH_MS);

    return () => {
      isCancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [logos, supabase, addCacheBust, getSignedUrl]);

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
                  // Get the generated URL from logoImageUrls (which includes signed URLs for storage_path)
                  const generatedUrl = logoId ? logoImageUrls[logoId] : undefined;
                  
                  // Use the generated URL if available, otherwise fall back to logo.file_url
                  // Priority: generatedUrl (from logoImageUrls) > logo.file_url
                  // Only set file_url if we have a valid URL string
                  const finalImageUrl = generatedUrl || logo?.file_url || undefined;
                  
                  // Create a new logo object with the updated file_url only if it's different
                  const logoWithUrl = logo 
                    ? (finalImageUrl && finalImageUrl !== logo.file_url 
                        ? { ...logo, file_url: finalImageUrl }
                        : logo)
                    : undefined;

                  return (
                    <Box key={String(logoType.logo_type_option_id)}>
                  <LogoEditItem
                    logoType={logoType}
                    logo={logoWithUrl}
                    onDeleteClick={() => {
                      if (logo) {
                        setLogoToDelete(logo);
                      }
                      setDeleteLogoDialogOpen(true);
                    }}
                    onUploadClick={handleUploadClick}
                    onDownloadClick={handleDownloadLogo}
                    onImageError={(l) => refreshLogoUrl(l)}
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
                  // Get the generated URL from logoImageUrls (which includes signed URLs for storage_path)
                  const generatedUrl = logoId ? logoImageUrls[logoId] : undefined;
                  
                  // Use the generated URL if available, otherwise fall back to logo.file_url
                  // Priority: generatedUrl (from logoImageUrls) > logo.file_url
                  // Only set file_url if we have a valid URL string
                  const finalImageUrl = generatedUrl || logo?.file_url || undefined;
                  
                  // Create a new logo object with the updated file_url only if it's different
                  const logoWithUrl = logo 
                    ? (finalImageUrl && finalImageUrl !== logo.file_url 
                        ? { ...logo, file_url: finalImageUrl }
                        : logo)
                    : undefined;

                  return (
                    <LogoPreviewItem
                      key={String(logoType.logo_type_option_id)}
                      logoType={logoType}
                      logo={logoWithUrl}
                      onDownloadClick={handleDownloadLogo}
                      onImageError={(l) => refreshLogoUrl(l)}
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
