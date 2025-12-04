'use client';

import * as React from 'react';
import { useEffect, useMemo, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Stack from '@mui/joy/Stack';
import { createUser } from '@/lib/api/users';
import { getRoles } from '@/lib/api/roles';
import { getCustomers } from '@/lib/api/customers';
import { getTeams, addTeamMember } from '@/lib/api/teams';
import { toast } from '@/components/core/toaster';
import { useUserInfo } from '@/hooks/use-user-info';
import { isSystemAdministrator, SYSTEM_ROLES } from '@/lib/user-utils';
import { FirstNameField } from '../user-form-fields/FirstNameField';
import { LastNameField } from '../user-form-fields/LastNameField';
import { EmailField } from '../user-form-fields/EmailField';
import { CustomerField } from '../user-form-fields/CustomerField';
import { RoleField } from '../user-form-fields/RoleField';
import { TeamField } from '../user-form-fields/TeamField';
import { useUserForm } from '../user-form-fields/useUserForm';
import type { ApiUser } from '@/contexts/auth/types';

interface HttpError {
  response?: {
    data?: {
      message?: string;
    };
  };
}

interface AddUserProps {
  teamId: string;
  customerId: string;
  onSuccess: () => void;
  onError?: (error: Error) => void;
  onSaveReady?: (saveHandler: () => void) => void;
  onSavingChange?: (isSaving: boolean) => void;
}

export function AddUser({
  teamId,
  customerId,
  onSuccess,
  onError,
  onSaveReady,
  onSavingChange,
}: AddUserProps): React.JSX.Element {
  const { formData, errors, updateField, validateForm, setFormErrors, resetForm } = useUserForm();
  const queryClient = useQueryClient();
  const { userInfo } = useUserInfo();
  const isCurrentUserSystemAdmin = useMemo(() => isSystemAdministrator(userInfo), [userInfo]);

  // Fetch roles
  const { data: roles, isLoading: isRolesLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => getRoles(),
  });

  // Fetch customers
  const { data: customers, isLoading: isCustomersLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: getCustomers,
  });

  // Get customer ID from customer name
  const getCustomerId = useCallback(
    (customerName: string): string | undefined => {
      if (!customers) return undefined;
      const customer = customers.find((c) => c.name === customerName);
      return customer ? customer.id : undefined;
    },
    [customers]
  );

  // Get customer name from customer ID
  const getCustomerName = useCallback(
    (id: string): string | undefined => {
      if (!customers) return undefined;
      const customer = customers.find((c) => c.id === id);
      return customer ? customer.name : undefined;
    },
    [customers]
  );

  // Determine which customer to use for user creation
  const effectiveCustomerId = useMemo(() => {
    if (isCurrentUserSystemAdmin) {
      return formData.customer ? getCustomerId(formData.customer) : undefined;
    } else {
      return customerId;
    }
  }, [isCurrentUserSystemAdmin, formData.customer, getCustomerId, customerId]);

  // Determine which customer to use for fetching teams
  // For system admins, use formData.customer if selected, otherwise fall back to customerId prop
  // For non-system admins, always use customerId prop
  const teamsCustomerId = useMemo(() => {
    if (isCurrentUserSystemAdmin && formData.customer) {
      return getCustomerId(formData.customer) || customerId;
    }
    return customerId;
  }, [isCurrentUserSystemAdmin, formData.customer, getCustomerId, customerId]);

  // Fetch teams for the selected customer
  const { data: teamsData, isLoading: isTeamsLoading } = useQuery({
    queryKey: ['teams', teamsCustomerId],
    queryFn: async () => {
      if (!teamsCustomerId) return null;
      const response = await getTeams(teamsCustomerId);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data || [];
    },
    enabled: !!teamsCustomerId,
  });

  const teams = useMemo(() => teamsData || [], [teamsData]);

  // Get role ID from role name
  const getRoleId = useCallback(
    (roleName: string): string | undefined => {
      if (!roles) return undefined;
      const role = roles.find((r) => r.display_name === roleName);
      return role?.id;
    },
    [roles]
  );

  // Role options - only show Standard User and Manager roles
  const roleOptions = useMemo(() => {
    const standardRoles = roles?.filter(
      (role) => role.name === SYSTEM_ROLES.STANDARD_USER || role.name === SYSTEM_ROLES.MANAGER
    );
    return standardRoles?.map((role) => role.display_name).sort() || [];
  }, [roles]);

  // Customer options
  const customerOptions = useMemo(() => {
    return (
      customers?.sort((a, b) => a.name.localeCompare(b.name)).map((customer) => customer.name) || []
    );
  }, [customers]);

  // Initialize form with customer (if not system admin)
  useEffect(() => {
    if (!isCurrentUserSystemAdmin && customerId) {
      const customerName = getCustomerName(customerId);
      if (customerName) {
        updateField('customer', customerName);
      }
    }
  }, [customerId, isCurrentUserSystemAdmin, getCustomerName, updateField]);

  // Ensure team is preselected when teams data is loaded
  useEffect(() => {
    if (teamId && teams.length > 0) {
      const teamIdString = String(teamId);
      // Check if the team exists in the teams list
      const teamExists = teams.some((team) => String(team.team_id) === teamIdString);
      if (teamExists && formData.team !== teamIdString) {
        updateField('team', teamIdString);
      } else if (!teamExists) {
        // Team not found in list - log warning but still set it
        console.warn(`Team ${teamIdString} not found in teams list, but setting it anyway`, {
          teams,
          teamId: teamIdString,
        });
        updateField('team', teamIdString);
      }
    } else if (teamId && !teams.length) {
      // Teams not loaded yet, but we have teamId - set it directly
      const teamIdString = String(teamId);
      if (formData.team !== teamIdString) {
        updateField('team', teamIdString);
      }
    }
  }, [teamId, teams, formData.team, updateField]);

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: createUser,
    onSuccess: async (newUser: ApiUser & { emailSent?: boolean; emailError?: string | null }) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['available-users'] });

      // Check if invitation email was sent
      // The createUser function may return email status if available
      const emailSent = newUser?.emailSent !== false; // Default to true for backward compatibility
      const emailError = newUser?.emailError;

      console.log('User creation result:', {
        userId: newUser?.id,
        email: newUser?.email,
        emailSent,
        emailError,
      });

      if (!emailSent) {
        toast.warning(
          `User created successfully, but the invitation email may not have been sent${emailError ? `: ${emailError}` : ''}. You can resend the invitation from the user management page.`
        );
      }

      // Automatically add user to team
      // Use formData.team as the source of truth (it should match teamId since field is disabled)
      // Fall back to teamId prop for safety
      const targetTeamId = formData.team || teamId;

      if (!targetTeamId) {
        console.error('Cannot add user to team: missing teamId', {
          formDataTeam: formData.team,
          teamIdProp: teamId,
        });
        toast.error(
          'User created successfully, but team assignment failed: team information is missing.'
        );
        resetForm();
        onSuccess();
        return;
      }

      if (!newUser?.id) {
        console.error('Cannot add user to team: missing userId', { newUser });
        toast.error('User created successfully, but team assignment failed: user ID is missing.');
        resetForm();
        onSuccess();
        return;
      }

      // Add user to team
      try {
        const response = await addTeamMember({
          team_id: targetTeamId,
          user_id: newUser.id,
        });

        if (response.error) {
          toast.warning(`User created successfully, but failed to add to team: ${response.error}`);
          resetForm();
          onSuccess();
          return;
        }

        // Success - invalidate queries and show success message
        queryClient.invalidateQueries({ queryKey: ['teams'] });
        queryClient.invalidateQueries({ queryKey: ['team-members'] });
        queryClient.invalidateQueries({ queryKey: ['team', targetTeamId] });
        queryClient.invalidateQueries({ queryKey: ['available-users', customerId, targetTeamId] });
        toast.success('User created successfully and added to team.');
        resetForm();
        onSuccess();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error adding user to team:', error);
        toast.warning(`User created successfully, but failed to add to team: ${errorMessage}`);
        resetForm();
        onSuccess();
      }
    },
    onError: (error: HttpError | Error) => {
      const errorMessage = (error as HttpError).response?.data?.message || (error as Error).message;

      if (
        errorMessage === 'User with this email already exists' ||
        errorMessage?.includes('already exists')
      ) {
        setFormErrors({ ...errors, email: 'User with this email already exists' });
        toast.error('User with this email already exists');
      } else if (errorMessage) {
        toast.error(errorMessage);
      } else {
        toast.error('An error occurred while creating the user.');
      }

      if (onError) {
        onError(error as Error);
      }
    },
  });

  const handleSave = useCallback(async () => {
    const validationErrors = validateForm(isCurrentUserSystemAdmin);
    setFormErrors(validationErrors);

    if (Object.keys(validationErrors).length === 0) {
      const payload = {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        status: 'inactive' as 'active' | 'inactive',
        customerId: effectiveCustomerId,
        roleId: formData.role ? getRoleId(formData.role) : undefined,
      };

      createUserMutation.mutate(payload);
    }
  }, [
    formData,
    effectiveCustomerId,
    isCurrentUserSystemAdmin,
    validateForm,
    setFormErrors,
    getRoleId,
    createUserMutation,
  ]);

  // Expose save handler to parent
  useEffect(() => {
    if (onSaveReady) {
      onSaveReady(handleSave);
    }
  }, [handleSave, onSaveReady]);

  const handleCustomerChange = useCallback(
    (newValue: string | null) => {
      updateField('customer', newValue || '');
      // Clear team selection when customer changes (though it will be reset to teamId)
      updateField('team', '');
      // Reset team to preselected teamId after a brief delay
      setTimeout(() => {
        if (teamId) {
          updateField('team', teamId);
        }
      }, 0);
    },
    [updateField, teamId]
  );

  const handleRoleChange = useCallback(
    (newValue: string | null) => {
      updateField('role', newValue || '');
    },
    [updateField]
  );

  const handleTeamChange = useCallback(
    (newValue: string) => {
      // Team should be disabled, but handle change for consistency
      updateField('team', newValue);
    },
    [updateField]
  );

  const isSaving = createUserMutation.isPending;

  // Notify parent of saving state changes
  useEffect(() => {
    if (onSavingChange) {
      onSavingChange(isSaving);
    }
  }, [isSaving, onSavingChange]);

  return (
    <Stack spacing={{ xs: 1.5, sm: 2 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1.5, sm: 2 }}>
        <FirstNameField
          value={formData.firstName}
          onChange={(value) => updateField('firstName', value)}
          error={errors.firstName}
        />
        <LastNameField
          value={formData.lastName}
          onChange={(value) => updateField('lastName', value)}
          error={errors.lastName}
        />
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1.5, sm: 2 }}>
        <EmailField
          value={formData.email}
          onChange={(value) => updateField('email', value)}
          error={errors.email}
        />
        {isCurrentUserSystemAdmin && (
          <CustomerField
            value={formData.customer}
            onChange={handleCustomerChange}
            options={customerOptions}
            error={errors.customer}
            isLoading={isCustomersLoading}
            required={true}
          />
        )}
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1.5, sm: 2 }}>
        <RoleField
          value={formData.role}
          onChange={handleRoleChange}
          options={roleOptions}
          error={errors.role}
          isLoading={isRolesLoading}
        />
        <TeamField
          value={formData.team}
          onChange={handleTeamChange}
          options={teams.map((team) => ({
            team_id: team.team_id,
            team_name: team.team_name,
          }))}
          disabled={true}
          isLoading={isTeamsLoading}
        />
      </Stack>
    </Stack>
  );
}
