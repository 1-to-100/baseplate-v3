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
  UpdateCompanyPayload,
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

  console.log('params', params);

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

  // Industry filter: match on companies.categories (Title Case in DB).
  // Capitalize first letter of each word so overlaps matches stored values (e.g. "Agricultural Organizations").
  if (params.category) {
    const toTitleCase = (s: string) => s.toLowerCase().replace(/\b\w/g, (ch) => ch.toUpperCase());
    const categoryValues = (Array.isArray(params.category) ? params.category : [params.category])
      .map((c) => toTitleCase(String(c).trim()))
      .filter(Boolean);
    if (categoryValues.length > 0) {
      query = query.overlaps('categories', categoryValues);
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
      revenue: undefined,
      currency_code: undefined,
      employees: company.employees || undefined,
      siccodes: company.siccodes || undefined,
      categories: company.categories || undefined,
      technologies: company.technologies || undefined,
      phone: company.phone || undefined,
      email: company.email || undefined,
      last_scoring_results: undefined,
      social_links: company.social_links || undefined,
      fetched_at: company.fetched_at || undefined,
      created_at: company.created_at || new Date().toISOString(),
      updated_at: company.updated_at || new Date().toISOString(),
      lists: undefined,
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

/** Result of getCompanyWithScoring: company row + scoring row from customer_companies */
export interface CompanyWithScoringResult {
  company: Record<string, unknown>;
  scoring: {
    last_scoring_results?: CompanyItem['last_scoring_results'];
    revenue?: number | null;
    employees?: number | null;
    categories?: string[] | null;
    country?: string | null;
    region?: string | null;
  } | null;
}

/** Parse last_scoring_results from DB row into CompanyItem shape */
function parseLastScoringResults(raw: unknown): CompanyItem['last_scoring_results'] | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  try {
    const obj = raw as Record<string, unknown>;
    return {
      score: typeof obj.score === 'number' ? obj.score : 0,
      short_description: typeof obj.short_description === 'string' ? obj.short_description : '',
      full_description: typeof obj.full_description === 'string' ? obj.full_description : '',
    };
  } catch {
    return undefined;
  }
}

/**
 * Get company by company_id from companies table and scoring data from customer_companies.
 */
export async function getCompanyWithScoring(company_id: string): Promise<CompanyWithScoringResult> {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  const [
    { data: currentCustomerId, error: currentCustomerError },
    { data: accessibleCustomerIdsRaw, error: accessibleError },
  ] = await Promise.all([
    supabase.rpc('current_customer_id'),
    supabase.rpc('get_accessible_customer_ids'),
  ]);

  let customerIds: string[];
  if (accessibleError || !accessibleCustomerIdsRaw?.length) {
    const fallbackId =
      !currentCustomerError && currentCustomerId != null && currentCustomerId !== ''
        ? Array.isArray(currentCustomerId)
          ? currentCustomerId[0]
          : currentCustomerId
        : null;
    if (!fallbackId) {
      throw new Error(
        `Failed to get customer context: ${accessibleError?.message ?? currentCustomerError?.message ?? 'not available'}`
      );
    }
    customerIds = [fallbackId];
  } else {
    const raw = accessibleCustomerIdsRaw as unknown;
    if (Array.isArray(raw) && raw.length > 0) {
      const first = raw[0];
      customerIds =
        typeof first === 'object' && first !== null && 'customer_id' in first
          ? (raw as Array<{ customer_id: string }>).map((r) => r.customer_id)
          : (raw as string[]);
    } else {
      customerIds = typeof raw === 'string' ? [raw] : [];
    }
    if (!customerIds.length) {
      const fallbackId =
        currentCustomerId != null && currentCustomerId !== ''
          ? Array.isArray(currentCustomerId)
            ? currentCustomerId[0]
            : currentCustomerId
          : null;
      if (fallbackId) customerIds = [fallbackId];
    }
  }
  if (!customerIds.length) {
    throw new Error('No accessible customer context');
  }

  const resolvedCurrentId =
    currentCustomerId != null && currentCustomerId !== ''
      ? Array.isArray(currentCustomerId)
        ? currentCustomerId[0]
        : currentCustomerId
      : null;

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('*')
    .eq('company_id', company_id)
    .single();

  if (companyError || !company) {
    throw new Error(`Company not found: ${companyError?.message ?? 'not available'}`);
  }

  const { data: customerCompanies, error: scoringError } = await supabase
    .from('customer_companies')
    .select('customer_id, last_scoring_results, revenue, employees, categories, country, region')
    .eq('company_id', company_id)
    .in('customer_id', customerIds);

  if (scoringError) {
    console.warn('Failed to fetch scoring data:', scoringError);
  }

  const rows = (customerCompanies ?? []) as Array<{
    customer_id: string;
    last_scoring_results?: unknown;
    revenue?: number | null;
    employees?: number | null;
    categories?: string[] | null;
    country?: string | null;
    region?: string | null;
  }>;

  const withScore = rows.filter((r) => parseLastScoringResults(r.last_scoring_results));
  const currentRow = rows.find((r) => r.customer_id === resolvedCurrentId);
  const currentWithScore =
    currentRow && parseLastScoringResults(currentRow.last_scoring_results) ? currentRow : null;
  const bestRow = currentWithScore ?? withScore[0] ?? currentRow ?? rows[0] ?? null;

  let last_scoring_results: CompanyItem['last_scoring_results'] | undefined;
  if (bestRow?.last_scoring_results) {
    last_scoring_results = parseLastScoringResults(bestRow.last_scoring_results);
  }

  const scoring = bestRow
    ? {
        last_scoring_results: last_scoring_results ?? undefined,
        revenue: bestRow.revenue ?? undefined,
        employees: bestRow.employees ?? undefined,
        categories: bestRow.categories ?? undefined,
        country: bestRow.country ?? undefined,
        region: bestRow.region ?? undefined,
      }
    : null;

  return {
    company: company as Record<string, unknown>,
    scoring,
  };
}

/**
 * Get lists (segments, etc.) that include this company
 */
export async function getCompanyLists(company_id: string): Promise<CompanyItemList[]> {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('Not authenticated');

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

  if (listsError || !listCompanies) return [];

  return listCompanies
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

/**
 * Build CompanyItem from getCompanyWithScoring result + lists
 */
export function buildCompanyItemFromScoring(
  company: Record<string, unknown>,
  scoring: CompanyWithScoringResult['scoring'],
  lists: CompanyItemList[]
): CompanyItem {
  const numericId =
    parseInt((company.company_id as string)?.replace(/-/g, '').substring(0, 10) || '0', 16) || 0;

  return {
    id: numericId,
    company_id: company.company_id as string,
    name: (company.display_name || company.legal_name || 'Unknown') as string,
    type: company.type as string | undefined,
    description: company.description as string | undefined,
    website: company.website_url as string | undefined,
    homepageUri: company.website_url as string | undefined,
    logo: company.logo as string | undefined,
    country: (company.country ?? scoring?.country) as string | undefined,
    region: (company.region ?? scoring?.region) as string | undefined,
    address: company.address as string | undefined,
    latitude: company.latitude as number | undefined,
    longitude: company.longitude as number | undefined,
    revenue: scoring?.revenue ?? undefined,
    currency_code: undefined,
    employees: (company.employees ?? scoring?.employees) as number | undefined,
    siccodes: company.siccodes as string[] | undefined,
    categories: (company.categories ?? scoring?.categories) as string[] | undefined,
    technologies: company.technologies as string[] | undefined,
    phone: company.phone as string | undefined,
    email: company.email as string | undefined,
    last_scoring_results: scoring?.last_scoring_results ?? undefined,
    social_links: company.social_links as CompanyItem['social_links'] | undefined,
    fetched_at: company.fetched_at as string | undefined,
    created_at: (company.created_at || new Date().toISOString()) as string,
    updated_at: (company.updated_at || new Date().toISOString()) as string,
    lists: lists.length > 0 ? lists : undefined,
  };
}

/**
 * Get company by company_id with scoring and lists
 */
export async function getCompanyById(company_id: string): Promise<CompanyItem> {
  const { company, scoring } = await getCompanyWithScoring(company_id);
  const lists = await getCompanyLists(company_id);
  return buildCompanyItemFromScoring(company, scoring, lists);
}

/**
 * Update company by company_id
 */
export async function updateCompany(
  company_id: string,
  payload: UpdateCompanyPayload
): Promise<CompanyItem> {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  const updateData: Record<string, unknown> = {};
  if (payload.name !== undefined) updateData.display_name = payload.name;
  if (payload.description !== undefined) updateData.description = payload.description;
  if (payload.website !== undefined) updateData.website_url = payload.website;
  if (payload.logo !== undefined) updateData.logo = payload.logo;
  if (payload.country !== undefined) updateData.country = payload.country;
  if (payload.region !== undefined) updateData.region = payload.region;
  if (payload.address !== undefined) updateData.address = payload.address;
  if (payload.postal_code !== undefined) updateData.postal_code = payload.postal_code;
  if (payload.latitude !== undefined) updateData.latitude = payload.latitude;
  if (payload.longitude !== undefined) updateData.longitude = payload.longitude;
  if (payload.revenue !== undefined) updateData.revenue = payload.revenue;
  if (payload.capitalization !== undefined) updateData.capitalization = payload.capitalization;
  if (payload.currency_code !== undefined) updateData.currency_code = payload.currency_code;
  if (payload.employees !== undefined) updateData.employees = payload.employees;
  if (payload.siccodes !== undefined) updateData.siccodes = payload.siccodes;
  if (payload.categories !== undefined) updateData.categories = payload.categories;
  if (payload.technologies !== undefined) updateData.technologies = payload.technologies;
  if (payload.phone !== undefined) updateData.phone = payload.phone;
  if (payload.email !== undefined) updateData.email = payload.email;
  if (payload.social_links !== undefined) updateData.social_links = payload.social_links;

  updateData.updated_at = new Date().toISOString();

  const { data: company, error } = await supabase
    .from('companies')
    .update(updateData)
    .eq('company_id', company_id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update company: ${error.message}`);
  }

  if (!company) {
    throw new Error('Company not found after update');
  }

  return getCompanyById(company_id);
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
