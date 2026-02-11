import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs';
import { expect, fn, userEvent, within } from 'storybook/test';

import { LLMJobsStats } from '@/components/dashboard/llm-jobs/llm-jobs-stats';
import { ACTIVE_STATUSES, ERROR_STATUSES } from '@/types/llm-jobs';
import type { LLMJobStatus } from '@/types/llm-jobs';
import { MOCK_STATS } from './__fixtures__/llm-jobs';

/**
 * Stateful wrapper for testing visual toggle behaviour in isolation.
 * This is a simplified harness — the real page component may add URL param
 * persistence, cross-component filter coordination, etc. Page-level
 * integration should be covered by E2E tests.
 */
function InteractiveStats() {
  const [activeStatuses, setActiveStatuses] = React.useState<LLMJobStatus[]>([]);

  const handleStatusFilter = (statuses: LLMJobStatus[]) => {
    setActiveStatuses(statuses);
  };

  return (
    <LLMJobsStats
      stats={MOCK_STATS}
      activeStatuses={activeStatuses}
      onStatusFilter={handleStatusFilter}
    />
  );
}

const meta = {
  title: 'Dashboard/LLMJobsStats',
  component: LLMJobsStats,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: {
    onStatusFilter: fn(),
  },
} satisfies Meta<typeof LLMJobsStats>;

export default meta;
type Story = StoryObj<typeof meta>;

// Compute expected values from fixture data (keeps tests in sync with fixtures)
const expectedActive = ACTIVE_STATUSES.reduce((sum, s) => sum + MOCK_STATS[s], 0);
const expectedFailed = ERROR_STATUSES.reduce((sum, s) => sum + MOCK_STATS[s], 0);

// Helper: find the Card element by data-testid
function findCard(canvas: ReturnType<typeof within>, name: string): HTMLElement {
  return canvas.getByTestId(`stat-card-${name}`);
}

// Helper: check data-active attribute to determine active state
function isCardActive(el: HTMLElement): boolean {
  return el.getAttribute('data-active') === 'true';
}

export const Default: Story = {
  args: {
    stats: MOCK_STATS,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Total')).toBeInTheDocument();
    await expect(canvas.getByText('Active')).toBeInTheDocument();
    await expect(canvas.getByText('Queued')).toBeInTheDocument();
    await expect(canvas.getByText('Completed')).toBeInTheDocument();
    await expect(canvas.getByText('Failed')).toBeInTheDocument();
    await expect(canvas.getByText('Cancelled')).toBeInTheDocument();
    // Check computed values render (derived from MOCK_STATS, not hardcoded)
    await expect(canvas.getByText(String(MOCK_STATS.total))).toBeInTheDocument();
    await expect(canvas.getByText(String(expectedActive))).toBeInTheDocument();
    await expect(canvas.getByText(String(MOCK_STATS.queued))).toBeInTheDocument();
    await expect(canvas.getByText(String(MOCK_STATS.completed))).toBeInTheDocument();
    await expect(canvas.getByText(String(expectedFailed))).toBeInTheDocument();
    await expect(canvas.getByText(String(MOCK_STATS.cancelled))).toBeInTheDocument();
  },
};

export const Loading: Story = {
  args: {
    isLoading: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Card titles should still show
    await expect(canvas.getByText('Total')).toBeInTheDocument();
    await expect(canvas.getByText('Active')).toBeInTheDocument();
    // No numeric values should appear when loading (stats is undefined)
    await expect(canvas.queryByText(String(MOCK_STATS.total))).not.toBeInTheDocument();
  },
};

export const ClickActiveCard: Story = {
  args: {
    stats: MOCK_STATS,
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const activeCard = findCard(canvas, 'active');
    await userEvent.click(activeCard);
    await expect(args.onStatusFilter).toHaveBeenCalledWith(expect.arrayContaining(ACTIVE_STATUSES));
  },
};

export const ToggleActiveCard: Story = {
  args: {
    stats: MOCK_STATS,
    activeStatuses: [...ACTIVE_STATUSES],
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const activeCard = findCard(canvas, 'active');
    await userEvent.click(activeCard);
    // When all Active statuses are already present, clicking removes them
    await expect(args.onStatusFilter).toHaveBeenCalledWith([]);
  },
};

export const ClickTotalClearsFilter: Story = {
  args: {
    stats: MOCK_STATS,
    activeStatuses: [...ACTIVE_STATUSES],
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const totalCard = findCard(canvas, 'total');
    await userEvent.click(totalCard);
    await expect(args.onStatusFilter).toHaveBeenCalledWith([]);
  },
};

export const Interactive: Story = {
  args: {
    stats: MOCK_STATS,
  },
  render: () => <InteractiveStats />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Initially: Total is active (no filters), others are not
    const totalCard = findCard(canvas, 'total');
    const activeCard = findCard(canvas, 'active');
    const completedCard = findCard(canvas, 'completed');

    await expect(isCardActive(totalCard)).toBe(true);
    await expect(isCardActive(activeCard)).toBe(false);
    // Verify attribute is truly absent, not set to 'false'
    await expect(activeCard.hasAttribute('data-active')).toBe(false);
    await expect(isCardActive(completedCard)).toBe(false);

    // Click Active card — Active becomes highlighted, Total loses highlight
    await userEvent.click(activeCard);
    await expect(isCardActive(activeCard)).toBe(true);
    await expect(isCardActive(totalCard)).toBe(false);
    await expect(totalCard.hasAttribute('data-active')).toBe(false);
    await expect(isCardActive(completedCard)).toBe(false);

    // Click Completed card — both Active and Completed highlighted
    await userEvent.click(completedCard);
    await expect(isCardActive(activeCard)).toBe(true);
    await expect(isCardActive(completedCard)).toBe(true);
    await expect(isCardActive(totalCard)).toBe(false);

    // Click Total — clears all filters, Total becomes active again
    await userEvent.click(totalCard);
    await expect(isCardActive(totalCard)).toBe(true);
    await expect(isCardActive(activeCard)).toBe(false);
    await expect(isCardActive(completedCard)).toBe(false);
  },
};
