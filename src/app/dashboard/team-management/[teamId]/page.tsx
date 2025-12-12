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
import Avatar from '@mui/joy/Avatar';
import Tooltip from '@mui/joy/Tooltip';
import { Popper } from '@mui/base/Popper';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import { DotsThreeVertical } from '@phosphor-icons/react/dist/ssr/DotsThreeVertical';
import { TrashSimple } from '@phosphor-icons/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColorPaletteProp, VariantProp } from '@mui/joy';
import { getTeamById, getTeamMembers, removeTeamMember } from '@/lib/api/teams';
import { paths } from '@/paths';
import { BreadcrumbsItem } from '@/components/core/breadcrumbs-item';
import { BreadcrumbsSeparator } from '@/components/core/breadcrumbs-separator';
import AddUserToTeamModal from '@/components/dashboard/modals/AddUserToTeamModal';
import DeleteDeactivateUserModal from '@/components/dashboard/modals/DeleteItemModal';
import { toast } from '@/components/core/toaster';
import Pagination from '@/components/dashboard/layout/pagination';

export default function Page(): React.JSX.Element {
  const params = useParams();
  const teamId = params.teamId as string;
  const [openAddUserModal, setOpenAddUserModal] = React.useState(false);
  const [openRemoveModal, setOpenRemoveModal] = React.useState(false);
  const [memberToRemove, setMemberToRemove] = React.useState<{
    teamMemberId: string;
    userName: string;
  } | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [anchorEl, setAnchorPopper] = React.useState<null | HTMLElement>(null);
  const [menuRowIndex, setMenuRowIndex] = React.useState<number | null>(null);
  const queryClient = useQueryClient();
  const rowsPerPage = 10;

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

  const { data: teamMembersResponse, isLoading: isMembersLoading } = useQuery({
    queryKey: ['team-members', teamId, currentPage],
    queryFn: async () => {
      const response = await getTeamMembers(teamId, {
        page: currentPage,
        perPage: rowsPerPage,
      });
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    enabled: !!teamId,
  });

  const teamMembersData = React.useMemo(
    () => teamMembersResponse?.data || [],
    [teamMembersResponse]
  );

  const totalPages = teamMembersResponse?.meta?.lastPage || 1;
  const hasResults = teamMembersData.length > 0;

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

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const avatarColors: ColorPaletteProp[] = ['primary', 'neutral', 'danger', 'warning', 'success'];

  const getAvatarProps = (name: string) => {
    const hash = Array.from(name).reduce(
      (acc: number, char: string) => acc + char.charCodeAt(0),
      0
    );
    const colorIndex = hash % avatarColors.length;
    return {
      color: avatarColors[colorIndex],
      variant: 'soft' as VariantProp,
    };
  };

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
          justifyContent='space-between'
          sx={{ alignItems: { xs: 'stretch', sm: 'flex-start' } }}
        >
          <Stack spacing={1} sx={{ flex: '1 1 auto', minWidth: 0, maxWidth: '100%' }}>
            <Typography
              fontSize={{ xs: 'xl3', lg: 'xl4' }}
              level='h1'
              marginBottom={2}
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                minWidth: 0,
              }}
            >
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
              flexShrink: 0,
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
                    teamMembersData.map((member, index) => {
                      const userName = member.user?.full_name || '-';
                      const userEmail = member.user?.email || '-';
                      const roleName =
                        member.user?.role?.display_name || member.user?.role?.name || '-';
                      const userStatus = (member.user as { status?: string })?.status || 'active';
                      const displayName = userName !== '-' ? userName : userEmail;
                      const firstName = member.user?.full_name?.split(' ')[0] || '';
                      const lastName = member.user?.full_name?.split(' ').slice(1).join(' ') || '';

                      return (
                        <tr key={member.team_member_id}>
                          <td>
                            <Stack direction='row' spacing={1} sx={{ alignItems: 'center' }}>
                              <Avatar
                                src={(member.user as { avatar_url?: string })?.avatar_url}
                                sx={{
                                  width: { xs: 24, sm: 28 },
                                  height: { xs: 24, sm: 28 },
                                  fontWeight: 'bold',
                                  fontSize: { xs: '12px', sm: '13px' },
                                }}
                                {...getAvatarProps(
                                  firstName && lastName ? displayName : userEmail || ''
                                )}
                              >
                                {firstName && lastName
                                  ? displayName
                                      .split(' ')
                                      .slice(0, 2)
                                      .map((n: string) => n[0]?.toUpperCase() || '')
                                      .join('')
                                  : typeof userEmail === 'string'
                                    ? (userEmail.split('@')[0] || '').slice(0, 2).toUpperCase()
                                    : '??'}
                              </Avatar>
                              <Typography
                                sx={{
                                  wordBreak: 'break-all',
                                  fontSize: { xs: '12px', sm: '14px' },
                                }}
                              >
                                {userName !== '-' ? userName.slice(0, 85) : userEmail.slice(0, 85)}
                              </Typography>
                              <Tooltip
                                title={userStatus}
                                placement='top'
                                sx={{
                                  background: '#DAD8FD',
                                  color: '#3D37DD',
                                  textTransform: 'capitalize',
                                }}
                              >
                                <Box
                                  sx={{
                                    bgcolor:
                                      userStatus === 'active'
                                        ? '#1A7D36'
                                        : userStatus === 'inactive'
                                          ? '#D3232F'
                                          : '#FAE17D',
                                    borderRadius: '50%',
                                    width: '10px',
                                    minWidth: '10px',
                                    height: '10px',
                                    display: 'inline-block',
                                  }}
                                />
                              </Tooltip>
                            </Stack>
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
                                  handleRemoveMember(member.team_member_id);
                                  handleMenuClose();
                                }}
                                sx={{
                                  padding: { xs: '6px 12px', sm: '8px 16px' },
                                  fontSize: { xs: '12px', sm: '14px' },
                                  fontWeight: '400',
                                  display: 'flex',
                                  alignItems: 'center',
                                  cursor: 'pointer',
                                  color: 'var(--joy-palette-text-primary)',
                                  gap: { xs: '10px', sm: '14px' },
                                  '&:hover': {
                                    backgroundColor: 'var(--joy-palette-background-mainBg)',
                                  },
                                }}
                              >
                                <TrashSimple size={20} />
                                Remove from team
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
