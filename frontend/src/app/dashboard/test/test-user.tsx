"use client";

import * as React from 'react';
import {FC} from 'react';
import {useAuth} from '@/contexts/auth/user-context';
import Box from '@mui/joy/Box';
import Button from '@mui/joy/Button';
import {apiFetch} from '@/lib/api/api-fetch';
import {PermissionsForm} from '@/app/dashboard/test/permissions-form';
import {RoleForm} from './role-form';
import {toast} from '@/components/core/toaster';

export const TestUser: FC = () => {
    const auth = useAuth();

    const testProtectedEndpoint = async (role: 'admin' | 'manager') => {
        try {
            const data = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/role-test/${role}`)
            console.log("Protected endpoint data:", data);
            toast.success(<pre>{JSON.stringify(data, null, 2)}</pre>);
        } catch (err) {
            if (err instanceof Error) {
                toast.error(err.message);
            }
            console.error("Error fetching protected endpoint:", err);
        }
    }

    const handleSyncUser = async () => {
        auth?.syncUser?.()
    }

    return (
        <div>
            <Box component="pre" sx={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                backgroundColor: 'background.level1',
                padding: 2,
                borderRadius: 'sm',
                fontSize: 11,
            }}>
                {JSON.stringify({
                    user: auth.user,
                    role: auth.role,
                    permissions: auth.permissions,
                }, null, 2)}
            </Box>

            <Button onClick={handleSyncUser} variant="solid" color="primary" sx={{marginTop: 2}}>
                Sync User
            </Button>

            <RoleForm
                role={auth.role || ''}
            />

            <PermissionsForm
                permissions={auth.permissions || []}
            />

            <Button onClick={() => testProtectedEndpoint('admin')}>
                Protected Endpoint [admin role only]
            </Button>
            <Button onClick={() => testProtectedEndpoint('manager')}>
                Protected Endpoint [admin or manager role]
            </Button>
        </div>
    )
        ;
};
