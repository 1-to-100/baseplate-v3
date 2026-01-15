/**
 * API functions for Style Guides table
 * CRUD operations for customer-scoped style guides
 */

import { createClient } from '@/lib/supabase/client';
import { createStyleGuidePayloadSchema, updateStyleGuidePayloadSchema } from '../types/validation';
import type { z } from 'zod';

// Define StyleGuide type directly from the database structure
type StyleGuide = {
  style_guide_id: string;
  customer_id: string;
  guide_name: string;
  brand_personality: string | null;
  brand_voice: string | null;
  formality_option_item_id: string | null;
  sentence_length_option_item_id: string | null;
  pacing_option_item_id: string | null;
  humor_usage_option_item_id: string | null;
  storytelling_style_option_item_id: string | null;
  use_of_jargon_option_item_id: string | null;
  language_level_option_item_id: string | null;
  inclusivity_guidelines?: string | null;
  active?: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type StyleGuideResponse = StyleGuide & {
  formality_option_item?: {
    formality_option_item_id: string;
    [key: string]: unknown;
  };
  sentence_length_option_item?: {
    sentence_option_item_id: string;
    [key: string]: unknown;
  };
  pacing_option_item?: {
    pacing_option_item_id: string;
    [key: string]: unknown;
  };
  humor_usage_option_item?: {
    humor_usage_option_item_id: string;
    [key: string]: unknown;
  };
  storytelling_style_option_item?: {
    storytelling_option_item_id: string;
    [key: string]: unknown;
  };
  use_of_jargon_option_item?: {
    use_of_jargon_option_item_id: string;
    [key: string]: unknown;
  };
  language_level_option_item?: {
    language_level_option_item_id: string;
    [key: string]: unknown;
  };
};

export type CreateStyleGuidePayload = z.infer<typeof createStyleGuidePayloadSchema>;
export type UpdateStyleGuidePayload = z.infer<typeof updateStyleGuidePayloadSchema>;

type ListStyleGuidesParams = {
  customer_id?: string;
  active?: boolean;
  search?: string;
  page?: number;
  per_page?: number;
  order_by?: string;
  order_direction?: 'asc' | 'desc';
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
 * Get a single style guide by ID
 * @param styleGuideId - UUID of the style guide
 * @returns Style guide with related option items
 */
export async function getStyleGuideById(styleGuideId: string): Promise<StyleGuideResponse> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('style_guides')
    .select(
      `
      *,
      formality_option_item:formality_option_items(*),
      sentence_length_option_item:sentence_option_items_singleton(*),
      pacing_option_item:pacing_option_items(*),
      humor_usage_option_item:humor_usage_option_items(*),
      storytelling_style_option_item:storytelling_option_items(*),
      use_of_jargon_option_item:use_of_jargon_option_items(*),
      language_level_option_item:language_level_option_items(*)
    `
    )
    .eq('style_guide_id', styleGuideId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch style guide: ${error.message}`);
  }

  return data as StyleGuideResponse;
}

/**
 * Get the active style guide for a customer
 * @param customerId - UUID of the customer
 * @returns Active style guide or null
 */
export async function getActiveStyleGuideByCustomerId(
  customerId: string
): Promise<StyleGuideResponse | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('style_guides')
    .select(
      `
      *,
      formality_option_item:formality_option_items(*),
      sentence_length_option_item:sentence_option_items_singleton(*),
      pacing_option_item:pacing_option_items(*),
      humor_usage_option_item:humor_usage_option_items(*),
      storytelling_style_option_item:storytelling_option_items(*),
      use_of_jargon_option_item:use_of_jargon_option_items(*),
      language_level_option_item:language_level_option_items(*)
    `
    )
    .eq('customer_id', customerId)
    .eq('active', true)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch active style guide: ${error.message}`);
  }

  return data as StyleGuideResponse | null;
}

/**
 * List style guides with pagination and filtering
 * @param params - Query parameters for filtering and pagination
 * @returns Paginated list of style guides
 */
export async function listStyleGuides(
  params: ListStyleGuidesParams = {}
): Promise<PaginatedResponse<StyleGuideResponse>> {
  const supabase = createClient();
  const {
    customer_id,
    active,
    search,
    page = 1,
    per_page = 20,
    order_by = 'created_at',
    order_direction = 'desc',
  } = params;

  let query = supabase.from('style_guides').select(
    `
      *,
      formality_option_item:formality_option_items(*),
      sentence_length_option_item:sentence_option_items_singleton(*),
      pacing_option_item:pacing_option_items(*),
      humor_usage_option_item:humor_usage_option_items(*),
      storytelling_style_option_item:storytelling_option_items(*),
      use_of_jargon_option_item:use_of_jargon_option_items(*),
      language_level_option_item:language_level_option_items(*)
    `,
    { count: 'exact' }
  );

  if (customer_id) {
    query = query.eq('customer_id', customer_id);
  }

  if (active !== undefined) {
    query = query.eq('active', active);
  }

  if (search) {
    query = query.ilike('guide_name', `%${search}%`);
  }

  const offset = (page - 1) * per_page;
  query = query.range(offset, offset + per_page - 1);
  query = query.order(order_by, { ascending: order_direction === 'asc' });

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to list style guides: ${error.message}`);
  }

  return {
    data: (data || []) as StyleGuideResponse[],
    meta: {
      total: count || 0,
      page,
      per_page,
      total_pages: Math.ceil((count || 0) / per_page),
    },
  };
}

/**
 * Create a new style guide
 * @param payload - Style guide data
 * @returns Created style guide
 */
export async function createStyleGuide(
  payload: CreateStyleGuidePayload
): Promise<StyleGuideResponse> {
  const supabase = createClient();

  // Get auth user ID
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  // Get the user_id from the users table (not auth_user_id)
  let userId: string | null = null;
  try {
    const { data: userData, error: userError } = await supabase.rpc('current_user_id');
    if (userError) {
      console.error('[createStyleGuide] Error getting current_user_id:', userError);
    } else {
      userId = userData;
    }
  } catch (error) {
    console.error('[createStyleGuide] Exception getting current_user_id:', error);
  }

  // Debug logging
  console.log('[createStyleGuide] Debug information:', {
    authUserId: authUser?.id || null,
    userId: userId,
    payload: payload,
  });

  const insertPayload: Partial<StyleGuide> = {
    ...payload,
    created_by: userId,
  };

  console.log('[createStyleGuide] Insert payload:', {
    ...insertPayload,
    created_by: insertPayload.created_by,
    customer_id: insertPayload.customer_id,
  });

  const { data, error } = await supabase
    .from('style_guides')
    .insert(insertPayload)
    .select(
      `
      *,
      formality_option_item:formality_option_items(*),
      sentence_length_option_item:sentence_option_items_singleton(*),
      pacing_option_item:pacing_option_items(*),
      humor_usage_option_item:humor_usage_option_items(*),
      storytelling_style_option_item:storytelling_option_items(*),
      use_of_jargon_option_item:use_of_jargon_option_items(*),
      language_level_option_item:language_level_option_items(*)
    `
    )
    .single();

  if (error) {
    console.error('[createStyleGuide] Insert error:', {
      error: error,
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      insertPayload: insertPayload,
    });
    throw new Error(`Failed to create style guide: ${error.message}`);
  }

  return data as StyleGuideResponse;
}

/**
 * Update an existing style guide
 * @param payload - Style guide update data
 * @returns Updated style guide
 */
export async function updateStyleGuide(
  payload: UpdateStyleGuidePayload
): Promise<StyleGuideResponse> {
  const supabase = createClient();

  const { style_guide_id, ...updateData } = payload;

  const { data, error } = await supabase
    .from('style_guides')
    .update(updateData)
    .eq('style_guide_id', style_guide_id)
    .select(
      `
      *,
      formality_option_item:formality_option_items(*),
      sentence_length_option_item:sentence_option_items_singleton(*),
      pacing_option_item:pacing_option_items(*),
      humor_usage_option_item:humor_usage_option_items(*),
      storytelling_style_option_item:storytelling_option_items(*),
      use_of_jargon_option_item:use_of_jargon_option_items(*),
      language_level_option_item:language_level_option_items(*)
    `
    )
    .single();

  if (error) {
    throw new Error(`Failed to update style guide: ${error.message}`);
  }

  return data as StyleGuideResponse;
}

/**
 * Delete a style guide
 * @param styleGuideId - UUID of the style guide to delete
 * @returns Deleted style guide
 */
export async function deleteStyleGuide(styleGuideId: string): Promise<StyleGuide> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('style_guides')
    .delete()
    .eq('style_guide_id', styleGuideId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to delete style guide: ${error.message}`);
  }

  return data as StyleGuide;
}

/**
 * Search style guides by name
 * @param searchTerm - Search term for guide name
 * @param customerId - Optional customer ID to filter by
 * @returns Array of matching style guides
 */
export async function searchStyleGuides(
  searchTerm: string,
  customerId?: string
): Promise<StyleGuideResponse[]> {
  const supabase = createClient();

  let query = supabase
    .from('style_guides')
    .select(
      `
      *,
      formality_option_item:formality_option_items(*),
      sentence_length_option_item:sentence_option_items_singleton(*),
      pacing_option_item:pacing_option_items(*),
      humor_usage_option_item:humor_usage_option_items(*),
      storytelling_style_option_item:storytelling_option_items(*),
      use_of_jargon_option_item:use_of_jargon_option_items(*),
      language_level_option_item:language_level_option_items(*)
    `
    )
    .ilike('guide_name', `%${searchTerm}%`);

  if (customerId) {
    query = query.eq('customer_id', customerId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to search style guides: ${error.message}`);
  }

  return (data || []) as StyleGuideResponse[];
}
