/**
 * Company Types
 * Types for companies, industries, company sizes, and related entities
 */

// ============================================================================
// ENUMS
// ============================================================================

// Note: ListType, ListStatus, and ListSubtype are defined in list.ts

// ============================================================================
// OPTION TYPES
// ============================================================================

export interface OptionIndustry {
  industry_id: number;
  value: string;
  created_at: string;
  updated_at: string;
}

export interface OptionCompanySize {
  company_size_id: number;
  value: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// BASE TYPES
// ============================================================================

export interface Company {
  company_id: string;
  primary_industry_id?: number | null;
  company_size_id?: number | null;
  legal_name?: string | null;
  display_name?: string | null;
  domain?: string | null;
  website_url?: string | null;
  linkedin_url?: string | null;
  description?: string | null;
  logo?: string | null;
  country?: string | null;
  region?: string | null;
  address?: string | null;
  postal_code?: string | null;
  email?: string | null;
  phone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  revenue?: number | null;
  capitalization?: number | null;
  currency_code?: string | null;
  employees?: number | null;
  siccodes?: string[] | null;
  categories?: string[] | null;
  technologies?: string[] | null;
  social_links?: Record<string, unknown> | null;
  diffbot_id?: string | null;
  diffbot_uri?: string | null;
  fetched_at: string;
  created_at: string;
  updated_at: string;
}

export interface ListCompany {
  id: string;
  company_id: string;
  list_id: string;
  created_at: string;
}

export interface CustomerCompany {
  customer_companies_id: number;
  customer_id: string;
  company_id: string;
  created_at: string;
  updated_at?: string | null;
  name?: string | null;
  categories?: string[] | null;
  revenue?: number | null;
  country?: string | null;
  region?: string | null;
  employees?: number | null;
  last_scoring_results?: Record<string, unknown> | null;
  scoring_results_updated_at?: string | null;
}

export interface CompanyMetadata {
  company_metadata_id: number;
  company_id: string;
  diffbot_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// WITH RELATIONS TYPES
// ============================================================================

export interface CompanyWithRelations extends Company {
  primary_industry?: OptionIndustry | null;
  company_size?: OptionCompanySize | null;
  metadata?: CompanyMetadata | null;
}

export interface ListCompanyWithRelations extends ListCompany {
  company?: Company;
  list?: {
    list_id: string;
    name: string;
    list_type: string;
  };
}

export interface CustomerCompanyWithRelations extends CustomerCompany {
  company?: Company;
  customer?: {
    customer_id: string;
    name: string;
  };
}

export interface CompanyMetadataWithRelations extends CompanyMetadata {
  company?: Company;
}

// ============================================================================
// INPUT TYPES (for creating/updating records)
// ============================================================================

export type CreateCompanyInput = Omit<
  Company,
  'company_id' | 'fetched_at' | 'created_at' | 'updated_at'
>;
export type UpdateCompanyInput = Partial<CreateCompanyInput>;

export type CreateListCompanyInput = Omit<ListCompany, 'id' | 'created_at'>;
export type UpdateListCompanyInput = Partial<CreateListCompanyInput>;

export type CreateCustomerCompanyInput = Omit<
  CustomerCompany,
  'customer_companies_id' | 'created_at' | 'updated_at'
>;
export type UpdateCustomerCompanyInput = Partial<CreateCustomerCompanyInput>;

export type CreateCompanyMetadataInput = Omit<
  CompanyMetadata,
  'company_metadata_id' | 'created_at' | 'updated_at'
>;
export type UpdateCompanyMetadataInput = Partial<CreateCompanyMetadataInput>;
