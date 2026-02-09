'use client';

import * as React from 'react';
import Box from '@mui/joy/Box';
import Button from '@mui/joy/Button';
import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';
import Input from '@mui/joy/Input';
import Option from '@mui/joy/Option';
import Select from '@mui/joy/Select';
import Stack from '@mui/joy/Stack';
import IconButton from '@mui/joy/IconButton';
import Chip from '@mui/joy/Chip';
import { Funnel as FunnelIcon } from '@phosphor-icons/react/dist/ssr/Funnel';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';
import { MagnifyingGlass as SearchIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';

import type { LLMJobStatus, LLMProvider } from '@/types/llm-jobs';

export interface LLMJobsFiltersState {
  status: LLMJobStatus[];
  providerId: string[];
  featureSlug: string[];
  dateFrom: string;
  dateTo: string;
  search: string;
}

interface LLMJobsFiltersProps {
  filters: LLMJobsFiltersState;
  onFilterChange: (filters: LLMJobsFiltersState) => void;
  providers?: LLMProvider[];
  featureSlugs?: string[];
  isLoading?: boolean;
}

const ALL_STATUSES: { value: LLMJobStatus; label: string }[] = [
  { value: 'queued', label: 'Queued' },
  { value: 'running', label: 'Running' },
  { value: 'waiting_llm', label: 'Waiting for LLM' },
  { value: 'retrying', label: 'Retrying' },
  { value: 'completed', label: 'Completed' },
  { value: 'error', label: 'Error' },
  { value: 'exhausted', label: 'Exhausted' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function LLMJobsFilters({
  filters,
  onFilterChange,
  providers = [],
  featureSlugs = [],
}: LLMJobsFiltersProps): React.JSX.Element {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState(filters.search);

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== filters.search) {
        onFilterChange({ ...filters, search: searchValue });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue, filters, onFilterChange]);

  const handleStatusChange = (
    _event: React.SyntheticEvent | null,
    newValue: LLMJobStatus[] | null
  ) => {
    onFilterChange({ ...filters, status: newValue || [] });
  };

  const handleProviderChange = (_event: React.SyntheticEvent | null, newValue: string[] | null) => {
    onFilterChange({ ...filters, providerId: newValue || [] });
  };

  const handleFeatureChange = (_event: React.SyntheticEvent | null, newValue: string[] | null) => {
    onFilterChange({ ...filters, featureSlug: newValue || [] });
  };

  const handleDateFromChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filters, dateFrom: event.target.value });
  };

  const handleDateToChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filters, dateTo: event.target.value });
  };

  const handleClearFilters = () => {
    setSearchValue('');
    onFilterChange({
      status: [],
      providerId: [],
      featureSlug: [],
      dateFrom: '',
      dateTo: '',
      search: '',
    });
  };

  const hasActiveFilters =
    filters.status.length > 0 ||
    filters.providerId.length > 0 ||
    filters.featureSlug.length > 0 ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.search;

  const activeFilterCount =
    (filters.status.length > 0 ? 1 : 0) +
    (filters.providerId.length > 0 ? 1 : 0) +
    (filters.featureSlug.length > 0 ? 1 : 0) +
    (filters.dateFrom ? 1 : 0) +
    (filters.dateTo ? 1 : 0) +
    (filters.search ? 1 : 0);

  return (
    <Box>
      {/* Search and Toggle Row */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{ alignItems: { xs: 'stretch', sm: 'center' }, mb: isExpanded ? 2 : 0 }}
      >
        <FormControl sx={{ flex: 1, maxWidth: { sm: 300 } }}>
          <Input
            placeholder='Search jobs...'
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            startDecorator={<SearchIcon size={18} />}
            endDecorator={
              searchValue ? (
                <IconButton size='sm' variant='plain' onClick={() => setSearchValue('')}>
                  <XIcon size={16} />
                </IconButton>
              ) : null
            }
            sx={{ '--Input-minHeight': '40px' }}
          />
        </FormControl>

        <Button
          variant={isExpanded ? 'soft' : 'outlined'}
          color={hasActiveFilters ? 'primary' : 'neutral'}
          startDecorator={<FunnelIcon size={18} />}
          endDecorator={
            activeFilterCount > 0 ? (
              <Chip size='sm' color='primary'>
                {activeFilterCount}
              </Chip>
            ) : null
          }
          onClick={() => setIsExpanded(!isExpanded)}
          sx={{ minWidth: 'auto' }}
        >
          Filters
        </Button>

        {hasActiveFilters && (
          <Button
            variant='outlined'
            color='neutral'
            startDecorator={<XIcon size={18} />}
            onClick={handleClearFilters}
          >
            Clear
          </Button>
        )}
      </Stack>

      {/* Expanded Filters */}
      {isExpanded && (
        <Box
          sx={{
            p: 2,
            bgcolor: 'var(--joy-palette-background-level1)',
            borderRadius: 'md',
          }}
        >
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ flexWrap: 'wrap' }}>
            {/* Status Filter */}
            <FormControl sx={{ minWidth: 180 }}>
              <FormLabel>Status</FormLabel>
              <Select
                multiple
                value={filters.status}
                onChange={handleStatusChange}
                placeholder='All statuses'
                renderValue={(selected) =>
                  selected.length === 0 ? 'All statuses' : `${selected.length} selected`
                }
                sx={{ minWidth: 180 }}
              >
                {ALL_STATUSES.map((status) => (
                  <Option key={status.value} value={status.value}>
                    {status.label}
                  </Option>
                ))}
              </Select>
            </FormControl>

            {/* Provider Filter */}
            <FormControl sx={{ minWidth: 180 }}>
              <FormLabel>Provider</FormLabel>
              <Select
                multiple
                value={filters.providerId}
                onChange={handleProviderChange}
                placeholder='All providers'
                renderValue={(selected) =>
                  selected.length === 0 ? 'All providers' : `${selected.length} selected`
                }
                sx={{ minWidth: 180 }}
              >
                {providers.map((provider) => (
                  <Option key={provider.id} value={provider.id}>
                    {provider.name}
                  </Option>
                ))}
              </Select>
            </FormControl>

            {/* Feature Filter */}
            {featureSlugs.length > 0 && (
              <FormControl sx={{ minWidth: 180 }}>
                <FormLabel>Feature</FormLabel>
                <Select
                  multiple
                  value={filters.featureSlug}
                  onChange={handleFeatureChange}
                  placeholder='All features'
                  renderValue={(selected) =>
                    selected.length === 0 ? 'All features' : `${selected.length} selected`
                  }
                  sx={{ minWidth: 180 }}
                >
                  {featureSlugs.map((slug) => (
                    <Option key={slug} value={slug}>
                      {slug}
                    </Option>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* Date Range */}
            <FormControl sx={{ minWidth: 150 }}>
              <FormLabel>From</FormLabel>
              <Input
                type='date'
                value={filters.dateFrom}
                onChange={handleDateFromChange}
                sx={{ '--Input-minHeight': '40px' }}
              />
            </FormControl>

            <FormControl sx={{ minWidth: 150 }}>
              <FormLabel>To</FormLabel>
              <Input
                type='date'
                value={filters.dateTo}
                onChange={handleDateToChange}
                sx={{ '--Input-minHeight': '40px' }}
              />
            </FormControl>
          </Stack>
        </Box>
      )}
    </Box>
  );
}
