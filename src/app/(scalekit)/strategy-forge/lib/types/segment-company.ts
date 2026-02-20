/**
 * Segment-scoped option types (industries, company sizes)
 * Used by options API for segment/company filters
 */

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
