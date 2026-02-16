'use client';

import * as React from 'react';
import Box from '@mui/joy/Box';
import Chip from '@mui/joy/Chip';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import CircularProgress from '@mui/joy/CircularProgress';
import Button from '@mui/joy/Button';
import { ArrowClockwise as RefreshIcon } from '@phosphor-icons/react/dist/ssr/ArrowClockwise';

import { toast } from '@/components/core/toaster';
import { config } from '@/config';
import { useUserInfo } from '@/hooks/use-user-info';
import {
  useLLMJobs,
  useLLMJobStats,
  useLLMProviders,
  useFeatureSlugs,
  useCancelLLMJob,
  useBulkCancelLLMJobs,
  useLLMJobsRealtime,
} from '@/hooks/use-llm-jobs';
import {
  isSystemAdministrator,
  isCustomerSuccess,
  isCustomerAdminOrManager,
} from '@/lib/user-utils';
import {
  LLMJobsTable,
  LLMJobsFilters,
  LLMJobsStats,
  JobDetailDrawer,
} from '@/components/dashboard/llm-jobs';
import type { LLMJobsFiltersState } from '@/components/dashboard/llm-jobs';
import type { LLMJobStatus } from '@/types/llm-jobs';

const metadata = {
  title: `Jobs | Dashboard | ${config.site.name}`,
};

type SortField = 'created_at' | 'updated_at' | 'started_at';
type SortDirection = 'asc' | 'desc';

const TIME_RANGES = [
  { label: '24h', hours: 24 },
  { label: '7d', hours: 168 },
  { label: '30d', hours: 720 },
  { label: 'All', hours: undefined },
] as const;

type TimeRangeHours = (typeof TIME_RANGES)[number]['hours'];

function hoursToDateFrom(hours: number | undefined): string {
  if (!hours) return '';
  const d = new Date(Date.now() - hours * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

export default function LLMJobsPage(): React.JSX.Element {
  // State
  const [filters, setFilters] = React.useState<LLMJobsFiltersState>({
    status: [],
    providerId: [],
    featureSlug: [],
    dateFrom: '',
    dateTo: '',
    search: '',
  });
  const [page, setPage] = React.useState(1);
  const [sortField, setSortField] = React.useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('desc');
  const [selectedJobId, setSelectedJobId] = React.useState<string | null>(null);
  const [selectedJobs, setSelectedJobs] = React.useState<string[]>([]);
  const [timeRange, setTimeRange] = React.useState<TimeRangeHours>(undefined);

  // Hooks
  const { userInfo, isUserLoading } = useUserInfo();
  const { data: providers } = useLLMProviders();
  const { data: featureSlugs } = useFeatureSlugs();
  const {
    data: stats,
    isLoading: isStatsLoading,
    refetch: refetchStats,
  } = useLLMJobStats(timeRange);

  const {
    data,
    isLoading,
    error,
    refetch: refetchJobs,
  } = useLLMJobs({
    page,
    perPage: 20,
    status: filters.status.length > 0 ? filters.status : undefined,
    providerId: filters.providerId.length > 0 ? filters.providerId : undefined,
    featureSlug: filters.featureSlug.length > 0 ? filters.featureSlug : undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    search: filters.search || undefined,
    orderBy: sortField,
    orderDirection: sortDirection,
  });

  const cancelMutation = useCancelLLMJob();
  const bulkCancelMutation = useBulkCancelLLMJobs();

  // Access control - only System Admins and Customer Success can view
  const hasAccess = userInfo && (isSystemAdministrator(userInfo) || isCustomerSuccess(userInfo));

  // Subscribe to the current customer's realtime topic.
  // When the customer context changes, the hook automatically tears down
  // the old subscription and creates a new one for the new customer.
  const realtimeTopic = userInfo?.customerId ? `llm-jobs:${userInfo.customerId}` : '';

  // Enable real-time updates for the jobs table (only when user has access)
  useLLMJobsRealtime({ enabled: !!hasAccess, topic: realtimeTopic });

  // Handlers
  const handleFilterChange = (newFilters: LLMJobsFiltersState) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page when filters change
    setSelectedJobs([]); // Clear selection when filters change
  };

  const handleStatusFilter = (statuses: LLMJobStatus[]) => {
    setFilters((prev) => ({ ...prev, status: statuses }));
    setPage(1);
    setSelectedJobs([]);
  };

  const handleTimeRangeChange = (hours: TimeRangeHours) => {
    setTimeRange(hours);
    setFilters((prev) => ({ ...prev, dateFrom: hoursToDateFrom(hours) }));
    setPage(1);
    setSelectedJobs([]);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    setSelectedJobs([]); // Clear selection when page changes
  };

  const handleSort = (field: SortField, direction: SortDirection) => {
    setSortField(field);
    setSortDirection(direction);
  };

  const handleJobSelect = (jobId: string) => {
    setSelectedJobId(jobId);
  };

  const handleDrawerClose = () => {
    setSelectedJobId(null);
  };

  const handleSelectionChange = (jobIds: string[]) => {
    setSelectedJobs(jobIds);
  };

  const handleCancelJob = (jobId: string) => {
    cancelMutation.mutate(jobId);
  };

  const handleBulkCancel = (jobIds: string[]) => {
    bulkCancelMutation.mutate(jobIds, {
      onSuccess: () => {
        setSelectedJobs([]);
      },
    });
  };

  const handleRefresh = async () => {
    await Promise.all([refetchJobs(), refetchStats()]);
    toast.success('Jobs refreshed');
  };

  // Loading state
  if (isUserLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: { xs: '40vh', sm: '50vh' },
        }}
      >
        <CircularProgress size='lg' />
      </Box>
    );
  }

  // Access denied
  if (!hasAccess) {
    return (
      <Box sx={{ textAlign: 'center', mt: { xs: 10, sm: 20, md: 35 } }}>
        <Typography
          sx={{
            fontSize: { xs: '20px', sm: '24px' },
            fontWeight: '600',
            color: 'var(--joy-palette-text-primary)',
          }}
        >
          Access Denied
        </Typography>
        <Typography
          sx={{
            fontSize: { xs: '12px', sm: '14px' },
            fontWeight: '300',
            color: 'var(--joy-palette-text-secondary)',
            mt: 1,
          }}
        >
          You do not have the required permissions to view this page.
          <br />
          Only System Administrators and Customer Success can access Jobs.
        </Typography>
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box sx={{ textAlign: 'center', mt: { xs: 10, sm: 20 } }}>
        <Typography
          sx={{
            fontSize: { xs: '20px', sm: '24px' },
            fontWeight: '600',
            color: 'var(--joy-palette-danger-600)',
          }}
        >
          Error Loading Jobs
        </Typography>
        <Typography
          sx={{
            fontSize: { xs: '12px', sm: '14px' },
            fontWeight: '300',
            color: 'var(--joy-palette-text-secondary)',
            mt: 1,
          }}
        >
          {error instanceof Error ? error.message : 'An unexpected error occurred.'}
        </Typography>
        <Button
          variant='outlined'
          color='primary'
          onClick={handleRefresh}
          sx={{ mt: 2 }}
          startDecorator={<RefreshIcon size={18} />}
        >
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 'var(--Content-padding)' } }}>
      <Stack spacing={{ xs: 2, sm: 3 }} sx={{ mt: { xs: 6, sm: 0 } }}>
        {/* Header */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={{ xs: 2, sm: 3 }}
          sx={{ alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between' }}
        >
          <Stack spacing={1} sx={{ flex: '1 1 auto' }}>
            <Typography
              fontSize={{ xs: 'xl2', sm: 'xl3' }}
              level='h1'
              sx={{ wordBreak: 'break-word' }}
              fontWeight='600'
            >
              Jobs
            </Typography>
            <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
              Monitor and manage processing jobs
            </Typography>
          </Stack>

          <Button
            variant='outlined'
            color='neutral'
            onClick={handleRefresh}
            startDecorator={<RefreshIcon size={18} />}
            loading={isLoading || isStatsLoading}
          >
            Refresh
          </Button>
        </Stack>

        {/* Time Range */}
        <Stack direction='row' spacing={1} sx={{ alignItems: 'center' }}>
          <Typography level='body-sm' sx={{ color: 'text.tertiary', mr: 0.5 }}>
            Period:
          </Typography>
          {TIME_RANGES.map((range) => (
            <Chip
              key={range.label}
              variant={timeRange === range.hours ? 'solid' : 'outlined'}
              color={timeRange === range.hours ? 'primary' : 'neutral'}
              onClick={() => handleTimeRangeChange(range.hours)}
              sx={{ cursor: 'pointer' }}
            >
              {range.label}
            </Chip>
          ))}
        </Stack>

        {/* Stats */}
        <LLMJobsStats
          stats={stats}
          isLoading={isStatsLoading}
          activeStatuses={filters.status}
          onStatusFilter={handleStatusFilter}
        />

        {/* Filters */}
        <LLMJobsFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          providers={providers}
          featureSlugs={featureSlugs}
          isLoading={isLoading}
        />

        {/* Table */}
        <LLMJobsTable
          jobs={data?.data || []}
          isLoading={isLoading}
          pagination={data?.meta}
          onPageChange={handlePageChange}
          onJobSelect={handleJobSelect}
          onSort={handleSort}
          sortField={sortField}
          sortDirection={sortDirection}
          selectedJobs={selectedJobs}
          onSelectionChange={handleSelectionChange}
          onCancelJob={handleCancelJob}
          onBulkCancel={handleBulkCancel}
          isCancelling={cancelMutation.isPending || bulkCancelMutation.isPending}
        />
      </Stack>

      {/* Job Detail Drawer */}
      <JobDetailDrawer jobId={selectedJobId} open={!!selectedJobId} onClose={handleDrawerClose} />
    </Box>
  );
}
