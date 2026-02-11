'use client';

import * as React from 'react';
import { useCallback, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/core/toaster';
import DeleteItemModal from '@/components/dashboard/modals/DeleteItemModal';
import { PopperMenu, MenuItem } from '@/components/core/popper-menu';
import Box from '@mui/joy/Box';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import Table from '@mui/joy/Table';
import Checkbox from '@mui/joy/Checkbox';
import CircularProgress from '@mui/joy/CircularProgress';
import Alert from '@mui/joy/Alert';
import Button from '@mui/joy/Button';
import IconButton from '@mui/joy/IconButton';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { Check as CheckIcon } from '@phosphor-icons/react/dist/ssr/Check';
import { DotsThreeVertical } from '@phosphor-icons/react/dist/ssr/DotsThreeVertical';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import { Eye as EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';
import { PencilSimple as PencilIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { Copy as CopyIcon } from '@phosphor-icons/react/dist/ssr/Copy';
import { getLists, deleteList, duplicateList } from '../lib/api/segment-lists';
import type { ListForDisplay } from '../lib/types/list';
import { ListType } from '../lib/types/list';
import { paths } from '@/paths';
import Pagination from '@/components/dashboard/layout/pagination';
import CreateListModal from './create-list-modal';
import { TypeListChip } from './type-list-chip';

const ITEMS_PER_PAGE = 12;

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}

export default function ListsPage(): React.JSX.Element {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [rowsToDelete, setRowsToDelete] = useState<string[]>([]);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [menuRowIndex, setMenuRowIndex] = useState<number | null>(null);

  const {
    data: listsResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['lists', currentPage],
    queryFn: () =>
      getLists({
        page: currentPage,
        perPage: ITEMS_PER_PAGE,
      }),
    refetchOnWindowFocus: true,
  });

  const lists = listsResponse?.data ?? [];
  const totalPages = listsResponse?.meta?.lastPage ?? 1;

  const handleRowClick = (list: ListForDisplay) => {
    if (list.list_type === ListType.SEGMENT) {
      router.push(paths.strategyForge.segments.details(list.list_id));
    } else {
      router.push(paths.strategyForge.lists.details(list.list_id));
    }
  };

  const handleCloseCreateModal = useCallback(() => setCreateModalOpen(false), []);

  const hasResults = lists.length > 0;

  const handleRowCheckboxChange = useCallback((listId: string) => {
    setSelectedRows((prev) =>
      prev.includes(listId) ? prev.filter((id) => id !== listId) : [...prev, listId]
    );
  }, []);

  const handleSelectAllChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!hasResults) return;
      if (event.target.checked) {
        setSelectedRows(lists.map((list) => list.list_id));
      } else {
        setSelectedRows([]);
      }
    },
    [hasResults, lists]
  );

  const confirmDelete = useCallback(async () => {
    if (rowsToDelete.length === 0) return;
    try {
      for (const listId of rowsToDelete) {
        await deleteList(listId);
      }
      await queryClient.invalidateQueries({ queryKey: ['lists'] });
      toast.success(
        rowsToDelete.length === 1 ? 'List deleted' : `${rowsToDelete.length} lists deleted`
      );
      setOpenDeleteModal(false);
      setRowsToDelete([]);
      setSelectedRows([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete list(s)');
      setOpenDeleteModal(false);
      setRowsToDelete([]);
      setSelectedRows([]);
    }
  }, [rowsToDelete, queryClient]);

  const handleMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>, index: number) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setMenuRowIndex(index);
  }, []);

  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
    setMenuRowIndex(null);
  }, []);

  const handleDeleteList = useCallback(
    (listId: string) => {
      setRowsToDelete([listId]);
      setOpenDeleteModal(true);
      handleMenuClose();
    },
    [handleMenuClose]
  );

  const duplicateMutation = useMutation({
    mutationFn: duplicateList,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      toast.success('List duplicated');
      handleMenuClose();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to duplicate list');
      handleMenuClose();
    },
  });

  React.useEffect(() => {
    setSelectedRows([]);
  }, [currentPage]);

  if (error) {
    return (
      <Box sx={{ p: { xs: 2, sm: 'var(--Content-padding)' } }}>
        <Stack spacing={3}>
          <Alert color='danger'>
            <Typography level='body-md'>
              Failed to load lists: {error instanceof Error ? error.message : 'Unknown error'}
            </Typography>
          </Alert>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 'var(--Content-padding)' } }}>
      <Stack spacing={{ xs: 2, sm: 3 }} sx={{ mt: { xs: 0, sm: 0 } }}>
        <Stack
          direction={{ xs: 'row', sm: 'row' }}
          spacing={{ xs: 2, sm: 3 }}
          sx={{
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Stack spacing={1} sx={{ flex: '1 1 auto' }}>
            <Typography
              fontSize={{ xs: 'xl2', sm: 'xl3' }}
              level='h1'
              sx={{ wordBreak: 'break-word' }}
            >
              Lists{' '}
              <Typography
                level='body-sm'
                sx={{ fontSize: { xs: 'xl2', sm: 'xl3' }, color: '#3D37DD' }}
              >
                {listsResponse?.meta?.total ?? 0}
              </Typography>
            </Typography>
          </Stack>
          <Stack
            direction='row'
            spacing={{ xs: 1, sm: 2 }}
            sx={{ alignItems: 'center', flexShrink: 0 }}
          >
            {selectedRows.length > 0 ? (
              <Box
                sx={{
                  borderRight: { xs: 'none', sm: '1px solid #E5E7EB' },
                  borderBottom: { xs: '1px solid #E5E7EB', sm: 'none' },
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: { xs: 'space-between', sm: 'flex-start' },
                  padding: { xs: '8px 0', sm: '0 16px 0 0' },
                  gap: { xs: 1, sm: '12px' },
                  flexWrap: 'wrap',
                }}
              >
                <Typography level='body-sm'>
                  {selectedRows.length} row{selectedRows.length !== 1 ? 's' : ''} selected
                </Typography>
                <IconButton
                  onClick={() => {
                    setRowsToDelete(selectedRows);
                    setOpenDeleteModal(true);
                  }}
                  sx={{
                    bgcolor: '#FEE2E2',
                    color: '#EF4444',
                    borderRadius: '50%',
                    width: { xs: 28, sm: 32 },
                    height: { xs: 28, sm: 32 },
                    '&:hover': { bgcolor: '#FECACA' },
                  }}
                >
                  <TrashIcon fontSize='var(--Icon-fontSize)' />
                </IconButton>
              </Box>
            ) : null}
            <Button
              variant='solid'
              color='primary'
              onClick={() => setCreateModalOpen(true)}
              startDecorator={<PlusIcon fontSize='var(--Icon-fontSize)' />}
              sx={{
                width: { xs: 38, sm: 'auto' },
                height: { xs: 38, sm: 'auto' },
                minWidth: { xs: 38, sm: 'auto' },
                py: { xs: 0, sm: 0.75 },
                px: { xs: 0, sm: 1 },
                '& .MuiButton-startDecorator': {
                  margin: { xs: 0, sm: '0 8px 0 0' },
                },
              }}
            >
              <Box component='span' sx={{ display: { xs: 'none', sm: 'inline' } }}>
                Create new list
              </Box>
            </Button>
          </Stack>
        </Stack>

        {isLoading ? (
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
        ) : lists.length > 0 ? (
          <>
            <Box sx={{ mt: 2 }}>
              <Box
                sx={{
                  overflowX: 'auto',
                  width: '100%',
                  WebkitOverflowScrolling: 'touch',
                  scrollbarWidth: { xs: 'thin', sm: 'auto' },
                  '&::-webkit-scrollbar': {
                    height: { xs: '8px', sm: '12px' },
                  },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: 'var(--joy-palette-divider)',
                    borderRadius: '4px',
                  },
                  minWidth: 0,
                  borderRadius: '8px',
                  border: '1px solid var(--joy-palette-divider)',
                  backgroundColor: 'var(--joy-palette-background-surface)',
                  outline: 'none',
                }}
              >
                <Table
                  aria-label='lists table'
                  sx={{
                    width: '100%',
                    '& thead th': {
                      fontWeight: 600,
                      fontSize: '14px',
                      color: 'var(--joy-palette-text-secondary)',
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      backgroundColor: '#F8FAFC',
                      padding: '8px',
                    },
                    '& tbody tr': {
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: 'var(--joy-palette-background-level1)',
                      },
                      '&:not(:last-child)': {
                        borderBottom: '1px solid #E5E7EB',
                      },
                    },
                    '& tbody td': {
                      fontSize: '14px',
                      padding: '8px',
                      verticalAlign: 'middle',
                      color: 'var(--joy-palette-text-secondary)',
                      fontWeight: 300,
                    },
                  }}
                >
                  <thead>
                    <tr>
                      <th style={{ width: 50, padding: '8px' }}>
                        <Checkbox
                          checked={hasResults && selectedRows.length === lists.length}
                          indeterminate={
                            hasResults &&
                            selectedRows.length > 0 &&
                            selectedRows.length < lists.length
                          }
                          onChange={handleSelectAllChange}
                          disabled={!hasResults}
                          size='sm'
                          sx={{ p: 0 }}
                        />
                      </th>
                      <th style={{ width: '25%', textAlign: 'left' }}>Name</th>
                      <th style={{ width: '15%', textAlign: 'left' }}>Type</th>
                      <th style={{ width: '10%', textAlign: 'left' }}>Is static</th>
                      <th style={{ width: '20%', textAlign: 'left' }}>Last updated</th>
                      <th style={{ width: '20%', textAlign: 'left' }}>Owner</th>
                      <th style={{ width: 60 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {lists.map((list, index) => (
                      <tr
                        key={list.list_id}
                        onClick={() => handleRowClick(list)}
                        role='button'
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleRowClick(list);
                          }
                        }}
                      >
                        <td style={{ padding: '8px' }}>
                          <Checkbox
                            size='sm'
                            checked={selectedRows.includes(list.list_id)}
                            onChange={(event) => {
                              event.stopPropagation();
                              handleRowCheckboxChange(list.list_id);
                            }}
                            onClick={(event) => event.stopPropagation()}
                            sx={{ p: 0 }}
                          />
                        </td>
                        <td style={{ textAlign: 'left' }}>
                          <Typography
                            level='body-sm'
                            sx={{
                              fontWeight: 300,
                              color: 'var(--joy-palette-text-secondary)',
                              whiteSpace: 'wrap',
                              wordBreak: 'break-word',
                            }}
                          >
                            {list.name || '—'}
                          </Typography>
                        </td>
                        <td style={{ textAlign: 'left' }}>
                          <TypeListChip type={list.subtype} />
                        </td>
                        <td style={{ textAlign: 'left' }}>
                          {list.is_static ? (
                            <Box
                              sx={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 24,
                                height: 24,
                                borderRadius: '50%',
                                border: '1px solid #22c55e',
                                backgroundColor: 'transparent',
                              }}
                            >
                              <CheckIcon size={16} color='#22c55e' weight='bold' />
                            </Box>
                          ) : null}
                        </td>
                        <td style={{ textAlign: 'left' }}>
                          <Typography level='body-sm'>{formatDate(list.updated_at)}</Typography>
                        </td>
                        <td style={{ textAlign: 'left' }}>
                          <Typography
                            level='body-sm'
                            sx={{
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {list.owner_name ?? '—'}
                          </Typography>
                        </td>
                        <td>
                          <IconButton
                            size='sm'
                            onClick={(e) => handleMenuOpen(e, index)}
                            sx={{ '--Icon-button-size': '32px' }}
                          >
                            <DotsThreeVertical
                              weight='bold'
                              size={22}
                              color='var(--joy-palette-text-secondary)'
                            />
                          </IconButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Box>
            </Box>
            <PopperMenu
              open={menuRowIndex !== null && Boolean(anchorEl)}
              anchorEl={anchorEl}
              onClose={handleMenuClose}
              placement='bottom-start'
              minWidth='150px'
              style={{ boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)' }}
            >
              {(() => {
                const list = menuRowIndex !== null ? lists[menuRowIndex] : undefined;
                if (!list) return null;
                return (
                  <>
                    <MenuItem
                      icon={<EyeIcon size={20} />}
                      onClick={() => {
                        router.push(paths.strategyForge.lists.details(list.list_id));
                        handleMenuClose();
                      }}
                    >
                      View list
                    </MenuItem>
                    <MenuItem
                      icon={<PencilIcon size={20} />}
                      onClick={() => {
                        router.push(paths.strategyForge.lists.edit(list.list_id));
                        handleMenuClose();
                      }}
                    >
                      Edit
                    </MenuItem>
                    <MenuItem
                      icon={<CopyIcon size={20} />}
                      onClick={() => {
                        handleMenuClose();
                        duplicateMutation.mutate(list.list_id);
                      }}
                    >
                      Duplicate
                    </MenuItem>
                    <MenuItem
                      icon={<TrashIcon size={20} />}
                      danger
                      onClick={() => handleDeleteList(list.list_id)}
                    >
                      Delete list
                    </MenuItem>
                  </>
                );
              })()}
            </PopperMenu>
          </>
        ) : (
          <Box sx={{ textAlign: 'center', mt: 20 }}>
            <Typography
              sx={{
                fontSize: '24px',
                fontWeight: '600',
                color: 'var(--joy-palette-text-primary)',
              }}
            >
              No lists yet
            </Typography>
            <Typography
              sx={{
                fontSize: '14px',
                fontWeight: '300',
                color: 'var(--joy-palette-text-secondary)',
                mt: 1,
              }}
            >
              Lists will appear here when created (e.g. segments, territories).
            </Typography>
          </Box>
        )}

        <Pagination
          totalPages={Math.max(1, totalPages)}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          disabled={isLoading}
        />

        <CreateListModal open={createModalOpen} onClose={handleCloseCreateModal} />
        <DeleteItemModal
          open={openDeleteModal}
          onClose={() => {
            setOpenDeleteModal(false);
            setRowsToDelete([]);
          }}
          onConfirm={confirmDelete}
          title='Delete list(s)'
          description={
            rowsToDelete.length === 1
              ? 'Are you sure you want to delete this list?'
              : `Are you sure you want to delete ${rowsToDelete.length} lists?`
          }
        />
      </Stack>
    </Box>
  );
}
