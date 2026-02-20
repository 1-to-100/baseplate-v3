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
import Input from '@mui/joy/Input';
import Textarea from '@mui/joy/Textarea';
import Tabs from '@mui/joy/Tabs';
import TabList from '@mui/joy/TabList';
import Tab from '@mui/joy/Tab';
import TabPanel from '@mui/joy/TabPanel';
import CircularProgress from '@mui/joy/CircularProgress';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getLists, createList, addCompaniesToList } from '../api/segment-lists';
import type { ListForDisplay } from '../types/list';
import { ListSubtype, DEFAULT_LIST_SUBTYPE } from '../constants/lists';
import { toast } from '@/components/core/toaster';

type TabType = 'select' | 'create';

interface CreateListFormData {
  name: string;
  description: string;
}

export interface AddToListModalProps {
  open: boolean;
  onClose: () => void;
  companyIds: string[];
  /** If set, this list is excluded from the "Select list" options (e.g. when opening from that list's details page). */
  excludeListId?: string;
}

const MIN_NAME_LENGTH = 3;
const MAX_NAME_LENGTH = 100;

export function AddToListModal({
  open,
  onClose,
  companyIds,
  excludeListId,
}: AddToListModalProps): React.JSX.Element {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('select');
  const [selectedList, setSelectedList] = useState<ListForDisplay | null>(null);
  const [createFormData, setCreateFormData] = useState<CreateListFormData>({
    name: '',
    description: '',
  });

  const { data: listsData, isLoading: listsLoading } = useQuery({
    queryKey: ['lists', { perPage: 100 }],
    queryFn: () => getLists({ page: 1, perPage: 100 }),
    enabled: open,
  });

  // Only static lists can receive added companies (dynamic lists are filter-based, no list_company assignments).
  const companyLists: ListForDisplay[] = React.useMemo(() => {
    const base = (listsData?.data ?? []).filter(
      (l) => l.subtype === ListSubtype.COMPANY && l.is_static === true
    );
    if (excludeListId) {
      return base.filter((l) => l.list_id !== excludeListId);
    }
    return base;
  }, [listsData?.data, excludeListId]);

  const addMutation = useMutation({
    mutationFn: ({ listId }: { listId: string }) => addCompaniesToList(listId, { companyIds }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['list', variables.listId] });
      queryClient.invalidateQueries({ queryKey: ['list-companies', variables.listId] });
      toast.success(
        companyIds.length === 1
          ? 'Company added to list.'
          : `${companyIds.length} companies added to list.`
      );
      setSelectedList(null);
      setCreateFormData({ name: '', description: '' });
      onClose();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add to list.');
    },
  });

  const createListMutation = useMutation({
    mutationFn: createList,
    onSuccess: (createdList) => {
      addMutation.mutate({ listId: createdList.list_id });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create list.');
    },
  });

  const handleSave = useCallback(() => {
    if (companyIds.length === 0) {
      toast.error('No companies to add.');
      return;
    }
    if (activeTab === 'select') {
      if (!selectedList?.list_id) {
        toast.error('Please select a list.');
        return;
      }
      addMutation.mutate({ listId: selectedList.list_id });
    } else {
      const trimmedName = createFormData.name.trim();
      if (trimmedName.length < MIN_NAME_LENGTH || trimmedName.length > MAX_NAME_LENGTH) {
        toast.error(
          `List name must be between ${MIN_NAME_LENGTH} and ${MAX_NAME_LENGTH} characters.`
        );
        return;
      }
      createListMutation.mutate({
        name: trimmedName,
        description: createFormData.description.trim() || null,
        subtype: DEFAULT_LIST_SUBTYPE,
        is_static: true,
      });
    }
  }, [activeTab, selectedList, createFormData, companyIds.length, addMutation, createListMutation]);

  const handleClose = useCallback(() => {
    setSelectedList(null);
    setCreateFormData({ name: '', description: '' });
    setActiveTab('select');
    onClose();
  }, [onClose]);

  const isCreateValid =
    createFormData.name.trim().length >= MIN_NAME_LENGTH &&
    createFormData.name.trim().length <= MAX_NAME_LENGTH;
  const canSave =
    companyIds.length > 0 &&
    !addMutation.isPending &&
    !createListMutation.isPending &&
    (activeTab === 'select' ? selectedList != null : isCreateValid);

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
          Add to list
        </Typography>

        <Tabs
          value={activeTab}
          onChange={(_, value) => setActiveTab((value as TabType) ?? 'select')}
          variant='plain'
          sx={{
            mb: 2,
            backgroundColor: 'transparent',
            '& .MuiTabList-root': {
              backgroundColor: 'var(--joy-palette-background-surface)',
              borderRadius: '20px',
              boxShadow: 'none',
              gap: '4px',
              p: '4px',
            },
            '& .MuiTab-root': {
              borderRadius: '20px',
              flex: '1 1 auto',
              '&::after': { display: 'none' },
              color: 'var(--joy-palette-text-secondary)',
              '&.Mui-selected': {
                backgroundColor: '#F5F7F9',
                color: 'var(--joy-palette-text-primary)',
                border: '1px solid #6C63FF',
                boxShadow: 'none',
              },
              '&:not(.Mui-selected)': {
                backgroundColor: 'transparent',
                border: '1px solid transparent',
              },
              '&:not(.Mui-selected):hover': {
                backgroundColor: 'var(--joy-palette-background-level2)',
              },
            },
          }}
        >
          <TabList>
            <Tab value='select'>Select list</Tab>
            <Tab value='create'>Create new one</Tab>
          </TabList>
          <TabPanel value='select' sx={{ p: 0, mt: 2 }}>
            <Box>
              <Typography
                level='body-sm'
                sx={{
                  mb: 1,
                  fontWeight: 500,
                  color: 'var(--joy-palette-text-primary)',
                }}
              >
                List
              </Typography>
              <Autocomplete
                placeholder='Select list'
                value={selectedList}
                onChange={(_, value) => setSelectedList(value as ListForDisplay | null)}
                options={companyLists}
                getOptionLabel={(option) => option.name || option.list_id || '—'}
                isOptionEqualToValue={(option, value) => option.list_id === value?.list_id}
                loading={listsLoading}
                sx={{ width: '100%' }}
                endDecorator={
                  listsLoading ? (
                    <CircularProgress size='sm' sx={{ '--CircularProgress-size': '20px' }} />
                  ) : null
                }
              />
            </Box>
          </TabPanel>
          <TabPanel value='create' sx={{ p: 0, mt: 2 }}>
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
                  Enter name
                </Typography>
                <Input
                  placeholder='Enter name'
                  value={createFormData.name}
                  onChange={(e) => setCreateFormData((prev) => ({ ...prev, name: e.target.value }))}
                  sx={{ width: '100%' }}
                />
              </Box>
              <Box>
                <Typography
                  level='body-sm'
                  sx={{
                    mb: 1,
                    fontWeight: 500,
                    color: 'var(--joy-palette-text-primary)',
                  }}
                >
                  Description
                </Typography>
                <Textarea
                  placeholder='Enter description'
                  value={createFormData.description}
                  onChange={(e) =>
                    setCreateFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  minRows={3}
                  sx={{ width: '100%' }}
                />
              </Box>
            </Stack>
          </TabPanel>
        </Tabs>

        <Stack direction='row' spacing={2} sx={{ mt: 1, justifyContent: 'flex-end' }}>
          <Button
            variant='outlined'
            onClick={handleClose}
            disabled={addMutation.isPending || createListMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!canSave}
            loading={addMutation.isPending || createListMutation.isPending}
          >
            Save to list
          </Button>
        </Stack>
      </ModalDialog>
    </Modal>
  );
}
