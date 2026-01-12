import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listSocialTemplates,
  createSocialTemplate,
  updateSocialTemplate,
  deleteSocialTemplate,
} from '../api/social_templates';
import { toast } from '@/components/core/toaster';
import type { SocialTemplate, NewSocialTemplate, UpdateSocialTemplate } from '../types';

export const socialTemplateKeys = {
  all: ['social-templates'] as const,
  lists: () => [...socialTemplateKeys.all, 'list'] as const,
  list: (guideId?: string) => [...socialTemplateKeys.lists(), guideId] as const,
  details: () => [...socialTemplateKeys.all, 'detail'] as const,
  detail: (id: string) => [...socialTemplateKeys.details(), id] as const,
};

export function useSocialTemplates(visualStyleGuideId?: string) {
  return useQuery({
    queryKey: socialTemplateKeys.list(visualStyleGuideId),
    queryFn: async () => {
      const result = await listSocialTemplates(visualStyleGuideId);
      if (!result.ok) throw new Error(result.error);
      return result.data;
    },
  });
}

export function useCreateSocialTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: Omit<NewSocialTemplate, 'social_template_id' | 'customer_id' | 'created_at'>
    ) => {
      const result = await createSocialTemplate(input);
      if (!result.ok) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: socialTemplateKeys.list(String(data.visual_style_guide_id || '')),
      });
      queryClient.invalidateQueries({ queryKey: socialTemplateKeys.lists() });
      toast.success('Social template created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create social template');
    },
  });
}

export function useUpdateSocialTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<UpdateSocialTemplate> }) => {
      const result = await updateSocialTemplate(id, input);
      if (!result.ok) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: socialTemplateKeys.list(String(data.visual_style_guide_id || '')),
      });
      queryClient.invalidateQueries({
        queryKey: socialTemplateKeys.detail(String(data.social_template_id)),
      });
      toast.success('Social template updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update social template');
    },
  });
}

export function useDeleteSocialTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteSocialTemplate(id);
      if (!result.ok) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialTemplateKeys.lists() });
      toast.success('Social template deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete social template');
    },
  });
}
