/**
 * API functions for Content Evaluations table
 * CRUD operations for content evaluations
 */

import { createClient } from '@/lib/supabase/client';
import {
  createContentEvaluationPayloadSchema,
  updateContentEvaluationPayloadSchema,
} from '../types/validation';
import type { z } from 'zod';

// Define ContentEvaluation type directly from the database structure
type ContentEvaluation = {
  evaluation_id: string;
  content_id: string | null;
  written_style_guide_id: string | null;
  visual_style_guide_id: string | null;
  evaluation_status: string;
  overall_score: number | null;
  overall_severity?: number; // Severity level (1-3)
  rule_hits_json: Record<string, unknown> | null;
  evaluation_metadata_json: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

export type ContentEvaluationResponse = ContentEvaluation & {
  rule_hits?: Array<{
    rule_hit_id: string;
    [key: string]: unknown;
  }>;
  content?: {
    content_id: string;
    [key: string]: unknown;
  };
  written_style_guide?: {
    written_style_guide_id: string;
    [key: string]: unknown;
  };
  visual_style_guide?: {
    visual_style_guide_id: string;
    [key: string]: unknown;
  };
};

export type CreateContentEvaluationPayload = z.infer<typeof createContentEvaluationPayloadSchema>;
export type UpdateContentEvaluationPayload = z.infer<typeof updateContentEvaluationPayloadSchema>;

export type ListContentEvaluationsParams = {
  style_guide_id?: string;
  content_id?: string;
  blocked?: boolean;
  overall_severity?: number;
  written_style_guide_id?: string;
  visual_style_guide_id?: string;
  evaluation_status?: string;
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
 * Get a single content evaluation by ID
 */
export async function getContentEvaluationById(
  evaluationId: string
): Promise<ContentEvaluationResponse> {
  const supabase = createClient();

  const { data: evaluation, error: evaluationError } = await supabase
    .from('content_evaluations')
    .select('*')
    .eq('evaluation_id', evaluationId)
    .single();

  if (evaluationError) {
    throw new Error(`Failed to fetch content evaluation: ${evaluationError.message}`);
  }

  // Get related rule hits
  const { data: ruleHits, error: ruleHitsError } = await supabase
    .from('evaluation_rule_hits')
    .select('*')
    .eq('evaluation_id', evaluationId)
    .order('severity_level', { ascending: false });

  if (ruleHitsError) {
    throw new Error(`Failed to fetch rule hits: ${ruleHitsError.message}`);
  }

  return {
    ...(evaluation as ContentEvaluation),
    rule_hits: (ruleHits || []) as ContentEvaluationResponse['rule_hits'],
  } as ContentEvaluationResponse;
}

/**
 * List content evaluations with pagination and filtering
 */
export async function listContentEvaluations(
  params: ListContentEvaluationsParams = {}
): Promise<PaginatedResponse<ContentEvaluation>> {
  const supabase = createClient();
  const { style_guide_id, content_id, blocked, overall_severity, page = 1, per_page = 20 } = params;

  let query = supabase.from('content_evaluations').select('*', { count: 'exact' });

  if (style_guide_id) {
    query = query.eq('style_guide_id', style_guide_id);
  }

  if (content_id) {
    query = query.eq('content_id', content_id);
  }

  if (blocked !== undefined) {
    query = query.eq('blocked', blocked);
  }

  if (overall_severity !== undefined) {
    query = query.eq('overall_severity', overall_severity);
  }

  const offset = (page - 1) * per_page;
  query = query.range(offset, offset + per_page - 1);
  query = query.order('evaluated_at', { ascending: false });

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to list content evaluations: ${error.message}`);
  }

  return {
    data: (data || []) as ContentEvaluation[],
    meta: {
      total: count || 0,
      page,
      per_page,
      total_pages: Math.ceil((count || 0) / per_page),
    },
  };
}

/**
 * Create a new content evaluation
 */
export async function createContentEvaluation(
  payload: CreateContentEvaluationPayload
): Promise<ContentEvaluation> {
  const supabase = createClient();

  // Get the user_id from the users table (not auth.uid())
  const { data: userId, error: userIdError } = await supabase.rpc('current_user_id');

  if (userIdError) {
    console.error('Error fetching user_id:', userIdError);
    throw new Error(`Failed to get user ID: ${userIdError.message}`);
  }

  console.log('Creating content evaluation with user_id:', userId);
  console.log('Payload:', payload);

  const insertPayload = {
    ...payload,
    style_guide_id: payload.style_guide_id ?? payload.written_style_guide_id ?? null,
    written_style_guide_id: payload.written_style_guide_id ?? payload.style_guide_id ?? null,
    created_by: userId || null,
    evaluated_at: new Date().toISOString(),
  };

  console.log('Insert payload:', insertPayload);

  const { data, error } = await supabase
    .from('content_evaluations')
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    console.error('Error creating content evaluation:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    throw new Error(`Failed to create content evaluation: ${error.message}`);
  }

  return data as ContentEvaluation;
}

/**
 * Update an existing content evaluation
 */
export async function updateContentEvaluation(
  payload: UpdateContentEvaluationPayload
): Promise<ContentEvaluation> {
  const supabase = createClient();

  const { evaluation_id, ...updateData } = payload;

  const { data, error } = await supabase
    .from('content_evaluations')
    .update(updateData)
    .eq('evaluation_id', evaluation_id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update content evaluation: ${error.message}`);
  }

  return data as ContentEvaluation;
}

/**
 * Delete a content evaluation
 */
export async function deleteContentEvaluation(evaluationId: string): Promise<ContentEvaluation> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('content_evaluations')
    .delete()
    .eq('evaluation_id', evaluationId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to delete content evaluation: ${error.message}`);
  }

  return data as ContentEvaluation;
}

/**
 * Get all content evaluations for a style guide
 */
export async function getContentEvaluationsByStyleGuideId(
  styleGuideId: string
): Promise<ContentEvaluation[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('content_evaluations')
    .select('*')
    .eq('style_guide_id', styleGuideId)
    .order('evaluated_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch content evaluations: ${error.message}`);
  }

  return (data || []) as ContentEvaluation[];
}

/**
 * Get blocked content evaluations for a style guide
 */
export async function getBlockedContentEvaluationsByStyleGuideId(
  styleGuideId: string
): Promise<ContentEvaluation[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('content_evaluations')
    .select('*')
    .eq('style_guide_id', styleGuideId)
    .eq('blocked', true)
    .order('evaluated_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch blocked content evaluations: ${error.message}`);
  }

  return (data || []) as ContentEvaluation[];
}
