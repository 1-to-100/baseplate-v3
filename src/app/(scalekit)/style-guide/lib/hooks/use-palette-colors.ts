import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listPaletteColors,
  createPaletteColor,
  updatePaletteColor,
  deletePaletteColor,
} from '../api/palette_colors';
import { toast } from '@/components/core/toaster';
import type { PaletteColor, NewPaletteColor, UpdatePaletteColor } from '../types';

export const paletteColorKeys = {
  all: ['palette-colors'] as const,
  lists: () => [...paletteColorKeys.all, 'list'] as const,
  list: () => [...paletteColorKeys.lists()] as const,
  details: () => [...paletteColorKeys.all, 'detail'] as const,
  detail: (id: string) => [...paletteColorKeys.details(), id] as const,
};

export function usePaletteColors() {
  return useQuery({
    queryKey: paletteColorKeys.list(),
    queryFn: async () => {
      const result = await listPaletteColors();
      if (!result.ok) throw new Error(result.error);
      return result.data;
    },
  });
}

export function useCreatePaletteColor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Omit<NewPaletteColor, 'palette_color_id' | 'customer_id' | 'created_at'>) => {
      const result = await createPaletteColor(input);
      if (!result.ok) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paletteColorKeys.list() });
      toast.success('Color added to palette successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add color');
    },
  });
}

export function useUpdatePaletteColor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<UpdatePaletteColor> }) => {
      const result = await updatePaletteColor(id, input);
      if (!result.ok) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: paletteColorKeys.detail(String(data.palette_color_id)) });
      queryClient.invalidateQueries({ queryKey: paletteColorKeys.list() });
      toast.success('Color updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update color');
    },
  });
}

export function useDeletePaletteColor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deletePaletteColor(id);
      if (!result.ok) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paletteColorKeys.list() });
      toast.success('Color removed from palette successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove color');
    },
  });
}

