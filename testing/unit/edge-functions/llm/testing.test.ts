/**
 * LLM Provider Adapters - Testing Utilities Tests
 */

import { assertEquals } from 'jsr:@std/assert@1';
import { afterEach, describe, it } from 'jsr:@std/testing@1/bdd';
import {
  resetAllAdapters,
  resetOpenAIAdapter,
  resetAnthropicAdapter,
  resetGeminiAdapter,
} from '../../../../supabase/functions/_shared/llm/testing.ts';
import { providers } from '../../../../supabase/functions/_shared/llm/adapters/index.ts';

describe('testing utilities', () => {
  // Store original env values for cleanup
  const originalEnv: Record<string, string | undefined> = {};

  function setEnv(key: string, value: string): void {
    if (!(key in originalEnv)) {
      originalEnv[key] = Deno.env.get(key);
    }
    Deno.env.set(key, value);
  }

  afterEach(() => {
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

  describe('resetAllAdapters', () => {
    it('should reset all adapter singletons', () => {
      // Set up all provider keys
      setEnv('OPENAI_API_KEY', 'sk-test');
      setEnv('ANTHROPIC_API_KEY', 'sk-ant-test');
      setEnv('GEMINI_API_KEY', 'test-key');

      // Create clients
      const openai1 = providers.openai();
      const anthropic1 = providers.anthropic();
      const gemini1 = providers.gemini();

      // Reset all
      resetAllAdapters();

      // Create new clients
      const openai2 = providers.openai();
      const anthropic2 = providers.anthropic();
      const gemini2 = providers.gemini();

      // All should be new instances
      assertEquals(openai1 === openai2, false);
      assertEquals(anthropic1 === anthropic2, false);
      assertEquals(gemini1 === gemini2, false);
    });

    it('should be safe to call multiple times', () => {
      resetAllAdapters();
      resetAllAdapters();
      resetAllAdapters();
      // No error should occur
    });
  });

  describe('resetOpenAIAdapter', () => {
    it('should only reset OpenAI singleton', () => {
      setEnv('OPENAI_API_KEY', 'sk-test');
      setEnv('ANTHROPIC_API_KEY', 'sk-ant-test');

      const openai1 = providers.openai();
      const anthropic1 = providers.anthropic();

      resetOpenAIAdapter();

      const openai2 = providers.openai();
      const anthropic2 = providers.anthropic();

      // OpenAI should be new
      assertEquals(openai1 === openai2, false);
      // Anthropic should be same
      assertEquals(anthropic1 === anthropic2, true);
    });
  });

  describe('resetAnthropicAdapter', () => {
    it('should only reset Anthropic singleton', () => {
      setEnv('OPENAI_API_KEY', 'sk-test');
      setEnv('ANTHROPIC_API_KEY', 'sk-ant-test');

      const openai1 = providers.openai();
      const anthropic1 = providers.anthropic();

      resetAnthropicAdapter();

      const openai2 = providers.openai();
      const anthropic2 = providers.anthropic();

      // OpenAI should be same
      assertEquals(openai1 === openai2, true);
      // Anthropic should be new
      assertEquals(anthropic1 === anthropic2, false);
    });
  });

  describe('resetGeminiAdapter', () => {
    it('should only reset Gemini singleton', () => {
      setEnv('GEMINI_API_KEY', 'test-key');
      setEnv('ANTHROPIC_API_KEY', 'sk-ant-test');

      const gemini1 = providers.gemini();
      const anthropic1 = providers.anthropic();

      resetGeminiAdapter();

      const gemini2 = providers.gemini();
      const anthropic2 = providers.anthropic();

      // Gemini should be new
      assertEquals(gemini1 === gemini2, false);
      // Anthropic should be same
      assertEquals(anthropic1 === anthropic2, true);
    });
  });
});
