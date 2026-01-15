import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getComplianceRuleById,
  createComplianceRule,
  updateComplianceRule,
  deleteComplianceRule,
  listComplianceRules,
} from '../api/compliance-rules';
import type {
  CreateComplianceRulePayload,
  UpdateComplianceRulePayload,
  ListComplianceRulesParams,
} from '../api/compliance-rules';
import { toast } from '@/components/core/toaster';

export const complianceRuleKeys = {
  all: ['compliance-rules'] as const,
  lists: () => [...complianceRuleKeys.all, 'list'] as const,
  list: (filters?: ListComplianceRulesParams) => [...complianceRuleKeys.lists(), filters] as const,
  details: () => [...complianceRuleKeys.all, 'detail'] as const,
  detail: (id: string) => [...complianceRuleKeys.details(), id] as const,
};

export function useComplianceRule(id: string | null) {
  return useQuery({
    queryKey: complianceRuleKeys.detail(id!),
    queryFn: () => getComplianceRuleById(id!),
    enabled: !!id,
  });
}

export function useComplianceRules(filters?: ListComplianceRulesParams) {
  return useQuery({
    queryKey: complianceRuleKeys.list(filters),
    queryFn: () => listComplianceRules(filters || {}),
  });
}

export function useCreateComplianceRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateComplianceRulePayload) => createComplianceRule(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: complianceRuleKeys.lists() });
      toast.success('Compliance rule created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create compliance rule');
    },
  });
}

export function useUpdateComplianceRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateComplianceRulePayload) => updateComplianceRule(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: complianceRuleKeys.detail(data.compliance_rule_id),
      });
      queryClient.invalidateQueries({ queryKey: complianceRuleKeys.lists() });
      toast.success('Compliance rule updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update compliance rule');
    },
  });
}

export function useDeleteComplianceRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteComplianceRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complianceRuleKeys.lists() });
      toast.success('Compliance rule deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete compliance rule');
    },
  });
}
