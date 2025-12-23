import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getVocabularyEntryById,
  createVocabularyEntry,
  updateVocabularyEntry,
  deleteVocabularyEntry,
  listVocabularyEntries,
} from '../api/vocabulary-entries';
import type { CreateVocabularyEntryPayload, UpdateVocabularyEntryPayload, ListVocabularyEntriesParams } from '../api/vocabulary-entries';
import { toast } from '@/components/core/toaster';

export const vocabularyEntryKeys = {
  all: ['vocabulary-entries'] as const,
  lists: () => [...vocabularyEntryKeys.all, 'list'] as const,
  list: (filters?: ListVocabularyEntriesParams) => [...vocabularyEntryKeys.lists(), filters] as const,
  details: () => [...vocabularyEntryKeys.all, 'detail'] as const,
  detail: (id: string) => [...vocabularyEntryKeys.details(), id] as const,
};

export function useVocabularyEntry(id: string | null) {
  return useQuery({
    queryKey: vocabularyEntryKeys.detail(id!),
    queryFn: () => getVocabularyEntryById(id!),
    enabled: !!id,
  });
}

export function useVocabularyEntries(filters?: ListVocabularyEntriesParams) {
  return useQuery({
    queryKey: vocabularyEntryKeys.list(filters),
    queryFn: () => listVocabularyEntries(filters || {}),
  });
}

export function useCreateVocabularyEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateVocabularyEntryPayload) => createVocabularyEntry(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: vocabularyEntryKeys.list({ written_style_guide_id: data.written_style_guide_id }) });
      toast.success('Vocabulary entry created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create vocabulary entry');
    },
  });
}

export function useUpdateVocabularyEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateVocabularyEntryPayload) => updateVocabularyEntry(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: vocabularyEntryKeys.detail(data.vocabulary_entry_id) });
      queryClient.invalidateQueries({ queryKey: vocabularyEntryKeys.lists() });
      toast.success('Vocabulary entry updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update vocabulary entry');
    },
  });
}

export function useDeleteVocabularyEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteVocabularyEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vocabularyEntryKeys.lists() });
      toast.success('Vocabulary entry deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete vocabulary entry');
    },
  });
}

