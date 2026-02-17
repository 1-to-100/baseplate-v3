import type { Meta, StoryObj } from '@storybook/nextjs';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { LLMJobsFilters } from '@/components/dashboard/llm-jobs/llm-jobs-filters';
import { MOCK_EMPTY_FILTERS, MOCK_PROVIDER, MOCK_PROVIDER_2 } from './__fixtures__/llm-jobs';

const meta = {
  title: 'Dashboard/LLMJobsFilters',
  component: LLMJobsFilters,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: {
    onFilterChange: fn(),
    providers: [MOCK_PROVIDER, MOCK_PROVIDER_2],
    featureSlugs: ['report-summary', 'content-gen', 'translation'],
  },
} satisfies Meta<typeof LLMJobsFilters>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    filters: MOCK_EMPTY_FILTERS,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByPlaceholderText('Search jobs...')).toBeInTheDocument();
    await expect(canvas.getByText('Filters')).toBeInTheDocument();
  },
};

export const ExpandFilters: Story = {
  args: {
    filters: MOCK_EMPTY_FILTERS,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const filtersButton = canvas.getByText('Filters');
    // Filter panel should not be visible initially
    await expect(canvas.queryByText('Status')).not.toBeInTheDocument();
    // Expand
    await userEvent.click(filtersButton);
    await expect(canvas.getByText('Status')).toBeInTheDocument();
    await expect(canvas.getByText('Provider')).toBeInTheDocument();
    await expect(canvas.getByText('From')).toBeInTheDocument();
    await expect(canvas.getByText('To')).toBeInTheDocument();
    // Collapse
    await userEvent.click(filtersButton);
    await expect(canvas.queryByText('Status')).not.toBeInTheDocument();
  },
};

export const SearchTriggersCallback: Story = {
  args: {
    filters: MOCK_EMPTY_FILTERS,
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const searchInput = canvas.getByPlaceholderText('Search jobs...');
    await userEvent.type(searchInput, 'quarterly', { delay: null });
    // Debounce is 300ms — wait for callback
    await waitFor(
      () => {
        expect(args.onFilterChange).toHaveBeenCalledWith(
          expect.objectContaining({ search: 'quarterly' })
        );
      },
      { timeout: 2000 }
    );
  },
};

export const WithActiveFilters: Story = {
  args: {
    filters: {
      ...MOCK_EMPTY_FILTERS,
      status: ['running', 'queued'],
      search: 'report',
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Clear button should be visible when filters are active
    await expect(canvas.getByText('Clear')).toBeInTheDocument();
    // Filter count badge should show 2 (status + search)
    await expect(canvas.getByText('2')).toBeInTheDocument();
  },
};

export const ClearFilters: Story = {
  args: {
    filters: {
      ...MOCK_EMPTY_FILTERS,
      status: ['running'],
      search: 'test',
    },
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const clearButton = canvas.getByText('Clear');
    await userEvent.click(clearButton);
    await expect(args.onFilterChange).toHaveBeenCalledWith({
      status: [],
      providerId: [],
      featureSlug: [],
      dateFrom: '',
      dateTo: '',
      search: '',
    });
  },
};
