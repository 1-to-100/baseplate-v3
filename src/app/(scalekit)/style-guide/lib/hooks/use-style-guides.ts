import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getStyleGuideById,
  createStyleGuide,
  updateStyleGuide,
  deleteStyleGuide,
  listStyleGuides,
  getActiveStyleGuideByCustomerId,
} from '../api/style-guides';
import type { CreateStyleGuidePayload, UpdateStyleGuidePayload } from '../api/style-guides';
import { toast } from '@/components/core/toaster';

export const styleGuideKeys = {
  all: ['style-guides'] as const,
  lists: () => [...styleGuideKeys.all, 'list'] as const,
  list: (filters?: { customer_id?: string }) => [...styleGuideKeys.lists(), filters] as const,
  details: () => [...styleGuideKeys.all, 'detail'] as const,
  detail: (id: string) => [...styleGuideKeys.details(), id] as const,
  active: (customerId: string) => [...styleGuideKeys.all, 'active', customerId] as const,
};

export function useStyleGuide(id: string | null) {
  return useQuery({
    queryKey: styleGuideKeys.detail(id!),
    queryFn: () => getStyleGuideById(id!),
    enabled: !!id,
  });
}

export function useStyleGuides(filters?: { customer_id?: string; page?: number; per_page?: number }) {
  return useQuery({
    queryKey: styleGuideKeys.list(filters),
    queryFn: () => listStyleGuides(filters || {}),
  });
}

export function useActiveStyleGuide(customerId: string | null) {
  return useQuery({
    queryKey: styleGuideKeys.active(customerId!),
    queryFn: () => getActiveStyleGuideByCustomerId(customerId!),
    enabled: !!customerId,
  });
}

export function useCreateStyleGuide() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateStyleGuidePayload) => createStyleGuide(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: styleGuideKeys.lists() });
      queryClient.invalidateQueries({ queryKey: styleGuideKeys.active(data.customer_id) });
      toast.success('Style guide created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create style guide');
    },
  });
}

export function useUpdateStyleGuide() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateStyleGuidePayload) => updateStyleGuide(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: styleGuideKeys.detail(data.style_guide_id) });
      queryClient.invalidateQueries({ queryKey: styleGuideKeys.lists() });
      queryClient.invalidateQueries({ queryKey: styleGuideKeys.active(data.customer_id) });
      toast.success('Style guide updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update style guide');
    },
  });
}

export function useDeleteStyleGuide() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteStyleGuide(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: styleGuideKeys.lists() });
      queryClient.removeQueries({ queryKey: styleGuideKeys.detail(id) });
      toast.success('Style guide deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete style guide');
    },
  });
}

