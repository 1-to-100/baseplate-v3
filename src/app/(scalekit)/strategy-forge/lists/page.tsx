'use client';

import * as React from 'react';
import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Box from '@mui/joy/Box';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import Table from '@mui/joy/Table';
import Chip from '@mui/joy/Chip';
import CircularProgress from '@mui/joy/CircularProgress';
import Alert from '@mui/joy/Alert';
import Button from '@mui/joy/Button';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { Check as CheckIcon } from '@phosphor-icons/react/dist/ssr/Check';
import { getLists } from '../lib/api/segment-lists';
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
  const [currentPage, setCurrentPage] = useState(1);
  const [createModalOpen, setCreateModalOpen] = useState(false);

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
                }}
              >
                <Table
                  aria-label='lists table'
                  sx={{
                    width: '100%',
                    tableLayout: 'fixed',
                    '& thead th': {
                      fontWeight: '600',
                      fontSize: '14px',
                      color: 'var(--joy-palette-text-primary)',
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      backgroundColor: 'background.level1',
                      px: { xs: 1, sm: 2 },
                    },
                    '& tbody tr': {
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: 'background.level1',
                      },
                      '&:not(:last-child)': {
                        borderBottom: '1px solid #E5E7EB',
                      },
                    },
                    '& tbody td': {
                      fontSize: '14px',
                      px: { xs: 1, sm: 2 },
                      verticalAlign: 'middle',
                      color: 'var(--joy-palette-text-secondary)',
                      fontWeight: 300,
                    },
                  }}
                >
                  <thead>
                    <tr>
                      <th style={{ width: '35%' }}>Name</th>
                      <th style={{ width: '15%' }}>Type</th>
                      <th style={{ width: '12%' }}>Companies</th>
                      <th style={{ width: '13%' }}>Is static</th>
                      <th style={{ width: '25%' }}>Last updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lists.map((list) => (
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
                        <td style={{ maxWidth: 0, overflow: 'hidden' }}>
                          <Typography
                            level='body-sm'
                            sx={{
                              fontWeight: 300,
                              color: 'var(--joy-palette-text-secondary)',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              wordBreak: 'break-word',
                            }}
                          >
                            {list.name || '—'}
                          </Typography>
                        </td>
                        <td>
                          <TypeListChip type={list.subtype} />
                        </td>
                        <td>
                          <Typography level='body-sm'>
                            {typeof list.company_count === 'number'
                              ? list.company_count.toLocaleString()
                              : '0'}
                          </Typography>
                        </td>
                        <td>
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
                        <td>
                          <Typography level='body-sm'>{formatDate(list.updated_at)}</Typography>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Box>
            </Box>
            {totalPages > 1 && (
              <Pagination
                totalPages={totalPages}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
                disabled={isLoading}
              />
            )}
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

        <CreateListModal open={createModalOpen} onClose={handleCloseCreateModal} />
      </Stack>
    </Box>
  );
}
