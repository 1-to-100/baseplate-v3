/**
 * Zod schema for segments-ai edge function (LLM output and request)
 */
import { z } from 'npm:zod@3.24.1';

// Request
export const AskAiSegmentRequestSchema = z
  .object({
    description: z.string().min(1),
  })
  .strict();

export type AskAiSegmentRequest = z.infer<typeof AskAiSegmentRequestSchema>;

// Raw AI response (what the model returns)
export const RawAiSegmentFiltersSchema = z
  .object({
    country: z.string().optional(),
    location: z.string().optional(),
    employees: z.string().optional(),
    categories: z.array(z.string()).optional(),
    technographics: z.array(z.string()).optional(),
  })
  .strict();

export const RawAiSegmentResponseSchema = z
  .object({
    name: z.string(),
    filters: RawAiSegmentFiltersSchema,
  })
  .strict();

export type RawAiSegmentResponse = z.infer<typeof RawAiSegmentResponseSchema>;

// Mapped response
export const AiGeneratedSegmentFiltersSchema = z
  .object({
    country: z.string().optional(),
    location: z.string().optional(),
    categories: z.array(z.string()).optional(),
    employees: z.array(z.string()).optional(),
    technographics: z.array(z.string()).optional(),
  })
  .strict();

export const AiGeneratedSegmentResponseSchema = z
  .object({
    name: z.string(),
    filters: AiGeneratedSegmentFiltersSchema,
  })
  .strict();

export type AiGeneratedSegmentResponse = z.infer<typeof AiGeneratedSegmentResponseSchema>;

export function safeParseRawAiSegmentResponse(
  data: unknown
): z.SafeParseReturnType<unknown, RawAiSegmentResponse> {
  return RawAiSegmentResponseSchema.safeParse(data);
}

export function safeParseAskAiSegmentRequest(
  data: unknown
): z.SafeParseReturnType<unknown, AskAiSegmentRequest> {
  return AskAiSegmentRequestSchema.safeParse(data);
}
