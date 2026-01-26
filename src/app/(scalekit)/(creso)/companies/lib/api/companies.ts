/**
 * Companies API
 * Functions for fetching companies list with filters and pagination
 */

import { createClient } from '@/lib/supabase/client';
import type { CompanyItem, GetCompaniesParams, GetCompaniesResponse } from '../types/company';

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
