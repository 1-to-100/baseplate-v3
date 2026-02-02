import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import type { DiffbotOrganization } from './types.ts';

/** Normalize diffbot_id for consistent map keys (DB vs Diffbot response may differ in whitespace). */
function normalizeDiffbotId(id: string | null | undefined): string {
  return id != null ? String(id).trim() : '';
}

/** Diffbot API returns entity ID in `id`; use id ?? diffbotId for compatibility. */
function getOrgDiffbotId(org: DiffbotOrganization): string | null | undefined {
  return org.id ?? org.diffbotId;
}

/**
 * Extract categories from Diffbot organization (stored as-is; filter uses view for matching).
 */
function extractCategories(org: DiffbotOrganization): string[] {
  if (!org.categories || !Array.isArray(org.categories)) {
    return [];
  }
  return org.categories.map((cat) => (cat.name || '').trim()).filter(Boolean);
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

export interface BulkUpsertCompaniesResult {
  companyIds: string[];
  companies: DiffbotOrganization[];
}

/**
 * Bulk upsert companies to the companies table.
 * Only organizations with a non-empty diffbot_id are processed so companies
 * remain unique by diffbot_id. Existing companies are updated; new ones inserted.
 * Returns company IDs and the same filtered companies list for downstream use.
 */
export async function bulkUpsertCompanies(
  supabase: SupabaseClient,
  companies: DiffbotOrganization[]
): Promise<BulkUpsertCompaniesResult> {
  if (companies.length === 0) {
    return { companyIds: [], companies: [] };
  }

  const validCompanies = companies.filter((org) => {
    const did = getOrgDiffbotId(org);
    return did != null && String(did).trim() !== '';
  });
  if (validCompanies.length === 0) {
    return { companyIds: [], companies: [] };
  }
  if (validCompanies.length < companies.length) {
    console.log(
      `Skipping ${companies.length - validCompanies.length} companies without diffbot_id`
    );
  }

  const now = new Date().toISOString();
  const diffbotIds = validCompanies.map((org) => getOrgDiffbotId(org)!);

  const records = validCompanies.map((org) => {
    const categories = extractCategories(org);
    const { country, region, address } = extractLocationData(org);
    const employees = org.nbEmployees || org.nbEmployeesMin || org.nbEmployeesMax || null;

    return {
      diffbot_id: getOrgDiffbotId(org),
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

  const { error } = await supabase
    .from('companies')
    .upsert(records, {
      onConflict: 'diffbot_id',
      ignoreDuplicates: false,
    });

  if (error) {
    console.error('Error upserting companies:', error);
    throw new Error(`Failed to upsert companies: ${error.message}`);
  }

  const { data: existing, error: selectError } = await supabase
    .from('companies')
    .select('company_id, diffbot_id')
    .in('diffbot_id', diffbotIds);

  if (selectError) {
    throw new Error(`Failed to resolve company IDs: ${selectError.message}`);
  }

  const diffbotToId = new Map<string, string>();
  existing?.forEach((row) => {
    const key = normalizeDiffbotId(row.diffbot_id);
    if (key) diffbotToId.set(key, row.company_id);
  });

  const companyIds = validCompanies
    .map((org) => diffbotToId.get(normalizeDiffbotId(getOrgDiffbotId(org))))
    .filter((id): id is string => id != null);

  if (companyIds.length < validCompanies.length) {
    console.log(
      `Resolved ${companyIds.length}/${validCompanies.length} company IDs (${validCompanies.length - companyIds.length} missing from select)`
    );
  }

  return { companyIds, companies: validCompanies };
}

/**
 * Bulk upsert into list_companies junction table.
 * Creates a list_companies row for every company (new or already in companies table)
 * so the segment shows all of them. Uses onConflict + ignoreDuplicates so we only
 * skip when the (list_id, company_id) pair already exists (e.g. duplicate in batch).
 */
export async function bulkInsertListCompanies(
  supabase: SupabaseClient,
  listId: string,
  companyIds: string[]
): Promise<number> {
  if (companyIds.length === 0) {
    return 0;
  }

  const records = companyIds.map((companyId) => ({
    list_id: listId,
    company_id: companyId,
  }));

  const { error } = await supabase
    .from('list_companies')
    .upsert(records, {
      onConflict: 'company_id,list_id',
      ignoreDuplicates: true,
    });

  if (error) {
    console.error('Error upserting list_companies:', error);
    throw new Error(`Failed to insert list_companies: ${error.message}`);
  }

  return companyIds.length;
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
    .in('diffbot_id', companies.map((c) => getOrgDiffbotId(c)).filter(Boolean));

  if (mappingError) {
    console.error('Error fetching company mappings:', mappingError);
    throw new Error(`Failed to fetch company mappings: ${mappingError.message}`);
  }

  companyMappings?.forEach((mapping) => {
    const key = normalizeDiffbotId(mapping.diffbot_id);
    if (key) diffbotIdToCompanyId.set(key, mapping.company_id);
  });

  // Build records with denormalized data
  const records = companies
    .map((org) => {
      const companyId = diffbotIdToCompanyId.get(normalizeDiffbotId(getOrgDiffbotId(org)));
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
