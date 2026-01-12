/**
 * API functions for Framing Concepts table
 * CRUD operations for customer-scoped framing concepts
 */

import { createClient } from '@/lib/supabase/client';
import {
  createFramingConceptPayloadSchema,
  updateFramingConceptPayloadSchema,
} from '../types/validation';
import type { z } from 'zod';

// Define FramingConcept type directly from the database structure
export type FramingConcept = {
  framing_concept_id: string;
  written_style_guide_id: string;
  style_guide_id?: string; // Alias for written_style_guide_id
  name: string;
  description: string | null;
  example_usage: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateFramingConceptPayload = z.infer<typeof createFramingConceptPayloadSchema>;
export type UpdateFramingConceptPayload = z.infer<typeof updateFramingConceptPayloadSchema>;

export type ListFramingConceptsParams = {
  written_style_guide_id?: string;
  style_guide_id?: string;
  search?: string;
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
 * Get a single framing concept by ID
 */
export async function getFramingConceptById(framingConceptId: string): Promise<FramingConcept> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('framing_concepts')
    .select('*')
    .eq('framing_concept_id', framingConceptId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch framing concept: ${error.message}`);
  }

  return data as FramingConcept;
}

/**
 * List framing concepts with pagination and filtering
 */
export async function listFramingConcepts(
  params: ListFramingConceptsParams = {}
): Promise<PaginatedResponse<FramingConcept>> {
  const supabase = createClient();
  const { style_guide_id, search, page = 1, per_page = 20 } = params;

  let query = supabase.from('framing_concepts').select('*', { count: 'exact' });

  if (style_guide_id) {
    query = query.eq('style_guide_id', style_guide_id);
  }

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  const offset = (page - 1) * per_page;
  query = query.range(offset, offset + per_page - 1);
  query = query.order('created_at', { ascending: false });

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to list framing concepts: ${error.message}`);
  }

  return {
    data: (data || []) as FramingConcept[],
    meta: {
      total: count || 0,
      page,
      per_page,
      total_pages: Math.ceil((count || 0) / per_page),
    },
  };
}

/**
 * Create a new framing concept
 */
export async function createFramingConcept(
  payload: CreateFramingConceptPayload
): Promise<FramingConcept> {
  const supabase = createClient();

  // Get the user_id from the users table (not auth.uid())
  const { data: userId, error: userIdError } = await supabase.rpc('current_user_id');

  if (userIdError) {
    console.error('Error fetching user_id:', userIdError);
    throw new Error(`Failed to get user ID: ${userIdError.message}`);
  }

  console.log('Creating framing concept with user_id:', userId);
  console.log('Payload:', payload);

  const insertPayload = {
    ...payload,
    style_guide_id: payload.style_guide_id ?? payload.written_style_guide_id,
    written_style_guide_id: payload.written_style_guide_id ?? payload.style_guide_id,
    created_by: userId || null,
  };

  console.log('Insert payload:', insertPayload);

  const { data, error } = await supabase
    .from('framing_concepts')
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    console.error('Error creating framing concept:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    throw new Error(`Failed to create framing concept: ${error.message}`);
  }

  return data as FramingConcept;
}

/**
 * Update an existing framing concept
 */
export async function updateFramingConcept(
  payload: UpdateFramingConceptPayload
): Promise<FramingConcept> {
  const supabase = createClient();

  const { framing_concept_id, ...updateData } = payload;

  const { data, error } = await supabase
    .from('framing_concepts')
    .update(updateData)
    .eq('framing_concept_id', framing_concept_id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update framing concept: ${error.message}`);
  }

  return data as FramingConcept;
}

/**
 * Delete a framing concept
 */
export async function deleteFramingConcept(framingConceptId: string): Promise<FramingConcept> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('framing_concepts')
    .delete()
    .eq('framing_concept_id', framingConceptId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to delete framing concept: ${error.message}`);
  }

  return data as FramingConcept;
}

/**
 * Get all framing concepts for a style guide
 */
export async function getFramingConceptsByStyleGuideId(
  styleGuideId: string
): Promise<FramingConcept[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('framing_concepts')
    .select('*')
    .eq('style_guide_id', styleGuideId)
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch framing concepts: ${error.message}`);
  }

  return (data || []) as FramingConcept[];
}
