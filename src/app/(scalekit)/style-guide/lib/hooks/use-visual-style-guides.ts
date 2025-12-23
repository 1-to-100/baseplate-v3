import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getVisualStyleGuideById,
  createVisualStyleGuide,
  updateVisualStyleGuide,
  deleteVisualStyleGuide,
  listVisualStyleGuides,
} from '../api/visual_style_guides';
import { toast } from '@/components/core/toaster';
import type { VisualStyleGuide, NewVisualStyleGuide, UpdateVisualStyleGuide } from '../types';

export const visualStyleGuideKeys = {
  all: ['visual-style-guides'] as const,
  lists: () => [...visualStyleGuideKeys.all, 'list'] as const,
  list: (filters?: { customer_id?: string }) => [...visualStyleGuideKeys.lists(), filters] as const,
  details: () => [...visualStyleGuideKeys.all, 'detail'] as const,
  detail: (id: string) => [...visualStyleGuideKeys.details(), id] as const,
};

export function useVisualStyleGuide(id: string | null) {
  return useQuery({
    queryKey: visualStyleGuideKeys.detail(id!),
    queryFn: async () => {
      const result = await getVisualStyleGuideById(id!);
      if (!result.ok) throw new Error(result.error);
      return result.data;
    },
    enabled: !!id,
  });
}

export function useVisualStyleGuides() {
  return useQuery({
    queryKey: visualStyleGuideKeys.list(),
    queryFn: async () => {
      const result = await listVisualStyleGuides();
      if (!result.ok) throw new Error(result.error);
      return result.data;
    },
  });
}

export function useCreateVisualStyleGuide() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Omit<NewVisualStyleGuide, 'visual_style_guide_id' | 'customer_id' | 'created_at' | 'updated_at'>) => {
      const result = await createVisualStyleGuide(input);
      if (!result.ok) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visualStyleGuideKeys.lists() });
      toast.success('Visual style guide created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create visual style guide');
    },
  });
}

export function useUpdateVisualStyleGuide() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<UpdateVisualStyleGuide> }) => {
      const result = await updateVisualStyleGuide(id, input);
      if (!result.ok) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: visualStyleGuideKeys.detail(String(data.visual_style_guide_id)) });
      queryClient.invalidateQueries({ queryKey: visualStyleGuideKeys.lists() });
      toast.success('Visual style guide updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update visual style guide');
    },
  });
}

export function useDeleteVisualStyleGuide() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteVisualStyleGuide(id);
      if (!result.ok) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: visualStyleGuideKeys.lists() });
      queryClient.removeQueries({ queryKey: visualStyleGuideKeys.detail(id) });
      toast.success('Visual style guide deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete visual style guide');
    },
  });
}

