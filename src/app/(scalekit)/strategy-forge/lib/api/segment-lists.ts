/**
 * Segment Lists API
 * Functions for segment list operations (create, update, delete, get companies)
 */

import { createClient } from '@/lib/supabase/client';
import {
  type List,
  type ListForDisplay,
  type SegmentFilterDto,
  type AiGeneratedSegment,
  ListType,
} from '../types/list';
import { DEFAULT_LIST_SUBTYPE, ListSubtype } from '../constants/lists';

interface CreateSegmentInput {
  name: string;
  filters: SegmentFilterDto;
}

/**
 * Whether the current user can create, edit, and remove segments.
 * System admin and customer success users can view but not modify segments.
 */
export async function getCanEditSegments(): Promise<{ canEditSegments: boolean }> {
  const supabase = createClient();
  const [{ data: isSystemAdmin }, { data: isCustomerSuccess }] = await Promise.all([
    supabase.rpc('is_system_admin'),
    supabase.rpc('is_customer_success'),
  ]);
  const systemAdmin = Boolean(isSystemAdmin);
  const customerSuccess = Boolean(isCustomerSuccess);
  return {
    canEditSegments: !systemAdmin && !customerSuccess,
  };
}

/**
 * Ask AI to generate segment filters from a natural language description
 * Calls the segments-ai edge function which uses OpenAI to generate filters
 *
 * @param description - Natural language description of the desired segment
 * @returns Promise resolving to the AI-generated segment name and filters
 */
export async function askAiSegment(description: string): Promise<AiGeneratedSegment> {
  const supabase = createClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  // Call segments-ai edge function
  const { data, error } = await supabase.functions.invoke('segments-ai', {
    body: { description },
  });

  if (error) {
    // Extract error message from response
    let errorMessage = 'Failed to generate segment from AI';

    // Check if error has context (raw Response object)
    const errorObj = error as { context?: Response; error?: string; message?: string };
    if (errorObj.context) {
      try {
        const clonedResponse = errorObj.context.clone();
        const errorData = await clonedResponse.json();
        if (errorData && typeof errorData === 'object') {
          const data = errorData as { error?: string; message?: string };
          errorMessage = data.error || data.message || errorMessage;
        }
      } catch {
        errorMessage = errorObj.message || errorMessage;
      }
    } else {
      errorMessage = errorObj.message || errorMessage;
    }

    throw new Error(errorMessage);
  }

  return data as AiGeneratedSegment;
}

/**
 * Create a new segment
 * Calls the segments-create edge function which immediately saves the segment
 * with status 'new', then returns. Background processing is handled by pg_cron.
 *
 * @param input - Segment name and filters
 * @returns Promise resolving to the created segment
 */
export async function createSegment(input: CreateSegmentInput): Promise<List> {
  const supabase = createClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  // Call segments-create edge function
  const { data, error } = await supabase.functions.invoke('segments-create', {
    body: {
      name: input.name,
      filters: input.filters,
    },
  });

  if (error) {
    // Extract error message from response
    let errorMessage = 'Failed to create segment';

    // Check if error has context (raw Response object)
    const errorObj = error as { context?: Response; error?: string; message?: string };
    if (errorObj.context) {
      try {
        const clonedResponse = errorObj.context.clone();
        const errorData = await clonedResponse.json();
        if (errorData && typeof errorData === 'object') {
          const data = errorData as { error?: string; message?: string };
          errorMessage = data.error || data.message || errorMessage;
        }
      } catch {
        errorMessage = errorObj.message || errorMessage;
      }
    } else {
      errorMessage = errorObj.message || errorMessage;
    }

    throw new Error(errorMessage);
  }

  return data as List;
}

/**
 * Get segments list with pagination and search.
 * - With effective customer (selected in context): segments for that customer.
 * - System admin with no customer selected: all segments (RLS allows).
 */
export async function getSegments(params?: {
  page?: number;
  perPage?: number;
  search?: string;
}): Promise<{
  data: ListForDisplay[];
  meta: {
    total: number;
    page: number;
    perPage: number;
    lastPage: number;
    prev: number | null;
    next: number | null;
  };
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

  const { effectiveCustomerId, isSystemAdmin, customerIdError } =
    await resolveEffectiveCustomerId(supabase);

  if (!effectiveCustomerId && !isSystemAdmin) {
    throw new Error(`Failed to get customer ID: ${customerIdError?.message ?? 'not available'}`);
  }

  // Build base query
  let query = supabase
    .from('lists')
    .select('*', { count: 'exact' })
    .eq('list_type', 'segment')
    .is('deleted_at', null);

  if (effectiveCustomerId) {
    query = query.eq('customer_id', effectiveCustomerId);
  }
  // System admin with no customer selected: no customer filter (RLS allows all for system admin)

  // Apply search filter (case-insensitive)
  if (params?.search && params.search.trim()) {
    query = query.ilike('name', `%${params.search.trim()}%`);
  }

  // Apply ordering (most recent first)
  query = query.order('updated_at', { ascending: false });

  // Apply pagination
  const page = params?.page || 1;
  const perPage = params?.perPage || 12;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  query = query.range(from, to);

  // Execute query
  const { data: segments, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch segments: ${error.message}`);
  }

  // Get company counts for each segment
  const segmentsWithCounts = await Promise.all(
    (segments || []).map(async (segment) => {
      const { count: companyCount } = await supabase
        .from('list_companies')
        .select('*', { count: 'exact', head: true })
        .eq('list_id', segment.list_id);

      return {
        ...segment,
        company_count: companyCount || 0,
      };
    })
  );

  const total = count || 0;
  const lastPage = Math.ceil(total / perPage);

  return {
    data: segmentsWithCounts as ListForDisplay[],
    meta: {
      total,
      page,
      perPage,
      lastPage,
      prev: page > 1 ? page - 1 : null,
      next: page < lastPage ? page + 1 : null,
    },
  };
}

/**
 * Get all lists (any type: segment, territory, list) with pagination.
 * Uses same customer/RLS rules as getSegments.
 */
export async function getLists(params?: {
  page?: number;
  perPage?: number;
  search?: string;
}): Promise<{
  data: ListForDisplay[];
  meta: {
    total: number;
    page: number;
    perPage: number;
    lastPage: number;
    prev: number | null;
    next: number | null;
  };
}> {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  const { effectiveCustomerId, isSystemAdmin, customerIdError } =
    await resolveEffectiveCustomerId(supabase);

  if (!effectiveCustomerId && !isSystemAdmin) {
    throw new Error(`Failed to get customer ID: ${customerIdError?.message ?? 'not available'}`);
  }

  let query = supabase
    .from('lists')
    .select('*', { count: 'exact' })
    .eq('list_type', ListType.LIST)
    .is('deleted_at', null);

  if (effectiveCustomerId) {
    query = query.eq('customer_id', effectiveCustomerId);
  }

  if (params?.search && params.search.trim()) {
    query = query.ilike('name', `%${params.search.trim()}%`);
  }

  query = query.order('updated_at', { ascending: false });

  const page = params?.page || 1;
  const perPage = params?.perPage || 12;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  query = query.range(from, to);

  const { data: lists, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch lists: ${error.message}`);
  }

  const userIds = [
    ...new Set(
      (lists || [])
        .map((l) => l.user_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    ),
  ];
  let userMap = new Map<string, string | null>();
  if (userIds.length > 0) {
    const { data: usersData } = await supabase
      .from('users')
      .select('user_id, full_name')
      .in('user_id', userIds);
    userMap = new Map(
      (usersData || []).map((u) => [u.user_id as string, (u.full_name as string) ?? null])
    );
  }

  const listsWithCounts = await Promise.all(
    (lists || []).map(async (list) => {
      const { count: companyCount } = await supabase
        .from('list_companies')
        .select('*', { count: 'exact', head: true })
        .eq('list_id', list.list_id);

      return {
        ...list,
        company_count: companyCount || 0,
        owner_name: list.user_id ? (userMap.get(list.user_id) ?? null) : null,
      };
    })
  );

  const total = count || 0;
  const lastPage = Math.ceil(total / perPage);

  return {
    data: listsWithCounts as ListForDisplay[],
    meta: {
      total,
      page,
      perPage,
      lastPage,
      prev: page > 1 ? page - 1 : null,
      next: page < lastPage ? page + 1 : null,
    },
  };
}

/**
 * Get a single list by ID (list_type 'list' only).
 */
export async function getListById(listId: string): Promise<List> {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  const { effectiveCustomerId, isSystemAdmin, customerIdError } =
    await resolveEffectiveCustomerId(supabase);

  if (!effectiveCustomerId && !isSystemAdmin) {
    throw new Error(`Failed to get customer ID: ${customerIdError?.message ?? 'not available'}`);
  }

  let query = supabase
    .from('lists')
    .select('*')
    .eq('list_id', listId)
    .eq('list_type', ListType.LIST)
    .is('deleted_at', null);

  if (effectiveCustomerId) {
    query = query.eq('customer_id', effectiveCustomerId);
  }

  const { data: list, error } = await query.single();

  if (error || !list) {
    throw new Error(`List not found: ${error?.message ?? 'not available'}`);
  }

  return list as List;
}

/**
 * Update a list (list_type 'list' only). Updates name and/or filters.
 * Uses same RLS as getListById; list must belong to the customer (or system admin).
 */
export async function updateList(
  listId: string,
  payload: { name?: string; filters?: Record<string, unknown> }
): Promise<List> {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  const { effectiveCustomerId, isSystemAdmin, customerIdError } =
    await resolveEffectiveCustomerId(supabase);

  if (!effectiveCustomerId && !isSystemAdmin) {
    throw new Error(`Failed to get customer ID: ${customerIdError?.message ?? 'not available'}`);
  }

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (payload.name !== undefined) {
    const trimmed = payload.name.trim();
    if (trimmed.length < 3 || trimmed.length > 100) {
      throw new Error('List name must be between 3 and 100 characters');
    }
    updatePayload.name = trimmed;
  }
  if (payload.filters !== undefined) {
    updatePayload.filters = payload.filters;
  }

  let query = supabase
    .from('lists')
    .update(updatePayload)
    .eq('list_id', listId)
    .eq('list_type', ListType.LIST)
    .is('deleted_at', null);

  if (effectiveCustomerId) {
    query = query.eq('customer_id', effectiveCustomerId);
  }

  const { data: list, error } = await query.select().single();

  if (error || !list) {
    throw new Error(`Failed to update list: ${error?.message ?? 'not available'}`);
  }

  return list as List;
}

/**
 * Get companies for a list (list_type 'list') with pagination and optional search.
 */
export async function getListCompanies(
  listId: string,
  page: number = 1,
  perPage: number = 25,
  search?: string
): Promise<{
  data: Array<{
    id: string;
    company_id: string;
    display_name: string | null;
    legal_name: string | null;
    logo: string | null;
    country: string | null;
    region: string | null;
    employees: number | null;
    categories: string[] | null;
    website_url: string | null;
    domain: string | null;
    homepageUri?: string | null;
    fullName?: string | null;
    name?: string | null;
    location?: { city?: { name?: string } } | null;
    isNew?: boolean;
  }>;
  meta: {
    total: number;
    lastPage: number;
    currentPage: number;
    perPage: number;
    prev: number | null;
    next: number | null;
  };
}> {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  const { effectiveCustomerId, isSystemAdmin, customerIdError } =
    await resolveEffectiveCustomerId(supabase);

  if (!effectiveCustomerId && !isSystemAdmin) {
    throw new Error(`Failed to get customer ID: ${customerIdError?.message ?? 'not available'}`);
  }

  let listQuery = supabase
    .from('lists')
    .select('list_id')
    .eq('list_id', listId)
    .eq('list_type', ListType.LIST)
    .is('deleted_at', null);

  if (effectiveCustomerId) {
    listQuery = listQuery.eq('customer_id', effectiveCustomerId);
  }

  const { data: listRow, error: listError } = await listQuery.single();

  if (listError || !listRow) {
    throw new Error(`List not found: ${listError?.message ?? 'not available'}`);
  }

  let companiesQuery = supabase
    .from('list_companies')
    .select(
      `
      id,
      company_id,
      companies:company_id (
        company_id,
        display_name,
        legal_name,
        logo,
        country,
        region,
        employees,
        categories,
        website_url,
        domain
      )
    `,
      { count: 'exact' }
    )
    .eq('list_id', listId);

  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  companiesQuery = companiesQuery.order('created_at', { ascending: false }).range(from, to);

  const { data: listCompanies, error: listCompaniesError, count } = await companiesQuery;

  if (listCompaniesError) {
    throw new Error(`Failed to fetch companies: ${listCompaniesError.message}`);
  }

  let companies =
    listCompanies?.map((lc) => {
      const company = Array.isArray(lc.companies) ? lc.companies[0] : lc.companies;
      return {
        id: lc.id,
        company_id: lc.company_id,
        display_name: company?.display_name || null,
        legal_name: company?.legal_name || null,
        logo: company?.logo || null,
        country: company?.country || null,
        region: company?.region || null,
        employees: company?.employees || null,
        categories: company?.categories || null,
        website_url: company?.website_url || null,
        domain: company?.domain || null,
        homepageUri: company?.website_url || null,
        fullName: company?.display_name || company?.legal_name || null,
        name: company?.display_name || company?.legal_name || null,
        location: company?.region ? { city: { name: company.region } } : null,
        isNew: false,
      };
    }) || [];

  const total = count ?? 0;

  if (search && search.trim()) {
    const searchLower = search.toLowerCase().trim();
    companies = companies.filter((c) => {
      const name = (c.display_name || c.legal_name || '').toLowerCase();
      const domain = (c.domain || '').toLowerCase();
      return name.includes(searchLower) || domain.includes(searchLower);
    });
  }
  const lastPage = Math.ceil(total / perPage);

  return {
    data: companies,
    meta: {
      total,
      lastPage,
      currentPage: page,
      perPage,
      prev: page > 1 ? page - 1 : null,
      next: page < lastPage ? page + 1 : null,
    },
  };
}

export interface AddCompaniesToListPayload {
  companyIds: string[];
}

/**
 * Add companies to a list by creating list_company assignments.
 * Only allowed for list_type 'list' and subtype 'company'. Duplicates are skipped (unique on company_id, list_id).
 */
export async function addCompaniesToList(
  listId: string,
  payload: AddCompaniesToListPayload
): Promise<void> {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  const { effectiveCustomerId, isSystemAdmin, customerIdError } =
    await resolveEffectiveCustomerId(supabase);

  if (!effectiveCustomerId && !isSystemAdmin) {
    throw new Error(`Failed to get customer ID: ${customerIdError?.message ?? 'not available'}`);
  }

  const companyIds = (payload.companyIds ?? []).filter(
    (id): id is string => typeof id === 'string' && id.length > 0
  );
  if (companyIds.length === 0) {
    throw new Error('No valid company IDs provided');
  }

  let listQuery = supabase
    .from('lists')
    .select('list_id, list_type, subtype')
    .eq('list_id', listId)
    .eq('list_type', ListType.LIST)
    .is('deleted_at', null);

  if (effectiveCustomerId) {
    listQuery = listQuery.eq('customer_id', effectiveCustomerId);
  }

  const { data: listRow, error: listError } = await listQuery.single();

  if (listError || !listRow) {
    throw new Error(`List not found: ${listError?.message ?? 'not available'}`);
  }

  if ((listRow as { subtype?: string }).subtype !== ListSubtype.COMPANY) {
    throw new Error('Only company lists can have companies added');
  }

  const records = companyIds.map((company_id) => ({
    list_id: listId,
    company_id,
  }));

  const { error: upsertError } = await supabase.from('list_companies').upsert(records, {
    onConflict: 'company_id,list_id',
    ignoreDuplicates: true,
  });

  if (upsertError) {
    throw new Error(`Failed to add companies to list: ${upsertError.message}`);
  }
}

/**
 * Check which of the given company IDs are already in the list.
 * Returns a record mapping company_id to true if in list, false otherwise.
 */
export async function checkCompaniesInList(
  listId: string,
  companyIds: string[]
): Promise<Record<string, boolean>> {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  const { effectiveCustomerId, isSystemAdmin, customerIdError } =
    await resolveEffectiveCustomerId(supabase);

  if (!effectiveCustomerId && !isSystemAdmin) {
    throw new Error(`Failed to get customer ID: ${customerIdError?.message ?? 'not available'}`);
  }

  const ids = companyIds.filter((id): id is string => typeof id === 'string' && id.length > 0);
  if (ids.length === 0) {
    return {};
  }

  let listQuery = supabase
    .from('lists')
    .select('list_id')
    .eq('list_id', listId)
    .eq('list_type', ListType.LIST)
    .is('deleted_at', null);

  if (effectiveCustomerId) {
    listQuery = listQuery.eq('customer_id', effectiveCustomerId);
  }

  const { data: listRow, error: listError } = await listQuery.single();

  if (listError || !listRow) {
    throw new Error(`List not found: ${listError?.message ?? 'not available'}`);
  }

  const { data: rows, error: fetchError } = await supabase
    .from('list_companies')
    .select('company_id')
    .eq('list_id', listId)
    .in('company_id', ids);

  if (fetchError) {
    throw new Error(`Failed to check companies in list: ${fetchError.message}`);
  }

  const inList = new Set((rows ?? []).map((r) => r.company_id));
  const result: Record<string, boolean> = {};
  for (const id of ids) {
    result[id] = inList.has(id);
  }
  return result;
}

export interface CreateListInput {
  name: string;
  subtype?: ListSubtype;
  is_static?: boolean;
  description?: string | null;
}

/**
 * Create a new list with list_type 'list' (not segment or territory).
 * Uses same customer/RLS rules as getLists.
 */
export async function createList(input: CreateListInput): Promise<List> {
  const supabase = createClient();

  const { effectiveCustomerId, isSystemAdmin, customerIdError } =
    await resolveEffectiveCustomerId(supabase);

  if (!effectiveCustomerId && !isSystemAdmin) {
    throw new Error(`Failed to get customer ID: ${customerIdError?.message ?? 'not available'}`);
  }

  const trimmedName = input.name.trim();
  if (trimmedName.length < 3 || trimmedName.length > 100) {
    throw new Error('List name must be between 3 and 100 characters');
  }

  // For system admin with no customer selected we cannot create (no customer_id to use)
  const customerId = effectiveCustomerId;
  if (!customerId) {
    throw new Error('Cannot create list: no customer context. Select a customer first.');
  }

  const currentUser = await getCurrentUser(supabase);

  if (!currentUser?.user_id) {
    throw new Error('Cannot create list: no user context. Please login first.');
  }

  const { data: list, error: insertError } = await supabase
    .from('lists')
    .insert({
      customer_id: customerId,
      user_id: currentUser?.user_id,
      list_type: ListType.LIST,
      name: trimmedName,
      description: input.description ?? null,
      filters: {},
      status: 'new',
      subtype: input.subtype ?? DEFAULT_LIST_SUBTYPE,
      is_static: input.is_static ?? false,
    })
    .select()
    .single();

  if (insertError) {
    throw new Error(`Failed to create list: ${insertError.message}`);
  }

  return list as List;
}

const DUPLICATE_COMPANY_IDS_PAGE_SIZE = 500;
const ADD_COMPANIES_CHUNK_SIZE = 100;

/**
 * Duplicate a list (list_type 'list'): creates a copy with name + "_copy", same subtype, is_static, and filters.
 * For static company lists, copies list_companies in chunks. Best-effort for company copy on failure.
 */
export async function duplicateList(listId: string): Promise<List> {
  const list = await getListById(listId);

  const baseName = list.name.trim();
  let copyName = baseName.length > 0 ? `${baseName}_copy` : 'List copy';
  if (copyName.length > 100) {
    copyName = copyName.slice(0, 97) + '...';
  }
  if (copyName.length < 3) {
    copyName = 'List copy';
  }

  const newList = await createList({
    name: copyName,
    subtype: list.subtype,
    is_static: list.is_static,
    description: list.description ?? null,
  });

  if (list.filters && typeof list.filters === 'object' && Object.keys(list.filters).length > 0) {
    await updateList(newList.list_id, { filters: list.filters as Record<string, unknown> });
  }

  if (list.is_static && list.subtype === ListSubtype.COMPANY) {
    const supabase = createClient();
    const companyIds: string[] = [];
    let offset = 0;
    let hasMore = true;
    while (hasMore) {
      const { data: rows, error } = await supabase
        .from('list_companies')
        .select('company_id')
        .eq('list_id', listId)
        .range(offset, offset + DUPLICATE_COMPANY_IDS_PAGE_SIZE - 1);

      if (error) break;
      if (!rows?.length) break;
      companyIds.push(...rows.map((r: { company_id: string }) => r.company_id));
      offset += rows.length;
      hasMore = rows.length === DUPLICATE_COMPANY_IDS_PAGE_SIZE;
    }
    for (let i = 0; i < companyIds.length; i += ADD_COMPANIES_CHUNK_SIZE) {
      const chunk = companyIds.slice(i, i + ADD_COMPANIES_CHUNK_SIZE);
      if (chunk.length > 0) {
        await addCompaniesToList(newList.list_id, { companyIds: chunk });
      }
    }
  }

  return newList;
}

/**
 * Resolve current auth user to the application user (public.users row).
 * Auth user id and DB user_id differ; lists.user_id must reference users.user_id.
 */
async function getCurrentUser(
  supabase: ReturnType<typeof createClient>
): Promise<{ user_id: string }> {
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    throw new Error('Not authenticated');
  }

  const { data: userRow, error: userRowError } = await supabase
    .from('users')
    .select('user_id')
    .eq('auth_user_id', authUser.id)
    .maybeSingle();

  if (userRowError || !userRow?.user_id) {
    throw new Error(
      `Unable to resolve application user: ${userRowError?.message ?? 'user record not found in users table'}`
    );
  }

  return userRow;
}

/**
 * Resolve effective customer ID (JWT then RPC). Returns null when no customer and not system admin.
 */
async function resolveEffectiveCustomerId(supabase: ReturnType<typeof createClient>): Promise<{
  effectiveCustomerId: string | null;
  isSystemAdmin: boolean;
  customerIdError: Error | null;
}> {
  const [
    { data: session },
    { data: isSystemAdmin },
    { data: currentCustomerId, error: customerIdError },
  ] = await Promise.all([
    supabase.auth.getSession(),
    supabase.rpc('is_system_admin'),
    supabase.rpc('current_customer_id'),
  ]);
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
  return {
    effectiveCustomerId,
    isSystemAdmin: !!isSystemAdmin,
    customerIdError: customerIdError ? new Error(customerIdError.message) : null,
  };
}

/**
 * Delete a segment (soft delete)
 */
export async function deleteSegment(segmentId: string): Promise<void> {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  const { effectiveCustomerId, isSystemAdmin, customerIdError } =
    await resolveEffectiveCustomerId(supabase);

  if (!effectiveCustomerId && !isSystemAdmin) {
    throw new Error(`Failed to get customer ID: ${customerIdError?.message ?? 'not available'}`);
  }

  let updateQuery = supabase
    .from('lists')
    .update({ deleted_at: new Date().toISOString() })
    .eq('list_id', segmentId)
    .eq('list_type', 'segment');

  if (effectiveCustomerId) {
    updateQuery = updateQuery.eq('customer_id', effectiveCustomerId);
  }
  // System admin with no customer: no customer filter (RLS allows)

  const { error: deleteError } = await updateQuery;

  if (deleteError) {
    throw new Error(`Failed to delete segment: ${deleteError.message}`);
  }
}

/**
 * Delete a list (soft delete, list_type 'list' only)
 */
export async function deleteList(listId: string): Promise<void> {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  const { effectiveCustomerId, isSystemAdmin, customerIdError } =
    await resolveEffectiveCustomerId(supabase);

  if (!effectiveCustomerId && !isSystemAdmin) {
    throw new Error(`Failed to get customer ID: ${customerIdError?.message ?? 'not available'}`);
  }

  let updateQuery = supabase
    .from('lists')
    .update({ deleted_at: new Date().toISOString() })
    .eq('list_id', listId)
    .eq('list_type', ListType.LIST);

  if (effectiveCustomerId) {
    updateQuery = updateQuery.eq('customer_id', effectiveCustomerId);
  }

  const { error: deleteError } = await updateQuery;

  if (deleteError) {
    throw new Error(`Failed to delete list: ${deleteError.message}`);
  }
}

/**
 * Remove a company from a segment (delete from list_companies)
 */
export async function removeCompanyFromSegment(
  segmentId: string,
  companyId: string
): Promise<void> {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  const { effectiveCustomerId, isSystemAdmin, customerIdError } =
    await resolveEffectiveCustomerId(supabase);

  if (!effectiveCustomerId && !isSystemAdmin) {
    throw new Error(`Failed to get customer ID: ${customerIdError?.message ?? 'not available'}`);
  }

  let segmentQuery = supabase
    .from('lists')
    .select('list_id')
    .eq('list_id', segmentId)
    .eq('list_type', 'segment')
    .is('deleted_at', null);

  if (effectiveCustomerId) {
    segmentQuery = segmentQuery.eq('customer_id', effectiveCustomerId);
  }

  const { data: segment, error: segmentError } = await segmentQuery.single();

  if (segmentError || !segment) {
    throw new Error(`Segment not found: ${segmentError?.message ?? 'not available'}`);
  }

  const { error: deleteError } = await supabase
    .from('list_companies')
    .delete()
    .eq('list_id', segmentId)
    .eq('company_id', companyId);

  if (deleteError) {
    throw new Error(`Failed to remove company from segment: ${deleteError.message}`);
  }
}

/**
 * Get segment by ID with companies
 */
export async function getSegmentById(
  listId: string,
  options?: {
    page?: number;
    perPage?: number;
    search?: string;
  }
): Promise<{
  segment: List;
  companies: Array<{
    company_id: string;
    display_name: string | null;
    legal_name: string | null;
    logo: string | null;
    country: string | null;
    region: string | null;
    employees: number | null;
    categories: string[] | null;
    website_url: string | null;
    domain: string | null;
  }>;
  meta: {
    total: number;
    page: number;
    perPage: number;
    lastPage: number;
  };
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

  const { effectiveCustomerId, isSystemAdmin, customerIdError } =
    await resolveEffectiveCustomerId(supabase);

  if (!effectiveCustomerId && !isSystemAdmin) {
    throw new Error(`Failed to get customer ID: ${customerIdError?.message ?? 'not available'}`);
  }

  // Fetch segment (system admin with no customer: no customer filter, RLS allows)
  let segmentQuery = supabase
    .from('lists')
    .select('*')
    .eq('list_id', listId)
    .eq('list_type', 'segment')
    .is('deleted_at', null);

  if (effectiveCustomerId) {
    segmentQuery = segmentQuery.eq('customer_id', effectiveCustomerId);
  }

  const { data: segment, error: segmentError } = await segmentQuery.single();

  if (segmentError || !segment) {
    throw new Error(`Segment not found: ${segmentError?.message ?? 'not available'}`);
  }

  // Fetch companies with pagination (and optional search)
  // Use the two-step query pattern (like companies page):
  // 1. Get all company_ids from list_companies for this segment
  // 2. Query companies table directly with search filter and pagination
  const page = options?.page || 1;
  const perPage = options?.perPage || 50;
  const searchTerm = options?.search?.trim();
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  // Step 1: Get all company_ids for this segment
  const { data: listCompanyRows, error: listCompaniesError } = await supabase
    .from('list_companies')
    .select('company_id')
    .eq('list_id', listId);

  if (listCompaniesError) {
    throw new Error(`Failed to fetch segment companies: ${listCompaniesError.message}`);
  }

  const companyIds = (listCompanyRows || []).map((r) => r.company_id).filter(Boolean);

  // If no companies in segment, return empty
  if (companyIds.length === 0) {
    return {
      segment: segment as List,
      companies: [],
      meta: {
        total: 0,
        page,
        perPage,
        lastPage: 0,
      },
    };
  }

  // Step 2: Query companies table with search filter and pagination
  let companiesQuery = supabase
    .from('companies')
    .select(
      'company_id, display_name, legal_name, logo, country, region, employees, categories, website_url, domain',
      { count: 'exact' }
    )
    .in('company_id', companyIds);

  // Apply search filter directly on companies table
  if (searchTerm) {
    companiesQuery = companiesQuery.or(
      `display_name.ilike.%${searchTerm}%,legal_name.ilike.%${searchTerm}%`
    );
  }

  const {
    data: companiesData,
    error: companiesError,
    count,
  } = await companiesQuery.order('display_name', { ascending: true }).range(from, to);

  if (companiesError) {
    throw new Error(`Failed to fetch companies: ${companiesError.message}`);
  }

  const total = count ?? 0;

  // Fetch customer_companies overrides for the fetched companies (if we have a customer context)
  // This ensures edited fields (employees, categories, region, etc.) are reflected in the list
  const customerCompaniesOverrides: Map<
    string,
    {
      employees?: number | null;
      categories?: string[] | null;
      country?: string | null;
      region?: string | null;
    }
  > = new Map();

  if (effectiveCustomerId && companiesData && companiesData.length > 0) {
    const fetchedCompanyIds = companiesData.map((c) => c.company_id);
    const { data: ccData } = await supabase
      .from('customer_companies')
      .select('company_id, employees, categories, country, region')
      .eq('customer_id', effectiveCustomerId)
      .in('company_id', fetchedCompanyIds);

    if (ccData) {
      for (const cc of ccData) {
        customerCompaniesOverrides.set(cc.company_id, {
          employees: cc.employees,
          categories: cc.categories,
          country: cc.country,
          region: cc.region,
        });
      }
    }
  }

  // Transform companies data, merging customer_companies overrides
  const companies =
    companiesData?.map((company) => {
      const overrides = customerCompaniesOverrides.get(company.company_id);
      return {
        company_id: company.company_id,
        display_name: company.display_name || null,
        legal_name: company.legal_name || null,
        logo: company.logo || null,
        country: overrides?.country ?? company.country ?? null,
        region: overrides?.region ?? company.region ?? null,
        employees: overrides?.employees ?? company.employees ?? null,
        categories: overrides?.categories ?? company.categories ?? null,
        website_url: company.website_url || null,
        domain: company.domain || null,
      };
    }) || [];

  const lastPage = Math.ceil(total / perPage);

  return {
    segment: segment as List,
    companies,
    meta: {
      total,
      page,
      perPage,
      lastPage,
    },
  };
}

/**
 * Get companies for a segment with pagination and search
 */
export async function getSegmentCompanies(
  listId: string,
  page: number = 1,
  perPage: number = 25,
  search?: string
): Promise<{
  data: Array<{
    id: string;
    company_id: string;
    display_name: string | null;
    legal_name: string | null;
    logo: string | null;
    country: string | null;
    region: string | null;
    employees: number | null;
    categories: string[] | null;
    website_url: string | null;
    domain: string | null;
    homepageUri?: string | null;
    fullName?: string | null;
    name?: string | null;
    location?: {
      city?: {
        name?: string;
      };
    } | null;
    isNew?: boolean;
  }>;
  meta: {
    total: number;
    lastPage: number;
    currentPage: number;
    perPage: number;
    prev: number | null;
    next: number | null;
  };
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

  // Verify segment belongs to customer
  const { data: segment, error: segmentError } = await supabase
    .from('lists')
    .select('list_id')
    .eq('list_id', listId)
    .eq('customer_id', customerId)
    .eq('list_type', 'segment')
    .is('deleted_at', null)
    .single();

  if (segmentError || !segment) {
    throw new Error(`Segment not found: ${segmentError?.message ?? 'not available'}`);
  }

  // Build query for companies
  let query = supabase
    .from('list_companies')
    .select(
      `
      id,
      company_id,
      companies:company_id (
        company_id,
        display_name,
        legal_name,
        logo,
        country,
        region,
        employees,
        categories,
        website_url,
        domain
      )
    `,
      { count: 'exact' }
    )
    .eq('list_id', listId);

  // Apply pagination
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  query = query.order('created_at', { ascending: false }).range(from, to);

  // Execute query
  const { data: listCompanies, error: listCompaniesError, count } = await query;

  if (listCompaniesError) {
    throw new Error(`Failed to fetch companies: ${listCompaniesError.message}`);
  }

  // Transform companies data
  let companies =
    listCompanies?.map((lc) => {
      const company = Array.isArray(lc.companies) ? lc.companies[0] : lc.companies;
      return {
        id: lc.id,
        company_id: lc.company_id,
        display_name: company?.display_name || null,
        legal_name: company?.legal_name || null,
        logo: company?.logo || null,
        country: company?.country || null,
        region: company?.region || null,
        employees: company?.employees || null,
        categories: company?.categories || null,
        website_url: company?.website_url || null,
        domain: company?.domain || null,
        homepageUri: company?.website_url || null,
        fullName: company?.display_name || company?.legal_name || null,
        name: company?.display_name || company?.legal_name || null,
        location: company?.region
          ? {
              city: {
                name: company.region,
              },
            }
          : null,
        isNew: false, // TODO: Determine if company is new
      };
    }) || [];

  // Apply search filter client-side if provided
  if (search && search.trim()) {
    const searchLower = search.toLowerCase().trim();
    companies = companies.filter((company) => {
      const name = (company.display_name || company.legal_name || '').toLowerCase();
      const domain = (company.domain || '').toLowerCase();
      return name.includes(searchLower) || domain.includes(searchLower);
    });
  }

  const total = count || 0;
  const lastPage = Math.ceil(total / perPage);

  return {
    data: companies,
    meta: {
      total,
      lastPage,
      currentPage: page,
      perPage,
      prev: page > 1 ? page - 1 : null,
      next: page < lastPage ? page + 1 : null,
    },
  };
}

/**
 * Edit/Update a segment
 * Calls the segments-update edge function which handles:
 * - Updating segment name and filters
 * - Detecting filter changes and re-triggering company processing
 * - Clearing old companies when filters change
 *
 * @param listId - ID of the segment to update
 * @param payload - Segment name and filters
 * @returns Promise resolving to the updated segment
 */
export async function editSegment(
  listId: string,
  payload: {
    name: string;
    filters: SegmentFilterDto;
  }
): Promise<List> {
  const supabase = createClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  // Call segments-update edge function
  const { data, error } = await supabase.functions.invoke('segments-update', {
    body: {
      segment_id: listId,
      name: payload.name,
      filters: payload.filters,
    },
  });

  if (error) {
    // Extract error message from response
    let errorMessage = 'Failed to update segment';

    // Check if error has context (raw Response object)
    const errorObj = error as { context?: Response; error?: string; message?: string };
    if (errorObj.context) {
      try {
        const clonedResponse = errorObj.context.clone();
        const errorData = await clonedResponse.json();
        if (errorData && typeof errorData === 'object') {
          const data = errorData as { error?: string; message?: string };
          errorMessage = data.error || data.message || errorMessage;
        }
      } catch {
        errorMessage = errorObj.message || errorMessage;
      }
    } else {
      errorMessage = errorObj.message || errorMessage;
    }

    throw new Error(errorMessage);
  }

  return data as List;
}
