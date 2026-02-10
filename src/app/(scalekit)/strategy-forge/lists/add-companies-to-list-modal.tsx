'use client';

import * as React from 'react';
import { useState, useCallback } from 'react';
import Modal from '@mui/joy/Modal';
import ModalDialog from '@mui/joy/ModalDialog';
import ModalClose from '@mui/joy/ModalClose';
import Typography from '@mui/joy/Typography';
import Stack from '@mui/joy/Stack';
import Button from '@mui/joy/Button';
import Autocomplete from '@mui/joy/Autocomplete';
import Box from '@mui/joy/Box';
import Chip from '@mui/joy/Chip';
import CircularProgress from '@mui/joy/CircularProgress';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCompanies } from '../lib/api/companies';
import { addCompaniesToList } from '../lib/api/segment-lists';
import type { CompanyItem } from '../lib/types/company';
import { toast } from '@/components/core/toaster';

interface AddCompaniesToListModalProps {
  open: boolean;
  onClose: () => void;
  listId: string;
  listName: string;
}

type SelectedCompany = { company_id: string; name: string };

export default function AddCompaniesToListModal({
  open,
  onClose,
  listId,
  listName,
}: AddCompaniesToListModalProps): React.JSX.Element {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [selected, setSelected] = useState<SelectedCompany[]>([]);

  const { data: searchData, isLoading: searchLoading } = useQuery({
    queryKey: ['companies-search', searchInput.trim(), 1],
    queryFn: () =>
      getCompanies({
        search: searchInput.trim() || undefined,
        page: 1,
        limit: 25,
      }),
    enabled: open && searchInput.trim().length >= 2,
  });

  const options: CompanyItem[] = searchData?.data ?? [];
  const selectedIds = new Set(selected.map((s) => s.company_id));
  const addableOptions = options.filter((c) => c.company_id && !selectedIds.has(c.company_id));

  const addMutation = useMutation({
    mutationFn: ({ ids }: { ids: string[] }) => addCompaniesToList(listId, { companyIds: ids }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['list', listId] });
      queryClient.invalidateQueries({ queryKey: ['list-companies', listId] });
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      toast.success(
        variables.ids.length === 1
          ? '1 company added to list.'
          : `${variables.ids.length} companies added to list.`
      );
      setSelected([]);
      setSearchInput('');
      onClose();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add companies to list.');
    },
  });

  const handleAddOption = useCallback((company: CompanyItem) => {
    if (!company.company_id) return;
    setSelected((prev) => {
      if (prev.some((s) => s.company_id === company.company_id)) return prev;
      return [...prev, { company_id: company.company_id, name: company.name || '—' }];
    });
  }, []);

  const handleRemoveSelected = useCallback((company_id: string) => {
    setSelected((prev) => prev.filter((s) => s.company_id !== company_id));
  }, []);

  const handleSave = useCallback(() => {
    const ids = selected.map((s) => s.company_id).filter(Boolean);
    if (ids.length === 0) {
      toast.error('Select at least one company.');
      return;
    }
    addMutation.mutate({ ids });
  }, [selected, addMutation]);

  const handleClose = useCallback(() => {
    setSelected([]);
    setSearchInput('');
    onClose();
  }, [onClose]);

  const canSave = selected.length > 0 && !addMutation.isPending;

  return (
    <Modal open={open} onClose={handleClose}>
      <ModalDialog
        sx={{
          maxWidth: 500,
          width: '100%',
          p: 3,
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        }}
      >
        <ModalClose sx={{ color: 'var(--joy-palette-text-tertiary)' }} />
        <Typography level='h4' component='h2' sx={{ mb: 1 }}>
          Add companies to list
        </Typography>
        <Typography level='body-sm' sx={{ color: 'text.secondary', mb: 2 }}>
          {listName}
        </Typography>

        <Stack spacing={2}>
          <Box>
            <Typography
              level='body-sm'
              sx={{
                mb: 1,
                fontWeight: 500,
                color: 'var(--joy-palette-text-primary)',
              }}
            >
              Search and select companies
            </Typography>
            <Autocomplete
              placeholder='Search by company name...'
              inputValue={searchInput}
              onInputChange={(_, value) => setSearchInput(value)}
              value={null}
              onChange={(_, value) => {
                const company = value as CompanyItem | null;
                if (company?.company_id) {
                  handleAddOption(company);
                  setSearchInput('');
                }
              }}
              options={addableOptions}
              getOptionLabel={(option) => option.name || option.company_id || '—'}
              isOptionEqualToValue={(option, value) => option.company_id === value?.company_id}
              loading={searchLoading}
              sx={{ width: '100%' }}
              endDecorator={
                searchLoading ? (
                  <CircularProgress size='sm' sx={{ '--CircularProgress-size': '20px' }} />
                ) : null
              }
            />
          </Box>

          {selected.length > 0 ? (
            <Box>
              <Typography
                level='body-sm'
                sx={{
                  mb: 1,
                  fontWeight: 500,
                  color: 'var(--joy-palette-text-primary)',
                }}
              >
                Selected ({selected.length})
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 0.75,
                  p: 1.5,
                  borderRadius: 'sm',
                  border: '1px solid var(--joy-palette-divider)',
                  maxHeight: 120,
                  overflowY: 'auto',
                }}
              >
                {selected.map((s) => (
                  <Chip
                    key={s.company_id}
                    size='sm'
                    onDelete={() => handleRemoveSelected(s.company_id)}
                    sx={{ maxWidth: '100%' }}
                  >
                    {s.name}
                  </Chip>
                ))}
              </Box>
            </Box>
          ) : null}
        </Stack>

        <Stack direction='row' spacing={2} sx={{ mt: 2, justifyContent: 'flex-end' }}>
          <Button variant='outlined' onClick={handleClose} disabled={addMutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave} loading={addMutation.isPending}>
            Add to list
          </Button>
        </Stack>
      </ModalDialog>
    </Modal>
  );
}
