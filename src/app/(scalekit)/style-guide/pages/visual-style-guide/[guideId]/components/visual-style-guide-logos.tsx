'use client';

import { toast } from '@/components/core/toaster';
import { Card, Grid, IconButton } from '@mui/joy';
import Box from '@mui/joy/Box';
import Button from '@mui/joy/Button';
import CircularProgress from '@mui/joy/CircularProgress';
import List from '@mui/joy/List';
import ListItem from '@mui/joy/ListItem';
import Modal from '@mui/joy/Modal';
import ModalClose from '@mui/joy/ModalClose';
import ModalDialog from '@mui/joy/ModalDialog';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import { Download, FileImage, Plus, Trash, Upload } from '@phosphor-icons/react';
import * as React from 'react';
import {
  useCreateLogoAsset,
  useCustomerInfo,
  useDeleteLogoAsset,
  useGenerateLogo,
  useLogoAssets,
  useLogoPresets,
  useLogoSignedUrls,
  useLogoTypeOptions,
  useSaveGeneratedLogo,
  useUpdateLogoAsset,
  type CustomerInfo,
  type GeneratedLogo,
} from '@/app/(scalekit)/style-guide/lib/hooks';
import type { LogoAsset, LogoTypeOption } from '@/app/(scalekit)/style-guide/lib/types';
import {
  uploadLogoFile,
  deleteLogoFile,
  ensureLogoBucketExists,
} from '@/app/(scalekit)/style-guide/lib/api/logo_storage';
import { createZipFromFiles, fetchFileAsBlob, dataUrlToBlob } from '@/lib/helpers/zip-utils';
import Image from 'next/image';
import { GenerateLogoModal } from './generate-logo-modal';

/**
 * Array of logo type programmatic names that are currently active/visible (case insensitive).
 * Other logo types (favicon, horizontal, etc.) will be added in future iterations.
 * This constant is used to filter logo types for display and when saving generated logos.
 */
const ACTIVE_LOGO_TYPES = ['primary_logo'];

/** Helper to check if a logo type is active by programmatic_name (case insensitive) */
const isActiveLogoType = (programmaticName: string | null | undefined): boolean =>
  ACTIVE_LOGO_TYPES.includes(String(programmaticName ?? '').toLowerCase());

/**
 * Builds an initial logo generation prompt from company information
 */
function buildInitialLogoPrompt(info: CustomerInfo | null): string {
  if (!info) {
    return 'Create a professional, modern logo. The logo should be clean, scalable, and suitable for use on both light and dark backgrounds.';
  }

  const lines: string[] = [];
  lines.push(`Company Name: ${info.company_name}`);
  if (info.website_url) {
    lines.push(`Company Website: ${info.website_url}`);
  }
  lines.push(`Solution Name: ${info.company_name}`);
  if (info.solution_overview) {
    lines.push(`Solution Description: ${info.solution_overview}`);
  }
  if (info.tagline) {
    lines.push(`Tagline: ${info.tagline}`);
  }
  if (info.one_sentence_summary) {
    lines.push(`About: ${info.one_sentence_summary}`);
  }
  lines.push('');
  lines.push(
    'Create a professional, modern logo for this company. The logo should be clean, scalable, and suitable for use on both light and dark backgrounds.'
  );
  return lines.join('\n');
}

type LogoOptionCardProps = {
  onClick: () => void;
  children: React.ReactNode;
  py?: number;
};

function LogoOptionCard({ onClick, children, py = 3 }: LogoOptionCardProps) {
  return (
    <Grid xs={12} sm={4}>
      <Card
        variant='soft'
        onClick={onClick}
        sx={{
          cursor: 'pointer',
          textAlign: 'center',
          py,
          px: 2,
          border: '2px solid transparent',
          borderColor: 'neutral.outlinedBorder',
          transition: 'border-color 0.15s ease',
          '&:hover': {
            borderColor: 'primary.outlinedColor',
          },
        }}
      >
        {children}
      </Card>
    </Grid>
  );
}

type LogoPresetSelectorProps = {
  onGenerateWithAI: () => void;
  generatedLogoPresets?: GeneratedLogo[];
  onSelectGeneratedLogo?: (logo: GeneratedLogo) => void;
  selectingPresetId?: string | null;
};

function LogoPresetSelector({
  onGenerateWithAI,
  generatedLogoPresets,
  onSelectGeneratedLogo,
  selectingPresetId,
}: LogoPresetSelectorProps) {
  const hasGeneratedPresets = generatedLogoPresets && generatedLogoPresets.length > 0;
  const isSelecting = !!selectingPresetId;

  return (
    <Box>
      <Stack
        direction='row'
        sx={{
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: hasGeneratedPresets ? 2 : 0,
        }}
      >
        <Typography level='body-sm' color='neutral'>
          {hasGeneratedPresets
            ? 'Select a generated logo to use'
            : 'Generate a logo with AI or upload your own logo'}
        </Typography>
        <Button
          variant='plain'
          color='primary'
          startDecorator={<Plus />}
          onClick={onGenerateWithAI}
        >
          {hasGeneratedPresets ? 'Regenerate Logos' : 'Generate Logo with AI'}
        </Button>
      </Stack>

      {hasGeneratedPresets && (
        <Grid container spacing={2}>
          {generatedLogoPresets.map((logo, index) => {
            const isThisSelecting = selectingPresetId === logo.id;
            const isDisabled = isSelecting && !isThisSelecting;

            return (
              <Grid key={logo.id} xs={12} sm={4}>
                <Card
                  variant='soft'
                  onClick={isDisabled ? undefined : () => onSelectGeneratedLogo?.(logo)}
                  sx={{
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    py: 2,
                    px: 2,
                    border: '2px solid transparent',
                    borderColor: isThisSelecting ? 'primary.500' : 'neutral.outlinedBorder',
                    transition: 'border-color 0.15s ease, opacity 0.15s ease',
                    opacity: isDisabled ? 0.5 : 1,
                    '&:hover': {
                      borderColor: isDisabled ? 'neutral.outlinedBorder' : 'primary.outlinedColor',
                    },
                  }}
                >
                  <Stack alignItems='center' justifyContent='center' gap={1}>
                    <Box
                      sx={{
                        position: 'relative',
                        width: '80px',
                        height: '80px',
                        borderRadius: 'var(--joy-radius-sm)',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {isThisSelecting ? (
                        <CircularProgress size='sm' />
                      ) : (
                        <Image
                          src={logo.url}
                          alt={`Generated logo option ${index + 1}`}
                          fill
                          style={{ objectFit: 'contain' }}
                          unoptimized
                        />
                      )}
                    </Box>
                    <Typography level='body-sm' color='neutral'>
                      {isThisSelecting ? 'Saving...' : `Option ${index + 1}`}
                    </Typography>
                  </Stack>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
}

type VisualStyleGuideLogosProps = {
  guideId: string;
  isEditableView?: boolean;
};

type DeleteLogoModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

function DeleteLogoModal({ open, onClose, onConfirm }: DeleteLogoModalProps): React.JSX.Element {
  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog>
        <ModalClose />
        <Typography level='title-lg'>Delete Logo</Typography>
        <Typography level='body-md' sx={{ mt: 2 }}>
          Are you sure you want to delete this logo? This action cannot be undone.
        </Typography>
        <Stack direction='row' spacing={2} sx={{ mt: 3, justifyContent: 'flex-end' }}>
          <Button variant='outlined' onClick={onClose}>
            Cancel
          </Button>
          <Button variant='solid' color='danger' onClick={onConfirm}>
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
  isUploading?: boolean;
};

function LogoEditItem({
  logoType,
  logo,
  onDeleteClick,
  onUploadClick,
  onDownloadClick,
  onImageError,
  isUploading,
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
  const hasLogo = !!imageSrc;

  // When no logo exists, show the upload card UI
  if (!hasLogo) {
    return (
      <ListItem key={String(logoType.logo_type_option_id)} sx={{ p: 0 }}>
        <Box sx={{ width: '100%' }}>
          <Typography level='body-sm' sx={{ mb: 1 }}>
            {String(logoType.display_name || '')}
          </Typography>
          <Card
            variant='outlined'
            sx={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 2,
              p: 2,
              cursor: 'pointer',
              transition: 'border-color 0.15s ease',
              '&:hover': {
                borderColor: 'primary.outlinedColor',
              },
            }}
            onClick={() => onUploadClick(String(logoType.logo_type_option_id))}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100px',
                height: '72px',
                backgroundColor: 'background.level2',
                borderRadius: 'var(--joy-radius-sm)',
              }}
            >
              {isUploading ? (
                <CircularProgress size='sm' />
              ) : (
                <Upload size={24} color='var(--joy-palette-warning-500)' />
              )}
            </Box>
            <Stack>
              <Typography level='title-sm'>Upload Image</Typography>
              <Typography level='body-sm' color='neutral'>
                File upload, supports PNG, SVG
              </Typography>
            </Stack>
          </Card>
        </Box>
      </ListItem>
    );
  }

  // When logo exists, show the existing UI with image preview and actions
  return (
    <ListItem key={String(logoType.logo_type_option_id)} sx={{ p: 0 }}>
      <Box sx={{ width: '100%' }}>
        <Typography level='body-sm' sx={{ mb: 1 }}>
          {String(logoType.display_name || '')}
        </Typography>
        <Grid container spacing={1} sx={{ width: '100%' }}>
          <Grid xs={12} sm={4} alignItems='center' justifyContent='center'>
            <Stack
              direction='row'
              justifyContent='center'
              alignItems='center'
              sx={{
                height: '72px',
                position: 'relative',
                backgroundColor: 'background.level2',
                borderRadius: 'var(--joy-radius-sm)',
                py: 1.5,
                px: 2,
              }}
            >
              {isUploading ? (
                <CircularProgress size='sm' />
              ) : (
                <Image
                  src={imageSrc}
                  alt={String(logoType.display_name || '')}
                  fill
                  style={{ objectFit: 'contain' }}
                  unoptimized
                  onError={() => (logo ? onImageError?.(logo) : undefined)}
                />
              )}
            </Stack>
          </Grid>
          <Grid xs={12} sm={8} sx={{ display: 'flex', alignItems: 'center' }}>
            <Stack
              direction='row'
              justifyContent='space-between'
              alignItems='center'
              sx={{ height: '100%', width: '100%' }}
            >
              <Typography level='body-sm'>
                {(logo as { filename?: string })?.filename
                  ? String((logo as { filename?: string }).filename)
                  : logo?.storage_path
                    ? logo.storage_path.split('/').pop() || 'logo.png'
                    : 'logo.png'}
              </Typography>
              <Stack direction='row' spacing={1}>
                {logo && (
                  <IconButton
                    variant='plain'
                    size='sm'
                    sx={{ p: 1 }}
                    onClick={() => onDownloadClick(logo)}
                    title='Download'
                  >
                    <Download />
                  </IconButton>
                )}
                <IconButton
                  variant='plain'
                  size='sm'
                  sx={{ p: 1 }}
                  onClick={() => onUploadClick(String(logoType.logo_type_option_id))}
                  title='Upload'
                >
                  <Upload />
                </IconButton>
                {logo && (
                  <IconButton
                    variant='plain'
                    size='sm'
                    color='danger'
                    sx={{ p: 1 }}
                    onClick={onDeleteClick}
                    title='Delete'
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
        borderBottom: '1px solid',
        borderColor: 'divider',
        '&:last-of-type': { borderBottom: 'none' },
      }}
    >
      <Grid container spacing={1} sx={{ width: '100%', alignItems: 'flex-start' }}>
        <Grid xs={12} sm={4}>
          <Typography level='body-sm'>{String(logoType.display_name || '')}</Typography>
          {logo && (
            <Button
              variant='plain'
              size='sm'
              startDecorator={<Download />}
              sx={{ p: 1 }}
              onClick={() => onDownloadClick(logo)}
            >
              Download
            </Button>
          )}
        </Grid>
        <Grid xs={12} sm={4}>
          <Typography level='body-sm'>
            {String(
              (logo as { description?: string })?.description ||
                'Primary logo for websites, marketing materials, print collateral'
            )}
          </Typography>
        </Grid>
        <Grid xs={12} sm={4} alignItems='center' justifyContent='center'>
          <Stack
            direction='row'
            justifyContent='center'
            alignItems='center'
            sx={{
              backgroundColor: 'background.level2',
              borderRadius: 'var(--joy-radius-sm)',
              height: '72px',
              position: 'relative',
              py: 1.5,
              px: 2,
            }}
          >
            {imageSrc ? (
              <Image
                src={imageSrc}
                alt={String(logoType.display_name || '')}
                fill
                style={{ objectFit: 'contain' }}
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
  const generateLogoMutation = useGenerateLogo();
  const saveGeneratedLogoMutation = useSaveGeneratedLogo();

  // Hooks for logo presets and signed URLs
  const { data: generatedLogoPresets = [], isLoading: isLoadingPresets } = useLogoPresets(guideId);
  const { logoImageUrls, refreshLogoUrl, getSignedUrl } = useLogoSignedUrls(logos);

  // Fetch customer info for prefilling logo generation prompt
  const { data: customerInfo } = useCustomerInfo();
  const initialLogoPrompt = React.useMemo(
    () => buildInitialLogoPrompt(customerInfo ?? null),
    [customerInfo]
  );

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [logoToDelete, setLogoToDelete] = React.useState<LogoAsset | null>(null);
  const [deleteLogoDialogOpen, setDeleteLogoDialogOpen] = React.useState(false);
  const [uploadingLogoId, setUploadingLogoId] = React.useState<string | null>(null);
  const [generateLogoModalOpen, setGenerateLogoModalOpen] = React.useState(false);
  const [isSavingGeneratedLogo, setIsSavingGeneratedLogo] = React.useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = React.useState(false);
  const [selectingPresetId, setSelectingPresetId] = React.useState<string | null>(null);

  const handleUploadClick = (logoTypeId?: string) => {
    if (logoTypeId && fileInputRef.current) {
      fileInputRef.current.setAttribute('data-logo-type-id', logoTypeId);
    }
    fileInputRef.current?.click();
  };

  const uploadFileToStorage = async (file: File, storagePath: string): Promise<string> => {
    // Ensure bucket exists before uploading
    const bucketResult = await ensureLogoBucketExists();
    if (!bucketResult.ok) {
      throw new Error(bucketResult.error);
    }

    const uploadResult = await uploadLogoFile(storagePath, file);
    if (!uploadResult.ok) {
      throw new Error(uploadResult.error);
    }

    return storagePath;
  };

  const handleFileSelect = React.useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const validTypes = ['image/svg+xml', 'image/png', 'image/jpeg', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        toast.error('Please upload a valid image file (SVG, PNG, or JPEG)');
        return;
      }

      try {
        const isSvg = file.type === 'image/svg+xml';

        // Get logo type from data attribute if set (from placeholder upload), otherwise use first available
        const selectedLogoTypeId = fileInputRef.current?.getAttribute('data-logo-type-id');
        const logoTypeOptionId = selectedLogoTypeId || logoTypes?.[0]?.logo_type_option_id || '';

        if (!logoTypeOptionId) {
          toast.error('No logo types available to upload against.');
          return;
        }

        // Clear the data attribute after reading
        if (fileInputRef.current) {
          fileInputRef.current.removeAttribute('data-logo-type-id');
        }

        // Generate storage path: {guideId}/{logoTypeId}/{timestamp}-{filename}
        const timestamp = Date.now();
        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').toLowerCase();
        const storagePath = `${guideId}/${logoTypeOptionId}/${timestamp}-${sanitizedFileName}`;

        setUploadingLogoId(logoTypeOptionId);

        // Upload file to Supabase Storage
        await uploadFileToStorage(file, storagePath);

        // Get signed URL for immediate display
        const signedUrl = await getSignedUrl(storagePath);

        // Check if a logo already exists for this type
        const existingLogo = logos?.find((l) => l.logo_type_option_id === logoTypeOptionId);

        if (existingLogo) {
          // Delete old file from storage if it exists AND no other logos are using it
          if (existingLogo.storage_path && existingLogo.storage_path !== storagePath) {
            // Check if other logos are using the same storage path (shared file from AI generation)
            const otherLogosUsingSamePath = logos?.filter(
              (l) =>
                l.logo_asset_id !== existingLogo.logo_asset_id &&
                l.storage_path === existingLogo.storage_path
            );

            // Only delete the file if no other logos reference it
            if (!otherLogosUsingSamePath || otherLogosUsingSamePath.length === 0) {
              const deleteResult = await deleteLogoFile(existingLogo.storage_path);
              if (!deleteResult.ok) {
                console.error('Failed to delete old file from storage:', deleteResult.error);
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

        toast.success('Logo uploaded successfully');
      } catch (error) {
        console.error('Upload error:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to upload logo');
      } finally {
        setUploadingLogoId(null);
        // Reset the file input
        if (event.target) {
          event.target.value = '';
        }
      }
    },
    [guideId, logoTypes, logos, createLogo, updateLogo, getSignedUrl]
  );

  const handleDownloadLogo = React.useCallback(
    async (logo: LogoAsset) => {
      try {
        let downloadUrl: string;
        let filename: string;

        if (logo.storage_path) {
          // Get signed URL from storage
          downloadUrl = await getSignedUrl(logo.storage_path);
          filename = logo.storage_path.split('/').pop() || 'logo.png';
        } else if (logo.file_url) {
          // Use existing file URL
          downloadUrl = logo.file_url;
          filename = 'logo.png';
        } else if (logo.file_blob) {
          // Convert base64 blob to download
          downloadUrl = logo.file_blob;
          filename = logo.is_vector ? 'logo.svg' : 'logo.png';
        } else {
          toast.error('No file available for download');
          return;
        }

        // Create a temporary anchor element to trigger download
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success('Download started');
      } catch (error) {
        console.error('Download error:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to download logo');
      }
    },
    [getSignedUrl]
  );

  const handleDownloadAll = React.useCallback(async () => {
    if (!logos || logos.length === 0) {
      toast.error('No logos available to download');
      return;
    }

    // Filter logos to only include those with active logo types
    const activeLogos = logos.filter((logo) => {
      const logoType = logoTypes?.find((lt) => lt.logo_type_option_id === logo.logo_type_option_id);
      return logoType && isActiveLogoType(logoType.programmatic_name);
    });

    if (activeLogos.length === 0) {
      toast.error('No active logos available to download');
      return;
    }

    setIsDownloadingAll(true);

    try {
      const zipFiles: { filename: string; data: Blob }[] = [];

      // Fetch active logos in parallel
      const logoPromises = activeLogos.map(async (logo) => {
        try {
          let blob: Blob;
          let filename: string;

          if (logo.storage_path) {
            // Get signed URL from storage and fetch
            const signedUrl = await getSignedUrl(logo.storage_path);
            blob = await fetchFileAsBlob(signedUrl);
            filename = logo.storage_path.split('/').pop() || 'logo.png';
          } else if (logo.file_url) {
            // Fetch from direct URL
            blob = await fetchFileAsBlob(logo.file_url);
            filename = 'logo.png';
          } else if (logo.file_blob) {
            // Convert base64 blob
            blob = dataUrlToBlob(logo.file_blob);
            filename = logo.is_vector ? 'logo.svg' : 'logo.png';
          } else {
            return null; // Skip logos without file data
          }

          // Get logo type name for better filename
          const logoType = logoTypes?.find(
            (lt) => lt.logo_type_option_id === logo.logo_type_option_id
          );
          const typeName = logoType?.display_name
            ? String(logoType.display_name).toLowerCase().replace(/\s+/g, '-')
            : 'logo';

          // Create unique filename with logo type
          const extension = filename.split('.').pop() || 'png';
          const uniqueFilename = `${typeName}.${extension}`;

          return { filename: uniqueFilename, data: blob };
        } catch (error) {
          console.error(`Failed to fetch logo ${logo.logo_asset_id}:`, error);
          return null;
        }
      });

      const results = await Promise.all(logoPromises);

      // Filter out null results (failed fetches)
      for (const result of results) {
        if (result) {
          zipFiles.push(result);
        }
      }

      if (zipFiles.length === 0) {
        toast.error('No logos could be downloaded');
        return;
      }

      // Create and download the zip file
      await createZipFromFiles(zipFiles, 'logos.zip');

      toast.success(`Downloaded ${zipFiles.length} logo${zipFiles.length > 1 ? 's' : ''} as zip`);
    } catch (error) {
      console.error('Download all error:', error);
      toast.error('Failed to create zip file');
    } finally {
      setIsDownloadingAll(false);
    }
  }, [logos, logoTypes, getSignedUrl]);

  const handleDeleteLogo = React.useCallback(async () => {
    if (!logoToDelete) return;

    try {
      // Delete file from storage if it exists AND no other logos are using it
      if (logoToDelete.storage_path) {
        // Check if other logos are using the same storage path (shared file from AI generation)
        const otherLogosUsingSamePath = logos?.filter(
          (l) =>
            l.logo_asset_id !== logoToDelete.logo_asset_id &&
            l.storage_path === logoToDelete.storage_path
        );

        // Only delete the file if no other logos reference it
        if (!otherLogosUsingSamePath || otherLogosUsingSamePath.length === 0) {
          const deleteResult = await deleteLogoFile(logoToDelete.storage_path);
          if (!deleteResult.ok) {
            console.error('Failed to delete file from storage:', deleteResult.error);
            // Continue with database deletion even if storage deletion fails
          }
        }
      }

      // Delete from database
      await deleteLogo.mutateAsync(String(logoToDelete.logo_asset_id));
      setDeleteLogoDialogOpen(false);
      setLogoToDelete(null);
      toast.success('Logo deleted successfully');
    } catch (error) {
      toast.error('Failed to delete logo');
    }
  }, [logoToDelete, deleteLogo, logos]);

  // Open the generate logo modal
  const handleGenerateWithAI = React.useCallback(() => {
    setGenerateLogoModalOpen(true);
  }, []);

  // Generate logos using AI
  const handleGenerateLogos = React.useCallback(
    async (prompt: string): Promise<GeneratedLogo[]> => {
      const result = await generateLogoMutation.mutateAsync({
        visualStyleGuideId: guideId,
        prompt,
      });
      return result;
    },
    [generateLogoMutation, guideId]
  );

  // Save a generated logo to the visual style guide for active logo types and store presets in Supabase
  const handleSaveGeneratedLogo = React.useCallback(
    async (selectedLogo: GeneratedLogo, allLogos: GeneratedLogo[]) => {
      setIsSavingGeneratedLogo(true);

      try {
        // Extract all logo URLs for storing as presets
        const allLogoUrls = allLogos.map((logo) => logo.url);

        // Get active logo type IDs based on ACTIVE_LOGO_TYPES (case insensitive)
        const activeLogoTypeIds = logoTypes
          ?.filter((lt) => isActiveLogoType(lt.programmatic_name))
          .map((lt) => String(lt.logo_type_option_id));

        // Use edge function to save logo only to active logo types
        // React Query will auto-invalidate logo assets and presets queries
        await saveGeneratedLogoMutation.mutateAsync({
          visualStyleGuideId: guideId,
          logoUrl: selectedLogo.url,
          logoTypeOptionIds: activeLogoTypeIds,
          allLogoUrls,
        });

        toast.success('Generated logo saved successfully');
      } catch (error) {
        console.error('Save generated logo error:', error);
        throw error;
      } finally {
        setIsSavingGeneratedLogo(false);
      }
    },
    [guideId, saveGeneratedLogoMutation, logoTypes]
  );

  // Handle selecting a generated logo preset from the LogoPresetSelector
  const handleSelectGeneratedLogo = React.useCallback(
    async (logo: GeneratedLogo) => {
      setIsSavingGeneratedLogo(true);
      setSelectingPresetId(logo.id);

      try {
        // Get active logo type IDs based on ACTIVE_LOGO_TYPES (case insensitive)
        const activeLogoTypeIds = logoTypes
          ?.filter((lt) => isActiveLogoType(lt.programmatic_name))
          .map((lt) => String(lt.logo_type_option_id));

        // Use edge function to save logo only to active logo types
        await saveGeneratedLogoMutation.mutateAsync({
          visualStyleGuideId: guideId,
          logoUrl: logo.url,
          logoTypeOptionIds: activeLogoTypeIds,
        });

        toast.success('Logo saved successfully');
      } catch (error) {
        console.error('Save logo error:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to save logo');
      } finally {
        setIsSavingGeneratedLogo(false);
        setSelectingPresetId(null);
      }
    },
    [guideId, saveGeneratedLogoMutation, logoTypes]
  );

  return (
    <>
      <input
        ref={fileInputRef}
        type='file'
        accept='image/svg+xml,image/png,image/jpeg,image/jpg'
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />
      <Box>
        <Stack
          direction='row'
          sx={{ mb: 1, justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Typography level='title-sm' color='primary'>
            Logos
          </Typography>
          {logos && logos.length > 0 && (
            <Button
              variant='plain'
              startDecorator={isDownloadingAll ? <CircularProgress size='sm' /> : <Download />}
              onClick={handleDownloadAll}
              disabled={isDownloadingAll}
            >
              {isDownloadingAll ? 'Downloading...' : 'Download All'}
            </Button>
          )}
        </Stack>

        {(() => {
          if (logosLoading) return <CircularProgress />;

          // edit mode
          if (isEditableView)
            return (
              <>
                <LogoPresetSelector
                  onGenerateWithAI={handleGenerateWithAI}
                  generatedLogoPresets={generatedLogoPresets}
                  onSelectGeneratedLogo={handleSelectGeneratedLogo}
                  selectingPresetId={selectingPresetId}
                />
                <List sx={{ p: 0, gap: 2, mt: 1 }}>
                  {logoTypes
                    ?.filter((logoType) => isActiveLogoType(logoType.programmatic_name))
                    .map((logoType) => {
                      const logo = logos?.find(
                        (l) => l.logo_type_option_id === logoType.logo_type_option_id
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
                        ? finalImageUrl && finalImageUrl !== logo.file_url
                          ? { ...logo, file_url: finalImageUrl }
                          : logo
                        : undefined;

                      return (
                        <LogoEditItem
                          key={String(logoType.logo_type_option_id)}
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
                          isUploading={uploadingLogoId === String(logoType.logo_type_option_id)}
                        />
                      );
                    })}
                </List>
              </>
            );

          // Preview
          return (
            <Card variant='outlined' sx={{ p: 0 }}>
              <List>
                {logoTypes
                  ?.filter((logoType) => isActiveLogoType(logoType.programmatic_name))
                  .map((logoType) => {
                    const logo = logos?.find(
                      (l) => l.logo_type_option_id === logoType.logo_type_option_id
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
                      ? finalImageUrl && finalImageUrl !== logo.file_url
                        ? { ...logo, file_url: finalImageUrl }
                        : logo
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

      {/* Generate Logo Modal */}
      <GenerateLogoModal
        open={generateLogoModalOpen}
        onClose={() => setGenerateLogoModalOpen(false)}
        onGenerate={handleGenerateLogos}
        onSave={handleSaveGeneratedLogo}
        isGenerating={generateLogoMutation.isPending}
        isSaving={isSavingGeneratedLogo}
        initialPrompt={initialLogoPrompt}
      />
    </>
  );
}
