import type { Meta, StoryObj } from '@storybook/nextjs';
import { expect, fn, userEvent, within } from 'storybook/test';

import { LLMJobsTable } from '@/components/dashboard/llm-jobs/llm-jobs-table';
import { MOCK_JOBS, MOCK_PAGINATION } from './__fixtures__/llm-jobs';

const meta = {
  title: 'Dashboard/LLMJobsTable',
  component: LLMJobsTable,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  args: {
    onPageChange: fn(),
    onJobSelect: fn(),
    onSort: fn(),
    onSelectionChange: fn(),
    onCancelJob: fn(),
    onBulkCancel: fn(),
  },
} satisfies Meta<typeof LLMJobsTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    jobs: MOCK_JOBS,
    pagination: MOCK_PAGINATION,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('table')).toBeInTheDocument();
    // Verify table has content rows (header + 5 data rows)
    const rows = canvas.getAllByRole('row');
    // 1 header row + 5 data rows
    await expect(rows.length).toBe(6);
  },
};

export const EmptyState: Story = {
  args: {
    jobs: [],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('No jobs found')).toBeInTheDocument();
    await expect(
      canvas.getByText('Try adjusting your filters or check back later')
    ).toBeInTheDocument();
  },
};

export const Loading: Story = {
  args: {
    jobs: [],
    isLoading: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('table')).toBeInTheDocument();
    // Should not show empty state when loading
    await expect(canvas.queryByText('No jobs found')).not.toBeInTheDocument();
  },
};

export const RowClick: Story = {
  args: {
    jobs: MOCK_JOBS,
    pagination: MOCK_PAGINATION,
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const rows = canvas.getAllByRole('row');
    // Click first data row (index 1, since index 0 is header)
    const firstDataRow = rows[1]!;
    await userEvent.click(firstDataRow);
    await expect(args.onJobSelect).toHaveBeenCalledWith('job-001');
  },
};

export const CheckboxSelection: Story = {
  args: {
    jobs: MOCK_JOBS,
    pagination: MOCK_PAGINATION,
    selectedJobs: [],
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const checkboxes = canvas.getAllByRole('checkbox');
    // First checkbox is "select all", second is first row
    const firstRowCheckbox = checkboxes[1]!;
    await userEvent.click(firstRowCheckbox);
    await expect(args.onSelectionChange).toHaveBeenCalledWith(['job-001']);
    // onJobSelect should NOT be called (checkbox click stops propagation)
    await expect(args.onJobSelect).not.toHaveBeenCalled();
  },
};

export const SelectAll: Story = {
  args: {
    jobs: MOCK_JOBS,
    pagination: MOCK_PAGINATION,
    selectedJobs: [],
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const checkboxes = canvas.getAllByRole('checkbox');
    // First checkbox is "select all"
    const selectAllCheckbox = checkboxes[0]!;
    await userEvent.click(selectAllCheckbox);
    await expect(args.onSelectionChange).toHaveBeenCalledWith([
      'job-001',
      'job-002',
      'job-003',
      'job-004',
      'job-005',
    ]);
  },
};

export const SortByCreated: Story = {
  args: {
    jobs: MOCK_JOBS,
    pagination: MOCK_PAGINATION,
    sortField: 'created_at',
    sortDirection: 'desc',
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    // The "Created" header is clickable for sorting
    const createdHeader = canvas.getByText('Created');
    await userEvent.click(createdHeader);
    // Current is desc, so clicking should toggle to asc
    await expect(args.onSort).toHaveBeenCalledWith('created_at', 'asc');
  },
};

export const WithBulkSelection: Story = {
  args: {
    jobs: MOCK_JOBS,
    pagination: MOCK_PAGINATION,
    selectedJobs: ['job-001', 'job-002', 'job-004'],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('3 jobs selected')).toBeInTheDocument();
    await expect(canvas.getByText('Clear selection')).toBeInTheDocument();
  },
};
