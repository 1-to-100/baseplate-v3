'use client';

import * as React from 'react';
import type { Metadata } from 'next';
import Box from '@mui/joy/Box';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import Card from '@mui/joy/Card';
import CardContent from '@mui/joy/CardContent';
import Button from '@mui/joy/Button';
import Input from '@mui/joy/Input';
import Textarea from '@mui/joy/Textarea';
import Alert from '@mui/joy/Alert';
import CircularProgress from '@mui/joy/CircularProgress';
import { PencilSimple as PencilSimpleIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { Check as CheckIcon } from '@phosphor-icons/react/dist/ssr/Check';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';
import { Building as BuildingIcon } from '@phosphor-icons/react/dist/ssr/Building';

import { config } from '@/config';
import { getOrCreateCustomerInfo, updateCustomerInfo } from '../lib/api';
import type {
  CustomerInfo,
  CreateCustomerInfoPayload,
  UpdateCustomerInfoPayload,
} from '../lib/types';
import { createClient } from '@/lib/supabase/client';
import { toast } from '@/components/core/toaster';

//export const metadata = { title: `Company Overview Information | Dashboard | ${config.site.name}` } satisfies Metadata;

const SCREEN_TITLE = 'Company Overview Information';

interface EditableFieldProps {
  label: string;
  value?: string;
  multiline?: boolean;
  onSave: (value: string) => Promise<void>;
  placeholder?: string;
  maxLength?: number;
}

function EditableField({
  label,
  value,
  multiline = false,
  onSave,
  placeholder,
  maxLength,
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(value || '');
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const safeValue = value || '';

  React.useEffect(() => {
    setEditValue(safeValue);
  }, [safeValue]);

  // Check if the current edit value is different from the original value
  const hasChanges = editValue.trim() !== safeValue.trim();

  const handleSave = async () => {
    if (!hasChanges) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave(editValue.trim());
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(safeValue);
    setIsEditing(false);
    setError(null);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !multiline) {
      event.preventDefault();
      handleSave();
    } else if (event.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Typography level='title-sm' sx={{ mb: 1, color: 'text.secondary' }}>
        {label}
      </Typography>
      {isEditing ? (
        <Stack spacing={2}>
          {multiline ? (
            <Textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              minRows={3}
              maxRows={6}
              disabled={isSaving}
            />
          ) : (
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={isSaving}
            />
          )}
          {error && (
            <Alert color='danger' size='sm'>
              {error}
            </Alert>
          )}
          <Stack direction='row' spacing={1}>
            <Button
              size='sm'
              startDecorator={isSaving ? <CircularProgress size='sm' /> : <CheckIcon />}
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            <Button
              size='sm'
              variant='outlined'
              startDecorator={<XIcon />}
              onClick={handleCancel}
              disabled={isSaving}
            >
              Cancel
            </Button>
          </Stack>
        </Stack>
      ) : (
        <Box
          sx={{
            p: 2,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 'sm',
            cursor: 'pointer',
            '&:hover': {
              borderColor: 'primary.500',
              bgcolor: 'background.level1',
            },
            minHeight: multiline ? '80px' : '40px',
            display: 'flex',
            alignItems: multiline ? 'flex-start' : 'center',
            overflow: 'hidden',
          }}
          onClick={() => setIsEditing(true)}
        >
          <Typography
            level='body-md'
            sx={{
              flex: 1,
              whiteSpace: multiline ? 'pre-wrap' : 'normal',
              overflow: 'hidden',
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
            }}
          >
            {safeValue || (
              <em style={{ color: 'var(--joy-palette-text-tertiary)' }}>
                Click to add {label.toLowerCase()}
              </em>
            )}
          </Typography>
          <PencilSimpleIcon
            size={16}
            style={{ color: 'var(--joy-palette-text-tertiary)', marginLeft: '8px', flexShrink: 0 }}
          />
        </Box>
      )}
    </Box>
  );
}

export default function CustomerInfoPage(): React.JSX.Element {
  const [customerInfo, setCustomerInfo] = React.useState<CustomerInfo | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isGenerating, setIsGenerating] = React.useState(false);

  const loadCustomerInfo = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const info = await getOrCreateCustomerInfo();
      setCustomerInfo(info);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load company overview information');
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadCustomerInfo();
  }, [loadCustomerInfo]);

  const handleFieldUpdate = React.useCallback(
    async (
      field: keyof Omit<
        CustomerInfo,
        'customer_info_id' | 'customer_id' | 'created_at' | 'updated_at'
      >,
      value: string
    ) => {
      if (!customerInfo) return;

      const updatePayload: UpdateCustomerInfoPayload = {
        customer_info_id: customerInfo.customer_info_id,
        [field]: value,
      };

      const updatedInfo = await updateCustomerInfo(updatePayload);
      setCustomerInfo(updatedInfo);
    },
    [customerInfo]
  );

  // Check if company info is empty (needs AI generation)
  const isCompanyInfoEmpty = React.useMemo(() => {
    if (!customerInfo) return true;

    const emptyFields = [
      !customerInfo.tagline || customerInfo.tagline.trim() === '',
      !customerInfo.one_sentence_summary || customerInfo.one_sentence_summary.trim() === '',
      !customerInfo.problem_overview || customerInfo.problem_overview.trim() === '',
      !customerInfo.solution_overview || customerInfo.solution_overview.trim() === '',
    ];

    // Consider empty if 3 or more core fields are empty
    return emptyFields.filter(Boolean).length >= 3;
  }, [customerInfo]);

  const handleGenerateCompanyInfo = React.useCallback(async () => {
    setIsGenerating(true);
    try {
      console.log('[CompanyInfo] Calling create-company-information edge function...');

      const supabase = createClient();
      const { data, error: functionError } = await supabase.functions.invoke(
        'create-company-information',
        {
          body: {},
        }
      );

      console.log('[CompanyInfo] Edge function response:', { data, error: functionError });

      if (functionError) {
        console.error('[CompanyInfo] Edge function returned an error:', functionError);
        throw new Error(functionError.message || 'Failed to generate company overview information');
      }

      if (!data || !data.success) {
        throw new Error('Failed to generate company overview information');
      }

      toast.success('Company overview information generated successfully!');

      // Reload company info
      await loadCustomerInfo();
    } catch (error) {
      console.error('[CompanyInfo] ❌ Failed to generate company info:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to generate company overview information. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  }, [loadCustomerInfo]);

  if (isLoading) {
    return (
      <Box sx={{ p: 'var(--Content-padding)' }}>
        <Stack spacing={3} alignItems='center' sx={{ py: 4 }}>
          <CircularProgress />
          <Typography level='body-md'>Loading company overview information...</Typography>
        </Stack>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 'var(--Content-padding)' }}>
        <Stack spacing={3}>
          <Alert color='danger'>
            <Typography level='body-md'>{error}</Typography>
          </Alert>
          <Button onClick={loadCustomerInfo} startDecorator={<BuildingIcon />}>
            Retry
          </Button>
        </Stack>
      </Box>
    );
  }

  if (!customerInfo) {
    return (
      <Box sx={{ p: 'var(--Content-padding)' }}>
        <Stack spacing={3}>
          <Alert color='warning'>
            <Typography level='body-md'>
              Unable to load or create company overview information.
            </Typography>
          </Alert>
          <Button onClick={loadCustomerInfo} startDecorator={<BuildingIcon />}>
            Retry
          </Button>
        </Stack>
      </Box>
    );
  }

  // Show empty state or generation in progress
  if (isGenerating) {
    return (
      <Box sx={{ p: 'var(--Content-padding)' }}>
        <Stack spacing={3}>
          <div>
            <Typography
              fontSize={{ xs: 'xl3', lg: 'xl4' }}
              level='h1'
              startDecorator={<BuildingIcon />}
            >
              {SCREEN_TITLE}
            </Typography>
            <Typography level='body-md' sx={{ mt: 1 }}>
              Setting up your company profile
            </Typography>
          </div>

          <Card variant='outlined' sx={{ p: 4 }}>
            <Stack spacing={3} alignItems='center' sx={{ textAlign: 'center' }}>
              <CircularProgress size='lg' />
              <Typography level='h3'>Generating Your Company Overview Information</Typography>
              <Typography level='body-md' color='neutral' sx={{ maxWidth: '600px' }}>
                We&apos;re analyzing your company and creating a comprehensive profile. This
                includes your tagline, problem/solution overview, and content guidelines. This
                typically takes 30-60 seconds.
              </Typography>
              <Alert color='primary' variant='soft' sx={{ maxWidth: '600px' }}>
                <Typography level='body-sm'>
                  💡 The AI will analyze your company details to create compelling messaging that
                  you can refine and customize.
                </Typography>
              </Alert>
            </Stack>
          </Card>
        </Stack>
      </Box>
    );
  }

  if (isCompanyInfoEmpty) {
    return (
      <Box sx={{ p: 'var(--Content-padding)' }}>
        <Stack spacing={3}>
          <div>
            <Typography
              fontSize={{ xs: 'xl3', lg: 'xl4' }}
              level='h1'
              startDecorator={<BuildingIcon />}
            >
              {SCREEN_TITLE}
            </Typography>
            <Typography level='body-md' sx={{ mt: 1 }}>
              Set up your company profile
            </Typography>
          </div>

          <Card variant='outlined' sx={{ p: 4 }}>
            <Stack spacing={3} alignItems='center' sx={{ textAlign: 'center' }}>
              <BuildingIcon size={64} style={{ color: 'var(--joy-palette-text-tertiary)' }} />
              <Typography level='h3'>Generate Your Company Overview Information</Typography>
              <Typography level='body-md' color='neutral' sx={{ maxWidth: '600px' }}>
                Let AI analyze your company and create a comprehensive profile including your
                tagline, problem/solution overview, and content guidelines.
              </Typography>
              <Button size='lg' onClick={handleGenerateCompanyInfo} disabled={isGenerating}>
                Generate Company Overview Information
              </Button>
              <Alert color='primary' variant='soft' sx={{ maxWidth: '600px' }}>
                <Typography level='body-sm'>
                  💡 You can refine and customize all generated content after creation.
                </Typography>
              </Alert>
            </Stack>
          </Card>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 'var(--Content-padding)' }}>
      <Stack spacing={3}>
        <div>
          <Typography
            fontSize={{ xs: 'xl3', lg: 'xl4' }}
            level='h1'
            startDecorator={<BuildingIcon />}
          >
            {SCREEN_TITLE}
          </Typography>
          <Typography level='body-md' sx={{ mt: 1 }}>
            Manage your company&apos;s information and messaging. Click on any field to edit it.
          </Typography>
        </div>

        <Card>
          <CardContent sx={{ p: 3 }}>
            <Stack spacing={3}>
              <EditableField
                label='Tagline'
                value={customerInfo.tagline}
                placeholder='Enter your company tagline (3-7 words)'
                maxLength={256}
                onSave={(value) => handleFieldUpdate('tagline', value)}
              />

              <EditableField
                label='One Sentence Summary'
                value={customerInfo.one_sentence_summary}
                placeholder='Enter a concise one-sentence summary of your company'
                onSave={(value) => handleFieldUpdate('one_sentence_summary', value)}
              />

              <EditableField
                label='Problem Overview'
                value={customerInfo.problem_overview}
                multiline
                placeholder='Describe the problem your company solves (1 paragraph)'
                onSave={(value) => handleFieldUpdate('problem_overview', value)}
              />

              <EditableField
                label='Solution Overview'
                value={customerInfo.solution_overview}
                multiline
                placeholder='Describe your solution in audience-appropriate terms (1 paragraph)'
                onSave={(value) => handleFieldUpdate('solution_overview', value)}
              />
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
