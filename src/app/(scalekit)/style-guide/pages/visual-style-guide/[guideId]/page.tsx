'use client';

import {
  useVisualStyleGuide,
  useSystemRole,
  usePaletteColors,
  useTypographyStyles,
  useLogoAssets,
} from '@/app/(scalekit)/style-guide/lib/hooks';
import { COLOR_USAGE_OPTION } from '@/app/(scalekit)/style-guide/lib/constants/palette-colors';
import { scanVisualStyleGuide } from '@/app/(scalekit)/style-guide/lib/utils/scan-visual-style-guide';
import { useCreateCaptureRequest } from '@/app/(scalekit)/source-and-snap/lib/hooks';
import { toast } from '@/components/core/toaster';
import { Grid, Sheet } from '@mui/joy';
import Alert from '@mui/joy/Alert';
import Button from '@mui/joy/Button';
import Box from '@mui/joy/Box';
import CircularProgress from '@mui/joy/CircularProgress';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import { useParams, useRouter } from 'next/navigation';
import * as React from 'react';
import { createClient } from '@/lib/supabase/client';
import VisualStyleGuideActivityTracker from './components/visual-style-guide-activity-tracker';
import VisualStyleGuideBreadcrumbs from './components/visual-style-guide-breadcrumbs';
import VisualStyleGuideColors from './components/visual-style-guide-colors';
import VisualStyleGuideHeader from './components/visual-style-guide-header';
import VisualStyleGuideLogos from './components/visual-style-guide-logos';
import VisualStyleGuideTypography from './components/visual-style-guide-typography';
import { Plus } from '@phosphor-icons/react';

function EmptyVisualStyleGuideState({ onEditMood }: { onEditMood: () => void }): React.JSX.Element {
  return (
    <Stack spacing={4}>
      <Alert variant='soft' color='neutral' sx={{ alignItems: 'flex-start' }}>
        <Stack spacing={0.5}>
          <Typography level='title-sm'>
            We couldn&apos;t detect or extract your fonts and colors.
          </Typography>
          <Typography level='body-sm' color='neutral'>
            Default options have been applied that match your style, but you can edit and customize
            them in Edit mode.
          </Typography>
        </Stack>
      </Alert>

      <Stack spacing={3} alignItems='center' textAlign='center' sx={{ py: 4 }}>
        <Box>
          <Typography level='h2' sx={{ display: 'block' }}>
            Don&apos;t have any logos,
          </Typography>
          <Typography level='h2' sx={{ display: 'block' }}>
            typography and colors yet.
          </Typography>
        </Box>
        <Typography level='body-md' sx={{ display: 'block' }}>
          Go to Edit mode to upload your own or generate new ones.
        </Typography>
        <Button variant='soft' size='lg' startDecorator={<Plus />} onClick={onEditMood}>
          Go to Edit Mode
        </Button>
      </Stack>
    </Stack>
  );
}

export default function VisualStyleGuideOverviewPage(): React.JSX.Element {
  const params = useParams();
  const router = useRouter();
  const guideId = params?.guideId as string;

  const [isEditableView, setIsEditableView] = React.useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = React.useState<boolean>(false);

  const { data: guide, isLoading, refetch } = useVisualStyleGuide(guideId);
  const { data: isSystemRole } = useSystemRole();
  const createCaptureRequest = useCreateCaptureRequest();
  const { data: paletteColors, isLoading: colorsLoading } = usePaletteColors();
  const { data: typographyStyles, isLoading: typographyLoading } = useTypographyStyles(guideId);
  const { data: logoAssets, isLoading: logosLoading } = useLogoAssets(guideId);

  const guideColors = React.useMemo(
    () => (paletteColors || []).filter((color) => String(color.style_guide_id || '') === guideId),
    [paletteColors, guideId]
  );

  const colorSchemeColors = React.useMemo(
    () =>
      guideColors.filter(
        (color) =>
          String(color.usage_option || '') !== COLOR_USAGE_OPTION.FOREGROUND &&
          String(color.usage_option || '') !== COLOR_USAGE_OPTION.BACKGROUND
      ),
    [guideColors]
  );

  const typographyColors = React.useMemo(
    () =>
      guideColors.filter(
        (color) =>
          String(color.usage_option || '') === COLOR_USAGE_OPTION.FOREGROUND ||
          String(color.usage_option || '') === COLOR_USAGE_OPTION.BACKGROUND
      ),
    [guideColors]
  );

  const hasColorSchemeColors = colorSchemeColors.length > 0;
  const hasLogos = (logoAssets?.length || 0) > 0;
  const hasTypographyItems = typographyColors.length + (typographyStyles?.length || 0) > 0;

  const showEmptyState =
    !colorsLoading &&
    !typographyLoading &&
    !logosLoading &&
    !hasColorSchemeColors &&
    !hasTypographyItems &&
    !hasLogos;

  const handleGoToEditMood = React.useCallback(() => {
    setIsEditableView(true);
  }, []);

  // // Show all colors for the customer, not just for this guide
  // const sortedColors = React.useMemo(() => {
  //   return (colors || []).sort(
  //     (a: PaletteColor, b: PaletteColor) =>
  //       (a.sort_order as number) - (b.sort_order as number)
  //   );
  // }, [colors]);

  const handlePublish = React.useCallback(() => {
    toast.info('Publish functionality coming soon');
  }, []);

  const handleRefresh = React.useCallback(async () => {
    if (!guide || !guide.customer_id) {
      toast.error('Unable to refresh: guide data not available');
      return;
    }

    setIsRefreshing(true);

    try {
      const supabase = createClient();

      // Get customer email_domain to build URL
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('email_domain, name')
        .eq('customer_id', guide.customer_id)
        .single();

      if (customerError || !customerData?.email_domain) {
        throw new Error('Failed to get customer email domain');
      }

      const url = `https://www.${customerData.email_domain}`;
      const name = guide.name || `${customerData.name} Visual Style Guide`;

      // Delete existing palette colors, typography styles, and logo assets for this guide
      console.log('Clearing existing guide data...');
      const [colorsDelete, typographyDelete, logosDelete] = await Promise.all([
        supabase.from('palette_colors').delete().eq('style_guide_id', guideId),
        supabase.from('typography_styles').delete().eq('visual_style_guide_id', guideId),
        supabase.from('logo_assets').delete().eq('visual_style_guide_id', guideId),
      ]);

      if (colorsDelete.error || typographyDelete.error || logosDelete.error) {
        console.warn('Some deletions failed, continuing anyway...');
      }

      console.log('✓ Cleared existing guide data');

      // Execute scan & create process (will update existing guide)
      const result = await scanVisualStyleGuide(
        {
          url,
          name,
          customerId: guide.customer_id,
          visualStyleGuideId: guideId, // Update existing guide
          openCaptureViewer: true,
        },
        async (payload) => {
          const request = await createCaptureRequest.mutateAsync(payload);
          return { web_screenshot_capture_request_id: request.web_screenshot_capture_request_id };
        }
      );

      if (result.errors.length > 0) {
        toast.warning(
          `Visual style guide refreshed, but some extractions failed. Check the guide for details.`
        );
      } else {
        toast.success('Visual style guide refreshed successfully!');
      }

      // Refetch the guide data
      await refetch();
    } catch (error) {
      console.error('Error refreshing visual style guide:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to refresh visual style guide');
    } finally {
      setIsRefreshing(false);
    }
  }, [guide, guideId, createCaptureRequest, refetch, router]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!guide) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert color='danger'>Style guide not found</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 'var(--Content-padding)' }}>
      <Stack spacing={3}>
        <Stack spacing={1}>
          <VisualStyleGuideHeader
            name={String(guide.name || '')}
            description={guide.description ? String(guide.description) : null}
            onPublish={handlePublish}
            isEditableView={isEditableView}
            handleVisualStyleGuideEdit={setIsEditableView}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
            showRefresh={isSystemRole === true}
          />
          <VisualStyleGuideBreadcrumbs guideName={String(guide.name || '')} />
        </Stack>
        <Sheet
          sx={{
            borderTop: '1px solid var(--joy-palette-divider)',
            p: 2,
          }}
        >
          <Grid container spacing={3}>
            <Grid
              xs={12}
              md={9}
              sx={{
                borderRight: { md: '1px solid var(--joy-palette-divider)' },
                pr: { md: 2.5 },
              }}
            >
              {showEmptyState && !isEditableView ? (
                <EmptyVisualStyleGuideState onEditMood={handleGoToEditMood} />
              ) : (
                <Stack spacing={4.5}>
                  <VisualStyleGuideColors guideId={guideId} isEditable={isEditableView} />
                  <VisualStyleGuideTypography guideId={guideId} isEditableView={isEditableView} />
                  <VisualStyleGuideLogos guideId={guideId} isEditableView={isEditableView} />
                </Stack>
              )}
            </Grid>

            <Grid xs={12} md={3}>
              <VisualStyleGuideActivityTracker />
            </Grid>
          </Grid>
        </Sheet>
      </Stack>
    </Box>
  );
}
