/**
 * API functions for Option Singleton Tables
 * Read-only operations for system-wide option items
 */

import { createClient } from '@/lib/supabase/client';

// Define option item types directly from the database structure
type LanguageLevelOptionItem = {
  language_level_option_item_id: string;
  name: string;
  display_name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
};

type UseOfJargonOptionItem = {
  use_of_jargon_option_item_id: string;
  name: string;
  display_name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
};

type StorytellingOptionItem = {
  storytelling_option_item_id: string;
  name: string;
  display_name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
};

type HumorUsageOptionItem = {
  humor_usage_option_item_id: string;
  name: string;
  display_name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
};

type PacingOptionItem = {
  pacing_option_item_id: string;
  name: string;
  display_name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
};

type SentenceOptionItem = {
  sentence_option_items_id: string;
  name: string;
  display_name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
};

type FormalityOptionItem = {
  formality_option_item_id: string;
  name: string;
  display_name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
};

type EmotionalToneOptionItem = {
  emotional_tone_option_item_id: string;
  name: string;
  display_name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
};

type ComplianceRuleTypeOptionItem = {
  compliance_rule_type_option_item_id: string;
  name: string;
  display_name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
};

/**
 * Get all active language level option items
 */
export async function getLanguageLevelOptionItems(): Promise<LanguageLevelOptionItem[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('language_level_option_items')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch language level option items: ${error.message}`);
  }

  return (data || []) as LanguageLevelOptionItem[];
}

/**
 * Get all active use of jargon option items
 */
export async function getUseOfJargonOptionItems(): Promise<UseOfJargonOptionItem[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('use_of_jargon_option_items')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch use of jargon option items: ${error.message}`);
  }

  return (data || []) as UseOfJargonOptionItem[];
}

/**
 * Get all active storytelling option items
 */
export async function getStorytellingOptionItems(): Promise<StorytellingOptionItem[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('storytelling_option_items')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch storytelling option items: ${error.message}`);
  }

  return (data || []) as StorytellingOptionItem[];
}

/**
 * Get all active humor usage option items
 */
export async function getHumorUsageOptionItems(): Promise<HumorUsageOptionItem[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('humor_usage_option_items')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch humor usage option items: ${error.message}`);
  }

  return (data || []) as HumorUsageOptionItem[];
}

/**
 * Get all active pacing option items
 */
export async function getPacingOptionItems(): Promise<PacingOptionItem[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('pacing_option_items')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch pacing option items: ${error.message}`);
  }

  return (data || []) as PacingOptionItem[];
}

/**
 * Get all active sentence option items
 */
export async function getSentenceOptionItems(): Promise<SentenceOptionItem[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('sentence_option_items_singleton')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch sentence option items: ${error.message}`);
  }

  return (data || []) as SentenceOptionItem[];
}

/**
 * Get all active formality option items
 */
export async function getFormalityOptionItems(): Promise<FormalityOptionItem[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('formality_option_items')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch formality option items: ${error.message}`);
  }

  return (data || []) as FormalityOptionItem[];
}

/**
 * Get all active emotional tone option items
 */
export async function getEmotionalToneOptionItems(): Promise<EmotionalToneOptionItem[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('emotional_tone_option_items')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch emotional tone option items: ${error.message}`);
  }

  return (data || []) as EmotionalToneOptionItem[];
}

/**
 * Get all active compliance rule type option items
 */
export async function getComplianceRuleTypeOptionItems(): Promise<ComplianceRuleTypeOptionItem[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('compliance_rule_type_option_items')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch compliance rule type option items: ${error.message}`);
  }

  return (data || []) as ComplianceRuleTypeOptionItem[];
}
