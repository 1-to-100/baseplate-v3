/**
 * Zod schema for segments-create edge function
 *
 * Request/response validation and TypeScript types.
 */
import { z } from 'npm:zod@3.24.1';

// ============================================================================
// Zod Schema Definitions
// ============================================================================

export const SegmentFilterDtoSchema = z
  .object({
    country: z.string().optional(),
    location: z.string().optional(),
    categories: z.array(z.string()).optional(),
    employees: z.array(z.string()).optional(),
    technographics: z.array(z.string()).optional(),
    personas: z.array(z.number()).optional(),
  })
  .strict();

export const CreateSegmentRequestSchema = z
  .object({
    name: z.string().min(1),
    filters: SegmentFilterDtoSchema,
  })
  .strict();

export const CreateSegmentResponseSchema = z
  .object({
    list_id: z.string(),
    customer_id: z.string(),
    list_type: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    filters: z.record(z.unknown()).nullable(),
    user_id: z.string().nullable(),
    status: z.string(),
    subtype: z.string(),
    is_static: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
    deleted_at: z.string().nullable(),
  })
  .strict();

// ============================================================================
// TypeScript Types (inferred from Zod)
// ============================================================================

export type SegmentFilterDto = z.infer<typeof SegmentFilterDtoSchema>;
export type CreateSegmentRequest = z.infer<typeof CreateSegmentRequestSchema>;
export type CreateSegmentResponse = z.infer<typeof CreateSegmentResponseSchema>;

// ============================================================================
// Validation Helpers
// ============================================================================

export function parseCreateSegmentRequest(data: unknown): CreateSegmentRequest {
  return CreateSegmentRequestSchema.parse(data);
}

export function safeParseCreateSegmentRequest(
  data: unknown
): z.SafeParseReturnType<unknown, CreateSegmentRequest> {
  return CreateSegmentRequestSchema.safeParse(data);
}

export function parseCreateSegmentResponse(data: unknown): CreateSegmentResponse {
  return CreateSegmentResponseSchema.parse(data);
}

export function safeParseCreateSegmentResponse(
  data: unknown
): z.SafeParseReturnType<unknown, CreateSegmentResponse> {
  return CreateSegmentResponseSchema.safeParse(data);
}
