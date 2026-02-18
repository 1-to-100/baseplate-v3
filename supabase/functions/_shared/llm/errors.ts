/**
 * LLM Provider Adapters - Error Classes
 *
 * Normalized error handling for all LLM provider interactions.
 * Maps provider-specific errors to a consistent LLMError format.
 */

import type { LLMErrorCode, LLMProvider } from './types.ts';

/**
 * Normalized error class for all LLM provider errors.
 * Use `LLMError.fromProviderError()` to map provider-specific errors.
 */
export class LLMError extends Error {
  /** The original error that caused this LLMError */
  public readonly originalCause?: unknown;

  constructor(
    message: string,
    public code: LLMErrorCode,
    public provider: LLMProvider,
    public statusCode?: number,
    public retryable: boolean = false,
    cause?: unknown
  ) {
    super(message, { cause });
    this.name = 'LLMError';
    this.originalCause = cause;
  }

  /**
   * Maps provider-specific errors to normalized LLMError.
   * Handles SDK-specific error types, HTTP status codes, and common error patterns.
   */
  static fromProviderError(provider: LLMProvider, error: unknown): LLMError {
    const message = extractMessage(error);
    const statusCode = extractStatusCode(error);

    // Check for provider SDK-specific error types first
    const sdkError = detectSDKErrorType(error);
    if (sdkError) {
      return new LLMError(
        message,
        sdkError.code,
        provider,
        statusCode,
        sdkError.retryable,
        error
      );
    }

    // Fall back to HTTP status code mapping
    if (statusCode) {
      const { code, retryable } = mapStatusCodeToError(statusCode);
      return new LLMError(message, code, provider, statusCode, retryable, error);
    }

    // Handle timeout errors
    if (isTimeoutError(error)) {
      return new LLMError(message, 'TIMEOUT', provider, undefined, true, error);
    }

    // Handle network/connection errors (retryable)
    if (isNetworkError(error)) {
      return new LLMError(
        message,
        'PROVIDER_UNAVAILABLE',
        provider,
        undefined,
        true,
        error
      );
    }

    // Default to unknown error (not retryable)
    return new LLMError(message, 'UNKNOWN', provider, undefined, false, error);
  }

  /**
   * Create a timeout error for a specific provider.
   */
  static timeout(provider: LLMProvider, timeoutSeconds: number): LLMError {
    return new LLMError(
      `${provider} request timed out after ${timeoutSeconds}s`,
      'TIMEOUT',
      provider,
      408,
      true
    );
  }

  /**
   * Create an authentication error for missing credentials.
   */
  static authenticationFailed(provider: LLMProvider, envVar: string): LLMError {
    return new LLMError(
      `Missing ${envVar} environment variable`,
      'AUTHENTICATION_FAILED',
      provider
    );
  }

  /**
   * Create an error for providers that don't support background/async mode.
   */
  static backgroundNotSupported(provider: LLMProvider): LLMError {
    return new LLMError(
      `${provider} does not support background/async mode`,
      'BACKGROUND_NOT_SUPPORTED',
      provider,
      400
    );
  }

  /**
   * Returns a JSON-serializable representation for logging.
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      provider: this.provider,
      statusCode: this.statusCode,
      retryable: this.retryable,
    };
  }
}

/**
 * Detects provider SDK-specific error types by error name.
 * Returns null if error type is not recognized.
 *
 * Supported SDK error types:
 * - OpenAI: AuthenticationError, RateLimitError, BadRequestError, NotFoundError, etc.
 * - Anthropic: AuthenticationError, RateLimitError, BadRequestError, NotFoundError, etc.
 * - Gemini: GoogleGenerativeAIError (with various messages)
 */
function detectSDKErrorType(
  error: unknown
): { code: LLMErrorCode; retryable: boolean } | null {
  if (!(error instanceof Error)) {
    return null;
  }

  const errorName = error.name;
  const message = error.message.toLowerCase();

  // OpenAI and Anthropic use similar error class naming
  switch (errorName) {
    case 'AuthenticationError':
      return { code: 'AUTHENTICATION_FAILED', retryable: false };

    case 'RateLimitError':
      return { code: 'RATE_LIMITED', retryable: true };

    case 'BadRequestError':
    case 'UnprocessableEntityError':
      // Check for context length issues
      if (
        message.includes('context') ||
        message.includes('token') ||
        message.includes('maximum')
      ) {
        return { code: 'CONTEXT_LENGTH_EXCEEDED', retryable: false };
      }
      return { code: 'INVALID_REQUEST', retryable: false };

    case 'NotFoundError':
      return { code: 'MODEL_NOT_FOUND', retryable: false };

    case 'ContentFilterError':
    case 'ContentPolicyViolationError':
      return { code: 'CONTENT_FILTERED', retryable: false };

    case 'InternalServerError':
    case 'ServiceUnavailableError':
      return { code: 'PROVIDER_UNAVAILABLE', retryable: true };

    case 'APIConnectionError':
    case 'APITimeoutError':
      return { code: 'TIMEOUT', retryable: true };

    // Gemini-specific
    case 'GoogleGenerativeAIError':
      // Parse Gemini error messages for specific conditions
      if (message.includes('api key')) {
        return { code: 'AUTHENTICATION_FAILED', retryable: false };
      }
      if (message.includes('quota') || message.includes('rate')) {
        return { code: 'RATE_LIMITED', retryable: true };
      }
      if (message.includes('safety') || message.includes('blocked')) {
        return { code: 'CONTENT_FILTERED', retryable: false };
      }
      if (message.includes('not found') || message.includes('invalid model')) {
        return { code: 'MODEL_NOT_FOUND', retryable: false };
      }
      return null; // Fall through to status code mapping

    default:
      return null;
  }
}

/**
 * Maps HTTP status codes to LLMErrorCode and retryable flag.
 */
function mapStatusCodeToError(
  statusCode: number
): { code: LLMErrorCode; retryable: boolean } {
  switch (statusCode) {
    case 400:
      return { code: 'INVALID_REQUEST', retryable: false };
    case 401:
    case 403:
      return { code: 'AUTHENTICATION_FAILED', retryable: false };
    case 402: // Payment required - quota/billing issues
      return { code: 'RATE_LIMITED', retryable: false };
    case 404:
      return { code: 'MODEL_NOT_FOUND', retryable: false };
    case 408: // Request timeout
      return { code: 'TIMEOUT', retryable: true };
    case 413:
      return { code: 'CONTEXT_LENGTH_EXCEEDED', retryable: false };
    case 422: // Unprocessable entity - validation errors
      return { code: 'INVALID_REQUEST', retryable: false };
    case 429:
      return { code: 'RATE_LIMITED', retryable: true };
    case 451: // Unavailable for legal reasons (content policy)
      return { code: 'CONTENT_FILTERED', retryable: false };
    case 503: // Service unavailable - explicitly retryable
      return { code: 'PROVIDER_UNAVAILABLE', retryable: true };
    default:
      if (statusCode >= 500) {
        return { code: 'PROVIDER_UNAVAILABLE', retryable: true };
      }
      return { code: 'UNKNOWN', retryable: false };
  }
}

/**
 * Extracts status code from various error formats.
 */
function extractStatusCode(error: unknown): number | undefined {
  if (error && typeof error === 'object') {
    const e = error as Record<string, unknown>;
    // SDK errors often have status or statusCode
    if (typeof e.status === 'number') return e.status;
    if (typeof e.statusCode === 'number') return e.statusCode;
    // Nested in response object
    if (e.response && typeof e.response === 'object') {
      const resp = e.response as Record<string, unknown>;
      if (typeof resp.status === 'number') return resp.status;
    }
  }
  return undefined;
}

/**
 * Extracts error message from various error formats.
 */
function extractMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (error && typeof error === 'object') {
    const e = error as Record<string, unknown>;
    if (typeof e.message === 'string') return e.message;
    if (typeof e.error === 'string') return e.error;
    if (e.error && typeof e.error === 'object') {
      const nested = e.error as Record<string, unknown>;
      if (typeof nested.message === 'string') return nested.message;
    }
  }
  return String(error);
}

/**
 * Checks if error is a timeout error.
 */
function isTimeoutError(error: unknown): boolean {
  if (error instanceof Error) {
    const name = error.name.toLowerCase();
    const message = error.message.toLowerCase();
    return (
      name.includes('timeout') ||
      name === 'aborterror' ||
      message.includes('timeout') ||
      message.includes('timed out')
    );
  }
  return false;
}

/**
 * Checks if error is a network/connection error.
 * Detects fetch failures, DNS errors, and connection refused.
 */
function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Fetch-specific network errors (TypeError with specific messages)
    if (error.name === 'TypeError') {
      return (
        message.includes('failed to fetch') ||
        message.includes('networkerror') ||
        message.includes('network request failed')
      );
    }

    // General network/connection errors
    return (
      message.includes('network') ||
      message.includes('connection') ||
      message.includes('econnrefused') ||
      message.includes('enotfound') ||
      message.includes('econnreset') ||
      message.includes('socket hang up')
    );
  }
  return false;
}
