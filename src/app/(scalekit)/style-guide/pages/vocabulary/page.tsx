'use client';

import * as React from 'react';
import Box from '@mui/joy/Box';
import Typography from '@mui/joy/Typography';
import Stack from '@mui/joy/Stack';
import Button from '@mui/joy/Button';
import IconButton from '@mui/joy/IconButton';
import Input from '@mui/joy/Input';
import Select from '@mui/joy/Select';
import Option from '@mui/joy/Option';
import Chip from '@mui/joy/Chip';
import Modal from '@mui/joy/Modal';
import ModalDialog from '@mui/joy/ModalDialog';
import ModalClose from '@mui/joy/ModalClose';
import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';
import Textarea from '@mui/joy/Textarea';
import FormHelperText from '@mui/joy/FormHelperText';
import Table from '@mui/joy/Table';
import { BreadcrumbsItem } from '@/components/core/breadcrumbs-item';
import { BreadcrumbsSeparator } from '@/components/core/breadcrumbs-separator';
import { Breadcrumbs } from '@mui/joy';
import { Plus, PencilSimple, Trash, MagnifyingGlass, Upload, CaretDown, CaretUp, CaretUpDown } from '@phosphor-icons/react/dist/ssr';
import { Popup, PopupContent } from '@/components/core/popup';
import List from '@mui/joy/List';
import ListItem from '@mui/joy/ListItem';
import ListItemButton from '@mui/joy/ListItemButton';
import {
  useVocabularyEntries,
  useCreateVocabularyEntry,
  useUpdateVocabularyEntry,
  useDeleteVocabularyEntry,
} from '@/app/(scalekit)/style-guide/lib/hooks';
import { useActiveStyleGuide } from '@/app/(scalekit)/style-guide/lib/hooks';
import { useUserInfo } from '@/hooks/use-user-info';
import CircularProgress from '@mui/joy/CircularProgress';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createVocabularyEntryPayloadSchema } from '@/app/(scalekit)/style-guide/lib/types/validation';
import type { z } from 'zod';
import Alert from '@mui/joy/Alert';
import { toast } from '@/components/core/toaster';
import { DataTable } from '@/components/core/data-table';
import type { ColumnDef } from '@/components/core/data-table';
import { Pagination } from '@/components/core/pagination';

type FormData = z.infer<typeof createVocabularyEntryPayloadSchema>;

const vocabularyTypeColors: Record<string, 'success' | 'danger' | 'neutral'> = {
  preferred: 'success',
  prohibited: 'danger',
  neutral: 'neutral',
};

// Vocabulary entry type for DataTable
interface VocabularyEntryRow {
  id: string;
  vocabulary_entry_id: string;
  name: string;
  vocabulary_type: 'preferred' | 'prohibited' | 'neutral';
  suggested_replacement: string | null;
  example_usage: string | null;
  created_at: string;
}

export default function VocabularyPage(): React.JSX.Element {
  const { userInfo, isUserLoading } = useUserInfo();
  const customerId = userInfo?.customerId || null;
  const [openModal, setOpenModal] = React.useState(false);
  const [openListModal, setOpenListModal] = React.useState(false);
  const [listModalType, setListModalType] = React.useState<'preferred' | 'prohibited'>('preferred');
  const [listTerms, setListTerms] = React.useState('');
  const [addMenuAnchorEl, setAddMenuAnchorEl] = React.useState<HTMLElement | null>(null);
  const [editingEntry, setEditingEntry] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState<string | null>(null);
  const [sortColumn, setSortColumn] = React.useState<keyof VocabularyEntryRow | null>(null);
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = React.useState(1);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  const { data: activeGuide, isLoading: isLoadingGuide } = useActiveStyleGuide(customerId || '');
  const styleGuideId = activeGuide?.style_guide_id || null;

  const { data: entriesData, isLoading: isLoadingEntries } = useVocabularyEntries(
    styleGuideId
      ? {
          style_guide_id: styleGuideId,
          vocabulary_type: typeFilter ? (typeFilter as 'neutral' | 'preferred' | 'prohibited') : undefined,
        }
      : undefined
  );

  const isLoading = isUserLoading || isLoadingGuide || isLoadingEntries;

  const createMutation = useCreateVocabularyEntry();
  const updateMutation = useUpdateVocabularyEntry();
  const deleteMutation = useDeleteVocabularyEntry();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(createVocabularyEntryPayloadSchema),
    defaultValues: {
      style_guide_id: styleGuideId || '',
      name: '',
      vocabulary_type: 'prohibited',
      suggested_replacement: '',
      example_usage: '',
    },
  });

  React.useEffect(() => {
    if (styleGuideId) {
      setValue('style_guide_id', styleGuideId);
    }
  }, [styleGuideId, setValue]);

  const handleOpenCreate = () => {
    setEditingEntry(null);
    reset({
      style_guide_id: styleGuideId || '',
      name: '',
      vocabulary_type: 'prohibited',
      suggested_replacement: '',
      example_usage: '',
    });
    setOpenModal(true);
    setAddMenuAnchorEl(null);
  };

  const handleOpenPreferredList = () => {
    setListModalType('preferred');
    setListTerms('');
    setOpenListModal(true);
    setAddMenuAnchorEl(null);
  };

  const handleOpenProhibitedList = () => {
    setListModalType('prohibited');
    setListTerms('');
    setOpenListModal(true);
    setAddMenuAnchorEl(null);
  };

  const handleCloseListModal = () => {
    setOpenListModal(false);
    setListTerms('');
  };

  const handleSubmitList = async () => {
    if (!listTerms.trim() || !styleGuideId) return;

    // Parse comma-separated list
    const terms = listTerms
      .split(',')
      .map(term => term.trim())
      .filter(term => term.length > 0);

    if (terms.length === 0) {
      toast.error('Please enter at least one term');
      return;
    }

    try {
      // Create all entries
      await Promise.all(
        terms.map(term =>
          createMutation.mutateAsync({
            style_guide_id: styleGuideId,
            name: term,
            vocabulary_type: listModalType,
            suggested_replacement: null,
            example_usage: null,
          })
        )
      );
      toast.success(`Successfully added ${terms.length} ${listModalType} term${terms.length > 1 ? 's' : ''}`);
      handleCloseListModal();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleOpenEdit = (entryId: string) => {
    const entry = entriesData?.data.find((e) => e.vocabulary_entry_id === entryId);
    if (entry) {
      setEditingEntry(entryId);
      reset({
        style_guide_id: entry.style_guide_id || entry.written_style_guide_id,
        name: entry.name,
        vocabulary_type: entry.vocabulary_type,
        suggested_replacement: entry.suggested_replacement || '',
        example_usage: entry.example_usage || '',
      });
      setOpenModal(true);
    }
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setEditingEntry(null);
    reset();
  };

  const onSubmit = async (data: FormData) => {
    try {
      if (editingEntry) {
        await updateMutation.mutateAsync({
          vocabulary_entry_id: editingEntry,
          ...data,
        });
      } else {
        await createMutation.mutateAsync(data);
      }
      handleCloseModal();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDelete = async (entryId: string) => {
    if (window.confirm('Are you sure you want to delete this vocabulary entry?')) {
      await deleteMutation.mutateAsync(entryId);
    }
  };

  const handleImportCSV = () => {
    // TODO: Implement CSV import
    alert('CSV import functionality coming soon');
  };

  const filteredEntries = entriesData?.data.filter((entry) =>
    entry.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.suggested_replacement?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Sort entries
  const sortedEntries = React.useMemo(() => {
    if (!sortColumn) return filteredEntries;

    return [...filteredEntries].sort((a, b) => {
      let aValue: string | number | null;
      let bValue: string | number | null;

      switch (sortColumn) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'vocabulary_type':
          aValue = a.vocabulary_type;
          bValue = b.vocabulary_type;
          break;
        case 'suggested_replacement':
          aValue = a.suggested_replacement?.toLowerCase() || '';
          bValue = b.suggested_replacement?.toLowerCase() || '';
          break;
        case 'created_at':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredEntries, sortColumn, sortDirection]);

  // Paginate entries
  const paginatedEntries = React.useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return sortedEntries.slice(start, end);
  }, [sortedEntries, currentPage, rowsPerPage]);

  // Map entries to DataTable format
  const tableRows: VocabularyEntryRow[] = React.useMemo(
    () =>
      paginatedEntries.map((entry) => ({
        id: entry.vocabulary_entry_id,
        vocabulary_entry_id: entry.vocabulary_entry_id,
        name: entry.name,
        vocabulary_type: entry.vocabulary_type,
        suggested_replacement: entry.suggested_replacement,
        example_usage: entry.example_usage,
        created_at: entry.created_at,
      })),
    [paginatedEntries]
  );

  const totalPages = Math.ceil(sortedEntries.length / rowsPerPage);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter, sortColumn, sortDirection]);

  const handleSort = (column: keyof VocabularyEntryRow) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: keyof VocabularyEntryRow) => {
    if (sortColumn !== column) {
      return <CaretUpDown size={16} style={{ opacity: 0.3 }} />;
    }
    return sortDirection === 'asc' ? <CaretUp size={16} /> : <CaretDown size={16} />;
  };

  // Define columns for DataTable with sortable headers
  const columns: ColumnDef<VocabularyEntryRow>[] = React.useMemo(
    () => [
      {
        name: 'Term',
        width: '200px',
        formatter: (row): React.JSX.Element => (
          <Typography fontWeight="md">{row.name}</Typography>
        ),
      },
      {
        name: 'Type',
        width: '120px',
        formatter: (row): React.JSX.Element => (
          <Chip
            color={vocabularyTypeColors[row.vocabulary_type]}
            size="sm"
            variant="soft"
          >
            {row.vocabulary_type}
          </Chip>
        ),
      },
      {
        name: 'Suggested Replacement',
        width: '200px',
        formatter: (row): React.JSX.Element => (
          <Typography level="body-sm">
            {row.suggested_replacement || '—'}
          </Typography>
        ),
      },
      {
        name: 'Example Usage',
        width: '300px',
        formatter: (row): React.JSX.Element => (
          <Typography
            level="body-sm"
            sx={{
              maxWidth: 300,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {row.example_usage || '—'}
          </Typography>
        ),
      },
      {
        name: 'Created',
        width: '120px',
        formatter: (row): React.JSX.Element => (
          <Typography level="body-sm">
            {new Date(row.created_at).toLocaleDateString()}
          </Typography>
        ),
      },
      {
        name: 'Actions',
        width: '120px',
        hideName: true,
        align: 'right',
        formatter: (row): React.JSX.Element => (
          <Stack direction="row" spacing={1}>
            <IconButton
              size="sm"
              variant="plain"
              color="neutral"
              onClick={() => handleOpenEdit(row.vocabulary_entry_id)}
              aria-label={`Edit ${row.name}`}
            >
              <PencilSimple />
            </IconButton>
            <IconButton
              size="sm"
              variant="plain"
              color="danger"
              onClick={() => handleDelete(row.vocabulary_entry_id)}
              aria-label={`Delete ${row.name}`}
            >
              <Trash />
            </IconButton>
          </Stack>
        ),
      },
    ],
    []
  );

  if (!isLoading && (!customerId || !styleGuideId)) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert color="warning">
          <Typography>Please create a style guide first before managing vocabulary.</Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={3}>
        {/* Breadcrumbs */}
        <Breadcrumbs separator={<BreadcrumbsSeparator />}>
          <BreadcrumbsItem href="/style-guide/">Style Guide</BreadcrumbsItem>
          <Typography>Vocabulary Registry</Typography>
        </Breadcrumbs>

        {/* Page Header */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
        >
          <Stack spacing={1}>
            <Typography level="h1">Vocabulary Registry</Typography>
            <Typography level="body-md" color="neutral">
              Manage preferred/prohibited terms and suggested replacements
            </Typography>
          </Stack>
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startDecorator={<Upload />}
              onClick={handleImportCSV}
              aria-label="Import CSV"
            >
              Import CSV
            </Button>
            <Box sx={{ position: 'relative' }}>
              <Button
                startDecorator={<Plus />}
                endDecorator={<CaretDown />}
                onClick={(e) => setAddMenuAnchorEl(e.currentTarget)}
                aria-label="Add vocabulary term"
              >
                Add Term
              </Button>
              <Popup
                open={!!addMenuAnchorEl}
                anchorEl={addMenuAnchorEl}
                onClose={() => setAddMenuAnchorEl(null)}
                placement="bottom-start"
                sx={{ maxWidth: 'fit-content', width: 'fit-content !important' }}
              >
                <PopupContent sx={{ p: 0.5, width: 'fit-content', minWidth: 'auto' }}>
                  <List sx={{ '--List-padding': 0, '--List-gap': 0.25, width: 'fit-content' }}>
                    <ListItem sx={{ width: 'fit-content' }}>
                      <ListItemButton onClick={handleOpenCreate} sx={{ whiteSpace: 'nowrap' }}>
                        Add A Single Term
                      </ListItemButton>
                    </ListItem>
                    <ListItem sx={{ width: 'fit-content' }}>
                      <ListItemButton onClick={handleOpenPreferredList} sx={{ whiteSpace: 'nowrap' }}>
                        Add Preferred List
                      </ListItemButton>
                    </ListItem>
                    <ListItem sx={{ width: 'fit-content' }}>
                      <ListItemButton onClick={handleOpenProhibitedList} sx={{ whiteSpace: 'nowrap' }}>
                        Add Prohibited List
                      </ListItemButton>
                    </ListItem>
                  </List>
                </PopupContent>
              </Popup>
            </Box>
          </Stack>
        </Stack>

        {/* Filters */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Input
            startDecorator={<MagnifyingGlass />}
            placeholder="Search vocabulary..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ flex: 1 }}
            aria-label="Search vocabulary"
          />
          <Select
            value={typeFilter || ''}
            onChange={(_event, value) => setTypeFilter(value || null)}
            placeholder="All Types"
            sx={{ minWidth: 150 }}
            aria-label="Filter vocabulary by type"
          >
            <Option value="">All Types</Option>
            <Option value="preferred">Preferred</Option>
            <Option value="prohibited">Prohibited</Option>
            <Option value="neutral">Neutral</Option>
          </Select>
          <Select
            value={rowsPerPage.toString()}
            onChange={(_event, value) => {
              setRowsPerPage(Number(value) || 10);
              setCurrentPage(1);
            }}
            sx={{ minWidth: 120 }}
            aria-label="Rows per page"
          >
            <Option value="10">10 per page</Option>
            <Option value="25">25 per page</Option>
            <Option value="50">50 per page</Option>
            <Option value="100">100 per page</Option>
          </Select>
        </Stack>

        {/* Table */}
        {isLoading || isLoadingEntries ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : sortedEntries.length === 0 ? (
          <Box sx={{ textAlign: 'center', p: 4 }}>
            <Typography level="body-md" color="neutral">
              {searchQuery || typeFilter
                ? 'No entries match your filters'
                : 'No vocabulary entries yet'}
            </Typography>
          </Box>
        ) : (
          <Stack spacing={2}>
            <Box sx={{ overflowX: 'auto' }}>
              <Table borderAxis="header" hoverRow stripe="even">
                <thead>
                  <tr>
                    {columns.map((column, colIndex) => {
                      // Map column names to actual row keys
                      const columnKeyMap: Record<string, keyof VocabularyEntryRow> = {
                        'Term': 'name',
                        'Type': 'vocabulary_type',
                        'Suggested Replacement': 'suggested_replacement',
                        'Created': 'created_at',
                      };
                      const columnKey = columnKeyMap[column.name];
                      const isSortable = columnKey !== undefined;
                      const isSorted = sortColumn === columnKey;
                      
                      return (
                        <th
                          key={column.name}
                          style={{
                            width: column.width,
                            minWidth: column.width,
                            maxWidth: column.width,
                            ...(column.align && { textAlign: column.align }),
                            ...(isSortable && {
                              cursor: 'pointer',
                              userSelect: 'none',
                            }),
                          }}
                          onClick={() => {
                            if (isSortable && columnKey) {
                              handleSort(columnKey);
                            }
                          }}
                        >
                          <Stack
                            direction="row"
                            spacing={0.5}
                            alignItems="center"
                            sx={{
                              ...(isSortable && {
                                '&:hover': {
                                  opacity: 0.8,
                                },
                              }),
                            }}
                          >
                            <span>{column.hideName ? null : column.name}</span>
                            {isSortable && columnKey && getSortIcon(columnKey)}
                          </Stack>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row, index) => (
                    <tr key={row.id}>
                      {columns.map((column) => (
                        <td
                          key={column.name}
                          style={{ ...(column.align && { textAlign: column.align }) }}
                        >
                          {column.formatter
                            ? column.formatter(row, index)
                            : column.field
                              ? row[column.field]
                              : null}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Box>
            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', pt: 2 }}>
                <Pagination
                  count={totalPages}
                  page={currentPage}
                  onChange={(_event, value) => setCurrentPage(value || 1)}
                  showFirstButton
                  showLastButton
                  size="sm"
                  variant="outlined"
                />
              </Box>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1 }}>
              <Typography level="body-sm" color="neutral">
                Showing {tableRows.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1}-
                {Math.min(currentPage * rowsPerPage, sortedEntries.length)} of {sortedEntries.length} entries
              </Typography>
            </Box>
          </Stack>
        )}
      </Stack>

      {/* Add List Modal */}
      <Modal open={openListModal} onClose={handleCloseListModal}>
        <ModalDialog
          role="dialog"
          aria-modal="true"
          aria-labelledby="vocabulary-list-modal-title"
          sx={{ minWidth: 600 }}
        >
          <ModalClose />
          <Typography id="vocabulary-list-modal-title" level="h2">
            Add {listModalType === 'preferred' ? 'Preferred' : 'Prohibited'} List
          </Typography>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <FormControl>
              <FormLabel>
                {listModalType === 'preferred' ? 'Preferred' : 'Prohibited'} Terms (comma-separated) *
              </FormLabel>
              <Textarea
                value={listTerms}
                onChange={(e) => setListTerms(e.target.value)}
                placeholder="Enter terms separated by commas, e.g., term1, term2, term3"
                minRows={5}
                aria-label={`${listModalType === 'preferred' ? 'Preferred' : 'Prohibited'} terms`}
              />
              <FormHelperText>
                Enter multiple terms separated by commas. Each term will be created as a separate vocabulary entry.
              </FormHelperText>
            </FormControl>

            <Stack direction="row" spacing={2} sx={{ justifyContent: 'flex-end' }}>
              <Button variant="outlined" onClick={handleCloseListModal}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmitList}
                loading={createMutation.isPending}
                disabled={!listTerms.trim()}
              >
                Add {listModalType === 'preferred' ? 'Preferred' : 'Prohibited'} Terms
              </Button>
            </Stack>
          </Stack>
        </ModalDialog>
      </Modal>

      {/* Create/Edit Modal */}
      <Modal open={openModal} onClose={handleCloseModal}>
        <ModalDialog
          role="dialog"
          aria-modal="true"
          aria-labelledby="vocabulary-entry-modal-title"
          sx={{ minWidth: 600 }}
        >
          <ModalClose />
          <Typography id="vocabulary-entry-modal-title" level="h2">
            {editingEntry ? 'Edit Vocabulary Entry' : 'Add Vocabulary Entry'}
          </Typography>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Stack spacing={3} sx={{ mt: 2 }}>
              <FormControl error={!!errors.name} required>
                <FormLabel>Term *</FormLabel>
                <Input
                  {...register('name')}
                  placeholder="Enter term or phrase"
                  aria-label="Vocabulary term"
                  aria-describedby={errors.name ? 'name-error' : undefined}
                  aria-required="true"
                />
                {errors.name && (
                  <FormHelperText id="name-error">{errors.name.message}</FormHelperText>
                )}
              </FormControl>

              <FormControl error={!!errors.vocabulary_type} required>
                <FormLabel>Type *</FormLabel>
                <Select
                  value={watch('vocabulary_type')}
                  onChange={(_event, value) =>
                    setValue('vocabulary_type', (value || 'prohibited') as 'neutral' | 'preferred' | 'prohibited')
                  }
                  aria-label="Vocabulary type"
                  aria-required="true"
                >
                  <Option value="preferred">Preferred</Option>
                  <Option value="prohibited">Prohibited</Option>
                  <Option value="neutral">Neutral</Option>
                </Select>
                {errors.vocabulary_type && (
                  <FormHelperText>{errors.vocabulary_type.message}</FormHelperText>
                )}
              </FormControl>

              <FormControl error={!!errors.suggested_replacement}>
                <FormLabel>Suggested Replacement</FormLabel>
                <Input
                  {...register('suggested_replacement')}
                  placeholder="Enter suggested replacement"
                  aria-label="Suggested replacement"
                />
              </FormControl>

              <FormControl error={!!errors.example_usage}>
                <FormLabel>Example Usage</FormLabel>
                <Textarea
                  {...register('example_usage')}
                  placeholder="Enter example usage"
                  minRows={3}
                  aria-label="Example usage"
                />
              </FormControl>

              <Stack direction="row" spacing={2} sx={{ justifyContent: 'flex-end' }}>
                <Button variant="outlined" onClick={handleCloseModal}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={isSubmitting || createMutation.isPending || updateMutation.isPending}
                >
                  {editingEntry ? 'Update' : 'Create'}
                </Button>
              </Stack>
            </Stack>
          </form>
        </ModalDialog>
      </Modal>
    </Box>
  );
}

