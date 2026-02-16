/**
 * LLM Provider Adapters - OpenAI Adapter
 *
 * Returns the native OpenAI SDK client, configured with credentials.
 * This is a thin wrapper - consumers use the SDK directly.
 */

import OpenAI from 'npm:openai@6.17.0';
import { getCredentials } from '../credentials.ts';
import { LLMError } from '../errors.ts';

/** Singleton client instance */
let client: OpenAI | null = null;

/**
 * Creates and returns the native OpenAI SDK client.
 *
 * Uses singleton pattern - subsequent calls return the same client instance.
 *
 * @returns Native OpenAI SDK client
 * @throws LLMError if credentials are missing or initialization fails
 *
 * @example
 * ```typescript
 * import { providers, withLogging } from '@shared/llm';
 *
 * const openai = providers.openai();
 *
 * // Use native SDK methods directly
 * const response = await openai.chat.completions.create({
 *   model: 'gpt-4o',
 *   messages: [{ role: 'user', content: 'Hello!' }],
 * });
 *
 * // With logging wrapper
 * const response = await withLogging('openai', 'chat.completions.create', 'gpt-4o', () =>
 *   openai.chat.completions.create({ model: 'gpt-4o', messages: [...] })
 * );
 * ```
 */
export function createOpenAIAdapter(): OpenAI {
  try {
    if (client) return client;

    const credentials = getCredentials('openai');

    client = new OpenAI({
      apiKey: credentials.apiKey,
      organization: credentials.organizationId,
    });

    return client;
  } catch (error) {
    if (error instanceof LLMError) {
      throw error;
    }
    throw LLMError.fromProviderError('openai', error);
  }
}

/**
 * Resets the singleton client (useful for testing).
 */
export function resetOpenAIAdapter(): void {
  client = null;
}
