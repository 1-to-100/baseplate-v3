/**
 * LLM Provider Adapters - Public API
 *
 * Entry point for all LLM provider interactions.
 * Returns native SDK clients - use their methods directly.
 *
 * @example
 * ```typescript
 * import { providers, LLMError, withLogging } from '@shared/llm';
 *
 * // Get native OpenAI client
 * const openai = providers.openai();
 * const response = await openai.chat.completions.create({
 *   model: 'gpt-4o',
 *   messages: [{ role: 'user', content: 'Hello!' }],
 * });
 *
 * // Get native Anthropic client
 * const anthropic = providers.anthropic();
 * const message = await anthropic.messages.create({
 *   model: 'claude-sonnet-4-20250514',
 *   max_tokens: 1024,
 *   messages: [{ role: 'user', content: 'Hello!' }],
 * });
 *
 * // Get native Gemini client
 * const gemini = providers.gemini();
 * const model = gemini.getGenerativeModel({ model: 'gemini-1.5-pro' });
 * const result = await model.generateContent('Hello!');
 *
 * // With logging (wrap individual calls)
 * const response = await withLogging('openai', 'chat.completions.create', 'gpt-4o', () =>
 *   openai.chat.completions.create({ model: 'gpt-4o', messages: [...] })
 * );
 * ```
 */

// Provider registry
export { providers } from './adapters/index.ts';

// Error handling
export { LLMError } from './errors.ts';

// Types
export type { LLMProvider, LLMErrorCode } from './types.ts';
export type { ProviderCredentials } from './credentials.ts';

// Logging utilities
export { logLLMOperation, createTimer, withLogging } from './logging.ts';
export type { LLMLogEntry } from './logging.ts';

// Credentials utilities (for advanced use cases)
export { getCredentials, hasCredentials, isValidKeyFormat } from './credentials.ts';

// Note: Test utilities (resetAllAdapters, etc.) are in ./testing.ts
// Import from there for test code: import { resetAllAdapters } from './testing.ts';
