/**
 * Response Processors - Public API
 *
 * Entry point for the response processor framework.
 */
export { getResponseProcessor } from './registry.ts';
export type { ResponseProcessor } from './types.ts';
export { cleanJsonResponse } from './utils.ts';
