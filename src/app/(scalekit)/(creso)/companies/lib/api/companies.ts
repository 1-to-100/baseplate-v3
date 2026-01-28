/**
 * Companies API
 * Functions for fetching companies list with filters and pagination
 */

import { createClient } from '@/lib/supabase/client';
import type {
  CompanyItem,
  GetCompaniesParams,
  GetCompaniesResponse,
  CompanyItemList,
} from '../types/company';

/**
 * Get companies list with filters, pagination, and sorting
 */
export async function getCompanies(params: GetCompaniesParams = {}): Promise<GetCompaniesResponse> {
  const supabase = createClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  // Get current customer ID (if needed for filtering)
  const { data: customerId, error: customerIdError } = await supabase.rpc('current_customer_id');

  if (customerIdError || !customerId) {
    throw new Error(`Failed to get customer ID: ${customerIdError?.message ?? 'not available'}`);
  }

  // Build query
  let query = supabase.from('companies').select('*', { count: 'exact' });

  // Apply search filter
  const search = params.search || '';
  if (search && search.trim()) {
    query = query.or(
      `display_name.ilike.%${search}%,legal_name.ilike.%${search}%,domain.ilike.%${search}%`
    );
  }

  // Apply country filter
  if (params.country) {
    if (Array.isArray(params.country)) {
      if (params.country.length > 0) {
        query = query.in('country', params.country);
      }
    } else {
      query = query.eq('country', params.country);
    }
  }

  // Apply region filter
  if (params.region) {
    if (Array.isArray(params.region)) {
      if (params.region.length > 0) {
        query = query.in('region', params.region);
      }
    } else {
      query = query.eq('region', params.region);
    }
  }

  // Apply employee count filters
  if (params.min_employees !== undefined) {
    query = query.gte('employees', params.min_employees);
  }
  if (params.max_employees !== undefined) {
    query = query.lte('employees', params.max_employees);
  }

  // Apply category filter
  if (params.category) {
    if (Array.isArray(params.category)) {
      if (params.category.length > 0) {
        // For array filters, check if categories array contains any of the filter values
        // Supabase doesn't support array overlap directly, so we use OR conditions
        const categoryConditions = params.category.map((cat) => `categories.cs.{${cat}}`).join(',');
        query = query.or(categoryConditions);
      }
    } else {
      query = query.contains('categories', [params.category]);
    }
  }

  // Apply technology filter (if technologies column exists)
  if (params.technology) {
    if (Array.isArray(params.technology)) {
      if (params.technology.length > 0) {
        const techConditions = params.technology
          .map((tech) => `technologies.cs.{${tech}}`)
          .join(',');
        query = query.or(techConditions);
      }
    } else {
      query = query.contains('technologies', [params.technology]);
    }
  }

  // Apply sorting
  const sortBy = params.sortBy || params.orderBy || 'created_at';
  const sortOrder = params.sortOrder || params.orderDirection || 'desc';
  query = query.order(sortBy, { ascending: sortOrder === 'asc' });

  // Apply pagination
  const page = params.page || 1;
  const limit = params.limit || params.perPage || 10;
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  // Execute query
  const { data: companies, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch companies: ${error.message}`);
  }

  // Transform companies to CompanyItem format
  const transformedCompanies: CompanyItem[] = (companies || []).map((company) => {
    // Map company_id (string) to id (number) for compatibility
    // Use a hash or numeric conversion - for now, we'll use a simple approach
    // In production, you might want to add an integer id column or use a different mapping
    const numericId =
      parseInt(company.company_id?.replace(/-/g, '').substring(0, 10) || '0', 16) || 0;

    return {
      id: numericId,
      company_id: company.company_id || undefined,
      name: company.display_name || company.legal_name || 'Unknown',
      type: company.type || undefined,
      description: company.description || undefined,
      website: company.website_url || undefined,
      homepageUri: company.website_url || undefined,
      logo: company.logo || undefined,
      country: company.country || undefined,
      region: company.region || undefined,
      address: company.address || undefined,
      latitude: company.latitude || undefined,
      longitude: company.longitude || undefined,
      revenue: undefined, // Not in companies table, would need to join customer_companies
      currency_code: undefined, // Not in companies table
      employees: company.employees || undefined,
      siccodes: company.siccodes || undefined,
      categories: company.categories || undefined,
      technologies: company.technologies || undefined,
      phone: company.phone || undefined,
      email: company.email || undefined,
      last_scoring_results: undefined, // Would need to join customer_companies
      social_links: company.social_links || undefined,
      fetched_at: company.fetched_at || undefined,
      created_at: company.created_at || new Date().toISOString(),
      updated_at: company.updated_at || new Date().toISOString(),
      lists: undefined, // Would need separate query
    };
  });

  const total = count || 0;
  const totalPages = Math.ceil(total / limit);

  return {
    data: transformedCompanies,
    pagination: {
      page,
      perPage: limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      next: page < totalPages ? page + 1 : null,
      prev: page > 1 ? page - 1 : null,
    },
    meta: {
      currentPage: page,
      lastPage: totalPages,
      perPage: limit,
      total,
    },
  };
}

/**
 * Get company by company_id with scoring and lists
 */
export async function getCompanyById(company_id: string): Promise<CompanyItem> {
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

  // Fetch company
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('*')
    .eq('company_id', company_id)
    .single();

  if (companyError || !company) {
    throw new Error(`Company not found: ${companyError?.message ?? 'not available'}`);
  }

  // Fetch scoring data from customer_companies
  const { data: customerCompany, error: scoringError } = await supabase
    .from('customer_companies')
    .select('*')
    .eq('company_id', company_id)
    .eq('customer_id', customerId)
    .maybeSingle();

  // Scoring error is not critical - company might not have scoring yet
  if (scoringError && scoringError.code !== 'PGRST116') {
    // PGRST116 is "not found" which is acceptable
    console.warn('Failed to fetch scoring data:', scoringError);
  }

  // Fetch lists for this company
  let lists: CompanyItemList[] | undefined = undefined;
  try {
    const { data: listCompanies, error: listsError } = await supabase
      .from('list_companies')
      .select(
        `
        list_id,
        lists:list_id (
          list_id,
          name,
          description
        )
      `
      )
      .eq('company_id', company_id);

    if (!listsError && listCompanies) {
      lists = listCompanies
        .map((lc): CompanyItemList | null => {
          const list = Array.isArray(lc.lists) ? lc.lists[0] : lc.lists;
          if (!list) return null;
          return {
            id: parseInt(lc.list_id?.replace(/-/g, '').substring(0, 10) || '0', 16) || 0,
            name: list.name || 'Unknown',
            description: list.description || undefined,
            isAttached: true,
          };
        })
        .filter((list): list is CompanyItemList => list !== null);
    }
  } catch (error) {
    // Lists are optional, so we don't throw
    console.warn('Failed to fetch lists:', error);
  }

  // Map company_id to numeric id (same logic as getCompanies)
  const numericId =
    parseInt(company.company_id?.replace(/-/g, '').substring(0, 10) || '0', 16) || 0;

  // Parse last_scoring_results from customer_companies
  let last_scoring_results: CompanyItem['last_scoring_results'] = undefined;
  if (customerCompany?.last_scoring_results) {
    try {
      const scoring = customerCompany.last_scoring_results as Record<string, unknown>;
      if (typeof scoring === 'object' && scoring !== null) {
        last_scoring_results = {
          score: typeof scoring.score === 'number' ? scoring.score : 0,
          short_description:
            typeof scoring.short_description === 'string' ? scoring.short_description : '',
          full_description:
            typeof scoring.full_description === 'string' ? scoring.full_description : '',
        };
      }
    } catch (error) {
      console.warn('Failed to parse scoring results:', error);
    }
  }

  return {
    id: numericId,
    company_id: company.company_id,
    name: company.display_name || company.legal_name || 'Unknown',
    type: company.type || undefined,
    description: company.description || undefined,
    website: company.website_url || undefined,
    homepageUri: company.website_url || undefined,
    logo: company.logo || undefined,
    country: company.country || undefined,
    region: company.region || undefined,
    address: company.address || undefined,
    latitude: company.latitude || undefined,
    longitude: company.longitude || undefined,
    revenue: customerCompany?.revenue || undefined,
    currency_code: undefined, // Not in companies table
    employees: company.employees || customerCompany?.employees || undefined,
    siccodes: company.siccodes || undefined,
    categories: company.categories || customerCompany?.categories || undefined,
    technologies: company.technologies || undefined,
    phone: company.phone || undefined,
    email: company.email || undefined,
    last_scoring_results,
    social_links: company.social_links || undefined,
    fetched_at: company.fetched_at || undefined,
    created_at: company.created_at || new Date().toISOString(),
    updated_at: company.updated_at || new Date().toISOString(),
    lists,
  };
}

/**
 * Get diffbot JSON from company_metadata table
 */
export async function getCompanyDiffbotJson(companyId: string): Promise<Record<string, unknown>> {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Not authenticated');
  }

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
