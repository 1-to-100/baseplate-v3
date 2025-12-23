import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getContentEvaluationById,
  createContentEvaluation,
  updateContentEvaluation,
  deleteContentEvaluation,
  listContentEvaluations,
} from '../api/content-evaluations';
import type { CreateContentEvaluationPayload, UpdateContentEvaluationPayload, ListContentEvaluationsParams } from '../api/content-evaluations';
import { toast } from '@/components/core/toaster';

export const contentEvaluationKeys = {
  all: ['content-evaluations'] as const,
  lists: () => [...contentEvaluationKeys.all, 'list'] as const,
  list: (filters?: ListContentEvaluationsParams) => [...contentEvaluationKeys.lists(), filters] as const,
  details: () => [...contentEvaluationKeys.all, 'detail'] as const,
  detail: (id: string) => [...contentEvaluationKeys.details(), id] as const,
};

export function useContentEvaluation(id: string | null) {
  return useQuery({
    queryKey: contentEvaluationKeys.detail(id!),
    queryFn: () => getContentEvaluationById(id!),
    enabled: !!id,
  });
}

export function useContentEvaluations(filters?: ListContentEvaluationsParams) {
  return useQuery({
    queryKey: contentEvaluationKeys.list(filters),
    queryFn: () => listContentEvaluations(filters || {}),
  });
}

export function useCreateContentEvaluation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateContentEvaluationPayload) => createContentEvaluation(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contentEvaluationKeys.lists() });
      toast.success('Content evaluation created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create content evaluation');
    },
  });
}

export function useUpdateContentEvaluation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateContentEvaluationPayload) => updateContentEvaluation(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: contentEvaluationKeys.detail(data.evaluation_id) });
      queryClient.invalidateQueries({ queryKey: contentEvaluationKeys.lists() });
      toast.success('Content evaluation updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update content evaluation');
    },
  });
}

export function useDeleteContentEvaluation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteContentEvaluation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contentEvaluationKeys.lists() });
      toast.success('Content evaluation deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete content evaluation');
    },
  });
}

