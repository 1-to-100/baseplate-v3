import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listTypographyStyles,
  createTypographyStyle,
  updateTypographyStyle,
  deleteTypographyStyle,
} from '../api/typography_styles';
import { toast } from '@/components/core/toaster';
import type { TypographyStyle, NewTypographyStyle, UpdateTypographyStyle } from '../types';

export const typographyStyleKeys = {
  all: ['typography-styles'] as const,
  lists: () => [...typographyStyleKeys.all, 'list'] as const,
  list: (guideId?: string) => [...typographyStyleKeys.lists(), guideId] as const,
  details: () => [...typographyStyleKeys.all, 'detail'] as const,
  detail: (id: string) => [...typographyStyleKeys.details(), id] as const,
};

export function useTypographyStyles(visualStyleGuideId?: string) {
  return useQuery({
    queryKey: typographyStyleKeys.list(visualStyleGuideId),
    queryFn: async () => {
      const result = await listTypographyStyles(visualStyleGuideId);
      if (!result.ok) throw new Error(result.error);
      return result.data;
    },
  });
}

export function useCreateTypographyStyle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Omit<NewTypographyStyle, 'typography_style_id' | 'customer_id' | 'created_at'>) => {
      const result = await createTypographyStyle(input);
      if (!result.ok) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: typographyStyleKeys.list(String(data.visual_style_guide_id || '')) });
      queryClient.invalidateQueries({ queryKey: typographyStyleKeys.lists() });
      toast.success('Typography style created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create typography style');
    },
  });
}

export function useUpdateTypographyStyle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<UpdateTypographyStyle> }) => {
      const result = await updateTypographyStyle(id, input);
      if (!result.ok) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: typographyStyleKeys.list(String(data.visual_style_guide_id || '')) });
      queryClient.invalidateQueries({ queryKey: typographyStyleKeys.detail(String(data.typography_style_id)) });
      toast.success('Typography style updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update typography style');
    },
  });
}

export function useDeleteTypographyStyle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteTypographyStyle(id);
      if (!result.ok) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: typographyStyleKeys.lists() });
      toast.success('Typography style deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete typography style');
    },
  });
}

