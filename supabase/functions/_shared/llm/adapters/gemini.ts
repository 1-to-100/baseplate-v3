/**
 * LLM Provider Adapters - Gemini Adapter
 *
 * Returns the native Google Generative AI SDK client, configured with credentials.
 * This is a thin wrapper - consumers use the SDK directly.
 */

import { GoogleGenerativeAI } from 'npm:@google/generative-ai@0.21.0';
import { getCredentials } from '../credentials.ts';
import { LLMError } from '../errors.ts';

/** Singleton client instance */
let client: GoogleGenerativeAI | null = null;

/**
 * Creates and returns the native Google Generative AI SDK client.
 *
 * Uses singleton pattern - subsequent calls return the same client instance.
 *
 * @returns Native GoogleGenerativeAI SDK client
 * @throws LLMError if credentials are missing or initialization fails
 *
 * @example
 * ```typescript
 * import { providers, withLogging } from '../_shared/llm/index.ts';
 *
 * const gemini = providers.gemini();
 * const model = gemini.getGenerativeModel({ model: 'gemini-1.5-pro' });
 *
 * // Generate content
 * const result = await model.generateContent('Hello!');
 * const text = result.response.text();
 *
 * // With logging wrapper
 * const result = await withLogging('gemini', 'generateContent', 'gemini-1.5-pro', () =>
 *   model.generateContent('Hello!')
 * );
 * ```
 */
export function createGeminiAdapter(): GoogleGenerativeAI {
  try {
    if (client) return client;

    const credentials = getCredentials('gemini');

    client = new GoogleGenerativeAI(credentials.apiKey);

    return client;
  } catch (error) {
    if (error instanceof LLMError) {
      throw error;
    }
    throw LLMError.fromProviderError('gemini', error);
  }
}

/**
 * Resets the singleton client (useful for testing).
 */
export function resetGeminiAdapter(): void {
  client = null;
}
