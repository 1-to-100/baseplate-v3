/**
 * Zod schema for segments-update edge function
 */
import { z } from 'npm:zod@3.24.1';

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

export const UpdateSegmentRequestSchema = z
  .object({
    segment_id: z.string().min(1),
    name: z.string().min(1),
    filters: SegmentFilterDtoSchema,
  })
  .strict();

export const UpdateSegmentResponseSchema = z
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

export type SegmentFilterDto = z.infer<typeof SegmentFilterDtoSchema>;
export type UpdateSegmentRequest = z.infer<typeof UpdateSegmentRequestSchema>;
export type UpdateSegmentResponse = z.infer<typeof UpdateSegmentResponseSchema>;

export function parseUpdateSegmentRequest(data: unknown): UpdateSegmentRequest {
  return UpdateSegmentRequestSchema.parse(data);
}

export function safeParseUpdateSegmentRequest(
  data: unknown
): z.SafeParseReturnType<unknown, UpdateSegmentRequest> {
  return UpdateSegmentRequestSchema.safeParse(data);
}

export function safeParseUpdateSegmentResponse(
  data: unknown
): z.SafeParseReturnType<unknown, UpdateSegmentResponse> {
  return UpdateSegmentResponseSchema.safeParse(data);
}
