'use client';

import React, { useState, useRef, useEffect, use } from 'react';
import dayjs from 'dayjs';
import Breadcrumbs from '@mui/joy/Breadcrumbs';
import { BreadcrumbsItem } from '@/components/core/breadcrumbs-item';
import { BreadcrumbsSeparator } from '@/components/core/breadcrumbs-separator';
import { paths } from '@/paths';
import Box from '@mui/joy/Box';
import Button from '@mui/joy/Button';
import Typography from '@mui/joy/Typography';
import Chip from '@mui/joy/Chip';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getCompanyWithScoring,
  getCompanyLists,
  buildCompanyItemFromScoring,
  getCompanyDiffbotJson,
  getCompanyPeople,
} from '../../lib/api/companies';
import { getCompanyNews, invokeFetchCompanyNews } from '../../lib/api/company-news';
import type { CompanyItem, CompanyItemList } from '../../lib/types/company';
import { toast } from '@/components/core/toaster';
import CircularProgress from '@mui/joy/CircularProgress';
import EditCompanyModal from '@/components/dashboard/modals/EditCompanyModal';
import AddCompanyToListModal from '@/components/dashboard/modals/AddCompanyToListModal';
import { Pagination } from '@/components/core/pagination';
import { useUserInfo } from '@/hooks/use-user-info';
import {
  CompanyDetailsHeader,
  FitScoreBox,
  CompanyOverviewSection,
  KeyContactsSection,
  CompanyLeadsView,
  DebugJsonModal,
  CompanyHeaderMenu,
  type CompanyDetailsData,
  type SimplePerson,
} from '@/components/dashboard/company-details';

/** Tab IDs for the Activity/News section */
const COMPANY_DETAIL_TAB = {
  ACTIVITY: 'activity',
  NEWS: 'news',
} as const;

type CompanyDetailTab = (typeof COMPANY_DETAIL_TAB)[keyof typeof COMPANY_DETAIL_TAB];

const COMPANY_DETAIL_TAB_LABEL: Record<CompanyDetailTab, string> = {
  [COMPANY_DETAIL_TAB.ACTIVITY]: 'Activity',
  [COMPANY_DETAIL_TAB.NEWS]: 'News',
};

interface PageProps {
  params: Promise<{ companyId: string }>;
}

function toCompanyDetailsData(company: CompanyItem): CompanyDetailsData {
  return {
    id: company.id,
    name: company.name,
    logo: company.logo,
    description: company.description,
    website: company.website,
    type: company.type,
    employees: company.employees,
    categories: company.categories,
    country: company.country,
    region: company.region,
    address: company.address,
    email: company.email,
    phone: company.phone,
    revenue: company.revenue,
    currencyCode: company.currency_code,
    lastScoringResults: company.last_scoring_results
      ? {
          score: company.last_scoring_results.score,
          shortDescription: company.last_scoring_results.short_description,
          fullDescription: company.last_scoring_results.full_description,
        }
      : null,
  };
}

function toSimplePerson(person: {
  id: number;
  name: string;
  titles?: string[];
  emails?: string[];
  phones?: string[];
  image?: string | null;
}): SimplePerson {
  return {
    id: person.id,
    name: person.name,
    titles: person.titles,
    emails: person.emails,
    phones: person.phones,
    image: person.image,
  };
}

export default function CompanyDetailsPage({ params }: PageProps): React.JSX.Element {
  const resolvedParams = use(params);
  const companyId = resolvedParams.companyId;
  const popperRef = useRef<HTMLDivElement | null>(null);

  const [showLeadsTable, setShowLeadsTable] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [popoverType, setPopoverType] = useState<'header' | 'table' | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddToListModalOpen, setIsAddToListModalOpen] = useState(false);
  const [isDebugModalOpen, setIsDebugModalOpen] = useState(false);

  const {
    data: company,
    isLoading: companyLoading,
    error: companyError,
  } = useQuery({
    queryKey: ['company', companyId],
    queryFn: async () => {
      const [scoringResult, lists] = await Promise.all([
        getCompanyWithScoring(companyId),
        getCompanyLists(companyId),
      ]);
      return buildCompanyItemFromScoring(scoringResult.company, scoringResult.scoring, lists);
    },
    enabled: !!companyId,
  });

  const { userInfo } = useUserInfo();
  const isSuperAdmin = userInfo?.isSuperadmin;
  const isCustomerSuccess = userInfo?.isCustomerSuccess;

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(25);
  const [newsPage, setNewsPage] = useState(1);
  const [detailTab, setDetailTab] = useState<CompanyDetailTab>(COMPANY_DETAIL_TAB.NEWS);

  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [menuRowIndex, setMenuRowIndex] = useState<number | null>(null);
  const [openPersonPopoverIdx, setOpenPersonPopoverIdx] = useState<number | null>(null);
  const [personPopoverAnchorEl, setPersonPopoverAnchorEl] = useState<null | HTMLElement>(null);

  const handleRowCheckboxChange = (personId: string) => {
    setSelectedRows((prev) =>
      prev.includes(personId) ? prev.filter((id) => id !== personId) : [...prev, personId]
    );
  };

  const handleSelectAllChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!people || people.length === 0) return;
    if (event.target.checked) {
      const allIds = people
        .map((p) => p.id)
        .filter((id) => id !== undefined && id !== null)
        .map(String);
      setSelectedRows(allIds);
    } else {
      setSelectedRows([]);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, index: number) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setMenuRowIndex(index);
  };

  const handleOpenPersonPopover = (idx: number, event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setOpenPersonPopoverIdx(idx);
    setPersonPopoverAnchorEl(event.currentTarget);
    setMenuRowIndex(null);
  };

  const handleClosePersonPopover = () => {
    setOpenPersonPopoverIdx(null);
    setPersonPopoverAnchorEl(null);
    setMenuRowIndex(null);
  };

  const handleNavigation = (_url: string) => true;

  const handleEdit = (personId: string) => {
    toast.info(`Edit action for person ${personId} is not implemented here.`);
    handleMenuClose();
  };

  const handleDeletePerson = (personId: string) => {
    toast.info(`Delete action for person ${personId} is not implemented here.`);
    handleMenuClose();
  };

  const { data: peopleResponse, isLoading: peopleLoading } = useQuery({
    queryKey: ['company-people', companyId, currentPage, rowsPerPage],
    queryFn: () =>
      getCompanyPeople(companyId, {
        page: currentPage,
        perPage: rowsPerPage,
      }),
    enabled: !!companyId,
  });

  const people = (peopleResponse?.data ?? []).map(toSimplePerson);
  const peopleTotal = peopleResponse?.meta?.total ?? 0;
  const peopleTotalPages = peopleResponse?.meta?.lastPage ?? 1;

  const {
    data: diffbotJson,
    isLoading: diffbotLoading,
    error: diffbotError,
  } = useQuery({
    queryKey: ['company-diffbot-json', companyId],
    queryFn: () => getCompanyDiffbotJson(companyId),
    enabled: isDebugModalOpen && !!companyId,
  });

  const queryClient = useQueryClient();

  // Fetch company news from DB (paginated, 5 per page)
  const { data: companyNewsResponse, isLoading: companyNewsLoading } = useQuery({
    queryKey: ['company-news', companyId, newsPage],
    queryFn: () =>
      getCompanyNews({
        company_id: companyId,
        page: newsPage,
        limit: 5,
      }),
    enabled: !!companyId,
  });
  const companyNews = companyNewsResponse?.data ?? [];
  const companyNewsMeta = companyNewsResponse?.meta;
  const companyNewsTotalPages = companyNewsMeta?.totalPages ?? 1;
  const companyNewsTotal = companyNewsMeta?.total ?? 0;

  const fetchNewsMutation = useMutation({
    mutationFn: () => invokeFetchCompanyNews([companyId]),
    onSuccess: (data) => {
      toast.success(`News fetch completed: ${data.articlesInserted} articles for this company.`);
      setNewsPage(1);
      queryClient.invalidateQueries({ queryKey: ['company-news', companyId] });
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to fetch company news');
    },
  });

  useEffect(() => {
    if (companyError) {
      const err = companyError as { response?: { data?: { message?: string } }; message?: string };
      const errorMessage =
        err?.response?.data?.message ?? err?.message ?? 'Failed to load company.';
      toast.error(errorMessage);
    }
  }, [companyError]);

  const handleHeaderMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
    setPopoverType('header');
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setPopoverType(null);
    setMenuRowIndex(null);
  };

  const handleShowLeads = () => {
    setShowLeadsTable(true);
  };

  const handleBackToOverview = () => {
    setShowLeadsTable(false);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        anchorEl &&
        !anchorEl.contains(event.target as Node) &&
        popperRef.current &&
        !popperRef.current.contains(event.target as Node)
      ) {
        handleMenuClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [anchorEl]);

  if (companyLoading) {
    return (
      <Box sx={{ p: { xs: 2, sm: 'var(--Content-padding)' } }}>
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
      </Box>
    );
  }

  if (!company) {
    return (
      <Box sx={{ p: { xs: 2, sm: 'var(--Content-padding)' } }}>
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography
            sx={{
              fontSize: '24px',
              fontWeight: '600',
              color: 'var(--joy-palette-text-primary)',
            }}
          >
            Company not found
          </Typography>
          <Typography
            sx={{
              fontSize: '14px',
              fontWeight: '300',
              color: 'var(--joy-palette-text-secondary)',
              mt: 1,
            }}
          >
            The company you&apos;re looking for doesn&apos;t exist or has been deleted.
          </Typography>
        </Box>
      </Box>
    );
  }

  const companyData = toCompanyDetailsData(company);

  const breadcrumbs = (
    <Breadcrumbs separator={<BreadcrumbsSeparator />} sx={{ mb: 2 }}>
      <BreadcrumbsItem href={paths.dashboard.overview} type='start' />
      <BreadcrumbsItem href={paths.strategyForge.companies.list}>Companies</BreadcrumbsItem>
      <BreadcrumbsItem type='end'>{company.name.slice(0, 80)}</BreadcrumbsItem>
    </Breadcrumbs>
  );

  return (
    <Box sx={{ p: { xs: 2, sm: 'var(--Content-padding)' } }}>
      {showLeadsTable ? (
        <CompanyLeadsView
          company={companyData}
          breadcrumbs={breadcrumbs}
          people={people}
          totalCount={peopleTotal}
          isLoading={peopleLoading}
          currentPage={currentPage}
          totalPages={peopleTotalPages}
          onPageChange={(page: number) => {
            setCurrentPage(page);
            setSelectedRows([]);
          }}
          onBackClick={handleBackToOverview}
          onEditClick={
            !isSuperAdmin && !isCustomerSuccess ? () => setIsEditModalOpen(true) : undefined
          }
          onMenuOpen={!isSuperAdmin && !isCustomerSuccess ? handleHeaderMenuOpen : undefined}
          onFilterClick={() => {}}
          showEditButton={!isSuperAdmin && !isCustomerSuccess}
          showMenuButton={!isSuperAdmin && !isCustomerSuccess}
          selectedRows={selectedRows}
          handleRowCheckboxChange={handleRowCheckboxChange}
          handleSelectAllChange={handleSelectAllChange}
          handleMenuOpen={handleMenuOpen}
          handleMenuClose={handleMenuClose}
          menuRowIndex={menuRowIndex}
          anchorEl={anchorEl}
          handleNavigation={handleNavigation}
          handleOpenPersonPopover={handleOpenPersonPopover}
          handleEdit={handleEdit}
          handleDeletePerson={handleDeletePerson}
          openPersonPopoverIdx={openPersonPopoverIdx}
          personPopoverAnchorEl={personPopoverAnchorEl}
          handleClosePersonPopover={handleClosePersonPopover}
        />
      ) : (
        <>
          <CompanyDetailsHeader
            company={companyData}
            breadcrumbs={breadcrumbs}
            onEditClick={
              !isSuperAdmin && !isCustomerSuccess ? () => setIsEditModalOpen(true) : undefined
            }
            onMenuOpen={!isSuperAdmin && !isCustomerSuccess ? handleHeaderMenuOpen : undefined}
            showEditButton={!isSuperAdmin && !isCustomerSuccess}
            showMenuButton={!isSuperAdmin && !isCustomerSuccess}
          />

          <CompanyHeaderMenu
            anchorEl={anchorEl}
            open={Boolean(anchorEl) && popoverType === 'header'}
            onClose={handleMenuClose}
            onAddToList={() => setIsAddToListModalOpen(true)}
            onExport={() => {}}
            showAddToList={!isSuperAdmin}
            showExport={!isSuperAdmin}
            popperRef={popperRef}
          />

          <Box
            sx={{
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
              <Box
                sx={{
                  flex: 1,
                  minWidth: 0,
                  borderRight: {
                    xs: 'none',
                    lg: '1px solid var(--joy-palette-divider)',
                  },
                  pr: { xs: 0, lg: 3 },
                }}
              >
                <FitScoreBox
                  score={companyData.lastScoringResults?.score}
                  description={companyData.lastScoringResults?.shortDescription}
                  hasScore={!!companyData.lastScoringResults}
                />

                <Typography
                  sx={{
                    fontSize: '14px',
                    fontWeight: '300',
                    lineHeight: 1.6,
                    color: 'var(--joy-palette-text-primary)',
                    mb: 3,
                    mt: 2,
                    borderBottom: '1px solid var(--joy-palette-divider)',
                    pb: 2,
                  }}
                >
                  {companyData.description ||
                    'This company shows strong alignment with high-growth product areas like cloud infrastructure, AI-powered productivity tools, and developer enablement – offering strategic partnership potential for enterprise-focused SaaS providers.'}
                </Typography>

                <CompanyOverviewSection
                  company={companyData}
                  onDebugClick={() => setIsDebugModalOpen(true)}
                  showDebugButton={true}
                />

                <Box sx={{ mb: 3 }}>
                  <Button
                    size='sm'
                    variant='soft'
                    color='neutral'
                    loading={fetchNewsMutation.isPending}
                    disabled={fetchNewsMutation.isPending}
                    onClick={() => fetchNewsMutation.mutate()}
                  >
                    Fetch news (test)
                  </Button>
                  <Typography
                    component='span'
                    sx={{ ml: 1.5, fontSize: '12px', color: 'var(--joy-palette-text-tertiary)' }}
                  >
                    Runs company-news-fetch for this company only
                  </Typography>
                </Box>

                <KeyContactsSection
                  people={people}
                  isLoading={peopleLoading}
                  onShowAllLeads={handleShowLeads}
                  showAllLeadsButton={true}
                />
              </Box>

              <Box sx={{ width: { xs: '100%', lg: 320 }, flexShrink: 0 }}>
                <Box sx={{ mb: 3, mt: 3 }}>
                  <Typography
                    sx={{
                      fontSize: '16px',
                      fontWeight: '400',
                      color: 'var(--joy-palette-text-secondary)',
                      mb: 2,
                    }}
                  >
                    Lists
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {company?.lists && company.lists.length > 0 ? (
                      company.lists.map((list: CompanyItemList) => (
                        <Chip
                          key={list.id}
                          size='sm'
                          variant='soft'
                          sx={{
                            bgcolor: 'var(--joy-palette-background-navActiveBg)',
                            color: 'var(--joy-palette-text-primary)',
                            fontWeight: '500',
                            fontSize: '12px',
                            whiteSpace: 'break-spaces',
                            wordBreak: 'break-all',
                            '& .MuiChip-label': {
                              padding: '4px !important',
                            },
                          }}
                        >
                          {list.name.slice(0, 92)}
                        </Chip>
                      ))
                    ) : (
                      <Typography
                        sx={{
                          fontSize: '14px',
                          color: 'var(--joy-palette-text-secondary)',
                          fontStyle: 'italic',
                        }}
                      >
                        No lists assigned
                      </Typography>
                    )}
                  </Box>
                </Box>

                <Box
                  sx={{
                    borderTop: '1px solid var(--joy-palette-divider)',
                    pt: 3,
                    mt: 3,
                  }}
                >
                  <Box
                    role='tablist'
                    aria-label='Activity or News'
                    sx={{
                      display: 'flex',
                      width: '100%',
                      alignItems: 'stretch',
                      borderRadius: '20px',
                      border: '1px solid var(--joy-palette-neutral-outlinedBorder)',
                      bgcolor: 'var(--joy-palette-background-surface)',
                      p: 0.25,
                      mb: 2,
                    }}
                  >
                    <Button
                      role='tab'
                      aria-selected={detailTab === COMPANY_DETAIL_TAB.ACTIVITY}
                      disabled
                      variant='plain'
                      size='sm'
                      sx={{
                        flex: 1,
                        borderRadius: '16px',
                        fontWeight: 500,
                        fontSize: '14px',
                        color: 'var(--joy-palette-text-tertiary)',
                        '&.Mui-disabled': {
                          opacity: 0.8,
                        },
                      }}
                    >
                      {COMPANY_DETAIL_TAB_LABEL[COMPANY_DETAIL_TAB.ACTIVITY]}
                    </Button>
                    <Button
                      role='tab'
                      aria-selected={detailTab === COMPANY_DETAIL_TAB.NEWS}
                      size='sm'
                      onClick={() => setDetailTab(COMPANY_DETAIL_TAB.NEWS)}
                      sx={{
                        flex: 1,
                        borderRadius: '16px',
                        fontWeight: 500,
                        fontSize: '14px',
                        ...(detailTab === COMPANY_DETAIL_TAB.NEWS && {
                          bgcolor: 'var(--joy-palette-neutral-100)',
                          '&:hover': {
                            bgcolor: 'var(--joy-palette-neutral-200)',
                          },
                        }),
                      }}
                    >
                      {COMPANY_DETAIL_TAB_LABEL[COMPANY_DETAIL_TAB.NEWS]}
                    </Button>
                  </Box>
                  {detailTab === COMPANY_DETAIL_TAB.NEWS && (
                    <>
                      {companyNewsLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                          <CircularProgress size='sm' />
                        </Box>
                      ) : companyNews.length === 0 ? (
                        <Typography
                          sx={{
                            fontSize: '14px',
                            color: 'var(--joy-palette-text-tertiary)',
                            fontStyle: 'italic',
                          }}
                        >
                          No news yet
                        </Typography>
                      ) : (
                        <>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {companyNews.map((item) => (
                              <Box
                                key={item.company_news_id}
                                component={item.url ? 'a' : 'div'}
                                href={item.url || undefined}
                                target={item.url ? '_blank' : undefined}
                                rel={item.url ? 'noopener noreferrer' : undefined}
                                sx={{
                                  textDecoration: 'none',
                                  color: 'inherit',
                                  cursor: item.url ? 'pointer' : 'default',
                                  '&:hover': item.url
                                    ? { color: 'var(--joy-palette-primary-600)' }
                                    : {},
                                }}
                              >
                                <Typography
                                  sx={{
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    color: 'var(--joy-palette-text-primary)',
                                    lineHeight: 1.4,
                                    whiteSpace: 'normal',
                                    wordBreak: 'break-word',
                                  }}
                                >
                                  {item.title}
                                </Typography>
                                <Typography
                                  sx={{
                                    fontSize: '12px',
                                    color: 'var(--joy-palette-text-tertiary)',
                                    mt: 0.5,
                                  }}
                                >
                                  {item.published_at
                                    ? dayjs(item.published_at).format('D MMM [at] h:mmA')
                                    : '—'}
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                          {companyNewsTotalPages > 1 && (
                            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                              <Pagination
                                size='sm'
                                count={companyNewsTotalPages}
                                page={newsPage}
                                onChange={(_, value) => value != null && setNewsPage(value)}
                                disabled={companyNewsLoading}
                                hideNextButton
                                hidePrevButton
                              />
                            </Box>
                          )}
                        </>
                      )}
                    </>
                  )}
                </Box>
              </Box>
            </Box>
          </Box>
        </>
      )}

      <EditCompanyModal
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        company={company}
      />

      <AddCompanyToListModal
        open={isAddToListModalOpen}
        onClose={() => setIsAddToListModalOpen(false)}
        companyIds={company ? [company.id] : []}
      />

      <DebugJsonModal
        open={isDebugModalOpen}
        onClose={() => setIsDebugModalOpen(false)}
        title='Diffbot JSON'
        data={diffbotJson}
        isLoading={diffbotLoading}
        error={diffbotError as Error | null}
      />
    </Box>
  );
}
