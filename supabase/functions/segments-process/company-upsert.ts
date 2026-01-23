import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import type { DiffbotOrganization } from './types.ts';

/**
 * Format SQL value for PostgreSQL
 */
function formatSqlValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return `ARRAY[]::text[]`;
    }
    const escapedValues = value.map((v) => {
      const str = String(v).replace(/'/g, "''").replace(/\\/g, '\\\\');
      return `'${str}'`;
    });
    return `ARRAY[${escapedValues.join(', ')}]`;
  }

  if (typeof value === 'object') {
    try {
      const jsonStr = JSON.stringify(value);
      return `$json$${jsonStr}$json$::jsonb`;
    } catch {
      return 'NULL';
    }
  }

  if (typeof value === 'string') {
    const escaped = value.replace(/'/g, "''").replace(/\\/g, '\\\\');
    return `'${escaped}'`;
  }

  if (typeof value === 'number') {
    return String(value);
  }

  if (value instanceof Date) {
    return `'${value.toISOString()}'`;
  }

  return 'NULL';
}

/**
 * Extract categories from Diffbot organization
 */
function extractCategories(org: DiffbotOrganization): string[] {
  if (!org.categories || !Array.isArray(org.categories)) {
    return [];
  }
  return org.categories.map((cat) => cat.name).filter(Boolean);
}

/**
 * Extract location data from Diffbot organization
 */
function extractLocationData(org: DiffbotOrganization): {
  country: string | null;
  region: string | null;
  address: string | null;
} {
  const country = org.location?.country?.name || null;
  const region = org.location?.region?.name || null;
  const city = org.location?.city?.name || null;
  
  // Combine city and region for address if available
  const addressParts = [city, region].filter(Boolean);
  const address = addressParts.length > 0 ? addressParts.join(', ') : null;

  return { country, region, address };
}

/**
 * Bulk upsert companies to the companies table
 */
export async function bulkUpsertCompanies(
  supabase: SupabaseClient,
  companies: DiffbotOrganization[]
): Promise<string[]> {
  if (companies.length === 0) {
    return [];
  }

  const now = new Date().toISOString();
  
  // Build records for upsert
  const records = companies.map((org) => {
    const categories = extractCategories(org);
    const { country, region, address } = extractLocationData(org);
    const employees = org.nbEmployees || org.nbEmployeesMin || org.nbEmployeesMax || null;

    return {
      diffbot_id: org.diffbotId,
      legal_name: org.name,
      display_name: org.fullName || org.name,
      domain: null,
      website_url: org.homepageUri || null,
      linkedin_url: null,
      logo: org.logo || org.image || null,
      country: country,
      region: region,
      address: address,
      postal_code: null,
      email: null,
      phone: null,
      latitude: null,
      longitude: null,
      revenue: null,
      capitalization: null,
      currency_code: null,
      employees: employees,
      siccodes: [],
      categories: categories,
      technologies: [],
      social_links: {},
      diffbot_uri: org.diffbotUri || null,
      fetched_at: now,
    };
  });

  // Use upsert with ON CONFLICT handling
  const { data, error } = await supabase
    .from('companies')
    .upsert(records, {
      onConflict: 'diffbot_id',
      ignoreDuplicates: false,
    })
    .select('company_id, diffbot_id');

  if (error) {
    console.error('Error upserting companies:', error);
    throw new Error(`Failed to upsert companies: ${error.message}`);
  }

  // If upsert didn't return data (shouldn't happen), fetch the IDs
  if (!data || data.length === 0) {
    const result = await supabase
      .from('companies')
      .select('company_id')
      .in('diffbot_id', companies.map((c) => c.diffbotId));

    if (result.error) {
      throw new Error(`Failed to fetch company IDs: ${result.error.message}`);
    }

    return result.data?.map((c) => c.company_id) || [];
  }

  return data.map((c) => c.company_id);
}

/**
 * Bulk insert into list_companies junction table
 */
export async function bulkInsertListCompanies(
  supabase: SupabaseClient,
  listId: string,
  companyIds: string[]
): Promise<number> {
  if (companyIds.length === 0) {
    return 0;
  }

  // Use array insert with ON CONFLICT DO NOTHING
  const records = companyIds.map((companyId) => ({
    list_id: listId,
    company_id: companyId,
  }));

  const { error, count } = await supabase
    .from('list_companies')
    .insert(records)
    .select('id', { count: 'exact' });

  if (error && !error.message.includes('duplicate')) {
    console.error('Error inserting list_companies:', error);
    throw new Error(`Failed to insert list_companies: ${error.message}`);
  }

  return count || 0;
}

/**
 * Bulk insert into customer_companies table with denormalized data
 */
export async function bulkInsertCustomerCompanies(
  supabase: SupabaseClient,
  customerId: string,
  companies: DiffbotOrganization[],
  companyIds: string[]
): Promise<number> {
  if (companies.length === 0 || companyIds.length === 0) {
    return 0;
  }

  // Create a map of diffbot_id to company_id
  const diffbotIdToCompanyId = new Map<string, string>();
  
  // Fetch the mapping
  const { data: companyMappings, error: mappingError } = await supabase
    .from('companies')
    .select('company_id, diffbot_id')
    .in('diffbot_id', companies.map((c) => c.diffbotId));

  if (mappingError) {
    console.error('Error fetching company mappings:', mappingError);
    throw new Error(`Failed to fetch company mappings: ${mappingError.message}`);
  }

  companyMappings?.forEach((mapping) => {
    diffbotIdToCompanyId.set(mapping.diffbot_id, mapping.company_id);
  });

  // Build records with denormalized data
  const records = companies
    .map((org) => {
      const companyId = diffbotIdToCompanyId.get(org.diffbotId);
      if (!companyId) return null;

      const categories = extractCategories(org);
      const { country, region } = extractLocationData(org);
      const employees = org.nbEmployees || org.nbEmployeesMin || org.nbEmployeesMax || null;

      return {
        customer_id: customerId,
        company_id: companyId,
        name: org.name,
        categories: categories,
        revenue: null,
        country: country,
        region: region,
        employees: employees,
      };
    })
    .filter((record) => record !== null);

  if (records.length === 0) {
    return 0;
  }

  const { error, count } = await supabase
    .from('customer_companies')
    .upsert(records, {
      onConflict: 'customer_id,company_id',
      ignoreDuplicates: true,
    })
    .select('customer_companies_id', { count: 'exact' });

  if (error) {
    console.error('Error inserting customer_companies:', error);
    throw new Error(`Failed to insert customer_companies: ${error.message}`);
  }

  return count || 0;
}
