export interface Segment {
  segment_id: string;
  customer_id: number;
  name: string;
  description: string;
  code: string | null;
  external_id: string | null;
  created_by: number | null;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSegmentPayload {
  name: string;
  description: string;
  code?: string;
  external_id?: string;
}

export interface UpdateSegmentPayload {
  name?: string;
  description?: string;
  code?: string;
  external_id?: string;
}

export interface GetSegmentsParams {
  page?: number;
  perPage?: number;
  search?: string;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface GetSegmentsResponse {
  data: Segment[];
  meta: {
    total: number;
    page: number;
    lastPage: number;
    perPage: number;
    currentPage: number;
    prev: number | null;
    next: number | null;
  };
}

