'use client';

import * as React from 'react';
import type { Metadata } from 'next';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Box from '@mui/joy/Box';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import Card from '@mui/joy/Card';
import CardContent from '@mui/joy/CardContent';
import Button from '@mui/joy/Button';
import Input from '@mui/joy/Input';
import Textarea from '@mui/joy/Textarea';
import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';
import FormHelperText from '@mui/joy/FormHelperText';
import Alert from '@mui/joy/Alert';
import { ArrowLeft as ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr/ArrowLeft';
import { ChartPieSlice as SegmentIcon } from '@phosphor-icons/react/dist/ssr/ChartPieSlice';

import { config } from '@/config';
import { createSegment } from '../../lib/api';
import type { CreateSegmentPayload } from '../../lib/types';

// export const metadata: Metadata = { 
//   title: `Create Segment | Content Strategy | Dashboard | ${config.site.name}` 
// };

interface CreateSegmentFormData {
  name: string;
  description: string;
  code: string;
  external_id: string;
}

export default function Page(): React.JSX.Element {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateSegmentFormData>({
    defaultValues: {
      name: '',
      description: '',
      code: '',
      external_id: '',
    },
  });

  const createMutation = useMutation({
    mutationFn: createSegment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['segments'] });
      router.push('/strategy-forge/segments');
    },
    onError: (error: Error) => {
      setSubmitError(error.message);
    },
  });

  const onSubmit = async (data: CreateSegmentFormData) => {
    setSubmitError(null);
    
    // Clean up empty strings to undefined for optional fields
    const cleanedData: CreateSegmentPayload = {
      name: data.name,
      description: data.description,
      code: data.code || undefined,
      external_id: data.external_id || undefined,
    };

    try {
      await createMutation.mutateAsync(cleanedData);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleCancel = () => {
    router.push('/strategy-forge/segments');
  };

  return (
    <Box sx={{ p: 'var(--Content-padding)' }}>
      <Stack spacing={3}>
        {/* Header */}
        <Stack
          direction="row"
          spacing={2}
          sx={{ alignItems: 'center' }}
        >
          <Button
            variant="outlined"
            color="neutral"
            startDecorator={<ArrowLeftIcon size={16} />}
            onClick={handleCancel}
            sx={{ minWidth: 'auto', px: 1 }}
          >
            Back
          </Button>
          <SegmentIcon size={24} />
          <Typography fontSize={{ xs: 'xl3', lg: 'xl4' }} level="h1">
            Create Segment
          </Typography>
        </Stack>

        {/* Error Alert */}
        {submitError && (
          <Alert color="danger">
            <Typography level="body-md">
              Failed to create segment: {submitError}
            </Typography>
          </Alert>
        )}

        {/* Form */}
        <Card variant="outlined">
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)}>
              <Stack spacing={3}>
                {/* Name */}
                <FormControl error={!!errors.name}>
                  <FormLabel>Name *</FormLabel>
                  <Input
                    {...register('name', { required: 'Name is required' })}
                    placeholder="Enter segment name"
                    error={!!errors.name}
                  />
                  {errors.name && (
                    <FormHelperText>{errors.name.message}</FormHelperText>
                  )}
                </FormControl>

                {/* Description */}
                <FormControl error={!!errors.description}>
                  <FormLabel>Description *</FormLabel>
                  <Textarea
                    {...register('description', { required: 'Description is required' })}
                    placeholder="Enter segment description"
                    minRows={3}
                    error={!!errors.description}
                  />
                  {errors.description && (
                    <FormHelperText>{errors.description.message}</FormHelperText>
                  )}
                </FormControl>

                {/* Code */}
                <FormControl error={!!errors.code}>
                  <FormLabel>Code</FormLabel>
                  <Input
                    {...register('code')}
                    placeholder="Enter segment code (optional)"
                    error={!!errors.code}
                  />
                  {errors.code && (
                    <FormHelperText>{errors.code.message}</FormHelperText>
                  )}
                </FormControl>

                {/* External ID */}
                <FormControl error={!!errors.external_id}>
                  <FormLabel>External ID</FormLabel>
                  <Input
                    {...register('external_id')}
                    placeholder="Enter external ID (optional)"
                    error={!!errors.external_id}
                  />
                  {errors.external_id && (
                    <FormHelperText>{errors.external_id.message}</FormHelperText>
                  )}
                </FormControl>

                {/* Actions */}
                <Stack
                  direction="row"
                  spacing={2}
                  sx={{ justifyContent: 'flex-end', pt: 2 }}
                >
                  <Button
                    variant="outlined"
                    color="neutral"
                    onClick={handleCancel}
                    disabled={isSubmitting || createMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="solid"
                    color="primary"
                    loading={isSubmitting || createMutation.isPending}
                    startDecorator={!isSubmitting && !createMutation.isPending ? <SegmentIcon size={16} /> : undefined}
                  >
                    {isSubmitting || createMutation.isPending ? 'Creating...' : 'Create Segment'}
                  </Button>
                </Stack>
              </Stack>
            </form>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}

