import { createClient } from "@/lib/supabase/client";
import type {
  DeviceProfileOption,
  CreateDeviceProfileOptionPayload,
  UpdateDeviceProfileOptionPayload,
  GetDeviceProfileOptionsParams,
} from "../types";

// Re-export types for convenience
export type {
  DeviceProfileOption,
  CreateDeviceProfileOptionPayload,
  UpdateDeviceProfileOptionPayload,
  GetDeviceProfileOptionsParams,
};

/**
 * Get all device profile options
 */
export async function getDeviceProfileOptions(
  params: GetDeviceProfileOptionsParams = {}
): Promise<DeviceProfileOption[]> {
  const supabase = createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated");
  }

  // Build the query
  let query = supabase
    .from("options_device_profiles")
    .select("*");

  // Apply filters
  if (params.is_active !== undefined) {
    query = query.eq("is_active", params.is_active);
  }

  if (params.is_mobile !== undefined) {
    query = query.eq("is_mobile", params.is_mobile);
  }

  // Apply ordering
  const sortBy = params.sort_by || "sort_order";
  const order = params.order || "asc";
  query = query.order(sortBy, { ascending: order === "asc" });

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch device profiles: ${error.message}`);
  }

  return data || [];
}

/**
 * Get a single device profile option by ID
 */
export async function getDeviceProfileOptionById(
  id: string
): Promise<DeviceProfileOption> {
  const supabase = createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated");
  }

  const { data, error } = await supabase
    .from("options_device_profiles")
    .select("*")
    .eq("options_device_profile_id", id)
    .single();

  if (error) {
    throw new Error(`Failed to fetch device profile: ${error.message}`);
  }

  if (!data) {
    throw new Error("Device profile not found");
  }

  return data;
}

/**
 * Get a device profile option by programmatic name
 */
export async function getDeviceProfileOptionByProgrammaticName(
  programmaticName: string
): Promise<DeviceProfileOption | null> {
  const supabase = createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated");
  }

  const { data, error } = await supabase
    .from("options_device_profiles")
    .select("*")
    .eq("programmatic_name", programmaticName)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch device profile: ${error.message}`);
  }

  return data;
}

/**
 * Create a new device profile option (system admin only)
 */
export async function createDeviceProfileOption(
  payload: CreateDeviceProfileOptionPayload
): Promise<DeviceProfileOption> {
  const supabase = createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated");
  }

  // Check if user is system admin
  const { data: isAdmin, error: adminError } = await supabase.rpc("is_system_admin");
  if (adminError) {
    throw new Error(`Failed to check admin status: ${adminError.message}`);
  }
  if (!isAdmin) {
    throw new Error("Only system administrators can create device profiles");
  }

  const { data, error } = await supabase
    .from("options_device_profiles")
    .insert({
      programmatic_name: payload.programmatic_name,
      display_name: payload.display_name,
      viewport_width: payload.viewport_width,
      viewport_height: payload.viewport_height,
      device_pixel_ratio: payload.device_pixel_ratio ?? 1,
      user_agent: payload.user_agent ?? null,
      is_mobile: payload.is_mobile ?? false,
      description: payload.description ?? null,
      sort_order: payload.sort_order ?? 0,
      is_active: payload.is_active ?? true,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to create device profile: ${error.message}`);
  }

  return data;
}

/**
 * Update a device profile option (system admin only)
 */
export async function updateDeviceProfileOption(
  id: string,
  payload: UpdateDeviceProfileOptionPayload
): Promise<DeviceProfileOption> {
  const supabase = createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated");
  }

  // Check if user is system admin
  const { data: isAdmin, error: adminError } = await supabase.rpc("is_system_admin");
  if (adminError) {
    throw new Error(`Failed to check admin status: ${adminError.message}`);
  }
  if (!isAdmin) {
    throw new Error("Only system administrators can update device profiles");
  }

  const updateData: Partial<DeviceProfileOption> = {};
  if (payload.display_name !== undefined) updateData.display_name = payload.display_name;
  if (payload.viewport_width !== undefined) updateData.viewport_width = payload.viewport_width;
  if (payload.viewport_height !== undefined) updateData.viewport_height = payload.viewport_height;
  if (payload.device_pixel_ratio !== undefined) updateData.device_pixel_ratio = payload.device_pixel_ratio;
  if (payload.user_agent !== undefined) updateData.user_agent = payload.user_agent;
  if (payload.is_mobile !== undefined) updateData.is_mobile = payload.is_mobile;
  if (payload.description !== undefined) updateData.description = payload.description;
  if (payload.sort_order !== undefined) updateData.sort_order = payload.sort_order;
  if (payload.is_active !== undefined) updateData.is_active = payload.is_active;

  const { data, error } = await supabase
    .from("options_device_profiles")
    .update(updateData)
    .eq("options_device_profile_id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to update device profile: ${error.message}`);
  }

  if (!data) {
    throw new Error("Device profile not found");
  }

  return data;
}

/**
 * Delete a device profile option (system admin only)
 */
export async function deleteDeviceProfileOption(id: string): Promise<void> {
  const supabase = createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated");
  }

  // Check if user is system admin
  const { data: isAdmin, error: adminError } = await supabase.rpc("is_system_admin");
  if (adminError) {
    throw new Error(`Failed to check admin status: ${adminError.message}`);
  }
  if (!isAdmin) {
    throw new Error("Only system administrators can delete device profiles");
  }

  const { error } = await supabase
    .from("options_device_profiles")
    .delete()
    .eq("options_device_profile_id", id);

  if (error) {
    throw new Error(`Failed to delete device profile: ${error.message}`);
  }
}

