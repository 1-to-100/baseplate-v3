export interface CustomerInfo {
  customer_info_id: string;
  customer_id: number;
  company_name: string;
  problem_overview: string;
  solution_overview: string;
  competitive_overview: string;
  one_sentence_summary: string;
  tagline: string;
  content_authoring_prompt?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomerInfoPayload {
  company_name: string;
  problem_overview: string;
  solution_overview: string;
  competitive_overview: string;
  one_sentence_summary: string;
  tagline: string;
  content_authoring_prompt: string;
}

export interface UpdateCustomerInfoPayload extends Partial<CreateCustomerInfoPayload> {
  customer_info_id: string;
}
