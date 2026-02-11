'use client';

import * as React from 'react';
import Box from '@mui/joy/Box';
import Checkbox from '@mui/joy/Checkbox';
import IconButton from '@mui/joy/IconButton';
import Table from '@mui/joy/Table';
import Tooltip from '@mui/joy/Tooltip';
import Typography from '@mui/joy/Typography';
import Skeleton from '@mui/joy/Skeleton';
import Stack from '@mui/joy/Stack';
import Button from '@mui/joy/Button';
import { DotsThreeVertical } from '@phosphor-icons/react/dist/ssr/DotsThreeVertical';
import { ArrowsDownUp as SortIcon } from '@phosphor-icons/react/dist/ssr/ArrowsDownUp';
import { Copy as CopyIcon } from '@phosphor-icons/react/dist/ssr/Copy';
import { X as CancelIcon } from '@phosphor-icons/react/dist/ssr/X';

import type { LLMJobWithRelations, PaginationMeta } from '@/types/llm-jobs';
import { CANCELLABLE_STATUSES } from '@/types/llm-jobs';
import { JobStatusIndicator } from '@/components/core/job-status-indicator';
import { JobActionsMenu } from './job-actions-menu';
import { toast } from '@/components/core/toaster';
import Pagination from '@/components/dashboard/layout/pagination';

type SortField = 'created_at' | 'updated_at' | 'started_at';
type SortDirection = 'asc' | 'desc';

interface LLMJobsTableProps {
  jobs: LLMJobWithRelations[];
  isLoading?: boolean;
  pagination?: PaginationMeta;
  onPageChange: (page: number) => void;
  onJobSelect: (jobId: string) => void;
  onSort?: (field: SortField, direction: SortDirection) => void;
  sortField?: SortField;
  sortDirection?: SortDirection;
  selectedJobs?: string[];
  onSelectionChange?: (jobIds: string[]) => void;
  onCancelJob?: (jobId: string) => void;
  onBulkCancel?: (jobIds: string[]) => void;
  isCancelling?: boolean;
}

function formatDate(date: string | null): string {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function truncateText(text: string | null, maxLength: number = 50): string {
  if (!text) return '-';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

export function LLMJobsTable({
  jobs,
  isLoading,
  pagination,
  onPageChange,
  onJobSelect,
  onSort,
  sortField = 'created_at',
  sortDirection = 'desc',
  selectedJobs = [],
  onSelectionChange,
  onCancelJob,
  onBulkCancel,
  isCancelling,
}: LLMJobsTableProps): React.JSX.Element {
  const [menuAnchor, setMenuAnchor] = React.useState<HTMLElement | null>(null);
  const [menuJobIndex, setMenuJobIndex] = React.useState<number | null>(null);

  const hasResults = jobs.length > 0;

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!onSelectionChange || !hasResults) return;
    if (event.target.checked) {
      onSelectionChange(jobs.map((job) => job.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectJob = (jobId: string) => {
    if (!onSelectionChange) return;
    if (selectedJobs.includes(jobId)) {
      onSelectionChange(selectedJobs.filter((id) => id !== jobId));
    } else {
      onSelectionChange([...selectedJobs, jobId]);
    }
  };

  const handleSort = (field: SortField) => {
    if (!onSort) return;
    const newDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
    onSort(field, newDirection);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, index: number) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setMenuJobIndex(index);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setMenuJobIndex(null);
  };

  const handleCopyId = (jobId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    navigator.clipboard.writeText(jobId).then(() => {
      toast.success('Job ID copied to clipboard');
    });
  };

  const handleRowClick = (jobId: string) => {
    onJobSelect(jobId);
  };

  // Get cancellable selected jobs
  const cancellableSelectedJobs = selectedJobs.filter((id) => {
    const job = jobs.find((j) => j.id === id);
    return job && CANCELLABLE_STATUSES.includes(job.status);
  });

  const renderSortHeader = (field: SortField, label: string) => (
    <Box
      onClick={() => handleSort(field)}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        cursor: 'pointer',
        '& .sort-icon': {
          opacity: sortField === field ? 1 : 0,
          transition: 'opacity 0.2s ease-in-out',
        },
        '&:hover .sort-icon': { opacity: 1 },
      }}
    >
      {label}
      <SortIcon
        className='sort-icon'
        size={16}
        style={{
          transform: sortField === field && sortDirection === 'asc' ? 'rotate(180deg)' : 'none',
        }}
      />
    </Box>
  );

  return (
    <Box>
      {/* Bulk Actions */}
      {selectedJobs.length > 0 && (
        <Stack
          direction='row'
          spacing={2}
          sx={{
            alignItems: 'center',
            mb: 2,
            p: 1,
            bgcolor: 'var(--joy-palette-background-level1)',
            borderRadius: 'sm',
          }}
        >
          <Typography level='body-sm'>
            {selectedJobs.length} job{selectedJobs.length > 1 ? 's' : ''} selected
          </Typography>
          {cancellableSelectedJobs.length > 0 && onBulkCancel && (
            <Button
              size='sm'
              variant='soft'
              color='danger'
              startDecorator={<CancelIcon size={16} />}
              onClick={() => onBulkCancel(cancellableSelectedJobs)}
              loading={isCancelling}
            >
              Cancel {cancellableSelectedJobs.length} job
              {cancellableSelectedJobs.length > 1 ? 's' : ''}
            </Button>
          )}
          <Button size='sm' variant='plain' color='neutral' onClick={() => onSelectionChange?.([])}>
            Clear selection
          </Button>
        </Stack>
      )}

      <Box
        sx={{
          overflowX: 'auto',
          width: '100%',
          WebkitOverflowScrolling: 'touch',
          '&::-webkit-scrollbar': { height: { xs: '8px', sm: '12px' } },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'var(--joy-palette-divider)',
            borderRadius: '4px',
          },
        }}
      >
        <Table
          aria-label='Jobs table'
          sx={{
            minWidth: '900px',
            tableLayout: 'fixed',
            '& th, & td': {
              px: { xs: 1, sm: 2 },
              py: { xs: 1, sm: 1.5 },
            },
          }}
        >
          <thead>
            <tr>
              <th style={{ width: '50px' }}>
                <Checkbox
                  checked={hasResults && selectedJobs.length === jobs.length}
                  indeterminate={
                    hasResults && selectedJobs.length > 0 && selectedJobs.length < jobs.length
                  }
                  onChange={handleSelectAll}
                  disabled={!hasResults}
                />
              </th>
              <th style={{ width: '15%' }}>Status</th>
              <th style={{ width: '12%' }}>Provider</th>
              <th style={{ width: '15%' }}>Feature</th>
              <th style={{ width: '20%' }}>Prompt</th>
              <th style={{ width: '15%' }}>{renderSortHeader('created_at', 'Created')}</th>
              <th style={{ width: '10%' }}>Retries</th>
              <th style={{ width: '50px' }}></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 5 }).map((_, index) => (
                <tr key={index}>
                  <td>
                    <Skeleton variant='rectangular' width={20} height={20} />
                  </td>
                  <td>
                    <Skeleton variant='text' width={100} />
                  </td>
                  <td>
                    <Skeleton variant='text' width={80} />
                  </td>
                  <td>
                    <Skeleton variant='text' width={100} />
                  </td>
                  <td>
                    <Skeleton variant='text' width='100%' />
                  </td>
                  <td>
                    <Skeleton variant='text' width={100} />
                  </td>
                  <td>
                    <Skeleton variant='text' width={30} />
                  </td>
                  <td>
                    <Skeleton variant='rectangular' width={24} height={24} />
                  </td>
                </tr>
              ))
            ) : jobs.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <Typography level='body-md' color='neutral'>
                    No jobs found
                  </Typography>
                  <Typography level='body-sm' sx={{ color: 'text.tertiary', mt: 0.5 }}>
                    Try adjusting your filters or check back later
                  </Typography>
                </td>
              </tr>
            ) : (
              jobs.map((job, index) => (
                <tr
                  key={job.id}
                  onClick={() => handleRowClick(job.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <td onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedJobs.includes(job.id)}
                      onChange={() => handleSelectJob(job.id)}
                    />
                  </td>
                  <td>
                    <JobStatusIndicator status={job.status} size='sm' />
                  </td>
                  <td>
                    <Typography
                      level='body-sm'
                      sx={{ color: 'text.secondary', wordBreak: 'break-all' }}
                    >
                      {job.provider?.name || job.provider_id.substring(0, 8)}
                    </Typography>
                  </td>
                  <td>
                    <Tooltip title={job.feature_slug || 'No feature'} placement='top'>
                      <Typography
                        level='body-sm'
                        sx={{
                          color: 'text.secondary',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '150px',
                        }}
                      >
                        {job.feature_slug || '-'}
                      </Typography>
                    </Tooltip>
                  </td>
                  <td>
                    <Tooltip title={job.prompt} placement='top'>
                      <Typography
                        level='body-sm'
                        sx={{
                          color: 'text.secondary',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '200px',
                        }}
                      >
                        {truncateText(job.prompt, 60)}
                      </Typography>
                    </Tooltip>
                  </td>
                  <td>
                    <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                      {formatDate(job.created_at)}
                    </Typography>
                  </td>
                  <td>
                    <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                      {job.retry_count}
                    </Typography>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <IconButton size='sm' onClick={(e) => handleMenuOpen(e, index)}>
                      <DotsThreeVertical weight='bold' size={22} />
                    </IconButton>
                    {menuJobIndex === index && (
                      <JobActionsMenu
                        job={job}
                        anchorEl={menuAnchor}
                        onClose={handleMenuClose}
                        onViewDetails={onJobSelect}
                        onCancel={onCancelJob || (() => {})}
                        isCancelling={isCancelling}
                      />
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </Box>

      {pagination && (
        <Pagination
          totalPages={pagination.lastPage}
          currentPage={pagination.page}
          onPageChange={onPageChange}
          disabled={!hasResults}
        />
      )}
    </Box>
  );
}
