'use client';

import * as React from 'react';
import type { Metadata } from 'next';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import CircularProgress from '@mui/joy/CircularProgress';
import Modal from '@mui/joy/Modal';
import ModalDialog from '@mui/joy/ModalDialog';
import DialogTitle from '@mui/joy/DialogTitle';
import DialogContent from '@mui/joy/DialogContent';
import DialogActions from '@mui/joy/DialogActions';
import { ArrowLeft as ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr/ArrowLeft';
import { ChartPieSlice as SegmentIcon } from '@phosphor-icons/react/dist/ssr/ChartPieSlice';
import { Trash as DeleteIcon } from '@phosphor-icons/react/dist/ssr/Trash';

import { config } from '@/config';
import { getSegmentById, updateSegment, deleteSegment } from '../../../lib/api';
import type { UpdateSegmentPayload } from '../../../lib/types';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

interface UpdateSegmentFormData {
  name: string;
  description: string;
  code: string;
  external_id: string;
}

// export const metadata: Metadata = {
//   title: `Edit Segment | Content Strategy | Dashboard | ${config.site.name}`
// };

export default function Page({ params }: PageProps): React.JSX.Element {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [segmentId, setSegmentId] = React.useState<string | null>(null);

  // Handle async params
  React.useEffect(() => {
    params.then((resolvedParams) => {
      setSegmentId(resolvedParams.id);
    });
  }, [params]);

  // Fetch segment data
  const {
    data: segment,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['segment', segmentId],
    queryFn: () => getSegmentById(segmentId!),
    enabled: !!segmentId,
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<UpdateSegmentFormData>({
    defaultValues: {
      name: '',
      description: '',
      code: '',
      external_id: '',
    },
  });

  // Update form when segment data loads
  React.useEffect(() => {
    if (segment) {
      reset({
        name: segment.name,
        description: segment.description,
        code: segment.code || '',
        external_id: segment.external_id || '',
      });
    }
  }, [segment, reset]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSegmentPayload }) =>
      updateSegment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['segments'] });
      queryClient.invalidateQueries({ queryKey: ['segment', segmentId] });
      router.push('/strategy-forge/segments');
    },
    onError: (error: Error) => {
      setSubmitError(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSegment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['segments'] });
      router.push('/strategy-forge/segments');
    },
    onError: (error: Error) => {
      setSubmitError(error.message);
    },
  });

  const onSubmit = async (data: UpdateSegmentFormData) => {
    setSubmitError(null);

    // Clean up empty strings to undefined for optional fields
    const cleanedData: UpdateSegmentPayload = {
      name: data.name,
      description: data.description,
      code: data.code || undefined,
      external_id: data.external_id || undefined,
    };

    try {
      await updateMutation.mutateAsync({ id: segmentId!, data: cleanedData });
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleDelete = async () => {
    if (!segment) return;

    setSubmitError(null);
    try {
      await deleteMutation.mutateAsync(segmentId!);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleCancel = () => {
    router.push('/strategy-forge/segments');
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 'var(--Content-padding)' }}>
        <Stack spacing={3} alignItems='center' sx={{ py: 4 }}>
          <CircularProgress />
          <Typography level='body-md' color='neutral'>
            Loading segment...
          </Typography>
        </Stack>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 'var(--Content-padding)' }}>
        <Stack spacing={3}>
          <Alert color='danger'>
            <Typography level='body-md'>
              Failed to load segment: {error instanceof Error ? error.message : 'Unknown error'}
            </Typography>
          </Alert>
          <Button
            variant='outlined'
            color='neutral'
            startDecorator={<ArrowLeftIcon size={16} />}
            onClick={handleCancel}
          >
            Back to Segments
          </Button>
        </Stack>
      </Box>
    );
  }

  if (!segment) {
    return (
      <Box sx={{ p: 'var(--Content-padding)' }}>
        <Stack spacing={3}>
          <Alert color='warning'>
            <Typography level='body-md'>Segment not found</Typography>
          </Alert>
          <Button
            variant='outlined'
            color='neutral'
            startDecorator={<ArrowLeftIcon size={16} />}
            onClick={handleCancel}
          >
            Back to Segments
          </Button>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 'var(--Content-padding)' }}>
      <Stack spacing={3}>
        {/* Header */}
        <Stack
          direction='row'
          spacing={2}
          sx={{ alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Stack direction='row' spacing={2} sx={{ alignItems: 'center' }}>
            <Button
              variant='outlined'
              color='neutral'
              startDecorator={<ArrowLeftIcon size={16} />}
              onClick={handleCancel}
              sx={{ minWidth: 'auto', px: 1 }}
            >
              Back
            </Button>
            <SegmentIcon size={24} />
            <Typography fontSize={{ xs: 'xl3', lg: 'xl4' }} level='h1'>
              Edit Segment
            </Typography>
          </Stack>
          <Button
            variant='outlined'
            color='danger'
            startDecorator={<DeleteIcon size={16} />}
            onClick={() => setShowDeleteModal(true)}
            disabled={isSubmitting || updateMutation.isPending || deleteMutation.isPending}
          >
            Delete
          </Button>
        </Stack>

        {/* Error Alert */}
        {submitError && (
          <Alert color='danger'>
            <Typography level='body-md'>{submitError}</Typography>
          </Alert>
        )}

        {/* Form */}
        <Card variant='outlined'>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)}>
              <Stack spacing={3}>
                {/* Name */}
                <FormControl error={!!errors.name}>
                  <FormLabel>Name *</FormLabel>
                  <Input
                    {...register('name', { required: 'Name is required' })}
                    placeholder='Enter segment name'
                    error={!!errors.name}
                  />
                  {errors.name && <FormHelperText>{errors.name.message}</FormHelperText>}
                </FormControl>

                {/* Description */}
                <FormControl error={!!errors.description}>
                  <FormLabel>Description *</FormLabel>
                  <Textarea
                    {...register('description', { required: 'Description is required' })}
                    placeholder='Enter segment description'
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
                    placeholder='Enter segment code (optional)'
                    error={!!errors.code}
                  />
                  {errors.code && <FormHelperText>{errors.code.message}</FormHelperText>}
                </FormControl>

                {/* External ID */}
                <FormControl error={!!errors.external_id}>
                  <FormLabel>External ID</FormLabel>
                  <Input
                    {...register('external_id')}
                    placeholder='Enter external ID (optional)'
                    error={!!errors.external_id}
                  />
                  {errors.external_id && (
                    <FormHelperText>{errors.external_id.message}</FormHelperText>
                  )}
                </FormControl>

                {/* Actions */}
                <Stack direction='row' spacing={2} sx={{ justifyContent: 'flex-end', pt: 2 }}>
                  <Button
                    variant='outlined'
                    color='neutral'
                    onClick={handleCancel}
                    disabled={isSubmitting || updateMutation.isPending || deleteMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type='submit'
                    variant='solid'
                    color='primary'
                    loading={isSubmitting || updateMutation.isPending}
                    startDecorator={
                      !isSubmitting && !updateMutation.isPending ? (
                        <SegmentIcon size={16} />
                      ) : undefined
                    }
                  >
                    {isSubmitting || updateMutation.isPending ? 'Updating...' : 'Update Segment'}
                  </Button>
                </Stack>
              </Stack>
            </form>
          </CardContent>
        </Card>

        {/* Delete Confirmation Modal */}
        <Modal open={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
          <ModalDialog variant='outlined' role='alertdialog'>
            <DialogTitle>
              <DeleteIcon size={20} />
              Delete Segment
            </DialogTitle>
            <DialogContent>
              <Typography level='body-md'>
                Are you sure you want to delete &ldquo;{segment.name}&rdquo;? This action cannot be
                undone.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button
                variant='outlined'
                color='neutral'
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant='solid'
                color='danger'
                onClick={handleDelete}
                loading={deleteMutation.isPending}
                startDecorator={!deleteMutation.isPending ? <DeleteIcon size={16} /> : undefined}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogActions>
          </ModalDialog>
        </Modal>
      </Stack>
    </Box>
  );
}
