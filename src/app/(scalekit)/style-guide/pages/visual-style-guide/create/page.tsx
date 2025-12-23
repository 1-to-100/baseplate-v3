'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/joy/Box';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import Breadcrumbs from '@mui/joy/Breadcrumbs';
import { BreadcrumbsItem } from '@/components/core/breadcrumbs-item';
import { BreadcrumbsSeparator } from '@/components/core/breadcrumbs-separator';
import { CreateVisualStyleGuideWizard } from '@/app/(scalekit)/style-guide/lib/components/create-visual-style-guide-wizard';
import { useVisualStyleGuides } from '@/app/(scalekit)/style-guide/lib/hooks';

export default function CreateVisualStyleGuidePage(): React.JSX.Element {
  const router = useRouter();
  const { data: visualStyleGuides, isLoading } = useVisualStyleGuides();
  const firstStyleGuide = visualStyleGuides?.[0];

  // Redirect to view page if a style guide already exists
  React.useEffect(() => {
    if (!isLoading && firstStyleGuide) {
      router.replace(`/style-guide/pages/visual-style-guide/${firstStyleGuide.visual_style_guide_id}`);
    }
  }, [firstStyleGuide, isLoading, router]);

  // Show loading state while checking
  if (isLoading) {
    return (
      <Box sx={{ p: 'var(--Content-padding)' }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  // Don't render if redirecting
  if (firstStyleGuide) {
    return <></>;
  }

  return (
    <Box sx={{ p: 'var(--Content-padding)' }}>
      <Stack spacing={3}>
        <Breadcrumbs separator={<BreadcrumbsSeparator />}>
          <BreadcrumbsItem href="/style-guide/">Style Guide</BreadcrumbsItem>
          <BreadcrumbsItem type="end">Create Visual Style Guide</BreadcrumbsItem>
        </Breadcrumbs>

        <Stack spacing={1}>
          <Typography level="h1">Create Visual Style Guide</Typography>
          <Typography level="body-md" color="neutral">
            Set up a visual identity for your company that can be applied across social banners and templates
          </Typography>
        </Stack>

        <CreateVisualStyleGuideWizard />
      </Stack>
    </Box>
  );
}

