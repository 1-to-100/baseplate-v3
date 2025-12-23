import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCaptureRequestsList,
  getCaptureRequestById,
  createCaptureRequest,
  updateCaptureRequest,
  deleteCaptureRequest,
  type GetCaptureRequestsParams,
  type CreateCaptureRequestPayload,
  type UpdateCaptureRequestPayload,
} from '../api/capture-requests';
import type { WebScreenshotCaptureRequest, GetCaptureRequestsResponse } from '../types';

// Query keys
export const captureRequestKeys = {
  all: ['capture-requests'] as const,
  lists: () => [...captureRequestKeys.all, 'list'] as const,
  list: (params?: GetCaptureRequestsParams) => [...captureRequestKeys.lists(), params] as const,
  details: () => [...captureRequestKeys.all, 'detail'] as const,
  detail: (id: string) => [...captureRequestKeys.details(), id] as const,
};

/**
 * Hook to fetch a list of capture requests
 */
export function useCaptureRequestsList(params?: GetCaptureRequestsParams) {
  return useQuery<GetCaptureRequestsResponse, Error>({
    queryKey: captureRequestKeys.list(params),
    queryFn: () => getCaptureRequestsList(params),
  });
}

/**
 * Hook to fetch a single capture request by ID
 */
export function useCaptureRequest(id: string | null | undefined) {
  return useQuery<WebScreenshotCaptureRequest, Error>({
    queryKey: captureRequestKeys.detail(id!),
    queryFn: () => getCaptureRequestById(id!),
    enabled: !!id,
  });
}

/**
 * Hook to create a capture request
 */
export function useCreateCaptureRequest() {
  const queryClient = useQueryClient();

  return useMutation<WebScreenshotCaptureRequest, Error, CreateCaptureRequestPayload>({
    mutationFn: createCaptureRequest,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: captureRequestKeys.lists() });
      queryClient.invalidateQueries({ queryKey: captureRequestKeys.detail(data.web_screenshot_capture_request_id) });
    },
  });
}

/**
 * Hook to update a capture request
 */
export function useUpdateCaptureRequest() {
  const queryClient = useQueryClient();

  return useMutation<WebScreenshotCaptureRequest, Error, { id: string; payload: UpdateCaptureRequestPayload }>({
    mutationFn: ({ id, payload }) => updateCaptureRequest(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: captureRequestKeys.lists() });
      queryClient.invalidateQueries({ queryKey: captureRequestKeys.detail(data.web_screenshot_capture_request_id) });
    },
  });
}

/**
 * Hook to delete a capture request
 */
export function useDeleteCaptureRequest() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: deleteCaptureRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: captureRequestKeys.lists() });
    },
  });
}

