'use client';

import * as React from 'react';
import Card from '@mui/joy/Card';
import Stack from '@mui/joy/Stack';
import Button from '@mui/joy/Button';
import Typography from '@mui/joy/Typography';
import Textarea from '@mui/joy/Textarea';
import {
  MagicWand as MagicWandIcon,
  FloppyDisk as SaveIcon,
} from '@phosphor-icons/react/dist/ssr';

import { useUpdateVisualStyleGuide } from '@/app/(scalekit)/style-guide/lib/hooks';
import { toast } from '@/components/core/toaster';

type VisualStyleGuideImageryProps = {
  guideId: string;
  initialGuidelines: string;
};

export default function VisualStyleGuideImagery({
  guideId,
  initialGuidelines,
}: VisualStyleGuideImageryProps): React.JSX.Element {
  const updateGuide = useUpdateVisualStyleGuide();
  const [imageryGuidelines, setImageryGuidelines] = React.useState(initialGuidelines);
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    setImageryGuidelines(initialGuidelines);
  }, [initialGuidelines]);

  const handleRegenerate = React.useCallback(() => {
    toast.info('AI regeneration coming soon');
  }, []);

  const handleSave = React.useCallback(async () => {
    setIsSaving(true);
    try {
      await updateGuide.mutateAsync({
        id: guideId,
        input: { imagery_guidelines: imageryGuidelines || null },
      });
      toast.success('Imagery guideline saved successfully');
    } catch (error) {
      toast.error('Failed to save imagery guideline');
    } finally {
      setIsSaving(false);
    }
  }, [guideId, imageryGuidelines, updateGuide]);

  return (
    <Stack spacing={3} sx={{ mt: 2 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}
      >
        <Stack spacing={1}>
          <Typography level="title-md">Imagery Guidelines</Typography>
          <Typography level="body-sm" color="neutral">
            Define imagery tone and example usage to ensure consistent photography and illustration across assets
          </Typography>
        </Stack>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startDecorator={<MagicWandIcon />}
            onClick={handleRegenerate}
          >
            Regenerate with AI
          </Button>
          <Button
            startDecorator={<SaveIcon />}
            onClick={handleSave}
            loading={isSaving}
          >
            Save
          </Button>
        </Stack>
      </Stack>

      <Card>
        <Stack spacing={2}>
          <Typography level="title-md">Guidelines</Typography>
          <Textarea
            value={imageryGuidelines}
            onChange={(e) => setImageryGuidelines(e.target.value)}
            placeholder="Enter imagery guidelines that describe the tone, style, and example usage for photography and illustration. This will help ensure consistent visual assets across all templates."
            minRows={8}
          />
          <Typography level="body-sm" color="neutral">
            Describe the visual style, mood, color palette usage, and types of images that should be used in social banners and templates.
          </Typography>
        </Stack>
      </Card>
    </Stack>
  );
}


