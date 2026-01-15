'use client';

import * as React from 'react';
import Box from '@mui/joy/Box';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import Card from '@mui/joy/Card';
import CardContent from '@mui/joy/CardContent';
import Button from '@mui/joy/Button';
import Input from '@mui/joy/Input';
import Select from '@mui/joy/Select';
import Option from '@mui/joy/Option';
import Table from '@mui/joy/Table';
import Checkbox from '@mui/joy/Checkbox';
import CircularProgress from '@mui/joy/CircularProgress';
import IconButton from '@mui/joy/IconButton';
import Tooltip from '@mui/joy/Tooltip';
import Menu from '@mui/joy/Menu';
import MenuItem from '@mui/joy/MenuItem';
import Dropdown from '@mui/joy/Dropdown';
import MenuButton from '@mui/joy/MenuButton';
import Link from '@mui/joy/Link';
import { Pagination } from '@/components/core/pagination';
import Alert from '@mui/joy/Alert';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { MagnifyingGlass as SearchIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { X as ClearIcon } from '@phosphor-icons/react/dist/ssr/X';
import { DotsThreeVertical as MoreIcon } from '@phosphor-icons/react/dist/ssr/DotsThreeVertical';
import { ArrowClockwise as RefreshIcon } from '@phosphor-icons/react/dist/ssr/ArrowClockwise';
import { Eye as ViewIcon } from '@phosphor-icons/react/dist/ssr/Eye';
import { Trash as DeleteIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/core/toaster';
import { useCapturesList, useDeleteCapture, captureKeys } from '../../lib/hooks';
import { useDeviceProfileOptions } from '../../lib/hooks';
import { SortableTableHeader } from '../components';
import type { WebScreenshotCapture } from '../../lib/types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

export function CaptureJobList(): React.JSX.Element {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [selectedDeviceProfileId, setSelectedDeviceProfileId] = React.useState<string | null>(null);
  const [selectedCaptureIds, setSelectedCaptureIds] = React.useState<Set<string>>(new Set());
  const [page, setPage] = React.useState(1);
  const [sortBy, setSortBy] = React.useState<string>('captured_at');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('desc');
  const perPage = 25;

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch device profiles for filter
  const { data: deviceProfiles = [] } = useDeviceProfileOptions({
    is_active: true,
  });

  // Build query params
  const queryParams = React.useMemo(
    () => ({
      page,
      perPage,
      search: debouncedSearch || undefined,
      orderBy: sortBy,
      orderDirection: sortDirection,
      device_profile_id: selectedDeviceProfileId || undefined,
    }),
    [page, perPage, debouncedSearch, sortBy, sortDirection, selectedDeviceProfileId]
  );

  // Fetch captures
  const { data, isLoading, error, refetch } = useCapturesList(queryParams);

  const captures = data?.data || [];
  const meta = data?.meta;

  // Mutations
  const deleteMutation = useDeleteCapture();

  // Handle sorting
  const handleSort = (column: string, direction: 'asc' | 'desc') => {
    setSortBy(column);
    setSortDirection(direction);
    setPage(1);
  };

  // Handle selection
  const allSelected = captures.length > 0 && selectedCaptureIds.size === captures.length;
  const someSelected = selectedCaptureIds.size > 0 && selectedCaptureIds.size < captures.length;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCaptureIds(new Set(captures.map((c) => c.web_screenshot_capture_id)));
    } else {
      setSelectedCaptureIds(new Set());
    }
  };

  const handleSelectRow = (captureId: string, checked: boolean) => {
    setSelectedCaptureIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(captureId);
      } else {
        next.delete(captureId);
      }
      return next;
    });
  };

  // Handle actions
  const handleView = (captureId: string) => {
    router.push(`/source-and-snap/captures/${captureId}`);
  };

  const handleDelete = async (captureId: string) => {
    if (!window.confirm('Are you sure you want to delete this capture?')) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(captureId);
      setSelectedCaptureIds((prev) => {
        const next = new Set(prev);
        next.delete(captureId);
        return next;
      });
      toast.success('Capture deleted');
    } catch (error) {
      toast.error(`Failed to delete: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCaptureIds.size === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedCaptureIds.size} capture(s)?`)) {
      return;
    }

    try {
      await Promise.all(Array.from(selectedCaptureIds).map((id) => deleteMutation.mutateAsync(id)));
      setSelectedCaptureIds(new Set());
      toast.success(`Deleted ${selectedCaptureIds.size} capture(s)`);
    } catch (error) {
      toast.error(`Failed to delete: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (error) {
    return (
      <Box sx={{ p: 'var(--Content-padding)' }}>
        <Alert color='danger' variant='soft'>
          <Typography color='danger'>
            Error loading captures: {error instanceof Error ? error.message : 'Unknown error'}
          </Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 'var(--Content-padding)' }}>
      <Stack spacing={3}>
        {/* Header */}
        <Stack direction='row' spacing={2} alignItems='center' justifyContent='space-between'>
          <div>
            <Typography fontSize={{ xs: 'xl3', lg: 'xl4' }} level='h1'>
              Captures
            </Typography>
            <Typography level='body-md' color='neutral'>
              View and manage completed web screenshot captures
            </Typography>
          </div>
          <Stack direction='row' spacing={2}>
            <Tooltip title='Refresh captures'>
              <IconButton
                variant='outlined'
                onClick={() => refetch()}
                disabled={isLoading}
                aria-label='Refresh captures'
                aria-busy={isLoading}
              >
                <RefreshIcon size={16} />
              </IconButton>
            </Tooltip>
            <Button
              startDecorator={<PlusIcon size={16} />}
              onClick={() => router.push('/source-and-snap/capture')}
            >
              New Capture
            </Button>
          </Stack>
        </Stack>

        {/* Filters */}
        <Card variant='outlined'>
          <CardContent>
            <Stack spacing={2}>
              <Stack direction='row' spacing={2} flexWrap='wrap' alignItems='center'>
                <Input
                  placeholder='Search by page title...'
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  startDecorator={<SearchIcon size={16} />}
                  endDecorator={
                    search && (
                      <IconButton
                        variant='plain'
                        size='sm'
                        onClick={() => setSearch('')}
                        aria-label='Clear search'
                      >
                        <ClearIcon size={16} />
                      </IconButton>
                    )
                  }
                  sx={{ flexGrow: 1, minWidth: 200 }}
                  aria-label='Search captures'
                />
                <Select
                  placeholder='Filter by device profile'
                  value={selectedDeviceProfileId}
                  onChange={(_, value) => setSelectedDeviceProfileId(value)}
                  sx={{ minWidth: 200 }}
                  aria-label='Filter by device profile'
                >
                  <Option value={null}>All Profiles</Option>
                  {deviceProfiles.map((profile) => (
                    <Option
                      key={profile.options_device_profile_id}
                      value={profile.options_device_profile_id}
                    >
                      {profile.display_name}
                    </Option>
                  ))}
                </Select>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {/* Bulk Actions Bar */}
        {selectedCaptureIds.size > 0 && (
          <Card variant='outlined' color='primary'>
            <CardContent>
              <Stack direction='row' spacing={2} alignItems='center' aria-live='polite'>
                <Typography level='body-md'>
                  {selectedCaptureIds.size} capture(s) selected
                </Typography>
                <Button
                  size='sm'
                  variant='outlined'
                  color='danger'
                  startDecorator={<DeleteIcon size={16} />}
                  onClick={handleBulkDelete}
                  disabled={deleteMutation.isPending}
                >
                  Delete Selected
                </Button>
                <Button size='sm' variant='plain' onClick={() => setSelectedCaptureIds(new Set())}>
                  Clear Selection
                </Button>
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* Table */}
        <Card variant='outlined'>
          <CardContent>
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : captures.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography level='body-lg' color='neutral' sx={{ mb: 2 }}>
                  No captures found
                </Typography>
                <Button
                  startDecorator={<PlusIcon size={16} />}
                  onClick={() => router.push('/source-and-snap/capture')}
                  aria-label='Create First Capture'
                >
                  Create First Capture
                </Button>
              </Box>
            ) : (
              <>
                <Table>
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>
                        <Checkbox
                          checked={allSelected}
                          indeterminate={someSelected}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          aria-label='Select all'
                        />
                      </th>
                      <SortableTableHeader
                        column='page_title'
                        label='Page Title'
                        currentSort={sortBy}
                        currentDirection={sortDirection}
                        onSort={handleSort}
                      />
                      <SortableTableHeader
                        column='captured_at'
                        label='Captured'
                        currentSort={sortBy}
                        currentDirection={sortDirection}
                        onSort={handleSort}
                      />
                      <th>Device Profile</th>
                      <th>Dimensions</th>
                      <th style={{ width: 60 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {captures.map((capture) => (
                      <tr key={capture.web_screenshot_capture_id}>
                        <td>
                          <Checkbox
                            checked={selectedCaptureIds.has(capture.web_screenshot_capture_id)}
                            onChange={(e) =>
                              handleSelectRow(capture.web_screenshot_capture_id, e.target.checked)
                            }
                            aria-label={`Select ${capture.page_title || 'capture'}`}
                          />
                        </td>
                        <td>
                          <Link
                            onClick={() => handleView(capture.web_screenshot_capture_id)}
                            sx={{ cursor: 'pointer' }}
                          >
                            {capture.page_title ||
                              capture.capture_request?.requested_url ||
                              'Untitled'}
                          </Link>
                        </td>
                        <td>
                          <Tooltip title={dayjs(capture.captured_at).format('YYYY-MM-DD HH:mm:ss')}>
                            <span>{dayjs(capture.captured_at).fromNow()}</span>
                          </Tooltip>
                        </td>
                        <td>{capture.device_profile?.display_name || 'Default'}</td>
                        <td>
                          {capture.screenshot_width && capture.screenshot_height
                            ? `${capture.screenshot_width} × ${capture.screenshot_height}px`
                            : '-'}
                        </td>
                        <td>
                          <Dropdown>
                            <MenuButton
                              slots={{ root: IconButton }}
                              slotProps={{ root: { variant: 'plain', size: 'sm' } }}
                              aria-haspopup='true'
                              aria-controls={`menu-${capture.web_screenshot_capture_id}`}
                            >
                              <MoreIcon size={16} />
                            </MenuButton>
                            <Menu id={`menu-${capture.web_screenshot_capture_id}`}>
                              <MenuItem
                                onClick={() => handleView(capture.web_screenshot_capture_id)}
                              >
                                <ViewIcon size={16} style={{ marginRight: 8 }} />
                                View
                              </MenuItem>
                              <MenuItem
                                color='danger'
                                onClick={() => handleDelete(capture.web_screenshot_capture_id)}
                              >
                                <DeleteIcon size={16} style={{ marginRight: 8 }} />
                                Delete
                              </MenuItem>
                            </Menu>
                          </Dropdown>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>

                {/* Pagination */}
                {meta && meta.lastPage > 1 && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                    <Pagination
                      page={meta.currentPage}
                      count={meta.lastPage}
                      onChange={(_, page) => {
                        if (page) setPage(page);
                      }}
                    />
                  </Box>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
