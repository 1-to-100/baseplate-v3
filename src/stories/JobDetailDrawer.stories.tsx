import type { Meta, StoryObj } from '@storybook/nextjs';
import React from 'react';
import { expect, within } from 'storybook/test';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { JobDetailDrawer } from '@/components/dashboard/llm-jobs/job-detail-drawer';
import { createMockJob } from './__fixtures__/llm-jobs';
import type { LLMJobWithRelations } from '@/types/llm-jobs';

/**
 * JobDetailDrawer uses React Query hooks internally (useLLMJob, useCancelLLMJob),
 * so we pre-seed a QueryClient with mock data rather than trying to mock the hooks.
 * Drawer content renders in a MUI portal, so play functions query ownerDocument.body.
 */

function createSeededClient(job: LLMJobWithRelations | null): QueryClient {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
    },
  });
  if (job) {
    client.setQueryData(['llm-job', job.id], job);
  }
  return client;
}

const meta = {
  title: 'Dashboard/JobDetailDrawer',
  component: JobDetailDrawer,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
} satisfies Meta<typeof JobDetailDrawer>;

export default meta;
type Story = StoryObj<typeof meta>;

const completedJob = createMockJob({
  id: 'job-drawer-completed',
  status: 'completed',
  system_prompt: 'You are a helpful business analyst.',
  prompt: 'Summarize the quarterly report for Q4 2025',
  result_ref: JSON.stringify({
    output: 'Q4 2025 showed strong growth across all segments...',
    usage: { prompt_tokens: 150, completion_tokens: 300, total_tokens: 450 },
    model: 'gpt-4o',
  }),
});

const errorJob = createMockJob({
  id: 'job-drawer-error',
  status: 'error',
  error_message: 'Rate limit exceeded. Provider returned HTTP 429 after 3 retries.',
  result_ref: null,
  retry_count: 3,
  completed_at: null,
});

const runningJob = createMockJob({
  id: 'job-drawer-running',
  status: 'running',
  result_ref: null,
  completed_at: null,
  started_at: '2026-02-09T10:00:05Z',
});

export const CompletedJob: Story = {
  args: {
    jobId: completedJob.id,
    open: true,
    onClose: () => {},
  },
  decorators: [
    (Story) => (
      <QueryClientProvider client={createSeededClient(completedJob)}>
        <Story />
      </QueryClientProvider>
    ),
  ],
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await expect(body.getByText('Job Details')).toBeInTheDocument();
    await expect(body.getByText('Basic Information')).toBeInTheDocument();
    await expect(body.getByText('Feature')).toBeInTheDocument();
    await expect(body.getByText('Response')).toBeInTheDocument();
    await expect(body.getByText('Result')).toBeInTheDocument();
  },
};

export const ErrorJob: Story = {
  args: {
    jobId: errorJob.id,
    open: true,
    onClose: () => {},
  },
  decorators: [
    (Story) => (
      <QueryClientProvider client={createSeededClient(errorJob)}>
        <Story />
      </QueryClientProvider>
    ),
  ],
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await expect(body.getByText('Job Details')).toBeInTheDocument();
    await expect(body.getByText('Error Message')).toBeInTheDocument();
    await expect(body.getByText(/Rate limit exceeded/)).toBeInTheDocument();
  },
};

export const RunningJob: Story = {
  args: {
    jobId: runningJob.id,
    open: true,
    onClose: () => {},
  },
  decorators: [
    (Story) => (
      <QueryClientProvider client={createSeededClient(runningJob)}>
        <Story />
      </QueryClientProvider>
    ),
  ],
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await expect(body.getByText('Job Details')).toBeInTheDocument();
    await expect(body.getByText('Job is still in progress...')).toBeInTheDocument();
    await expect(body.getByText('Cancel Job')).toBeInTheDocument();
  },
};

export const Closed: Story = {
  args: {
    jobId: null,
    open: false,
    onClose: () => {},
  },
  decorators: [
    (Story) => (
      <QueryClientProvider client={createSeededClient(null)}>
        <Story />
      </QueryClientProvider>
    ),
  ],
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const heading = body.queryByText('Job Details');
    // MUI Drawer may keep content in DOM during transitions; assert not visible
    if (heading) {
      await expect(heading).not.toBeVisible();
    }
  },
};
