/**
 * Response processor registry (empty baseline).
 * Populated by supabase/scripts/wrap-feature-functions.mjs when wrapping feature functions.
 */
import type { ResponseProcessor } from './types.ts';

const PROCESSOR_MAP: Record<string, ResponseProcessor> = {};

export function getResponseProcessor(
  featureSlug: string | null | undefined
): ResponseProcessor | null {
  if (!featureSlug) return null;
  return PROCESSOR_MAP[featureSlug] ?? null;
}
