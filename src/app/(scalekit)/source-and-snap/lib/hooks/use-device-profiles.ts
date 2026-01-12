import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getDeviceProfileOptions,
  getDeviceProfileOptionById,
  getDeviceProfileOptionByProgrammaticName,
  createDeviceProfileOption,
  updateDeviceProfileOption,
  deleteDeviceProfileOption,
  type GetDeviceProfileOptionsParams,
  type CreateDeviceProfileOptionPayload,
  type UpdateDeviceProfileOptionPayload,
} from '../api/device-profiles';
import type { DeviceProfileOption } from '../types';

// Query keys
export const deviceProfileKeys = {
  all: ['device-profiles'] as const,
  lists: () => [...deviceProfileKeys.all, 'list'] as const,
  list: (params?: GetDeviceProfileOptionsParams) => [...deviceProfileKeys.lists(), params] as const,
  details: () => [...deviceProfileKeys.all, 'detail'] as const,
  detail: (id: string) => [...deviceProfileKeys.details(), id] as const,
  byProgrammaticName: (name: string) =>
    [...deviceProfileKeys.all, 'programmatic-name', name] as const,
};

/**
 * Hook to fetch all device profile options
 */
export function useDeviceProfileOptions(params?: GetDeviceProfileOptionsParams) {
  return useQuery<DeviceProfileOption[], Error>({
    queryKey: deviceProfileKeys.list(params),
    queryFn: () => getDeviceProfileOptions(params),
    staleTime: 5 * 60 * 1000, // 5 minutes - these don't change often
  });
}

/**
 * Hook to fetch a single device profile option by ID
 */
export function useDeviceProfileOption(id: string | null | undefined) {
  return useQuery<DeviceProfileOption, Error>({
    queryKey: deviceProfileKeys.detail(id!),
    queryFn: () => getDeviceProfileOptionById(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch a device profile option by programmatic name
 */
export function useDeviceProfileOptionByProgrammaticName(
  programmaticName: string | null | undefined
) {
  return useQuery<DeviceProfileOption | null, Error>({
    queryKey: deviceProfileKeys.byProgrammaticName(programmaticName!),
    queryFn: () => getDeviceProfileOptionByProgrammaticName(programmaticName!),
    enabled: !!programmaticName,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to create a device profile option
 */
export function useCreateDeviceProfileOption() {
  const queryClient = useQueryClient();

  return useMutation<DeviceProfileOption, Error, CreateDeviceProfileOptionPayload>({
    mutationFn: createDeviceProfileOption,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deviceProfileKeys.lists() });
    },
  });
}

/**
 * Hook to update a device profile option
 */
export function useUpdateDeviceProfileOption() {
  const queryClient = useQueryClient();

  return useMutation<
    DeviceProfileOption,
    Error,
    { id: string; payload: UpdateDeviceProfileOptionPayload }
  >({
    mutationFn: ({ id, payload }) => updateDeviceProfileOption(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: deviceProfileKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: deviceProfileKeys.detail(data.options_device_profile_id),
      });
    },
  });
}

/**
 * Hook to delete a device profile option
 */
export function useDeleteDeviceProfileOption() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: deleteDeviceProfileOption,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deviceProfileKeys.lists() });
    },
  });
}
