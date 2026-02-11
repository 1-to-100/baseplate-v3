/**
 * LLM Provider Adapters - Errors Tests
 */

import { assertEquals, assertInstanceOf } from 'jsr:@std/assert@1';
import { describe, it } from 'jsr:@std/testing@1/bdd';
import { LLMError } from '../../../../supabase/functions/_shared/llm/errors.ts';

describe('LLMError', () => {
  describe('constructor', () => {
    it('should create error with all properties', () => {
      const error = new LLMError(
        'Test error',
        'RATE_LIMITED',
        'openai',
        429,
        true,
        new Error('original')
      );

      assertEquals(error.message, 'Test error');
      assertEquals(error.code, 'RATE_LIMITED');
      assertEquals(error.provider, 'openai');
      assertEquals(error.statusCode, 429);
      assertEquals(error.retryable, true);
      assertInstanceOf(error.originalCause, Error);
      assertEquals(error.name, 'LLMError');
    });

    it('should default retryable to false', () => {
      const error = new LLMError('Test', 'UNKNOWN', 'anthropic');

      assertEquals(error.retryable, false);
    });
  });

  describe('toJSON', () => {
    it('should return serializable object', () => {
      const error = new LLMError(
        'Rate limit exceeded',
        'RATE_LIMITED',
        'openai',
        429,
        true
      );

      const json = error.toJSON();

      assertEquals(json, {
        name: 'LLMError',
        message: 'Rate limit exceeded',
        code: 'RATE_LIMITED',
        provider: 'openai',
        statusCode: 429,
        retryable: true,
      });
    });

    it('should exclude cause from JSON', () => {
      const error = new LLMError(
        'Test',
        'UNKNOWN',
        'gemini',
        500,
        false,
        new Error('cause')
      );

      const json = error.toJSON();

      assertEquals('cause' in json, false);
    });
  });

  describe('fromProviderError', () => {
    describe('SDK error type detection', () => {
      it('should detect AuthenticationError', () => {
        const sdkError = new Error('Invalid API key');
        sdkError.name = 'AuthenticationError';

        const error = LLMError.fromProviderError('openai', sdkError);

        assertEquals(error.code, 'AUTHENTICATION_FAILED');
        assertEquals(error.retryable, false);
      });

      it('should detect RateLimitError', () => {
        const sdkError = new Error('Rate limit exceeded');
        sdkError.name = 'RateLimitError';

        const error = LLMError.fromProviderError('anthropic', sdkError);

        assertEquals(error.code, 'RATE_LIMITED');
        assertEquals(error.retryable, true);
      });

      it('should detect BadRequestError with context length issue', () => {
        const sdkError = new Error('Maximum context length exceeded');
        sdkError.name = 'BadRequestError';

        const error = LLMError.fromProviderError('openai', sdkError);

        assertEquals(error.code, 'CONTEXT_LENGTH_EXCEEDED');
        assertEquals(error.retryable, false);
      });

      it('should detect BadRequestError with token issue', () => {
        const sdkError = new Error('Token limit exceeded');
        sdkError.name = 'BadRequestError';

        const error = LLMError.fromProviderError('openai', sdkError);

        assertEquals(error.code, 'CONTEXT_LENGTH_EXCEEDED');
      });

      it('should detect generic BadRequestError', () => {
        const sdkError = new Error('Invalid request format');
        sdkError.name = 'BadRequestError';

        const error = LLMError.fromProviderError('openai', sdkError);

        assertEquals(error.code, 'INVALID_REQUEST');
        assertEquals(error.retryable, false);
      });

      it('should detect UnprocessableEntityError', () => {
        const sdkError = new Error('Validation failed');
        sdkError.name = 'UnprocessableEntityError';

        const error = LLMError.fromProviderError('openai', sdkError);

        assertEquals(error.code, 'INVALID_REQUEST');
      });

      it('should detect NotFoundError', () => {
        const sdkError = new Error('Model not found');
        sdkError.name = 'NotFoundError';

        const error = LLMError.fromProviderError('openai', sdkError);

        assertEquals(error.code, 'MODEL_NOT_FOUND');
        assertEquals(error.retryable, false);
      });

      it('should detect ContentFilterError', () => {
        const sdkError = new Error('Content blocked');
        sdkError.name = 'ContentFilterError';

        const error = LLMError.fromProviderError('openai', sdkError);

        assertEquals(error.code, 'CONTENT_FILTERED');
        assertEquals(error.retryable, false);
      });

      it('should detect ContentPolicyViolationError', () => {
        const sdkError = new Error('Policy violation');
        sdkError.name = 'ContentPolicyViolationError';

        const error = LLMError.fromProviderError('anthropic', sdkError);

        assertEquals(error.code, 'CONTENT_FILTERED');
      });

      it('should detect InternalServerError', () => {
        const sdkError = new Error('Internal error');
        sdkError.name = 'InternalServerError';

        const error = LLMError.fromProviderError('openai', sdkError);

        assertEquals(error.code, 'PROVIDER_UNAVAILABLE');
        assertEquals(error.retryable, true);
      });

      it('should detect ServiceUnavailableError', () => {
        const sdkError = new Error('Service unavailable');
        sdkError.name = 'ServiceUnavailableError';

        const error = LLMError.fromProviderError('anthropic', sdkError);

        assertEquals(error.code, 'PROVIDER_UNAVAILABLE');
        assertEquals(error.retryable, true);
      });

      it('should detect APIConnectionError', () => {
        const sdkError = new Error('Connection failed');
        sdkError.name = 'APIConnectionError';

        const error = LLMError.fromProviderError('openai', sdkError);

        assertEquals(error.code, 'TIMEOUT');
        assertEquals(error.retryable, true);
      });

      it('should detect APITimeoutError', () => {
        const sdkError = new Error('Request timed out');
        sdkError.name = 'APITimeoutError';

        const error = LLMError.fromProviderError('openai', sdkError);

        assertEquals(error.code, 'TIMEOUT');
        assertEquals(error.retryable, true);
      });
    });

    describe('Gemini-specific error detection', () => {
      it('should detect Gemini API key error', () => {
        const sdkError = new Error('Invalid api key');
        sdkError.name = 'GoogleGenerativeAIError';

        const error = LLMError.fromProviderError('gemini', sdkError);

        assertEquals(error.code, 'AUTHENTICATION_FAILED');
        assertEquals(error.retryable, false);
      });

      it('should detect Gemini quota error', () => {
        const sdkError = new Error('Quota exceeded');
        sdkError.name = 'GoogleGenerativeAIError';

        const error = LLMError.fromProviderError('gemini', sdkError);

        assertEquals(error.code, 'RATE_LIMITED');
        assertEquals(error.retryable, true);
      });

      it('should detect Gemini rate limit error', () => {
        const sdkError = new Error('Rate limit hit');
        sdkError.name = 'GoogleGenerativeAIError';

        const error = LLMError.fromProviderError('gemini', sdkError);

        assertEquals(error.code, 'RATE_LIMITED');
      });

      it('should detect Gemini safety block', () => {
        const sdkError = new Error('Content blocked by safety settings');
        sdkError.name = 'GoogleGenerativeAIError';

        const error = LLMError.fromProviderError('gemini', sdkError);

        assertEquals(error.code, 'CONTENT_FILTERED');
        assertEquals(error.retryable, false);
      });

      it('should detect Gemini model not found', () => {
        const sdkError = new Error('Model not found');
        sdkError.name = 'GoogleGenerativeAIError';

        const error = LLMError.fromProviderError('gemini', sdkError);

        assertEquals(error.code, 'MODEL_NOT_FOUND');
      });

      it('should detect Gemini invalid model', () => {
        const sdkError = new Error('Invalid model specified');
        sdkError.name = 'GoogleGenerativeAIError';

        const error = LLMError.fromProviderError('gemini', sdkError);

        assertEquals(error.code, 'MODEL_NOT_FOUND');
      });
    });

    describe('HTTP status code mapping', () => {
      it('should map 400 to INVALID_REQUEST', () => {
        const httpError = { message: 'Bad request', status: 400 };

        const error = LLMError.fromProviderError('openai', httpError);

        assertEquals(error.code, 'INVALID_REQUEST');
        assertEquals(error.statusCode, 400);
        assertEquals(error.retryable, false);
      });

      it('should map 401 to AUTHENTICATION_FAILED', () => {
        const httpError = { message: 'Unauthorized', status: 401 };

        const error = LLMError.fromProviderError('openai', httpError);

        assertEquals(error.code, 'AUTHENTICATION_FAILED');
        assertEquals(error.retryable, false);
      });

      it('should map 403 to AUTHENTICATION_FAILED', () => {
        const httpError = { message: 'Forbidden', status: 403 };

        const error = LLMError.fromProviderError('anthropic', httpError);

        assertEquals(error.code, 'AUTHENTICATION_FAILED');
      });

      it('should map 402 to RATE_LIMITED (billing issue)', () => {
        const httpError = { message: 'Payment required', status: 402 };

        const error = LLMError.fromProviderError('openai', httpError);

        assertEquals(error.code, 'RATE_LIMITED');
        assertEquals(error.retryable, false);
      });

      it('should map 404 to MODEL_NOT_FOUND', () => {
        const httpError = { message: 'Not found', status: 404 };

        const error = LLMError.fromProviderError('openai', httpError);

        assertEquals(error.code, 'MODEL_NOT_FOUND');
        assertEquals(error.retryable, false);
      });

      it('should map 408 to TIMEOUT', () => {
        const httpError = { message: 'Request timeout', status: 408 };

        const error = LLMError.fromProviderError('openai', httpError);

        assertEquals(error.code, 'TIMEOUT');
        assertEquals(error.retryable, true);
      });

      it('should map 413 to CONTEXT_LENGTH_EXCEEDED', () => {
        const httpError = { message: 'Payload too large', status: 413 };

        const error = LLMError.fromProviderError('anthropic', httpError);

        assertEquals(error.code, 'CONTEXT_LENGTH_EXCEEDED');
        assertEquals(error.retryable, false);
      });

      it('should map 422 to INVALID_REQUEST', () => {
        const httpError = { message: 'Unprocessable entity', status: 422 };

        const error = LLMError.fromProviderError('openai', httpError);

        assertEquals(error.code, 'INVALID_REQUEST');
        assertEquals(error.retryable, false);
      });

      it('should map 429 to RATE_LIMITED', () => {
        const httpError = { message: 'Too many requests', status: 429 };

        const error = LLMError.fromProviderError('openai', httpError);

        assertEquals(error.code, 'RATE_LIMITED');
        assertEquals(error.statusCode, 429);
        assertEquals(error.retryable, true);
      });

      it('should map 451 to CONTENT_FILTERED', () => {
        const httpError = {
          message: 'Unavailable for legal reasons',
          status: 451,
        };

        const error = LLMError.fromProviderError('openai', httpError);

        assertEquals(error.code, 'CONTENT_FILTERED');
        assertEquals(error.retryable, false);
      });

      it('should map 503 to PROVIDER_UNAVAILABLE', () => {
        const httpError = { message: 'Service unavailable', status: 503 };

        const error = LLMError.fromProviderError('anthropic', httpError);

        assertEquals(error.code, 'PROVIDER_UNAVAILABLE');
        assertEquals(error.retryable, true);
      });

      it('should map 5xx to PROVIDER_UNAVAILABLE', () => {
        const httpError = { message: 'Internal error', status: 500 };

        const error = LLMError.fromProviderError('openai', httpError);

        assertEquals(error.code, 'PROVIDER_UNAVAILABLE');
        assertEquals(error.retryable, true);
      });

      it('should extract statusCode from nested response object', () => {
        const httpError = {
          message: 'Error',
          response: { status: 429 },
        };

        const error = LLMError.fromProviderError('openai', httpError);

        assertEquals(error.statusCode, 429);
        assertEquals(error.code, 'RATE_LIMITED');
      });
    });

    describe('timeout error detection', () => {
      it('should detect timeout by error name', () => {
        const timeoutError = new Error('Operation timed out');
        timeoutError.name = 'TimeoutError';

        const error = LLMError.fromProviderError('openai', timeoutError);

        assertEquals(error.code, 'TIMEOUT');
        assertEquals(error.retryable, true);
      });

      it('should detect AbortError as timeout', () => {
        const abortError = new Error('The operation was aborted');
        abortError.name = 'AbortError';

        const error = LLMError.fromProviderError('anthropic', abortError);

        assertEquals(error.code, 'TIMEOUT');
        assertEquals(error.retryable, true);
      });

      it('should detect timeout by message content', () => {
        const timeoutError = new Error('Request timed out after 30s');

        const error = LLMError.fromProviderError('openai', timeoutError);

        assertEquals(error.code, 'TIMEOUT');
        assertEquals(error.retryable, true);
      });
    });

    describe('network error detection', () => {
      it('should detect failed to fetch error', () => {
        const networkError = new TypeError('Failed to fetch');

        const error = LLMError.fromProviderError('openai', networkError);

        assertEquals(error.code, 'PROVIDER_UNAVAILABLE');
        assertEquals(error.retryable, true);
      });

      it('should detect NetworkError', () => {
        const networkError = new TypeError(
          'NetworkError when attempting to fetch resource'
        );

        const error = LLMError.fromProviderError('anthropic', networkError);

        assertEquals(error.code, 'PROVIDER_UNAVAILABLE');
        assertEquals(error.retryable, true);
      });

      it('should detect connection refused', () => {
        const connectionError = new Error('ECONNREFUSED 127.0.0.1:443');

        const error = LLMError.fromProviderError('openai', connectionError);

        assertEquals(error.code, 'PROVIDER_UNAVAILABLE');
        assertEquals(error.retryable, true);
      });

      it('should detect DNS resolution failure', () => {
        const dnsError = new Error('getaddrinfo ENOTFOUND api.openai.com');

        const error = LLMError.fromProviderError('openai', dnsError);

        assertEquals(error.code, 'PROVIDER_UNAVAILABLE');
        assertEquals(error.retryable, true);
      });

      it('should detect connection reset', () => {
        const resetError = new Error('ECONNRESET');

        const error = LLMError.fromProviderError('anthropic', resetError);

        assertEquals(error.code, 'PROVIDER_UNAVAILABLE');
        assertEquals(error.retryable, true);
      });

      it('should detect socket hang up', () => {
        const socketError = new Error('socket hang up');

        const error = LLMError.fromProviderError('openai', socketError);

        assertEquals(error.code, 'PROVIDER_UNAVAILABLE');
        assertEquals(error.retryable, true);
      });

      it('should not treat regular TypeError as network error', () => {
        const typeError = new TypeError(
          'Cannot read property "x" of undefined'
        );

        const error = LLMError.fromProviderError('openai', typeError);

        assertEquals(error.code, 'UNKNOWN');
        assertEquals(error.retryable, false);
      });
    });

    describe('message extraction', () => {
      it('should extract message from Error instance', () => {
        const originalError = new Error('Original error message');

        const error = LLMError.fromProviderError('openai', originalError);

        assertEquals(error.message, 'Original error message');
      });

      it('should extract message from plain object', () => {
        const errorObj = { message: 'Object error message' };

        const error = LLMError.fromProviderError('anthropic', errorObj);

        assertEquals(error.message, 'Object error message');
      });

      it('should extract message from nested error object', () => {
        const errorObj = { error: { message: 'Nested error message' } };

        const error = LLMError.fromProviderError('openai', errorObj);

        assertEquals(error.message, 'Nested error message');
      });

      it('should extract error string from object', () => {
        const errorObj = { error: 'Error as string' };

        const error = LLMError.fromProviderError('gemini', errorObj);

        assertEquals(error.message, 'Error as string');
      });

      it('should stringify unknown error types', () => {
        const error = LLMError.fromProviderError('openai', 'string error');

        assertEquals(error.message, 'string error');
      });
    });

    describe('unknown errors', () => {
      it('should return UNKNOWN for unrecognized errors', () => {
        const unknownError = new Error('Some unknown error');

        const error = LLMError.fromProviderError('openai', unknownError);

        assertEquals(error.code, 'UNKNOWN');
        assertEquals(error.retryable, false);
        assertEquals(error.originalCause, unknownError);
      });
    });
  });
});
