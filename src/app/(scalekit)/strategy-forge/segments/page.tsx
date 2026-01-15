'use client';

import * as React from 'react';
import type { Metadata } from 'next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Box from '@mui/joy/Box';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import Card from '@mui/joy/Card';
import CardContent from '@mui/joy/CardContent';
import Button from '@mui/joy/Button';
import IconButton from '@mui/joy/IconButton';
import Grid from '@mui/joy/Grid';
import Chip from '@mui/joy/Chip';
import Alert from '@mui/joy/Alert';
import CircularProgress from '@mui/joy/CircularProgress';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { Lightbulb as LightbulbIcon } from '@phosphor-icons/react/dist/ssr/Lightbulb';
import { PencilSimple as EditIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { Trash as DeleteIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import { ChartPieSlice as SegmentIcon } from '@phosphor-icons/react/dist/ssr/ChartPieSlice';

import { config } from '@/config';
import { getSegmentsList, deleteSegment } from '../lib/api';
import type { Segment } from '../lib/types';
import { createClient } from '@/lib/supabase/client';
import { toast } from '@/components/core/toaster';

//export const metadata: Metadata = {
//  title: `Segments | Content Strategy | Dashboard | ${config.site.name}`
//};

export default function Page(): React.JSX.Element {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [deleteError, setDeleteError] = React.useState<string | null>(null);
  const [isSuggestingSegments, setIsSuggestingSegments] = React.useState(false);
  const supabase = createClient();

  // Fetch segments
  const {
    data: segmentsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['segments'],
    queryFn: () => getSegmentsList(),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteSegment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['segments'] });
      setDeleteError(null);
    },
    onError: (error: Error) => {
      setDeleteError(error.message);
    },
  });

  const handleDelete = async (segmentId: string, segmentName: string) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${segmentName}"? This action cannot be undone.`
      )
    ) {
      try {
        await deleteMutation.mutateAsync(segmentId);
      } catch (error) {
        // Error is handled by the mutation
      }
    }
  };

  const handleEdit = (segmentId: string) => {
    router.push(`/strategy-forge/segments/${segmentId}/edit`);
  };

  const handleCreate = () => {
    router.push('/strategy-forge/segments/create');
  };

  const handleSuggestSegments = React.useCallback(async () => {
    setIsSuggestingSegments(true);

    try {
      // Get current customer ID
      const { data: resolvedCustomerId, error: customerIdError } =
        await supabase.rpc('current_customer_id');

      if (customerIdError) {
        throw new Error(customerIdError.message);
      }

      if (!resolvedCustomerId || typeof resolvedCustomerId !== 'string') {
        throw new Error('Unable to resolve current customer id.');
      }

      // Verify session exists and refresh if needed
      let { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData?.session?.access_token) {
        throw new Error('Not authenticated. Please sign in and try again.');
      }

      // Refresh session if it's close to expiring (within 5 minutes)
      if (sessionData.session.expires_at) {
        const expiresIn = sessionData.session.expires_at * 1000 - Date.now();
        if (expiresIn < 5 * 60 * 1000) {
          const { data: refreshedSession, error: refreshError } =
            await supabase.auth.refreshSession();
          if (!refreshError && refreshedSession?.session) {
            sessionData = refreshedSession;
          }
        }
      }

      if (!sessionData?.session?.access_token) {
        throw new Error('Not authenticated. Please sign in and try again.');
      }

      const supabaseUrl = config.supabase.url;
      if (!supabaseUrl) {
        throw new Error('Supabase URL is not configured');
      }

      toast.success('Analyzing your website to suggest segments. This may take 30-60 seconds...');

      // Use direct fetch instead of supabase.functions.invoke() to have more control
      const functionUrl = `${supabaseUrl}/functions/v1/suggest-segments-for-customer-id`;
      const requestBody = {
        customer_id: resolvedCustomerId,
      };

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify(requestBody),
      });

      let data;
      try {
        const responseText = await response.text();
        data = responseText ? JSON.parse(responseText) : null;
      } catch (parseError) {
        console.error('Failed to parse function response:', parseError);
        throw new Error(`Function returned invalid JSON (status: ${response.status})`);
      }

      if (!response.ok) {
        const errorMessage =
          data?.error || data?.message || `Function returned status ${response.status}`;
        throw new Error(errorMessage);
      }

      if (!data || !data.success) {
        throw new Error('Invalid response from suggest-segments-for-customer-id function');
      }

      toast.success(`Successfully created ${data.segments_created} market segments!`);

      // Reload segments
      queryClient.invalidateQueries({ queryKey: ['segments'] });
    } catch (err) {
      console.error('Failed to suggest segments:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to suggest segments');
    } finally {
      setIsSuggestingSegments(false);
    }
  }, [supabase, queryClient]);

  const segments = segmentsData?.data || [];

  if (isLoading) {
    return (
      <Box sx={{ p: 'var(--Content-padding)' }}>
        <Stack spacing={3} alignItems='center' sx={{ py: 4 }}>
          <CircularProgress />
          <Typography level='body-md' color='neutral'>
            Loading segments...
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
              Failed to load segments: {error instanceof Error ? error.message : 'Unknown error'}
            </Typography>
          </Alert>
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
            <SegmentIcon size={24} />
            <Typography fontSize={{ xs: 'xl3', lg: 'xl4' }} level='h1'>
              Segments
            </Typography>
          </Stack>
          <Stack direction='row' spacing={2}>
            <Button
              variant='outlined'
              color='primary'
              startDecorator={
                isSuggestingSegments ? <CircularProgress size='sm' /> : <LightbulbIcon size={16} />
              }
              onClick={handleSuggestSegments}
              disabled={isSuggestingSegments}
              loading={isSuggestingSegments}
            >
              {isSuggestingSegments ? 'Analyzing...' : 'Suggest Segments'}
            </Button>
            <Button
              variant='solid'
              color='primary'
              startDecorator={<PlusIcon size={16} />}
              onClick={handleCreate}
            >
              Create Segment
            </Button>
          </Stack>
        </Stack>

        {/* Error Alert */}
        {deleteError && (
          <Alert color='danger'>
            <Typography level='body-md'>Failed to delete segment: {deleteError}</Typography>
          </Alert>
        )}

        {/* Content */}
        {isSuggestingSegments ? (
          <Card variant='outlined' sx={{ p: 4 }}>
            <Stack spacing={2} alignItems='center' textAlign='center'>
              <CircularProgress size='lg' />
              <Typography level='title-md'>Analyzing Your Website</Typography>
              <Typography level='body-md' color='neutral'>
                Generating market segment suggestions based on your company&apos;s positioning and
                target markets. This typically takes 30-60 seconds.
              </Typography>
            </Stack>
          </Card>
        ) : segments.length === 0 ? (
          <Card variant='outlined' sx={{ p: 4 }}>
            <Stack spacing={2} alignItems='center' textAlign='center'>
              <SegmentIcon size={48} color='var(--joy-palette-neutral-400)' />
              <Typography level='title-md' color='neutral'>
                No segments found
              </Typography>
              <Typography level='body-md' color='neutral'>
                Get started by creating your first market segment.
              </Typography>
              <Button
                variant='outlined'
                color='primary'
                startDecorator={<PlusIcon size={16} />}
                onClick={handleCreate}
                sx={{ mt: 1 }}
              >
                Create Segment
              </Button>
            </Stack>
          </Card>
        ) : (
          <Grid container spacing={2}>
            {segments.map((segment) => (
              <Grid xs={12} sm={6} md={4} key={segment.segment_id}>
                <Card variant='outlined' sx={{ height: '100%' }}>
                  <CardContent>
                    <Stack spacing={2}>
                      {/* Header */}
                      <Stack
                        direction='row'
                        spacing={2}
                        sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}
                      >
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography level='title-md' sx={{ mb: 0.5 }}>
                            {segment.name}
                          </Typography>
                          {segment.code && (
                            <Chip size='sm' variant='soft' color='primary'>
                              {segment.code}
                            </Chip>
                          )}
                        </Box>
                        <Stack direction='row' spacing={1}>
                          <IconButton
                            size='sm'
                            variant='outlined'
                            color='neutral'
                            onClick={() => handleEdit(segment.segment_id)}
                          >
                            <EditIcon size={16} />
                          </IconButton>
                          <IconButton
                            size='sm'
                            variant='outlined'
                            color='danger'
                            onClick={() => handleDelete(segment.segment_id, segment.name)}
                            disabled={deleteMutation.isPending}
                          >
                            <DeleteIcon size={16} />
                          </IconButton>
                        </Stack>
                      </Stack>

                      {/* Description */}
                      <Typography level='body-sm' color='neutral' sx={{ flex: 1 }}>
                        {segment.description}
                      </Typography>

                      {/* External ID */}
                      {segment.external_id && (
                        <Typography level='body-xs' color='neutral'>
                          External ID: {segment.external_id}
                        </Typography>
                      )}

                      {/* Metadata */}
                      <Stack direction='row' spacing={2} sx={{ alignItems: 'center' }}>
                        <Typography level='body-xs' color='neutral'>
                          Created: {new Date(segment.created_at).toLocaleDateString()}
                        </Typography>
                        {segment.updated_at !== segment.created_at && (
                          <Typography level='body-xs' color='neutral'>
                            Updated: {new Date(segment.updated_at).toLocaleDateString()}
                          </Typography>
                        )}
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Pagination Info */}
        {segmentsData?.meta && segmentsData.meta.total > segmentsData.meta.perPage && (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography level='body-sm' color='neutral'>
              Showing {segments.length} of {segmentsData.meta.total} segments
            </Typography>
          </Box>
        )}
      </Stack>
    </Box>
  );
}
