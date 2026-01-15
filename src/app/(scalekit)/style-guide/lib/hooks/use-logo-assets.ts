import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listLogoAssets,
  createLogoAsset,
  updateLogoAsset,
  deleteLogoAsset,
} from '../api/logo_assets';
import { toast } from '@/components/core/toaster';
import { createClient } from '@/lib/supabase/client';
import type { LogoAsset, NewLogoAsset, UpdateLogoAsset } from '../types';

// Types for logo generation
export interface GeneratedLogo {
  id: string;
  url: string;
  revised_prompt?: string;
}

interface GenerateLogoResponse {
  logos: GeneratedLogo[];
}

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
    mutationFn: async (input: Omit<NewLogoAsset, 'logo_asset_id' | 'customer_id' | 'created_at'>) => {
      const result = await createLogoAsset(input);
      if (!result.ok) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: logoAssetKeys.list(String(data.visual_style_guide_id || '')) });
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
      queryClient.invalidateQueries({ queryKey: logoAssetKeys.list(String(data.visual_style_guide_id || '')) });
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

/**
 * Hook to generate logos using AI (DALL-E 3)
 * Calls the generate-logo edge function with user prompt and visual style guide context
 */
export function useGenerateLogo() {
  return useMutation({
    mutationFn: async (params: {
      visualStyleGuideId: string;
      prompt: string;
    }): Promise<GeneratedLogo[]> => {
      const supabase = createClient();

      const { data, error } = await supabase.functions.invoke<GenerateLogoResponse>(
        'generate-logo',
        {
          body: {
            visual_style_guide_id: params.visualStyleGuideId,
            prompt: params.prompt,
          },
        }
      );

      if (error) {
        throw new Error(error.message || 'Failed to generate logos');
      }

      if (!data?.logos || data.logos.length === 0) {
        throw new Error('No logos were generated');
      }

      return data.logos;
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to generate logos');
    },
  });
}

// Types for save-generated-logo edge function
export interface PresetLogo {
  id: string;
  url: string;
  storage_path: string;
}

interface SaveGeneratedLogoResponse {
  storage_path: string;
  signed_url: string;
  logo_asset_id: string;
  preset_logos?: PresetLogo[];
}

/**
 * Hook to save a generated logo to Supabase storage
 * Downloads the image server-side to avoid CORS issues with DALL-E URLs
 * Also stores all generated logos as presets for future selection
 */
export function useSaveGeneratedLogo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      visualStyleGuideId: string;
      logoUrl: string;
      logoTypeOptionId?: string;
      allLogoUrls?: string[];  // All generated logos to store as presets
    }): Promise<SaveGeneratedLogoResponse> => {
      const supabase = createClient();

      const { data, error } = await supabase.functions.invoke<SaveGeneratedLogoResponse>(
        'save-generated-logo',
        {
          body: {
            visual_style_guide_id: params.visualStyleGuideId,
            logo_url: params.logoUrl,
            logo_type_option_id: params.logoTypeOptionId,
            all_logo_urls: params.allLogoUrls,
          },
        }
      );

      if (error) {
        throw new Error(error.message || 'Failed to save generated logo');
      }

      if (!data) {
        throw new Error('No response from save-generated-logo');
      }

      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: logoAssetKeys.list(variables.visualStyleGuideId) });
      queryClient.invalidateQueries({ queryKey: logoAssetKeys.lists() });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save generated logo');
    },
  });
}
