import type { Meta, StoryObj } from '@storybook/nextjs';
import { expect, fn, userEvent, within } from 'storybook/test';
import React from 'react';
import Button from '@mui/joy/Button';

import { JobActionsMenu } from '@/components/dashboard/llm-jobs/job-actions-menu';
import { createMockJob } from './__fixtures__/llm-jobs';

/**
 * JobActionsMenu requires an anchor element for the Popper.
 * We render a trigger button that provides the anchorEl.
 * The Popper renders into a portal (document.body), so play
 * functions use `within(document.body)` for queries.
 */
const meta = {
  title: 'Dashboard/JobActionsMenu',
  component: JobActionsMenu,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  args: {
    onClose: fn(),
    onViewDetails: fn(),
    onCancel: fn(),
  },
  decorators: [
    (Story, context) => {
      const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
      const ref = React.useRef<HTMLButtonElement>(null);

      React.useEffect(() => {
        // Auto-open on mount so the menu is visible
        if (ref.current) {
          setAnchorEl(ref.current);
        }
      }, []);

      return (
        <>
          <Button ref={ref} onClick={() => setAnchorEl(ref.current)}>
            Open Menu
          </Button>
          <Story
            args={{
              ...context.args,
              anchorEl,
            }}
          />
        </>
      );
    },
  ],
} satisfies Meta<typeof JobActionsMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OpenWithCancellableJob: Story = {
  args: {
    job: createMockJob({ status: 'running' }),
    anchorEl: null, // Overridden by decorator at runtime
  },
  play: async () => {
    const body = within(document.body);
    await expect(body.getByText('View details')).toBeInTheDocument();
    await expect(body.getByText('Copy ID')).toBeInTheDocument();
    await expect(body.getByText('Cancel job')).toBeInTheDocument();
  },
};

export const OpenWithCompletedJob: Story = {
  args: {
    job: createMockJob({ status: 'completed' }),
    anchorEl: null,
  },
  play: async () => {
    const body = within(document.body);
    await expect(body.getByText('View details')).toBeInTheDocument();
    await expect(body.getByText('Copy ID')).toBeInTheDocument();
    await expect(body.queryByText('Cancel job')).not.toBeInTheDocument();
  },
};

export const ClickViewDetails: Story = {
  args: {
    job: createMockJob({ id: 'job-click-test', status: 'running' }),
    anchorEl: null,
  },
  play: async ({ args }) => {
    const body = within(document.body);
    const viewDetails = body.getByText('View details');
    await userEvent.click(viewDetails);
    await expect(args.onViewDetails).toHaveBeenCalledWith('job-click-test');
    await expect(args.onClose).toHaveBeenCalled();
  },
};

export const CancellingState: Story = {
  args: {
    job: createMockJob({ status: 'running' }),
    anchorEl: null,
    isCancelling: true,
  },
  play: async () => {
    const body = within(document.body);
    await expect(body.getByText('Cancelling...')).toBeInTheDocument();
  },
};
