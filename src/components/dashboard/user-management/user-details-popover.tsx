'use client';

import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import Sheet from '@mui/joy/Sheet';
import Typography from '@mui/joy/Typography';
import Stack from '@mui/joy/Stack';
import Box from '@mui/joy/Box';
import Avatar from '@mui/joy/Avatar';
import Button from '@mui/joy/Button';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';
import { DotsThreeVertical as DotsIcon } from '@phosphor-icons/react/dist/ssr/DotsThreeVertical';
import { PencilSimple as PencilIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import { Warning as Warning } from '@phosphor-icons/react/dist/ssr/Warning';
import DeleteDeactivateUserModal from '../modals/DeleteItemModal';
import ResetPasswordUserModal from '../modals/ResetPasswordUserModal';
import SuspendUserModal from '../modals/SuspendUserModal';
import AddEditUserModal from '../modals/AddEditUserModal';
import { Popper } from '@mui/base/Popper';
import { ArrowRight as ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight';
import { useColorScheme } from '@mui/joy/styles';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getUserById, updateUser } from '../../../lib/api/users';
import { useImpersonation } from '@/contexts/impersonation-context';
import { useUserInfo } from '@/hooks/use-user-info';
import { isSystemAdministrator, isCustomerSuccess, SYSTEM_ROLES } from '@/lib/user-utils';

interface UserDetailsPopoverProps {
  open: boolean;
  onClose: () => void;
  anchorEl: HTMLElement | null;
  userId: string;
}

const UserDetailsPopover: React.FC<UserDetailsPopoverProps> = ({
  open,
  onClose,
  anchorEl,
  userId,
}) => {
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [openDeactivateModal, setOpenDeactivateModal] = useState(false);
  const [openResetPasswordModal, setOpenResetPasswordModal] = useState(false);
  const [openSuspendModal, setOpenSuspendModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const popperRef = useRef<HTMLDivElement>(null);
  const { colorScheme } = useColorScheme();
  const isLightTheme = colorScheme === 'light';
  const queryClient = useQueryClient();
  const { setImpersonatedUserId, isImpersonating } = useImpersonation();
  const { userInfo } = useUserInfo();

  const { data: userData, isLoading: isUserLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => getUserById(userId),
    enabled: !!userId && open,
  });

  const updateUserMutation = useMutation({
    mutationFn: updateUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
    },
    onError: (error) => {
      console.error('Error updating user:', error);
    },
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popperRef.current &&
        !popperRef.current.contains(event.target as Node) &&
        menuAnchorEl &&
        !menuAnchorEl.contains(event.target as Node)
      ) {
        handleMenuClose();
      }
    };

    if (menuAnchorEl) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      if (menuAnchorEl) {
        document.removeEventListener('mousedown', handleClickOutside);
      }
    };
  }, [menuAnchorEl]);

  const confirmDelete = () => {
    setOpenDeleteModal(false);
    // TODO: Implement delete API call
    onClose();
  };

  const confirmDeactivate = () => {
    setOpenDeactivateModal(false);
    if (userData) {
      updateUserMutation.mutate({ id: userData.id, status: 'inactive' });
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handleEdit = () => {
    setOpenEditModal(true);
    handleMenuClose();
  };

  const handleCloseEditModal = () => {
    setOpenEditModal(false);
  };

  const handleDeactivate = () => {
    setOpenDeactivateModal(true);
    handleMenuClose();
  };

  const handleDelete = () => {
    setOpenDeleteModal(true);
    handleMenuClose();
  };

  const handleResetPassword = () => {
    setOpenResetPasswordModal(true);
    handleMenuClose();
  };

  const handleConfirmSuspend = () => {
    if (userData) {
      updateUserMutation.mutate({ id: userData.id, status: 'inactive' });
      setOpenSuspendModal(false);
    }
  };

  const handleSuspend = () => {
    setOpenSuspendModal(true);
    handleMenuClose();
  };

  const handleImpersonateUser = async () => {
    if (userData) {
      try {
        setImpersonatedUserId(userData.id);
        handleMenuClose();
        onClose();
        // Note: Page reload is handled automatically by the impersonation context after JWT update
      } catch (error) {
        // Error handling is done in ImpersonationContext, but we ensure menu closes
        handleMenuClose();
        onClose();
        console.error('[USER DETAILS] Failed to impersonate user:', error);
      }
    }
  };

  const menuItemStyle = {
    padding: { xs: '6px 12px', sm: '8px 16px' },
    fontSize: { xs: '14px', sm: '16px' },
    fontWeight: '400',
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    color: 'var(--joy-palette-text-primary)',
    '&:hover': { backgroundColor: 'var(--joy-palette-background-level1)' },
  };

  const iconStyle = {
    marginRight: '10px',
    color: 'var(--joy-palette-text-primary)',
  };

  if (!open || !anchorEl || !userId) {
    return null;
  }

  return (
    <>
      <Sheet
        sx={{
          position: { xs: 'fixed', sm: 'absolute' },
          top: { xs: '10%', sm: '18.8%' },
          right: { xs: '5%', sm: '1.5%' },
          width: { xs: '90%', sm: 400, md: 500 },
          maxWidth: '100%',
          borderRadius: '8px',
          boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
          overflow: 'auto',
          maxHeight: { xs: '80vh', sm: '70vh' },
          minHeight: { xs: '80vh', sm: '76vh' },
          zIndex: 1300,
          border: '1px solid var(--joy-palette-divider)',
        }}
      >
        <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
          <Stack
            direction='row'
            spacing={2}
            sx={{
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: { xs: 1, sm: 2 },
              borderBottom: '1px solid var(--joy-palette-divider)',
              paddingBottom: { xs: 1, sm: 2 },
            }}
          >
            <Typography
              level='title-lg'
              sx={{ fontSize: { xs: '18px', sm: '22px', md: '24px' } }}
              fontWeight='600'
            >
              User Details
            </Typography>
            <Stack direction='row' spacing={1}>
              <Button variant='plain' size='sm' onClick={onClose} sx={{ p: { xs: 0.5, sm: 1 } }}>
                <XIcon fontSize='16px' weight='bold' />
              </Button>
            </Stack>
          </Stack>
          <Stack
            direction='column'
            spacing={{ xs: 1.5, sm: 2 }}
            sx={{
              width: '100%',
              borderBottom: '1px solid var(--joy-palette-divider)',
              paddingBottom: { xs: 1, sm: 2 },
              mb: { xs: 1, sm: 2 },
            }}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: { xs: '8px', sm: '16px' },
                  flexDirection: { xs: 'row', sm: 'row' },
                }}
              >
                <Avatar
                  src={userData?.avatar}
                  sx={{
                    width: { xs: 48, sm: 64 },
                    height: { xs: 48, sm: 64 },
                    fontWeight: 'bold',
                    fontSize: '32px',
                  }}
                >
                  {(userData?.firstName?.trim()?.charAt(0) || '').toUpperCase()}
                  {(userData?.lastName?.trim()?.charAt(0) || '').toUpperCase()}
                </Avatar>
                <Stack alignItems={{ xs: 'center', sm: 'flex-start' }}>
                  <Typography
                    level='body-lg'
                    sx={{
                      fontSize: { xs: '16px', sm: '18px' },
                      color: 'var(--joy-palette-text-primary)',
                      wordBreak: 'break-word',
                      whiteSpace: 'normal',
                      maxWidth: '100%',
                      overflowWrap: 'break-word',
                      textOverflow: 'ellipsis',
                    }}
                    fontWeight='600'
                  >
                    {userData?.firstName?.slice(0, 20)} {userData?.lastName?.slice(0, 20)}
                  </Typography>
                  <Typography
                    level='body-sm'
                    sx={{
                      color:
                        userData?.status === 'active'
                          ? '#1A7D36'
                          : userData?.status === 'suspended'
                            ? '#4D2D00'
                            : '#D3232F',
                      bgcolor:
                        userData?.status === 'active'
                          ? '#DCFCE7'
                          : userData?.status === 'suspended'
                            ? '#FFF8C5'
                            : '#FEE2E2',
                      borderRadius: '10px',
                      px: 1,
                      display: 'inline-block',
                      width: 'fit-content',
                      fontSize: { xs: '10px', sm: '12px' },
                      fontWeight: 500,
                    }}
                  >
                    {(userData?.status ?? '').charAt(0).toUpperCase() + userData?.status?.slice(1)}
                  </Typography>
                </Stack>
              </Box>

              <Button
                variant='plain'
                size='sm'
                sx={{
                  color: '#636B74',
                  background: 'transparent',
                  p: 0,
                  '&:hover': {
                    background: 'transparent',
                    opacity: '0.8',
                  },
                }}
                onClick={handleMenuOpen}
              >
                <DotsIcon weight='bold' size={18} color='var(--joy-palette-text-secondary)' />
              </Button>
            </Box>

            {userData?.status === 'suspended' && (
              <Box
                sx={{
                  bgcolor: isLightTheme ? '#FFF8C5' : 'transparent',
                  border: isLightTheme ? 'transparent' : '1px solid #4D2D00',
                  borderRadius: '8px',
                  px: { xs: 1, sm: 2 },
                  py: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                }}
              >
                <Warning size={16} color={isLightTheme ? '#4D2D00' : 'rgb(198, 143, 66)'} />
                <Typography
                  level='body-sm'
                  sx={{
                    fontSize: { xs: '12px', sm: '14px' },
                    color: isLightTheme ? '#4D2D00' : 'rgb(198, 143, 66)',
                    fontWeight: 300,
                  }}
                >
                  Account suspended by suspicious activity
                </Typography>
              </Box>
            )}
          </Stack>
          <Popper
            ref={popperRef}
            anchorEl={menuAnchorEl}
            open={Boolean(menuAnchorEl)}
            placement='bottom-start'
            style={{
              minWidth: '120px',
              borderRadius: '8px',
              boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
              backgroundColor: 'var(--joy-palette-background-surface)',
              zIndex: 1301,
              border: '1px solid var(--joy-palette-divider)',
            }}
          >
            <Box
              onMouseDown={(event) => {
                event.preventDefault();
                handleEdit();
              }}
              sx={menuItemStyle}
            >
              <PencilIcon fontSize='16px' style={iconStyle} />
              Edit
            </Box>
            {userData?.status === 'active' &&
              !isImpersonating &&
              userData.role?.name !== SYSTEM_ROLES.SYSTEM_ADMINISTRATOR &&
              userInfo &&
              (isSystemAdministrator(userInfo) || isCustomerSuccess(userInfo)) && (
                <Box
                  onMouseDown={(event) => {
                    event.preventDefault();
                    handleImpersonateUser();
                  }}
                  sx={menuItemStyle}
                >
                  <ArrowRightIcon fontSize='16px' style={iconStyle} />
                  Impersonate user
                </Box>
              )}
            <Box
              onMouseDown={(event) => {
                event.preventDefault();
                handleDelete();
              }}
              sx={{ ...menuItemStyle, color: '#EF4444' }}
            >
              <TrashIcon fontSize='16px' style={iconStyle} />
              Delete
            </Box>
          </Popper>
          <Stack spacing={{ xs: 1, sm: 2 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Typography
                level='body-sm'
                fontWeight='300'
                sx={{
                  color: '#636B74',
                  width: { xs: '100%', sm: '100px' },
                  fontSize: { xs: '12px', sm: '14px' },
                }}
              >
                Name
              </Typography>
              <Typography
                level='body-sm'
                fontWeight='300'
                sx={{
                  color: 'var(--joy-palette-text-primary)',
                  fontSize: { xs: '12px', sm: '14px' },
                  wordBreak: 'break-word',
                  whiteSpace: 'normal',
                  maxWidth: '100%',
                  overflowWrap: 'break-word',
                  textOverflow: 'ellipsis',
                }}
              >
                {userData?.firstName?.slice(0, 30)} {userData?.lastName?.slice(0, 30)}
              </Typography>
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Typography
                level='body-sm'
                fontWeight='300'
                sx={{
                  color: '#636B74',
                  width: { xs: '100%', sm: '100px' },
                  fontSize: { xs: '12px', sm: '14px' },
                }}
              >
                Email
              </Typography>
              <Stack spacing={0}>
                <Typography
                  level='body-sm'
                  fontWeight='300'
                  sx={{
                    color: 'var(--joy-palette-text-primary)',
                    fontSize: { xs: '12px', sm: '14px' },
                  }}
                >
                  {userData?.email}
                </Typography>
              </Stack>
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Typography
                level='body-sm'
                fontWeight='300'
                sx={{
                  color: '#636B74',
                  width: { xs: '100%', sm: '100px' },
                  fontSize: { xs: '12px', sm: '14px' },
                }}
              >
                Customer
              </Typography>
              <Typography
                level='body-sm'
                fontWeight='300'
                sx={{
                  color: 'var(--joy-palette-text-primary)',
                  fontSize: { xs: '12px', sm: '14px' },
                }}
              >
                {userData?.customer?.name}
              </Typography>
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Typography
                level='body-sm'
                fontWeight='300'
                sx={{
                  color: '#636B74',
                  width: { xs: '100%', sm: '100px' },
                  fontSize: { xs: '12px', sm: '14px' },
                }}
              >
                Role
              </Typography>
              <Typography
                level='body-sm'
                fontWeight='300'
                sx={{
                  color: 'var(--joy-palette-text-primary)',
                  fontSize: { xs: '12px', sm: '14px' },
                }}
              >
                {userData?.role?.name}
              </Typography>
            </Stack>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              sx={{
                borderBottom: '1px solid var(--joy-palette-divider)',
                paddingBottom: { xs: 1, sm: 2 },
              }}
            >
              <Typography
                level='body-sm'
                fontWeight='300'
                sx={{
                  color: '#6B7280',
                  width: { xs: '100%', sm: '100px' },
                  fontSize: { xs: '12px', sm: '14px' },
                }}
              >
                Billing
              </Typography>
              <Stack spacing={0.5}>
                <Typography
                  sx={{
                    borderRadius: '20px',
                    borderColor: '#E5E7EB',
                    color: '#4F46E5',
                    bgcolor: '#E0E7FF',
                    px: 1,
                    display: 'inline-block',
                    width: 'fit-content',
                    fontSize: { xs: '10px', sm: '12px' },
                    '&:hover': { bgcolor: '#C7D2FE' },
                  }}
                >
                  Enterprise
                </Typography>
                <Typography level='body-sm'>
                  <a href='#' style={{ color: '#4F46E5', textDecoration: 'none' }}>
                    Covered by MarketSphere
                  </a>
                </Typography>
                <Typography
                  level='body-sm'
                  sx={{
                    color: 'var(--joy-palette-text-primary)',
                    fontSize: { xs: '12px', sm: '14px' },
                  }}
                >
                  2,000 users
                </Typography>
              </Stack>
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Typography
                level='body-sm'
                fontWeight='300'
                sx={{
                  color: '#6B7280',
                  width: { xs: '100%', sm: '100px' },
                  fontSize: { xs: '12px', sm: '14px' },
                }}
              >
                Activity
              </Typography>
              <Stack spacing={1}>
                {userData?.activity && userData?.activity.length > 0 ? (
                  userData?.activity.map((act) => (
                    <Stack key={act.id} spacing={0}>
                      <Typography
                        level='body-sm'
                        fontWeight='300'
                        sx={{
                          color: 'var(--joy-palette-text-primary)',
                          fontSize: { xs: '12px', sm: '14px' },
                        }}
                      >
                        {act.browserOs}
                      </Typography>
                      <Typography
                        level='body-sm'
                        fontWeight='300'
                        sx={{
                          color: 'var(--joy-palette-text-secondary)',
                          fontSize: { xs: '10px', sm: '12px' },
                        }}
                      >
                        {act.locationTime}
                      </Typography>
                    </Stack>
                  ))
                ) : (
                  <Typography
                    level='body-sm'
                    fontWeight='300'
                    sx={{
                      color: 'var(--joy-palette-text-primary)',
                      fontSize: { xs: '12px', sm: '14px' },
                    }}
                  >
                    No activity data available
                  </Typography>
                )}
              </Stack>
            </Stack>
          </Stack>
        </Box>
      </Sheet>

      <DeleteDeactivateUserModal
        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        onConfirm={confirmDelete}
        usersToDelete={[userData?.firstName + ' ' + userData?.lastName || '']}
        title='Delete user'
        description='Are you sure you want to delete this user?'
      />

      <DeleteDeactivateUserModal
        open={openDeactivateModal}
        onClose={() => setOpenDeactivateModal(false)}
        onConfirm={confirmDeactivate}
        isDeactivate={true}
        usersToDelete={[userData?.firstName + ' ' + userData?.lastName || '']}
        title='Deactivate user'
        description='Are you sure you want to deactivate this user?'
      />

      <ResetPasswordUserModal
        open={openResetPasswordModal}
        onClose={() => setOpenResetPasswordModal(false)}
        userName={userData?.firstName + ' ' + userData?.lastName || ''}
        userEmail={userData?.email || ''}
        onConfirm={(selectedEmail) => {
          console.log(`Resetting password for ${selectedEmail}`);
        }}
      />

      <SuspendUserModal
        open={openSuspendModal}
        onClose={() => setOpenSuspendModal(false)}
        userName={userData?.firstName + ' ' + userData?.lastName || ''}
        onConfirm={handleConfirmSuspend}
      />

      <AddEditUserModal open={openEditModal} onClose={handleCloseEditModal} userId={userData?.id} />
    </>
  );
};

export default UserDetailsPopover;
