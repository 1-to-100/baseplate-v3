/**
 * Companies API
 * Functions for company operations (get by ID, get with scoring, get diffbot JSON, get people)
 */

import { createClient } from '@/lib/supabase/client';
import type { Company, CustomerCompany, CompanyMetadata } from '@/types/company';

/**
 * Get company by ID
 */
export async function getCompanyById(companyId: string): Promise<Company> {
  const supabase = createClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  // Fetch company
  const { data: company, error } = await supabase
    .from('companies')
    .select('*')
    .eq('company_id', companyId)
    .single();

  if (error || !company) {
    throw new Error(`Company not found: ${error?.message ?? 'not available'}`);
  }

  return company as Company;
}

/**
 * Get company with scoring data from customer_companies table
 * If segmentId is provided, verifies the company belongs to the segment
 */
export async function getCompanyWithScoring(
  companyId: string,
  segmentId?: string
): Promise<{
  company: Company;
  scoring: CustomerCompany | null;
}> {
  const supabase = createClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  // Get current customer ID
  const { data: customerId, error: customerIdError } = await supabase.rpc('current_customer_id');

  if (customerIdError || !customerId) {
    throw new Error(`Failed to get customer ID: ${customerIdError?.message ?? 'not available'}`);
  }

  // Fetch company via list_companies join if segmentId provided, otherwise direct
  let company: Company | null = null;

  if (segmentId) {
    // Fetch company through list_companies to ensure it belongs to segment
    // Also verify segment belongs to customer
    const { data: segment, error: segmentError } = await supabase
      .from('lists')
      .select('list_id')
      .eq('list_id', segmentId)
      .eq('customer_id', customerId)
      .eq('list_type', 'segment')
      .is('deleted_at', null)
      .single();

    if (segmentError || !segment) {
      throw new Error(`Segment not found: ${segmentError?.message ?? 'not available'}`);
    }

    const { data: listCompany, error: listCompanyError } = await supabase
      .from('list_companies')
      .select(
        `
        company_id,
        companies:company_id (
          *
        )
      `
      )
      .eq('list_id', segmentId)
      .eq('company_id', companyId)
      .single();

    if (listCompanyError || !listCompany) {
      throw new Error(
        `Company not found in segment: ${listCompanyError?.message ?? 'not available'}`
      );
    }

    const companyData = Array.isArray(listCompany.companies)
      ? listCompany.companies[0]
      : listCompany.companies;
    company = companyData as Company;
  } else {
    // Direct fetch from companies table
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('company_id', companyId)
      .single();

    if (companyError || !companyData) {
      throw new Error(`Company not found: ${companyError?.message ?? 'not available'}`);
    }
    company = companyData as Company;
  }

  // Fetch scoring data from customer_companies
  const { data: customerCompany, error: scoringError } = await supabase
    .from('customer_companies')
    .select('*')
    .eq('company_id', companyId)
    .eq('customer_id', customerId)
    .maybeSingle();

  // Scoring error is not critical - company might not have scoring yet
  if (scoringError && scoringError.code !== 'PGRST116') {
    // PGRST116 is "not found" which is acceptable
    console.warn('Failed to fetch scoring data:', scoringError);
  }

  return {
    company,
    scoring: (customerCompany as CustomerCompany) || null,
  };
}

/**
 * Get diffbot JSON from company_metadata table
 */
export async function getCompanyDiffbotJson(companyId: string): Promise<Record<string, unknown>> {
  const supabase = createClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  // Fetch company metadata
  const { data: metadata, error } = await supabase
    .from('company_metadata')
    .select('diffbot_json')
    .eq('company_id', companyId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch diffbot JSON: ${error.message}`);
  }

  if (!metadata || !metadata.diffbot_json) {
    throw new Error('Diffbot JSON not found for this company');
  }

  return metadata.diffbot_json as Record<string, unknown>;
}

/**
 * Get people/contacts for a company
 * Currently stubbed - returns empty array
 * Future: Implement when people table is available or extract from diffbot JSON
 */
export async function getCompanyPeople(
  companyId: string,
  options?: {
    page?: number;
    perPage?: number;
    search?: string;
  }
): Promise<{
  data: Array<{
    id: number;
    name: string;
    titles?: string[];
    emails?: string[];
    phones?: string[];
    image?: string | null;
  }>;
  meta: {
    total: number;
    page: number;
    perPage: number;
    lastPage: number;
  };
}> {
  // Stub implementation - return empty array for now
  // Future: Implement people API when people table is available
  const page = options?.page || 1;
  const perPage = options?.perPage || 25;

  return {
    data: [],
    meta: {
      total: 0,
      page,
      perPage,
      lastPage: 1,
    },
  };
}
