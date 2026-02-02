/**
 * LLM Provider Adapters - Anthropic Adapter
 *
 * Returns the native Anthropic SDK client, configured with credentials.
 * This is a thin wrapper - consumers use the SDK directly.
 */

import Anthropic from 'npm:@anthropic-ai/sdk@0.32.1';
import { getCredentials } from '../credentials.ts';
import { LLMError } from '../errors.ts';

/** Singleton client instance */
let client: Anthropic | null = null;

/**
 * Creates and returns the native Anthropic SDK client.
 *
 * Uses singleton pattern - subsequent calls return the same client instance.
 *
 * @returns Native Anthropic SDK client
 * @throws LLMError if credentials are missing or initialization fails
 *
 * @example
 * ```typescript
 * import { providers, withLogging } from '../_shared/llm/index.ts';
 *
 * const anthropic = providers.anthropic();
 *
 * // Use native SDK methods directly
 * const message = await anthropic.messages.create({
 *   model: 'claude-sonnet-4-20250514',
 *   max_tokens: 1024,
 *   messages: [{ role: 'user', content: 'Hello!' }],
 * });
 *
 * // With logging wrapper
 * const message = await withLogging('anthropic', 'messages.create', 'claude-sonnet-4-20250514', () =>
 *   anthropic.messages.create({ model: 'claude-sonnet-4-20250514', max_tokens: 1024, messages: [...] })
 * );
 * ```
 */
export function createAnthropicAdapter(): Anthropic {
  try {
    if (client) return client;

    const credentials = getCredentials('anthropic');

    client = new Anthropic({
      apiKey: credentials.apiKey,
    });

    return client;
  } catch (error) {
    if (error instanceof LLMError) {
      throw error;
    }
    throw LLMError.fromProviderError('anthropic', error);
  }
}

/**
 * Resets the singleton client (useful for testing).
 */
export function resetAnthropicAdapter(): void {
  client = null;
}
