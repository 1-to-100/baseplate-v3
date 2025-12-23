// Option table (System-scoped)
export interface DeviceProfileOption {
  options_device_profile_id: string;
  programmatic_name: string;
  display_name: string;
  viewport_width: number;
  viewport_height: number;
  device_pixel_ratio: number;
  user_agent: string | null;
  is_mobile: boolean;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Primary table (Customer-scoped)
export interface WebScreenshotCaptureRequest {
  web_screenshot_capture_request_id: string;
  customer_id: string;
  requested_by_user_id: string;
  requested_url: string;
  device_profile_id: string | null;
  full_page: boolean;
  include_source: boolean;
  block_tracking: boolean;
  status: 'queued' | 'in_progress' | 'completed' | 'failed' | 'canceled';
  queued_at: string;
  started_at: string | null;
  finished_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  // Relationships
  device_profile?: DeviceProfileOption | null;
}

// Primary table (Customer-scoped)
export interface WebScreenshotCapture {
  web_screenshot_capture_id: string;
  customer_id: string;
  options_device_profile_id: string | null;
  page_title: string | null;
  screenshot_storage_path: string;
  screenshot_width: number | null;
  screenshot_height: number | null;
  screenshot_size_bytes: number | null;
  html_size_bytes: number | null;
  raw_html: string | null;
  raw_css: string | null;
  css_size_bytes: number | null;
  capture_meta: Record<string, unknown>;
  captured_at: string;
  created_at: string;
  updated_at: string;
  web_screenshot_capture_request_id: string;
  // Relationships
  device_profile?: DeviceProfileOption | null;
  capture_request?: WebScreenshotCaptureRequest | null;
}

// Payload types for CRUD operations
export interface CreateDeviceProfileOptionPayload {
  programmatic_name: string;
  display_name: string;
  viewport_width: number;
  viewport_height: number;
  device_pixel_ratio?: number;
  user_agent?: string | null;
  is_mobile?: boolean;
  description?: string | null;
  sort_order?: number;
  is_active?: boolean;
}

export interface UpdateDeviceProfileOptionPayload {
  display_name?: string;
  viewport_width?: number;
  viewport_height?: number;
  device_pixel_ratio?: number;
  user_agent?: string | null;
  is_mobile?: boolean;
  description?: string | null;
  sort_order?: number;
  is_active?: boolean;
}

export interface CreateCaptureRequestPayload {
  requested_url: string;
  device_profile_id?: string | null;
  full_page?: boolean;
  include_source?: boolean;
  block_tracking?: boolean;
}

export interface UpdateCaptureRequestPayload {
  device_profile_id?: string | null;
  full_page?: boolean;
  include_source?: boolean;
  block_tracking?: boolean;
  status?: 'queued' | 'in_progress' | 'completed' | 'failed' | 'canceled';
  started_at?: string | null;
  finished_at?: string | null;
  error_message?: string | null;
}

export interface CreateCapturePayload {
  customer_id: string;
  options_device_profile_id?: string | null;
  page_title?: string | null;
  screenshot_storage_path: string;
  screenshot_width?: number | null;
  screenshot_height?: number | null;
  screenshot_size_bytes?: number | null;
  html_size_bytes?: number | null;
  raw_html?: string | null;
  raw_css?: string | null;
  css_size_bytes?: number | null;
  capture_meta?: Record<string, unknown>;
  captured_at?: string;
  web_screenshot_capture_request_id: string;
}

export interface UpdateCapturePayload {
  page_title?: string | null;
  screenshot_storage_path?: string;
  screenshot_width?: number | null;
  screenshot_height?: number | null;
  screenshot_size_bytes?: number | null;
  html_size_bytes?: number | null;
  raw_html?: string | null;
  raw_css?: string | null;
  css_size_bytes?: number | null;
  capture_meta?: Record<string, unknown>;
}

// Query parameter types
export interface GetDeviceProfileOptionsParams {
  is_active?: boolean;
  is_mobile?: boolean;
  sort_by?: 'sort_order' | 'display_name' | 'created_at';
  order?: 'asc' | 'desc';
}

export interface GetCaptureRequestsParams {
  page?: number;
  perPage?: number;
  status?: 'queued' | 'in_progress' | 'completed' | 'failed' | 'canceled';
  device_profile_id?: string | null;
  requested_by_user_id?: string;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  search?: string;
}

export interface GetCaptureRequestsResponse {
  data: WebScreenshotCaptureRequest[];
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

export interface GetCapturesParams {
  page?: number;
  perPage?: number;
  device_profile_id?: string | null;
  web_screenshot_capture_request_id?: string;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  search?: string;
}

export interface GetCapturesResponse {
  data: WebScreenshotCapture[];
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

