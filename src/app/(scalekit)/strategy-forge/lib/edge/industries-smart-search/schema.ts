/**
 * Optional Zod schema for industries-smart-search request/response
 */
import { z } from 'npm:zod@3.24.1';

export const SmartSearchRequestSchema = z
  .object({
    query: z.string().min(1).max(500),
  })
  .strict();

export const SmartSearchResultSchema = z.object({
  industry_id: z.number(),
  value: z.string(),
  score: z.number(),
});

export type SmartSearchRequest = z.infer<typeof SmartSearchRequestSchema>;
export type SmartSearchResult = z.infer<typeof SmartSearchResultSchema>;

export function safeParseSmartSearchRequest(
  data: unknown
): z.SafeParseReturnType<unknown, SmartSearchRequest> {
  return SmartSearchRequestSchema.safeParse(data);
}
