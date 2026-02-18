'use client';

import * as React from 'react';
import Box from '@mui/joy/Box';
import Stack from '@mui/joy/Stack';
import Button from '@mui/joy/Button';
import Input from '@mui/joy/Input';
import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';
import FormHelperText from '@mui/joy/FormHelperText';
import Autocomplete from '@mui/joy/Autocomplete';
import Typography from '@mui/joy/Typography';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { MapPin } from '@phosphor-icons/react/dist/ssr/MapPin';
import { Buildings } from '@phosphor-icons/react/dist/ssr/Buildings';
import { FunnelSimple } from '@phosphor-icons/react/dist/ssr/FunnelSimple';
import { Code } from '@phosphor-icons/react/dist/ssr/Code';
import { Users } from '@phosphor-icons/react/dist/ssr/Users';
import { CaretDown } from '@phosphor-icons/react/dist/ssr/CaretDown';
import { CaretUp } from '@phosphor-icons/react/dist/ssr/CaretUp';
import Switch from '@mui/joy/Switch';
import Tooltip from '@mui/joy/Tooltip';
import IconButton from '@mui/joy/IconButton';
import { Info } from '@phosphor-icons/react/dist/ssr/Info';
import { Check } from '@phosphor-icons/react/dist/ssr/Check';
import { X } from '@phosphor-icons/react/dist/ssr/X';
import { toast } from '@/components/core/toaster';
import {
  getIndustries,
  getCompanySizes,
  smartSearchIndustries,
  type SmartSearchIndustry,
} from '../../lib/api/options';
import { createSegment, editSegment, getSegmentById } from '../../lib/api/segment-lists';
import { searchByFilters } from '../../lib/api/search';
import { countries, usStates, canadianProvinces } from '../../lib/constants/locations';
import { technologies } from '../../lib/constants/technologies';
import { type List, type AiGeneratedSegment } from '../../lib/types/list';
import { AskAiSegment } from './ask-ai-segment';
import type { CompanyPreview } from '../../lib/types/search';
import type { OptionIndustry, OptionCompanySize } from '../../lib/types/segment-company';
import { BreadcrumbsItem } from '@/components/core/breadcrumbs-item';
import { BreadcrumbsSeparator } from '@/components/core/breadcrumbs-separator';
import Pagination from '@/components/dashboard/layout/pagination';
import { paths } from '@/paths';
import Breadcrumbs from '@mui/joy/Breadcrumbs';
import Table from '@mui/joy/Table';
import Avatar from '@mui/joy/Avatar';
import CircularProgress from '@mui/joy/CircularProgress';
import Chip from '@mui/joy/Chip';
import { useCallback } from 'react';
import { PersonaWarningBanner } from '@/components/dashboard/banners/persona-warning-banner';
import { useCreditBalance } from '@/lib/credits';

const DIFFBOT_COMPANIES_LIMIT = 5;
const MIN_CREDITS_FOR_PREVIEW = 5;

const EDIT_SEGMENT_COMPANIES_LIMIT = 10;

interface CreateSegmentFormProps {
  segmentId?: string;
  initialSegmentData?: List;
  onSuccess?: (segmentId: string) => void;
  onCancel?: () => void;
}

// Helper functions for mapping filter values to form state
function mapCompanySizeValuesToIds(values: string[], companySizes: OptionCompanySize[]): number[] {
  return values
    .map((value) => {
      const companySize = companySizes.find((cs) => cs.value === value);
      return companySize?.company_size_id;
    })
    .filter((id): id is number => id !== undefined);
}

function mapIndustryNamesToIds(names: string[], industries: OptionIndustry[]): number[] {
  return names
    .map((name) => {
      const industry = industries.find((ind) => ind.value === name);
      return industry?.industry_id;
    })
    .filter((id): id is number => id !== undefined);
}

function findCountryCodeByName(name: string): string | null {
  const country = countries.find((c) => c.name === name);
  return country?.code || null;
}

function findStateCodeByName(name: string, countryCode: string): string | null {
  if (countryCode === 'USA') {
    const state = usStates.find((s) => s.name === name);
    return state?.code || null;
  } else if (countryCode === 'CAN') {
    const province = canadianProvinces.find((p) => p.name === name);
    return province?.code || null;
  }
  return null;
}

export function CreateSegmentForm({
  segmentId,
  initialSegmentData,
  onSuccess,
  onCancel,
}: CreateSegmentFormProps): React.JSX.Element {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [segmentName, setSegmentName] = React.useState('');
  const [titleTouched, setTitleTouched] = React.useState(false);

  // Accordion states
  const [geoAccordionOpen, setGeoAccordionOpen] = React.useState(false);
  const [companySizeAccordionOpen, setCompanySizeAccordionOpen] = React.useState(false);
  const [industryAccordionOpen, setIndustryAccordionOpen] = React.useState(false);
  const [technographicsAccordionOpen, setTechnographicsAccordionOpen] = React.useState(false);
  const [personaAccordionOpen, setPersonaAccordionOpen] = React.useState(false);

  // Filter selections
  const [selectedCountry, setSelectedCountry] = React.useState<string | null>(null);
  const [selectedState, setSelectedState] = React.useState<string | null>(null);
  const [selectedCompanySizes, setSelectedCompanySizes] = React.useState<number[]>([]);
  const [selectedIndustries, setSelectedIndustries] = React.useState<number[]>([]);
  const [selectedTechnographics, setSelectedTechnographics] = React.useState<string[]>([]);
  const [selectedPersonas, setSelectedPersonas] = React.useState<number[]>([]);

  // Smart search state
  const [smartSearchEnabled, setSmartSearchEnabled] = React.useState(false);
  const [industrySearchQuery, setIndustrySearchQuery] = React.useState('');
  const [isSmartSearching, setIsSmartSearching] = React.useState(false);
  const [smartSearchResults, setSmartSearchResults] = React.useState<SmartSearchIndustry[]>([]);
  const [suggestedIndustries, setSuggestedIndustries] = React.useState<SmartSearchIndustry[]>([]);

  // Search/preview state
  const [isSearching, setIsSearching] = React.useState(false);
  const [companies, setCompanies] = React.useState<CompanyPreview[]>([]);
  const [totalCount, setTotalCount] = React.useState(0);
  const [currentPage, setCurrentPage] = React.useState(1);
  // Edit (update) segment form uses page size 10; create/preview uses DIFFBOT limit
  const perPage = segmentId ? EDIT_SEGMENT_COMPANIES_LIMIT : DIFFBOT_COMPANIES_LIMIT;
  const [hasSearched, setHasSearched] = React.useState(false);
  const [searchError, setSearchError] = React.useState<string | null>(null);
  const [formInitialized, setFormInitialized] = React.useState(false);
  const [personaWarningDismissed, setPersonaWarningDismissed] = React.useState(false);
  // Snapshot of filters at the time of last search (to detect filter changes)
  const [lastSearchFiltersSnapshot, setLastSearchFiltersSnapshot] = React.useState<string | null>(
    null
  );

  // Fetch options from database
  const { data: industries, isLoading: industriesLoading } = useQuery({
    queryKey: ['industries'],
    queryFn: getIndustries,
  });

  const { data: companySizes, isLoading: companySizesLoading } = useQuery({
    queryKey: ['companySizes'],
    queryFn: getCompanySizes,
  });

  const isEditMode = !!segmentId;
  // When showing segment companies (edit mode, no search), fetch the current page
  const segmentCompaniesPage = isEditMode && !hasSearched ? currentPage : 1;

  // Fetch segment data if segmentId is provided and initialSegmentData is not
  const { data: segmentData, isLoading: segmentLoading } = useQuery({
    queryKey: ['segment', segmentId, 'form', segmentCompaniesPage],
    queryFn: () => getSegmentById(segmentId!, { page: segmentCompaniesPage, perPage }),
    enabled: !!segmentId && !initialSegmentData,
  });

  const segment = initialSegmentData || segmentData?.segment;

  const { data: creditBalance } = useCreditBalance();
  const insufficientCredits =
    creditBalance != null && creditBalance.balance < MIN_CREDITS_FOR_PREVIEW;

  // Check if user has enough credits for the found companies (1 credit per company)
  const insufficientCreditsForCompanies =
    creditBalance != null && totalCount > 0 && creditBalance.balance < totalCount;

  // Compute current filters snapshot to detect changes
  const currentFiltersSnapshot = React.useMemo(
    () =>
      JSON.stringify({
        selectedCountry,
        selectedState,
        selectedIndustries: [...selectedIndustries].sort(),
        selectedCompanySizes: [...selectedCompanySizes].sort(),
        selectedTechnographics: [...selectedTechnographics].sort(),
        selectedPersonas: [...selectedPersonas].sort(),
      }),
    [
      selectedCountry,
      selectedState,
      selectedIndustries,
      selectedCompanySizes,
      selectedTechnographics,
      selectedPersonas,
    ]
  );

  // Filters have changed since the last search (user can try a new search)
  const filtersChangedSinceSearch =
    lastSearchFiltersSnapshot === null || currentFiltersSnapshot !== lastSearchFiltersSnapshot;

  // Determine which location options to show based on country
  const locationOptions = React.useMemo(() => {
    if (selectedCountry === 'USA') {
      return usStates;
    } else if (selectedCountry === 'CAN') {
      return canadianProvinces;
    }
    return [];
  }, [selectedCountry]);

  const showLocationDropdown = locationOptions.length > 0;

  // Populate form fields when segment data is available (edit mode)
  React.useEffect(() => {
    if (segment && industries && companySizes) {
      // Set segment name
      setSegmentName(segment.name || '');

      // Parse filters
      const filters = (segment.filters || {}) as {
        country?: string;
        location?: string;
        employees?: string | string[];
        categories?: string[];
        technographics?: string[];
        personas?: number[];
      };

      // Set country
      if (filters.country) {
        const countryCode = findCountryCodeByName(filters.country);
        setSelectedCountry(countryCode);
      }

      // Set state/province
      if (filters.location && filters.country) {
        const countryCode = findCountryCodeByName(filters.country);
        if (countryCode) {
          const stateCode = findStateCodeByName(filters.location, countryCode);
          setSelectedState(stateCode);
        }
      }

      // Set company sizes
      if (filters.employees) {
        const employeesArray = Array.isArray(filters.employees)
          ? filters.employees
          : [filters.employees];
        const companySizeIds = mapCompanySizeValuesToIds(employeesArray, companySizes);
        setSelectedCompanySizes(companySizeIds);
      }

      // Set industries
      if (filters.categories && filters.categories.length > 0) {
        const industryIds = mapIndustryNamesToIds(filters.categories, industries);
        setSelectedIndustries(industryIds);
      }

      // Set technographics
      if (filters.technographics && filters.technographics.length > 0) {
        setSelectedTechnographics(filters.technographics);
      }

      // Set personas
      if (filters.personas && filters.personas.length > 0) {
        setSelectedPersonas(filters.personas);
      }

      setFormInitialized(true);
    }
  }, [segment, industries, companySizes]);

  // Initialize companies from existing segment data in edit mode (any page)
  // This shows the existing companies until user applies new filters
  React.useEffect(() => {
    if (isEditMode && segmentData && !hasSearched) {
      const existingCompanies: CompanyPreview[] = (segmentData.companies || []).map((c) => ({
        id: c.company_id,
        diffbotId: c.company_id,
        name: c.display_name || c.legal_name || '',
        fullName: c.display_name || c.legal_name || undefined,
        logo: c.logo || undefined,
        image: c.logo || undefined,
        homepageUri: c.website_url || undefined,
        location: c.region ? { city: { name: c.region } } : undefined,
        nbEmployeesMin: c.employees || undefined,
        nbEmployeesMax: c.employees || undefined,
        categories: c.categories?.map((cat) => ({ name: cat })) || [],
      }));
      setCompanies(existingCompanies);
      setTotalCount(segmentData.meta?.total ?? 0);
    }
  }, [isEditMode, segmentData, hasSearched]);

  const isTitleValid = () => segmentName.trim().length >= 3 && segmentName.trim().length <= 100;

  const canSaveSegment = () => {
    return isTitleValid();
  };

  const canSave = () => {
    // In edit mode, allow saving if segment name is valid and either:
    // 1. User has searched and found companies, OR
    // 2. Existing companies are loaded from the segment
    const hasCompanies = companies.length > 0;

    if (isEditMode) {
      // In edit mode, can save if name is valid and has companies (from search or existing)
      return isTitleValid() && hasCompanies;
    }

    // In create mode, must have searched and found companies
    return isTitleValid() && hasSearched && hasCompanies;
  };

  const hasActiveFilters = () => {
    return (
      selectedCountry !== null ||
      selectedState !== null ||
      selectedCompanySizes.length > 0 ||
      selectedIndustries.length > 0 ||
      selectedTechnographics.length > 0
    );
  };

  const clearFilters = useCallback(() => {
    setSelectedCountry(null);
    setSelectedState(null);
    setSelectedCompanySizes([]);
    setSelectedIndustries([]);
    setSelectedTechnographics([]);
    setSelectedPersonas([]);
    setSuggestedIndustries([]);
    setSmartSearchEnabled(false);
    setIndustrySearchQuery('');
    setSmartSearchResults([]);
    setHasSearched(false);
    setSearchError(null);
    setCurrentPage(1);
    setTotalCount(0);
    setCompanies([]);
    setGeoAccordionOpen(false);
    setCompanySizeAccordionOpen(false);
    setIndustryAccordionOpen(false);
    setTechnographicsAccordionOpen(false);
    setPersonaAccordionOpen(false);
    setPersonaWarningDismissed(false);
    setLastSearchFiltersSnapshot(null);
  }, []);

  const lastPage = Math.max(1, Math.ceil(totalCount / perPage));
  const handlePageChange = useCallback(
    (page: number) => {
      if (hasSearched) {
        applyFilters(page);
      } else {
        setCurrentPage(page);
      }
    },
    [hasSearched]
  );

  const applyFilters = async (page: number = 1) => {
    if (!hasActiveFilters()) {
      toast.error('Please select at least one filter to search for companies');
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setCurrentPage(page);

    try {
      // Build filter object
      const country = selectedCountry
        ? countries.find((c) => c.code === selectedCountry)?.name
        : null;
      const location =
        selectedState && locationOptions.length > 0
          ? locationOptions.find((l) => l.code === selectedState)?.name
          : null;

      // Get industry names from IDs
      const categoryNames =
        industries && selectedIndustries.length > 0
          ? industries
              .filter((ind) => selectedIndustries.includes(ind.industry_id))
              .map((ind) => ind.value)
          : [];

      // Get company size range from IDs
      const companySizeRanges =
        companySizes && selectedCompanySizes.length > 0
          ? companySizes
              .filter((cs) => selectedCompanySizes.includes(cs.company_size_id))
              .map((cs) => cs.value)
          : [];

      // For now, use the first company size range
      // TODO: Handle multiple company size ranges properly
      const employees = companySizeRanges.length > 0 ? companySizeRanges[0] : null;

      const response = await searchByFilters(
        {
          country,
          location,
          employees,
          categories: categoryNames,
          technographics: selectedTechnographics,
          personas: selectedPersonas,
        },
        {
          page,
          perPage,
        }
      );

      setCompanies(response.data);
      setTotalCount(response.totalCount);
      setHasSearched(true);
      // Save the filters snapshot to detect future changes
      setLastSearchFiltersSnapshot(
        JSON.stringify({
          selectedCountry,
          selectedState,
          selectedIndustries: [...selectedIndustries].sort(),
          selectedCompanySizes: [...selectedCompanySizes].sort(),
          selectedTechnographics: [...selectedTechnographics].sort(),
          selectedPersonas: [...selectedPersonas].sort(),
        })
      );

      if (response.data.length === 0) {
        toast.info('No companies found matching your filters. Try broadening your criteria.');
      } else {
        toast.success(`Found ${response.totalCount} companies`);
      }
    } catch (error) {
      console.error('Search error:', error);

      // Check if it's a "no results" error
      const isNoResults =
        error instanceof Error && (error as Error & { isNoResults?: boolean }).isNoResults;

      if (isNoResults) {
        // For "no results" errors, show a friendly info message
        const message =
          error instanceof Error
            ? error.message
            : 'No companies found matching your filters. Try broadening your criteria.';
        setSearchError(null); // Don't show as error state
        setHasSearched(true);
        setCompanies([]);
        setTotalCount(0);
        toast.info(message, { duration: 5000 });
      } else {
        // For actual errors (network, auth, etc.), show error
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to search for companies';
        setSearchError(errorMessage);
        toast.error(errorMessage);
        setCompanies([]);
        setTotalCount(0);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleSaveSegment = async () => {
    if (!canSave()) {
      if (segmentName.trim().length < 3) {
        toast.error('Please enter a segment name (at least 3 characters)');
      } else if (!hasSearched || companies.length === 0) {
        toast.error(
          'Please apply filters and ensure companies are found before saving the segment'
        );
      }
      return;
    }

    setIsSaving(true);

    try {
      // Build filter object for API call
      const country = selectedCountry
        ? countries.find((c) => c.code === selectedCountry)?.name
        : undefined;
      const location =
        selectedState && locationOptions.length > 0
          ? locationOptions.find((l) => l.code === selectedState)?.name
          : undefined;

      // Get industry names from IDs
      const categoryNames =
        industries && selectedIndustries.length > 0
          ? industries
              .filter((ind) => selectedIndustries.includes(ind.industry_id))
              .map((ind) => ind.value)
          : [];

      // Get company size range from IDs
      const companySizeRanges =
        companySizes && selectedCompanySizes.length > 0
          ? companySizes
              .filter((cs) => selectedCompanySizes.includes(cs.company_size_id))
              .map((cs) => cs.value)
          : [];

      const filters = {
        country,
        location,
        categories: categoryNames,
        employees: companySizeRanges,
        technographics: selectedTechnographics,
        personas: selectedPersonas,
      };

      if (isEditMode && segmentId) {
        // Edit existing segment
        await editSegment(segmentId, {
          name: segmentName,
          filters,
        });

        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['segment', segmentId] });
        queryClient.invalidateQueries({ queryKey: ['segment', segmentId, 'edit'] });
        queryClient.invalidateQueries({ queryKey: ['segment', segmentId, 'form'] });
        queryClient.invalidateQueries({ queryKey: ['segments'] });

        toast.success('Segment updated successfully.');
        router.push(paths.strategyForge.segments.details(segmentId));
      } else {
        // Create new segment
        await createSegment({
          name: segmentName,
          filters,
        });

        // Invalidate segments query to refresh the list
        queryClient.invalidateQueries({ queryKey: ['segments'] });

        toast.success('Segment created! Processing companies in background...');
        router.push(paths.strategyForge.segments.list);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : isEditMode
            ? 'Failed to update segment'
            : 'Failed to create segment';
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.push(paths.strategyForge.segments.list);
    }
  };

  // Handle AI-generated segment - populate form fields from AI response
  const handleAiSegmentGenerated = useCallback(
    (aiSegment: AiGeneratedSegment) => {
      // Set the segment name
      if (aiSegment.name) {
        setSegmentName(aiSegment.name);
      }

      const { filters } = aiSegment;
      if (!filters) return;

      // Map country name to country code
      if (filters.country) {
        const countryCode = findCountryCodeByName(filters.country);
        if (countryCode) {
          setSelectedCountry(countryCode);
          setGeoAccordionOpen(true);

          // Map location/state if provided
          if (filters.location && countryCode) {
            const stateCode = findStateCodeByName(filters.location, countryCode);
            if (stateCode) {
              setSelectedState(stateCode);
            }
          }
        }
      }

      // Map company sizes (employees)
      if (filters.employees && filters.employees.length > 0 && companySizes) {
        const companySizeIds = mapCompanySizeValuesToIds(filters.employees, companySizes);
        if (companySizeIds.length > 0) {
          setSelectedCompanySizes(companySizeIds);
          setCompanySizeAccordionOpen(true);
        }
      }

      // Map industries (categories)
      if (filters.categories && filters.categories.length > 0 && industries) {
        const industryIds = mapIndustryNamesToIds(filters.categories, industries);
        if (industryIds.length > 0) {
          setSelectedIndustries(industryIds);
          setIndustryAccordionOpen(true);
        }
      }

      // Set technographics directly
      if (filters.technographics && filters.technographics.length > 0) {
        setSelectedTechnographics(filters.technographics);
        setTechnographicsAccordionOpen(true);
      }

      // Reset search state since filters changed
      setHasSearched(false);
      setCompanies([]);
      setTotalCount(0);
      setSearchError(null);
    },
    [countries, companySizes, industries, locationOptions]
  );

  // Handle smart search for industries
  const handleSmartSearch = useCallback(async () => {
    if (!industrySearchQuery.trim() || !industries) return;

    setIsSmartSearching(true);
    try {
      const results = await smartSearchIndustries(industrySearchQuery.trim());
      setSmartSearchResults(results);

      if (results.length > 0) {
        // Auto-select first 3 industries
        const top3 = results.slice(0, 3);
        const top3Ids = top3
          .map((r) => industries.find((ind) => ind.value === r.value)?.industry_id)
          .filter((id): id is number => id !== undefined);
        setSelectedIndustries((prev) => {
          // Add new ones without duplicates
          const newIds = top3Ids.filter((id) => !prev.includes(id));
          return [...prev, ...newIds];
        });

        // Put the rest as suggestions
        const rest = results.slice(3);
        setSuggestedIndustries(rest);
      }
    } catch (error) {
      console.error('Smart search failed:', error);
      toast.error('Smart search failed. Please try again.');
    } finally {
      setIsSmartSearching(false);
    }
  }, [industrySearchQuery, industries]);

  // Reset smart search when disabled
  React.useEffect(() => {
    if (!smartSearchEnabled) {
      setIndustrySearchQuery('');
      setSmartSearchResults([]);
      setSuggestedIndustries([]);
    }
  }, [smartSearchEnabled]);

  // Handle adding a suggested industry
  const handleAddSuggestedIndustry = useCallback(
    (industryValue: string) => {
      if (!industries) return;
      const industry = industries.find((ind) => ind.value === industryValue);
      if (industry && !selectedIndustries.includes(industry.industry_id)) {
        setSelectedIndustries((prev) => [...prev, industry.industry_id]);
        // Remove from suggestions
        setSuggestedIndustries((prev) => prev.filter((s) => s.value !== industryValue));
      }
    },
    [industries, selectedIndustries]
  );

  // Filters Panel (Left Side) — fixed height so it scrolls internally; page can scroll
  const filtersPanel = (
    <Box
      sx={{
        width: { xs: '100%', sm: 320 },
        flexShrink: 0,
        bgcolor: 'var(--Content-background)',
        borderRight: { xs: 'none', sm: '1px solid var(--joy-palette-divider)' },
        display: 'flex',
        flexDirection: 'column',
        minHeight: { xs: 'auto', sm: '64vh' },
        maxHeight: { xs: '100vh', sm: '64vh' },
        overflow: 'hidden',
      }}
    >
      <Box sx={{ p: 2, pl: 0 }}>
        <Typography
          fontWeight={600}
          fontSize={16}
          mb={0.5}
          sx={{
            color: 'var(--joy-palette-text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <FunnelSimple size={20} color='var(--joy-palette-text-primary)' /> Smart filters
        </Typography>
        <Typography
          fontSize={12}
          sx={{
            color: 'var(--joy-palette-text-secondary)',
            lineHeight: 1.5,
            fontWeight: 400,
          }}
        >
          Define reusable, dynamic conditions to build segments that update automatically as your
          data changes.
        </Typography>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        {/* Countries Accordion */}
        <Box sx={{ borderTop: '1px solid var(--joy-palette-divider)' }}>
          <Box
            onClick={() => setGeoAccordionOpen(!geoAccordionOpen)}
            sx={{
              py: 2,
              px: 2,
              minHeight: 48,
              pl: 0,
              borderBottom: !geoAccordionOpen ? '1px solid var(--joy-palette-divider)' : 'none',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <MapPin
                  size={20}
                  color={
                    selectedCountry || selectedState
                      ? 'var(--joy-palette-primary-500)'
                      : 'var(--joy-palette-text-primary)'
                  }
                />
                <Typography
                  fontWeight={500}
                  fontSize={14}
                  sx={{
                    color:
                      selectedCountry || selectedState
                        ? 'var(--joy-palette-primary-500)'
                        : 'var(--joy-palette-text-primary)',
                  }}
                >
                  Countries
                </Typography>
              </Box>
              {/* Selected country/state chips when accordion is closed */}
              {!geoAccordionOpen && (selectedCountry || selectedState) && (
                <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                  {/* Show country chip if country selected and no state selected for USA/CAN */}
                  {selectedCountry &&
                    !(
                      selectedState &&
                      (selectedCountry === 'USA' || selectedCountry === 'CAN')
                    ) && (
                      <Tooltip
                        title='Includes all states unless you specify particular states'
                        placement='top'
                        sx={{
                          background: '#DAD8FD',
                          color: '#3D37DD',
                          maxWidth: 200,
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            bgcolor: 'var(--joy-palette-background-level2)',
                            borderRadius: 20,
                            px: 1.5,
                            py: 0.5,
                            fontSize: 12,
                            height: 22,
                            gap: 0.5,
                          }}
                        >
                          <Typography sx={{ fontSize: 12 }}>
                            {countries.find((c) => c.code === selectedCountry)?.name}
                          </Typography>
                        </Box>
                      </Tooltip>
                    )}
                  {/* Show state/province chip if state selected */}
                  {selectedCountry && selectedState && locationOptions.length > 0 && (
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        bgcolor: 'var(--joy-palette-background-level2)',
                        borderRadius: 20,
                        px: 1.5,
                        py: 0.5,
                        fontSize: 12,
                        height: 22,
                        gap: 0.5,
                      }}
                    >
                      <Typography sx={{ fontSize: 12 }}>
                        {locationOptions.find((s) => s.code === selectedState)?.name}
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}
            </Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                mt: !geoAccordionOpen && (selectedCountry || selectedState) ? 0 : 0,
              }}
            >
              {/* Clear all button when accordion is closed and selections exist */}
              {!geoAccordionOpen && (selectedCountry || selectedState) && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    bgcolor: 'var(--joy-palette-background-level2)',
                    borderRadius: '999px',
                    px: 1,
                    py: 0.25,
                    height: 28,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCountry(null);
                    setSelectedState(null);
                  }}
                >
                  <Typography
                    fontWeight={500}
                    fontSize={12}
                    sx={{ color: 'var(--joy-palette-text-primary)' }}
                  >
                    {Number(
                      !!selectedCountry &&
                        !(selectedState && (selectedCountry === 'USA' || selectedCountry === 'CAN'))
                    ) + Number(!!selectedState)}
                  </Typography>
                  <Box sx={{ ml: 0.5, display: 'flex', alignItems: 'center' }}>
                    <X size={14} color='var(--joy-palette-text-primary)' />
                  </Box>
                </Box>
              )}
              {geoAccordionOpen ? <CaretUp size={16} /> : <CaretDown size={16} />}
            </Box>
          </Box>
          {geoAccordionOpen && (
            <Box sx={{ pl: 0, pr: 2, borderBottom: '1px solid var(--joy-palette-divider)' }}>
              <Autocomplete
                placeholder='Country'
                options={countries}
                getOptionLabel={(option) => option.name}
                value={countries.find((c) => c.code === selectedCountry) || null}
                onChange={(_, value) => {
                  setSelectedCountry(value?.code || null);
                  if (!value) setSelectedState(null);
                }}
                sx={{ mb: 2, width: '100%', fontSize: 14 }}
                slotProps={{
                  listbox: { sx: { fontSize: 14 } },
                  option: { sx: { fontSize: 14 } },
                }}
                isOptionEqualToValue={(option, value) => option.code === value.code}
              />
              {selectedCountry && showLocationDropdown && (
                <Autocomplete
                  placeholder={selectedCountry === 'CAN' ? 'Province' : 'State'}
                  options={locationOptions}
                  getOptionLabel={(option) => option.name}
                  value={locationOptions.find((l) => l.code === selectedState) || null}
                  onChange={(_, value) => setSelectedState(value?.code || null)}
                  sx={{ mb: 2, width: '100%', fontSize: 14 }}
                  slotProps={{
                    listbox: { sx: { fontSize: 14 } },
                    option: { sx: { fontSize: 14 } },
                  }}
                  isOptionEqualToValue={(option, value) => option.code === value.code}
                />
              )}
              {/* Selected country/state chips inside accordion */}
              <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                {/* Country chip - show if country selected and no state selected for USA/CAN */}
                {selectedCountry &&
                  !(selectedState && (selectedCountry === 'USA' || selectedCountry === 'CAN')) && (
                    <Tooltip
                      title='Includes all states unless you specify particular states'
                      placement='top'
                      sx={{
                        background: '#DAD8FD',
                        color: '#3D37DD',
                        maxWidth: 200,
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          bgcolor: 'var(--joy-palette-background-level2)',
                          borderRadius: 20,
                          px: 1.5,
                          py: 0.5,
                          fontSize: 12,
                          height: 22,
                          gap: 0.5,
                          cursor: 'pointer',
                        }}
                      >
                        <Typography sx={{ fontSize: 12 }}>
                          {countries.find((c) => c.code === selectedCountry)?.name}
                        </Typography>
                        <Box
                          sx={{
                            fontSize: 12,
                            p: 0,
                            height: 16,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          onClick={() => {
                            setSelectedCountry(null);
                            setSelectedState(null);
                          }}
                        >
                          <X size={14} />
                        </Box>
                      </Box>
                    </Tooltip>
                  )}
                {/* State/province chip */}
                {selectedCountry && selectedState && locationOptions.length > 0 && (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      bgcolor: 'var(--joy-palette-background-level2)',
                      borderRadius: 20,
                      px: 1.5,
                      py: 0.5,
                      fontSize: 12,
                      height: 22,
                      gap: 0.5,
                    }}
                  >
                    <Typography sx={{ fontSize: 12 }}>
                      {locationOptions.find((s) => s.code === selectedState)?.name}
                    </Typography>
                    <Box
                      sx={{
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onClick={() => setSelectedState(null)}
                    >
                      <X size={14} />
                    </Box>
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </Box>

        {/* Company Size Accordion */}
        <Box sx={{ borderTop: '1px solid transparent' }}>
          <Box
            onClick={() => setCompanySizeAccordionOpen(!companySizeAccordionOpen)}
            sx={{
              py: 2,
              px: 2,
              minHeight: 48,
              pl: 0,
              borderBottom: !companySizeAccordionOpen
                ? '1px solid var(--joy-palette-divider)'
                : 'none',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Buildings
                  size={20}
                  color={
                    selectedCompanySizes.length > 0
                      ? 'var(--joy-palette-primary-500)'
                      : 'var(--joy-palette-text-primary)'
                  }
                />
                <Typography
                  fontWeight={500}
                  fontSize={14}
                  sx={{
                    color:
                      selectedCompanySizes.length > 0
                        ? 'var(--joy-palette-primary-500)'
                        : 'var(--joy-palette-text-primary)',
                  }}
                >
                  Company Size
                </Typography>
              </Box>
              {/* Selected company size chips when accordion is closed */}
              {!companySizeAccordionOpen && selectedCompanySizes.length > 0 && companySizes && (
                <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                  {selectedCompanySizes.map((id) => {
                    const cs = companySizes.find((c) => c.company_size_id === id);
                    if (!cs) return null;
                    return (
                      <Box
                        key={id}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          bgcolor: 'var(--joy-palette-background-level2)',
                          borderRadius: 20,
                          px: 1.5,
                          py: 0.5,
                          fontSize: 12,
                          height: 22,
                          gap: 0.5,
                        }}
                      >
                        <Typography sx={{ fontSize: 12 }}>{cs.value}</Typography>
                      </Box>
                    );
                  })}
                </Box>
              )}
            </Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                mt: !companySizeAccordionOpen && selectedCompanySizes.length > 0 ? 0 : 0,
              }}
            >
              {/* Count badge when accordion is closed and selections exist */}
              {!companySizeAccordionOpen && selectedCompanySizes.length > 0 && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    bgcolor: 'var(--joy-palette-background-level2)',
                    borderRadius: '999px',
                    px: 1,
                    py: 0.25,
                    height: 28,
                    cursor: 'pointer',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCompanySizes([]);
                  }}
                >
                  <Typography
                    fontWeight={500}
                    fontSize={12}
                    sx={{ color: 'var(--joy-palette-text-primary)' }}
                  >
                    {selectedCompanySizes.length}
                  </Typography>
                  <Box sx={{ ml: 0.5, display: 'flex', alignItems: 'center' }}>
                    <X size={14} color='var(--joy-palette-text-primary)' />
                  </Box>
                </Box>
              )}
              {companySizeAccordionOpen ? <CaretUp size={16} /> : <CaretDown size={16} />}
            </Box>
          </Box>
          {companySizeAccordionOpen && (
            <Box sx={{ p: 2, pl: 0, borderBottom: '1px solid var(--joy-palette-divider)' }}>
              {/* Selected company size chips on top of input */}
              {selectedCompanySizes.length > 0 && companySizes && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                  {selectedCompanySizes.map((id) => {
                    const cs = companySizes.find((c) => c.company_size_id === id);
                    if (!cs) return null;
                    return (
                      <Box
                        key={id}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          bgcolor: 'var(--joy-palette-background-level2)',
                          borderRadius: 20,
                          px: 1.5,
                          py: 0.5,
                          fontSize: 12,
                          height: 22,
                          gap: 0.5,
                          cursor: 'pointer',
                        }}
                        onClick={() =>
                          setSelectedCompanySizes((prev) => prev.filter((x) => x !== id))
                        }
                      >
                        <Typography sx={{ fontSize: 12 }}>{cs.value}</Typography>
                        <Box
                          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <X size={14} />
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              )}
              <FormControl size='sm'>
                <Autocomplete
                  multiple
                  disableCloseOnSelect
                  options={companySizes || []}
                  getOptionLabel={(option) => option.value}
                  value={(companySizes || []).filter((cs) =>
                    selectedCompanySizes.includes(cs.company_size_id)
                  )}
                  onChange={(_, value) =>
                    setSelectedCompanySizes(value.map((v) => v.company_size_id))
                  }
                  placeholder='Select company sizes'
                  size='sm'
                  loading={companySizesLoading}
                  disabled={companySizesLoading || !companySizes?.length}
                  renderTags={() => null}
                  slotProps={{
                    input: {
                      placeholder: selectedCompanySizes.length > 0 ? '' : 'Select company sizes',
                    },
                  }}
                />
                {companySizesLoading && <FormHelperText>Loading...</FormHelperText>}
              </FormControl>
            </Box>
          )}
        </Box>

        {/* Industries Accordion */}
        <Box sx={{ borderTop: '1px solid transparent' }}>
          <Box
            onClick={() => setIndustryAccordionOpen(!industryAccordionOpen)}
            sx={{
              py: 2,
              px: 2,
              minHeight: 48,
              pl: 0,
              borderBottom: !industryAccordionOpen
                ? '1px solid var(--joy-palette-divider)'
                : 'none',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <FunnelSimple
                  size={20}
                  color={
                    selectedIndustries.length > 0
                      ? 'var(--joy-palette-primary-500)'
                      : 'var(--joy-palette-text-primary)'
                  }
                />
                <Typography
                  fontWeight={500}
                  fontSize={14}
                  sx={{
                    color:
                      selectedIndustries.length > 0
                        ? 'var(--joy-palette-primary-500)'
                        : 'var(--joy-palette-text-primary)',
                  }}
                >
                  Industries
                </Typography>
              </Box>
              {/* Selected industry chips when accordion is closed */}
              {!industryAccordionOpen && selectedIndustries.length > 0 && industries && (
                <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                  {selectedIndustries.map((industryId) => {
                    const industry = industries.find((ind) => ind.industry_id === industryId);
                    if (!industry) return null;
                    return (
                      <Box
                        key={industryId}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          bgcolor: 'var(--joy-palette-background-level2)',
                          borderRadius: 20,
                          px: 1.5,
                          py: 0.5,
                          fontSize: 12,
                          height: 22,
                          gap: 0.5,
                        }}
                      >
                        <Typography sx={{ fontSize: 12, textTransform: 'capitalize' }}>
                          {industry.value}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              )}
            </Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                mt: !industryAccordionOpen && selectedIndustries.length > 0 ? 0 : 0,
              }}
            >
              {/* Count badge when accordion is closed and selections exist */}
              {!industryAccordionOpen && selectedIndustries.length > 0 && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    bgcolor: 'var(--joy-palette-background-level2)',
                    borderRadius: '999px',
                    px: 1,
                    py: 0.25,
                    height: 28,
                    cursor: 'pointer',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedIndustries([]);
                    setSuggestedIndustries([]);
                  }}
                >
                  <Typography
                    fontWeight={500}
                    fontSize={12}
                    sx={{ color: 'var(--joy-palette-text-primary)' }}
                  >
                    {selectedIndustries.length}
                  </Typography>
                  <Box sx={{ ml: 0.5, display: 'flex', alignItems: 'center' }}>
                    <X size={14} color='var(--joy-palette-text-primary)' />
                  </Box>
                </Box>
              )}
              {industryAccordionOpen ? <CaretUp size={16} /> : <CaretDown size={16} />}
            </Box>
          </Box>
          {industryAccordionOpen && (
            <Box sx={{ p: 2, pl: 0, borderBottom: '1px solid var(--joy-palette-divider)' }}>
              {/* Smart Search Toggle */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mb: 2,
                  mt: 1,
                }}
              >
                <Switch
                  checked={smartSearchEnabled}
                  onChange={() => setSmartSearchEnabled((v) => !v)}
                  sx={{ mr: 1 }}
                />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography
                    fontWeight={300}
                    fontSize={14}
                    sx={{ color: 'var(--joy-palette-text-primary)' }}
                  >
                    Smart search
                  </Typography>
                  <Tooltip
                    title='Includes similar terms to help you find more relevant results.'
                    placement='top'
                    sx={{
                      background: '#DAD8FD',
                      color: '#3D37DD',
                      maxWidth: 200,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', ml: 0.5 }}>
                      <Info size={16} />
                    </Box>
                  </Tooltip>
                </Box>
              </Box>

              {/* Smart Search Query Input */}
              {smartSearchEnabled && (
                <FormControl sx={{ mb: 2 }}>
                  <FormLabel sx={{ fontWeight: 500, fontSize: 14, mb: 0.5 }}>
                    Search Query
                  </FormLabel>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                    <Input
                      value={industrySearchQuery}
                      onChange={(e) => setIndustrySearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && industrySearchQuery.trim().length > 0) {
                          e.preventDefault();
                          handleSmartSearch();
                        }
                      }}
                      placeholder="Enter search query (e.g., 'Health care')"
                      sx={{ fontSize: 14, flex: 1 }}
                      disabled={isSmartSearching}
                    />
                    <IconButton
                      onClick={handleSmartSearch}
                      disabled={isSmartSearching || industrySearchQuery.trim().length === 0}
                      sx={{ minWidth: 40, height: 40 }}
                      color='primary'
                    >
                      <Check size={20} />
                    </IconButton>
                  </Box>
                </FormControl>
              )}

              {/* Industry Autocomplete */}
              <FormControl sx={{ mb: 1 }}>
                <FormLabel sx={{ fontWeight: 500, fontSize: 14, mb: 0.5 }}>Industry</FormLabel>
                <Autocomplete
                  multiple
                  disableCloseOnSelect
                  options={industries || []}
                  getOptionLabel={(option) => option.value}
                  value={(industries || []).filter((ind) =>
                    selectedIndustries.includes(ind.industry_id)
                  )}
                  onChange={(_, value) => {
                    setSelectedIndustries(value.map((v) => v.industry_id));
                    // Remove any selected items from suggestedIndustries
                    if (value.length > 0) {
                      setSuggestedIndustries((prev) =>
                        prev.filter((item) => !value.some((v) => v.value === item.value))
                      );
                    }
                  }}
                  sx={{ mb: 1, width: '100%', fontSize: 14 }}
                  slotProps={{
                    input: {
                      placeholder:
                        isSmartSearching && smartSearchEnabled
                          ? 'Loading smart search results...'
                          : isSmartSearching
                            ? 'Loading industries...'
                            : smartSearchEnabled && industrySearchQuery.trim().length === 0
                              ? 'Enter a query above to search'
                              : 'Search industry',
                    },
                    listbox: { sx: { fontSize: 14 } },
                    option: { sx: { fontSize: 14, textTransform: 'capitalize' } },
                  }}
                  loading={industriesLoading || isSmartSearching}
                  disabled={industriesLoading || !industries?.length}
                  renderTags={() => null}
                />
              </FormControl>

              {/* Selected Industries Chips */}
              {selectedIndustries.length > 0 && industries && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                  {selectedIndustries.map((industryId) => {
                    const industry = industries.find((ind) => ind.industry_id === industryId);
                    if (!industry) return null;
                    return (
                      <Box
                        key={industryId}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          bgcolor: 'var(--joy-palette-primary-100)',
                          borderRadius: 20,
                          px: 1.5,
                          py: 0.5,
                          fontSize: 13,
                          gap: 0.5,
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: 13,
                            color: 'var(--joy-palette-primary-700)',
                            textTransform: 'capitalize',
                          }}
                        >
                          {industry.value}
                        </Typography>
                        <Box
                          sx={{
                            fontSize: 12,
                            p: 0,
                            height: 8,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedIndustries((prev) => prev.filter((id) => id !== industryId));
                          }}
                        >
                          <X size={14} />
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              )}

              {/* Suggested Industries (from smart search) */}
              {smartSearchEnabled && suggestedIndustries.length > 0 && (
                <Box sx={{ mt: 1, mb: 2 }}>
                  <Typography
                    fontSize={15}
                    sx={{ color: 'var(--joy-palette-text-secondary)', mb: 0.5 }}
                  >
                    Also:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {suggestedIndustries.map((suggestion) => (
                      <Box
                        key={suggestion.industry_id}
                        onClick={() => handleAddSuggestedIndustry(suggestion.value)}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          bgcolor: 'var(--joy-palette-neutral-100)',
                          borderRadius: 20,
                          px: 1.5,
                          py: 0.5,
                          fontSize: 13,
                          cursor: 'pointer',
                          '&:hover': {
                            bgcolor: 'var(--joy-palette-neutral-200)',
                          },
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: 13,
                            color: 'var(--joy-palette-text-primary)',
                            textTransform: 'capitalize',
                          }}
                        >
                          {suggestion.value}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </Box>

        {/* Technologies Accordion */}
        <Box>
          <Box
            onClick={() => setTechnographicsAccordionOpen(!technographicsAccordionOpen)}
            sx={{
              py: 2,
              px: 2,
              minHeight: 48,
              pl: 0,
              borderBottom: !technographicsAccordionOpen
                ? '1px solid var(--joy-palette-divider)'
                : 'none',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Code
                size={20}
                color={
                  selectedTechnographics.length > 0
                    ? 'var(--joy-palette-primary-500)'
                    : 'var(--joy-palette-text-primary)'
                }
              />
              <Typography
                fontWeight={500}
                fontSize={14}
                sx={{
                  color:
                    selectedTechnographics.length > 0
                      ? 'var(--joy-palette-primary-500)'
                      : 'var(--joy-palette-text-primary)',
                }}
              >
                Technologies
              </Typography>
            </Box>
            {technographicsAccordionOpen ? <CaretUp size={16} /> : <CaretDown size={16} />}
          </Box>
          {technographicsAccordionOpen && (
            <Box sx={{ p: 2, pl: 0, borderBottom: '1px solid var(--joy-palette-divider)' }}>
              <FormControl size='sm'>
                <Autocomplete
                  multiple
                  options={technologies}
                  getOptionLabel={(option) => option}
                  value={selectedTechnographics}
                  onChange={(_, value) => setSelectedTechnographics(value)}
                  placeholder='Select technologies'
                  size='sm'
                />
              </FormControl>
            </Box>
          )}
        </Box>

        {/* Personas Accordion */}
        <Box>
          <Box
            onClick={() => setPersonaAccordionOpen(!personaAccordionOpen)}
            sx={{
              py: 2,
              px: 2,
              minHeight: 48,
              pl: 0,
              borderBottom: !personaAccordionOpen ? '1px solid var(--joy-palette-divider)' : 'none',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Users size={20} color='var(--joy-palette-text-primary)' />
              <Typography fontWeight={500} fontSize={14}>
                Personas
              </Typography>
            </Box>
            {personaAccordionOpen ? <CaretUp size={16} /> : <CaretDown size={16} />}
          </Box>
          {personaAccordionOpen && (
            <Box sx={{ p: 2, pl: 0, borderBottom: '1px solid var(--joy-palette-divider)' }}>
              <FormControl size='sm' disabled>
                <Autocomplete
                  multiple
                  options={[]}
                  value={[]}
                  placeholder='No personas available'
                  size='sm'
                  disabled
                />
                <FormHelperText>Persona management coming soon</FormHelperText>
              </FormControl>
            </Box>
          )}
        </Box>
      </Box>

      {/* Apply Filters / Clear Filters Buttons - attached to bottom (match creso) */}
      <Box
        sx={{
          p: { xs: 2, sm: 2 },
          pt: { xs: 2.5, sm: 2.5 },
          pb: { xs: 2.5, sm: 2.5 },
          display: 'flex',
          gap: 1,
          justifyContent: 'flex-end',
          alignItems: 'center',
          borderTop: '1px solid var(--joy-palette-divider)',
          bgcolor: 'var(--Content-background)',
          position: 'sticky',
          bottom: 0,
          zIndex: 10,
          mt: 'auto',
        }}
      >
        <Button
          variant='outlined'
          onClick={clearFilters}
          disabled={isSearching || !hasActiveFilters()}
          sx={{
            fontWeight: 500,
            color: 'var(--joy-palette-text-primary) !important',
            border: 'none',
            '&:hover': {
              opacity: 0.8,
              bgcolor: 'transparent',
              border: 'none',
            },
          }}
        >
          Clear filter
        </Button>
        <Tooltip
          title={
            insufficientCredits
              ? 'You need at least 5 credits to preview segment results.'
              : insufficientCreditsForCompanies && !filtersChangedSinceSearch
                ? 'You do not have enough credits to save segment. Please add credits to continue.'
                : undefined
          }
        >
          <span style={{ display: 'inline-flex' }}>
            <Button
              variant='solid'
              color='primary'
              onClick={() => applyFilters(1)}
              disabled={
                isSearching ||
                !hasActiveFilters() ||
                insufficientCredits ||
                (insufficientCreditsForCompanies && !filtersChangedSinceSearch)
              }
              loading={isSearching}
              sx={{
                fontWeight: 500,
                py: { xs: 1, sm: 0.5 },
                minHeight: 30,
                height: 30,
                px: 1.25,
                width: 'fit-content',
              }}
            >
              {isSearching ? 'Searching...' : 'Show Preview'}
            </Button>
          </span>
        </Tooltip>
      </Box>
    </Box>
  );

  // Determine if we should show companies
  // In edit mode: show companies if we have any (from existing segment or from search)
  // In create mode: show companies only after searching
  const shouldShowCompanies = isEditMode ? companies.length > 0 : hasSearched;

  // Main Content Panel (Right Side) — grows with table so page can scroll
  const mainContent = (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        minHeight: { xs: 'auto', sm: '64vh' },
        display: 'flex',
        flexDirection: 'column',
        alignItems: shouldShowCompanies ? 'flex-start' : 'center',
        justifyContent: shouldShowCompanies ? 'flex-start' : 'center',
        bgcolor: 'var(--joy-palette-background-surface)',
        overflow: 'visible',
      }}
    >
      {!shouldShowCompanies ? (
        // Empty state - no companies to show (styles match creso)
        <Box sx={{ textAlign: 'center', maxWidth: 450 }}>
          <Typography
            fontWeight={600}
            fontSize={24}
            mb={0.5}
            sx={{ color: 'var(--joy-palette-text-primary)' }}
          >
            {isEditMode ? 'Update segment filters' : 'Setup filters to create new segment'}
          </Typography>
          <Typography
            fontSize={14}
            sx={{ color: 'var(--joy-palette-text-secondary)', lineHeight: 1.5 }}
          >
            {isEditMode
              ? 'Modify the filters below to update your segment criteria.'
              : 'Narrow down your audience using filters and save them as a reusable segment.'}
          </Typography>
        </Box>
      ) : (
        // Company preview table — no fixed height so content grows and page scrolls
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            minWidth: 0,
            flex: 1,
            overflow: 'visible',
          }}
        >
          {/* Header with count */}
          <Box sx={{ p: 2, borderBottom: '1px solid var(--joy-palette-divider)' }}>
            <Box sx={{ flex: 1 }}>
              <Typography
                fontSize={18}
                fontWeight={500}
                sx={{ color: 'var(--joy-palette-text-primary)' }}
              >
                {isSearching
                  ? 'Searching...'
                  : totalCount > perPage
                    ? `Showing ${(currentPage - 1) * perPage + 1}–${Math.min(currentPage * perPage, totalCount)} of ${totalCount} companies`
                    : `${totalCount} companies found`}
              </Typography>
            </Box>
          </Box>

          {/* Preview banner */}
          {hasSearched && companies.length > 0 && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                mx: 2,
                mt: 2,
                bgcolor: 'var(--joy-palette-warning-100)',
                color: 'var(--joy-palette-text-secondary)',
                border: '1px solid var(--joy-palette-warning-300)',
                borderRadius: 10,
                px: 2,
                py: 0.75,
                width: 'auto',
              }}
            >
              <Typography
                fontSize={14}
                sx={{
                  color: 'var(--joy-palette-text-secondary)',
                  lineHeight: 1.6,
                  fontWeight: 300,
                }}
              >
                This is a preview of {companies.length} companies — refine your filters or save the
                segment to access the full list.
              </Typography>
            </Box>
          )}

          {/* Table */}
          <Box
            sx={{
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'visible',
              p: 2,
            }}
          >
            {isSearching ? (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '100%',
                }}
              >
                <CircularProgress />
              </Box>
            ) : companies.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8, px: 4 }}>
                <Typography
                  fontWeight={600}
                  fontSize={16}
                  sx={{ color: 'var(--joy-palette-text-primary)', mb: 1 }}
                >
                  No companies found
                </Typography>
                <Typography
                  fontSize={14}
                  sx={{
                    color: 'var(--joy-palette-text-secondary)',
                    fontWeight: 300,
                    mb: 2,
                  }}
                >
                  No companies match your current filter criteria.
                </Typography>
                <Typography
                  fontSize={14}
                  sx={{
                    color: 'var(--joy-palette-text-secondary)',
                    fontWeight: 300,
                  }}
                >
                  Try adjusting your filters:
                </Typography>
                <Box
                  component='ul'
                  sx={{
                    textAlign: 'left',
                    display: 'inline-block',
                    mt: 1,
                    color: 'text.tertiary',
                    fontSize: 'sm',
                    listStyle: 'disc',
                    pl: 2,
                  }}
                >
                  <li>Select a different country or remove location filters</li>
                  <li>Choose broader company size ranges</li>
                  <li>Try different or fewer industries</li>
                  <li>Remove technology filters</li>
                </Box>
              </Box>
            ) : (
              <>
                <Box sx={{ overflowX: 'auto', overflowY: 'visible' }}>
                  <Table
                    sx={{
                      width: '100%',
                      minWidth: 1100,
                      tableLayout: 'fixed',
                      '& th, & td': {
                        px: { xs: 1, sm: 2 },
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
                        <th style={{ width: 80 }}>Logo</th>
                        <th style={{ width: 200 }}>Company Name</th>
                        <th style={{ width: 180 }}>States/Provinces</th>
                        <th style={{ width: 100 }}>Employees</th>
                        <th style={{ width: 180 }}>Website</th>
                        <th style={{ width: 280 }}>Industry</th>
                      </tr>
                    </thead>
                    <tbody>
                      {companies.map((company) => (
                        <tr key={company.id}>
                          <td>
                            <Avatar
                              src={company.logo}
                              alt={company.name}
                              sx={{ width: 28, height: 28 }}
                            >
                              {company.name.charAt(0).toUpperCase()}
                            </Avatar>
                          </td>
                          <td>
                            <Box>
                              <Typography
                                sx={{
                                  color: 'var(--joy-palette-text-secondary)',
                                  fontWeight: 300,
                                  fontSize: 14,
                                }}
                              >
                                {company.fullName || company.name}
                              </Typography>
                              {company.type && (
                                <Typography
                                  sx={{
                                    color: 'var(--joy-palette-text-secondary)',
                                    fontWeight: 300,
                                    fontSize: 12,
                                  }}
                                >
                                  {company.type}
                                </Typography>
                              )}
                            </Box>
                          </td>
                          <td>
                            <Typography
                              sx={{
                                color: 'var(--joy-palette-text-secondary)',
                                fontWeight: 300,
                                fontSize: 14,
                              }}
                            >
                              {[
                                company.location?.city?.name,
                                company.location?.region?.name,
                                company.location?.country?.name,
                              ]
                                .filter(Boolean)
                                .join(', ') || 'N/A'}
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
                              {company.nbEmployees?.toLocaleString() ||
                                (company.nbEmployeesMin && company.nbEmployeesMax
                                  ? `${company.nbEmployeesMin.toLocaleString()}-${company.nbEmployeesMax.toLocaleString()}`
                                  : 'N/A')}
                            </Typography>
                          </td>
                          <td>
                            {company.homepageUri ? (
                              <Box
                                component='span'
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const url =
                                    company.homepageUri!.startsWith('http://') ||
                                    company.homepageUri!.startsWith('https://')
                                      ? company.homepageUri!
                                      : `https://${company.homepageUri}`;
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
                                  fontSize: 14,
                                  fontWeight: 300,
                                }}
                              >
                                {company.homepageUri}
                              </Box>
                            ) : (
                              <Typography
                                sx={{
                                  color: 'var(--joy-palette-text-secondary)',
                                  fontWeight: 300,
                                  fontSize: 14,
                                }}
                              >
                                N/A
                              </Typography>
                            )}
                          </td>
                          <td style={{ minWidth: 280 }}>
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                              {company.categories && company.categories.length > 0 ? (
                                company.categories.slice(0, 2).map((cat, idx) => (
                                  <Chip key={idx} size='sm' variant='soft'>
                                    {cat.name}
                                  </Chip>
                                ))
                              ) : (
                                <Typography
                                  sx={{
                                    color: 'var(--joy-palette-text-secondary)',
                                    fontWeight: 300,
                                    fontSize: 14,
                                  }}
                                >
                                  N/A
                                </Typography>
                              )}
                              {company.categories && company.categories.length > 2 && (
                                <Chip size='sm' variant='soft'>
                                  +{company.categories.length - 2}
                                </Chip>
                              )}
                            </Box>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Box>
                {isEditMode && totalCount > 0 && lastPage > 1 && (
                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                    <Pagination
                      totalPages={lastPage}
                      currentPage={currentPage}
                      onPageChange={handlePageChange}
                      disabled={isSearching}
                    />
                  </Box>
                )}
              </>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );

  // Show loading state while segment data is being fetched in edit mode
  if (isEditMode && segmentLoading) {
    return (
      <Box
        sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}
      >
        <CircularProgress size='lg' />
      </Box>
    );
  }

  const breadcrumbs = (
    <Breadcrumbs separator={<BreadcrumbsSeparator />}>
      <BreadcrumbsItem href={paths.home} type='start' />
      <BreadcrumbsItem href={paths.strategyForge.segments.list}>Segments</BreadcrumbsItem>
      {isEditMode && segmentId && segment ? (
        <BreadcrumbsItem type='end' href={paths.strategyForge.segments.details(segmentId)}>
          {segment.name}
        </BreadcrumbsItem>
      ) : (
        <BreadcrumbsItem type='end'>Create new segment</BreadcrumbsItem>
      )}
    </Breadcrumbs>
  );

  // Segment filters summary (edit mode) - same as segment details page
  const editModeFilters = (segment?.filters || {}) as {
    country?: string;
    location?: string;
    employees?: string | string[];
    categories?: string[];
    technographics?: string[];
    persona?: string;
    personas?: number[];
  };
  const editModeEmployeesDisplay = Array.isArray(editModeFilters.employees)
    ? editModeFilters.employees[0]
    : editModeFilters.employees;
  const viewFilters =
    isEditMode && segment ? (
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
            {segmentLoading ? '...' : totalCount.toLocaleString()}
          </span>
        </Typography>
        {editModeFilters.country && (
          <Typography fontSize={12} sx={{ color: 'var(--joy-palette-text-secondary)', mr: 4 }}>
            <span>Country:</span>{' '}
            <span style={{ fontWeight: 500, color: 'var(--joy-palette-text-primary)' }}>
              {editModeFilters.country}
            </span>
          </Typography>
        )}
        {editModeFilters.location && (
          <Typography fontSize={12} sx={{ color: 'var(--joy-palette-text-secondary)', mr: 4 }}>
            <span>Location:</span>{' '}
            <span style={{ fontWeight: 500, color: 'var(--joy-palette-text-primary)' }}>
              {editModeFilters.location}
            </span>
          </Typography>
        )}
        {editModeEmployeesDisplay && (
          <Typography fontSize={12} sx={{ color: 'var(--joy-palette-text-secondary)', mr: 4 }}>
            <span>Company size:</span>{' '}
            <span style={{ fontWeight: 500, color: 'var(--joy-palette-text-primary)' }}>
              {editModeEmployeesDisplay}
            </span>
          </Typography>
        )}
        {editModeFilters.categories && editModeFilters.categories.length > 0 && (
          <Typography fontSize={12} sx={{ color: 'var(--joy-palette-text-secondary)', mr: 4 }}>
            <span>Industry:</span>{' '}
            <span style={{ fontWeight: 500, color: 'var(--joy-palette-text-primary)' }}>
              {editModeFilters.categories.join(', ')}
            </span>
          </Typography>
        )}
        {editModeFilters.technographics && editModeFilters.technographics.length > 0 && (
          <Typography fontSize={12} sx={{ color: 'var(--joy-palette-text-secondary)', mr: 4 }}>
            <span>Technographics:</span>{' '}
            <span style={{ fontWeight: 500, color: 'var(--joy-palette-text-primary)' }}>
              {editModeFilters.technographics.join(', ')}
            </span>
          </Typography>
        )}
        {editModeFilters.persona && (
          <Typography fontSize={12} sx={{ color: 'var(--joy-palette-text-secondary)', mr: 4 }}>
            <span>Persona:</span>{' '}
            <span style={{ fontWeight: 500, color: 'var(--joy-palette-text-primary)' }}>
              {editModeFilters.persona}
            </span>
          </Typography>
        )}
        {editModeFilters.personas &&
          editModeFilters.personas.length > 0 &&
          !editModeFilters.persona && (
            <Typography fontSize={12} sx={{ color: 'var(--joy-palette-text-secondary)', mr: 4 }}>
              <span>Personas:</span>{' '}
              <span style={{ fontWeight: 500, color: 'var(--joy-palette-text-primary)' }}>
                {editModeFilters.personas.length} selected
              </span>
            </Typography>
          )}
      </Box>
    ) : null;

  return (
    <Box>
      {/* Order: title, breadcrumbs, AI prompt, then content */}
      <Stack spacing={2} sx={{ mb: 2 }}>
        {/* Segment Name and Action Buttons - first */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <FormControl sx={{ flex: 1, minWidth: { md: 300, lg: 400 } }}>
              <Input
                value={segmentName}
                onChange={(e) => setSegmentName(e.target.value)}
                onBlur={() => setTitleTouched(true)}
                placeholder='Title'
                error={titleTouched && !isTitleValid()}
                sx={{
                  fontWeight: 600,
                  fontSize: 30,
                  color: segmentName ? '#111827' : '#D1D5DB',
                  background: 'transparent',
                  border:
                    titleTouched && !isTitleValid()
                      ? '1px solid var(--joy-palette-danger-500)'
                      : 'none',
                  borderRadius: 8,
                  p: 0,
                  pl: 1,
                  ml: 0,
                  minHeight: 45,
                  '& input': {
                    textAlign: 'left',
                    fontSize: 30,
                    fontWeight: 600,
                    color: segmentName ? '#111827' : '#D1D5DB',
                    '&::placeholder': {
                      color: '#D1D5DB',
                    },
                  },
                }}
              />
            </FormControl>
            <Box sx={{ display: 'flex', gap: 2, flexShrink: 0 }}>
              <Button
                variant='outlined'
                color='neutral'
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Tooltip
                title={
                  insufficientCredits || insufficientCreditsForCompanies
                    ? 'You do not have enough credits to save segment. Please add credits to continue.'
                    : undefined
                }
              >
                <span style={{ display: 'inline-flex' }}>
                  <Button
                    variant='solid'
                    color='primary'
                    onClick={handleSaveSegment}
                    disabled={
                      !canSaveSegment() ||
                      isSubmitting ||
                      insufficientCredits ||
                      insufficientCreditsForCompanies
                    }
                    loading={isSubmitting}
                  >
                    Create & Save
                  </Button>
                </span>
              </Tooltip>
            </Box>
          </Box>
          {/* Title validation messages */}
          {titleTouched && segmentName.trim().length === 0 && (
            <Typography fontSize={12} sx={{ color: 'var(--joy-palette-danger-500)', ml: 0 }}>
              Please enter a title
            </Typography>
          )}
          {titleTouched && segmentName.trim().length > 0 && !isTitleValid() && (
            <Typography fontSize={12} sx={{ color: 'var(--joy-palette-danger-500)', ml: 0 }}>
              {segmentName.trim().length < 3
                ? 'Title must be at least 3 characters long'
                : 'Title must be no more than 100 characters long'}
            </Typography>
          )}
          {segmentName.trim().length > 0 && isTitleValid() && (
            <Typography fontSize={12} sx={{ color: 'var(--joy-palette-success-500)', ml: 0 }}>
              {`${segmentName.trim().length}/100 characters`}
            </Typography>
          )}
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {breadcrumbs}
          </Box>
          {viewFilters != null && <Box sx={{ pt: 0 }}>{viewFilters}</Box>}
        </Box>

        <AskAiSegment
          onAiSegmentGenerated={handleAiSegmentGenerated}
          disabled={isSubmitting || industriesLoading || companySizesLoading}
        />
      </Stack>

      {/* Two Column Layout — no minHeight/overflow so page can scroll */}
      <Box
        sx={{
          display: { xs: 'block', sm: 'flex' },
          width: '100%',
          minWidth: 0,
          minHeight: { xs: 'auto', sm: '64vh' },
          borderTop: '1px solid var(--joy-palette-divider)',
          borderRadius: 2,
          overflow: 'visible',
          position: 'relative',
        }}
      >
        {/* Persona warning banner */}
        {hasSearched && selectedPersonas.length === 0 && !personaWarningDismissed && (
          <PersonaWarningBanner
            onDismiss={() => setPersonaWarningDismissed(true)}
            message={
              <>
                People search was not performed because no persona is selected. Please create or
                select a persona, and we will automatically find matching people in these companies.
              </>
            }
          />
        )}
        {filtersPanel}
        {mainContent}
      </Box>
    </Box>
  );
}
