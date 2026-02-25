/**
 * Companies API
 * Functions for fetching companies list with filters and pagination.
 * With customer context: companies are taken from customer_companies (for a specific customer).
 * System admin: all companies from the companies table.
 */

import { createClient } from '@/lib/supabase/client';
import type {
  CompanyItem,
  GetCompaniesParams,
  GetCompaniesResponse,
  CompanyItemList,
  UpdateCompanyPayload,
} from '../types/company';
import { hasListFilters, companyMatchesListFilters } from '../utils/list-filters';

/** Apply common filters to a companies query builder (used for both paths). */
function applyCompaniesFilters<
  T extends {
    or: (x: string) => T;
    in: (col: string, vals: string[]) => T;
    eq: (col: string, val: string) => T;
    gte: (col: string, val: number) => T;
    lte: (col: string, val: number) => T;
    overlaps: (col: string, vals: string[]) => T;
    contains: (col: string, vals: string[]) => T;
  },
>(query: T, params: GetCompaniesParams): T {
  let q = query;
  const search = params.search || '';
  if (search && search.trim()) {
    q = q.or(
      `display_name.ilike.%${search}%,legal_name.ilike.%${search}%,domain.ilike.%${search}%`
    ) as T;
  }
  if (params.country) {
    if (Array.isArray(params.country)) {
      if (params.country.length > 0) q = q.in('country', params.country) as T;
    } else {
      q = q.eq('country', params.country) as T;
    }
  }
  if (params.region) {
    if (Array.isArray(params.region)) {
      if (params.region.length > 0) q = q.in('region', params.region) as T;
    } else {
      q = q.eq('region', params.region) as T;
    }
  }
  if (params.min_employees !== undefined) q = q.gte('employees', params.min_employees) as T;
  if (params.max_employees !== undefined) q = q.lte('employees', params.max_employees) as T;
  if (params.category) {
    const toTitleCase = (s: string) => s.toLowerCase().replace(/\b\w/g, (ch) => ch.toUpperCase());
    const categoryValues = (Array.isArray(params.category) ? params.category : [params.category])
      .map((c) => toTitleCase(String(c).trim()))
      .filter(Boolean);
    if (categoryValues.length > 0) q = q.overlaps('categories', categoryValues) as T;
  }
  if (params.technology) {
    if (Array.isArray(params.technology)) {
      if (params.technology.length > 0) {
        const techConditions = params.technology
          .map((tech) => `technologies.cs.{${tech}}`)
          .join(',');
        q = q.or(techConditions) as T;
      }
    } else {
      q = q.contains('technologies', [params.technology]) as T;
    }
  }
  return q;
}

/** Empty companies response with consistent shape. */
function emptyCompaniesResponse(opts: { page: number; limit: number }): GetCompaniesResponse {
  return {
    data: [],
    pagination: {
      page: opts.page,
      perPage: opts.limit,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
      next: null,
      prev: null,
    },
    meta: {
      currentPage: opts.page,
      lastPage: 0,
      perPage: opts.limit,
      total: 0,
    },
  };
}

/** Build CompanyItem from company row and optional customer_companies override. */
function toCompanyItem(
  company: Record<string, unknown>,
  cc?: {
    name?: string | null;
    categories?: string[] | null;
    revenue?: number | null;
    country?: string | null;
    region?: string | null;
    employees?: number | null;
    last_scoring_results?: unknown;
  }
): CompanyItem {
  const numericId =
    parseInt((company.company_id as string)?.replace(/-/g, '').substring(0, 10) || '0', 16) || 0;
  const baseName = (company.display_name || company.legal_name || 'Unknown') as string;
  return {
    id: numericId,
    company_id: (company.company_id as string) || undefined,
    name: cc?.name && cc.name.trim() ? cc.name : baseName,
    type: company.type as string | undefined,
    description: company.description as string | undefined,
    website: company.website_url as string | undefined,
    homepageUri: company.website_url as string | undefined,
    logo: company.logo as string | undefined,
    country: (cc?.country ?? company.country) as string | undefined,
    region: (cc?.region ?? company.region) as string | undefined,
    address: company.address as string | undefined,
    latitude: company.latitude as number | undefined,
    longitude: company.longitude as number | undefined,
    revenue: cc?.revenue ?? (company.revenue as number | undefined),
    currency_code: company.currency_code as string | undefined,
    employees: (cc?.employees ?? company.employees) as number | undefined,
    siccodes: company.siccodes as string[] | undefined,
    categories: (cc?.categories?.length ? cc.categories : company.categories) as
      | string[]
      | undefined,
    technologies: company.technologies as string[] | undefined,
    phone: company.phone as string | undefined,
    email: company.email as string | undefined,
    last_scoring_results: cc?.last_scoring_results
      ? parseLastScoringResultsForItem(cc.last_scoring_results)
      : undefined,
    social_links: company.social_links as CompanyItem['social_links'],
    fetched_at: company.fetched_at as string | undefined,
    created_at: (company.created_at || new Date().toISOString()) as string,
    updated_at: (company.updated_at || new Date().toISOString()) as string,
    lists: undefined,
  };
}

function parseLastScoringResultsForItem(raw: unknown): CompanyItem['last_scoring_results'] {
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
 * Get companies list with filters, pagination, and sorting.
 * Effective customer is resolved from JWT app_metadata (context switcher) then current_customer_id() RPC.
 * - With effective customer: companies from customer_companies for that customer (same for sysadmin and non-sysadmin).
 * - System admin with no customer in context: all companies from companies table.
 */
export async function getCompanies(params: GetCompaniesParams = {}): Promise<GetCompaniesResponse> {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  const [
    { data: session },
    { data: isSystemAdmin },
    { data: currentCustomerId, error: customerIdError },
  ] = await Promise.all([
    supabase.auth.getSession(),
    supabase.rpc('is_system_admin'),
    supabase.rpc('current_customer_id'),
  ]);

  const page = params.page || 1;
  const limit = params.limit || params.perPage || 10;
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const sortBy = params.sortBy || params.orderBy || 'created_at';
  const sortOrder = params.sortOrder || params.orderDirection || 'desc';
  const opts = { page, limit, from, to, sortBy, sortOrder };

  // Effective customer: JWT app_metadata.customer_id first (set by context switcher), then current_customer_id() RPC
  const sessionData = session?.session ?? null;
  const jwtCustomerId = (sessionData?.user?.app_metadata as Record<string, unknown> | undefined)
    ?.customer_id;
  const fromJwt =
    typeof jwtCustomerId === 'string' && jwtCustomerId.trim() ? jwtCustomerId.trim() : null;
  const fromRpc =
    !customerIdError && currentCustomerId != null && currentCustomerId !== ''
      ? Array.isArray(currentCustomerId)
        ? currentCustomerId[0]
        : (currentCustomerId as string)
      : null;

  const effectiveCustomerId = fromJwt ?? fromRpc;

  // When listId is set, restrict to companies in that list if the list is static (same access as getListById).
  let listCompanyIds: string[] | null = null;
  if (params.listId) {
    let listQuery = supabase
      .from('lists')
      .select('list_id, is_static')
      .eq('list_id', params.listId)
      .eq('list_type', 'list')
      .is('deleted_at', null);
    if (effectiveCustomerId) {
      listQuery = listQuery.eq('customer_id', effectiveCustomerId);
    }
    const { data: listRow, error: listError } = await listQuery.maybeSingle();
    if (!listError && listRow?.is_static === true) {
      const { data: lcRows, error: lcError } = await supabase
        .from('list_companies')
        .select('company_id')
        .eq('list_id', params.listId);
      if (!lcError) {
        listCompanyIds = (lcRows || []).map((r) => r.company_id as string).filter(Boolean);
      }
      if (listCompanyIds?.length === 0) {
        return emptyCompaniesResponse(opts);
      }
    }
  }

  // Static list with companies: use list company ids as the restriction set.
  if (listCompanyIds && listCompanyIds.length > 0) {
    if (effectiveCustomerId) {
      return getCompaniesFromIdSet(supabase, params, listCompanyIds, opts, effectiveCustomerId);
    }
    return getCompaniesFromIdSet(supabase, params, listCompanyIds, opts);
  }

  if (effectiveCustomerId) {
    return getCompaniesWithCustomerContext(supabase, params, effectiveCustomerId, opts);
  }

  if (!isSystemAdmin) {
    throw new Error(`Failed to get customer ID: ${customerIdError?.message ?? 'not available'}`);
  }

  // System admin with no customer selected: return all companies from companies table
  let query = supabase.from('companies').select('*', { count: 'exact' });
  query = applyCompaniesFilters(query, params);
  query = query.order(opts.sortBy, { ascending: opts.sortOrder === 'asc' });
  query = query.range(opts.from, opts.to);

  const { data: companies, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch companies: ${error.message}`);
  }

  const transformedCompanies: CompanyItem[] = (companies || []).map((company) =>
    toCompanyItem(company as Record<string, unknown>)
  );

  const total = count || 0;
  const totalPages = Math.ceil(total / opts.limit);

  return {
    data: transformedCompanies,
    pagination: {
      page: opts.page,
      perPage: opts.limit,
      total,
      totalPages,
      hasNext: opts.page < totalPages,
      hasPrev: opts.page > 1,
      next: opts.page < totalPages ? opts.page + 1 : null,
      prev: opts.page > 1 ? opts.page - 1 : null,
    },
    meta: {
      currentPage: opts.page,
      lastPage: totalPages,
      perPage: opts.limit,
      total,
    },
  };
}

/** Query companies restricted to a set of company_ids, with optional customer_companies overlay. */
async function getCompaniesFromIdSet(
  supabase: ReturnType<typeof createClient>,
  params: GetCompaniesParams,
  companyIds: string[],
  opts: {
    page: number;
    limit: number;
    from: number;
    to: number;
    sortBy: string;
    sortOrder: string;
  },
  customerId?: string
): Promise<GetCompaniesResponse> {
  let query = supabase
    .from('companies')
    .select('*', { count: 'exact' })
    .in('company_id', companyIds);
  query = applyCompaniesFilters(query, params);
  query = query.order(opts.sortBy, { ascending: opts.sortOrder === 'asc' });
  query = query.range(opts.from, opts.to);

  const { data: companies, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch companies: ${error.message}`);
  }

  const pageCompanyIds = (companies || []).map((c) => c.company_id as string);
  let ccByCompany: Map<string, Record<string, unknown>> = new Map();
  if (customerId && pageCompanyIds.length > 0) {
    const { data: ccPage } = await supabase
      .from('customer_companies')
      .select(
        'company_id, name, categories, revenue, country, region, employees, last_scoring_results'
      )
      .eq('customer_id', customerId)
      .in('company_id', pageCompanyIds);
    ccByCompany = new Map(
      (ccPage || []).map((r) => [r.company_id as string, r as Record<string, unknown>])
    );
  }

  const transformedCompanies: CompanyItem[] = (companies || []).map((company) => {
    const cc = ccByCompany.get(company.company_id as string);
    return toCompanyItem(company as Record<string, unknown>, cc);
  });

  const total = count || 0;
  const totalPages = Math.ceil(total / opts.limit);

  return {
    data: transformedCompanies,
    pagination: {
      page: opts.page,
      perPage: opts.limit,
      total,
      totalPages,
      hasNext: opts.page < totalPages,
      hasPrev: opts.page > 1,
      next: opts.page < totalPages ? opts.page + 1 : null,
      prev: opts.page > 1 ? opts.page - 1 : null,
    },
    meta: {
      currentPage: opts.page,
      lastPage: totalPages,
      perPage: opts.limit,
      total,
    },
  };
}

/** Companies from customer_companies for the given customer (same for sysadmin with customer selected and non-sysadmin). */
async function getCompaniesWithCustomerContext(
  supabase: ReturnType<typeof createClient>,
  params: GetCompaniesParams,
  customerId: string,
  opts: { page: number; limit: number; from: number; to: number; sortBy: string; sortOrder: string }
): Promise<GetCompaniesResponse> {
  // Fetch all company IDs for this customer in chunks; Supabase caps single response at 1000 rows.
  // We need the full ID set so the companies query can apply filters/sort and then page correctly.
  const PAGE_SIZE = 1000;
  const companyIds: string[] = [];
  let offset = 0;
  let hasMore = true;
  while (hasMore) {
    const { data: ccRows, error: ccError } = await supabase
      .from('customer_companies')
      .select('company_id')
      .eq('customer_id', customerId)
      .range(offset, offset + PAGE_SIZE - 1);

    if (ccError) {
      throw new Error(`Failed to fetch customer companies: ${ccError.message}`);
    }

    const rows = ccRows || [];
    for (const r of rows) {
      const id = r.company_id as string;
      if (id) companyIds.push(id);
    }
    hasMore = rows.length === PAGE_SIZE;
    offset += PAGE_SIZE;
  }
  if (companyIds.length === 0) {
    return {
      data: [],
      pagination: {
        page: opts.page,
        perPage: opts.limit,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
        next: null,
        prev: null,
      },
      meta: {
        currentPage: opts.page,
        lastPage: 0,
        perPage: opts.limit,
        total: 0,
      },
    };
  }

  let query = supabase
    .from('companies')
    .select('*', { count: 'exact' })
    .in('company_id', companyIds);
  query = applyCompaniesFilters(query, params);
  query = query.order(opts.sortBy, { ascending: opts.sortOrder === 'asc' });
  query = query.range(opts.from, opts.to);

  const { data: companies, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch companies: ${error.message}`);
  }

  const pageCompanyIds = (companies || []).map((c) => c.company_id as string);
  let ccByCompany: Map<string, Record<string, unknown>> = new Map();
  if (pageCompanyIds.length > 0) {
    const { data: ccPage } = await supabase
      .from('customer_companies')
      .select(
        'company_id, name, categories, revenue, country, region, employees, last_scoring_results'
      )
      .eq('customer_id', customerId)
      .in('company_id', pageCompanyIds);
    ccByCompany = new Map(
      (ccPage || []).map((r) => [r.company_id as string, r as Record<string, unknown>])
    );
  }

  const transformedCompanies: CompanyItem[] = (companies || []).map((company) => {
    const cc = ccByCompany.get(company.company_id as string);
    return toCompanyItem(company as Record<string, unknown>, cc);
  });

  const total = count || 0;
  const totalPages = Math.ceil(total / opts.limit);

  return {
    data: transformedCompanies,
    pagination: {
      page: opts.page,
      perPage: opts.limit,
      total,
      totalPages,
      hasNext: opts.page < totalPages,
      hasPrev: opts.page > 1,
      next: opts.page < totalPages ? opts.page + 1 : null,
      prev: opts.page > 1 ? opts.page - 1 : null,
    },
    meta: {
      currentPage: opts.page,
      lastPage: totalPages,
      perPage: opts.limit,
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
    email?: string | null;
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
    .select(
      'customer_id, last_scoring_results, revenue, employees, categories, country, region, email'
    )
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
    email?: string | null;
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
        email: bestRow.email ?? undefined,
      }
    : null;

  return {
    company: company as Record<string, unknown>,
    scoring,
  };
}

/**
 * Get lists (segments, etc.) that include this company.
 * Static lists: from list_companies. Dynamic lists: those whose filters match this company.
 */
export async function getCompanyLists(company_id: string): Promise<CompanyItemList[]> {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('Not authenticated');

  const [{ data: session }, { data: currentCustomerId, error: customerIdError }] =
    await Promise.all([supabase.auth.getSession(), supabase.rpc('current_customer_id')]);
  const sessionData = session?.session ?? null;
  const jwtCustomerId = (sessionData?.user?.app_metadata as Record<string, unknown> | undefined)
    ?.customer_id;
  const fromJwt =
    typeof jwtCustomerId === 'string' && jwtCustomerId.trim() ? jwtCustomerId.trim() : null;
  const fromRpc =
    !customerIdError && currentCustomerId != null && currentCustomerId !== ''
      ? Array.isArray(currentCustomerId)
        ? currentCustomerId[0]
        : (currentCustomerId as string)
      : null;
  const effectiveCustomerId = fromJwt ?? fromRpc;

  const staticLists: CompanyItemList[] = [];
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
    .eq('company_id', company_id)
    .is('lists.deleted_at', null);

  if (!listsError && listCompanies) {
    for (const lc of listCompanies) {
      const list = Array.isArray(lc.lists) ? lc.lists[0] : lc.lists;
      if (!list) continue;
      staticLists.push({
        id: parseInt(lc.list_id?.replace(/-/g, '').substring(0, 10) || '0', 16) || 0,
        name: list.name || 'Unknown',
        description: list.description || undefined,
        isAttached: true,
        list_id: lc.list_id ?? undefined,
      });
    }
  }

  const dynamicLists: CompanyItemList[] = [];
  let dynamicQuery = supabase
    .from('lists')
    .select('list_id, name, description, filters')
    .eq('list_type', 'list')
    .eq('subtype', 'company')
    .eq('is_static', false)
    .is('deleted_at', null);
  if (effectiveCustomerId) {
    dynamicQuery = dynamicQuery.eq('customer_id', effectiveCustomerId);
  }
  const { data: dynamicListRows, error: dynamicError } = await dynamicQuery;
  if (!dynamicError && dynamicListRows && dynamicListRows.length > 0) {
    const { data: companyRow } = await supabase
      .from('companies')
      .select(
        'display_name, legal_name, domain, country, region, employees, categories, technologies'
      )
      .eq('company_id', company_id)
      .single();
    if (companyRow) {
      for (const list of dynamicListRows) {
        if (!hasListFilters(list.filters ?? undefined)) continue;
        if (
          !companyMatchesListFilters(
            companyRow as Record<string, unknown>,
            list.filters ?? undefined
          )
        )
          continue;
        dynamicLists.push({
          id: parseInt(list.list_id?.replace(/-/g, '').substring(0, 10) || '0', 16) || 0,
          name: list.name || 'Unknown',
          description: list.description ?? undefined,
          isAttached: true,
          list_id: list.list_id ?? undefined,
        });
      }
    }
  }

  return [...staticLists, ...dynamicLists];
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
    country: (scoring?.country ?? company.country) as string | undefined,
    region: (scoring?.region ?? company.region) as string | undefined,
    address: company.address as string | undefined,
    latitude: company.latitude as number | undefined,
    longitude: company.longitude as number | undefined,
    revenue: scoring?.revenue ?? undefined,
    currency_code: undefined,
    employees: (scoring?.employees ?? company.employees) as number | undefined,
    siccodes: company.siccodes as string[] | undefined,
    categories: (scoring?.categories ?? company.categories) as string[] | undefined,
    technologies: company.technologies as string[] | undefined,
    phone: company.phone as string | undefined,
    email: (scoring?.email ?? company.email) as string | undefined,
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
 * Resolve current customer id for customer-scoped updates (same pattern as getCompanyWithScoring).
 */
async function resolveCurrentCustomerId(
  supabase: ReturnType<typeof createClient>
): Promise<string | null> {
  const [
    { data: currentCustomerId, error: currentCustomerError },
    { data: accessibleCustomerIdsRaw, error: accessibleError },
  ] = await Promise.all([
    supabase.rpc('current_customer_id'),
    supabase.rpc('get_accessible_customer_ids'),
  ]);

  if (accessibleError || !accessibleCustomerIdsRaw?.length) {
    const fallbackId =
      !currentCustomerError && currentCustomerId != null && currentCustomerId !== ''
        ? Array.isArray(currentCustomerId)
          ? currentCustomerId[0]
          : currentCustomerId
        : null;
    return fallbackId;
  }
  const raw = accessibleCustomerIdsRaw as unknown;
  if (Array.isArray(raw) && raw.length > 0) {
    const first = raw[0];
    const customerIds =
      typeof first === 'object' && first !== null && 'customer_id' in first
        ? (raw as Array<{ customer_id: string }>).map((r) => r.customer_id)
        : (raw as string[]);
    return customerIds[0] ?? null;
  }
  const fallbackId =
    currentCustomerId != null && currentCustomerId !== ''
      ? Array.isArray(currentCustomerId)
        ? currentCustomerId[0]
        : currentCustomerId
      : null;
  return fallbackId;
}

/**
 * Update company by company_id.
 * Two writes by design:
 * 1) customer_companies (upsert) – customer-scoped overrides (revenue, employees, categories, country, region)
 *    so non-admin users can persist edits; UI reads these via getCompanyWithScoring.
 * 2) companies (patch) – global fields (name, email, address, etc.); RLS often allows only system_admin.
 * We then return getCompanyById() which merges both; no .select() on the PATCH to avoid 406 when RLS blocks SELECT.
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

  const now = new Date().toISOString();

  // Customer-scoped fields: update customer_companies so non-admin users can persist overrides.
  const hasCustomerScopedFields =
    payload.revenue !== undefined ||
    payload.employees !== undefined ||
    payload.categories !== undefined ||
    payload.country !== undefined ||
    payload.region !== undefined ||
    'email' in payload;

  if (hasCustomerScopedFields) {
    const customerId = await resolveCurrentCustomerId(supabase);
    if (customerId) {
      const customerUpdate: Record<string, unknown> = {
        customer_id: customerId,
        company_id,
        updated_at: now,
      };
      if (payload.revenue !== undefined) customerUpdate.revenue = payload.revenue;
      if (payload.employees !== undefined) customerUpdate.employees = payload.employees;
      if (payload.categories !== undefined) customerUpdate.categories = payload.categories;
      if (payload.country !== undefined) customerUpdate.country = payload.country;
      if (payload.region !== undefined) customerUpdate.region = payload.region;
      if ('email' in payload) customerUpdate.email = payload.email ?? null;

      const { error: ccError } = await supabase.from('customer_companies').upsert(customerUpdate, {
        onConflict: 'customer_id,company_id',
        ignoreDuplicates: false,
      });

      if (ccError) {
        throw new Error(`Failed to update company details: ${ccError.message}`);
      }
    }
  }

  // Global fields: update companies (RLS allows only system_admin; for others this may affect 0 rows)
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
  // Always apply email when present (string or empty string to clear)
  if ('email' in payload) updateData.email = payload.email ?? null;
  if (payload.social_links !== undefined) updateData.social_links = payload.social_links;

  updateData.updated_at = now;

  // Update without .select() to avoid 406 when RLS allows UPDATE but not SELECT (or 0 rows updated).
  const { error } = await supabase
    .from('companies')
    .update(updateData)
    .eq('company_id', company_id);

  if (error) {
    throw new Error(`Failed to update company: ${error.message}`);
  }

  // Return merged company (companies + customer_companies); customer overrides already saved above.
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

const GET_COMPANY_IDS_PAGE_SIZE = 500;

/**
 * Returns all company_ids for the current customer (or system admin) that match the given filters.
 * Uses same auth and customer resolution as getCompanies; paginates internally.
 */
export async function getCompanyIds(params: GetCompaniesParams = {}): Promise<string[]> {
  const ids: string[] = [];
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const res = await getCompanies({
      ...params,
      page,
      limit: GET_COMPANY_IDS_PAGE_SIZE,
      perPage: GET_COMPANY_IDS_PAGE_SIZE,
    });
    const items = res.data ?? [];
    for (const c of items) {
      const id = c.company_id ?? (c.id != null ? String(c.id) : null);
      if (id) ids.push(id);
    }
    hasMore = items.length === GET_COMPANY_IDS_PAGE_SIZE;
    page += 1;
  }
  return ids;
}
