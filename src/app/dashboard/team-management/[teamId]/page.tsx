'use client';

import * as React from 'react';
import { useCallback } from 'react';
import { useParams } from 'next/navigation';
import Box from '@mui/joy/Box';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import Button from '@mui/joy/Button';
import Table from '@mui/joy/Table';
import IconButton from '@mui/joy/IconButton';
import Breadcrumbs from '@mui/joy/Breadcrumbs';
import CircularProgress from '@mui/joy/CircularProgress';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTeamById, getTeamMembers, removeTeamMember } from '@/lib/api/teams';
import { paths } from '@/paths';
import { BreadcrumbsItem } from '@/components/core/breadcrumbs-item';
import { BreadcrumbsSeparator } from '@/components/core/breadcrumbs-separator';
import AddUserToTeamModal from '@/components/dashboard/modals/AddUserToTeamModal';
import DeleteDeactivateUserModal from '@/components/dashboard/modals/DeleteItemModal';
import { toast } from '@/components/core/toaster';

export default function Page(): React.JSX.Element {
  const params = useParams();
  const teamId = params.teamId as string;
  const [openAddUserModal, setOpenAddUserModal] = React.useState(false);
  const [openRemoveModal, setOpenRemoveModal] = React.useState(false);
  const [memberToRemove, setMemberToRemove] = React.useState<{
    teamMemberId: string;
    userName: string;
  } | null>(null);
  const queryClient = useQueryClient();

  const {
    data: teamData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['team', teamId],
    queryFn: async () => {
      const response = await getTeamById(teamId);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    enabled: !!teamId,
  });

  const { data: teamMembersData, isLoading: isMembersLoading } = useQuery({
    queryKey: ['team-members', teamId],
    queryFn: async () => {
      const response = await getTeamMembers(teamId);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data || [];
    },
    enabled: !!teamId,
  });

  const handleAddUser = useCallback(() => {
    setOpenAddUserModal(true);
  }, []);

  const removeMemberMutation = useMutation({
    mutationFn: async (teamMemberId: string) => {
      const response = await removeTeamMember(teamMemberId);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['team-members', teamId] });
      await queryClient.invalidateQueries({ queryKey: ['team', teamId] });
      toast.success('User successfully removed from team');
      setOpenRemoveModal(false);
      setMemberToRemove(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove user from team');
    },
  });

  const handleRemoveMember = useCallback(
    (teamMemberId: string) => {
      const member = teamMembersData?.find((m) => m.team_member_id === teamMemberId);
      if (member) {
        const userName = member.user?.full_name || member.user?.email || 'this user';
        setMemberToRemove({
          teamMemberId,
          userName,
        });
        setOpenRemoveModal(true);
      }
    },
    [teamMembersData]
  );

  const confirmRemove = useCallback(() => {
    if (memberToRemove) {
      removeMemberMutation.mutate(memberToRemove.teamMemberId);
    }
  }, [memberToRemove, removeMemberMutation]);

  const handleCloseAddUserModal = useCallback(() => {
    setOpenAddUserModal(false);
  }, []);

  if (isLoading) {
    return (
      <Box sx={{ p: { xs: 2, sm: 'var(--Content-padding)' } }}>
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
      </Box>
    );
  }

  if (error || !teamData) {
    return (
      <Box sx={{ p: { xs: 2, sm: 'var(--Content-padding)' } }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: { xs: '40vh', sm: '50vh' },
          }}
        >
          <Typography level='body-md' color='danger'>
            {error instanceof Error ? error.message : 'Failed to load team'}
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 'var(--Content-padding)' } }}>
      <Stack spacing={{ xs: 2, sm: 3 }} sx={{ mt: { xs: 6, sm: 0 } }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={3}
          sx={{ alignItems: { xs: 'stretch', sm: 'flex-start' } }}
        >
          <Stack spacing={1} sx={{ flex: '1 1 auto' }}>
            <Typography fontSize={{ xs: 'xl3', lg: 'xl4' }} level='h1' marginBottom={2}>
              {teamData.team_name}
            </Typography>
            <Breadcrumbs separator={<BreadcrumbsSeparator />}>
              <BreadcrumbsItem href={paths.dashboard.teamManagement.list} type='start' />
              <BreadcrumbsItem href={paths.dashboard.teamManagement.list}>
                Team Management
              </BreadcrumbsItem>
              <BreadcrumbsItem type='end'>{teamData.team_name.slice(0, 45)}</BreadcrumbsItem>
            </Breadcrumbs>
          </Stack>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={{ xs: 1, sm: 2 }}
            sx={{
              alignItems: { xs: 'stretch', sm: 'center' },
              width: { xs: '100%', sm: 'auto' },
            }}
          >
            <Button
              variant='solid'
              color='primary'
              onClick={handleAddUser}
              startDecorator={<PlusIcon fontSize='var(--Icon-fontSize)' />}
              sx={{
                width: { xs: '100%', sm: 'auto' },
                py: { xs: 1, sm: 0.75 },
              }}
            >
              Add user
            </Button>
          </Stack>
        </Stack>

        {isMembersLoading ? (
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
        ) : (
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
              aria-label='team members table'
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
                  <th style={{ width: '40%' }}>User Name</th>
                  <th style={{ width: '35%' }}>Email</th>
                  <th style={{ width: '20%' }}>Role</th>
                  <th style={{ width: '5%', textAlign: 'right' }}></th>
                </tr>
              </thead>
              <tbody>
                {!teamMembersData || teamMembersData.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '20px' }}>
                      <Typography level='body-md' color='neutral'>
                        No team members found
                      </Typography>
                    </td>
                  </tr>
                ) : (
                  teamMembersData.map((member) => {
                    const userName = member.user?.full_name || '-';
                    const userEmail = member.user?.email || '-';
                    const roleName =
                      member.user?.role?.display_name || member.user?.role?.name || '-';

                    return (
                      <tr key={member.team_member_id}>
                        <td>
                          <Typography
                            sx={{
                              fontSize: { xs: '12px', sm: '14px' },
                              fontWeight: 500,
                            }}
                          >
                            {userName}
                          </Typography>
                        </td>
                        <td>
                          <Typography
                            sx={{
                              fontSize: { xs: '12px', sm: '14px' },
                              color: 'var(--joy-palette-text-secondary)',
                            }}
                          >
                            {userEmail}
                          </Typography>
                        </td>
                        <td>
                          <Typography
                            sx={{
                              fontSize: { xs: '12px', sm: '14px' },
                              color: 'var(--joy-palette-text-secondary)',
                            }}
                          >
                            {roleName}
                          </Typography>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <IconButton
                            size='sm'
                            variant='plain'
                            color='danger'
                            onClick={(event) => {
                              event.stopPropagation();
                              handleRemoveMember(member.team_member_id);
                            }}
                            sx={{
                              '&:hover': {
                                bgcolor: 'var(--joy-palette-danger-50)',
                              },
                            }}
                          >
                            <TrashIcon fontSize='var(--Icon-fontSize)' />
                          </IconButton>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </Table>
          </Box>
        )}
      </Stack>
      <AddUserToTeamModal
        open={openAddUserModal}
        onClose={handleCloseAddUserModal}
        teamId={teamId}
        customerId={teamData?.customer_id || ''}
      />
      <DeleteDeactivateUserModal
        open={openRemoveModal}
        onClose={() => {
          setOpenRemoveModal(false);
          setMemberToRemove(null);
        }}
        onConfirm={confirmRemove}
        usersToDelete={memberToRemove ? [memberToRemove.userName] : []}
        title='Remove user from team'
        description={`Are you sure you want to remove ${memberToRemove?.userName || 'this user'} from the team?`}
      />
    </Box>
  );
}
