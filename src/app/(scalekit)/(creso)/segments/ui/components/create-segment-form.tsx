'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Box from '@mui/joy/Box';
import Stack from '@mui/joy/Stack';
import Button from '@mui/joy/Button';
import Input from '@mui/joy/Input';
import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';
import FormHelperText from '@mui/joy/FormHelperText';
import Autocomplete from '@mui/joy/Autocomplete';
import Typography from '@mui/joy/Typography';
import { useQuery } from '@tanstack/react-query';
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
import { createSegment } from '../../lib/api/segments';
import { countries, usStates, canadianProvinces } from '../../lib/constants/locations';
import { technologies } from '../../lib/constants/technologies';
import { ListType, ListSubtype } from '../../lib/types/list';
import { paths } from '@/paths';

interface CreateSegmentFormProps {
  onSuccess?: (segmentId: string) => void;
  onCancel?: () => void;
}

export function CreateSegmentForm({
  onSuccess,
  onCancel,
}: CreateSegmentFormProps): React.JSX.Element {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
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

  // Fetch options from database
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

  const canSaveSegment = () => {
    return segmentName.trim().length >= 3;
  };

  const saveSegment = async () => {
    if (!canSaveSegment()) {
      toast.error('Please enter a segment name (at least 3 characters)');
      return;
    }

    setIsSubmitting(true);

    try {
      const country = selectedCountry
        ? countries.find((c) => c.code === selectedCountry)?.name
        : null;
      const location =
        selectedState && locationOptions.length > 0
          ? locationOptions.find((l) => l.code === selectedState)?.name
          : null;

      // TODO: Get actual customer_id and user_id from auth context
      const segmentData = {
        name: segmentName,
        customer_id: 'mock-customer-id', // TODO: Replace with actual customer_id
        list_type: ListType.SEGMENT,
        subtype: ListSubtype.COMPANY,
        is_static: false,
        user_id: 'mock-user-id', // TODO: Replace with actual user_id
        description: null,
        filters: {
          country,
          location,
          company_sizes: selectedCompanySizes,
          industries: selectedIndustries,
          technologies: selectedTechnographics,
          personas: selectedPersonas,
        },
      };

      console.log('Creating segment with data:', segmentData);
      const result = await createSegment(segmentData);

      toast.success('Segment created successfully (stub)');

      if (onSuccess) {
        onSuccess(result.list_id);
      } else {
        router.push(paths.dashboard.segments.list);
      }
    } catch (error) {
      console.error('Error creating segment:', error);
      toast.error('Failed to create segment');
    } finally {
      setIsSubmitting(false);
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
          Setup filters to create new segment
        </Typography>
        <Typography level='body-lg' sx={{ color: 'text.secondary', maxWidth: 600 }}>
          Narrow down your audience using filters and save them as a reusable segment.
        </Typography>
      </Box>
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
            onClick={saveSegment}
            disabled={!canSaveSegment() || isSubmitting}
            loading={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save'}
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
