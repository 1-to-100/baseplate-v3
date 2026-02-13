'use client';

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/joy/Box';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import Button from '@mui/joy/Button';
import Input from '@mui/joy/Input';
import CircularProgress from '@mui/joy/CircularProgress';
import Table from '@mui/joy/Table';
import Breadcrumbs from '@mui/joy/Breadcrumbs';
import Modal from '@mui/joy/Modal';
import ModalDialog from '@mui/joy/ModalDialog';
import ModalClose from '@mui/joy/ModalClose';
import { ArrowLeft as ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr/ArrowLeft';
import { Funnel as FunnelIcon } from '@phosphor-icons/react/dist/ssr/Funnel';
import { paths } from '@/paths';
import { BreadcrumbsItem } from '@/components/core/breadcrumbs-item';
import { BreadcrumbsSeparator } from '@/components/core/breadcrumbs-separator';
import Pagination from '@/components/dashboard/layout/pagination';
import { toast } from '@/components/core/toaster';
import { getListById, updateList } from '../../lib/api/segment-lists';
import { getCompanies } from '../../lib/api/companies';
import type { GetCompaniesParams } from '../../lib/types/company';
import type { CompanyItem, CompanyFilterFields } from '../../lib/types/company';
import { ListSubtype } from '../../lib/types/list';
import { CompanyFilter } from '../../lib/components';
import { listFiltersToCompanyFilterFields, hasListFilters } from '../../lib/utils/list-filters';

const ROWS_PER_PAGE = 10;

function formatEmployees(employees: number | null | undefined): string {
  if (employees == null) return 'N/A';
  return employees.toLocaleString();
}

export default function CreateListPage(): React.JSX.Element {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const listId = searchParams?.get('listId') ?? undefined;

  const [listName, setListName] = useState('');
  const [draftFilters, setDraftFilters] = useState<CompanyFilterFields>({});
  const [appliedFilters, setAppliedFilters] = useState<CompanyFilterFields>({});
  const [filtersApplied, setFiltersApplied] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingNavigateTo, setPendingNavigateTo] = useState<string | null>(null);

  useEffect(() => {
    if (listId === undefined) return;
    if (!listId || listId.trim() === '') {
      router.replace(paths.strategyForge.lists.list);
    }
  }, [listId, router]);

  const {
    data: list,
    isLoading: listLoading,
    error: listError,
  } = useQuery({
    queryKey: ['list', listId],
    queryFn: () => getListById(listId!),
    enabled: !!listId && listId.trim() !== '',
  });

  useEffect(() => {
    if (list && listId) {
      if (list.is_static) {
        router.replace(paths.strategyForge.lists.details(listId));
        return;
      }
      setListName(list.name);
      const initial = listFiltersToCompanyFilterFields(list.filters ?? undefined);
      setDraftFilters(initial);
      setAppliedFilters(initial);
      setFiltersApplied(true);
    }
  }, [list, listId, router]);

  const { data: companiesData, isLoading: companiesLoading } = useQuery({
    queryKey: [
      'companies',
      'create-preview',
      listId,
      currentPage,
      sortColumn,
      sortDirection,
      appliedFilters,
    ],
    queryFn: async () => {
      const params: GetCompaniesParams = {
        search: appliedFilters?.name || '',
        page: currentPage,
        limit: ROWS_PER_PAGE,
        sortBy: sortColumn || '',
        sortOrder: sortDirection,
      };
      if (appliedFilters?.industry?.length) params.category = appliedFilters.industry;
      if (appliedFilters?.technographic?.length) params.technology = appliedFilters.technographic;
      if (appliedFilters?.country) params.country = appliedFilters.country;
      if (appliedFilters?.region) params.region = appliedFilters.region;
      if (appliedFilters?.companySize) {
        const [min, max] = appliedFilters.companySize;
        if (min != null && min > 0) params.min_employees = min;
        if (max != null && max > 0) params.max_employees = max;
      }
      return getCompanies(params);
    },
    enabled: !!listId && !!list && !list.is_static && filtersApplied,
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: { name: string; filters: CompanyFilterFields }) => {
      await updateList(listId!, {
        name: payload.name,
        filters: payload.filters as Record<string, unknown>,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['list', listId] });
      queryClient.invalidateQueries({ queryKey: ['list-companies', listId] });
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      toast.success('List saved successfully');
      setHasUnsavedChanges(false);
      router.push(paths.strategyForge.lists.details(listId!));
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to save list');
    },
  });

  const companies: CompanyItem[] = companiesData?.data ?? [];
  const totalPages = companiesData?.pagination?.totalPages ?? companiesData?.meta?.lastPage ?? 1;
  const totalCount = companiesData?.meta?.total ?? companiesData?.pagination?.total ?? 0;

  const isCompanyList = list?.subtype === ListSubtype.COMPANY;

  const handleDraftFiltersChange = useCallback((filters: CompanyFilterFields) => {
    setDraftFilters(filters);
    setHasUnsavedChanges(true);
  }, []);

  const handleApplyFilter = useCallback((filters: CompanyFilterFields) => {
    setAppliedFilters(filters);
    setCurrentPage(1);
    setFiltersApplied(true);
  }, []);

  const handleCloseFilter = useCallback(() => setIsFilterOpen(false), []);
  const handleToggleFilter = useCallback(() => setIsFilterOpen((prev) => !prev), []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleSave = useCallback(() => {
    if (!listId || !listName.trim()) return;
    const trimmed = listName.trim();
    if (trimmed.length < 3 || trimmed.length > 100) {
      toast.error('List name must be between 3 and 100 characters');
      return;
    }
    saveMutation.mutate({ name: trimmed, filters: draftFilters });
  }, [listId, listName, draftFilters, saveMutation]);

  const canSave = hasUnsavedChanges && listName.trim().length >= 3 && listName.trim().length <= 100;

  const handleCancel = useCallback(() => {
    if (hasUnsavedChanges) {
      setPendingNavigateTo(paths.strategyForge.lists.details(listId!));
      setShowUnsavedModal(true);
    } else {
      router.push(paths.strategyForge.lists.details(listId!));
    }
  }, [hasUnsavedChanges, listId, router]);

  const handleLeaveWithoutSaving = useCallback(() => {
    setShowUnsavedModal(false);
    setHasUnsavedChanges(false);
    if (pendingNavigateTo) {
      router.push(pendingNavigateTo);
      setPendingNavigateTo(null);
    }
  }, [pendingNavigateTo, router]);

  const handleStay = useCallback(() => {
    setShowUnsavedModal(false);
    setPendingNavigateTo(null);
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const originalFiltersRef = React.useRef<CompanyFilterFields>({});
  useEffect(() => {
    if (list) {
      originalFiltersRef.current = listFiltersToCompanyFilterFields(list.filters ?? undefined);
    }
  }, [list]);

  useEffect(() => {
    if (!list) return;
    const nameChanged = listName !== list.name;
    const filtersChanged =
      JSON.stringify(draftFilters) !== JSON.stringify(originalFiltersRef.current);
    setHasUnsavedChanges(nameChanged || filtersChanged);
  }, [list, listName, draftFilters]);

  if (listId === undefined || (listId !== undefined && !listId?.trim())) {
    return <Box />;
  }

  if (listLoading && !list) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '40vh',
        }}
      >
        <CircularProgress size='md' />
      </Box>
    );
  }

  if (listError || !list || !listId) {
    return (
      <Box sx={{ p: { xs: 2, sm: 'var(--Content-padding)' } }}>
        <Typography level='body-lg' sx={{ color: 'text.secondary', mb: 2 }}>
          List not found
        </Typography>
        <Button
          variant='outlined'
          startDecorator={<ArrowLeftIcon size={20} />}
          onClick={() => router.push(paths.strategyForge.lists.list)}
        >
          Back to lists
        </Button>
      </Box>
    );
  }

  if (!isCompanyList) {
    return (
      <Box sx={{ p: { xs: 2, sm: 'var(--Content-padding)' } }}>
        <Typography level='body-lg' sx={{ color: 'text.secondary', mb: 2 }}>
          Only company lists can be configured here.
        </Typography>
        <Button
          variant='outlined'
          startDecorator={<ArrowLeftIcon size={20} />}
          onClick={() => router.push(paths.strategyForge.lists.details(listId))}
        >
          Back to list
        </Button>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 3,
          borderBottom: '1px solid var(--joy-palette-divider)',
          backgroundColor: 'var(--joy-palette-background-surface)',
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent='space-between'
          alignItems={{ xs: 'stretch', sm: 'center' }}
          spacing={{ xs: 2, sm: 0 }}
        >
          <Stack spacing={1} sx={{ width: { xs: '100%', sm: '60%' } }}>
            <Input
              placeholder='List name'
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              sx={{
                '--Input-focusedThickness': '0px',
                border: 'none',
                background: 'transparent',
                padding: 0,
                fontSize: '2rem',
                fontWeight: 600,
                color: 'var(--joy-palette-text-primary)',
                '& input': { padding: 0 },
              }}
            />
            <Breadcrumbs separator={<BreadcrumbsSeparator />}>
              <BreadcrumbsItem href='/strategy-forge' type='start' />
              <BreadcrumbsItem href={paths.strategyForge.lists.list}>Lists</BreadcrumbsItem>
              <BreadcrumbsItem type='end'>{listName || 'Create list'}</BreadcrumbsItem>
            </Breadcrumbs>
          </Stack>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{ alignItems: { xs: 'stretch', sm: 'center' }, width: { xs: '100%', sm: 'auto' } }}
          >
            <Button
              variant='outlined'
              startDecorator={<FunnelIcon fontSize='var(--Icon-fontSize)' />}
              onClick={handleToggleFilter}
              data-filter-button
              sx={{
                borderColor: 'var(--joy-palette-divider)',
                borderRadius: '20px',
                background: 'var(--joy-palette-background-mainBg)',
                color: 'var(--joy-palette-text-primary)',
                padding: { xs: '6px 12px', sm: '7px 14px' },
                fontSize: { xs: '12px', sm: '14px' },
                width: { xs: '100%', sm: 'auto' },
              }}
            >
              Filter
            </Button>
            <Button
              variant='outlined'
              onClick={handleCancel}
              sx={{
                borderColor: 'var(--joy-palette-divider)',
                color: 'var(--joy-palette-text-primary)',
                width: { xs: '100%', sm: 'auto' },
                py: { xs: 1, sm: 0.75 },
              }}
            >
              Cancel
            </Button>
            <Button
              variant='solid'
              color='primary'
              onClick={handleSave}
              disabled={saveMutation.isPending || !canSave}
              sx={{ width: { xs: '100%', sm: 'auto' }, py: { xs: 1, sm: 0.75 } }}
            >
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </Stack>
        </Stack>
      </Box>

      {/* Main content: sidebar + table */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Filter sidebar */}
        <Box
          sx={{
            width: isFilterOpen ? 360 : 0,
            borderRight: '1px solid var(--joy-palette-divider)',
            backgroundColor: 'var(--joy-palette-background-surface)',
            transition: 'width 0.3s ease',
            overflow: 'hidden',
            display: { xs: 'none', sm: 'block' },
            pl: isFilterOpen ? 3 : 0,
          }}
        >
          {isFilterOpen && (
            <Box sx={{ height: '100%', overflow: 'hidden' }}>
              <CompanyFilter
                open={isFilterOpen}
                onClose={handleCloseFilter}
                onFilter={handleApplyFilter}
                initialFilters={draftFilters}
                onFiltersChange={handleDraftFiltersChange}
              />
            </Box>
          )}
        </Box>

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
            <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
              <CompanyFilter
                open={isFilterOpen}
                onClose={handleCloseFilter}
                onFilter={handleApplyFilter}
                initialFilters={draftFilters}
                onFiltersChange={handleDraftFiltersChange}
              />
            </Box>
          </>
        )}

        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {filtersApplied ? (
            <>
              <Box
                sx={{
                  flex: 1,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  p: 3,
                }}
              >
                <Typography
                  level='body-sm'
                  sx={{
                    color: 'var(--joy-palette-text-primary)',
                    fontSize: '18px',
                    fontWeight: 500,
                    mb: 1,
                  }}
                >
                  {totalCount} companies
                </Typography>
                <Box sx={{ flex: 1, overflow: 'auto' }}>
                  {companiesLoading ? (
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: '40vh',
                      }}
                    >
                      <CircularProgress size='md' />
                    </Box>
                  ) : (
                    <>
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
                            '&:hover': { backgroundColor: 'background.level1' },
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
                        }}
                      >
                        <thead>
                          <tr>
                            <th style={{ padding: '8px', textAlign: 'left', width: '300px' }}>
                              Name
                            </th>
                            <th style={{ padding: '8px', textAlign: 'left', width: '200px' }}>
                              Industry
                            </th>
                            <th style={{ padding: '8px', textAlign: 'left', width: '140px' }}>
                              Employees
                            </th>
                            <th style={{ padding: '8px', textAlign: 'left', width: '180px' }}>
                              Website
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {companies.length === 0 ? (
                            <tr>
                              <td colSpan={4} style={{ textAlign: 'center', padding: '20px' }}>
                                <Typography level='body-md' color='neutral'>
                                  No companies match selected filters
                                </Typography>
                              </td>
                            </tr>
                          ) : (
                            companies.map((company, index) => (
                              <tr key={company.id ?? index}>
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
                                          fontWeight: 500,
                                          fontSize: '12px',
                                        }}
                                      >
                                        {company.name?.charAt(0)?.toUpperCase() ?? '?'}
                                      </Box>
                                    )}
                                    <Typography
                                      level='body-sm'
                                      fontWeight='300'
                                      sx={{
                                        whiteSpace: 'wrap',
                                        wordBreak: 'break-word',
                                        color: 'var(--joy-palette-text-secondary)',
                                      }}
                                    >
                                      {company.name?.slice(0, 92) ?? 'Unknown'}
                                    </Typography>
                                  </Box>
                                </td>
                                <td style={{ padding: '8px' }}>
                                  <Typography
                                    level='body-sm'
                                    sx={{
                                      color: 'var(--joy-palette-text-secondary)',
                                      fontWeight: 300,
                                    }}
                                  >
                                    {company.categories?.[0]?.slice(0, 92) ?? 'N/A'}
                                  </Typography>
                                </td>
                                <td style={{ padding: '8px' }}>
                                  <Typography
                                    level='body-sm'
                                    sx={{
                                      color: 'var(--joy-palette-text-secondary)',
                                      fontWeight: 300,
                                    }}
                                  >
                                    {formatEmployees(company.employees)}
                                  </Typography>
                                </td>
                                <td style={{ padding: '8px' }}>
                                  {company.website || company.homepageUri ? (
                                    <Typography
                                      level='body-sm'
                                      component='a'
                                      href={
                                        (company.website || company.homepageUri)?.startsWith('http')
                                          ? ((company.website || company.homepageUri) ?? '')
                                          : `https://${company.website || company.homepageUri}`
                                      }
                                      target='_blank'
                                      rel='noopener noreferrer'
                                      sx={{
                                        color: 'var(--joy-palette-primary-500)',
                                        textDecoration: 'underline',
                                        fontWeight: 300,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        maxWidth: '150px',
                                        display: 'block',
                                      }}
                                    >
                                      {company.website || company.homepageUri}
                                    </Typography>
                                  ) : (
                                    <Typography
                                      level='body-sm'
                                      sx={{
                                        color: 'var(--joy-palette-text-secondary)',
                                        fontWeight: 300,
                                      }}
                                    >
                                      N/A
                                    </Typography>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </Table>
                      <Pagination
                        totalPages={totalPages}
                        currentPage={currentPage}
                        onPageChange={handlePageChange}
                        disabled={companies.length === 0}
                      />
                    </>
                  )}
                </Box>
              </Box>
            </>
          ) : (
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  p: 3,
                }}
              >
                <Typography
                  level='h4'
                  sx={{
                    color: 'var(--joy-palette-text-secondary)',
                    mb: 2,
                    fontWeight: 500,
                  }}
                >
                  Apply filters to see companies
                </Typography>
                <Typography
                  level='body-md'
                  sx={{
                    color: 'var(--joy-palette-text-tertiary)',
                    maxWidth: 400,
                    lineHeight: 1.6,
                    mb: 3,
                  }}
                >
                  Use the filters on the left to define which companies match this list. Click
                  &quot;Apply&quot; in the filter panel to load the results.
                </Typography>
                <Button
                  variant='outlined'
                  startDecorator={<FunnelIcon fontSize='var(--Icon-fontSize)' />}
                  onClick={handleToggleFilter}
                  data-filter-button
                  sx={{
                    borderColor: 'var(--joy-palette-divider)',
                    borderRadius: '20px',
                    background: 'var(--joy-palette-background-mainBg)',
                    color: 'var(--joy-palette-text-primary)',
                    padding: '7px 14px',
                    fontSize: '14px',
                  }}
                >
                  Open Filters
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      </Box>

      {/* Unsaved changes modal */}
      <Modal open={showUnsavedModal} onClose={handleStay}>
        <ModalDialog variant='outlined' role='alertdialog'>
          <ModalClose />
          <Typography level='title-md'>Unsaved changes</Typography>
          <Typography level='body-sm' sx={{ mt: 1 }}>
            You have unsaved changes. Leave without saving?
          </Typography>
          <Stack direction='row' spacing={2} sx={{ mt: 2, justifyContent: 'flex-end' }}>
            <Button variant='plain' color='neutral' onClick={handleStay}>
              Stay
            </Button>
            <Button variant='solid' color='danger' onClick={handleLeaveWithoutSaving}>
              Leave without saving
            </Button>
          </Stack>
        </ModalDialog>
      </Modal>
    </Box>
  );
}
