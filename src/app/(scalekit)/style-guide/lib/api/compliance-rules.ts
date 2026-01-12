/**
 * API functions for Compliance Rules table
 * CRUD operations for customer-scoped compliance rules
 */

import { createClient } from '@/lib/supabase/client';
import {
  createComplianceRulePayloadSchema,
  updateComplianceRulePayloadSchema,
} from '../types/validation';
import type { z } from 'zod';

// Define ComplianceRule type directly from the database structure
type ComplianceRule = {
  compliance_rule_id: string;
  customer_id: string;
  compliance_rule_type_option_item_id: string;
  name: string;
  description: string | null;
  rule_definition_json: Record<string, unknown> | null;
  severity_level: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ComplianceRuleResponse = ComplianceRule & {
  style_guide_id?: string;
  rule_name?: string;
  rule_replacement?: string;
  is_blocking?: boolean;
  compliance_rule_type_option_item?: {
    compliance_rule_type_option_item_id: string;
    [key: string]: unknown;
  };
};

export type CreateComplianceRulePayload = z.infer<typeof createComplianceRulePayloadSchema>;
export type UpdateComplianceRulePayload = z.infer<typeof updateComplianceRulePayloadSchema>;

export type ListComplianceRulesParams = {
  style_guide_id?: string;
  severity_level?: number;
  is_blocking?: boolean;
  search?: string;
  customer_id?: string;
  compliance_rule_type_option_item_id?: string;
  is_active?: boolean;
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
 * Get a single compliance rule by ID
 */
export async function getComplianceRuleById(
  complianceRuleId: string
): Promise<ComplianceRuleResponse> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('compliance_rules')
    .select(
      `
      *,
      compliance_rule_type_option_item:compliance_rule_type_option_items(*)
    `
    )
    .eq('compliance_rule_id', complianceRuleId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch compliance rule: ${error.message}`);
  }

  return data as ComplianceRuleResponse;
}

/**
 * List compliance rules with pagination and filtering
 */
export async function listComplianceRules(
  params: ListComplianceRulesParams = {}
): Promise<PaginatedResponse<ComplianceRuleResponse>> {
  const supabase = createClient();
  const {
    style_guide_id,
    customer_id,
    severity_level,
    is_blocking,
    is_active,
    compliance_rule_type_option_item_id,
    search,
    page = 1,
    per_page = 20,
  } = params;

  let query = supabase.from('compliance_rules').select(
    `
      *,
      compliance_rule_type_option_item:compliance_rule_type_option_items(*)
    `,
    { count: 'exact' }
  );

  if (customer_id) {
    query = query.eq('customer_id', customer_id);
  }

  if (style_guide_id) {
    query = query.eq('style_guide_id', style_guide_id);
  }

  if (compliance_rule_type_option_item_id) {
    query = query.eq('compliance_rule_type_option_item_id', compliance_rule_type_option_item_id);
  }

  if (severity_level !== undefined) {
    query = query.eq('severity_level', severity_level);
  }

  if (is_blocking !== undefined) {
    query = query.eq('is_blocking', is_blocking);
  }

  if (is_active !== undefined) {
    query = query.eq('is_active', is_active);
  }

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  const offset = (page - 1) * per_page;
  query = query.range(offset, offset + per_page - 1);
  query = query.order('severity_level', { ascending: false });

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to list compliance rules: ${error.message}`);
  }

  return {
    data: (data || []) as ComplianceRuleResponse[],
    meta: {
      total: count || 0,
      page,
      per_page,
      total_pages: Math.ceil((count || 0) / per_page),
    },
  };
}

/**
 * Create a new compliance rule
 */
export async function createComplianceRule(
  payload: CreateComplianceRulePayload
): Promise<ComplianceRuleResponse> {
  const supabase = createClient();

  // Get the user_id from the users table (not auth.uid())
  const { data: userId, error: userIdError } = await supabase.rpc('current_user_id');

  if (userIdError) {
    console.error('Error fetching user_id:', userIdError);
    throw new Error(`Failed to get user ID: ${userIdError.message}`);
  }

  console.log('Creating compliance rule with user_id:', userId);
  console.log('Payload:', payload);

  const insertPayload = {
    ...payload,
    name: payload.name ?? payload.rule_name ?? '',
    rule_name: payload.rule_name ?? payload.name ?? '',
    created_by: userId || null,
  };

  console.log('Insert payload:', insertPayload);

  const { data, error } = await supabase
    .from('compliance_rules')
    .insert(insertPayload)
    .select(
      `
      *,
      compliance_rule_type_option_item:compliance_rule_type_option_items(*)
    `
    )
    .single();

  if (error) {
    console.error('Error creating compliance rule:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    throw new Error(`Failed to create compliance rule: ${error.message}`);
  }

  return data as ComplianceRuleResponse;
}

/**
 * Update an existing compliance rule
 */
export async function updateComplianceRule(
  payload: UpdateComplianceRulePayload
): Promise<ComplianceRuleResponse> {
  const supabase = createClient();

  const { compliance_rule_id, ...updateData } = payload;

  const { data, error } = await supabase
    .from('compliance_rules')
    .update(updateData)
    .eq('compliance_rule_id', compliance_rule_id)
    .select(
      `
      *,
      compliance_rule_type_option_item:compliance_rule_type_option_items(*)
    `
    )
    .single();

  if (error) {
    throw new Error(`Failed to update compliance rule: ${error.message}`);
  }

  return data as ComplianceRuleResponse;
}

/**
 * Delete a compliance rule
 */
export async function deleteComplianceRule(complianceRuleId: string): Promise<ComplianceRule> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('compliance_rules')
    .delete()
    .eq('compliance_rule_id', complianceRuleId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to delete compliance rule: ${error.message}`);
  }

  return data as ComplianceRule;
}

/**
 * Get all compliance rules for a style guide
 */
export async function getComplianceRulesByStyleGuideId(
  styleGuideId: string
): Promise<ComplianceRuleResponse[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('compliance_rules')
    .select(
      `
      *,
      compliance_rule_type_option_item:compliance_rule_type_option_items(*)
    `
    )
    .eq('style_guide_id', styleGuideId)
    .order('severity_level', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch compliance rules: ${error.message}`);
  }

  return (data || []) as ComplianceRuleResponse[];
}

/**
 * Get blocking compliance rules for a style guide
 */
export async function getBlockingComplianceRulesByStyleGuideId(
  styleGuideId: string
): Promise<ComplianceRuleResponse[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('compliance_rules')
    .select(
      `
      *,
      compliance_rule_type_option_item:compliance_rule_type_option_items(*)
    `
    )
    .eq('style_guide_id', styleGuideId)
    .eq('is_blocking', true)
    .order('severity_level', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch blocking compliance rules: ${error.message}`);
  }

  return (data || []) as ComplianceRuleResponse[];
}
