/**
 * Company types for companies list page
 */

export interface CompanyItem {
  id: number;
  company_id?: string;
  name: string;
  type?: string;
  description?: string;
  website?: string;
  homepageUri?: string;
  logo?: string;
  country?: string;
  region?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  revenue?: number;
  currency_code?: string;
  employees?: number;
  siccodes?: string[];
  categories?: string[];
  technologies?: string[];
  phone?: string;
  email?: string;
  last_scoring_results?: {
    score: number;
    short_description: string;
    full_description: string;
  };
  social_links?: {
    linkedin?: string;
    facebook?: string;
    twitter?: string;
    instagram?: string;
  };
  fetched_at?: string;
  created_at: string;
  updated_at: string;
  lists?: CompanyItemList[];
}

export interface CompanyItemList {
  id: number;
  name: string;
  description?: string;
  isAttached: boolean;
  /** List ID for linking to list details (e.g. strategy-forge lists) */
  list_id?: string;
}

// UI-level company filter fields used across filter components
export interface CompanyFilterFields {
  name?: string;
  companySize?: [number, number];
  /** Industry/category values (strings) – matched against companies.categories */
  industry?: string[];
  technographic?: string[];
  person?: number[];
  nationality?: string[];
  gender?: string[];
  titlesInclude?: string[];
  titlesExclude?: string[];
  country?: string | null;
  region?: string | null;
  revenueRange?: [number, number];
  foundedYearRange?: [number, number];
  organizationType?: string | null;
  skills?: string[];
  excludeKeywords?: string[];
}

export interface GetCompaniesParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  country?: string | string[];
  region?: string | string[];
  min_employees?: number;
  max_employees?: number;
  /** Category/industry values (strings) – matched against companies.categories array */
  category?: string | string[];
  technology?: string | string[];
  /** When set, results may be restricted to companies in this list (for static lists). */
  listId?: string;
  // Legacy params for compatibility
  perPage?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  categories?: string[];
  employees?: string[];
}

export interface GetCompaniesResponse {
  data: CompanyItem[];
  pagination?: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    next: number | null;
    prev: number | null;
  };
  meta?: {
    currentPage: number;
    lastPage: number;
    perPage: number;
    total: number;
  };
}

export interface UpdateCompanyPayload {
  name?: string;
  description?: string;
  website?: string;
  logo?: string;
  country?: string;
  region?: string;
  address?: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  revenue?: number;
  capitalization?: number;
  currency_code?: string;
  employees?: number;
  siccodes?: string[];
  categories?: string[];
  technologies?: string[];
  phone?: string;
  email?: string;
  social_links?: {
    linkedin?: string;
    facebook?: string;
    twitter?: string;
    [key: string]: string | undefined;
  };
}
