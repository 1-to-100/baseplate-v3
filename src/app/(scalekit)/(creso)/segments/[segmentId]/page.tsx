'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/joy/Box';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import Button from '@mui/joy/Button';
import Alert from '@mui/joy/Alert';
import CircularProgress from '@mui/joy/CircularProgress';
import Table from '@mui/joy/Table';
import Checkbox from '@mui/joy/Checkbox';
import Avatar from '@mui/joy/Avatar';
import Chip from '@mui/joy/Chip';
import IconButton from '@mui/joy/IconButton';
import Menu from '@mui/joy/Menu';
import MenuItem from '@mui/joy/MenuItem';
import ListItemDecorator from '@mui/joy/ListItemDecorator';
import ListItemContent from '@mui/joy/ListItemContent';
import Breadcrumbs from '@mui/joy/Breadcrumbs';
import { ArrowLeft as ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr/ArrowLeft';
import { ArrowsCounterClockwise as ArrowsCounterClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ArrowsCounterClockwise';
import { DotsThreeVertical } from '@phosphor-icons/react/dist/ssr/DotsThreeVertical';
import { Eye as EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';
import { Minus as MinusIcon } from '@phosphor-icons/react/dist/ssr/Minus';
import { SelectionAll as SelectionAllIcon } from '@phosphor-icons/react/dist/ssr/SelectionAll';

import { paths } from '@/paths';
import CompanyDetailsPopover from '../../companies/ui/components/company-details-popover';
import { BreadcrumbsItem } from '@/components/core/breadcrumbs-item';
import { BreadcrumbsSeparator } from '@/components/core/breadcrumbs-separator';
import Pagination from '@/components/dashboard/layout/pagination';
import { toast } from '@/components/core/toaster';
import { getSegmentById, removeCompanyFromSegment } from '../lib/api/segments';
import { ListStatus } from '../lib/types/list';

interface PageProps {
  params: Promise<{
    segmentId: string;
  }>;
}

const ITEMS_PER_PAGE = 50;
const POLLING_INTERVAL = 3000; // Poll every 3 seconds when processing

export default function SegmentDetailsPage({ params }: PageProps): React.JSX.Element {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [segmentId, setSegmentId] = React.useState<string | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [selectedRows, setSelectedRows] = React.useState<number[]>([]);
  const [menuAnchorEl, setMenuAnchorEl] = React.useState<HTMLElement | null>(null);
  const [openMenuIndex, setOpenMenuIndex] = React.useState<number | null>(null);
  const [isRemoving, setIsRemoving] = React.useState(false);
  const [openCompanyPopoverIdx, setOpenCompanyPopoverIdx] = React.useState<number | null>(null);
  const [companyPopoverAnchorEl, setCompanyPopoverAnchorEl] = React.useState<null | HTMLElement>(
    null
  );

  // Handle async params
  React.useEffect(() => {
    params.then((resolvedParams) => {
      setSegmentId(resolvedParams.segmentId);
    });
  }, [params]);

  // Fetch segment data with polling when processing
  const {
    data: segmentData,
    isLoading,
    error,
    isFetching,
  } = useQuery({
    queryKey: ['segment', segmentId, currentPage],
    queryFn: () =>
      getSegmentById(segmentId!, {
        page: currentPage,
        perPage: ITEMS_PER_PAGE,
      }),
    enabled: !!segmentId,
    // Poll when segment is processing
    refetchInterval: (query) => {
      const status = query.state.data?.segment?.status;
      // Keep polling while status is 'new' or 'processing'
      if (status === ListStatus.NEW || status === ListStatus.PROCESSING) {
        return POLLING_INTERVAL;
      }
      return false; // Stop polling when completed or failed
    },
  });

  const segment = segmentData?.segment;
  const companies = segmentData?.companies || [];
  const meta = segmentData?.meta;
  const isProcessing =
    segment?.status === ListStatus.NEW || segment?.status === ListStatus.PROCESSING;

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedRows(companies.map((_, idx) => idx));
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectRow = (idx: number) => {
    setSelectedRows((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, idx: number) => {
    event.stopPropagation();
    event.preventDefault();
    setMenuAnchorEl(event.currentTarget);
    setOpenMenuIndex(idx);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setOpenMenuIndex(null);
  };

  const handleOpenCompanyPopover = (idx: number) => {
    setCompanyPopoverAnchorEl(menuAnchorEl);
    setOpenCompanyPopoverIdx(idx);
    handleMenuClose();
  };

  const handleCloseCompanyPopover = () => {
    setOpenCompanyPopoverIdx(null);
    setCompanyPopoverAnchorEl(null);
  };

  const handleExcludeFromSegment = async (company: (typeof companies)[0]) => {
    handleMenuClose();
    if (!segmentId) return;
    setIsRemoving(true);
    try {
      await removeCompanyFromSegment(segmentId, company.company_id);
      toast.success('Company removed from segment');
      await queryClient.invalidateQueries({ queryKey: ['segment', segmentId, currentPage] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove company from segment');
    } finally {
      setIsRemoving(false);
    }
  };

  // Reset selection when page changes
  React.useEffect(() => {
    setSelectedRows([]);
  }, [currentPage]);

  // Close company popover on click outside or Escape
  React.useEffect(() => {
    if (openCompanyPopoverIdx === null) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const isClickOnPopover =
        target.closest('[data-menu-item]') ||
        target.closest('[data-menu-button]') ||
        target.closest('[data-popover]') ||
        target.closest('.MuiTabs-root') ||
        target.closest('.MuiTab-root') ||
        target.closest('.MuiTabList-root') ||
        target.closest('.MuiTabPanel-root') ||
        target.closest("[role='tab']") ||
        target.closest("[role='tablist']") ||
        target.closest("[role='tabpanel']");
      // Don't close popover when user is interacting with a modal (e.g. Edit Company)
      const isClickOnModal = target.closest('[role="dialog"]') || target.closest('.MuiModal-root');
      if (!isClickOnPopover && !isClickOnModal) {
        handleCloseCompanyPopover();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleCloseCompanyPopover();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openCompanyPopoverIdx]);

  const filters = (segment?.filters || {}) as {
    country?: string;
    location?: string;
    employees?: string | string[];
    categories?: string[];
    technographics?: string[];
    persona?: string;
  };

  const employeesDisplay = Array.isArray(filters.employees)
    ? filters.employees[0]
    : filters.employees;

  const viewFilters = (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        mb: 1,
        maxWidth: '95%',
        gap: 1,
      }}
    >
      <Typography fontSize={12} sx={{ color: 'var(--joy-palette-text-secondary)', mr: 4 }}>
        <span>Total:</span>{' '}
        <span style={{ fontWeight: 500, color: 'var(--joy-palette-text-primary)' }}>
          {isLoading ? '...' : (meta?.total ?? 0).toLocaleString()}
        </span>
      </Typography>
      {filters.country && (
        <Typography fontSize={12} sx={{ color: 'var(--joy-palette-text-secondary)', mr: 4 }}>
          <span>Country:</span>{' '}
          <span style={{ fontWeight: 500, color: 'var(--joy-palette-text-primary)' }}>
            {filters.country}
          </span>
        </Typography>
      )}
      {filters.location && (
        <Typography fontSize={12} sx={{ color: 'var(--joy-palette-text-secondary)', mr: 4 }}>
          <span>Location:</span>{' '}
          <span style={{ fontWeight: 500, color: 'var(--joy-palette-text-primary)' }}>
            {filters.location}
          </span>
        </Typography>
      )}
      {employeesDisplay && (
        <Typography fontSize={12} sx={{ color: 'var(--joy-palette-text-secondary)', mr: 4 }}>
          <span>Company size:</span>{' '}
          <span style={{ fontWeight: 500, color: 'var(--joy-palette-text-primary)' }}>
            {employeesDisplay}
          </span>
        </Typography>
      )}
      {filters.categories && filters.categories.length > 0 && (
        <Typography fontSize={12} sx={{ color: 'var(--joy-palette-text-secondary)', mr: 4 }}>
          <span>Industry:</span>{' '}
          <span style={{ fontWeight: 500, color: 'var(--joy-palette-text-primary)' }}>
            {filters.categories.join(', ')}
          </span>
        </Typography>
      )}
      {filters.technographics && filters.technographics.length > 0 && (
        <Typography fontSize={12} sx={{ color: 'var(--joy-palette-text-secondary)', mr: 4 }}>
          <span>Technographics:</span>{' '}
          <span style={{ fontWeight: 500, color: 'var(--joy-palette-text-primary)' }}>
            {filters.technographics.join(', ')}
          </span>
        </Typography>
      )}
      {filters.persona && (
        <Typography fontSize={12} sx={{ color: 'var(--joy-palette-text-secondary)', mr: 4 }}>
          <span>Persona:</span>{' '}
          <span style={{ fontWeight: 500, color: 'var(--joy-palette-text-primary)' }}>
            {filters.persona}
          </span>
        </Typography>
      )}
    </Box>
  );

  if (isLoading) {
    return (
      <Box sx={{ p: 'var(--Content-padding)' }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '400px',
          }}
        >
          <CircularProgress size='md' />
        </Box>
      </Box>
    );
  }

  if (error || !segment) {
    return (
      <Box sx={{ p: 'var(--Content-padding)' }}>
        <Stack spacing={3}>
          <Alert color='danger'>
            <Typography level='body-md'>
              {error instanceof Error ? error.message : 'Segment not found'}
            </Typography>
          </Alert>
          <Button
            variant='outlined'
            startDecorator={<ArrowLeftIcon size={20} />}
            onClick={() => router.push(paths.dashboard.segments.list)}
          >
            Back to Segments
          </Button>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 'var(--Content-padding)' }}>
      <Stack>
        {/* Header */}
        <Stack spacing={2}>
          <Stack
            direction='row'
            spacing={2}
            sx={{ alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Typography fontSize={{ xs: 'xl2', sm: 'xl3' }} level='h1'>
              {segment.name}
            </Typography>
            <Button
              variant='solid'
              color='primary'
              onClick={() => router.push(paths.dashboard.segments.edit(segment.list_id))}
            >
              Edit
            </Button>
          </Stack>
          <Breadcrumbs sx={{ mb: 2 }} separator={<BreadcrumbsSeparator />}>
            <BreadcrumbsItem href={paths.dashboard.overview} type='start' />
            <BreadcrumbsItem href={paths.dashboard.segments.list}>Segments</BreadcrumbsItem>
            <BreadcrumbsItem type='end'>{segment.name}</BreadcrumbsItem>
          </Breadcrumbs>
        </Stack>

        {/* Segment filters summary */}
        <Box
          sx={{
            pb: 2,
            borderBottom: '1px solid var(--joy-palette-divider)',
          }}
        >
          {viewFilters}
        </Box>

        {/* Companies Table */}
        <Stack spacing={3}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{ alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, pt: 1 }}>
              <Typography
                fontSize={18}
                fontWeight={500}
                sx={{ color: 'var(--joy-palette-text-primary)' }}
              >
                {isProcessing
                  ? 'Processing...'
                  : `${meta?.total.toLocaleString() || 0} companies found`}
              </Typography>
              {isProcessing && (
                <Chip
                  size='sm'
                  variant='soft'
                  color='warning'
                  startDecorator={<ArrowsCounterClockwiseIcon size={14} className='animate-spin' />}
                >
                  Updating
                </Chip>
              )}
              {isFetching && !isProcessing && <CircularProgress size='sm' />}
            </Box>
          </Stack>

          {isProcessing ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <CircularProgress size='lg' sx={{ mb: 2 }} />
              <Typography
                fontWeight={600}
                fontSize={16}
                sx={{ color: 'var(--joy-palette-text-primary)', mb: 1 }}
              >
                Processing segment...
              </Typography>
              <Typography
                fontSize={14}
                sx={{
                  color: 'var(--joy-palette-text-secondary)',
                  fontWeight: 300,
                  lineHeight: 1.5,
                }}
              >
                We&apos;re searching for companies matching your filters. This may take a moment.
              </Typography>
            </Box>
          ) : companies.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography
                fontSize={14}
                sx={{
                  color: 'var(--joy-palette-text-secondary)',
                  fontWeight: 300,
                }}
              >
                No companies found in this segment.
              </Typography>
            </Box>
          ) : (
            <>
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
                  maxHeight: 'calc(100vh - 360px)',
                  overflowY: 'auto',
                }}
              >
                <Table
                  aria-label='companies table'
                  sx={{
                    width: '100%',
                    minWidth: 1280,
                    '& th, & td': {
                      px: { xs: 1, sm: 2 },
                    },
                    '& thead': {
                      position: 'sticky',
                      top: 0,
                      zIndex: 1,
                    },
                    '& thead th': {
                      bgcolor: 'var(--joy-palette-background-level1)',
                      fontWeight: 500,
                      color: 'var(--joy-palette-text-primary)',
                    },
                    '& tbody td': {
                      color: 'var(--joy-palette-text-secondary)',
                      fontWeight: 300,
                    },
                  }}
                >
                  <thead>
                    <tr>
                      <th style={{ width: 50, padding: '8px' }}>
                        <Checkbox
                          checked={companies.length > 0 && selectedRows.length === companies.length}
                          indeterminate={
                            selectedRows.length > 0 && selectedRows.length < companies.length
                          }
                          onChange={handleSelectAll}
                        />
                      </th>
                      <th style={{ width: 48 }}></th>
                      <th style={{ width: 220, textAlign: 'left', padding: '8px' }}>
                        Company name
                      </th>
                      <th style={{ width: 48 }}></th>
                      <th style={{ width: 200, textAlign: 'left', padding: '8px' }}>
                        States/Provinces
                      </th>
                      <th style={{ width: 100, textAlign: 'left', padding: '8px' }}>Employees</th>
                      <th style={{ width: 200, textAlign: 'left', padding: '8px' }}>Website</th>
                      <th style={{ width: 220, textAlign: 'left', padding: '8px' }}>Industry</th>
                      <th style={{ width: 140, textAlign: 'left', padding: '8px' }}>
                        Technographics
                      </th>
                      <th style={{ width: 80, textAlign: 'right', padding: '8px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {companies.map((company, index) => (
                      <tr
                        key={company.company_id}
                        onClick={(e) => {
                          const target = e.target as HTMLElement;
                          const isCheckbox =
                            target.closest('input[type="checkbox"]') ||
                            target.closest('[role="checkbox"]') ||
                            target.closest('.MuiCheckbox-root');
                          const isMenuButton =
                            target.closest('[data-menu-button]') ||
                            target.closest('[data-menu-item]');
                          if (isCheckbox || isMenuButton) return;
                          router.push(
                            paths.creso.segments.companyDetails(segmentId!, company.company_id)
                          );
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>
                          <Checkbox
                            checked={selectedRows.includes(index)}
                            onChange={() => handleSelectRow(index)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                        <td>
                          <Avatar
                            src={company.logo || undefined}
                            alt={company.display_name || company.legal_name || 'Company'}
                            sx={{ width: 28, height: 28 }}
                          >
                            {(company.display_name || company.legal_name || 'C')
                              .charAt(0)
                              .toUpperCase()}
                          </Avatar>
                        </td>
                        <td>
                          <Typography
                            sx={{
                              wordBreak: 'break-all',
                              color: 'var(--joy-palette-text-secondary)',
                              fontWeight: 300,
                              fontSize: 14,
                            }}
                          >
                            {company.display_name || company.legal_name || 'Unknown'}
                          </Typography>
                        </td>
                        <td>{/* New badge column - reserved for future use */}</td>
                        <td>
                          <Typography
                            sx={{
                              color: 'var(--joy-palette-text-secondary)',
                              fontWeight: 300,
                              fontSize: 14,
                            }}
                          >
                            {[company.region, company.country].filter(Boolean).join(', ') || '—'}
                          </Typography>
                        </td>
                        <td>
                          <Typography
                            sx={{
                              color: 'var(--joy-palette-text-secondary)',
                              fontWeight: 300,
                              fontSize: 14,
                            }}
                          >
                            {company.employees ? company.employees.toLocaleString() : '—'}
                          </Typography>
                        </td>
                        <td>
                          {company.website_url ? (
                            <Box
                              component='span'
                              onClick={(e) => {
                                e.stopPropagation();
                                const url =
                                  company.website_url!.startsWith('http://') ||
                                  company.website_url!.startsWith('https://')
                                    ? company.website_url!
                                    : `https://${company.website_url}`;
                                window.open(url, '_blank', 'noopener,noreferrer');
                              }}
                              sx={{
                                display: 'block',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                cursor: 'pointer',
                                color: 'var(--joy-palette-primary-500)',
                                textDecoration: 'underline',
                              }}
                            >
                              {company.website_url}
                            </Box>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td>
                          <Typography
                            sx={{
                              color: 'var(--joy-palette-text-secondary)',
                              fontWeight: 300,
                              fontSize: 14,
                            }}
                          >
                            {company.categories && company.categories.length > 0
                              ? company.categories[0]
                              : '—'}
                          </Typography>
                        </td>
                        <td>
                          <Typography
                            sx={{
                              color: 'var(--joy-palette-text-secondary)',
                              fontWeight: 300,
                              fontSize: 14,
                            }}
                          >
                            —
                          </Typography>
                        </td>
                        <td
                          style={{
                            position: 'relative',
                            textAlign: 'right',
                          }}
                        >
                          <IconButton
                            size='sm'
                            variant='plain'
                            color='neutral'
                            sx={{
                              minWidth: 0,
                              p: 0.5,
                              borderRadius: '50%',
                            }}
                            data-menu-button
                            onClick={(e) => handleMenuOpen(e, index)}
                          >
                            <DotsThreeVertical
                              weight='bold'
                              size={22}
                              color='var(--joy-palette-text-secondary)'
                            />
                          </IconButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Box>
              <Menu
                anchorEl={menuAnchorEl}
                open={openMenuIndex !== null && Boolean(menuAnchorEl)}
                onClose={handleMenuClose}
                placement='bottom-start'
                sx={{
                  '--ListItem-fontSize': 'var(--joy-fontSize-sm)',
                  '--ListItemDecorator-size': '1.5rem',
                  minWidth: 200,
                }}
              >
                {openMenuIndex !== null &&
                  companies[openMenuIndex] &&
                  (() => {
                    const company = companies[openMenuIndex];
                    return (
                      <>
                        <MenuItem
                          data-menu-item
                          onClick={() => {
                            if (company && openMenuIndex !== null) {
                              handleOpenCompanyPopover(openMenuIndex);
                            }
                          }}
                        >
                          <ListItemDecorator>
                            <SelectionAllIcon fontSize='var(--Icon-fontSize)' weight='bold' />
                          </ListItemDecorator>
                          <ListItemContent>Quick preview</ListItemContent>
                        </MenuItem>
                        <MenuItem
                          data-menu-item
                          onClick={() => {
                            if (company) {
                              handleMenuClose();
                              router.push(
                                paths.creso.segments.companyDetails(segmentId!, company.company_id)
                              );
                            }
                          }}
                        >
                          <ListItemDecorator>
                            <EyeIcon fontSize='var(--Icon-fontSize)' weight='bold' />
                          </ListItemDecorator>
                          <ListItemContent>View profile</ListItemContent>
                        </MenuItem>
                        <MenuItem
                          data-menu-item
                          onClick={() => company && handleExcludeFromSegment(company)}
                          disabled={isRemoving}
                          sx={{ color: 'var(--joy-palette-danger-600)' }}
                        >
                          <ListItemDecorator>
                            <MinusIcon fontSize='var(--Icon-fontSize)' weight='bold' />
                          </ListItemDecorator>
                          <ListItemContent>Exclude from segment</ListItemContent>
                        </MenuItem>
                      </>
                    );
                  })()}
              </Menu>
              {openCompanyPopoverIdx !== null && companies[openCompanyPopoverIdx] && (
                <CompanyDetailsPopover
                  open={openCompanyPopoverIdx !== null}
                  onClose={handleCloseCompanyPopover}
                  anchorEl={companyPopoverAnchorEl}
                  companyId={
                    parseInt(
                      companies[openCompanyPopoverIdx].company_id
                        .replace(/-/g, '')
                        .substring(0, 10),
                      16
                    ) || 0
                  }
                  company_id={companies[openCompanyPopoverIdx].company_id}
                />
              )}
              {meta && meta.lastPage > 1 && (
                <Pagination
                  totalPages={meta.lastPage}
                  currentPage={currentPage}
                  onPageChange={setCurrentPage}
                  disabled={isLoading}
                />
              )}
            </>
          )}
        </Stack>
      </Stack>
    </Box>
  );
}
