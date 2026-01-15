import { createClient } from '@/lib/supabase/client';
import type {
  WebScreenshotCapture,
  CreateCapturePayload,
  UpdateCapturePayload,
  GetCapturesParams,
  GetCapturesResponse,
} from '../types';

// Re-export types for convenience
export type {
  WebScreenshotCapture,
  CreateCapturePayload,
  UpdateCapturePayload,
  GetCapturesParams,
  GetCapturesResponse,
};

/**
 * Get a list of captures
 */
export async function getCapturesList(
  params: GetCapturesParams = {}
): Promise<GetCapturesResponse> {
  const supabase = createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Get current customer ID using the SQL function
  const { data: customerIdResult, error: customerIdError } = await supabase.rpc('customer_id');
  if (customerIdError) {
    throw new Error(`Failed to get customer ID: ${customerIdError.message}`);
  }
  const customerId = customerIdResult;

  // Build the query with relationships
  let query = supabase
    .from('web_screenshot_captures')
    .select(
      `
      *,
      device_profile:options_device_profile_id (
        options_device_profile_id,
        programmatic_name,
        display_name,
        viewport_width,
        viewport_height,
        device_pixel_ratio,
        user_agent,
        is_mobile,
        description,
        sort_order,
        is_active,
        created_at,
        updated_at
      ),
      capture_request:web_screenshot_capture_request_id (
        web_screenshot_capture_request_id,
        customer_id,
        requested_by_user_id,
        requested_url,
        device_profile_id,
        full_page,
        include_source,
        block_tracking,
        status,
        queued_at,
        started_at,
        finished_at,
        error_message,
        created_at,
        updated_at
      )
    `,
      { count: 'exact' }
    )
    .eq('customer_id', customerId);

  // Apply device profile filter
  if (params.device_profile_id !== undefined) {
    if (params.device_profile_id === null) {
      query = query.is('options_device_profile_id', null);
    } else {
      query = query.eq('options_device_profile_id', params.device_profile_id);
    }
  }

  // Apply capture request filter
  if (params.web_screenshot_capture_request_id) {
    query = query.eq('web_screenshot_capture_request_id', params.web_screenshot_capture_request_id);
  }

  // Apply search filter
  if (params.search) {
    query = query.or(
      `page_title.ilike.%${params.search}%,screenshot_storage_path.ilike.%${params.search}%`
    );
  }

  // Apply ordering
  const orderBy = params.orderBy || 'captured_at';
  const orderDirection = params.orderDirection || 'desc';
  query = query.order(orderBy, { ascending: orderDirection === 'asc' });

  // Apply pagination
  const page = params.page || 1;
  const perPage = params.perPage || 10;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch captures: ${error.message}`);
  }

  const total = count || 0;
  const lastPage = Math.ceil(total / perPage);

  return {
    data: data || [],
    meta: {
      total,
      page,
      lastPage,
      perPage,
      currentPage: page,
      prev: page > 1 ? page - 1 : null,
      next: page < lastPage ? page + 1 : null,
    },
  };
}

/**
 * Get a single capture by ID
 */
export async function getCaptureById(id: string): Promise<WebScreenshotCapture> {
  const supabase = createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // First, verify access to this capture's customer
  const { data: captureWithCustomer, error: customerLookupError } = await supabase
    .from('web_screenshot_captures')
    .select('customer_id')
    .eq('web_screenshot_capture_id', id)
    .maybeSingle();

  if (customerLookupError) {
    throw new Error(`Failed to fetch capture: ${customerLookupError.message}`);
  }

  if (!captureWithCustomer) {
    throw new Error('Capture not found');
  }

  // Check if user can access this customer
  const { data: canAccess, error: accessError } = await supabase.rpc('can_access_customer', {
    target_customer_id: captureWithCustomer.customer_id,
  });

  if (accessError) {
    throw new Error(`Failed to check customer access: ${accessError.message}`);
  }

  if (!canAccess) {
    throw new Error('You do not have permission to access this capture');
  }

  // Now fetch the full capture data
  const { data, error } = await supabase
    .from('web_screenshot_captures')
    .select(
      `
      *,
      device_profile:options_device_profile_id (
        options_device_profile_id,
        programmatic_name,
        display_name,
        viewport_width,
        viewport_height,
        device_pixel_ratio,
        user_agent,
        is_mobile,
        description,
        sort_order,
        is_active,
        created_at,
        updated_at
      ),
      capture_request:web_screenshot_capture_request_id (
        web_screenshot_capture_request_id,
        customer_id,
        requested_by_user_id,
        requested_url,
        device_profile_id,
        full_page,
        include_source,
        block_tracking,
        status,
        queued_at,
        started_at,
        finished_at,
        error_message,
        created_at,
        updated_at
      )
    `
    )
    .eq('web_screenshot_capture_id', id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch capture: ${error.message}`);
  }

  if (!data) {
    throw new Error('Capture not found');
  }

  return data;
}

/**
 * Create a new capture
 */
export async function createCapture(payload: CreateCapturePayload): Promise<WebScreenshotCapture> {
  const supabase = createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Verify access to the customer
  const { data: canAccess, error: accessError } = await supabase.rpc('can_access_customer', {
    target_customer_id: payload.customer_id,
  });

  if (accessError) {
    throw new Error(`Failed to check customer access: ${accessError.message}`);
  }

  if (!canAccess) {
    throw new Error('You do not have permission to create captures for this customer');
  }

  const { data, error } = await supabase
    .from('web_screenshot_captures')
    .insert({
      customer_id: payload.customer_id,
      options_device_profile_id: payload.options_device_profile_id ?? null,
      page_title: payload.page_title ?? null,
      screenshot_storage_path: payload.screenshot_storage_path,
      screenshot_width: payload.screenshot_width ?? null,
      screenshot_height: payload.screenshot_height ?? null,
      screenshot_size_bytes: payload.screenshot_size_bytes ?? null,
      html_size_bytes: payload.html_size_bytes ?? null,
      raw_html: payload.raw_html ?? null,
      raw_css: payload.raw_css ?? null,
      css_size_bytes: payload.css_size_bytes ?? null,
      capture_meta: payload.capture_meta ?? {},
      captured_at: payload.captured_at ?? new Date().toISOString(),
      web_screenshot_capture_request_id: payload.web_screenshot_capture_request_id,
    })
    .select(
      `
      *,
      device_profile:options_device_profile_id (
        options_device_profile_id,
        programmatic_name,
        display_name,
        viewport_width,
        viewport_height,
        device_pixel_ratio,
        user_agent,
        is_mobile,
        description,
        sort_order,
        is_active,
        created_at,
        updated_at
      ),
      capture_request:web_screenshot_capture_request_id (
        web_screenshot_capture_request_id,
        customer_id,
        requested_by_user_id,
        requested_url,
        device_profile_id,
        full_page,
        include_source,
        block_tracking,
        status,
        queued_at,
        started_at,
        finished_at,
        error_message,
        created_at,
        updated_at
      )
    `
    )
    .single();

  if (error) {
    throw new Error(`Failed to create capture: ${error.message}`);
  }

  return data;
}

/**
 * Update a capture
 */
export async function updateCapture(
  id: string,
  payload: UpdateCapturePayload
): Promise<WebScreenshotCapture> {
  const supabase = createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // First, verify access to this capture's customer
  const { data: captureWithCustomer, error: customerLookupError } = await supabase
    .from('web_screenshot_captures')
    .select('customer_id')
    .eq('web_screenshot_capture_id', id)
    .single();

  if (customerLookupError || !captureWithCustomer) {
    throw new Error(`Capture not found: ${customerLookupError?.message || 'Capture not found'}`);
  }

  // Check if user can access this customer
  const { data: canAccess, error: accessError } = await supabase.rpc('can_access_customer', {
    target_customer_id: captureWithCustomer.customer_id,
  });

  if (accessError) {
    throw new Error(`Failed to check customer access: ${accessError.message}`);
  }

  if (!canAccess) {
    throw new Error('You do not have permission to update this capture');
  }

  const updateData: Partial<WebScreenshotCapture> = {};
  if (payload.page_title !== undefined) updateData.page_title = payload.page_title;
  if (payload.screenshot_storage_path !== undefined)
    updateData.screenshot_storage_path = payload.screenshot_storage_path;
  if (payload.screenshot_width !== undefined)
    updateData.screenshot_width = payload.screenshot_width;
  if (payload.screenshot_height !== undefined)
    updateData.screenshot_height = payload.screenshot_height;
  if (payload.screenshot_size_bytes !== undefined)
    updateData.screenshot_size_bytes = payload.screenshot_size_bytes;
  if (payload.html_size_bytes !== undefined) updateData.html_size_bytes = payload.html_size_bytes;
  if (payload.raw_html !== undefined) updateData.raw_html = payload.raw_html;
  if (payload.raw_css !== undefined) updateData.raw_css = payload.raw_css;
  if (payload.css_size_bytes !== undefined) updateData.css_size_bytes = payload.css_size_bytes;
  if (payload.capture_meta !== undefined) updateData.capture_meta = payload.capture_meta;

  const { data, error } = await supabase
    .from('web_screenshot_captures')
    .update(updateData)
    .eq('web_screenshot_capture_id', id)
    .select(
      `
      *,
      device_profile:options_device_profile_id (
        options_device_profile_id,
        programmatic_name,
        display_name,
        viewport_width,
        viewport_height,
        device_pixel_ratio,
        user_agent,
        is_mobile,
        description,
        sort_order,
        is_active,
        created_at,
        updated_at
      ),
      capture_request:web_screenshot_capture_request_id (
        web_screenshot_capture_request_id,
        customer_id,
        requested_by_user_id,
        requested_url,
        device_profile_id,
        full_page,
        include_source,
        block_tracking,
        status,
        queued_at,
        started_at,
        finished_at,
        error_message,
        created_at,
        updated_at
      )
    `
    )
    .single();

  if (error) {
    throw new Error(`Failed to update capture: ${error.message}`);
  }

  if (!data) {
    throw new Error('Capture not found');
  }

  return data;
}

/**
 * Delete a capture
 */
export async function deleteCapture(id: string): Promise<void> {
  const supabase = createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // First, verify access to this capture's customer
  const { data: captureWithCustomer, error: customerLookupError } = await supabase
    .from('web_screenshot_captures')
    .select('customer_id')
    .eq('web_screenshot_capture_id', id)
    .single();

  if (customerLookupError || !captureWithCustomer) {
    throw new Error(`Capture not found: ${customerLookupError?.message || 'Capture not found'}`);
  }

  // Check if user can access this customer
  const { data: canAccess, error: accessError } = await supabase.rpc('can_access_customer', {
    target_customer_id: captureWithCustomer.customer_id,
  });

  if (accessError) {
    throw new Error(`Failed to check customer access: ${accessError.message}`);
  }

  if (!canAccess) {
    throw new Error('You do not have permission to delete this capture');
  }

  const { error } = await supabase
    .from('web_screenshot_captures')
    .delete()
    .eq('web_screenshot_capture_id', id);

  if (error) {
    throw new Error(`Failed to delete capture: ${error.message}`);
  }
}
