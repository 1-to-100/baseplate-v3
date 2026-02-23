/**
 * Zod schema for segments-process request body
 */
import { z } from 'npm:zod@3.24.1';

export const ProcessSegmentRequestSchema = z
  .object({
    segment_id: z.string().min(1),
    customer_id: z.string().min(1),
  })
  .strict();

export type ProcessSegmentRequest = z.infer<typeof ProcessSegmentRequestSchema>;

export function safeParseProcessSegmentRequest(
  data: unknown
): z.SafeParseReturnType<unknown, ProcessSegmentRequest> {
  return ProcessSegmentRequestSchema.safeParse(data);
}
