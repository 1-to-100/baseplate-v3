'use client';

import * as React from 'react';
import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Box from '@mui/joy/Box';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import IconButton from '@mui/joy/IconButton';
import Table from '@mui/joy/Table';
import Checkbox from '@mui/joy/Checkbox';
import Button from '@mui/joy/Button';
import Avatar from '@mui/joy/Avatar';
import CircularProgress from '@mui/joy/CircularProgress';
import { Popper } from '@mui/base/Popper';
import { DotsThreeVertical } from '@phosphor-icons/react/dist/ssr/DotsThreeVertical';
import { SelectionAll } from '@phosphor-icons/react/dist/ssr/SelectionAll';
import { Eye as EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';
import { PencilSimple as PencilIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import { UploadSimple as UploadSimpleIcon } from '@phosphor-icons/react/dist/ssr/UploadSimple';
import { Funnel as FunnelIcon } from '@phosphor-icons/react/dist/ssr/Funnel';
import { paths } from '@/paths';
import Pagination from '@/components/dashboard/layout/pagination';
import { useGlobalSearch } from '@/hooks/use-global-search';
import { useUserInfo } from '@/hooks/use-user-info';
import { useImpersonation } from '@/contexts/impersonation-context';
import { getCompanies } from './lib/api/companies';
import type { GetCompaniesParams } from './lib/types/company';
import type { CompanyItem, CompanyFilterFields } from './lib/types/company';
import CompanyFilter from './ui/components/company-filter';
import CompanyDetailsPopover from './ui/components/company-details-popover';
import EditCompanyModal from '@/components/dashboard/modals/EditCompanyModal';

export default function Page(): React.JSX.Element {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [anchorEl, setAnchorPopper] = useState<null | HTMLElement>(null);
  const [menuRowIndex, setMenuRowIndex] = useState<number | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<CompanyItem | null>(null);
  const [openCompanyPopoverIdx, setOpenCompanyPopoverIdx] = useState<number | null>(null);
  const [companyPopoverAnchorEl, setCompanyPopoverAnchorEl] = useState<null | HTMLElement>(null);
  const [sortColumn, setSortColumn] = useState<keyof CompanyItem | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(() => {
    const pageParam = searchParams.get('page');
    const parsedPage = pageParam ? parseInt(pageParam, 10) : NaN;
    return Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  });
  const { debouncedSearchValue } = useGlobalSearch();
  const { userInfo } = useUserInfo();
  const isSuperAdmin = userInfo?.isSuperadmin;
  const isCustomerSuccess = userInfo?.isCustomerSuccess;
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterData, setFilterData] = useState<CompanyFilterFields>({});
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyItem | null>(null);
  const { isImpersonating } = useImpersonation();

  const updatePageQueryParam = useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams?.toString());

      if (page > 1) {
        params.set('page', page.toString());
      } else {
        params.delete('page');
      }

      const queryString = params.toString();
      router.replace(`${paths.creso.companies.list}${queryString ? `?${queryString}` : ''}`);
    },
    [router, searchParams]
  );

  const rowsPerPage = 10;

  const { data, isLoading, error } = useQuery({
    queryKey: [
      'companies',
      currentPage,
      debouncedSearchValue,
      sortColumn,
      sortDirection,
      filterData,
    ],
    queryFn: async () => {
      const params: GetCompaniesParams = {
        search: filterData?.name || debouncedSearchValue || '',
        page: currentPage,
        limit: rowsPerPage,
        sortBy: (sortColumn as string) || '',
        sortOrder: sortDirection,
      };

      if (filterData?.industry && filterData.industry.length > 0) {
        params.category = filterData.industry;
      }
      if (filterData?.technographic && filterData.technographic.length > 0) {
        params.technology = filterData.technographic;
      }
      if (filterData?.country) {
        params.country = filterData.country;
      }
      if (filterData?.region) {
        params.region = filterData.region;
      }
      if (filterData?.companySize) {
        const [minEmployees, maxEmployees] = filterData.companySize;
        if (minEmployees && minEmployees > 0) params.min_employees = minEmployees;
        if (maxEmployees && maxEmployees > 0) params.max_employees = maxEmployees;
      }

      return getCompanies(params);
    },
  });

  const companies = data?.data || [];
  const totalPages = data?.pagination?.totalPages || data?.meta?.lastPage || 1;
  const totalCount = data?.meta?.total || data?.pagination?.total || 0;
  const hasResults = companies.length > 0;

  useEffect(() => {
    const pageParam = searchParams.get('page');
    const parsedPage = pageParam ? parseInt(pageParam, 10) : NaN;
    const nextPage = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

    setCurrentPage((prev) => (prev === nextPage ? prev : nextPage));
  }, [searchParams]);

  useEffect(() => {
    setSelectedRows([]);
  }, [currentPage]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (anchorEl && !anchorEl.contains(event.target as Node)) {
        handleMenuClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [anchorEl]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openCompanyPopoverIdx !== null) {
        const target = event.target as HTMLElement;
        const isClickOnMenu =
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

        if (!isClickOnMenu) {
          handleCloseCompanyPopover();
        }
      } else if (menuRowIndex !== null && anchorEl) {
        if (!anchorEl.contains(event.target as Node)) {
          handleMenuClose();
        }
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (openCompanyPopoverIdx !== null) {
          handleCloseCompanyPopover();
        } else if (menuRowIndex !== null) {
          handleMenuClose();
        }
      }
    };

    if (openCompanyPopoverIdx !== null || menuRowIndex !== null) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openCompanyPopoverIdx, menuRowIndex, anchorEl]);

  const handleRowCheckboxChange = (companyId: string) => {
    setSelectedRows((prev) =>
      prev.includes(companyId) ? prev.filter((id) => id !== companyId) : [...prev, companyId]
    );
  };

  const handleSelectAllChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!hasResults) return;
    if (event.target.checked) {
      setSelectedRows(companies?.map((company) => company.id.toString()) || []);
    } else {
      setSelectedRows([]);
    }
  };

  const handleCloseFilter = () => {
    setIsFilterOpen(false);
  };

  const handleOpenFilter = () => {
    setTimeout(() => {
      setIsFilterOpen(!isFilterOpen);
    }, 0);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, index: number) => {
    event.stopPropagation();
    setAnchorPopper(event.currentTarget);
    setMenuRowIndex(index);
  };

  const handleMenuClose = () => {
    setAnchorPopper(null);
    setMenuRowIndex(null);
  };

  const handleOpenCompanyPopover = (idx: number, event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setOpenCompanyPopoverIdx(idx);
    setCompanyPopoverAnchorEl(event.currentTarget);
    setMenuRowIndex(null);
  };

  const handleCloseCompanyPopover = () => {
    setOpenCompanyPopoverIdx(null);
    setCompanyPopoverAnchorEl(null);
    setMenuRowIndex(null);
  };

  const handleSort = (column: keyof CompanyItem) => {
    const isAsc = sortColumn === column && sortDirection === 'asc';
    const newDirection = isAsc ? 'desc' : 'asc';
    setSortColumn(column);
    setSortDirection(newDirection);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    updatePageQueryParam(page);
  };

  const handleFilter = (filters: CompanyFilterFields) => {
    setFilterData(filters);
    setCurrentPage(1);
    updatePageQueryParam(1);
  };

  const handleQuickPreview = (
    company: CompanyItem,
    index: number,
    event: React.MouseEvent<HTMLElement>
  ) => {
    setSelectedCompany(company);
    handleOpenCompanyPopover(index, event);
    handleMenuClose();
  };

  const handleViewProfile = (company: CompanyItem) => {
    router.push(paths.creso.companies.details(company.company_id ?? String(company.id)));
    handleMenuClose();
  };

  const handleEditCompany = (company: CompanyItem) => {
    setEditingCompany(company);
    setIsEditModalOpen(true);
    handleMenuClose();
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';

      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (error) {
      return 'N/A';
    }
  };

  const formatPhoneNumber = (phone: string | null | undefined) => {
    if (!phone) return 'N/A';
    return phone.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
  };

  const formatEmployees = (employees: number | null | undefined) => {
    if (!employees) return 'N/A';
    return employees.toLocaleString();
  };

  const menuItemStyle = {
    padding: { xs: '6px 12px', sm: '8px 16px' },
    fontSize: { xs: '12px', sm: '14px' },
    fontWeight: '400',
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    color: 'var(--joy-palette-text-primary)',
    '&:hover': { backgroundColor: 'var(--joy-palette-background-mainBg)' },
  };

  if (error) {
    const httpError = error as { response?: { status?: number }; message?: string };
    const status = httpError.response?.status;

    if (status === 403) {
      return (
        <Box sx={{ p: 'var(--Content-padding)' }}>
          <Typography level='title-lg' color='danger'>
            Access Denied
          </Typography>
        </Box>
      );
    }
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 'var(--Content-padding)' } }}>
      <Stack spacing={{ xs: 2, sm: 3 }} sx={{ mt: { xs: 0, sm: 0 } }}>
        <Stack
          direction={{ xs: 'row', sm: 'row' }}
          spacing={{ xs: 2, sm: 3 }}
          sx={{
            alignItems: { xs: 'center', sm: 'flex-start' },
            justifyContent: { xs: 'space-between', sm: 'flex-start' },
          }}
        >
          <Stack spacing={1} sx={{ flex: '1 1 auto' }}>
            <Typography
              fontSize={{ xs: 'xl2', sm: 'xl3' }}
              level='h1'
              sx={{
                wordBreak: 'break-word',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              Companies{' '}
              <Typography
                level='body-sm'
                sx={{ fontSize: { xs: 'xl2', sm: 'xl3' }, color: '#3D37DD' }}
              >
                {totalCount > 0 ? totalCount : '0'}
              </Typography>
            </Typography>
          </Stack>

          <Stack
            direction={{ xs: 'row', sm: 'row' }}
            spacing={{ xs: 1, sm: 2 }}
            sx={{
              alignItems: { xs: 'center', sm: 'center' },
              width: { xs: 'auto', sm: 'auto' },
              flexShrink: 0,
            }}
          >
            {selectedRows.length > 0 ? (
              <Stack
                direction='row'
                spacing={{ xs: 1, sm: 2 }}
                sx={{
                  alignItems: 'center',
                  width: { xs: 'auto', sm: 'auto' },
                  display: { xs: 'none', sm: 'flex' },
                  borderRight: '1px solid #E5E7EB',
                  paddingRight: '16px',
                }}
              >
                <Typography
                  level='body-sm'
                  sx={{
                    color: 'var(--joy-palette-text-secondary)',
                    fontSize: { xs: '12px', sm: '14px' },
                  }}
                >
                  {selectedRows.length} row{selectedRows.length > 1 ? 's' : ''} selected
                </Typography>
                <IconButton
                  onClick={() => {
                    console.log('Delete selected:', selectedRows);
                  }}
                  sx={{
                    bgcolor: '#FEE2E2',
                    color: '#EF4444',
                    borderRadius: '50%',
                    width: { xs: 28, sm: 32 },
                    height: { xs: 28, sm: 32 },
                    '&:hover': { bgcolor: '#FECACA' },
                  }}
                >
                  <TrashIcon fontSize='var(--Icon-fontSize)' />
                </IconButton>
                <IconButton
                  onClick={() => {
                    console.log('Export selected:', selectedRows);
                  }}
                  sx={{
                    bgcolor: 'var(--joy-palette-background-mainBg)',
                    color: 'var(--joy-palette-text-primary)',
                    borderRadius: '50%',
                    width: { xs: 28, sm: 32 },
                    height: { xs: 28, sm: 32 },
                    border: '1px solid var(--joy-palette-divider)',
                    '&:hover': {
                      bgcolor: 'var(--joy-palette-background-level1)',
                    },
                  }}
                >
                  <UploadSimpleIcon fontSize='var(--Icon-fontSize)' />
                </IconButton>
              </Stack>
            ) : null}

            <Button
              variant='outlined'
              startDecorator={<FunnelIcon fontSize='var(--Icon-fontSize)' />}
              onClick={handleOpenFilter}
              data-filter-button
              sx={{
                borderColor: 'var(--joy-palette-divider)',
                background: 'var(--joy-palette-background-mainBg)',
                color: 'var(--joy-palette-text-primary)',
                padding: { xs: 0, sm: '7px 14px' },
                fontSize: { xs: '12px', sm: '14px' },
                width: { xs: 40, sm: 'auto' },
                height: { xs: 40, sm: 'auto' },
                minWidth: { xs: 40, sm: 'auto' },
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
                Filter
              </Box>
            </Button>
          </Stack>
        </Stack>

        {/* Selected rows block for mobile */}
        {selectedRows.length > 0 ? (
          <Box
            sx={{
              display: { xs: 'flex', sm: 'none' },
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 0',
              gap: 1,
              flexWrap: 'wrap',
            }}
          >
            <Typography
              level='body-sm'
              sx={{
                color: 'var(--joy-palette-text-secondary)',
                fontSize: { xs: '12px', sm: '14px' },
              }}
            >
              {selectedRows.length} row{selectedRows.length > 1 ? 's' : ''} selected
            </Typography>
            <Stack direction='row' spacing={1}>
              <IconButton
                onClick={() => {
                  console.log('Delete selected:', selectedRows);
                }}
                sx={{
                  bgcolor: '#FEE2E2',
                  color: '#EF4444',
                  borderRadius: '50%',
                  width: { xs: 28, sm: 32 },
                  height: { xs: 28, sm: 32 },
                  '&:hover': { bgcolor: '#FECACA' },
                }}
              >
                <TrashIcon fontSize='var(--Icon-fontSize)' />
              </IconButton>
              <IconButton
                onClick={() => {
                  console.log('Export selected:', selectedRows);
                }}
                sx={{
                  bgcolor: 'var(--joy-palette-background-mainBg)',
                  color: 'var(--joy-palette-text-primary)',
                  borderRadius: '50%',
                  width: { xs: 28, sm: 32 },
                  height: { xs: 28, sm: 32 },
                  border: '1px solid var(--joy-palette-divider)',
                  '&:hover': {
                    bgcolor: 'var(--joy-palette-background-level1)',
                  },
                }}
              >
                <UploadSimpleIcon fontSize='var(--Icon-fontSize)' />
              </IconButton>
            </Stack>
          </Box>
        ) : null}

        <Box
          sx={{
            display: 'flex',
            transition: 'all 0.3s ease-out',
            position: 'relative',
          }}
        >
          {isFilterOpen && (
            <>
              <Box
                data-overlay='true'
                sx={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  bgcolor: 'rgba(0, 0, 0, 0.5)',
                  zIndex: 1200,
                  display: { xs: 'block', sm: 'none' },
                }}
              />
              <CompanyFilter
                open={isFilterOpen}
                onClose={handleCloseFilter}
                onFilter={handleFilter}
                initialFilters={filterData}
                onFiltersChange={setFilterData}
              />
            </>
          )}
          <Box sx={{ flex: 1, minWidth: 0 }}>
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
            ) : (
              <>
                <Box>
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
                      pl: { xs: 0, sm: 2 },
                    }}
                  >
                    <Table
                      aria-label='companies table'
                      sx={{
                        '& thead th': {
                          fontWeight: '600',
                          fontSize: '14px',
                          color: 'var(--joy-palette-text-primary)',
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                          backgroundColor: 'background.level1',
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
                          verticalAlign: 'middle',
                          color: 'var(--joy-palette-text-secondary)',
                          fontWeight: 300,
                        },
                        '& .MuiCheckbox-root': {
                          padding: '4px',
                        },
                      }}
                    >
                      <thead>
                        <tr>
                          <th style={{ width: 50, padding: '8px' }}>
                            <Checkbox
                              checked={hasResults && selectedRows.length === companies.length}
                              indeterminate={
                                hasResults &&
                                selectedRows.length > 0 &&
                                selectedRows.length < companies.length
                              }
                              onChange={handleSelectAllChange}
                              disabled={!hasResults}
                              size='sm'
                              sx={{ p: 0 }}
                            />
                          </th>
                          <th
                            style={{
                              padding: '8px',
                              textAlign: 'left',
                              width: '300px',
                            }}
                          >
                            Name
                          </th>
                          <th
                            style={{
                              padding: '8px',
                              textAlign: 'left',
                              width: '200px',
                            }}
                          >
                            Industry
                          </th>
                          <th
                            style={{
                              padding: '8px',
                              textAlign: 'left',
                              width: '140px',
                            }}
                          >
                            Employees
                          </th>
                          <th
                            style={{
                              padding: '8px',
                              textAlign: 'left',
                              width: '160px',
                            }}
                          >
                            Phone Number
                          </th>
                          <th
                            style={{
                              padding: '8px',
                              textAlign: 'left',
                              width: '180px',
                            }}
                          >
                            Website
                          </th>
                          <th style={{ width: '60px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {companies.length === 0 ? (
                          <tr>
                            <td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>
                              <Typography level='body-md' color='neutral'>
                                No companies match selected filters
                              </Typography>
                            </td>
                          </tr>
                        ) : (
                          companies.map((company, index) => {
                            return (
                              <tr
                                key={company.id || index}
                                onClick={() => handleViewProfile(company)}
                                style={{ cursor: 'pointer' }}
                              >
                                <td style={{ padding: '8px' }}>
                                  <Checkbox
                                    size='sm'
                                    checked={selectedRows.includes(company.id.toString())}
                                    onChange={(event) => {
                                      event.stopPropagation();
                                      handleRowCheckboxChange(company.id.toString());
                                    }}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                    }}
                                    sx={{ p: 0 }}
                                  />
                                </td>
                                <td style={{ padding: '8px' }}>
                                  <Box
                                    sx={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 1,
                                    }}
                                  >
                                    {company.logo ? (
                                      <Box
                                        component='img'
                                        src={company.logo}
                                        alt={company.name}
                                        sx={{
                                          width: 28,
                                          height: 28,
                                          borderRadius: '4px',
                                          objectFit: 'cover',
                                        }}
                                        onError={(e) => {
                                          e.currentTarget.style.display = 'none';
                                        }}
                                      />
                                    ) : (
                                      <Box
                                        sx={{
                                          width: 28,
                                          height: 28,
                                          borderRadius: '4px',
                                          backgroundColor: 'background.level1',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          color: 'var(--joy-palette-text-primary)',
                                          fontWeight: '500',
                                          fontSize: '12px',
                                        }}
                                      >
                                        {company.name?.charAt(0)?.toUpperCase()}
                                      </Box>
                                    )}
                                    <Box>
                                      <Typography
                                        level='body-sm'
                                        fontWeight='300'
                                        sx={{
                                          whiteSpace: 'wrap',
                                          wordBreak: 'break-word',
                                          color: 'var(--joy-palette-text-secondary)',
                                        }}
                                      >
                                        {company.name.slice(0, 92) || 'Unknown'}
                                      </Typography>
                                    </Box>
                                  </Box>
                                </td>
                                <td style={{ padding: '8px' }}>
                                  <Box
                                    sx={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 1,
                                      flexWrap: 'wrap',
                                    }}
                                  >
                                    {company.categories && company.categories.length > 0 ? (
                                      <Typography
                                        level='body-sm'
                                        sx={{
                                          color: 'var(--joy-palette-text-secondary)',
                                          fontWeight: '300',
                                          whiteSpace: 'wrap',
                                          wordBreak: 'break-word',
                                        }}
                                      >
                                        {company.categories[0]?.slice(0, 92)}
                                      </Typography>
                                    ) : (
                                      <Typography
                                        level='body-sm'
                                        sx={{
                                          color: 'var(--joy-palette-text-secondary)',
                                          fontWeight: '300',
                                        }}
                                      >
                                        N/A
                                      </Typography>
                                    )}
                                  </Box>
                                </td>
                                <td style={{ padding: '8px' }}>
                                  <Typography
                                    level='body-sm'
                                    sx={{
                                      color: 'var(--joy-palette-text-secondary)',
                                      fontWeight: '300',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                    }}
                                  >
                                    {formatEmployees(company.employees)}
                                  </Typography>
                                </td>
                                <td style={{ padding: '8px' }}>
                                  {company?.phone ? (
                                    <Typography
                                      level='body-sm'
                                      sx={{
                                        color: 'var(--joy-palette-text-secondary)',
                                        fontWeight: '300',
                                      }}
                                    >
                                      {formatPhoneNumber(company?.phone)}
                                    </Typography>
                                  ) : (
                                    <Typography
                                      level='body-sm'
                                      sx={{
                                        color: 'var(--joy-palette-text-secondary)',
                                        fontWeight: '300',
                                      }}
                                    >
                                      N/A
                                    </Typography>
                                  )}
                                </td>
                                <td style={{ padding: '8px' }}>
                                  {company.website || company.homepageUri ? (
                                    <span
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const url =
                                          (company.website || company.homepageUri)?.startsWith(
                                            'http://'
                                          ) ||
                                          (company.website || company.homepageUri)?.startsWith(
                                            'https://'
                                          )
                                            ? company.website || company.homepageUri
                                            : `https://${company.website || company.homepageUri}`;
                                        window.open(url, '_blank', 'noopener,noreferrer');
                                      }}
                                      style={{
                                        display: 'block',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        maxWidth: '150px',
                                        cursor: 'pointer',
                                        color: 'var(--joy-palette-primary-500)',
                                        textDecoration: 'underline',
                                        fontSize: 'var(--joy-fontSize-sm)',
                                        fontWeight: '300',
                                      }}
                                    >
                                      {company.website || company.homepageUri}
                                    </span>
                                  ) : (
                                    <Typography
                                      level='body-sm'
                                      sx={{
                                        color: 'var(--joy-palette-text-secondary)',
                                        fontWeight: '300',
                                      }}
                                    >
                                      N/A
                                    </Typography>
                                  )}
                                </td>
                                <td>
                                  <IconButton
                                    size='sm'
                                    data-menu-button='true'
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleMenuOpen(event, index);
                                    }}
                                  >
                                    <DotsThreeVertical
                                      weight='bold'
                                      size={22}
                                      color='var(--joy-palette-text-secondary)'
                                    />
                                  </IconButton>
                                  <Popper
                                    open={menuRowIndex === index && Boolean(anchorEl)}
                                    anchorEl={anchorEl}
                                    placement='bottom-start'
                                    style={{
                                      minWidth: '150px',
                                      borderRadius: '8px',
                                      boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
                                      backgroundColor: 'var(--joy-palette-background-surface)',
                                      zIndex: 1300,
                                      border: '1px solid var(--joy-palette-divider)',
                                    }}
                                  >
                                    <Box
                                      data-menu-item='true'
                                      onMouseDown={(event) => {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        handleQuickPreview(company, index, event);
                                      }}
                                      sx={{
                                        ...menuItemStyle,
                                        gap: { xs: '10px', sm: '14px' },
                                      }}
                                    >
                                      <SelectionAll fontSize='20px' />
                                      Quick Preview
                                    </Box>
                                    <Box
                                      data-menu-item='true'
                                      onMouseDown={(event) => {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        handleViewProfile(company);
                                      }}
                                      sx={{
                                        ...menuItemStyle,
                                        gap: { xs: '10px', sm: '14px' },
                                      }}
                                    >
                                      <EyeIcon fontSize='20px' />
                                      View Profile
                                    </Box>
                                    {!isCustomerSuccess && (
                                      <Box
                                        data-menu-item='true'
                                        onMouseDown={(event) => {
                                          event.preventDefault();
                                          event.stopPropagation();
                                          handleEditCompany(company);
                                        }}
                                        sx={{
                                          ...menuItemStyle,
                                          gap: { xs: '10px', sm: '14px' },
                                        }}
                                      >
                                        <PencilIcon fontSize='20px' />
                                        Edit
                                      </Box>
                                    )}
                                  </Popper>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </Table>
                  </Box>

                  <Pagination
                    totalPages={totalPages}
                    currentPage={currentPage}
                    onPageChange={handlePageChange}
                    disabled={!hasResults}
                  />
                </Box>
              </>
            )}
          </Box>
        </Box>

        {/* Company Details Popover */}
        {companies.map((company, index) => (
          <CompanyDetailsPopover
            key={company.id}
            open={openCompanyPopoverIdx === index}
            onClose={handleCloseCompanyPopover}
            anchorEl={companyPopoverAnchorEl}
            companyId={company.id}
            company_id={company.company_id}
          />
        ))}

        {/* Edit Company Modal */}
        <EditCompanyModal
          open={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingCompany(null);
          }}
          company={editingCompany}
        />
      </Stack>
    </Box>
  );
}
