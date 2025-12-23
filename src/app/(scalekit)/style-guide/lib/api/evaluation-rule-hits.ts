/**
 * API functions for Evaluation Rule Hits table
 * CRUD operations for evaluation rule hits
 */

import { createClient } from '@/lib/supabase/client';
import { createEvaluationRuleHitPayloadSchema, updateEvaluationRuleHitPayloadSchema } from '../types/validation';
import type { z } from 'zod';

// Define EvaluationRuleHit type directly from the database structure
type EvaluationRuleHit = {
  rule_hit_id: string;
  evaluation_id: string;
  compliance_rule_id: string | null;
  rule_name: string;
  severity_level: number;
  matched_text: string | null;
  suggestion: string | null;
  rule_metadata_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type CreateEvaluationRuleHitPayload = z.infer<typeof createEvaluationRuleHitPayloadSchema>;
type UpdateEvaluationRuleHitPayload = z.infer<typeof updateEvaluationRuleHitPayloadSchema>;

/**
 * Get a single evaluation rule hit by ID
 */
export async function getEvaluationRuleHitById(
  ruleHitId: string
): Promise<EvaluationRuleHit> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('evaluation_rule_hits')
    .select('*')
    .eq('rule_hit_id', ruleHitId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch evaluation rule hit: ${error.message}`);
  }

  return data as EvaluationRuleHit;
}

/**
 * Get all rule hits for an evaluation
 */
export async function getEvaluationRuleHitsByEvaluationId(
  evaluationId: string
): Promise<EvaluationRuleHit[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('evaluation_rule_hits')
    .select('*')
    .eq('evaluation_id', evaluationId)
    .order('severity_level', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch evaluation rule hits: ${error.message}`);
  }

  return (data || []) as EvaluationRuleHit[];
}

/**
 * Get blocking rule hits for an evaluation
 */
export async function getBlockingEvaluationRuleHitsByEvaluationId(
  evaluationId: string
): Promise<EvaluationRuleHit[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('evaluation_rule_hits')
    .select('*')
    .eq('evaluation_id', evaluationId)
    .eq('is_blocking', true)
    .order('severity_level', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch blocking rule hits: ${error.message}`);
  }

  return (data || []) as EvaluationRuleHit[];
}

/**
 * Create a new evaluation rule hit
 */
export async function createEvaluationRuleHit(
  payload: CreateEvaluationRuleHitPayload
): Promise<EvaluationRuleHit> {
  const supabase = createClient();

  const insertPayload = {
    ...payload,
    suggestion: payload.suggestion ?? payload.suggested_replacement,
  };

  const { data, error } = await supabase
    .from('evaluation_rule_hits')
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create evaluation rule hit: ${error.message}`);
  }

  return data as EvaluationRuleHit;
}

/**
 * Create multiple evaluation rule hits in a batch
 */
export async function createEvaluationRuleHits(
  payloads: CreateEvaluationRuleHitPayload[]
): Promise<EvaluationRuleHit[]> {
  const supabase = createClient();

  const insertPayloads = payloads.map(payload => ({
    ...payload,
    suggestion: payload.suggestion ?? payload.suggested_replacement,
  }));

  const { data, error } = await supabase
    .from('evaluation_rule_hits')
    .insert(insertPayloads)
    .select();

  if (error) {
    throw new Error(`Failed to create evaluation rule hits: ${error.message}`);
  }

  return (data || []) as EvaluationRuleHit[];
}

/**
 * Update an existing evaluation rule hit
 */
export async function updateEvaluationRuleHit(
  payload: UpdateEvaluationRuleHitPayload
): Promise<EvaluationRuleHit> {
  const supabase = createClient();

  const { rule_hit_id, ...updateData } = payload;

  const { data, error } = await supabase
    .from('evaluation_rule_hits')
    .update(updateData)
    .eq('rule_hit_id', rule_hit_id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update evaluation rule hit: ${error.message}`);
  }

  return data as EvaluationRuleHit;
}

/**
 * Delete an evaluation rule hit
 */
export async function deleteEvaluationRuleHit(
  ruleHitId: string
): Promise<EvaluationRuleHit> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('evaluation_rule_hits')
    .delete()
    .eq('rule_hit_id', ruleHitId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to delete evaluation rule hit: ${error.message}`);
  }

  return data as EvaluationRuleHit;
}

/**
 * Delete all rule hits for an evaluation
 */
export async function deleteEvaluationRuleHitsByEvaluationId(
  evaluationId: string
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('evaluation_rule_hits')
    .delete()
    .eq('evaluation_id', evaluationId);

  if (error) {
    throw new Error(`Failed to delete evaluation rule hits: ${error.message}`);
  }
}

