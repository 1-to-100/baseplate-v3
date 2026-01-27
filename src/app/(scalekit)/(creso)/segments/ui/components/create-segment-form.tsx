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
import { toast } from '@/components/core/toaster';
import { getIndustries, getCompanySizes } from '../../lib/api/options';
import { createSegment, editSegment, getSegmentById } from '../../lib/api/segments';
import { searchByFilters } from '../../lib/api/search';
import { countries, usStates, canadianProvinces } from '../../lib/constants/locations';
import { technologies } from '../../lib/constants/technologies';
import { type List } from '../../lib/types/list';
import type { CompanyPreview } from '../../lib/types/search';
import type { OptionIndustry, OptionCompanySize } from '../../lib/types/company';
import { paths } from '@/paths';
import Table from '@mui/joy/Table';
import Avatar from '@mui/joy/Avatar';
import CircularProgress from '@mui/joy/CircularProgress';
import Chip from '@mui/joy/Chip';

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

  // Search/preview state
  const [isSearching, setIsSearching] = React.useState(false);
  const [companies, setCompanies] = React.useState<CompanyPreview[]>([]);
  const [totalCount, setTotalCount] = React.useState(0);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [perPage] = React.useState(25);
  const [hasSearched, setHasSearched] = React.useState(false);
  const [searchError, setSearchError] = React.useState<string | null>(null);
  const [formInitialized, setFormInitialized] = React.useState(false);

  // Fetch options from database
  const { data: industries, isLoading: industriesLoading } = useQuery({
    queryKey: ['industries'],
    queryFn: getIndustries,
  });

  const { data: companySizes, isLoading: companySizesLoading } = useQuery({
    queryKey: ['companySizes'],
    queryFn: getCompanySizes,
  });

  // Fetch segment data if segmentId is provided and initialSegmentData is not
  const { data: segmentData, isLoading: segmentLoading } = useQuery({
    queryKey: ['segment', segmentId, 'form'],
    queryFn: () => getSegmentById(segmentId!, { page: 1, perPage: 1 }),
    enabled: !!segmentId && !initialSegmentData,
  });

  const segment = initialSegmentData || segmentData?.segment;
  const isEditMode = !!segmentId;

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

  const canSaveSegment = () => {
    return segmentName.trim().length >= 3;
  };

  const canSave = () => {
    return (
      segmentName.trim().length >= 3 &&
      segmentName.trim().length <= 100 &&
      hasSearched &&
      companies.length > 0
    );
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

  const handlePageChange = (newPage: number) => {
    applyFilters(newPage);
  };

  // Auto-trigger search in edit mode after form is initialized
  React.useEffect(() => {
    if (
      isEditMode &&
      formInitialized &&
      !hasSearched &&
      (selectedCountry !== null ||
        selectedState !== null ||
        selectedCompanySizes.length > 0 ||
        selectedIndustries.length > 0 ||
        selectedTechnographics.length > 0)
    ) {
      // Small delay to ensure all state updates are complete
      const timer = setTimeout(() => {
        applyFilters(1);
      }, 200);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isEditMode,
    formInitialized,
    hasSearched,
    selectedCountry,
    selectedState,
    selectedCompanySizes,
    selectedIndustries,
    selectedTechnographics,
  ]);

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

        toast.success('Segment updated successfully!');
        router.push(paths.dashboard.segments.details(segmentId));
      } else {
        // Create new segment
        await createSegment({
          name: segmentName,
          filters,
        });

        // Invalidate segments query to refresh the list
        queryClient.invalidateQueries({ queryKey: ['segments'] });

        toast.success('Segment created! Processing companies in background...');
        router.push(paths.dashboard.segments.list);
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
      router.push(paths.dashboard.segments.list);
    }
  };

  // Filters Panel (Left Side)
  const filtersPanel = (
    <Box
      sx={{
        width: { xs: '100%', sm: 320 },
        bgcolor: 'var(--Content-background)',
        borderRight: { xs: 'none', sm: '1px solid var(--joy-palette-divider)' },
        display: 'flex',
        flexDirection: 'column',
        minHeight: { xs: 'auto', sm: '70vh' },
        maxHeight: { xs: '100vh', sm: '70vh' },
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
              alignItems: 'center',
              cursor: 'pointer',
            }}
          >
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
            {geoAccordionOpen ? <CaretUp size={16} /> : <CaretDown size={16} />}
          </Box>
          {geoAccordionOpen && (
            <Box sx={{ p: 2, pl: 0, borderBottom: '1px solid var(--joy-palette-divider)' }}>
              <Stack spacing={2}>
                <FormControl size='sm'>
                  <FormLabel>Country</FormLabel>
                  <Autocomplete
                    options={countries}
                    getOptionLabel={(option) => option.name}
                    value={countries.find((c) => c.code === selectedCountry) || null}
                    onChange={(_, value) => {
                      setSelectedCountry(value?.code || null);
                      if (!value) setSelectedState(null);
                    }}
                    placeholder='Select country'
                    size='sm'
                    disabled={countries.length === 0}
                  />
                  {countries.length === 0 && (
                    <FormHelperText>Country options coming soon</FormHelperText>
                  )}
                </FormControl>
                {showLocationDropdown && (
                  <FormControl size='sm'>
                    <FormLabel>State/Province</FormLabel>
                    <Autocomplete
                      options={locationOptions}
                      getOptionLabel={(option) => option.name}
                      value={locationOptions.find((l) => l.code === selectedState) || null}
                      onChange={(_, value) => setSelectedState(value?.code || null)}
                      placeholder={`Select ${selectedCountry === 'USA' ? 'state' : 'province'}`}
                      size='sm'
                    />
                  </FormControl>
                )}
              </Stack>
            </Box>
          )}
        </Box>

        {/* Company Size Accordion */}
        <Box>
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
              alignItems: 'center',
              cursor: 'pointer',
            }}
          >
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
            {companySizeAccordionOpen ? <CaretUp size={16} /> : <CaretDown size={16} />}
          </Box>
          {companySizeAccordionOpen && (
            <Box sx={{ p: 2, pl: 0, borderBottom: '1px solid var(--joy-palette-divider)' }}>
              <FormControl size='sm'>
                <Autocomplete
                  multiple
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
                />
                {companySizesLoading && <FormHelperText>Loading...</FormHelperText>}
              </FormControl>
            </Box>
          )}
        </Box>

        {/* Industries Accordion */}
        <Box>
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
              alignItems: 'center',
              cursor: 'pointer',
            }}
          >
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
            {industryAccordionOpen ? <CaretUp size={16} /> : <CaretDown size={16} />}
          </Box>
          {industryAccordionOpen && (
            <Box sx={{ p: 2, pl: 0, borderBottom: '1px solid var(--joy-palette-divider)' }}>
              <FormControl size='sm'>
                <Autocomplete
                  multiple
                  options={industries || []}
                  getOptionLabel={(option) => option.value}
                  value={(industries || []).filter((ind) =>
                    selectedIndustries.includes(ind.industry_id)
                  )}
                  onChange={(_, value) => setSelectedIndustries(value.map((v) => v.industry_id))}
                  placeholder='Select industries'
                  size='sm'
                  loading={industriesLoading}
                  disabled={industriesLoading || !industries?.length}
                />
                {industriesLoading && <FormHelperText>Loading...</FormHelperText>}
              </FormControl>
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

      {/* Apply Filters Button */}
      <Box sx={{ p: 2, pl: 0, borderTop: '1px solid var(--joy-palette-divider)' }}>
        <Button
          fullWidth
          variant='solid'
          color='primary'
          onClick={() => applyFilters(1)}
          disabled={isSearching || !hasActiveFilters()}
          loading={isSearching}
          size='lg'
        >
          {isSearching ? 'Searching...' : 'Apply Filters'}
        </Button>
      </Box>
    </Box>
  );

  // Main Content Panel (Right Side)
  const mainContent = (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'var(--joy-palette-background-surface)',
        overflow: 'hidden',
      }}
    >
      {!hasSearched ? (
        // Empty state - no search performed yet
        <Box
          sx={{
            p: 3,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            textAlign: 'center',
          }}
        >
          <Typography level='h1' sx={{ mb: 2, fontSize: '2rem' }}>
            {isEditMode ? 'Update segment filters' : 'Setup filters to create new segment'}
          </Typography>
          <Typography level='body-lg' sx={{ color: 'text.secondary', maxWidth: 600 }}>
            {isEditMode
              ? 'Modify the filters below to update your segment criteria.'
              : 'Narrow down your audience using filters and save them as a reusable segment.'}
          </Typography>
        </Box>
      ) : (
        // Company preview table
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          {/* Header with count */}
          <Box sx={{ p: 2, borderBottom: '1px solid var(--joy-palette-divider)' }}>
            <Box sx={{ flex: 1 }}>
              <Typography level='title-lg'>
                {isSearching ? 'Searching...' : `Found ${totalCount.toLocaleString()} companies`}
              </Typography>
              {totalCount > perPage && (
                <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                  Page {currentPage} of {Math.ceil(totalCount / perPage)}
                </Typography>
              )}
            </Box>
          </Box>

          {/* Table */}
          <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
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
                <Typography level='h4' sx={{ mb: 1 }}>
                  No companies found
                </Typography>
                <Typography level='body-md' sx={{ color: 'text.secondary', mb: 2 }}>
                  No companies match your current filter criteria.
                </Typography>
                <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
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
              <Table
                sx={{
                  '& thead th': {
                    bgcolor: 'var(--joy-palette-background-level1)',
                  },
                }}
              >
                <thead>
                  <tr>
                    <th style={{ width: 60 }}>Logo</th>
                    <th>Company Name</th>
                    <th style={{ width: 200 }}>Location</th>
                    <th style={{ width: 120 }}>Employees</th>
                    <th style={{ width: 200 }}>Industry</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((company) => (
                    <tr key={company.id}>
                      <td>
                        <Avatar
                          src={company.logo}
                          alt={company.name}
                          sx={{ width: 40, height: 40 }}
                        >
                          {company.name.charAt(0).toUpperCase()}
                        </Avatar>
                      </td>
                      <td>
                        <Box>
                          <Typography level='body-md' fontWeight={500}>
                            {company.fullName || company.name}
                          </Typography>
                          {company.type && (
                            <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                              {company.type}
                            </Typography>
                          )}
                        </Box>
                      </td>
                      <td>
                        <Typography level='body-sm'>
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
                        <Typography level='body-sm'>
                          {company.nbEmployees?.toLocaleString() ||
                            (company.nbEmployeesMin && company.nbEmployeesMax
                              ? `${company.nbEmployeesMin.toLocaleString()}-${company.nbEmployeesMax.toLocaleString()}`
                              : 'N/A')}
                        </Typography>
                      </td>
                      <td>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {company.categories && company.categories.length > 0 ? (
                            company.categories.slice(0, 2).map((cat, idx) => (
                              <Chip key={idx} size='sm' variant='soft'>
                                {cat.name}
                              </Chip>
                            ))
                          ) : (
                            <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
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
            )}
          </Box>

          {/* Pagination */}
          {totalCount > perPage && !isSearching && (
            <Box
              sx={{
                p: 2,
                borderTop: '1px solid var(--joy-palette-divider)',
                display: 'flex',
                justifyContent: 'center',
                gap: 1,
              }}
            >
              <Button
                variant='outlined'
                size='sm'
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
              >
                Previous
              </Button>
              <Box sx={{ display: 'flex', alignItems: 'center', px: 2 }}>
                <Typography level='body-sm'>
                  Page {currentPage} of {Math.ceil(totalCount / perPage)}
                </Typography>
              </Box>
              <Button
                variant='outlined'
                size='sm'
                disabled={currentPage >= Math.ceil(totalCount / perPage)}
                onClick={() => handlePageChange(currentPage + 1)}
              >
                Next
              </Button>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );

  return (
    <Box>
      {/* Top Action Buttons */}
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
        }}
      >
        <FormControl sx={{ flex: 1 }}>
          <Input
            value={segmentName}
            onChange={(e) => setSegmentName(e.target.value)}
            placeholder='Enter segment name'
            size='lg'
          />
        </FormControl>
        <Box sx={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          <Button variant='outlined' color='neutral' onClick={handleCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant='solid'
            color='primary'
            onClick={handleSaveSegment}
            disabled={!canSaveSegment() || isSubmitting}
            loading={isSubmitting}
          >
            {isSubmitting
              ? isEditMode
                ? 'Updating...'
                : 'Saving...'
              : isEditMode
                ? 'Update'
                : 'Save'}
          </Button>
        </Box>
      </Box>

      {/* Two Column Layout */}
      <Box
        sx={{
          display: { xs: 'block', sm: 'flex' },
          minHeight: '70vh',
          borderTop: '1px solid var(--joy-palette-divider)',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        {filtersPanel}
        {mainContent}
      </Box>
    </Box>
  );
}
