/**
 * Segment filter types for company search
 */
export interface SegmentFilterDto {
  country?: string | null;
  location?: string | null;
  employees?: string | null;
  categories?: string[];
  technographics?: string[];
  personas?: number[];
}

/**
 * Request body for searching companies by filters
 */
export interface SearchByFiltersRequest {
  filters: SegmentFilterDto;
  page?: number;
  perPage?: number;
}

/**
 * Company preview data returned from Diffbot
 */
export interface CompanyPreview {
  id: string;
  diffbotId: string;
  name: string;
  fullName?: string;
  logo?: string;
  type?: string;
  location?: {
    country?: {
      name?: string;
    };
    city?: {
      name?: string;
    };
    region?: {
      name?: string;
    };
  };
  nbEmployees?: number;
  nbEmployeesMin?: number;
  nbEmployeesMax?: number;
  categories?: Array<{
    name: string;
  }>;
  homepageUri?: string;
}

/**
 * Response from company search
 */
export interface SearchByFiltersResponse {
  data: CompanyPreview[];
  totalCount: number;
  page: number;
  perPage: number;
  diffbotQueries: string[];
}

/**
 * Diffbot API response structure
 */
export interface DiffbotOrganizationResponse {
  hits?: number;
  data: Array<{
    entity: DiffbotOrganization;
  }>;
  searchInfo?: {
    totalHits?: number;
  };
}

/**
 * Diffbot organization entity
 */
export interface DiffbotOrganization {
  id: string;
  diffbotId: string;
  name: string;
  fullName?: string;
  logo?: string;
  image?: string;
  type?: string;
  location?: {
    country?: {
      name?: string;
    };
    city?: {
      name?: string;
    };
    region?: {
      name?: string;
    };
  };
  nbEmployees?: number;
  nbEmployeesMin?: number;
  nbEmployeesMax?: number;
  nbActiveEmployeeEdges?: number;
  categories?: Array<{
    name: string;
  }>;
  homepageUri?: string;
  diffbotUri?: string;
}
