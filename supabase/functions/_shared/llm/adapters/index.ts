/**
 * LLM Provider Adapters - Provider Registry
 *
 * Central registry for all LLM provider adapters.
 * Each provider returns its native SDK client.
 */

import { createOpenAIAdapter } from './openai.ts';
import { createAnthropicAdapter } from './anthropic.ts';
import { createGeminiAdapter } from './gemini.ts';

/**
 * Provider registry - factory functions for each LLM provider.
 *
 * Each function returns the native SDK client for that provider.
 * Use the SDK methods directly after obtaining the client.
 *
 * @example
 * ```typescript
 * import { providers } from '../_shared/llm/index.ts';
 *
 * // OpenAI
 * const openai = providers.openai();
 * const chat = await openai.chat.completions.create({ ... });
 *
 * // Anthropic
 * const anthropic = providers.anthropic();
 * const message = await anthropic.messages.create({ ... });
 *
 * // Gemini
 * const gemini = providers.gemini();
 * const model = gemini.getGenerativeModel({ model: 'gemini-1.5-pro' });
 * ```
 */
export const providers = {
  /** Returns native OpenAI SDK client */
  openai: createOpenAIAdapter,
  /** Returns native Anthropic SDK client */
  anthropic: createAnthropicAdapter,
  /** Returns native Google Generative AI SDK client */
  gemini: createGeminiAdapter,
};
