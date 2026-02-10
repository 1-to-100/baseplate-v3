'use client';

import React, { useState, useRef, useEffect } from 'react';
import Breadcrumbs from '@mui/joy/Breadcrumbs';
import { BreadcrumbsItem } from '@/components/core/breadcrumbs-item';
import { BreadcrumbsSeparator } from '@/components/core/breadcrumbs-separator';
import { paths } from '@/paths';
import Box from '@mui/joy/Box';
import Typography from '@mui/joy/Typography';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import CircularProgress from '@mui/joy/CircularProgress';
import { getSegmentById, getSegmentCompanies } from '../../../lib/api/segment-lists';
import {
  getCompanyWithScoring,
  getCompanyDiffbotJson,
  getCompanyPeople,
} from '../../../lib/api/company-segment';
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
} from '../../../ui/components/company-details';
import EditCompanyModal from '@/components/dashboard/modals/EditCompanyModal';
import { AddToListModal } from '../../../lib/components';
import { toast } from '@/components/core/toaster';
import type { CompanyItem } from '../../../lib/types/company';

interface PageProps {
  params: Promise<{
    segmentId: string;
    companyId: string;
  }>;
}

// Helper to transform Company to CompanyDetailsData
function toCompanyDetailsData(
  company: {
    company_id: string;
    display_name?: string | null;
    legal_name?: string | null;
    logo?: string | null;
    description?: string | null;
    website_url?: string | null;
    categories?: string[] | null;
    employees?: number | null;
    country?: string | null;
    region?: string | null;
    address?: string | null;
    email?: string | null;
    phone?: string | null;
  },
  scoring?: {
    revenue?: number | null;
    currency_code?: string | null;
    last_scoring_results?: Record<string, unknown> | null;
  } | null
): CompanyDetailsData {
  const scoringResults = scoring?.last_scoring_results as
    | {
        score?: number;
        short_description?: string;
        full_description?: string;
      }
    | undefined
    | null;

  return {
    id: company.company_id,
    name: company.display_name || company.legal_name || 'Unknown',
    logo: company.logo || undefined,
    description: company.description || undefined,
    website: company.website_url || undefined,
    categories: company.categories || undefined,
    employees: company.employees || undefined,
    country: company.country || undefined,
    region: company.region || undefined,
    address: company.address || undefined,
    email: company.email || undefined,
    phone: company.phone || undefined,
    revenue: scoring?.revenue || undefined,
    currencyCode: scoring?.currency_code || undefined,
    lastScoringResults: scoringResults
      ? {
          score: scoringResults.score || 0,
          shortDescription: scoringResults.short_description || '',
          fullDescription: scoringResults.full_description || undefined,
        }
      : null,
  };
}

// Helper to transform people data to SimplePerson
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
    companies: undefined,
  };
}

// Map segment company + scoring to CompanyItem for EditCompanyModal
function toCompanyItemForEdit(
  company: {
    company_id: string;
    display_name?: string | null;
    legal_name?: string | null;
    description?: string | null;
    website_url?: string | null;
    categories?: string[] | null;
    employees?: number | null;
    country?: string | null;
    region?: string | null;
    address?: string | null;
    email?: string | null;
    phone?: string | null;
    created_at?: string;
    updated_at?: string;
  },
  scoring?: { revenue?: number | null } | null
): CompanyItem {
  const numericId =
    parseInt(company.company_id?.replace(/-/g, '').substring(0, 10) || '0', 16) || 0;
  return {
    id: numericId,
    company_id: company.company_id,
    name: company.display_name || company.legal_name || 'Unknown',
    description: company.description || undefined,
    website: company.website_url || undefined,
    country: company.country || undefined,
    region: company.region || undefined,
    address: company.address || undefined,
    email: company.email || undefined,
    phone: company.phone || undefined,
    revenue: scoring?.revenue ?? undefined,
    employees: company.employees ?? undefined,
    categories: company.categories ?? undefined,
    created_at: company.created_at || new Date().toISOString(),
    updated_at: company.updated_at || new Date().toISOString(),
  };
}

export default function CompanyDetailsPage({ params }: PageProps): React.JSX.Element {
  const [segmentId, setSegmentId] = React.useState<string | null>(null);
  const [companyId, setCompanyId] = React.useState<string | null>(null);
  const [showLeadsTable, setShowLeadsTable] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [openPopover, setOpenPopover] = useState(false);
  const [popoverType, setPopoverType] = useState<'header' | 'table' | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isDebugModalOpen, setIsDebugModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [addToListModalOpen, setAddToListModalOpen] = useState(false);
  const popperRef = useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();

  // PeopleList table state
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [menuRowIndex, setMenuRowIndex] = useState<number | null>(null);
  const [openPersonPopoverIdx, setOpenPersonPopoverIdx] = useState<number | null>(null);
  const [personPopoverAnchorEl, setPersonPopoverAnchorEl] = useState<null | HTMLElement>(null);

  // Handle async params
  useEffect(() => {
    params.then((resolvedParams) => {
      setSegmentId(resolvedParams.segmentId);
      setCompanyId(resolvedParams.companyId);
    });
  }, [params]);

  // Fetch segment data
  const {
    data: segmentData,
    isLoading: segmentLoading,
    error: segmentError,
  } = useQuery({
    queryKey: ['segment', segmentId],
    queryFn: () => getSegmentById(segmentId!, { page: 1, perPage: 1 }),
    enabled: !!segmentId,
  });

  const segment = segmentData?.segment;

  // Fetch company data with scoring (verify it belongs to segment)
  const {
    data: companyData,
    isLoading: companyLoading,
    error: companyError,
  } = useQuery({
    queryKey: ['company', segmentId, companyId, 'with-scoring'],
    queryFn: () => getCompanyWithScoring(companyId!, segmentId!),
    enabled: !!companyId && !!segmentId,
  });

  // Fetch people data
  const {
    data: peopleResponse,
    isLoading: peopleLoading,
    error: peopleError,
  } = useQuery({
    queryKey: ['company-people', companyId, currentPage],
    queryFn: () =>
      getCompanyPeople(companyId!, {
        page: currentPage,
        perPage: 25,
      }),
    enabled: !!companyId,
  });

  // Diffbot JSON query for debug modal
  const {
    data: diffbotJson,
    isLoading: diffbotLoading,
    error: diffbotError,
  } = useQuery({
    queryKey: ['company-diffbot-json', companyId],
    queryFn: () => getCompanyDiffbotJson(companyId!),
    enabled: isDebugModalOpen && !!companyId,
  });

  // PeopleList handlers
  const handleRowCheckboxChange = (personId: string) => {
    setSelectedRows((prev) =>
      prev.includes(personId) ? prev.filter((id) => id !== personId) : [...prev, personId]
    );
  };

  const handleSelectAllChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!people || people.length === 0) return;
    if (event.target.checked) {
      const allIds = people.map((p) => String(p.id));
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

  const handleNavigation = (url: string) => {
    return true;
  };

  const handleEdit = (personId: string) => {
    toast.info(`Edit action for person ${personId} is not implemented here.`);
    handleMenuClose();
  };

  const handleDeletePerson = (personId: string) => {
    toast.info(`Delete action for person ${personId} is not implemented here.`);
    handleMenuClose();
  };

  const handleHeaderMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
    setOpenPopover(true);
    setPopoverType('header');
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setOpenPopover(false);
    setPopoverType(null);
    setMenuRowIndex(null);
  };

  const handleShowLeads = () => {
    setShowLeadsTable(true);
  };

  const handleBackToOverview = () => {
    setShowLeadsTable(false);
  };

  const handleEditClick = () => {
    setIsEditModalOpen(true);
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

  useEffect(() => {
    if (segmentError) {
      const err = segmentError as unknown as {
        response?: { data?: { message?: string } };
      } & { message?: string };
      const errorMessage =
        err?.response?.data?.message || err?.message || 'Failed to load segment.';
      toast.error(errorMessage);
    }
  }, [segmentError]);

  useEffect(() => {
    if (companyError) {
      const err = companyError as unknown as {
        response?: { data?: { message?: string } };
      } & { message?: string };
      const errorMessage =
        err?.response?.data?.message || err?.message || 'Failed to load company.';
      toast.error(errorMessage);
    }
  }, [companyError]);

  useEffect(() => {
    if (peopleError) {
      const err = peopleError as unknown as {
        response?: { data?: { message?: string } };
      } & { message?: string };
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to load people.';
      toast.error(errorMessage);
    }
  }, [peopleError]);

  if (segmentLoading || companyLoading) {
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

  if (!segmentData || !segment || !companyData) {
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

  const companyDetails = toCompanyDetailsData(companyData.company, companyData.scoring);
  const people = (peopleResponse?.data || []).map(toSimplePerson);
  const peopleTotal = peopleResponse?.meta?.total || 0;
  const peopleTotalPages = peopleResponse?.meta?.lastPage || 1;

  const breadcrumbs = (
    <Breadcrumbs separator={<BreadcrumbsSeparator />} sx={{ mb: 2 }}>
      <BreadcrumbsItem href={paths.dashboard.overview} type='start' />
      <BreadcrumbsItem href={paths.strategyForge.segments.list}>Segments</BreadcrumbsItem>
      <BreadcrumbsItem href={paths.strategyForge.segments.details(segmentId!)}>
        {segment.name}
      </BreadcrumbsItem>
      <BreadcrumbsItem type='end'>{companyDetails.name.slice(0, 80)}</BreadcrumbsItem>
    </Breadcrumbs>
  );

  return (
    <Box sx={{ p: { xs: 2, sm: 'var(--Content-padding)' } }}>
      {showLeadsTable ? (
        // Leads Table View
        <CompanyLeadsView
          company={companyDetails}
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
          onEditClick={handleEditClick}
          onMenuOpen={handleHeaderMenuOpen}
          onFilterClick={() => {}}
          showEditButton={true}
          showMenuButton={true}
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
        // Original Company Details View
        <>
          <CompanyDetailsHeader
            company={companyDetails}
            breadcrumbs={breadcrumbs}
            onEditClick={handleEditClick}
            onMenuOpen={handleHeaderMenuOpen}
            showEditButton={true}
            showMenuButton={true}
          />

          {/* Header Menu */}
          <CompanyHeaderMenu
            anchorEl={anchorEl}
            open={Boolean(anchorEl) && popoverType === 'header'}
            onClose={handleMenuClose}
            onAddToList={() => setAddToListModalOpen(true)}
            onExport={() => {}}
            showAddToList={true}
            showExport={true}
            popperRef={popperRef}
          />

          <Box
            sx={{
              maxWidth: 1440,
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
              {/* Left Column - Company Information */}
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
                  score={companyDetails.lastScoringResults?.score}
                  description={companyDetails.lastScoringResults?.shortDescription}
                  hasScore={!!companyDetails.lastScoringResults}
                />

                {/* Company Description */}
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
                  {companyDetails.description || 'N/A'}
                </Typography>

                <CompanyOverviewSection
                  company={companyDetails}
                  onDebugClick={() => setIsDebugModalOpen(true)}
                  showDebugButton={true}
                />

                <KeyContactsSection
                  people={people}
                  isLoading={peopleLoading}
                  onShowAllLeads={handleShowLeads}
                  showAllLeadsButton={true}
                />
              </Box>

              {/* Right Column - Empty for segments (no Lists section) */}
              <Box sx={{ width: { xs: '100%', lg: 320 }, flexShrink: 0 }} />
            </Box>
          </Box>
        </>
      )}

      {/* Edit Company Modal */}
      <EditCompanyModal
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        company={
          companyData ? toCompanyItemForEdit(companyData.company, companyData.scoring) : null
        }
        onSuccess={() => {
          queryClient.invalidateQueries({
            queryKey: ['company', segmentId, companyId, 'with-scoring'],
          });
        }}
      />

      {/* Diffbot JSON Modal */}
      <DebugJsonModal
        open={isDebugModalOpen}
        onClose={() => setIsDebugModalOpen(false)}
        title='Diffbot JSON'
        data={diffbotJson}
        isLoading={diffbotLoading}
        error={diffbotError as Error | null}
      />

      {/* Add to list modal */}
      <AddToListModal
        open={addToListModalOpen}
        onClose={() => setAddToListModalOpen(false)}
        companyIds={companyId ? [companyId] : []}
        companyCountLabel={companyDetails?.name}
      />
    </Box>
  );
}
