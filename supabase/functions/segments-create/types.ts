/**
 * Types for segments-create edge function
 */

export interface SegmentFilterDto {
  country?: string;
  location?: string;
  categories?: string[];
  employees?: string[];
  technographics?: string[];
  personas?: number[];
}

export interface CreateSegmentRequest {
  name: string;
  filters: SegmentFilterDto;
}

export interface CreateSegmentResponse {
  list_id: string;
  customer_id: string;
  list_type: string;
  name: string;
  description: string | null;
  filters: Record<string, unknown> | null;
  user_id: string | null;
  status: string;
  subtype: string;
  is_static: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}
