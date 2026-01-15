/**
 * API functions for Vocabulary Entries table
 * CRUD operations for customer-scoped vocabulary entries
 */

import { createClient } from '@/lib/supabase/client';
import {
  createVocabularyEntryPayloadSchema,
  updateVocabularyEntryPayloadSchema,
} from '../types/validation';
import type { z } from 'zod';

// Define VocabularyEntry type directly from the database structure
export type VocabularyEntry = {
  vocabulary_entry_id: string;
  written_style_guide_id: string;
  style_guide_id?: string; // Alias for written_style_guide_id
  name: string;
  vocabulary_type: 'preferred' | 'prohibited' | 'neutral';
  suggested_replacement: string | null;
  example_usage: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateVocabularyEntryPayload = z.infer<typeof createVocabularyEntryPayloadSchema>;
export type UpdateVocabularyEntryPayload = z.infer<typeof updateVocabularyEntryPayloadSchema>;

export type ListVocabularyEntriesParams = {
  style_guide_id?: string;
  vocabulary_type?: 'preferred' | 'prohibited' | 'neutral';
  search?: string;
  written_style_guide_id?: string;
  page?: number;
  per_page?: number;
};

type PaginatedResponse<T> = {
  data: T[];
  meta: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  };
};

/**
 * Get a single vocabulary entry by ID
 */
export async function getVocabularyEntryById(vocabularyEntryId: string): Promise<VocabularyEntry> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('vocabulary_entries')
    .select('*')
    .eq('vocabulary_entry_id', vocabularyEntryId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch vocabulary entry: ${error.message}`);
  }

  return data as VocabularyEntry;
}

/**
 * List vocabulary entries with pagination and filtering
 */
export async function listVocabularyEntries(
  params: ListVocabularyEntriesParams = {}
): Promise<PaginatedResponse<VocabularyEntry>> {
  const supabase = createClient();
  const { style_guide_id, vocabulary_type, search, page = 1, per_page = 20 } = params;

  let query = supabase.from('vocabulary_entries').select('*', { count: 'exact' });

  if (style_guide_id) {
    query = query.eq('style_guide_id', style_guide_id);
  }

  if (vocabulary_type) {
    query = query.eq('vocabulary_type', vocabulary_type);
  }

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  const offset = (page - 1) * per_page;
  query = query.range(offset, offset + per_page - 1);
  query = query.order('name', { ascending: true });

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to list vocabulary entries: ${error.message}`);
  }

  return {
    data: (data || []) as VocabularyEntry[],
    meta: {
      total: count || 0,
      page,
      per_page,
      total_pages: Math.ceil((count || 0) / per_page),
    },
  };
}

/**
 * Create a new vocabulary entry
 */
export async function createVocabularyEntry(
  payload: CreateVocabularyEntryPayload
): Promise<VocabularyEntry> {
  const supabase = createClient();

  // Get the user_id from the users table (not auth.uid())
  const { data: userId, error: userIdError } = await supabase.rpc('current_user_id');

  if (userIdError) {
    console.error('Error fetching user_id:', userIdError);
    throw new Error(`Failed to get user ID: ${userIdError.message}`);
  }

  console.log('Creating vocabulary entry with user_id:', userId);
  console.log('Payload:', payload);

  const insertPayload = {
    ...payload,
    style_guide_id: payload.style_guide_id ?? payload.written_style_guide_id,
    written_style_guide_id: payload.written_style_guide_id ?? payload.style_guide_id,
    created_by: userId || null,
  };

  console.log('Insert payload:', insertPayload);

  const { data, error } = await supabase
    .from('vocabulary_entries')
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    console.error('Error creating vocabulary entry:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    throw new Error(`Failed to create vocabulary entry: ${error.message}`);
  }

  return data as VocabularyEntry;
}

/**
 * Update an existing vocabulary entry
 */
export async function updateVocabularyEntry(
  payload: UpdateVocabularyEntryPayload
): Promise<VocabularyEntry> {
  const supabase = createClient();

  const { vocabulary_entry_id, ...updateData } = payload;

  const { data, error } = await supabase
    .from('vocabulary_entries')
    .update(updateData)
    .eq('vocabulary_entry_id', vocabulary_entry_id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update vocabulary entry: ${error.message}`);
  }

  return data as VocabularyEntry;
}

/**
 * Delete a vocabulary entry
 */
export async function deleteVocabularyEntry(vocabularyEntryId: string): Promise<VocabularyEntry> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('vocabulary_entries')
    .delete()
    .eq('vocabulary_entry_id', vocabularyEntryId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to delete vocabulary entry: ${error.message}`);
  }

  return data as VocabularyEntry;
}

/**
 * Get all vocabulary entries for a style guide
 */
export async function getVocabularyEntriesByStyleGuideId(
  styleGuideId: string
): Promise<VocabularyEntry[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('vocabulary_entries')
    .select('*')
    .eq('style_guide_id', styleGuideId)
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch vocabulary entries: ${error.message}`);
  }

  return (data || []) as VocabularyEntry[];
}

/**
 * Get prohibited vocabulary entries for a style guide
 */
export async function getProhibitedVocabularyEntriesByStyleGuideId(
  styleGuideId: string
): Promise<VocabularyEntry[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('vocabulary_entries')
    .select('*')
    .eq('style_guide_id', styleGuideId)
    .eq('vocabulary_type', 'prohibited')
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch prohibited vocabulary entries: ${error.message}`);
  }

  return (data || []) as VocabularyEntry[];
}

/**
 * Get preferred vocabulary entries for a style guide
 */
export async function getPreferredVocabularyEntriesByStyleGuideId(
  styleGuideId: string
): Promise<VocabularyEntry[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('vocabulary_entries')
    .select('*')
    .eq('style_guide_id', styleGuideId)
    .eq('vocabulary_type', 'preferred')
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch preferred vocabulary entries: ${error.message}`);
  }

  return (data || []) as VocabularyEntry[];
}
