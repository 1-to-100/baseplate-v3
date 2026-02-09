/**
 * LLM Provider Adapters - Test Utilities
 *
 * Utilities for testing code that uses LLM adapters.
 * These are NOT part of the public API and should only be used in tests.
 */

import { resetOpenAIAdapter } from './adapters/openai.ts';
import { resetAnthropicAdapter } from './adapters/anthropic.ts';
import { resetGeminiAdapter } from './adapters/gemini.ts';

/**
 * Resets all adapter singletons.
 * Call this between tests to ensure clean state.
 *
 * @example
 * ```typescript
 * import { resetAllAdapters } from '@shared/llm/testing';
 *
 * afterEach(() => {
 *   resetAllAdapters();
 * });
 * ```
 */
export function resetAllAdapters(): void {
  resetOpenAIAdapter();
  resetAnthropicAdapter();
  resetGeminiAdapter();
}

// Re-export individual reset functions for granular control
export { resetOpenAIAdapter } from './adapters/openai.ts';
export { resetAnthropicAdapter } from './adapters/anthropic.ts';
export { resetGeminiAdapter } from './adapters/gemini.ts';
