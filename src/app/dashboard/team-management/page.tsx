'use client';

import * as React from 'react';
import { useCallback } from 'react';
import Box from '@mui/joy/Box';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import Button from '@mui/joy/Button';
import Table from '@mui/joy/Table';
import IconButton from '@mui/joy/IconButton';
import CircularProgress from '@mui/joy/CircularProgress';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { PencilSimple as PencilIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { DotsThreeVertical } from '@phosphor-icons/react/dist/ssr/DotsThreeVertical';
import { TrashSimple } from '@phosphor-icons/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Popper } from '@mui/base/Popper';
import { useRouter } from 'next/navigation';
import { getTeams, deleteTeam } from '@/lib/api/teams';
import { useUserInfo } from '@/hooks/use-user-info';
import { isSystemAdministrator } from '@/lib/user-utils';
import { authService } from '@/lib/auth/auth-service';
import type { TeamWithRelations } from '@/types/database';
import AddEditTeamModal from '@/components/dashboard/modals/AddEditTeamModal';
import DeleteItemModal from '@/components/dashboard/modals/DeleteItemModal';
import { toast } from '@/components/core/toaster';
import { paths } from '@/paths';
import Pagination from '@/components/dashboard/layout/pagination';

export default function Page(): React.JSX.Element {
  const { userInfo } = useUserInfo();
  const customerId = userInfo?.customerId;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [openAddModal, setOpenAddModal] = React.useState(false);
  const [teamIdToEdit, setTeamIdToEdit] = React.useState<string | undefined>(undefined);
  const [openRemoveModal, setOpenRemoveModal] = React.useState(false);
  const [teamToRemove, setTeamToRemove] = React.useState<{
    teamId: string;
    teamName: string;
  } | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [anchorEl, setAnchorPopper] = React.useState<null | HTMLElement>(null);
  const [menuRowIndex, setMenuRowIndex] = React.useState<number | null>(null);
  const rowsPerPage = 10;

  const isSystemAdmin = isSystemAdministrator(userInfo);

  // Load customer context for system admins
  const { data: context } = useQuery({
    queryKey: ['customer-context'],
    queryFn: async () => {
      if (isSystemAdmin) {
        return await authService.getCurrentContext();
      }
      return null;
    },
    enabled: isSystemAdmin,
  });

  // For system admin, use context customer ID if selected, otherwise undefined (all teams)
  // For non-system admin, use their own customerId
  const teamsCustomerId = React.useMemo(() => {
    if (isSystemAdmin) {
      return context?.customerId || undefined;
    }
    return customerId;
  }, [isSystemAdmin, context?.customerId, customerId]);

  const {
    data: teamsResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['teams', teamsCustomerId, isSystemAdmin, currentPage],
    queryFn: async () => {
      const response = await getTeams(teamsCustomerId, {
        page: currentPage,
        perPage: rowsPerPage,
      });
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    enabled: isSystemAdmin || !!customerId,
  });

  const teams = React.useMemo(() => teamsResponse?.data || [], [teamsResponse]);
  const totalPages = teamsResponse?.meta?.lastPage || 1;
  const hasResults = teams.length > 0;

  const handleAddTeam = useCallback(() => {
    setOpenAddModal(true);
  }, []);

  const handleEdit = useCallback((teamId: string) => {
    setTeamIdToEdit(teamId);
    setOpenAddModal(true);
  }, []);

  const removeTeamMutation = useMutation({
    mutationFn: async (teamId: string) => {
      const response = await deleteTeam(teamId);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Team successfully removed');
      setOpenRemoveModal(false);
      setTeamToRemove(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove team');
    },
  });

  const handleRemove = useCallback(
    (teamId: string) => {
      const team = teams.find((t) => t.team_id === teamId);
      if (team) {
        setTeamToRemove({
          teamId,
          teamName: team.team_name,
        });
        setOpenRemoveModal(true);
      }
    },
    [teams]
  );

  const confirmRemove = useCallback(() => {
    if (teamToRemove) {
      removeTeamMutation.mutate(teamToRemove.teamId);
    }
  }, [teamToRemove, removeTeamMutation]);

  const handleCloseModal = useCallback(() => {
    setOpenAddModal(false);
    setTeamIdToEdit(undefined);
  }, []);

  const handleCloseRemoveModal = useCallback(() => {
    setOpenRemoveModal(false);
    setTeamToRemove(null);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>, index: number) => {
    event.stopPropagation();
    setAnchorPopper(event.currentTarget);
    setMenuRowIndex(index);
  }, []);

  const handleMenuClose = useCallback(() => {
    setAnchorPopper(null);
    setMenuRowIndex(null);
  }, []);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (anchorEl && !anchorEl.contains(event.target as Node)) {
        handleMenuClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [anchorEl, handleMenuClose]);

  const menuItemStyle = {
    padding: { xs: '6px 12px', sm: '8px 16px' },
    fontSize: { xs: '12px', sm: '14px' },
    fontWeight: '400',
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    color: 'var(--joy-palette-text-primary)',
    '&:hover': { backgroundColor: 'var(--joy-palette-background-mainBg)' },
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 'var(--Content-padding)' } }}>
      <Stack spacing={{ xs: 2, sm: 3 }} sx={{ mt: { xs: 6, sm: 0 } }}>
        <Stack
          direction='row'
          spacing={2}
          sx={{
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: { xs: 'wrap', sm: 'nowrap' },
          }}
        >
          <Typography level='h2'>Team Management</Typography>
          <Button
            variant='solid'
            color='primary'
            onClick={handleAddTeam}
            startDecorator={<PlusIcon fontSize='var(--Icon-fontSize)' />}
            sx={{
              width: { xs: '100%', sm: 'auto' },
              py: { xs: 1, sm: 0.75 },
            }}
          >
            Add Team
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
            <CircularProgress size='lg' />
          </Box>
        ) : error ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: { xs: '40vh', sm: '50vh' },
            }}
          >
            <Typography level='body-md' color='danger'>
              {error instanceof Error ? error.message : 'Failed to load teams'}
            </Typography>
          </Box>
        ) : (
          <>
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
              }}
            >
              <Table
                aria-label='team management table'
                sx={{
                  minWidth: '800px',
                  tableLayout: 'fixed',
                  '& th, & td': {
                    px: { xs: 1, sm: 2 },
                    py: { xs: 1, sm: 1.5 },
                  },
                }}
              >
                <thead>
                  <tr>
                    <th style={{ width: isSystemAdmin ? '30%' : '40%' }}>Team</th>
                    {isSystemAdmin && <th style={{ width: '20%' }}>Customer</th>}
                    <th style={{ width: isSystemAdmin ? '15%' : '20%', textAlign: 'center' }}>
                      Users
                    </th>
                    <th style={{ width: isSystemAdmin ? '25%' : '30%' }}>Manager Name</th>
                    <th style={{ width: '10%', textAlign: 'right' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {teams.length === 0 ? (
                    <tr>
                      <td
                        colSpan={isSystemAdmin ? 5 : 4}
                        style={{ textAlign: 'center', padding: '20px' }}
                      >
                        <Typography level='body-md' color='neutral'>
                          No teams found
                        </Typography>
                      </td>
                    </tr>
                  ) : (
                    teams.map((team: TeamWithRelations, index: number) => {
                      const memberCount = team.team_members?.length || 0;
                      const managerName = team.manager?.full_name || '';
                      const customerName = team.customer?.name || '-';

                      return (
                        <tr key={team.team_id}>
                          <td
                            onClick={() =>
                              router.push(paths.dashboard.teamManagement.details(team.team_id))
                            }
                            style={{ cursor: 'pointer' }}
                          >
                            <Typography
                              sx={{
                                fontSize: { xs: '12px', sm: '14px' },
                              }}
                            >
                              {team.team_name}
                            </Typography>
                          </td>
                          {isSystemAdmin && (
                            <td
                              style={{ cursor: 'pointer' }}
                              onClick={() =>
                                router.push(paths.dashboard.teamManagement.details(team.team_id))
                              }
                            >
                              <Typography
                                sx={{
                                  fontSize: { xs: '12px', sm: '14px' },
                                  color: 'var(--joy-palette-text-secondary)',
                                }}
                              >
                                {customerName}
                              </Typography>
                            </td>
                          )}
                          <td
                            style={{ textAlign: 'center', cursor: 'pointer' }}
                            onClick={() =>
                              router.push(paths.dashboard.teamManagement.details(team.team_id))
                            }
                          >
                            <Typography
                              sx={{
                                fontSize: { xs: '12px', sm: '14px' },
                                color: 'var(--joy-palette-text-secondary)',
                              }}
                            >
                              {memberCount}
                            </Typography>
                          </td>
                          <td
                            style={{ cursor: 'pointer' }}
                            onClick={() =>
                              router.push(paths.dashboard.teamManagement.details(team.team_id))
                            }
                          >
                            <Typography
                              sx={{
                                fontSize: { xs: '12px', sm: '14px' },
                                color: 'var(--joy-palette-text-secondary)',
                              }}
                            >
                              {managerName || '-'}
                            </Typography>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <IconButton size='sm' onClick={(event) => handleMenuOpen(event, index)}>
                              <DotsThreeVertical
                                weight='bold'
                                size={22}
                                color='var(--joy-palette-text-secondary)'
                              />
                            </IconButton>
                            <Popper
                              open={menuRowIndex === index && Boolean(anchorEl)}
                              anchorEl={anchorEl}
                              placement='bottom-start'
                              style={{
                                minWidth: '150px',
                                borderRadius: '8px',
                                boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
                                backgroundColor: 'var(--joy-palette-background-surface)',
                                zIndex: 1300,
                                border: '1px solid var(--joy-palette-divider)',
                              }}
                            >
                              <Box
                                onMouseDown={(event) => {
                                  event.preventDefault();
                                  handleEdit(team.team_id);
                                  handleMenuClose();
                                }}
                                sx={{
                                  ...menuItemStyle,
                                  gap: { xs: '10px', sm: '14px' },
                                }}
                              >
                                <PencilIcon fontSize='20px' />
                                Edit
                              </Box>
                              <Box
                                onMouseDown={(event) => {
                                  event.preventDefault();
                                  handleRemove(team.team_id);
                                  handleMenuClose();
                                }}
                                sx={{
                                  ...menuItemStyle,
                                  gap: { xs: '10px', sm: '14px' },
                                }}
                              >
                                <TrashSimple size={20} />
                                Delete team
                              </Box>
                            </Popper>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </Table>
            </Box>
            <Pagination
              totalPages={totalPages}
              currentPage={currentPage}
              onPageChange={handlePageChange}
              disabled={!hasResults}
            />
          </>
        )}
      </Stack>
      <AddEditTeamModal open={openAddModal} onClose={handleCloseModal} teamId={teamIdToEdit} />
      <DeleteItemModal
        open={openRemoveModal}
        onClose={handleCloseRemoveModal}
        onConfirm={confirmRemove}
        title='Remove team'
        description={`Are you sure you want to remove the team "${teamToRemove?.teamName || 'this team'}"? All users within this team will be unassigned from the team.`}
      />
    </Box>
  );
}
