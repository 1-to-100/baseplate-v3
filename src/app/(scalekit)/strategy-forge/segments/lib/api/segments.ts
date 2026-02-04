/**
 * Segments API
 * Functions for segment operations (create, update, delete)
 */

import { createClient } from '@/lib/supabase/client';
import type { List, ListForDisplay, SegmentFilterDto, AiGeneratedSegment } from '../types/list';

interface CreateSegmentInput {
  name: string;
  filters: SegmentFilterDto;
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
 * Get segments list with pagination and search
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

  // Get current customer ID
  const { data: customerId, error: customerIdError } = await supabase.rpc('current_customer_id');

  if (customerIdError || !customerId) {
    throw new Error(`Failed to get customer ID: ${customerIdError?.message ?? 'not available'}`);
  }

  // Build base query
  let query = supabase
    .from('lists')
    .select('*', { count: 'exact' })
    .eq('customer_id', customerId)
    .eq('list_type', 'segment')
    .is('deleted_at', null);

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
 * Delete a segment (soft delete)
 */
export async function deleteSegment(segmentId: string): Promise<void> {
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

  // Verify segment belongs to customer and soft delete
  const { error: deleteError } = await supabase
    .from('lists')
    .update({ deleted_at: new Date().toISOString() })
    .eq('list_id', segmentId)
    .eq('customer_id', customerId)
    .eq('list_type', 'segment');

  if (deleteError) {
    throw new Error(`Failed to delete segment: ${deleteError.message}`);
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

  const { data: customerId, error: customerIdError } = await supabase.rpc('current_customer_id');

  if (customerIdError || !customerId) {
    throw new Error(`Failed to get customer ID: ${customerIdError?.message ?? 'not available'}`);
  }

  // Verify segment belongs to customer
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

  // Get current customer ID
  const { data: customerId, error: customerIdError } = await supabase.rpc('current_customer_id');

  if (customerIdError || !customerId) {
    throw new Error(`Failed to get customer ID: ${customerIdError?.message ?? 'not available'}`);
  }

  // Fetch segment
  const { data: segment, error: segmentError } = await supabase
    .from('lists')
    .select('*')
    .eq('list_id', listId)
    .eq('customer_id', customerId)
    .eq('list_type', 'segment')
    .is('deleted_at', null)
    .single();

  if (segmentError || !segment) {
    throw new Error(`Segment not found: ${segmentError?.message ?? 'not available'}`);
  }

  // Fetch companies count
  const { count: totalCompanies, error: countError } = await supabase
    .from('list_companies')
    .select('*', { count: 'exact', head: true })
    .eq('list_id', listId);

  if (countError) {
    throw new Error(`Failed to count companies: ${countError.message}`);
  }

  const total = totalCompanies || 0;

  // Fetch companies with pagination
  const page = options?.page || 1;
  const perPage = options?.perPage || 50;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const { data: listCompanies, error: listCompaniesError } = await supabase
    .from('list_companies')
    .select(
      `
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
    `
    )
    .eq('list_id', listId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (listCompaniesError) {
    throw new Error(`Failed to fetch companies: ${listCompaniesError.message}`);
  }

  // Transform companies data
  const companies =
    listCompanies?.map((lc) => {
      const company = Array.isArray(lc.companies) ? lc.companies[0] : lc.companies;
      return {
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

  // Apply search filter if provided
  if (search && search.trim()) {
    // Search in company names via the companies relation
    // Note: Supabase doesn't support direct text search on relations easily,
    // so we'll filter after fetching or use a different approach
    // For now, we'll fetch all and filter client-side, or use a better approach
  }

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
