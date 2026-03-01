'use client';

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/joy/Box';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import Button from '@mui/joy/Button';
import IconButton from '@mui/joy/IconButton';
import Table from '@mui/joy/Table';
import Avatar from '@mui/joy/Avatar';
import CircularProgress from '@mui/joy/CircularProgress';
import Alert from '@mui/joy/Alert';
import Breadcrumbs from '@mui/joy/Breadcrumbs';
import Menu from '@mui/joy/Menu';
import MenuItem from '@mui/joy/MenuItem';
import ListItemDecorator from '@mui/joy/ListItemDecorator';
import ListItemContent from '@mui/joy/ListItemContent';
import { ArrowLeft as ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr/ArrowLeft';
import { ArrowsClockwise as ArrowsClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ArrowsClockwise';
import { DotsThreeVertical } from '@phosphor-icons/react/dist/ssr/DotsThreeVertical';
import { PencilSimple as PencilSimpleIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { Eye as EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { SelectionAll as SelectionAllIcon } from '@phosphor-icons/react/dist/ssr/SelectionAll';
import { getListById, getListCompanies } from '../../lib/api/segment-lists';
import { getCompanies, getCompanyById } from '../../lib/api/companies';
import type { GetCompaniesParams, CompanyItem } from '../../lib/types/company';
import { ListSubtype } from '../../lib/types/list';
import { hasListFilters, listFiltersToCompanyFilterFields } from '../../lib/utils/list-filters';
import { useGlobalSearch } from '@/hooks/use-global-search';
import { paths } from '@/paths';
import { BreadcrumbsItem } from '@/components/core/breadcrumbs-item';
import { BreadcrumbsSeparator } from '@/components/core/breadcrumbs-separator';
import Pagination from '@/components/dashboard/layout/pagination';
import { toast } from '@/components/core/toaster';
import { TypeListChip } from '../type-list-chip';
import CompanyDetailsPopover from '../../ui/components/company-details-popover';
import EditCompanyModal from '@/components/dashboard/modals/EditCompanyModal';
import { AddToListModal } from '../../lib/components';

const ITEMS_PER_PAGE = 10;

interface PageProps {
  params: Promise<{ listId: string }>;
}

function formatDateDisplay(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return 'N/A';
  }
}

/** Map getCompanies result to the same shape as getListCompanies for the table. */
function mapCompanyItemsToTableShape(items: CompanyItem[]): Array<{
  company_id: string;
  display_name: string | null;
  legal_name: string | null;
  logo: string | null;
  country: string | null;
  region: string | null;
  employees: number | null;
  website_url: string | null;
}> {
  return items.map((c) => ({
    company_id: c.company_id ?? String(c.id),
    display_name: c.name ?? null,
    legal_name: c.name ?? null,
    logo: c.logo ?? null,
    country: c.country ?? null,
    region: c.region ?? null,
    employees: c.employees ?? null,
    website_url: c.website ?? c.homepageUri ?? null,
  }));
}

type TableCompany = {
  company_id: string;
  display_name: string | null;
  legal_name: string | null;
  logo: string | null;
  country: string | null;
  region: string | null;
  employees: number | null;
  website_url: string | null;
};

export default function ListDetailsPage({ params }: PageProps): React.JSX.Element {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [listId, setListId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [menuRowIndex, setMenuRowIndex] = useState<number | null>(null);
  const [openCompanyPopoverIdx, setOpenCompanyPopoverIdx] = useState<number | null>(null);
  const [companyPopoverAnchorEl, setCompanyPopoverAnchorEl] = useState<HTMLElement | null>(null);
  const [addToListModalOpen, setAddToListModalOpen] = useState(false);
  const [addToListCompanyIds, setAddToListCompanyIds] = useState<string[]>([]);
  const [addToListLabel, setAddToListLabel] = useState<string | undefined>(undefined);
  const [editCompanyId, setEditCompanyId] = useState<string | null>(null);
  const { debouncedSearchValue } = useGlobalSearch();

  useEffect(() => {
    params.then((resolved) => setListId(resolved.listId));
  }, [params]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchValue]);

  const {
    data: list,
    isLoading: listLoading,
    error: listError,
    refetch: refetchList,
  } = useQuery({
    queryKey: ['list', listId],
    queryFn: () => getListById(listId!),
    enabled: !!listId,
  });

  const useFilterBasedSearch =
    list != null &&
    list.subtype === ListSubtype.COMPANY &&
    ((list.is_static && hasListFilters(list.filters ?? undefined)) || !list.is_static);

  const {
    data: companiesData,
    isLoading: companiesLoading,
    error: companiesError,
  } = useQuery({
    queryKey: [
      'list-companies',
      listId,
      currentPage,
      list?.is_static,
      useFilterBasedSearch ? list?.filters : null,
      debouncedSearchValue,
    ],
    queryFn: async () => {
      if (!list || !listId || list.subtype !== ListSubtype.COMPANY) {
        throw new Error('List required');
      }
      if (!list.is_static && !hasListFilters(list.filters ?? undefined)) {
        return {
          data: [],
          meta: {
            total: 0,
            lastPage: 1,
            currentPage: currentPage,
            perPage: ITEMS_PER_PAGE,
            prev: null,
            next: null,
          },
        };
      }
      if (useFilterBasedSearch) {
        const filterParams = listFiltersToCompanyFilterFields(list.filters ?? undefined);
        const params: GetCompaniesParams = {
          page: currentPage,
          limit: ITEMS_PER_PAGE,
          search: debouncedSearchValue?.trim() || filterParams.name || undefined,
          country: filterParams.country ?? undefined,
          region: filterParams.region ?? undefined,
          category: filterParams.industry,
          technology: filterParams.technographic,
        };
        if (filterParams.companySize?.length === 2) {
          const [min, max] = filterParams.companySize;
          if (min != null && min > 0) params.min_employees = min;
          if (max != null && max > 0) params.max_employees = max;
        }
        if (list.is_static) {
          params.listId = listId;
        }
        const res = await getCompanies(params);
        return {
          data: mapCompanyItemsToTableShape(res.data),
          meta: {
            total: res.meta?.total ?? 0,
            lastPage: res.meta?.lastPage ?? 1,
            currentPage: res.meta?.currentPage ?? currentPage,
            perPage: res.meta?.perPage ?? ITEMS_PER_PAGE,
            prev: res.pagination?.prev ?? null,
            next: res.pagination?.next ?? null,
          },
        };
      }
      return getListCompanies(
        listId,
        currentPage,
        ITEMS_PER_PAGE,
        debouncedSearchValue?.trim() || undefined
      );
    },
    enabled: !!listId && list != null && list.subtype === ListSubtype.COMPANY,
  });

  const { data: editCompany } = useQuery({
    queryKey: ['company-for-edit', editCompanyId],
    queryFn: () => getCompanyById(editCompanyId!),
    enabled: !!editCompanyId,
  });

  const companies = companiesData?.data ?? [];
  const meta = companiesData?.meta;
  const isLoading = listLoading || (list?.subtype === ListSubtype.COMPANY && companiesLoading);
  const error = listError || (list?.subtype === ListSubtype.COMPANY ? companiesError : null);

  const handleRefresh = async () => {
    try {
      await refetchList();
      await queryClient.invalidateQueries({ queryKey: ['list-companies', listId] });
      toast.success('List refreshed');
    } catch {
      toast.error('Failed to refresh list');
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, index: number) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
    setMenuRowIndex(index);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setMenuRowIndex(null);
  };

  // Close menu when clicking outside (Joy Menu sometimes doesn't fire onClose for outside clicks)
  useEffect(() => {
    if (!menuAnchorEl) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuAnchorEl.contains(target)) return;
      const menuEl = document.querySelector('[role="menu"]');
      if (menuEl && menuEl.contains(target)) return;
      setMenuAnchorEl(null);
      setMenuRowIndex(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuAnchorEl]);

  // Close company details popover when clicking outside (same pattern as companies page)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openCompanyPopoverIdx !== null) {
        const target = event.target as HTMLElement;
        const isClickOnPopoverOrMenu =
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
        const isClickOnModalOrListbox =
          target.closest('.MuiModal-root') ||
          target.closest('[role="dialog"]') ||
          target.closest('[role="listbox"]') ||
          target.closest('[role="option"]');

        if (!isClickOnPopoverOrMenu && !isClickOnModalOrListbox) {
          handleCloseCompanyPopover();
        }
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && openCompanyPopoverIdx !== null) {
        handleCloseCompanyPopover();
      }
    };

    if (openCompanyPopoverIdx !== null) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openCompanyPopoverIdx]);

  const handleQuickPreview = (index: number, event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setOpenCompanyPopoverIdx(index);
    setCompanyPopoverAnchorEl(menuAnchorEl);
    handleMenuClose();
  };

  const handleCloseCompanyPopover = () => {
    setOpenCompanyPopoverIdx(null);
    setCompanyPopoverAnchorEl(null);
  };

  const handleViewProfile = (company: TableCompany) => {
    router.push(paths.strategyForge.companies.details(company.company_id));
    handleMenuClose();
  };

  const handleEditCompany = (company: TableCompany) => {
    setEditCompanyId(company.company_id);
    handleMenuClose();
  };

  const handleAddToList = (company: TableCompany) => {
    setAddToListCompanyIds([company.company_id]);
    setAddToListLabel(company.display_name || company.legal_name || undefined);
    setAddToListModalOpen(true);
    handleMenuClose();
  };

  const handleEditCompanyModalClose = useCallback(() => {
    setEditCompanyId(null);
  }, []);

  const handleEditCompanySuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['list-companies', listId] });
  }, [queryClient, listId]);

  const handleAddToListModalClose = useCallback(() => {
    setAddToListModalOpen(false);
    setAddToListCompanyIds([]);
    setAddToListLabel(undefined);
  }, []);

  if (listLoading && !list) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          py: 4,
          top: '50%',
          position: 'absolute',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (listError || !list) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography level='body-lg' sx={{ color: 'text.secondary' }}>
          List not found
        </Typography>
        <Button
          variant='outlined'
          startDecorator={<ArrowLeftIcon size={20} />}
          onClick={() => router.push(paths.strategyForge.lists.list)}
          sx={{ mt: 2 }}
        >
          Back to lists
        </Button>
      </Box>
    );
  }

  const isCompanyList = list.subtype === ListSubtype.COMPANY;

  return (
    <Box sx={{ p: { xs: 2, sm: 'var(--Content-padding)' } }}>
      <Stack spacing={{ xs: 2, sm: 3 }} sx={{ mt: { xs: 0, sm: 0 } }}>
        {/* Header */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={{ xs: 2, sm: 3 }}
          sx={{ alignItems: { xs: 'stretch', sm: 'flex-start' } }}
        >
          <Stack spacing={1} sx={{ flex: '1 1 auto' }}>
            <Typography
              fontSize={{ xs: 'xl2', sm: 'xl3' }}
              level='h1'
              sx={{ wordBreak: 'break-word' }}
            >
              {list.name} <TypeListChip type={list.subtype} />
            </Typography>
            <Breadcrumbs separator={<BreadcrumbsSeparator />}>
              <BreadcrumbsItem href='/strategy-forge' type='start' />
              <BreadcrumbsItem href={paths.strategyForge.lists.list}>Lists</BreadcrumbsItem>
              <BreadcrumbsItem type='end'>{list.name}</BreadcrumbsItem>
            </Breadcrumbs>
          </Stack>
          <Stack
            direction={{ xs: 'row', sm: 'row' }}
            spacing={{ xs: 1, sm: 2 }}
            sx={{
              alignItems: { xs: 'center', sm: 'center' },
              width: { xs: 'auto', sm: 'auto' },
              flexShrink: 0,
              justifyContent: { xs: 'flex-end', sm: 'flex-end' },
            }}
          >
            <IconButton
              size='sm'
              sx={{
                bgcolor: 'var(--joy-palette-background-level2)',
                '&:hover': { bgcolor: 'var(--joy-palette-background-level3)' },
              }}
            >
              <DotsThreeVertical size={20} />
            </IconButton>
            <IconButton
              size='sm'
              onClick={handleRefresh}
              sx={{
                bgcolor: 'var(--joy-palette-background-level2)',
                '&:hover': { bgcolor: 'var(--joy-palette-background-level3)' },
              }}
            >
              <ArrowsClockwiseIcon size={18} />
            </IconButton>
            <Button
              size='sm'
              startDecorator={<PencilSimpleIcon size={16} />}
              onClick={() => router.push(paths.strategyForge.lists.edit(listId!))}
              sx={{
                bgcolor: 'var(--joy-palette-primary-600)',
                color: 'white',
                '&:hover': { bgcolor: 'var(--joy-palette-primary-700)' },
                width: { xs: 38, sm: 'auto' },
                height: { xs: 38, sm: 'auto' },
                minWidth: { xs: 38, sm: 'auto' },
                '& .MuiButton-startDecorator': { margin: { xs: 0, sm: '0 8px 0 0' } },
              }}
            >
              <Box component='span' sx={{ display: { xs: 'none', sm: 'inline' } }}>
                Edit
              </Box>
            </Button>
          </Stack>
        </Stack>

        {/* Main Content */}
        <Box
          sx={{
            width: '100%',
            mx: 'auto',
            borderTop: '1px solid var(--joy-palette-divider)',
            mt: { xs: 3, md: 0 },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              gap: 3,
              flexDirection: { xs: 'column', lg: 'row' },
            }}
          >
            {/* Left Column - Main Content */}
            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                borderRight: { xs: 'none', lg: '1px solid var(--joy-palette-divider)' },
                pr: { xs: 0, lg: 3 },
              }}
            >
              <Box sx={{ mb: 4, mt: 3 }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 3,
                  }}
                >
                  <Box>
                    <Typography
                      sx={{
                        fontSize: '18px',
                        fontWeight: '500',
                        color: 'var(--joy-palette-text-primary)',
                      }}
                    >
                      {isCompanyList ? 'Companies' : 'People'} on list{' '}
                      <span style={{ color: 'var(--joy-palette-primary-500)' }}>
                        {isCompanyList ? (meta?.total ?? 0) : 0}
                      </span>
                    </Typography>
                  </Box>
                </Box>

                {!isCompanyList ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography level='body-md' color='neutral'>
                      People lists are not yet supported. This list is configured for people.
                    </Typography>
                  </Box>
                ) : companiesLoading && companies.length === 0 ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : error && !companies.length ? (
                  <Alert color='danger' sx={{ mt: 2 }}>
                    <Typography level='body-sm'>
                      {error instanceof Error ? error.message : 'Failed to load companies'}
                    </Typography>
                  </Alert>
                ) : companies.length === 0 ? (
                  <>
                    <Box
                      sx={{
                        overflowX: 'auto',
                        width: '100%',
                        borderRadius: 'sm',
                        border: '1px solid var(--joy-palette-divider)',
                        WebkitOverflowScrolling: 'touch',
                        '&::-webkit-scrollbar': { height: 8 },
                        '&::-webkit-scrollbar-thumb': {
                          backgroundColor: 'var(--joy-palette-divider)',
                          borderRadius: 4,
                        },
                      }}
                    >
                      <Table
                        aria-label='Companies in list'
                        sx={{
                          width: '100%',
                          minWidth: 800,
                          '& th, & td': { px: { xs: 1, sm: 2 } },
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
                            <th style={{ width: 50 }} />
                            <th style={{ textAlign: 'left', width: '30%' }}>Company name</th>
                            <th style={{ textAlign: 'left', width: '20%' }}>Description</th>
                            <th style={{ textAlign: 'left', width: '15%' }}>Country</th>
                            <th style={{ textAlign: 'left', width: 100 }}>Employees</th>
                            <th style={{ textAlign: 'left', width: '20%' }}>Website</th>
                            <th style={{ width: 60 }} />
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                              <Typography level='body-md' sx={{ color: 'text.secondary' }}>
                                No items found
                              </Typography>
                            </td>
                          </tr>
                        </tbody>
                      </Table>
                    </Box>
                    <Pagination
                      totalPages={Math.max(1, meta?.lastPage ?? 1)}
                      currentPage={currentPage}
                      onPageChange={setCurrentPage}
                      disabled={companiesLoading}
                    />
                  </>
                ) : (
                  <>
                    <Box
                      sx={{
                        overflowX: 'auto',
                        width: '100%',
                        borderRadius: 'sm',
                        border: '1px solid var(--joy-palette-divider)',
                        WebkitOverflowScrolling: 'touch',
                        '&::-webkit-scrollbar': { height: 8 },
                        '&::-webkit-scrollbar-thumb': {
                          backgroundColor: 'var(--joy-palette-divider)',
                          borderRadius: 4,
                        },
                      }}
                    >
                      <Table
                        aria-label='Companies in list'
                        sx={{
                          width: '100%',
                          minWidth: 800,
                          '& th, & td': { px: { xs: 1, sm: 2 } },
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
                            <th style={{ width: 50 }} />
                            <th style={{ textAlign: 'left', width: '30%' }}>Company name</th>
                            <th style={{ textAlign: 'left', width: '20%' }}>Description</th>
                            <th style={{ textAlign: 'left', width: '15%' }}>Country</th>
                            <th style={{ textAlign: 'left', width: 100 }}>Employees</th>
                            <th style={{ textAlign: 'left', width: '20%' }}>Website</th>
                            <th style={{ width: 60 }} />
                          </tr>
                        </thead>
                        <tbody>
                          {companies.map((company, index) => (
                            <tr
                              key={company.company_id}
                              onClick={(e) => {
                                const target = e.target as HTMLElement;
                                if (
                                  target.closest('[data-menu-button]') ||
                                  target.closest('[data-menu-item]')
                                )
                                  return;
                                router.push(
                                  paths.strategyForge.companies.details(company.company_id)
                                );
                              }}
                              style={{ cursor: 'pointer' }}
                            >
                              <td>
                                <Avatar
                                  src={company.logo || undefined}
                                  alt={company.display_name || company.legal_name || 'Company'}
                                  sx={{ width: 32, height: 32 }}
                                >
                                  {(company.display_name || company.legal_name || 'C')
                                    .charAt(0)
                                    .toUpperCase()}
                                </Avatar>
                              </td>
                              <td>
                                <Typography
                                  sx={{
                                    fontWeight: 300,
                                    fontSize: 14,
                                    color: 'var(--joy-palette-text-secondary)',
                                  }}
                                >
                                  {company.display_name || company.legal_name || '—'}
                                </Typography>
                              </td>
                              <td>
                                <Typography sx={{ fontSize: 14, fontWeight: 300 }}>—</Typography>
                              </td>
                              <td>
                                <Typography sx={{ fontSize: 14, fontWeight: 300 }}>
                                  {company.country || company.region || '—'}
                                </Typography>
                              </td>
                              <td>
                                <Typography sx={{ fontSize: 14, fontWeight: 300 }}>
                                  {company.employees != null
                                    ? company.employees.toLocaleString()
                                    : '—'}
                                </Typography>
                              </td>
                              <td>
                                {company.website_url ? (
                                  <Typography
                                    component='span'
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const url =
                                        company.website_url!.startsWith('http') ||
                                        company.website_url!.startsWith('https')
                                          ? company.website_url!
                                          : `https://${company.website_url}`;
                                      window.open(url, '_blank');
                                    }}
                                    sx={{
                                      fontSize: 14,
                                      color: 'var(--joy-palette-primary-500)',
                                      textDecoration: 'underline',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    {company.website_url}
                                  </Typography>
                                ) : (
                                  '—'
                                )}
                              </td>
                              <td onClick={(e) => e.stopPropagation()} style={{ padding: '8px' }}>
                                <IconButton
                                  size='sm'
                                  variant='plain'
                                  color='neutral'
                                  data-menu-button
                                  onClick={(e) => handleMenuOpen(e, index)}
                                  sx={{ '--Icon-button-size': '32px' }}
                                >
                                  <DotsThreeVertical size={20} />
                                </IconButton>
                                <Menu
                                  anchorEl={menuAnchorEl}
                                  open={menuRowIndex === index && Boolean(menuAnchorEl)}
                                  onClose={handleMenuClose}
                                  placement='bottom-end'
                                  size='sm'
                                  sx={{ minWidth: 180 }}
                                >
                                  <MenuItem
                                    data-menu-item
                                    onClick={(e) =>
                                      handleQuickPreview(
                                        index,
                                        e as unknown as React.MouseEvent<HTMLElement>
                                      )
                                    }
                                  >
                                    <ListItemDecorator>
                                      <SelectionAllIcon />
                                    </ListItemDecorator>
                                    <ListItemContent>Quick preview</ListItemContent>
                                  </MenuItem>
                                  <MenuItem
                                    data-menu-item
                                    onClick={() => handleViewProfile(company)}
                                  >
                                    <ListItemDecorator>
                                      <EyeIcon />
                                    </ListItemDecorator>
                                    <ListItemContent>View profile</ListItemContent>
                                  </MenuItem>
                                  <MenuItem
                                    data-menu-item
                                    onClick={() => handleEditCompany(company)}
                                  >
                                    <ListItemDecorator>
                                      <PencilSimpleIcon />
                                    </ListItemDecorator>
                                    <ListItemContent>Edit</ListItemContent>
                                  </MenuItem>
                                  <MenuItem data-menu-item onClick={() => handleAddToList(company)}>
                                    <ListItemDecorator>
                                      <PlusIcon />
                                    </ListItemDecorator>
                                    <ListItemContent>Add to list</ListItemContent>
                                  </MenuItem>
                                </Menu>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </Box>
                    <Pagination
                      totalPages={Math.max(1, meta?.lastPage ?? 1)}
                      currentPage={currentPage}
                      onPageChange={setCurrentPage}
                      disabled={companiesLoading}
                    />
                  </>
                )}
              </Box>
            </Box>

            {/* Right: list details (Name, Date Created, Owner only) */}
            <Box sx={{ width: { xs: '100%', lg: 380 }, flexShrink: 0 }}>
              <Stack
                spacing={2}
                sx={{ mb: 3, mt: 3, pb: 3, borderBottom: '1px solid var(--joy-palette-divider)' }}
              >
                <Box
                  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Typography level='body-sm' color='neutral'>
                    Name
                  </Typography>
                  <Typography level='body-sm' sx={{ fontWeight: 400, textAlign: 'right' }}>
                    {list.name}
                  </Typography>
                </Box>
                <Box
                  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Typography level='body-sm' color='neutral'>
                    Date Created
                  </Typography>
                  <Typography level='body-sm' sx={{ fontWeight: 400 }}>
                    {formatDateDisplay(list.created_at)}
                  </Typography>
                </Box>
                <Box
                  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Typography level='body-sm' color='neutral'>
                    Owner
                  </Typography>
                  <Typography level='body-sm' sx={{ fontWeight: 400 }}>
                    {list.owner_name ?? '—'}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </Box>
        </Box>

        {/* Company details popover (Quick preview) */}
        {openCompanyPopoverIdx !== null && companies[openCompanyPopoverIdx] && (
          <CompanyDetailsPopover
            open={openCompanyPopoverIdx !== null}
            onClose={handleCloseCompanyPopover}
            anchorEl={companyPopoverAnchorEl}
            companyId={0}
            company_id={companies[openCompanyPopoverIdx].company_id}
            excludeListId={listId ?? undefined}
          />
        )}

        <EditCompanyModal
          open={!!editCompanyId}
          onClose={handleEditCompanyModalClose}
          company={editCompany ?? null}
          onSuccess={handleEditCompanySuccess}
        />

        <AddToListModal
          open={addToListModalOpen}
          onClose={handleAddToListModalClose}
          companyIds={addToListCompanyIds}
          excludeListId={listId ?? undefined}
        />
      </Stack>
    </Box>
  );
}
