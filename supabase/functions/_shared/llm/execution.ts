/**
 * Shared LLM Call Utilities
 *
 * Common types, utilities, and provider call implementations
 * shared between llm-worker and llm-query edge functions.
 *
 * Extracted as part of L3 finding to eliminate duplicated provider
 * call logic across the two entry points.
 */

import type { LLMProvider } from './types.ts';
import { LLMError } from './errors.ts';
import { withLogging } from './logging.ts';
import { providers } from './adapters/index.ts';

// =============================================================================
// Constants
// =============================================================================

/** Default timeout for LLM API calls in seconds */
export const DEFAULT_TIMEOUT_SECONDS = 120;

/** Keys that must not be spread from user-supplied input onto API calls */
export const PROTECTED_INPUT_KEYS = new Set([
  'messages', 'input', 'stream', 'model', 'system', 'max_tokens', 'max_output_tokens',
]);

// =============================================================================
// Types
// =============================================================================

/**
 * Result of an LLM call, normalized across all providers.
 */
export interface LLMResult {
  output: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  model?: string;
  response_id?: string;
}

/**
 * Provider configuration from the llm_providers table.
 */
export interface ProviderConfig {
  id: string;
  slug: string;
  name: string;
  timeout_seconds: number;
  max_retries: number;
  retry_delay_seconds: number;
  config: Record<string, unknown>;
}

/**
 * Common input shape for provider call functions.
 * Both LLMJob (worker) and LLMQueryRequest (query) satisfy this interface.
 */
export interface LLMCallParams {
  prompt: string;
  system_prompt?: string | null;
  messages?: unknown[] | null;
  input?: Record<string, unknown>;
}

/**
 * LLM provider SDK client factories for dependency injection.
 */
export interface LLMProviders {
  openai: () => ReturnType<typeof providers.openai>;
  anthropic: () => ReturnType<typeof providers.anthropic>;
  gemini: () => ReturnType<typeof providers.gemini>;
}

// =============================================================================
// Utilities
// =============================================================================

/**
 * Validates that a provider slug is one of the supported providers.
 */
export function isValidProvider(slug: string): slug is LLMProvider {
  return ['openai', 'anthropic', 'gemini'].includes(slug);
}

/**
 * Strips protected keys from user-supplied input before spreading onto API calls.
 * Prevents parameter injection (e.g., overriding model, system, max_tokens).
 */
export function sanitizeInputParams(input: unknown): Record<string, unknown> {
  const raw = (input as Record<string, unknown>) || {};
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!PROTECTED_INPUT_KEYS.has(key)) {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Wraps an async operation with a timeout based on provider configuration.
 * Throws LLMError.timeout() if the operation exceeds the deadline.
 *
 * Uses Promise.race to enforce the timeout — the underlying operation
 * may continue running, but the caller receives the timeout error immediately.
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  provider: ProviderConfig
): Promise<T> {
  const seconds = provider.timeout_seconds || DEFAULT_TIMEOUT_SECONDS;
  let timer: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(LLMError.timeout(provider.slug as LLMProvider, seconds)),
      seconds * 1000,
    );
  });

  try {
    return await Promise.race([fn(), timeoutPromise]);
  } finally {
    clearTimeout(timer!);
  }
}

// =============================================================================
// Provider Call Functions
// =============================================================================

/**
 * Calls OpenAI Chat Completions API.
 */
export async function callOpenAIChat(
  params: LLMCallParams,
  provider: ProviderConfig,
  llmProviders: LLMProviders,
  model: string,
): Promise<LLMResult> {
  const openai = llmProviders.openai();

  // deno-lint-ignore no-explicit-any
  let messages: any[];
  if (params.messages) {
    messages = params.messages as typeof messages;
  } else {
    messages = [];
    if (params.system_prompt) {
      messages.push({ role: 'system', content: params.system_prompt });
    }
    messages.push({ role: 'user', content: params.prompt });
  }

  const response = await withLogging('openai', 'chat.completions.create', model, async () => {
    return await openai.chat.completions.create({
      model,
      messages,
      ...sanitizeInputParams(params.input),
    });
  });

  const choice = response.choices[0];
  if (!choice?.message?.content) {
    throw new LLMError('No content in OpenAI response', 'INVALID_REQUEST', 'openai');
  }

  return {
    output: choice.message.content,
    usage: response.usage
      ? {
          prompt_tokens: response.usage.prompt_tokens,
          completion_tokens: response.usage.completion_tokens,
          total_tokens: response.usage.total_tokens,
        }
      : undefined,
    model: response.model,
    response_id: response.id,
  };
}

/**
 * Calls Anthropic Messages API.
 */
export async function callAnthropic(
  params: LLMCallParams,
  provider: ProviderConfig,
  llmProviders: LLMProviders,
  model: string,
): Promise<LLMResult> {
  const anthropic = llmProviders.anthropic();
  const maxTokens = (provider.config.max_tokens as number) || 4096;

  const response = await withLogging('anthropic', 'messages.create', model, async () => {
    return await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      system: params.system_prompt || undefined,
      messages: [{ role: 'user', content: params.prompt }],
      ...sanitizeInputParams(params.input),
    });
  });

  const textContent = response.content.find((c: { type: string }) => c.type === 'text') as
    | { type: 'text'; text: string }
    | undefined;

  if (!textContent) {
    throw new LLMError('No text content in Anthropic response', 'INVALID_REQUEST', 'anthropic');
  }

  return {
    output: textContent.text,
    usage: {
      prompt_tokens: response.usage?.input_tokens,
      completion_tokens: response.usage?.output_tokens,
      total_tokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
    },
    model: response.model,
    response_id: response.id,
  };
}

/**
 * Calls Google Gemini generateContent API.
 */
export async function callGemini(
  params: LLMCallParams,
  provider: ProviderConfig,
  llmProviders: LLMProviders,
  model: string,
): Promise<LLMResult> {
  const gemini = llmProviders.gemini();

  const geminiModel = gemini.getGenerativeModel({
    model,
    ...(params.system_prompt ? { systemInstruction: params.system_prompt } : {}),
  });

  const result = await withLogging('gemini', 'generateContent', model, async () => {
    return await geminiModel.generateContent(params.prompt);
  });

  const response = result.response;
  const text = response.text();

  if (!text) {
    throw new LLMError('No text in Gemini response', 'INVALID_REQUEST', 'gemini');
  }

  return {
    output: text,
    usage: response.usageMetadata
      ? {
          prompt_tokens: response.usageMetadata.promptTokenCount,
          completion_tokens: response.usageMetadata.candidatesTokenCount,
          total_tokens: response.usageMetadata.totalTokenCount,
        }
      : undefined,
    model,
  };
}
