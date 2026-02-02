/**
 * LLM Provider Adapters - Type Definitions
 *
 * Core types for the LLM provider abstraction layer.
 */

/**
 * Supported LLM providers.
 */
export type LLMProvider = 'openai' | 'anthropic' | 'gemini';

/**
 * Normalized error codes for LLM operations.
 * These provide consistent error handling across all providers.
 */
export type LLMErrorCode =
  /** Provider service is unavailable (retryable) */
  | 'PROVIDER_UNAVAILABLE'
  /** Requested model does not exist */
  | 'MODEL_NOT_FOUND'
  /** Rate limit exceeded (retryable) */
  | 'RATE_LIMITED'
  /** Input exceeds model's context window */
  | 'CONTEXT_LENGTH_EXCEEDED'
  /** Content blocked by safety filters */
  | 'CONTENT_FILTERED'
  /** Malformed or invalid request */
  | 'INVALID_REQUEST'
  /** API key invalid or missing */
  | 'AUTHENTICATION_FAILED'
  /** Request timed out (retryable) */
  | 'TIMEOUT'
  /** Webhook signature verification failed */
  | 'WEBHOOK_VERIFICATION_FAILED'
  /** Unknown or unmapped error */
  | 'UNKNOWN';
