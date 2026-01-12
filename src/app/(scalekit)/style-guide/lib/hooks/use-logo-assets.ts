import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listLogoAssets,
  createLogoAsset,
  updateLogoAsset,
  deleteLogoAsset,
} from '../api/logo_assets';
import { toast } from '@/components/core/toaster';
import type { LogoAsset, NewLogoAsset, UpdateLogoAsset } from '../types';

export const logoAssetKeys = {
  all: ['logo-assets'] as const,
  lists: () => [...logoAssetKeys.all, 'list'] as const,
  list: (guideId?: string) => [...logoAssetKeys.lists(), guideId] as const,
  details: () => [...logoAssetKeys.all, 'detail'] as const,
  detail: (id: string) => [...logoAssetKeys.details(), id] as const,
};

export function useLogoAssets(visualStyleGuideId?: string) {
  return useQuery({
    queryKey: logoAssetKeys.list(visualStyleGuideId),
    queryFn: async () => {
      const result = await listLogoAssets(visualStyleGuideId);
      if (!result.ok) throw new Error(result.error);
      return result.data;
    },
  });
}

export function useCreateLogoAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: Omit<NewLogoAsset, 'logo_asset_id' | 'customer_id' | 'created_at'>
    ) => {
      const result = await createLogoAsset(input);
      if (!result.ok) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: logoAssetKeys.list(String(data.visual_style_guide_id || '')),
      });
      queryClient.invalidateQueries({ queryKey: logoAssetKeys.lists() });
      toast.success('Logo asset uploaded successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to upload logo asset');
    },
  });
}

export function useUpdateLogoAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<UpdateLogoAsset> }) => {
      const result = await updateLogoAsset(id, input);
      if (!result.ok) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: logoAssetKeys.list(String(data.visual_style_guide_id || '')),
      });
      queryClient.invalidateQueries({ queryKey: logoAssetKeys.detail(String(data.logo_asset_id)) });
      toast.success('Logo asset updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update logo asset');
    },
  });
}

export function useDeleteLogoAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteLogoAsset(id);
      if (!result.ok) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: logoAssetKeys.lists() });
      toast.success('Logo asset deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete logo asset');
    },
  });
}
