/**
 * LLM Provider Adapters - Adapter Tests
 *
 * Tests for adapter initialization, singleton behavior, and error handling.
 * Note: These tests use mock credentials and don't make actual API calls.
 */

import { assertEquals, assertThrows } from 'jsr:@std/assert@1';
import { afterEach, describe, it } from 'jsr:@std/testing@1/bdd';
import { providers } from '../../../../supabase/functions/_shared/llm/adapters/index.ts';
import { LLMError } from '../../../../supabase/functions/_shared/llm/errors.ts';
import { resetAllAdapters } from '../../../../supabase/functions/_shared/llm/testing.ts';

describe('adapters', () => {
  // Store original env values for cleanup
  const originalEnv: Record<string, string | undefined> = {};

  function setEnv(key: string, value: string): void {
    if (!(key in originalEnv)) {
      originalEnv[key] = Deno.env.get(key);
    }
    Deno.env.set(key, value);
  }

  function deleteEnv(key: string): void {
    if (!(key in originalEnv)) {
      originalEnv[key] = Deno.env.get(key);
    }
    Deno.env.delete(key);
  }

  afterEach(() => {
    // Reset all adapter singletons between tests
    resetAllAdapters();

    // Restore original env values
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) {
        Deno.env.delete(key);
      } else {
        Deno.env.set(key, value);
      }
    }
  });

  describe('OpenAI adapter', () => {
    it('should throw LLMError when API key is missing', () => {
      deleteEnv('OPENAI_API_KEY');

      const error = assertThrows(() => providers.openai(), LLMError);

      assertEquals(error.code, 'AUTHENTICATION_FAILED');
      assertEquals(error.provider, 'openai');
    });

    it('should throw LLMError when API key has invalid format', () => {
      setEnv('OPENAI_API_KEY', 'invalid-key-format');

      const error = assertThrows(() => providers.openai(), LLMError);

      assertEquals(error.code, 'AUTHENTICATION_FAILED');
      assertEquals(error.provider, 'openai');
    });

    it('should create client when valid API key is provided', () => {
      setEnv('OPENAI_API_KEY', 'sk-test-key-123456');

      const client = providers.openai();

      // Client should be created (type check)
      assertEquals(typeof client, 'object');
      assertEquals(client !== null, true);
    });

    it('should return same instance (singleton)', () => {
      setEnv('OPENAI_API_KEY', 'sk-test-key-123456');

      const client1 = providers.openai();
      const client2 = providers.openai();

      assertEquals(client1 === client2, true);
    });

    it('should create new instance after reset', () => {
      setEnv('OPENAI_API_KEY', 'sk-test-key-123456');

      const client1 = providers.openai();
      resetAllAdapters();
      const client2 = providers.openai();

      assertEquals(client1 === client2, false);
    });
  });

  describe('Anthropic adapter', () => {
    it('should throw LLMError when API key is missing', () => {
      deleteEnv('ANTHROPIC_API_KEY');

      const error = assertThrows(() => providers.anthropic(), LLMError);

      assertEquals(error.code, 'AUTHENTICATION_FAILED');
      assertEquals(error.provider, 'anthropic');
    });

    it('should throw LLMError when API key has invalid format', () => {
      setEnv('ANTHROPIC_API_KEY', 'sk-invalid-without-ant');

      const error = assertThrows(() => providers.anthropic(), LLMError);

      assertEquals(error.code, 'AUTHENTICATION_FAILED');
      assertEquals(error.provider, 'anthropic');
    });

    it('should create client when valid API key is provided', () => {
      setEnv('ANTHROPIC_API_KEY', 'sk-ant-test-key-123456');

      const client = providers.anthropic();

      assertEquals(typeof client, 'object');
      assertEquals(client !== null, true);
    });

    it('should return same instance (singleton)', () => {
      setEnv('ANTHROPIC_API_KEY', 'sk-ant-test-key-123456');

      const client1 = providers.anthropic();
      const client2 = providers.anthropic();

      assertEquals(client1 === client2, true);
    });

    it('should create new instance after reset', () => {
      setEnv('ANTHROPIC_API_KEY', 'sk-ant-test-key-123456');

      const client1 = providers.anthropic();
      resetAllAdapters();
      const client2 = providers.anthropic();

      assertEquals(client1 === client2, false);
    });
  });

  describe('Gemini adapter', () => {
    it('should throw LLMError when API key is missing', () => {
      deleteEnv('GEMINI_API_KEY');

      const error = assertThrows(() => providers.gemini(), LLMError);

      assertEquals(error.code, 'AUTHENTICATION_FAILED');
      assertEquals(error.provider, 'gemini');
    });

    it('should create client when API key is provided (no format validation)', () => {
      setEnv('GEMINI_API_KEY', 'any-format-key');

      const client = providers.gemini();

      assertEquals(typeof client, 'object');
      assertEquals(client !== null, true);
    });

    it('should return same instance (singleton)', () => {
      setEnv('GEMINI_API_KEY', 'test-key');

      const client1 = providers.gemini();
      const client2 = providers.gemini();

      assertEquals(client1 === client2, true);
    });

    it('should create new instance after reset', () => {
      setEnv('GEMINI_API_KEY', 'test-key');

      const client1 = providers.gemini();
      resetAllAdapters();
      const client2 = providers.gemini();

      assertEquals(client1 === client2, false);
    });
  });

  describe('providers registry', () => {
    it('should have all three providers', () => {
      assertEquals(typeof providers.openai, 'function');
      assertEquals(typeof providers.anthropic, 'function');
      assertEquals(typeof providers.gemini, 'function');
    });

    it('should expose factory functions', () => {
      assertEquals(providers.openai.name, 'createOpenAIAdapter');
      assertEquals(providers.anthropic.name, 'createAnthropicAdapter');
      assertEquals(providers.gemini.name, 'createGeminiAdapter');
    });
  });
});
