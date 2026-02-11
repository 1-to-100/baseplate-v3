'use client';

import * as React from 'react';
import Box from '@mui/joy/Box';
import Button from '@mui/joy/Button';
import Chip from '@mui/joy/Chip';
import Divider from '@mui/joy/Divider';
import Drawer from '@mui/joy/Drawer';
import IconButton from '@mui/joy/IconButton';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import Skeleton from '@mui/joy/Skeleton';
import Textarea from '@mui/joy/Textarea';
import ModalClose from '@mui/joy/ModalClose';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';
import { Copy as CopyIcon } from '@phosphor-icons/react/dist/ssr/Copy';

import { useLLMJob, useCancelLLMJob } from '@/hooks/use-llm-jobs';
import { JobStatusIndicator } from '@/components/core/job-status-indicator';
import { CANCELLABLE_STATUSES } from '@/types/llm-jobs';
import { toast } from '@/components/core/toaster';

interface JobDetailDrawerProps {
  jobId: string | null;
  open: boolean;
  onClose: () => void;
}

function formatDate(date: string | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleString();
}

function formatDuration(startDate: string | null, endDate: string | null): string {
  if (!startDate || !endDate) return '-';
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const durationMs = end - start;

  if (durationMs < 1000) return `${durationMs}ms`;
  if (durationMs < 60000) return `${(durationMs / 1000).toFixed(1)}s`;
  return `${(durationMs / 60000).toFixed(1)}m`;
}

function DetailRow({
  label,
  value,
  isLoading,
  copyable,
}: {
  label: string;
  value: React.ReactNode;
  isLoading?: boolean;
  copyable?: string;
}): React.JSX.Element {
  const handleCopy = () => {
    if (copyable) {
      navigator.clipboard.writeText(copyable).then(() => {
        toast.success('Copied to clipboard');
      });
    }
  };

  return (
    <Stack spacing={0.5}>
      <Typography level='body-xs' sx={{ color: 'text.tertiary', fontWeight: 600 }}>
        {label}
      </Typography>
      {isLoading ? (
        <Skeleton variant='text' width={200} />
      ) : (
        <Stack direction='row' spacing={0.5} sx={{ alignItems: 'center' }}>
          <Typography level='body-sm' sx={{ color: 'text.primary', wordBreak: 'break-all' }}>
            {value || '-'}
          </Typography>
          {copyable && (
            <IconButton size='sm' variant='plain' onClick={handleCopy}>
              <CopyIcon size={14} />
            </IconButton>
          )}
        </Stack>
      )}
    </Stack>
  );
}

function CodeBlock({
  content,
  label,
}: {
  content: string | null;
  label: string;
}): React.JSX.Element {
  const handleCopy = () => {
    if (content) {
      navigator.clipboard.writeText(content).then(() => {
        toast.success(`${label} copied to clipboard`);
      });
    }
  };

  return (
    <Stack spacing={1}>
      <Stack direction='row' sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography level='body-xs' sx={{ color: 'text.tertiary', fontWeight: 600 }}>
          {label}
        </Typography>
        {content && (
          <IconButton size='sm' variant='plain' onClick={handleCopy}>
            <CopyIcon size={14} />
          </IconButton>
        )}
      </Stack>
      <Textarea
        readOnly
        value={content || 'N/A'}
        minRows={3}
        maxRows={10}
        sx={{
          fontFamily: 'monospace',
          fontSize: '12px',
          bgcolor: 'var(--joy-palette-background-level1)',
        }}
      />
    </Stack>
  );
}

export function JobDetailDrawer({ jobId, open, onClose }: JobDetailDrawerProps): React.JSX.Element {
  const { data: job, isLoading, error } = useLLMJob(jobId);
  const cancelMutation = useCancelLLMJob();

  const canCancel = job && CANCELLABLE_STATUSES.includes(job.status);

  const handleCancel = () => {
    if (job) {
      cancelMutation.mutate(job.id);
    }
  };

  // Parse result_ref if it's a JSON string
  const parsedResult = React.useMemo(() => {
    if (!job?.result_ref) return null;
    try {
      return JSON.stringify(JSON.parse(job.result_ref), null, 2);
    } catch {
      return job.result_ref;
    }
  }, [job?.result_ref]);

  // Parse input if it's an object
  const formattedInput = React.useMemo(() => {
    if (!job?.input) return null;
    try {
      return JSON.stringify(job.input, null, 2);
    } catch {
      return String(job.input);
    }
  }, [job?.input]);

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={onClose}
      size='md'
      slotProps={{
        content: {
          sx: {
            width: { xs: '100%', sm: 480 },
            maxWidth: '100vw',
          },
        },
      }}
    >
      <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Stack
          direction='row'
          sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}
        >
          <Stack spacing={1}>
            <Typography level='title-lg'>Job Details</Typography>
            {isLoading ? (
              <Skeleton variant='text' width={200} />
            ) : job ? (
              <Stack direction='row' spacing={1} sx={{ alignItems: 'center' }}>
                <JobStatusIndicator status={job.status} size='sm' />
                <Chip size='sm' variant='outlined'>
                  {job.feature_slug || 'No feature'}
                </Chip>
              </Stack>
            ) : null}
          </Stack>
          <ModalClose />
        </Stack>

        {error ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography level='body-md' color='danger'>
              Failed to load job details
            </Typography>
            <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
              {error instanceof Error ? error.message : 'Unknown error'}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            <Stack spacing={3}>
              {/* Basic Info */}
              <Stack spacing={2}>
                <Typography level='title-sm'>Basic Information</Typography>
                <DetailRow
                  label='Job ID'
                  value={job?.id}
                  isLoading={isLoading}
                  copyable={job?.id}
                />
                <DetailRow
                  label='Provider'
                  value={job?.provider?.name || job?.provider_id}
                  isLoading={isLoading}
                />
                <DetailRow label='Feature' value={job?.feature_slug} isLoading={isLoading} />
                <DetailRow
                  label='Customer'
                  value={job?.customer?.name || job?.customer_id}
                  isLoading={isLoading}
                />
                <DetailRow
                  label='User'
                  value={job?.user ? job.user.full_name || job.user.email : job?.user_id || 'N/A'}
                  isLoading={isLoading}
                />
                <DetailRow
                  label='Retry Count'
                  value={job?.retry_count?.toString()}
                  isLoading={isLoading}
                />
              </Stack>

              <Divider />

              {/* Timeline */}
              <Stack spacing={2}>
                <Typography level='title-sm'>Timeline</Typography>
                <DetailRow
                  label='Created'
                  value={formatDate(job?.created_at ?? null)}
                  isLoading={isLoading}
                />
                <DetailRow
                  label='Started'
                  value={formatDate(job?.started_at ?? null)}
                  isLoading={isLoading}
                />
                <DetailRow
                  label='Completed'
                  value={formatDate(job?.completed_at ?? null)}
                  isLoading={isLoading}
                />
                {job?.cancelled_at && (
                  <DetailRow
                    label='Cancelled'
                    value={formatDate(job.cancelled_at)}
                    isLoading={isLoading}
                  />
                )}
                <DetailRow
                  label='Duration'
                  value={formatDuration(job?.started_at ?? null, job?.completed_at ?? null)}
                  isLoading={isLoading}
                />
              </Stack>

              <Divider />

              {/* Prompt & Input */}
              <Stack spacing={2}>
                <Typography level='title-sm'>Request</Typography>
                {job?.system_prompt && (
                  <CodeBlock content={job.system_prompt} label='System Prompt' />
                )}
                <CodeBlock content={job?.prompt ?? null} label='Prompt' />
                {formattedInput && <CodeBlock content={formattedInput} label='Input' />}
              </Stack>

              <Divider />

              {/* Result / Error */}
              <Stack spacing={2}>
                <Typography level='title-sm'>Response</Typography>
                {job?.status === 'completed' && parsedResult && (
                  <CodeBlock content={parsedResult} label='Result' />
                )}
                {(job?.status === 'error' || job?.status === 'exhausted') && (
                  <Stack spacing={1}>
                    <Typography level='body-xs' sx={{ color: 'text.tertiary', fontWeight: 600 }}>
                      Error Message
                    </Typography>
                    <Box
                      sx={{
                        p: 2,
                        bgcolor: 'danger.softBg',
                        borderRadius: 'sm',
                      }}
                    >
                      <Typography level='body-sm' sx={{ color: 'danger.700' }}>
                        {job?.error_message || 'Unknown error'}
                      </Typography>
                    </Box>
                  </Stack>
                )}
                {job?.status === 'cancelled' && (
                  <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
                    This job was cancelled before completion.
                  </Typography>
                )}
                {!['completed', 'error', 'exhausted', 'cancelled'].includes(job?.status || '') && (
                  <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
                    Job is still in progress...
                  </Typography>
                )}
              </Stack>
            </Stack>
          </Box>
        )}

        {/* Footer Actions */}
        {job && (
          <>
            <Divider sx={{ my: 2 }} />
            <Stack direction='row' spacing={1} sx={{ justifyContent: 'flex-end' }}>
              <Button variant='outlined' color='neutral' onClick={onClose}>
                Close
              </Button>
              {canCancel && (
                <Button
                  variant='solid'
                  color='danger'
                  onClick={handleCancel}
                  loading={cancelMutation.isPending}
                  startDecorator={<XIcon size={18} />}
                >
                  Cancel Job
                </Button>
              )}
            </Stack>
          </>
        )}
      </Box>
    </Drawer>
  );
}
