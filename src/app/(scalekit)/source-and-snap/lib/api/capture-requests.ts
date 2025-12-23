import { createClient } from "@/lib/supabase/client";
import type {
  WebScreenshotCaptureRequest,
  CreateCaptureRequestPayload,
  UpdateCaptureRequestPayload,
  GetCaptureRequestsParams,
  GetCaptureRequestsResponse,
} from "../types";

// Re-export types for convenience
export type {
  WebScreenshotCaptureRequest,
  CreateCaptureRequestPayload,
  UpdateCaptureRequestPayload,
  GetCaptureRequestsParams,
  GetCaptureRequestsResponse,
};

/**
 * Get a list of capture requests
 */
export async function getCaptureRequestsList(
  params: GetCaptureRequestsParams = {}
): Promise<GetCaptureRequestsResponse> {
  const supabase = createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated");
  }

  // Get current customer ID using the SQL function
  const { data: customerIdResult, error: customerIdError } = await supabase.rpc("customer_id");
  if (customerIdError) {
    throw new Error(`Failed to get customer ID: ${customerIdError.message}`);
  }
  const customerId = customerIdResult;

  // Build the query with relationships
  let query = supabase
    .from("web_screenshot_capture_requests")
    .select(`
      *,
      device_profile:device_profile_id (
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
      )
    `, { count: "exact" })
    .eq("customer_id", customerId);

  // Apply status filter
  if (params.status) {
    query = query.eq("status", params.status);
  }

  // Apply device profile filter
  if (params.device_profile_id !== undefined) {
    if (params.device_profile_id === null) {
      query = query.is("device_profile_id", null);
    } else {
      query = query.eq("device_profile_id", params.device_profile_id);
    }
  }

  // Apply requested_by_user_id filter
  if (params.requested_by_user_id) {
    query = query.eq("requested_by_user_id", params.requested_by_user_id);
  }

  // Apply search filter
  if (params.search) {
    query = query.or(`requested_url.ilike.%${params.search}%`);
  }

  // Apply ordering
  const orderBy = params.orderBy || "queued_at";
  const orderDirection = params.orderDirection || "desc";
  query = query.order(orderBy, { ascending: orderDirection === "asc" });

  // Apply pagination
  const page = params.page || 1;
  const perPage = params.perPage || 10;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch capture requests: ${error.message}`);
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
 * Get a single capture request by ID
 */
export async function getCaptureRequestById(
  id: string
): Promise<WebScreenshotCaptureRequest> {
  const supabase = createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated");
  }

  // First, verify access to this request's customer
  const { data: requestWithCustomer, error: customerLookupError } = await supabase
    .from("web_screenshot_capture_requests")
    .select("customer_id")
    .eq("web_screenshot_capture_request_id", id)
    .single();

  if (customerLookupError || !requestWithCustomer) {
    throw new Error(`Capture request not found: ${customerLookupError?.message || 'Capture request not found'}`);
  }

  // Check if user can access this customer
  const { data: canAccess, error: accessError } = await supabase.rpc("can_access_customer", {
    target_customer_id: requestWithCustomer.customer_id,
  });

  if (accessError) {
    throw new Error(`Failed to check customer access: ${accessError.message}`);
  }

  if (!canAccess) {
    throw new Error("You do not have permission to access this capture request");
  }

  // Now fetch the full request data
  const { data, error } = await supabase
    .from("web_screenshot_capture_requests")
    .select(`
      *,
      device_profile:device_profile_id (
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
      )
    `)
    .eq("web_screenshot_capture_request_id", id)
    .single();

  if (error) {
    throw new Error(`Failed to fetch capture request: ${error.message}`);
  }

  return data;
}

/**
 * Create a new capture request
 */
export async function createCaptureRequest(
  payload: CreateCaptureRequestPayload
): Promise<WebScreenshotCaptureRequest> {
  const supabase = createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated");
  }

  // Get current customer ID and user ID using SQL functions
  const { data: customerIdResult, error: customerIdError } = await supabase.rpc("customer_id");
  if (customerIdError) {
    throw new Error(`Failed to get customer ID: ${customerIdError.message}`);
  }
  const customerId = customerIdResult;

  const { data: userIdResult, error: userIdError } = await supabase.rpc("user_id");
  if (userIdError) {
    throw new Error(`Failed to get user ID: ${userIdError.message}`);
  }
  const userId = userIdResult;

  const { data, error } = await supabase
    .from("web_screenshot_capture_requests")
    .insert({
      customer_id: customerId,
      requested_by_user_id: userId,
      requested_url: payload.requested_url,
      device_profile_id: payload.device_profile_id ?? null,
      full_page: payload.full_page ?? false,
      include_source: payload.include_source ?? false,
      block_tracking: payload.block_tracking ?? false,
      status: "queued",
    })
    .select(`
      *,
      device_profile:device_profile_id (
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
      )
    `)
    .single();

  if (error) {
    throw new Error(`Failed to create capture request: ${error.message}`);
  }

  return data;
}

/**
 * Update a capture request
 */
export async function updateCaptureRequest(
  id: string,
  payload: UpdateCaptureRequestPayload
): Promise<WebScreenshotCaptureRequest> {
  const supabase = createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated");
  }

  // First, verify access to this request's customer
  const { data: requestWithCustomer, error: customerLookupError } = await supabase
    .from("web_screenshot_capture_requests")
    .select("customer_id")
    .eq("web_screenshot_capture_request_id", id)
    .single();

  if (customerLookupError || !requestWithCustomer) {
    throw new Error(`Capture request not found: ${customerLookupError?.message || 'Capture request not found'}`);
  }

  // Check if user can access this customer
  const { data: canAccess, error: accessError } = await supabase.rpc("can_access_customer", {
    target_customer_id: requestWithCustomer.customer_id,
  });

  if (accessError) {
    throw new Error(`Failed to check customer access: ${accessError.message}`);
  }

  if (!canAccess) {
    throw new Error("You do not have permission to update this capture request");
  }

  const updateData: Partial<WebScreenshotCaptureRequest> = {};
  if (payload.device_profile_id !== undefined) updateData.device_profile_id = payload.device_profile_id;
  if (payload.full_page !== undefined) updateData.full_page = payload.full_page;
  if (payload.include_source !== undefined) updateData.include_source = payload.include_source;
  if (payload.block_tracking !== undefined) updateData.block_tracking = payload.block_tracking;
  if (payload.status !== undefined) updateData.status = payload.status;
  if (payload.started_at !== undefined) updateData.started_at = payload.started_at;
  if (payload.finished_at !== undefined) updateData.finished_at = payload.finished_at;
  if (payload.error_message !== undefined) updateData.error_message = payload.error_message;

  const { data, error } = await supabase
    .from("web_screenshot_capture_requests")
    .update(updateData)
    .eq("web_screenshot_capture_request_id", id)
    .select(`
      *,
      device_profile:device_profile_id (
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
      )
    `)
    .single();

  if (error) {
    throw new Error(`Failed to update capture request: ${error.message}`);
  }

  if (!data) {
    throw new Error("Capture request not found");
  }

  return data;
}

/**
 * Delete a capture request
 */
export async function deleteCaptureRequest(id: string): Promise<void> {
  const supabase = createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated");
  }

  // First, verify access to this request's customer and that user created it
  const { data: requestData, error: lookupError } = await supabase
    .from("web_screenshot_capture_requests")
    .select("customer_id, requested_by_user_id")
    .eq("web_screenshot_capture_request_id", id)
    .single();

  if (lookupError || !requestData) {
    throw new Error(`Capture request not found: ${lookupError?.message || 'Capture request not found'}`);
  }

  // Check if user can access this customer
  const { data: canAccess, error: accessError } = await supabase.rpc("can_access_customer", {
    target_customer_id: requestData.customer_id,
  });

  if (accessError) {
    throw new Error(`Failed to check customer access: ${accessError.message}`);
  }

  if (!canAccess) {
    throw new Error("You do not have permission to delete this capture request");
  }

  // Get current user ID
  const { data: userIdResult, error: userIdError } = await supabase.rpc("user_id");
  if (userIdError) {
    throw new Error(`Failed to get user ID: ${userIdError.message}`);
  }
  const userId = userIdResult;

  // Verify user created the request
  if (requestData.requested_by_user_id !== userId) {
    throw new Error("You can only delete capture requests that you created");
  }

  const { error } = await supabase
    .from("web_screenshot_capture_requests")
    .delete()
    .eq("web_screenshot_capture_request_id", id);

  if (error) {
    throw new Error(`Failed to delete capture request: ${error.message}`);
  }
}

