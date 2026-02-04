'use client';

import React, { useCallback, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Box from '@mui/joy/Box';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import Button from '@mui/joy/Button';
import Input from '@mui/joy/Input';
import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';
import Autocomplete from '@mui/joy/Autocomplete';
import Switch from '@mui/joy/Switch';
import Tooltip from '@mui/joy/Tooltip';
import IconButton from '@mui/joy/IconButton';
import {
  CaretDown,
  CaretUp,
  MapPin,
  Building,
  Buildings,
  Code,
  Funnel as FunnelIcon,
  FunnelSimple,
  X,
  Check,
  Info,
} from '@phosphor-icons/react/dist/ssr';
import { toast } from '@/components/core/toaster';
import { useDebounce } from '@/hooks/use-debounce';
import { getCompanies } from '../../lib/api/companies';
import {
  getIndustries,
  getCompanySizes,
  smartSearchIndustries,
  type SmartSearchIndustry,
} from '../../lib/api/options';
import { countries, usStates, canadianProvinces } from '../../lib/constants/locations';
import { technologies } from '../../lib/constants/technologies';
import type { CompanyFilterFields } from '../../lib/types/company';
import { parseCompanySizeRange } from '../../lib/utils/company-size';

// Suggested technographics for Smart search "Also:" section (reference: creso-ai)
const SUGGESTED_TECHNOGRAPHICS = [
  'Amazon EC2',
  'Aurora',
  'AWS',
  'CRM platforms',
  'FreshSales',
  'HubSpot',
  'Lambda',
  'Pipedrive',
  'RDS',
  'S3',
  'Salesforce',
  'Zoho',
];

interface CompanyFilterProps {
  open: boolean;
  onClose: () => void;
  onFilter: (filters: CompanyFilterFields) => void;
  initialFilters?: CompanyFilterFields;
  onFiltersChange?: (filters: CompanyFilterFields) => void;
}

export default function CompanyFilter({
  open,
  onClose,
  onFilter,
  initialFilters,
  onFiltersChange,
}: CompanyFilterProps) {
  const [companyNameAccordionOpen, setCompanyNameAccordionOpen] = React.useState(false);
  const [companyNameSearch, setCompanyNameSearch] = React.useState(initialFilters?.name ?? '');
  const debouncedCompanyName = useDebounce(companyNameSearch, 300);

  const [geoAccordionOpen, setGeoAccordionOpen] = React.useState(false);
  const [companySizeAccordionOpen, setCompanySizeAccordionOpen] = React.useState(false);
  const [industryAccordionOpen, setIndustryAccordionOpen] = React.useState(false);
  const [technographicsAccordionOpen, setTechnographicsAccordionOpen] = React.useState(false);

  const [selectedCountry, setSelectedCountry] = React.useState<string | null>(
    initialFilters?.country || null
  );
  const [selectedState, setSelectedState] = React.useState<string | null>(
    initialFilters?.region || null
  );
  const [selectedCompanySize, setSelectedCompanySize] = React.useState<number | null>(null);
  const [selectedIndustries, setSelectedIndustries] = React.useState<number[]>([]);
  const [selectedTechnographics, setSelectedTechnographics] = React.useState<string[]>(
    initialFilters?.technographic || []
  );
  const [suggestedTechnographics, setSuggestedTechnographics] = React.useState<string[]>([]);
  const [smartSearchTechnographics, setSmartSearchTechnographics] = React.useState(false);

  const [smartSearchEnabled, setSmartSearchEnabled] = React.useState(false);
  const [industrySearchQuery, setIndustrySearchQuery] = React.useState('');
  const [isSmartSearching, setIsSmartSearching] = React.useState(false);
  const [smartSearchResults, setSmartSearchResults] = React.useState<SmartSearchIndustry[]>([]);
  const [suggestedIndustries, setSuggestedIndustries] = React.useState<SmartSearchIndustry[]>([]);

  const { data: industries, isLoading: industriesLoading } = useQuery({
    queryKey: ['industries'],
    queryFn: getIndustries,
  });

  const { data: companySizes, isLoading: companySizesLoading } = useQuery({
    queryKey: ['companySizes'],
    queryFn: getCompanySizes,
  });

  // Derived from selected company size (single); updates when user selects/deselects size option
  const companySizeRange = useMemo((): [number, number] | undefined => {
    if (!companySizes || selectedCompanySize == null) return undefined;
    const selected = companySizes.find((cs) => cs.company_size_id === selectedCompanySize);
    if (!selected) return undefined;
    const { min, max } = parseCompanySizeRange(selected.value);
    if (max === null) return [min, 999999999];
    return [min, max];
  }, [companySizes, selectedCompanySize]);

  // Build getCompanies params from current filter state so company-name search respects filters
  const getCompaniesParams = useMemo(() => {
    const categoryValues =
      industries && selectedIndustries.length > 0
        ? industries
            .filter((ind) => selectedIndustries.includes(ind.industry_id))
            .map((ind) => ind.value)
        : undefined;

    return {
      search: debouncedCompanyName.trim(),
      limit: 50,
      ...(selectedCountry ? { country: selectedCountry } : {}),
      ...(selectedState ? { region: selectedState } : {}),
      ...(companySizeRange
        ? { min_employees: companySizeRange[0], max_employees: companySizeRange[1] }
        : {}),
      ...(categoryValues?.length ? { category: categoryValues } : {}),
      ...(selectedTechnographics.length > 0 ? { technology: selectedTechnographics } : {}),
    };
  }, [
    debouncedCompanyName,
    selectedCountry,
    selectedState,
    companySizeRange,
    selectedIndustries,
    industries,
    selectedTechnographics,
  ]);

  const { data: companySearchData, isLoading: isCompaniesSearchLoading } = useQuery({
    queryKey: ['companies-search', getCompaniesParams],
    queryFn: () => getCompanies(getCompaniesParams),
    enabled:
      companyNameAccordionOpen &&
      debouncedCompanyName.trim().length >= 2 &&
      !!getCompaniesParams.search,
  });

  const companyOptions = useMemo(() => companySearchData?.data ?? [], [companySearchData]);

  // Sync company name from initial filters
  useEffect(() => {
    if (initialFilters?.name !== undefined) {
      setCompanyNameSearch(initialFilters.name);
    }
  }, [initialFilters?.name]);

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

  // Map company size from initial filters (exact range match); single select uses first match.
  useEffect(() => {
    if (!companySizes || !initialFilters?.companySize) return;

    const [appliedMin, appliedMax] = initialFilters.companySize;
    const minNum = Number(appliedMin);
    const maxNum = appliedMax == null ? null : Number(appliedMax);
    const appliedMaxVal = maxNum ?? Infinity;

    const matchingSizes = companySizes.filter((cs) => {
      const range = parseCompanySizeRange(cs.value);
      if (appliedMaxVal >= 999999999) {
        return range.min === minNum && range.max === null;
      }
      return range.min === minNum && maxNum !== null && range.max === maxNum;
    });

    const firstMatch = matchingSizes[0];
    if (firstMatch) {
      setSelectedCompanySize(firstMatch.company_size_id);
    }
  }, [initialFilters?.companySize, companySizes]);

  // Sync selected industries from initialFilters (match by industry value strings)
  useEffect(() => {
    if (initialFilters?.industry && industries) {
      const industryIds = industries
        .filter((ind) => initialFilters.industry?.includes(ind.value))
        .map((ind) => ind.industry_id);
      setSelectedIndustries(industryIds);
    }
  }, [initialFilters?.industry, industries]);

  const handleSmartSearch = useCallback(async () => {
    if (!industrySearchQuery.trim() || !industries) return;
    setIsSmartSearching(true);
    try {
      const results = await smartSearchIndustries(industrySearchQuery.trim());
      setSmartSearchResults(results);
      if (results.length > 0) {
        const top3 = results.slice(0, 3);
        const top3Ids = top3
          .map((r) => industries.find((ind) => ind.value === r.value)?.industry_id)
          .filter((id): id is number => id !== undefined);
        setSelectedIndustries((prev) => {
          const newIds = top3Ids.filter((id) => !prev.includes(id));
          return [...prev, ...newIds];
        });
        setSuggestedIndustries(results.slice(3));
      }
    } catch (error) {
      console.error('Smart search failed:', error);
      toast.error('Smart search failed. Please try again.');
    } finally {
      setIsSmartSearching(false);
    }
  }, [industrySearchQuery, industries]);

  useEffect(() => {
    if (!smartSearchEnabled) {
      setIndustrySearchQuery('');
      setSmartSearchResults([]);
      setSuggestedIndustries([]);
    }
  }, [smartSearchEnabled]);

  const handleAddSuggestedIndustry = useCallback(
    (industryValue: string) => {
      if (!industries) return;
      const industry = industries.find((ind) => ind.value === industryValue);
      if (industry && !selectedIndustries.includes(industry.industry_id)) {
        setSelectedIndustries((prev) => [...prev, industry.industry_id]);
        setSuggestedIndustries((prev) => prev.filter((s) => s.value !== industryValue));
      }
    },
    [industries, selectedIndustries]
  );

  const hasActiveFilters = useMemo(
    () =>
      Boolean(
        (companyNameSearch && companyNameSearch.trim()) ||
        selectedCountry ||
        selectedState ||
        selectedCompanySize != null ||
        selectedIndustries.length > 0 ||
        selectedTechnographics.length > 0 ||
        suggestedTechnographics.length > 0
      ),
    [
      companyNameSearch,
      selectedCountry,
      selectedState,
      selectedCompanySize,
      selectedIndustries,
      selectedTechnographics,
      suggestedTechnographics,
    ]
  );

  const handleApplyFilters = useCallback(() => {
    const country = selectedCountry
      ? countries.find((c) => c.code === selectedCountry)?.name
      : null;
    const region =
      selectedState && locationOptions.length > 0
        ? locationOptions.find((l) => l.code === selectedState)?.name
        : null;

    // Get industry values (strings) from selected – these match companies.categories
    const industryValues =
      industries && selectedIndustries.length > 0
        ? industries
            .filter((ind) => selectedIndustries.includes(ind.industry_id))
            .map((ind) => ind.value)
        : [];

    const filters: CompanyFilterFields = {
      name: companyNameSearch?.trim() || undefined,
      country: country || null,
      region: region || null,
      companySize: companySizeRange,
      industry: industryValues.length > 0 ? industryValues : undefined,
      technographic:
        selectedTechnographics.length > 0 || suggestedTechnographics.length > 0
          ? [...selectedTechnographics, ...suggestedTechnographics]
          : undefined,
    };

    if (onFiltersChange) {
      onFiltersChange(filters);
    }
    onFilter(filters);
  }, [
    companyNameSearch,
    selectedCountry,
    selectedState,
    companySizeRange,
    industries,
    selectedIndustries,
    selectedTechnographics,
    suggestedTechnographics,
    onFiltersChange,
    onFilter,
  ]);

  const handleClearFilters = useCallback(() => {
    setCompanyNameSearch('');
    setSelectedCountry(null);
    setSelectedState(null);
    setSelectedCompanySize(null);
    setSelectedIndustries([]);
    setSelectedTechnographics([]);
    setSuggestedTechnographics([]);
    setSmartSearchTechnographics(false);
    setSmartSearchEnabled(false);
    setIndustrySearchQuery('');
    setSmartSearchResults([]);
    setSuggestedIndustries([]);
    onFiltersChange?.({});
    onFilter?.({});
  }, [onFiltersChange, onFilter]);

  if (!open) return null;

  return (
    <Box
      sx={{
        width: { xs: '100%', sm: 340 },
        bgcolor: 'var(--Content-background)',
        borderRight: { xs: 'none', sm: '1px solid var(--joy-palette-divider)' },
        borderBottom: {
          xs: '1px solid var(--joy-palette-divider)',
          sm: 'none',
        },
        display: 'flex',
        flexDirection: 'column',
        minHeight: { xs: 'auto', sm: '66vh' },
        maxHeight: { xs: '100vh', sm: '66vh' },
        boxShadow: { xs: '0px 4px 12px rgba(0, 0, 0, 0.1)', sm: 'none' },
        flexShrink: 0,
        zIndex: { xs: 1300, sm: 1 },
        position: { xs: 'fixed', sm: 'static' },
        top: { xs: 0, sm: 'auto' },
        left: { xs: 0, sm: 'auto' },
        height: { xs: '100vh', sm: '66vh' },
        overflow: 'hidden',
        animation: 'slideInFromLeft 0.3s ease-out',
        padding: { xs: '16px', sm: 0 },
        '@keyframes slideInFromLeft': {
          '0%': {
            transform: 'translateX(-100%)',
            opacity: 0,
          },
          '100%': {
            transform: 'translateX(0)',
            opacity: 1,
          },
        },
      }}
    >
      <Box sx={{ p: { xs: 0, sm: 2 }, pl: { xs: 0, sm: 0 } }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 0.5,
          }}
        >
          <Typography
            fontWeight={600}
            fontSize={16}
            sx={{
              color: 'var(--joy-palette-text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <FunnelIcon size={20} color='var(--joy-palette-text-primary)' />
            Filters
          </Typography>
          <Button
            variant='plain'
            onClick={onClose}
            sx={{
              p: 0,
              minWidth: 'auto',
              color: 'var(--joy-palette-text-secondary)',
              display: 'flex',
              position: 'relative',
              '&:hover': {
                backgroundColor: 'var(--joy-palette-background-level1)',
              },
            }}
          >
            <X size={20} />
          </Button>
        </Box>
        <Typography
          fontSize={12}
          sx={{
            color: 'var(--joy-palette-text-secondary)',
            lineHeight: 1.5,
            fontWeight: 400,
          }}
        >
          Select filters or search for companies.
        </Typography>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        {/* Company name Accordion */}
        <Box
          sx={{
            borderTop: '1px solid var(--joy-palette-divider)',
            borderBottom: companyNameAccordionOpen
              ? '1px solid var(--joy-palette-divider)'
              : 'none',
          }}
        >
          <Box
            onClick={() => setCompanyNameAccordionOpen(!companyNameAccordionOpen)}
            sx={{
              py: 2,
              px: 2,
              minHeight: 48,
              pl: 0,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              cursor: 'pointer',
              position: 'relative',
              borderBottom: !companyNameAccordionOpen
                ? '1px solid var(--joy-palette-divider)'
                : 'none',
            }}
          >
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Building
                  size={20}
                  color={
                    companyNameSearch?.trim()
                      ? 'var(--joy-palette-primary-500)'
                      : 'var(--joy-palette-text-primary)'
                  }
                />
                <Typography
                  fontWeight={500}
                  fontSize={14}
                  sx={{
                    color: companyNameSearch?.trim()
                      ? 'var(--joy-palette-primary-500)'
                      : 'var(--joy-palette-text-primary)',
                  }}
                >
                  Company name
                </Typography>
              </Box>
              {!companyNameAccordionOpen && companyNameSearch?.trim() && (
                <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
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
                    <Typography sx={{ fontSize: 12 }}>{companyNameSearch.trim()}</Typography>
                  </Box>
                </Box>
              )}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {!companyNameAccordionOpen && companyNameSearch?.trim() && (
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
                    setCompanyNameSearch('');
                  }}
                >
                  <Typography
                    fontWeight={500}
                    fontSize={12}
                    sx={{ color: 'var(--joy-palette-text-primary)' }}
                  >
                    1
                  </Typography>
                  <Box sx={{ ml: 0.5, display: 'flex', alignItems: 'center' }}>
                    <X size={14} color='var(--joy-palette-text-primary)' />
                  </Box>
                </Box>
              )}
              {companyNameAccordionOpen ? <CaretUp size={16} /> : <CaretDown size={16} />}
            </Box>
          </Box>
          {companyNameAccordionOpen && (
            <Box sx={{ p: 2, pl: 0 }}>
              <FormControl size='sm'>
                <Autocomplete
                  placeholder='Enter company name'
                  value={companyNameSearch}
                  onChange={(_, newValue) => {
                    if (typeof newValue === 'string') {
                      setCompanyNameSearch(newValue);
                    } else if (newValue && typeof newValue === 'object' && 'name' in newValue) {
                      setCompanyNameSearch((newValue as { name: string }).name);
                    }
                  }}
                  onInputChange={(_, newInputValue) => {
                    setCompanyNameSearch(newInputValue);
                  }}
                  options={companyOptions}
                  getOptionLabel={(option) => {
                    if (typeof option === 'string') return option;
                    return option.name ?? '';
                  }}
                  isOptionEqualToValue={(option, value) => {
                    if (typeof option === 'string' && typeof value === 'string')
                      return option === value;
                    if (typeof option === 'object' && typeof value === 'string')
                      return (option as { name?: string }).name === value;
                    if (typeof option === 'object' && typeof value === 'object')
                      return (option as { id?: number }).id === (value as { id?: number }).id;
                    return false;
                  }}
                  loading={isCompaniesSearchLoading}
                  freeSolo
                  slotProps={{
                    input: {
                      placeholder: 'Enter company name',
                    },
                  }}
                />
              </FormControl>
            </Box>
          )}
        </Box>

        {/* Countries Accordion */}
        <Box sx={{ borderBottom: '1px solid var(--joy-palette-divider)' }}>
          <Box
            onClick={() => setGeoAccordionOpen(!geoAccordionOpen)}
            sx={{
              py: 2,
              px: 2,
              minHeight: 48,
              pl: 0,
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
                Location
              </Typography>
            </Box>
            {geoAccordionOpen ? <CaretUp size={16} /> : <CaretDown size={16} />}
          </Box>
          {geoAccordionOpen && (
            <Box sx={{ pb: 2, px: 2, pl: 0 }}>
              <Stack spacing={2}>
                <FormControl size='sm'>
                  <Autocomplete
                    options={countries}
                    getOptionLabel={(option) => option.name}
                    value={countries.find((c) => c.code === selectedCountry) || null}
                    onChange={(_, value) => {
                      setSelectedCountry(value?.code || null);
                      if (!value) setSelectedState(null);
                    }}
                    placeholder='Country'
                    size='sm'
                  />
                </FormControl>
                {showLocationDropdown && (
                  <FormControl size='sm'>
                    <Autocomplete
                      options={locationOptions}
                      getOptionLabel={(option) => option.name}
                      value={locationOptions.find((l) => l.code === selectedState) || null}
                      onChange={(_, value) => setSelectedState(value?.code || null)}
                      placeholder={selectedCountry === 'USA' ? 'State' : 'Province'}
                      size='sm'
                    />
                  </FormControl>
                )}
              </Stack>
            </Box>
          )}
        </Box>

        {/* Company Size Accordion */}
        <Box sx={{ borderBottom: '1px solid var(--joy-palette-divider)' }}>
          <Box
            onClick={() => setCompanySizeAccordionOpen(!companySizeAccordionOpen)}
            sx={{
              py: 2,
              px: 2,
              minHeight: 48,
              pl: 0,
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
                  selectedCompanySize != null
                    ? 'var(--joy-palette-primary-500)'
                    : 'var(--joy-palette-text-primary)'
                }
              />
              <Typography
                fontWeight={500}
                fontSize={14}
                sx={{
                  color:
                    selectedCompanySize != null
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
            <Box sx={{ pb: 2, px: 2, pl: 0 }}>
              {selectedCompanySize != null && companySizes && (
                <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      bgcolor: 'var(--joy-palette-background-level2)',
                      borderRadius: 20,
                      pl: 1.5,
                      pr: 2,
                      py: 0.5,
                      fontSize: 12,
                      height: 28,
                      gap: 0.5,
                    }}
                  >
                    <Typography sx={{ fontSize: 12 }}>
                      {companySizes.find((cs) => cs.company_size_id === selectedCompanySize)
                        ?.value ?? ''}
                    </Typography>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'pointer',
                        ml: 0.5,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCompanySize(null);
                      }}
                      role='button'
                      aria-label='Remove company size'
                    >
                      <X size={14} color='var(--joy-palette-text-primary)' />
                    </Box>
                  </Box>
                </Box>
              )}
              <FormControl size='sm'>
                <Autocomplete
                  options={companySizes || []}
                  getOptionLabel={(option) => option.value}
                  value={
                    companySizes?.find((cs) => cs.company_size_id === selectedCompanySize) ?? null
                  }
                  onChange={(_, value) => {
                    setSelectedCompanySize(value?.company_size_id ?? null);
                  }}
                  placeholder='Select company size'
                  size='sm'
                  disabled={companySizesLoading || !companySizes}
                />
              </FormControl>
            </Box>
          )}
        </Box>

        {/* Industry Accordion with Smart Search */}
        <Box sx={{ borderBottom: '1px solid var(--joy-palette-divider)' }}>
          <Box
            onClick={() => setIndustryAccordionOpen(!industryAccordionOpen)}
            sx={{
              py: 2,
              px: 2,
              minHeight: 48,
              pl: 0,
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
                  Industry
                </Typography>
              </Box>
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
            <Box sx={{ p: 2, pl: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, mt: 1 }}>
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

              {smartSearchEnabled && (
                <FormControl sx={{ mb: 2 }}>
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

              <FormControl sx={{ mb: 1 }}>
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

        {/* Technographics Accordion with Smart search */}
        <Box sx={{ borderBottom: '1px solid var(--joy-palette-divider)' }}>
          <Box
            onClick={() => setTechnographicsAccordionOpen(!technographicsAccordionOpen)}
            sx={{
              py: 2,
              px: 2,
              minHeight: 48,
              pl: 0,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Code
                  size={20}
                  color={
                    selectedTechnographics.length > 0 || suggestedTechnographics.length > 0
                      ? 'var(--joy-palette-primary-500)'
                      : 'var(--joy-palette-text-primary)'
                  }
                />
                <Typography
                  fontWeight={500}
                  fontSize={14}
                  sx={{
                    color:
                      selectedTechnographics.length > 0 || suggestedTechnographics.length > 0
                        ? 'var(--joy-palette-primary-500)'
                        : 'var(--joy-palette-text-primary)',
                  }}
                >
                  Technographics
                </Typography>
              </Box>
              {!technographicsAccordionOpen &&
                (selectedTechnographics.length > 0 || suggestedTechnographics.length > 0) && (
                  <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                    {selectedTechnographics.map((tech) => (
                      <Box
                        key={tech}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          bgcolor: 'var(--joy-palette-primary-100)',
                          borderRadius: 20,
                          px: 1.5,
                          py: 0.5,
                          fontSize: 12,
                          height: 22,
                          gap: 0.5,
                        }}
                      >
                        <Typography sx={{ fontSize: 12, color: 'var(--joy-palette-primary-700)' }}>
                          {tech}
                        </Typography>
                      </Box>
                    ))}
                    {suggestedTechnographics.map((tech) => (
                      <Box
                        key={tech}
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
                        <Typography sx={{ fontSize: 12 }}>{tech}</Typography>
                      </Box>
                    ))}
                  </Box>
                )}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {!technographicsAccordionOpen &&
                (selectedTechnographics.length > 0 || suggestedTechnographics.length > 0) && (
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
                      setSelectedTechnographics([]);
                      setSuggestedTechnographics([]);
                    }}
                  >
                    <Typography
                      fontWeight={500}
                      fontSize={12}
                      sx={{ color: 'var(--joy-palette-text-primary)' }}
                    >
                      {selectedTechnographics.length + suggestedTechnographics.length}
                    </Typography>
                    <Box sx={{ ml: 0.5, display: 'flex', alignItems: 'center' }}>
                      <X size={14} color='var(--joy-palette-text-primary)' />
                    </Box>
                  </Box>
                )}
              {technographicsAccordionOpen ? <CaretUp size={16} /> : <CaretDown size={16} />}
            </Box>
          </Box>
          {technographicsAccordionOpen && (
            <Box sx={{ p: 2, pl: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, mt: 1 }}>
                <Switch
                  checked={smartSearchTechnographics}
                  onChange={() => setSmartSearchTechnographics((v) => !v)}
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

              <FormControl sx={{ mb: 1 }}>
                <FormLabel sx={{ fontWeight: 500, fontSize: 14, mb: 0.5 }}>
                  Technographics
                </FormLabel>
                <Autocomplete
                  multiple
                  disableCloseOnSelect
                  options={technologies}
                  value={selectedTechnographics}
                  onChange={(_, value) => setSelectedTechnographics(value)}
                  sx={{ mb: 1, width: '100%', fontSize: 14 }}
                  slotProps={{
                    input: { placeholder: 'Search technographics' },
                    listbox: { sx: { fontSize: 14 } },
                    option: { sx: { fontSize: 14 } },
                  }}
                  renderTags={() => null}
                />
              </FormControl>

              {(selectedTechnographics.length > 0 || suggestedTechnographics.length > 0) && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                  {selectedTechnographics.map((tech) => (
                    <Box
                      key={tech}
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
                        }}
                      >
                        {tech}
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
                          setSelectedTechnographics((prev) => prev.filter((t) => t !== tech));
                        }}
                      >
                        <X size={14} />
                      </Box>
                    </Box>
                  ))}
                  {suggestedTechnographics.map((tech) => (
                    <Box
                      key={tech}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        bgcolor: 'var(--joy-palette-background-level2)',
                        borderRadius: 20,
                        px: 1.5,
                        py: 0.5,
                        fontSize: 13,
                        gap: 0.5,
                      }}
                    >
                      <Typography sx={{ fontSize: 13 }}>{tech}</Typography>
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
                          setSuggestedTechnographics((prev) => prev.filter((t) => t !== tech));
                        }}
                      >
                        <X size={14} />
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}

              {smartSearchTechnographics && selectedTechnographics.length > 0 && (
                <Box sx={{ mt: 1, mb: 2 }}>
                  <Typography
                    fontSize={15}
                    sx={{ color: 'var(--joy-palette-text-secondary)', mb: 0.5 }}
                  >
                    Also:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {SUGGESTED_TECHNOGRAPHICS.filter(
                      (tech) =>
                        !selectedTechnographics.includes(tech) &&
                        !suggestedTechnographics.includes(tech)
                    ).map((tech) => (
                      <Box
                        key={tech}
                        onClick={() => setSuggestedTechnographics((prev) => [...prev, tech])}
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
                        <Typography sx={{ fontSize: 13 }}>{tech}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Box>

      <Box
        sx={{
          p: { xs: 2, sm: 2 },
          display: 'flex',
          gap: 1,
          justifyContent: 'end',
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
          onClick={handleClearFilters}
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
        <Button
          variant='solid'
          onClick={handleApplyFilters}
          disabled={!hasActiveFilters}
          sx={{
            fontWeight: 500,
            py: { xs: 1, sm: 0.5 },
            minHeight: 30,
            height: 30,
            px: 1.25,
            width: 'fit-content',
          }}
        >
          Apply
        </Button>
      </Box>
    </Box>
  );
}
