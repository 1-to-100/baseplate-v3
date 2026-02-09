import type { Meta, StoryObj } from '@storybook/nextjs';
import React from 'react';
import Box from '@mui/joy/Box';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';

import {
  JobStatusIndicator,
  JobStatusBadge,
  JobStatusText,
} from '@/components/core/job-status-indicator';
import type { LLMJobStatus } from '@/hooks/use-job-status';

// All possible LLM job statuses
const ALL_STATUSES: LLMJobStatus[] = [
  'queued',
  'running',
  'waiting_llm',
  'retrying',
  'completed',
  'error',
  'exhausted',
  'cancelled',
];

// =============================================================================
// JobStatusIndicator Stories
// =============================================================================

const indicatorMeta = {
  title: 'Components/JobStatusIndicator',
  component: JobStatusIndicator,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: { type: 'select' },
      options: [null, ...ALL_STATUSES],
      description: 'Current job status',
    },
    showProgress: {
      control: 'boolean',
      description: 'Show progress bar for loading states',
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
      description: 'Size variant',
    },
    label: {
      control: 'text',
      description: 'Custom label override',
    },
  },
} satisfies Meta<typeof JobStatusIndicator>;

export default indicatorMeta;
type Story = StoryObj<typeof indicatorMeta>;

export const Default: Story = {
  args: {
    status: 'running',
  },
};

export const Queued: Story = {
  args: {
    status: 'queued',
  },
};

export const Running: Story = {
  args: {
    status: 'running',
    showProgress: true,
  },
};

export const WaitingLLM: Story = {
  args: {
    status: 'waiting_llm',
    showProgress: true,
  },
};

export const Retrying: Story = {
  args: {
    status: 'retrying',
    showProgress: true,
  },
};

export const Completed: Story = {
  args: {
    status: 'completed',
  },
};

export const Error: Story = {
  args: {
    status: 'error',
  },
};

export const Exhausted: Story = {
  args: {
    status: 'exhausted',
  },
};

export const Cancelled: Story = {
  args: {
    status: 'cancelled',
  },
};

export const Unknown: Story = {
  args: {
    status: null,
  },
};

export const WithCustomLabel: Story = {
  args: {
    status: 'running',
    label: 'Generating Logo...',
  },
};

export const AllSizes: Story = {
  args: {
    status: 'completed',
  },
  render: () => (
    <Stack direction='row' spacing={2} alignItems='center'>
      <Box>
        <Typography level='body-xs' sx={{ mb: 1 }}>
          Small
        </Typography>
        <JobStatusIndicator status='completed' size='sm' />
      </Box>
      <Box>
        <Typography level='body-xs' sx={{ mb: 1 }}>
          Medium
        </Typography>
        <JobStatusIndicator status='completed' size='md' />
      </Box>
      <Box>
        <Typography level='body-xs' sx={{ mb: 1 }}>
          Large
        </Typography>
        <JobStatusIndicator status='completed' size='lg' />
      </Box>
    </Stack>
  ),
};

export const AllStatuses: Story = {
  args: {
    status: 'running',
  },
  render: () => (
    <Stack spacing={2}>
      <Typography level='title-md'>All Job Statuses</Typography>
      <Stack spacing={1.5}>
        {ALL_STATUSES.map((status) => (
          <Stack key={status} direction='row' spacing={2} alignItems='center'>
            <Typography level='body-sm' sx={{ width: 100 }}>
              {status}
            </Typography>
            <JobStatusIndicator status={status} />
          </Stack>
        ))}
        <Stack direction='row' spacing={2} alignItems='center'>
          <Typography level='body-sm' sx={{ width: 100 }}>
            null
          </Typography>
          <JobStatusIndicator status={null} />
        </Stack>
      </Stack>
    </Stack>
  ),
};

export const LoadingStatesWithProgress: Story = {
  args: {
    status: 'running',
  },
  render: () => (
    <Stack spacing={2}>
      <Typography level='title-md'>Loading States (with progress bar)</Typography>
      <Stack spacing={1.5}>
        <JobStatusIndicator status='queued' showProgress />
        <JobStatusIndicator status='running' showProgress />
        <JobStatusIndicator status='waiting_llm' showProgress />
        <JobStatusIndicator status='retrying' showProgress />
      </Stack>
    </Stack>
  ),
};

// =============================================================================
// JobStatusBadge Stories
// =============================================================================

export const BadgeDefault: Story = {
  args: { status: 'running' },
  render: () => <JobStatusBadge status='running' />,
};

export const BadgeAllStatuses: Story = {
  args: { status: 'running' },
  render: () => (
    <Stack spacing={2}>
      <Typography level='title-md'>JobStatusBadge (Icon Only)</Typography>
      <Stack direction='row' spacing={2} flexWrap='wrap'>
        {ALL_STATUSES.map((status) => (
          <Stack key={status} alignItems='center' spacing={0.5}>
            <JobStatusBadge status={status} />
            <Typography level='body-xs'>{status}</Typography>
          </Stack>
        ))}
        <Stack alignItems='center' spacing={0.5}>
          <JobStatusBadge status={null} />
          <Typography level='body-xs'>null</Typography>
        </Stack>
      </Stack>
    </Stack>
  ),
};

export const BadgeAllSizes: Story = {
  args: { status: 'completed' },
  render: () => (
    <Stack spacing={2}>
      <Typography level='title-md'>Badge Sizes</Typography>
      <Stack direction='row' spacing={3} alignItems='flex-end'>
        <Stack alignItems='center' spacing={0.5}>
          <JobStatusBadge status='completed' size='sm' />
          <Typography level='body-xs'>Small</Typography>
        </Stack>
        <Stack alignItems='center' spacing={0.5}>
          <JobStatusBadge status='completed' size='md' />
          <Typography level='body-xs'>Medium</Typography>
        </Stack>
        <Stack alignItems='center' spacing={0.5}>
          <JobStatusBadge status='completed' size='lg' />
          <Typography level='body-xs'>Large</Typography>
        </Stack>
      </Stack>
    </Stack>
  ),
};

// =============================================================================
// JobStatusText Stories
// =============================================================================

export const TextDefault: Story = {
  args: { status: 'running' },
  render: () => <JobStatusText status='running' />,
};

export const TextWithoutIcon: Story = {
  args: { status: 'completed' },
  render: () => <JobStatusText status='completed' showIcon={false} />,
};

export const TextAllStatuses: Story = {
  args: { status: 'running' },
  render: () => (
    <Stack spacing={2}>
      <Typography level='title-md'>JobStatusText</Typography>
      <Stack spacing={1}>
        {ALL_STATUSES.map((status) => (
          <Stack key={status} direction='row' spacing={2} alignItems='center'>
            <Typography level='body-sm' sx={{ width: 100 }}>
              {status}:
            </Typography>
            <JobStatusText status={status} />
          </Stack>
        ))}
        <Stack direction='row' spacing={2} alignItems='center'>
          <Typography level='body-sm' sx={{ width: 100 }}>
            null:
          </Typography>
          <JobStatusText status={null} />
        </Stack>
      </Stack>
    </Stack>
  ),
};

// =============================================================================
// Comparison Story
// =============================================================================

export const AllVariantsComparison: Story = {
  args: { status: 'running' },
  render: () => (
    <Stack spacing={4}>
      <Typography level='h4'>Job Status Components Comparison</Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '120px 1fr 1fr 1fr',
          gap: 2,
          alignItems: 'center',
        }}
      >
        <Typography level='title-sm'>Status</Typography>
        <Typography level='title-sm'>Indicator</Typography>
        <Typography level='title-sm'>Badge</Typography>
        <Typography level='title-sm'>Text</Typography>

        {ALL_STATUSES.map((status) => (
          <React.Fragment key={status}>
            <Typography level='body-sm'>{status}</Typography>
            <JobStatusIndicator status={status} />
            <JobStatusBadge status={status} />
            <JobStatusText status={status} />
          </React.Fragment>
        ))}
      </Box>
    </Stack>
  ),
};
