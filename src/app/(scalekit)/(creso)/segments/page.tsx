'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Box from '@mui/joy/Box';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import Button from '@mui/joy/Button';
import Input from '@mui/joy/Input';
import IconButton from '@mui/joy/IconButton';
import Chip from '@mui/joy/Chip';
import Table from '@mui/joy/Table';
import Tabs from '@mui/joy/Tabs';
import TabList from '@mui/joy/TabList';
import Tab from '@mui/joy/Tab';
import Tooltip from '@mui/joy/Tooltip';
import CircularProgress from '@mui/joy/CircularProgress';
import Alert from '@mui/joy/Alert';
import Menu from '@mui/joy/Menu';
import MenuItem from '@mui/joy/MenuItem';
import Dropdown from '@mui/joy/Dropdown';
import MenuButton from '@mui/joy/MenuButton';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { MagnifyingGlass as SearchIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';
import { DotsThree as DotsThreeIcon } from '@phosphor-icons/react/dist/ssr/DotsThree';
import { Check as CheckIcon } from '@phosphor-icons/react/dist/ssr/Check';
import { ArrowsCounterClockwise as ArrowsCounterClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ArrowsCounterClockwise';
import { Cards as CardsIcon } from '@phosphor-icons/react/dist/ssr/Cards';
import { List as ListIcon } from '@phosphor-icons/react/dist/ssr/List';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import Link from 'next/link';
import { toast } from '@/components/core/toaster';
import { getSegments, deleteSegment } from './lib/api/segments';
import type { ListForDisplay } from './lib/types/list';
import { ListStatus } from './lib/types/list';
import { paths } from '@/paths';
import Pagination from '@/components/dashboard/layout/pagination';
import DeleteItemModal from '@/components/dashboard/modals/DeleteItemModal';

const ITEMS_PER_PAGE = 12;
const VIEW_MODE_STORAGE_KEY = 'segments-view-mode';

// Status indicator component with tooltip
function StatusIndicator({ status }: { status?: ListStatus }) {
  const getStatusConfig = (status?: ListStatus) => {
    switch (status) {
      case ListStatus.COMPLETED:
        return {
          icon: <CheckIcon size={16} weight='bold' />,
          text: 'Segment successfully created and ready to use',
          color: '#10B981', // green
        };
      case ListStatus.FAILED:
        return {
          icon: <XIcon size={16} weight='bold' />,
          text: 'Segment creation failed, try again or check settings',
          color: '#EF4444', // red
        };
      case ListStatus.PROCESSING:
        return {
          icon: <ArrowsCounterClockwiseIcon size={16} weight='bold' />,
          text: 'Segment is being created, please wait',
          color: '#F59E0B', // amber
        };
      default:
        return {
          icon: null,
          text: '',
          color: '#6B7280',
        };
    }
  };

  const config = getStatusConfig(status);

  if (!config.icon) return null;

  return (
    <Tooltip title={config.text} placement='top'>
      <Box
        sx={{
          position: 'absolute',
          bottom: 12,
          right: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
          cursor: 'pointer',
          backgroundColor: 'var(--joy-palette-background-body)',
          border: `1px solid ${config.color}`,
          borderRadius: '20px',
          padding: '4px',
          width: '25px',
          height: '25px',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: config.color,
            width: '16px',
            height: '16px',
          }}
        >
          {config.icon}
        </Box>
      </Box>
    </Tooltip>
  );
}

// Segment Card Component for grid view
function SegmentCard({
  segment,
  onDelete,
}: {
  segment: ListForDisplay;
  onDelete: (segmentId: string) => void;
}) {
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [openMenu, setOpenMenu] = useState(false);

  const filters = (segment.filters || {}) as {
    country?: string;
    location?: string;
    employees?: string | string[];
    categories?: string[];
    technographics?: string[];
  };

  const handleCardClick = () => {
    if (segment.status === ListStatus.PROCESSING) {
      return; // Don't allow click for processing status
    }
    router.push(paths.dashboard.segments.details(segment.list_id));
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setOpenMenu(true);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setOpenMenu(false);
  };

  const handleDelete = () => {
    onDelete(segment.list_id);
    handleMenuClose();
  };

  const isProcessing = segment.status === ListStatus.PROCESSING;
  const employeesDisplay = Array.isArray(filters.employees)
    ? filters.employees[0]
    : filters.employees;

  return (
    <Box
      onClick={handleCardClick}
      sx={{
        p: '16px',
        borderRadius: '8px',
        border: '1px solid var(--joy-palette-divider)',
        boxShadow: 'none',
        backgroundColor: isProcessing
          ? 'var(--joy-palette-background-level1)'
          : 'var(--joy-palette-background-body)',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '210px',
        overflow: 'hidden',
        cursor: isProcessing ? 'default' : 'pointer',
        maxWidth: { xs: '100%', sm: '336px' },
        minWidth: { xs: '100%', sm: '236px' },
        position: 'relative',
        opacity: isProcessing ? 0.7 : 1,
        '&:hover': {
          borderColor: isProcessing
            ? 'var(--joy-palette-divider)'
            : 'var(--joy-palette-text-secondary)',
        },
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 10,
          right: 10,
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
        }}
      >
        <Dropdown
          open={openMenu}
          onOpenChange={(
            event: React.MouseEvent | React.KeyboardEvent | React.FocusEvent | null,
            open: boolean
          ) => setOpenMenu(open)}
        >
          <MenuButton
            slots={{ root: IconButton }}
            slotProps={{
              root: {
                variant: 'plain',
                size: 'sm',
                sx: { minWidth: 0, p: 0.5, borderRadius: '50%' },
              },
            }}
            onClick={handleMenuOpen}
          >
            <DotsThreeIcon weight='bold' size={22} color='var(--joy-palette-text-secondary)' />
          </MenuButton>
          <Menu placement='bottom-start' onClose={handleMenuClose}>
            <MenuItem color='danger' onClick={handleDelete}>
              <TrashIcon size={20} />
              Delete
            </MenuItem>
          </Menu>
        </Dropdown>
      </Box>

      {/* Status indicator */}
      {segment.status && <StatusIndicator status={segment.status} />}

      <Typography
        level='title-md'
        sx={{
          fontWeight: '500',
          fontSize: '14px',
          color: isProcessing
            ? 'var(--joy-palette-text-tertiary)'
            : 'var(--joy-palette-text-primary)',
          wordWrap: 'break-word',
          overflowWrap: 'break-word',
          whiteSpace: 'normal',
          width: '100%',
          maxWidth: '100%',
          display: 'block',
          overflow: 'hidden',
          paddingRight: '60px',
          mb: 0.5,
        }}
      >
        {segment.name}
      </Typography>
      {typeof segment.company_count === 'number' && (
        <Typography
          level='body-xs'
          sx={{
            color: 'var(--joy-palette-text-secondary)',
            fontWeight: '400',
            fontSize: '12px',
          }}
        >
          {segment.company_count.toLocaleString()}{' '}
          {segment.company_count === 1 ? 'company' : 'companies'}
        </Typography>
      )}
      {filters.country && (
        <Typography
          level='body-xs'
          sx={{
            mt: 1.5,
            color: 'var(--joy-palette-text-secondary)',
            fontWeight: '400',
            fontSize: '12px',
          }}
        >
          <span
            style={{
              fontWeight: '500',
              color: 'var(--joy-palette-text-primary)',
            }}
          >
            Country:{' '}
          </span>{' '}
          {filters.country}
        </Typography>
      )}
      {employeesDisplay && (
        <Typography
          level='body-xs'
          sx={{
            mt: 0.5,
            color: 'var(--joy-palette-text-secondary)',
            fontWeight: '400',
            fontSize: '12px',
          }}
        >
          <span
            style={{
              fontWeight: '500',
              color: 'var(--joy-palette-text-primary)',
            }}
          >
            Employees:{' '}
          </span>{' '}
          {employeesDisplay}
        </Typography>
      )}
      <Box sx={{ mt: 'auto' }}>
        <Typography
          level='body-xs'
          sx={{
            mt: 0.5,
            color: 'var(--joy-palette-text-secondary)',
            fontWeight: '400',
            fontSize: '12px',
          }}
        >
          <span
            style={{
              fontWeight: '500',
              color: 'var(--joy-palette-text-primary)',
            }}
          >
            Last Update:{' '}
          </span>{' '}
          {new Date(segment.updated_at).toLocaleDateString()}
        </Typography>
      </Box>
    </Box>
  );
}

// Segment Table Row Component for table view
function SegmentTableRow({
  segment,
  onDelete,
}: {
  segment: ListForDisplay;
  onDelete: (segmentId: string) => void;
}) {
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [openMenu, setOpenMenu] = useState(false);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setOpenMenu(true);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setOpenMenu(false);
  };

  const handleDelete = () => {
    onDelete(segment.list_id);
    handleMenuClose();
  };

  const getStatusDisplay = (status?: ListStatus) => {
    switch (status) {
      case ListStatus.COMPLETED:
        return { label: 'Completed', color: 'success' as const };
      case ListStatus.FAILED:
        return { label: 'Failed', color: 'danger' as const };
      case ListStatus.PROCESSING:
        return { label: 'Processing', color: 'warning' as const };
      default:
        return { label: 'New', color: 'neutral' as const };
    }
  };

  const statusDisplay = getStatusDisplay(segment.status);
  const isProcessing = segment.status === ListStatus.PROCESSING;

  const handleRowClick = (event: React.MouseEvent<HTMLTableRowElement>) => {
    if (isProcessing) {
      return;
    }
    router.push(paths.dashboard.segments.details(segment.list_id));
  };

  return (
    <tr
      onClick={handleRowClick}
      style={{
        cursor: isProcessing ? 'default' : 'pointer',
      }}
    >
      <td>
        <Typography
          level='body-sm'
          sx={{
            fontWeight: 300,
            color: 'var(--joy-palette-text-secondary)',
          }}
        >
          {segment.name}
        </Typography>
      </td>
      <td>
        <Typography level='body-sm'>
          {typeof segment.company_count === 'number' ? segment.company_count.toLocaleString() : '0'}
        </Typography>
      </td>
      <td>
        <Chip size='sm' variant='soft' color={statusDisplay.color}>
          {statusDisplay.label}
        </Chip>
      </td>
      <td>
        <Typography level='body-sm'>{new Date(segment.updated_at).toLocaleDateString()}</Typography>
      </td>
      <td style={{ textAlign: 'right' }}>
        <Dropdown
          open={openMenu}
          onOpenChange={(
            event: React.MouseEvent | React.KeyboardEvent | React.FocusEvent | null,
            open: boolean
          ) => setOpenMenu(open)}
        >
          <MenuButton
            slots={{ root: IconButton }}
            slotProps={{
              root: {
                variant: 'plain',
                size: 'sm',
                sx: { minWidth: 0, p: 0.5, borderRadius: '50%' },
              },
            }}
            onClick={(e) => {
              e.stopPropagation();
              handleMenuOpen(e);
            }}
          >
            <DotsThreeIcon weight='bold' size={20} color='var(--joy-palette-text-secondary)' />
          </MenuButton>
          <Menu placement='bottom-start' onClose={handleMenuClose}>
            <MenuItem color='danger' onClick={handleDelete}>
              <TrashIcon size={20} />
              Delete
            </MenuItem>
          </Menu>
        </Dropdown>
      </td>
    </tr>
  );
}

// Empty State Component
function EmptySegments() {
  const router = useRouter();

  return (
    <Box sx={{ textAlign: 'center', mt: 20 }}>
      <Typography
        sx={{
          fontSize: '24px',
          fontWeight: '600',
          color: 'var(--joy-palette-text-primary)',
        }}
      >
        You don&apos;t have any segments yet
      </Typography>
      <Typography
        sx={{
          fontSize: '14px',
          fontWeight: '300',
          color: 'var(--joy-palette-text-secondary)',
          mt: 1,
        }}
      >
        Create your first segment to start working with audiences.
        <br />
        Once created, you can manage them here.
      </Typography>
      <Button
        onClick={() => router.push(paths.dashboard.segments.create)}
        variant='outlined'
        startDecorator={<PlusIcon size={20} weight='bold' />}
        sx={{ mt: 2, color: 'var(--joy-palette-text-secondary)' }}
      >
        Create segment
      </Button>
    </Box>
  );
}

export default function SegmentsPage(): React.JSX.Element {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [segmentToDelete, setSegmentToDelete] = useState<ListForDisplay | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
      return saved === 'grid' || saved === 'table' ? saved : 'table';
    }
    return 'table';
  });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Save view mode to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
    }
  }, [viewMode]);

  // Fetch segments
  const {
    data: segmentsResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['segments', debouncedSearch, currentPage],
    queryFn: () =>
      getSegments({
        search: debouncedSearch || undefined,
        page: currentPage,
        perPage: ITEMS_PER_PAGE,
      }),
    refetchOnWindowFocus: true,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteSegment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['segments'] });
      setDeleteModalOpen(false);
      setSegmentToDelete(null);
      toast.success('Segment deleted successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete segment');
    },
  });

  const segments = segmentsResponse?.data || [];
  const totalPages = segmentsResponse?.meta?.lastPage || 1;

  const handleDeleteClick = (segmentId: string) => {
    const segment = segments.find((s) => s.list_id === segmentId);
    if (segment) {
      setSegmentToDelete(segment);
      setDeleteModalOpen(true);
    }
  };

  const confirmDelete = async () => {
    if (segmentToDelete) {
      await deleteMutation.mutateAsync(segmentToDelete.list_id);
    }
  };

  if (error) {
    return (
      <Box sx={{ p: { xs: 2, sm: 'var(--Content-padding)' } }}>
        <Stack spacing={3}>
          <Alert color='danger'>
            <Typography level='body-md'>
              Failed to load segments: {error instanceof Error ? error.message : 'Unknown error'}
            </Typography>
          </Alert>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 'var(--Content-padding)' } }}>
      <Stack spacing={{ xs: 2, sm: 3 }} sx={{ mt: { xs: 0, sm: 0 } }}>
        {/* Header */}
        <Stack
          direction={{ xs: 'row', sm: 'row' }}
          spacing={{ xs: 2, sm: 3 }}
          sx={{
            alignItems: 'center',
            justifyContent: { xs: 'space-between', sm: 'space-between' },
          }}
        >
          <Stack spacing={1} sx={{ flex: '1 1 auto' }}>
            <Typography
              fontSize={{ xs: 'xl2', sm: 'xl3' }}
              level='h1'
              sx={{ wordBreak: 'break-word' }}
            >
              Segments{' '}
              <Typography
                level='body-sm'
                sx={{ fontSize: { xs: 'xl2', sm: 'xl3' }, color: '#3D37DD' }}
              >
                {segmentsResponse?.meta?.total || 0}
              </Typography>
            </Typography>
          </Stack>
          <Stack direction='row' spacing={2} sx={{ alignItems: 'center' }}>
            {/* Search Input */}
            <Input
              placeholder='Search segments...'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              startDecorator={<SearchIcon size={20} />}
              endDecorator={
                search && (
                  <IconButton
                    size='sm'
                    variant='plain'
                    onClick={() => setSearch('')}
                    sx={{ minWidth: 0, p: 0.5 }}
                  >
                    <XIcon size={16} />
                  </IconButton>
                )
              }
              sx={{ width: { xs: '150px', sm: '250px' } }}
            />
            {/* View Mode Toggle */}
            <Tabs
              value={viewMode}
              onChange={(event, newValue) => setViewMode(newValue as 'table' | 'grid')}
              variant='custom'
            >
              <TabList
                sx={{
                  display: 'flex',
                  gap: 1,
                  p: 0,
                  '& .MuiTab-root': {
                    borderRadius: '20px',
                    minWidth: '36px',
                    paddingLeft: '8px',
                    paddingRight: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1,
                    color: 'var(--joy-palette-text-secondary)',
                    '&[aria-selected="true"]': {
                      border: '1px solid var(--joy-palette-divider)',
                      color: 'var(--joy-palette-background-primaryColor)',
                    },
                  },
                }}
              >
                <Tab value='table'>
                  <ListIcon size={20} weight='bold' />
                </Tab>
                <Tab value='grid'>
                  <CardsIcon size={20} weight='bold' />
                </Tab>
              </TabList>
            </Tabs>
            {/* Create Button */}
            <Button
              variant='solid'
              color='primary'
              onClick={() => router.push(paths.dashboard.segments.create)}
              startDecorator={<PlusIcon fontSize='var(--Icon-fontSize)' />}
              sx={{
                width: { xs: 38, sm: 'auto' },
                height: { xs: 38, sm: 'auto' },
                minWidth: { xs: 38, sm: 'auto' },
                py: { xs: 0, sm: 0.75 },
                px: { xs: 0, sm: 1 },
                '& .MuiButton-startDecorator': {
                  margin: { xs: 0, sm: '0 8px 0 0' },
                },
              }}
            >
              <Box
                component='span'
                sx={{
                  display: { xs: 'none', sm: 'inline' },
                }}
              >
                Create segment
              </Box>
            </Button>
          </Stack>
        </Stack>

        {/* Content */}
        {isLoading ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: { xs: '40vh', sm: '50vh' },
            }}
          >
            <CircularProgress size='md' />
          </Box>
        ) : segments && segments.length > 0 ? (
          <>
            {viewMode === 'grid' ? (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, 1fr)',
                    md: 'repeat(3, 1fr)',
                  },
                  gap: 2,
                  mt: 2,
                  maxWidth: '1150px',
                  mr: 'auto',
                }}
              >
                {segments.map((segment) => (
                  <SegmentCard
                    key={segment.list_id}
                    segment={segment}
                    onDelete={handleDeleteClick}
                  />
                ))}
              </Box>
            ) : (
              <Box sx={{ mt: 2 }}>
                <Box
                  sx={{
                    overflowX: 'auto',
                    width: '100%',
                    WebkitOverflowScrolling: 'touch',
                    scrollbarWidth: { xs: 'thin', sm: 'auto' },
                    '&::-webkit-scrollbar': {
                      height: { xs: '8px', sm: '12px' },
                    },
                    '&::-webkit-scrollbar-thumb': {
                      backgroundColor: 'var(--joy-palette-divider)',
                      borderRadius: '4px',
                    },
                    minWidth: 0,
                  }}
                >
                  <Table
                    aria-label='segments table'
                    sx={{
                      width: '100%',
                      tableLayout: 'fixed',
                      '& thead th': {
                        fontWeight: '600',
                        fontSize: '14px',
                        color: 'var(--joy-palette-text-primary)',
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        backgroundColor: 'background.level1',
                        px: { xs: 1, sm: 2 },
                      },
                      '& tbody tr': {
                        '&:hover': {
                          backgroundColor: 'background.level1',
                        },
                        '&:not(:last-child)': {
                          borderBottom: '1px solid #E5E7EB',
                        },
                      },
                      '& tbody td': {
                        fontSize: '14px',
                        px: { xs: 1, sm: 2 },
                        verticalAlign: 'middle',
                        color: 'var(--joy-palette-text-secondary)',
                        fontWeight: 300,
                      },
                    }}
                  >
                    <thead>
                      <tr>
                        <th style={{ width: '45%' }}>Segment Name</th>
                        <th style={{ width: '15%' }}>Companies Count</th>
                        <th style={{ width: '12%' }}>Status</th>
                        <th style={{ width: '18%' }}>Last Updated</th>
                        <th style={{ width: '80px', textAlign: 'right' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {segments.map((segment) => (
                        <SegmentTableRow
                          key={segment.list_id}
                          segment={segment}
                          onDelete={handleDeleteClick}
                        />
                      ))}
                    </tbody>
                  </Table>
                </Box>
              </Box>
            )}
            {totalPages > 1 && (
              <Pagination
                totalPages={totalPages}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
                disabled={isLoading}
              />
            )}
          </>
        ) : (
          <EmptySegments />
        )}
      </Stack>
      <DeleteItemModal
        open={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setSegmentToDelete(null);
        }}
        onConfirm={confirmDelete}
        title='Delete segment'
        description={`Are you sure you want to delete "${segmentToDelete?.name}"?`}
      />
    </Box>
  );
}
