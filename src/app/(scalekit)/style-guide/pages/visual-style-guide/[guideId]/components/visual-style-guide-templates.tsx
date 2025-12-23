'use client';

import * as React from 'react';
import Box from '@mui/joy/Box';
import Button from '@mui/joy/Button';
import Chip from '@mui/joy/Chip';
import CircularProgress from '@mui/joy/CircularProgress';
import Stack from '@mui/joy/Stack';
import Table from '@mui/joy/Table';
import Typography from '@mui/joy/Typography';
import {
  Image as ImageIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
} from '@phosphor-icons/react/dist/ssr';

import {
  useSocialTemplateTypes,
  useSocialTemplates,
  useUpdateSocialTemplate,
} from '@/app/(scalekit)/style-guide/lib/hooks';
import { toast } from '@/components/core/toaster';

type VisualStyleGuideTemplatesProps = {
  guideId: string;
};

export default function VisualStyleGuideTemplates({
  guideId,
}: VisualStyleGuideTemplatesProps): React.JSX.Element {
  const { data: templates, isLoading: templatesLoading } = useSocialTemplates(guideId);
  const { data: templateTypes } = useSocialTemplateTypes();
  const updateTemplate = useUpdateSocialTemplate();

  const handleToggleLock = React.useCallback(
    async (templateId: string, currentLocked: boolean) => {
      try {
        await updateTemplate.mutateAsync({
          id: templateId,
          input: { is_locked: !currentLocked },
        });
        toast.success(`Template ${!currentLocked ? 'locked' : 'unlocked'}`);
      } catch (error) {
        toast.error('Failed to update template');
      }
    },
    [updateTemplate],
  );

  return (
    <Stack spacing={3} sx={{ mt: 2 }}>
      <Typography level="title-md">Social Templates</Typography>

      {templatesLoading ? (
        <CircularProgress />
      ) : (
        <Table aria-label="social templates table">
          <thead>
            <tr>
              <th>Network</th>
              <th>Preview</th>
              <th>Default Copy</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {templates && templates.length > 0 ? (
              templates.map((template) => {
                const templateType = templateTypes?.find(
                  (tt) => String(tt.social_template_type_id) === String(template.social_template_type_id),
                );

                return (
                  <tr key={String(template.social_template_id)}>
                    <td>
                      <Chip variant="soft" size="sm">
                        {String(templateType?.display_name || templateType?.network || 'Unknown')}
                      </Chip>
                    </td>
                    <td>
                      <Box
                        sx={{
                          width: 120,
                          height: 60,
                          bgcolor: 'background.level1',
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <ImageIcon size={24} />
                      </Box>
                    </td>
                    <td>
                      <Typography level="body-sm">
                        {String(template.default_copy || 'No default copy set')}
                      </Typography>
                    </td>
                    <td>
                      <Chip
                        color={Boolean(template.is_locked) ? 'success' : 'neutral'}
                        variant="soft"
                        size="sm"
                      >
                        {Boolean(template.is_locked) ? 'Locked' : 'Unlocked'}
                      </Chip>
                    </td>
                    <td>
                      <Stack direction="row" spacing={1}>
                        <Button
                          size="sm"
                          variant="plain"
                          onClick={() => handleToggleLock(String(template.social_template_id), Boolean(template.is_locked))}
                        >
                          {Boolean(template.is_locked) ? <LockIcon /> : <LockOpenIcon />}
                        </Button>
                      </Stack>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} align="center">
                  <Typography level="body-sm" color="neutral">
                    No templates generated yet. Templates will be created when you publish the style guide.
                  </Typography>
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      )}
    </Stack>
  );
}


