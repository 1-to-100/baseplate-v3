import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCapturesList,
  getCaptureById,
  createCapture,
  updateCapture,
  deleteCapture,
  type GetCapturesParams,
  type CreateCapturePayload,
  type UpdateCapturePayload,
} from '../api/captures';
import type { WebScreenshotCapture, GetCapturesResponse } from '../types';

// Query keys
export const captureKeys = {
  all: ['captures'] as const,
  lists: () => [...captureKeys.all, 'list'] as const,
  list: (params?: GetCapturesParams) => [...captureKeys.lists(), params] as const,
  details: () => [...captureKeys.all, 'detail'] as const,
  detail: (id: string) => [...captureKeys.details(), id] as const,
};

/**
 * Hook to fetch a list of captures
 */
export function useCapturesList(params?: GetCapturesParams) {
  return useQuery<GetCapturesResponse, Error>({
    queryKey: captureKeys.list(params),
    queryFn: () => getCapturesList(params),
  });
}

/**
 * Hook to fetch a single capture by ID
 */
export function useCapture(id: string | null | undefined) {
  return useQuery<WebScreenshotCapture, Error>({
    queryKey: captureKeys.detail(id!),
    queryFn: () => getCaptureById(id!),
    enabled: !!id,
  });
}

/**
 * Hook to create a capture
 */
export function useCreateCapture() {
  const queryClient = useQueryClient();

  return useMutation<WebScreenshotCapture, Error, CreateCapturePayload>({
    mutationFn: createCapture,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: captureKeys.lists() });
      queryClient.invalidateQueries({ queryKey: captureKeys.detail(data.web_screenshot_capture_id) });
    },
  });
}

/**
 * Hook to update a capture
 */
export function useUpdateCapture() {
  const queryClient = useQueryClient();

  return useMutation<WebScreenshotCapture, Error, { id: string; payload: UpdateCapturePayload }>({
    mutationFn: ({ id, payload }) => updateCapture(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: captureKeys.lists() });
      queryClient.invalidateQueries({ queryKey: captureKeys.detail(data.web_screenshot_capture_id) });
    },
  });
}

/**
 * Hook to delete a capture
 */
export function useDeleteCapture() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: deleteCapture,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: captureKeys.lists() });
    },
  });
}

