'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Box from '@mui/joy/Box';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import Card from '@mui/joy/Card';
import CardContent from '@mui/joy/CardContent';
import Button from '@mui/joy/Button';
import Input from '@mui/joy/Input';
import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';
import FormHelperText from '@mui/joy/FormHelperText';
import Switch from '@mui/joy/Switch';
import Alert from '@mui/joy/Alert';
import Divider from '@mui/joy/Divider';
import IconButton from '@mui/joy/IconButton';
import Tooltip from '@mui/joy/Tooltip';
import { X as CloseIcon } from '@phosphor-icons/react/dist/ssr/X';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/core/toaster';
import { createCaptureRequestSchema } from '../../lib/schemas';
import { useCreateCaptureRequest } from '../../lib/hooks';
import { DeviceProfileSelector } from '../components';
import { createClient } from '@/lib/supabase/client';
import type { z } from 'zod';

type FormData = z.infer<typeof createCaptureRequestSchema>;

interface WebCaptureFormProps {
  onSuccess?: (requestId: string) => void;
  onCancel?: () => void;
}

export function WebCaptureForm({ onSuccess, onCancel }: WebCaptureFormProps): React.JSX.Element {
  const router = useRouter();
  const createMutation = useCreateCaptureRequest();
  const [validationError, setValidationError] = React.useState<string | null>(null);
  const [isCapturing, setIsCapturing] = React.useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(createCaptureRequestSchema),
    defaultValues: {
      requested_url: '',
      device_profile_id: null,
      full_page: true,
      include_source: true,
      block_tracking: true,
    },
  });

  const deviceProfileId = watch('device_profile_id');
  const fullPage = watch('full_page');
  const includeSource = watch('include_source');
  const blockTracking = watch('block_tracking');

  // Client-side URL validation
  const validateUrl = React.useCallback((url: string): boolean => {
    if (!url.trim()) return false;
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }, []);

  const onSubmit = async (data: FormData) => {
    setValidationError(null);

    // Additional client-side validation
    if (!validateUrl(data.requested_url)) {
      setValidationError('Please enter a valid HTTP or HTTPS URL');
      return;
    }

    try {
      // Step 1: Create the capture request
      const result = await createMutation.mutateAsync(data);
      toast.success('Capture request created successfully');
      
      // Step 2: Call the edge function to capture the screenshot
      setIsCapturing(true);
      try {
        console.log('Invoking capture-web-screenshot edge function for new request:', result.web_screenshot_capture_request_id);
        const supabase = createClient();
        const { data: functionData, error: functionError } = await supabase.functions.invoke(
          'capture-web-screenshot',
          {
            body: {
              web_screenshot_capture_request_id: result.web_screenshot_capture_request_id,
            },
          }
        );

        if (functionError) {
          console.error('Edge function error:', functionError);
          throw new Error(functionError.message || 'Failed to capture screenshot');
        }

        if (functionData?.success && functionData.capture_id) {
          toast.success('Screenshot captured successfully!');
          
          const captureId = functionData.capture_id;
          
          // Step 3: Open a new window with the capture viewer
          const captureViewerUrl = `/source-and-snap/captures/${captureId}`;
          window.open(captureViewerUrl, '_blank');
          
          // Step 4: Call extract-colors function with the capture ID
          try {
            console.log('Calling extract-colors function for capture:', captureId);
            const { error: extractError } = await supabase.functions.invoke(
              'extract-colors',
              {
                body: {
                  web_screenshot_capture_id: captureId,
                },
              }
            );

            if (extractError) {
              console.error('Extract colors error:', extractError);
              // Don't throw - this is a background operation
              toast.error(`Color extraction failed: ${extractError.message}`);
            } else {
              toast.success('Color extraction started');
            }
          } catch (extractErr) {
            console.error('Exception calling extract-colors:', extractErr);
            // Don't throw - this is a background operation
          }
          
          if (onSuccess) {
            onSuccess(result.web_screenshot_capture_request_id);
          } else {
            // Navigate to the captures list
            router.push('/source-and-snap/captures');
          }
        } else {
          throw new Error(functionData?.message || 'Failed to capture screenshot');
        }
      } catch (captureError) {
        const errorMessage = captureError instanceof Error 
          ? captureError.message 
          : 'Failed to capture screenshot';
        setValidationError(errorMessage);
        toast.error(errorMessage);
        // Still navigate to captures list so user can see the request
        if (!onSuccess) {
          router.push('/source-and-snap/captures');
        }
      } finally {
        setIsCapturing(false);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create capture request';
      setValidationError(errorMessage);
      toast.error(errorMessage);
      setIsCapturing(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset the form? All entered data will be lost.')) {
      reset();
      setValidationError(null);
    }
  };

  const isFormDirty = watch('requested_url') !== '' || deviceProfileId !== null || fullPage || includeSource || !blockTracking;

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={3}>
          <Stack spacing={1}>
            <Typography level="h2">New Web Capture</Typography>
            <Typography level="body-md" color="neutral">
              Enter a public URL and capture settings to enqueue a screenshot job
            </Typography>
          </Stack>

          <Divider />

          {validationError && (
            <Alert
              color="danger"
              variant="soft"
              role="alert"
              endDecorator={
                <IconButton
                  variant="plain"
                  size="sm"
                  color="danger"
                  onClick={() => setValidationError(null)}
                  aria-label="Dismiss error"
                >
                  <CloseIcon size={16} />
                </IconButton>
              }
            >
              {validationError}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            <Stack spacing={3}>
              {/* URL Input */}
              <FormControl error={!!errors.requested_url} required>
                <FormLabel>Capture URL *</FormLabel>
                <Input
                  {...register('requested_url')}
                  type="url"
                  placeholder="https://example.com"
                  autoFocus
                  aria-label="Capture URL"
                  aria-invalid={!!errors.requested_url}
                  aria-describedby={errors.requested_url ? 'url-error' : 'url-help'}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isSubmitting) {
                      e.preventDefault();
                      handleSubmit(onSubmit)();
                    }
                  }}
                />
                {errors.requested_url && (
                  <FormHelperText id="url-error">{errors.requested_url.message}</FormHelperText>
                )}
                <FormHelperText id="url-help">
                  Enter a public URL to capture. The URL will be validated before submission.
                </FormHelperText>
              </FormControl>

              {/* Device Profile Selector */}
              <DeviceProfileSelector
                value={deviceProfileId}
                onChange={(value) => setValue('device_profile_id', value, { shouldValidate: true })}
                error={!!errors.device_profile_id}
                helperText={errors.device_profile_id?.message}
              />

              {/* Capture Options */}
              <Stack spacing={2}>
                <Typography level="title-sm">Capture Options</Typography>

                <FormControl>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Switch
                      checked={fullPage}
                      onChange={(e) => setValue('full_page', e.target.checked)}
                      aria-label="Full Page Capture"
                    />
                    <Box>
                      <FormLabel>Full Page Capture</FormLabel>
                      <FormHelperText>
                        Capture the entire page by scrolling and stitching, not just the viewport
                      </FormHelperText>
                    </Box>
                  </Stack>
                </FormControl>

                <FormControl>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Switch
                      checked={includeSource}
                      onChange={(e) => setValue('include_source', e.target.checked)}
                      aria-label="Include Source (HTML/CSS)"
                      aria-describedby="include-source-help"
                    />
                    <Box>
                      <FormLabel>Include Source (HTML/CSS)</FormLabel>
                      <FormHelperText id="include-source-help">
                        Also capture raw HTML and CSS files. This may increase job time and storage usage.
                      </FormHelperText>
                    </Box>
                  </Stack>
                </FormControl>

                <FormControl>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Switch
                      checked={blockTracking}
                      onChange={(e) => setValue('block_tracking', e.target.checked)}
                      aria-label="Block Tracking"
                    />
                    <Box>
                      <FormLabel>Block Tracking</FormLabel>
                      <FormHelperText>
                        Block common tracking scripts and third-party requests for a cleaner render
                      </FormHelperText>
                    </Box>
                  </Stack>
                </FormControl>
              </Stack>

              {/* Actions */}
              <Stack direction="row" spacing={2} justifyContent="flex-end">
                {onCancel && (
                  <Button variant="outlined" onClick={onCancel} disabled={isSubmitting}>
                    Cancel
                  </Button>
                )}
                <Button variant="outlined" onClick={handleReset} disabled={isSubmitting || !isFormDirty}>
                  Reset
                </Button>
                <Button
                  type="submit"
                  loading={isSubmitting || isCapturing}
                  disabled={isSubmitting || isCapturing}
                  aria-label="Scan and create capture"
                  aria-busy={isSubmitting || isCapturing}
                >
                  {isCapturing ? 'Scanning and Creating...' : 'Scan and Create'}
                </Button>
              </Stack>
            </Stack>
          </form>
        </Stack>
      </CardContent>
    </Card>
  );
}

