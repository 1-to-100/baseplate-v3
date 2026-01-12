import { z } from 'zod';

/**
 * Zod schema for creating a device profile option
 */
export const createDeviceProfileOptionSchema = z.object({
  programmatic_name: z
    .string()
    .min(1, 'Programmatic name is required')
    .max(255, 'Programmatic name must be less than 255 characters')
    .regex(
      /^[a-z0-9_]+$/,
      'Programmatic name must contain only lowercase letters, numbers, and underscores'
    ),
  display_name: z
    .string()
    .min(1, 'Display name is required')
    .max(255, 'Display name must be less than 255 characters'),
  viewport_width: z
    .number()
    .int('Viewport width must be an integer')
    .positive('Viewport width must be greater than 0'),
  viewport_height: z
    .number()
    .int('Viewport height must be an integer')
    .positive('Viewport height must be greater than 0'),
  device_pixel_ratio: z
    .number()
    .positive('Device pixel ratio must be greater than 0')
    .optional()
    .default(1),
  user_agent: z.string().nullable().optional(),
  is_mobile: z.boolean().optional().default(false),
  description: z.string().nullable().optional(),
  sort_order: z.number().int('Sort order must be an integer').optional().default(0),
  is_active: z.boolean().optional().default(true),
});

/**
 * Zod schema for updating a device profile option
 */
export const updateDeviceProfileOptionSchema = z.object({
  display_name: z
    .string()
    .min(1, 'Display name is required')
    .max(255, 'Display name must be less than 255 characters')
    .optional(),
  viewport_width: z
    .number()
    .int('Viewport width must be an integer')
    .positive('Viewport width must be greater than 0')
    .optional(),
  viewport_height: z
    .number()
    .int('Viewport height must be an integer')
    .positive('Viewport height must be greater than 0')
    .optional(),
  device_pixel_ratio: z.number().positive('Device pixel ratio must be greater than 0').optional(),
  user_agent: z.string().nullable().optional(),
  is_mobile: z.boolean().optional(),
  description: z.string().nullable().optional(),
  sort_order: z.number().int('Sort order must be an integer').optional(),
  is_active: z.boolean().optional(),
});

/**
 * Zod schema for creating a capture request
 */
export const createCaptureRequestSchema = z.object({
  requested_url: z.string().min(1, 'URL is required').url('Must be a valid URL'),
  device_profile_id: z.string().uuid('Must be a valid UUID').nullable().optional(),
  full_page: z.boolean().optional().default(false),
  include_source: z.boolean().optional().default(false),
  block_tracking: z.boolean().optional().default(false),
});

/**
 * Zod schema for updating a capture request
 */
export const updateCaptureRequestSchema = z.object({
  device_profile_id: z.string().uuid('Must be a valid UUID').nullable().optional(),
  full_page: z.boolean().optional(),
  include_source: z.boolean().optional(),
  block_tracking: z.boolean().optional(),
  status: z.enum(['queued', 'in_progress', 'completed', 'failed', 'canceled']).optional(),
  started_at: z.string().datetime().nullable().optional(),
  finished_at: z.string().datetime().nullable().optional(),
  error_message: z.string().nullable().optional(),
});

/**
 * Zod schema for creating a capture
 */
export const createCaptureSchema = z.object({
  customer_id: z.string().uuid('Must be a valid UUID'),
  options_device_profile_id: z.string().uuid('Must be a valid UUID').nullable().optional(),
  page_title: z.string().nullable().optional(),
  screenshot_storage_path: z.string().min(1, 'Screenshot storage path is required'),
  screenshot_width: z
    .number()
    .int('Screenshot width must be an integer')
    .nonnegative('Screenshot width must be non-negative')
    .nullable()
    .optional(),
  screenshot_height: z
    .number()
    .int('Screenshot height must be an integer')
    .nonnegative('Screenshot height must be non-negative')
    .nullable()
    .optional(),
  screenshot_size_bytes: z
    .number()
    .int('Screenshot size must be an integer')
    .nonnegative('Screenshot size must be non-negative')
    .nullable()
    .optional(),
  html_size_bytes: z
    .number()
    .int('HTML size must be an integer')
    .nonnegative('HTML size must be non-negative')
    .nullable()
    .optional(),
  raw_html: z.string().nullable().optional(),
  raw_css: z.string().nullable().optional(),
  css_size_bytes: z
    .number()
    .int('CSS size must be an integer')
    .nonnegative('CSS size must be non-negative')
    .nullable()
    .optional(),
  capture_meta: z.record(z.unknown()).optional().default({}),
  captured_at: z.string().datetime().optional(),
  web_screenshot_capture_request_id: z.string().uuid('Must be a valid UUID'),
});

/**
 * Zod schema for updating a capture
 */
export const updateCaptureSchema = z.object({
  page_title: z.string().nullable().optional(),
  screenshot_storage_path: z.string().min(1, 'Screenshot storage path is required').optional(),
  screenshot_width: z
    .number()
    .int('Screenshot width must be an integer')
    .nonnegative('Screenshot width must be non-negative')
    .nullable()
    .optional(),
  screenshot_height: z
    .number()
    .int('Screenshot height must be an integer')
    .nonnegative('Screenshot height must be non-negative')
    .nullable()
    .optional(),
  screenshot_size_bytes: z
    .number()
    .int('Screenshot size must be an integer')
    .nonnegative('Screenshot size must be non-negative')
    .nullable()
    .optional(),
  html_size_bytes: z
    .number()
    .int('HTML size must be an integer')
    .nonnegative('HTML size must be non-negative')
    .nullable()
    .optional(),
  raw_html: z.string().nullable().optional(),
  raw_css: z.string().nullable().optional(),
  css_size_bytes: z
    .number()
    .int('CSS size must be an integer')
    .nonnegative('CSS size must be non-negative')
    .nullable()
    .optional(),
  capture_meta: z.record(z.unknown()).optional(),
});
