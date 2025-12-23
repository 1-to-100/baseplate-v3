/**
 * API functions for Compliance Reviews table
 * CRUD operations for compliance reviews
 */

import { createClient } from '@/lib/supabase/client';
import { createComplianceReviewPayloadSchema, updateComplianceReviewPayloadSchema } from '../types/validation';
import type { z } from 'zod';

// Define ComplianceReview type directly from the database structure
type ComplianceReview = {
  compliance_review_id: string;
  evaluation_id: string;
  content_id: string | null;
  assigned_reviewer_id: string | null;
  status: 'pending' | 'approved' | 'request_changes' | 'blocked';
  action_notes: string | null;
  llm_rewrite_suggestion: string | null;
  requested_changes_json: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
};

type ComplianceReviewResponse = ComplianceReview & {
  evaluation?: {
    evaluation_id: string;
    rule_hits?: Array<{ rule_hit_id: string; [key: string]: unknown }>;
    [key: string]: unknown;
  };
};

export type CreateComplianceReviewPayload = z.infer<typeof createComplianceReviewPayloadSchema>;
export type UpdateComplianceReviewPayload = z.infer<typeof updateComplianceReviewPayloadSchema>;

export type ListComplianceReviewsParams = {
  evaluation_id?: string;
  assigned_reviewer_id?: string;
  status?: 'pending' | 'approved' | 'request_changes' | 'blocked';
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
 * Get a single compliance review by ID
 */
export async function getComplianceReviewById(
  complianceReviewId: string
): Promise<ComplianceReviewResponse> {
  const supabase = createClient();

  const { data: review, error: reviewError } = await supabase
    .from('compliance_reviews')
    .select('*')
    .eq('compliance_review_id', complianceReviewId)
    .single();

  if (reviewError) {
    throw new Error(`Failed to fetch compliance review: ${reviewError.message}`);
  }

  // Get related evaluation
  const { data: evaluation, error: evaluationError } = await supabase
    .from('content_evaluations')
    .select('*')
    .eq('evaluation_id', review.evaluation_id)
    .single();

  if (evaluationError) {
    throw new Error(`Failed to fetch evaluation: ${evaluationError.message}`);
  }

  return {
    ...(review as ComplianceReview),
    evaluation: evaluation as ComplianceReviewResponse['evaluation'],
  } as ComplianceReviewResponse;
}

/**
 * List compliance reviews with pagination and filtering
 */
export async function listComplianceReviews(
  params: ListComplianceReviewsParams = {}
): Promise<PaginatedResponse<ComplianceReview>> {
  const supabase = createClient();
  const {
    evaluation_id,
    assigned_reviewer_id,
    status,
    page = 1,
    per_page = 20,
  } = params;

  let query = supabase
    .from('compliance_reviews')
    .select('*', { count: 'exact' });

  if (evaluation_id) {
    query = query.eq('evaluation_id', evaluation_id);
  }

  if (assigned_reviewer_id) {
    query = query.eq('assigned_reviewer_id', assigned_reviewer_id);
  }

  if (status) {
    query = query.eq('status', status);
  }

  const offset = (page - 1) * per_page;
  query = query.range(offset, offset + per_page - 1);
  query = query.order('created_at', { ascending: false });

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to list compliance reviews: ${error.message}`);
  }

  return {
    data: (data || []) as ComplianceReview[],
    meta: {
      total: count || 0,
      page,
      per_page,
      total_pages: Math.ceil((count || 0) / per_page),
    },
  };
}

/**
 * Create a new compliance review
 */
export async function createComplianceReview(
  payload: CreateComplianceReviewPayload
): Promise<ComplianceReview> {
  const supabase = createClient();

  // Get the user_id from the users table (not auth.uid())
  const { data: userId, error: userIdError } = await supabase.rpc('current_user_id');

  if (userIdError) {
    console.error('Error fetching user_id:', userIdError);
    throw new Error(`Failed to get user ID: ${userIdError.message}`);
  }

  console.log('Creating compliance review with user_id:', userId);
  console.log('Payload:', payload);

  const insertPayload = {
    ...payload,
    created_by: userId || null,
  };

  console.log('Insert payload:', insertPayload);

  const { data, error } = await supabase
    .from('compliance_reviews')
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    console.error('Error creating compliance review:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    throw new Error(`Failed to create compliance review: ${error.message}`);
  }

  return data as ComplianceReview;
}

/**
 * Update an existing compliance review
 */
export async function updateComplianceReview(
  payload: UpdateComplianceReviewPayload
): Promise<ComplianceReview> {
  const supabase = createClient();

  const { compliance_review_id, ...updateData } = payload;

  // If status is being updated to non-pending, set resolved_at
  if (updateData.status && updateData.status !== 'pending' && !updateData.resolved_at) {
    updateData.resolved_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('compliance_reviews')
    .update(updateData)
    .eq('compliance_review_id', compliance_review_id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update compliance review: ${error.message}`);
  }

  return data as ComplianceReview;
}

/**
 * Delete a compliance review
 */
export async function deleteComplianceReview(
  complianceReviewId: string
): Promise<ComplianceReview> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('compliance_reviews')
    .delete()
    .eq('compliance_review_id', complianceReviewId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to delete compliance review: ${error.message}`);
  }

  return data as ComplianceReview;
}

/**
 * Get all compliance reviews for an evaluation
 */
export async function getComplianceReviewsByEvaluationId(
  evaluationId: string
): Promise<ComplianceReview[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('compliance_reviews')
    .select('*')
    .eq('evaluation_id', evaluationId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch compliance reviews: ${error.message}`);
  }

  return (data || []) as ComplianceReview[];
}

/**
 * Get pending compliance reviews for a reviewer
 */
export async function getPendingComplianceReviewsByReviewerId(
  reviewerId: string
): Promise<ComplianceReview[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('compliance_reviews')
    .select('*')
    .eq('assigned_reviewer_id', reviewerId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch pending compliance reviews: ${error.message}`);
  }

  return (data || []) as ComplianceReview[];
}

/**
 * Assign a compliance review to a reviewer
 */
export async function assignComplianceReviewToReviewer(
  complianceReviewId: string,
  reviewerId: string
): Promise<ComplianceReview> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('compliance_reviews')
    .update({
      assigned_reviewer_id: reviewerId,
    })
    .eq('compliance_review_id', complianceReviewId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to assign compliance review: ${error.message}`);
  }

  return data as ComplianceReview;
}

/**
 * Approve a compliance review
 */
export async function approveComplianceReview(
  complianceReviewId: string,
  notes?: string
): Promise<ComplianceReview> {
  return updateComplianceReview({
    compliance_review_id: complianceReviewId,
    status: 'approved',
    action_notes: notes || null,
    resolved_at: new Date().toISOString(),
  });
}

/**
 * Request changes on a compliance review
 */
export async function requestChangesOnComplianceReview(
  complianceReviewId: string,
  requestedChanges: Record<string, unknown>,
  notes?: string
): Promise<ComplianceReview> {
  return updateComplianceReview({
    compliance_review_id: complianceReviewId,
    status: 'request_changes',
    action_notes: notes || null,
    requested_changes_json: requestedChanges,
  });
}

/**
 * Block a compliance review
 */
export async function blockComplianceReview(
  complianceReviewId: string,
  notes?: string
): Promise<ComplianceReview> {
  return updateComplianceReview({
    compliance_review_id: complianceReviewId,
    status: 'blocked',
    action_notes: notes || null,
    resolved_at: new Date().toISOString(),
  });
}

