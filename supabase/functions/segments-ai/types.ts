/**
 * Types for segments-ai edge function
 */

export interface AskAiSegmentRequest {
  description: string;
}

export interface SegmentFilterDto {
  country?: string;
  location?: string;
  categories?: string[];
  employees?: string[];
  technographics?: string[];
}

export interface AiGeneratedSegmentResponse {
  name: string;
  filters: SegmentFilterDto;
}

/**
 * Raw AI response format from OpenAI
 * This is what the model returns before mapping
 */
export interface RawAiSegmentResponse {
  name: string;
  filters: {
    country?: string;
    location?: string;
    employees?: string; // Single value like "1001-5000 employees"
    categories?: string[];
    technographics?: string[];
  };
}

export interface OptionIndustry {
  industry_id: number;
  value: string;
}

export interface OptionCompanySize {
  company_size_id: number;
  value: string;
}
