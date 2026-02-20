/**
 * Types for segments-update edge function
 */

export interface SegmentFilterDto {
  country?: string;
  location?: string;
  categories?: string[];
  employees?: string[];
  technographics?: string[];
  personas?: number[];
}

export interface UpdateSegmentRequest {
  segment_id: string;
  name: string;
  filters: SegmentFilterDto;
}

export interface UpdateSegmentResponse {
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
