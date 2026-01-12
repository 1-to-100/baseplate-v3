import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getComplianceReviewById,
  createComplianceReview,
  updateComplianceReview,
  deleteComplianceReview,
  listComplianceReviews,
} from '../api/compliance-reviews';
import type {
  CreateComplianceReviewPayload,
  UpdateComplianceReviewPayload,
  ListComplianceReviewsParams,
} from '../api/compliance-reviews';
import { toast } from '@/components/core/toaster';

export const complianceReviewKeys = {
  all: ['compliance-reviews'] as const,
  lists: () => [...complianceReviewKeys.all, 'list'] as const,
  list: (filters?: ListComplianceReviewsParams) =>
    [...complianceReviewKeys.lists(), filters] as const,
  details: () => [...complianceReviewKeys.all, 'detail'] as const,
  detail: (id: string) => [...complianceReviewKeys.details(), id] as const,
};

export function useComplianceReview(id: string | null) {
  return useQuery({
    queryKey: complianceReviewKeys.detail(id!),
    queryFn: () => getComplianceReviewById(id!),
    enabled: !!id,
  });
}

export function useComplianceReviews(filters?: ListComplianceReviewsParams) {
  return useQuery({
    queryKey: complianceReviewKeys.list(filters),
    queryFn: () => listComplianceReviews(filters || {}),
  });
}

export function useCreateComplianceReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateComplianceReviewPayload) => createComplianceReview(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complianceReviewKeys.lists() });
      toast.success('Compliance review created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create compliance review');
    },
  });
}

export function useUpdateComplianceReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateComplianceReviewPayload) => updateComplianceReview(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: complianceReviewKeys.detail(data.compliance_review_id),
      });
      queryClient.invalidateQueries({ queryKey: complianceReviewKeys.lists() });
      toast.success('Compliance review updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update compliance review');
    },
  });
}

export function useDeleteComplianceReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteComplianceReview(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complianceReviewKeys.lists() });
      toast.success('Compliance review deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete compliance review');
    },
  });
}
