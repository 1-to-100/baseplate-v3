'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import Box from '@mui/joy/Box';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import Button from '@mui/joy/Button';
import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';
import Autocomplete from '@mui/joy/Autocomplete';
import { CaretDown, CaretUp, MapPin, Buildings, Code } from '@phosphor-icons/react/dist/ssr';
import { getIndustries, getCompanySizes } from '../../../segments/lib/api/options';
import { countries, usStates, canadianProvinces } from '../../../segments/lib/constants/locations';
import { technologies } from '../../../segments/lib/constants/technologies';
import type { CompanyFilterFields } from '../../lib/types/company';
import type { OptionIndustry, OptionCompanySize } from '../../../segments/lib/types/company';
import { parseCompanySizeRange } from '../../lib/utils/company-size';

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
  const [selectedCompanySizes, setSelectedCompanySizes] = React.useState<number[]>([]);
  const [selectedIndustries, setSelectedIndustries] = React.useState<number[]>([]);
  const [selectedTechnographics, setSelectedTechnographics] = React.useState<string[]>(
    initialFilters?.technographic || []
  );

  const { data: industries, isLoading: industriesLoading } = useQuery({
    queryKey: ['industries'],
    queryFn: getIndustries,
  });

  const { data: companySizes, isLoading: companySizesLoading } = useQuery({
    queryKey: ['companySizes'],
    queryFn: getCompanySizes,
  });

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

  // Map company size values to IDs from initial filters
  React.useEffect(() => {
    if (initialFilters?.companySize && companySizes) {
      const [min, max] = initialFilters.companySize;
      // Find company sizes that overlap with the selected range
      const matchingSizes = companySizes.filter((cs) => {
        const range = parseCompanySizeRange(cs.value);
        const sizeMin = range.min;
        const sizeMax = range.max ?? Infinity;

        // Check if ranges overlap
        return sizeMin <= (max ?? Infinity) && sizeMax >= min;
      });
      setSelectedCompanySizes(matchingSizes.map((cs) => cs.company_size_id));
    }
  }, [initialFilters?.companySize, companySizes]);

  // Map industry names to IDs
  React.useEffect(() => {
    if (initialFilters?.industry && industries) {
      const industryIds = industries
        .filter((ind) => initialFilters.industry?.includes(ind.value))
        .map((ind) => ind.industry_id);
      setSelectedIndustries(industryIds);
    }
  }, [initialFilters?.industry, industries]);

  const handleApplyFilters = () => {
    const country = selectedCountry
      ? countries.find((c) => c.code === selectedCountry)?.name
      : null;
    const region =
      selectedState && locationOptions.length > 0
        ? locationOptions.find((l) => l.code === selectedState)?.name
        : null;

    // Get company size range from IDs by parsing the string values
    const companySizeRange: [number, number] | undefined =
      companySizes && selectedCompanySizes.length > 0
        ? (() => {
            const selectedSizeObjects = companySizes.filter((cs) =>
              selectedCompanySizes.includes(cs.company_size_id)
            );

            if (selectedSizeObjects.length === 0) return undefined;

            // Parse all selected sizes and find the overall min/max
            const ranges = selectedSizeObjects.map((cs) => parseCompanySizeRange(cs.value));
            const min = Math.min(...ranges.map((r) => r.min));
            const max = Math.max(
              ...ranges.map((r) => r.max ?? Infinity).filter((m) => m !== Infinity)
            );

            // If any range has no max (e.g., "10,001+"), we can't set an upper limit
            // For now, we'll use a large number or handle it in the API
            const hasUnboundedMax = ranges.some((r) => r.max === null);

            if (hasUnboundedMax) {
              // Return a range with a very large max, or handle it differently
              return [min, 999999999] as [number, number];
            }

            return [min, max] as [number, number];
          })()
        : undefined;

    // Get industry names from IDs
    const industryNames =
      industries && selectedIndustries.length > 0
        ? industries
            .filter((ind) => selectedIndustries.includes(ind.industry_id))
            .map((ind) => ind.value)
        : [];

    const filters: CompanyFilterFields = {
      country: country || null,
      region: region || null,
      companySize: companySizeRange,
      industry: industryNames.length > 0 ? industryNames : undefined,
      technographic: selectedTechnographics.length > 0 ? selectedTechnographics : undefined,
    };

    if (onFiltersChange) {
      onFiltersChange(filters);
    }
    onFilter(filters);
  };

  const handleClearFilters = () => {
    setSelectedCountry(null);
    setSelectedState(null);
    setSelectedCompanySizes([]);
    setSelectedIndustries([]);
    setSelectedTechnographics([]);
  };

  if (!open) return null;

  return (
    <Box
      sx={{
        position: { xs: 'fixed', sm: 'relative' },
        top: { xs: 0, sm: 'auto' },
        left: { xs: 0, sm: 'auto' },
        right: { xs: 0, sm: 'auto' },
        bottom: { xs: 0, sm: 'auto' },
        width: { xs: '100%', sm: 320 },
        bgcolor: 'var(--joy-palette-background-surface)',
        borderRight: { xs: 'none', sm: '1px solid var(--joy-palette-divider)' },
        zIndex: { xs: 1300, sm: 'auto' },
        display: 'flex',
        flexDirection: 'column',
        maxHeight: { xs: '100vh', sm: 'auto' },
        overflow: 'hidden',
      }}
    >
      <Box sx={{ p: 2, borderBottom: '1px solid var(--joy-palette-divider)' }}>
        <Stack
          direction='row'
          spacing={2}
          sx={{ alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Typography fontWeight={600} fontSize={16}>
            Filters
          </Typography>
          <Button variant='plain' size='sm' onClick={onClose}>
            Close
          </Button>
        </Stack>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
        {/* Countries Accordion */}
        <Box sx={{ borderBottom: '1px solid var(--joy-palette-divider)' }}>
          <Box
            onClick={() => setGeoAccordionOpen(!geoAccordionOpen)}
            sx={{
              py: 2,
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
            <Box sx={{ pb: 2 }}>
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
                  />
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
        <Box sx={{ borderBottom: '1px solid var(--joy-palette-divider)' }}>
          <Box
            onClick={() => setCompanySizeAccordionOpen(!companySizeAccordionOpen)}
            sx={{
              py: 2,
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
            <Box sx={{ pb: 2 }}>
              <FormControl size='sm'>
                <FormLabel>Employee Range</FormLabel>
                <Autocomplete
                  multiple
                  options={companySizes || []}
                  getOptionLabel={(option) => option.value}
                  value={
                    companySizes?.filter((cs) =>
                      selectedCompanySizes.includes(cs.company_size_id)
                    ) || []
                  }
                  onChange={(_, value) => {
                    setSelectedCompanySizes(value.map((v) => v.company_size_id));
                  }}
                  placeholder='Select company sizes'
                  size='sm'
                  disabled={companySizesLoading || !companySizes}
                />
              </FormControl>
            </Box>
          )}
        </Box>

        {/* Industry Accordion */}
        <Box sx={{ borderBottom: '1px solid var(--joy-palette-divider)' }}>
          <Box
            onClick={() => setIndustryAccordionOpen(!industryAccordionOpen)}
            sx={{
              py: 2,
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
            {industryAccordionOpen ? <CaretUp size={16} /> : <CaretDown size={16} />}
          </Box>
          {industryAccordionOpen && (
            <Box sx={{ pb: 2 }}>
              <FormControl size='sm'>
                <FormLabel>Industries</FormLabel>
                <Autocomplete
                  multiple
                  options={industries || []}
                  getOptionLabel={(option) => option.value}
                  value={
                    industries?.filter((ind) => selectedIndustries.includes(ind.industry_id)) || []
                  }
                  onChange={(_, value) => {
                    setSelectedIndustries(value.map((v) => v.industry_id));
                  }}
                  placeholder='Select industries'
                  size='sm'
                  disabled={industriesLoading || !industries}
                />
              </FormControl>
            </Box>
          )}
        </Box>

        {/* Technographics Accordion */}
        <Box sx={{ borderBottom: '1px solid var(--joy-palette-divider)' }}>
          <Box
            onClick={() => setTechnographicsAccordionOpen(!technographicsAccordionOpen)}
            sx={{
              py: 2,
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
            <Box sx={{ pb: 2 }}>
              <FormControl size='sm'>
                <FormLabel>Technologies</FormLabel>
                <Autocomplete
                  multiple
                  options={technologies}
                  value={selectedTechnographics}
                  onChange={(_, value) => {
                    setSelectedTechnographics(value);
                  }}
                  placeholder='Select technologies'
                  size='sm'
                />
              </FormControl>
            </Box>
          )}
        </Box>
      </Box>

      <Box sx={{ p: 2, borderTop: '1px solid var(--joy-palette-divider)' }}>
        <Stack spacing={2}>
          <Button variant='solid' onClick={handleApplyFilters} fullWidth>
            Apply Filters
          </Button>
          <Button variant='outlined' onClick={handleClearFilters} fullWidth>
            Clear All
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}
