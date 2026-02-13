'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import Box from '@mui/joy/Box';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import RoleSettings from '@/components/dashboard/role-settings/role-settings';
import UserPersonas from '@/components/dashboard/role-settings/user-personas';
import SearchInput from '@/components/dashboard/layout/search-input';
import { getRolesList } from '../../../lib/api/roles';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { useGlobalSearch } from '@/hooks/use-global-search';
import Button from '@mui/joy/Button';
import AddRoleModal from '../../../components/dashboard/modals/AddRoleModal';
import CircularProgress from '@mui/joy/CircularProgress';
import { useUserInfo } from '@/hooks/use-user-info';
import { useQuery } from '@tanstack/react-query';
import { getUsers } from '@/lib/api/users';
import { Role } from '@/contexts/auth/types';
import { isSystemAdministrator } from '@/lib/user-utils';
import { NotAuthorized } from '@/components/core/not-authorized';

interface HttpError extends Error {
  response?: {
    status: number;
  };
}

export default function Page(): React.JSX.Element {
  const [error, setError] = useState<HttpError | null>(null);
  const [openAddRoleModal, setOpenAddRoleModal] = useState(false);

  const { userInfo, isUserLoading } = useUserInfo();
  const { debouncedSearchValue } = useGlobalSearch();

  const {
    data,
    isLoading,
    error: rolesError,
    refetch,
  } = useQuery({
    queryKey: ['roles', debouncedSearchValue],
    queryFn: async () => {
      const response = await getRolesList({
        search: debouncedSearchValue || undefined,
      });
      return response;
    },
    enabled: true,
  });

  const roles = data || [];

  const handleAddRoleModal = () => {
    setOpenAddRoleModal(true);
  };

  const handleCloseAddRoleModal = () => {
    setOpenAddRoleModal(false);
  };

  if (isUserLoading) {
    return (
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
    );
  }

  if (error || !isSystemAdministrator(userInfo)) {
    return <NotAuthorized />;
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 'var(--Content-padding)' } }}>
      <Stack spacing={{ xs: 2, sm: 3 }} sx={{ mt: { xs: 6, sm: 0 } }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={{ xs: 2, sm: 3 }}
          sx={{ alignItems: { xs: 'stretch', sm: 'flex-start' } }}
        >
          <Stack spacing={1} sx={{ flex: '1 1 auto' }}>
            <Typography
              fontSize={{ xs: 'xl2', sm: 'xl3' }}
              level='h1'
              sx={{ wordBreak: 'break-word' }}
            >
              Role Settings
            </Typography>
          </Stack>
          <Stack>
            {/* <Button
              variant="solid"
              color="primary"
              onClick={handleAddRoleModal}
              startDecorator={<PlusIcon fontSize="var(--Icon-fontSize)" />}
              sx={{
                width: { xs: "100%", sm: "auto" },
                py: { xs: 1, sm: 0.75 },
              }}
            >
              Add role
            </Button> */}
          </Stack>
        </Stack>

        {isLoading ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '50vh',
            }}
          >
            <CircularProgress />
          </Box>
        ) : roles.length > 0 ? (
          <RoleSettings roles={roles} fetchRoles={refetch} />
        ) : (
          <UserPersonas />
        )}
      </Stack>
      <AddRoleModal open={openAddRoleModal} onClose={handleCloseAddRoleModal} />
    </Box>
  );
}
