/**
 * Options API
 * Fetch filter options (industries, company sizes) from database
 */

import { createClient } from '@/lib/supabase/client';
import type { OptionIndustry, OptionCompanySize } from '../types/company';

/**
 * Fetch all industries from option_industries table
 */
export async function getIndustries(): Promise<OptionIndustry[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('option_industries')
    .select('*')
    .order('value', { ascending: true });

  if (error) {
    console.error('Error fetching industries:', error);
    throw new Error(`Failed to fetch industries: ${error.message}`);
  }

  return data || [];
}

/**
 * Fetch all company sizes from option_company_sizes table
 */
export async function getCompanySizes(): Promise<OptionCompanySize[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('option_company_sizes')
    .select('*')
    .order('company_size_id', { ascending: true });

  if (error) {
    console.error('Error fetching company sizes:', error);
    throw new Error(`Failed to fetch company sizes: ${error.message}`);
  }

  return data || [];
}
