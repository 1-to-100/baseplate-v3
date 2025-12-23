import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getFramingConceptById,
  createFramingConcept,
  updateFramingConcept,
  deleteFramingConcept,
  listFramingConcepts,
} from '../api/framing-concepts';
import type { CreateFramingConceptPayload, UpdateFramingConceptPayload, ListFramingConceptsParams } from '../api/framing-concepts';
import { toast } from '@/components/core/toaster';

export const framingConceptKeys = {
  all: ['framing-concepts'] as const,
  lists: () => [...framingConceptKeys.all, 'list'] as const,
  list: (filters?: ListFramingConceptsParams) => [...framingConceptKeys.lists(), filters] as const,
  details: () => [...framingConceptKeys.all, 'detail'] as const,
  detail: (id: string) => [...framingConceptKeys.details(), id] as const,
};

export function useFramingConcept(id: string | null) {
  return useQuery({
    queryKey: framingConceptKeys.detail(id!),
    queryFn: () => getFramingConceptById(id!),
    enabled: !!id,
  });
}

export function useFramingConcepts(filters?: { style_guide_id?: string; page?: number; per_page?: number }) {
  return useQuery({
    queryKey: framingConceptKeys.list(filters),
    queryFn: () => listFramingConcepts(filters || {}),
  });
}

export function useCreateFramingConcept() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateFramingConceptPayload) => createFramingConcept(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: framingConceptKeys.list({ written_style_guide_id: data.written_style_guide_id }) });
      toast.success('Framing concept created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create framing concept');
    },
  });
}

export function useUpdateFramingConcept() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateFramingConceptPayload) => updateFramingConcept(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: framingConceptKeys.detail(data.framing_concept_id) });
      queryClient.invalidateQueries({ queryKey: framingConceptKeys.lists() });
      toast.success('Framing concept updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update framing concept');
    },
  });
}

export function useDeleteFramingConcept() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteFramingConcept(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: framingConceptKeys.lists() });
      toast.success('Framing concept deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete framing concept');
    },
  });
}

