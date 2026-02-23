/**
 * Zod schema for company-scoring edge function (request and LLM output)
 */
import { z } from 'npm:zod@3.24.1';

const uuidSchema = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

export const CompanyScoringRequestSchema = z
  .object({
    company_id: uuidSchema,
    customer_id: uuidSchema,
  })
  .strict();

export type CompanyScoringRequest = z.infer<typeof CompanyScoringRequestSchema>;

export const CompanyScoringResultSchema = z
  .object({
    score: z.number().min(0).max(10),
    short_description: z.string().min(1),
    full_description: z.string().min(1),
  })
  .strict();

export type CompanyScoringResult = z.infer<typeof CompanyScoringResultSchema>;

export function safeParseCompanyScoringRequest(
  data: unknown
): z.SafeParseReturnType<unknown, CompanyScoringRequest> {
  return CompanyScoringRequestSchema.safeParse(data);
}

export function safeParseCompanyScoringResult(
  data: unknown
): z.SafeParseReturnType<unknown, CompanyScoringResult> {
  return CompanyScoringResultSchema.safeParse(data);
}
