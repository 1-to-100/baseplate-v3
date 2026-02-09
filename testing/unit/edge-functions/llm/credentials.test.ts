/**
 * LLM Provider Adapters - Credentials Tests
 */

import { assertEquals, assertThrows } from 'jsr:@std/assert@1';
import { afterEach, describe, it } from 'jsr:@std/testing@1/bdd';
import {
  getCredentials,
  hasCredentials,
  isValidKeyFormat,
} from '../../../../supabase/functions/_shared/llm/credentials.ts';
import { LLMError } from '../../../../supabase/functions/_shared/llm/errors.ts';

describe('credentials', () => {
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
    // Restore original env values
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) {
        Deno.env.delete(key);
      } else {
        Deno.env.set(key, value);
      }
    }
  });

  describe('getCredentials', () => {
    describe('OpenAI', () => {
      it('should return credentials when API key is set with valid format', () => {
        setEnv('OPENAI_API_KEY', 'sk-test-key-123');

        const creds = getCredentials('openai');

        assertEquals(creds.apiKey, 'sk-test-key-123');
        assertEquals(creds.organizationId, undefined);
      });

      it('should include organization ID when set', () => {
        setEnv('OPENAI_API_KEY', 'sk-test-key');
        setEnv('OPENAI_ORG_ID', 'org-123');

        const creds = getCredentials('openai');

        assertEquals(creds.organizationId, 'org-123');
      });

      it('should include webhook secret when set', () => {
        setEnv('OPENAI_API_KEY', 'sk-test-key');
        setEnv('OPENAI_WEBHOOK_SECRET', 'whsec-123');

        const creds = getCredentials('openai');

        assertEquals(creds.webhookSecret, 'whsec-123');
      });

      it('should throw LLMError when API key is missing', () => {
        deleteEnv('OPENAI_API_KEY');

        const error = assertThrows(() => getCredentials('openai'), LLMError);
        assertEquals(error.code, 'AUTHENTICATION_FAILED');
        assertEquals(error.provider, 'openai');
        assertEquals(error.message, 'Missing API key for provider: openai');
      });

      it('should throw LLMError when API key has invalid format', () => {
        setEnv('OPENAI_API_KEY', 'invalid-key-without-sk-prefix');

        const error = assertThrows(() => getCredentials('openai'), LLMError);
        assertEquals(error.code, 'AUTHENTICATION_FAILED');
        assertEquals(error.provider, 'openai');
        assertEquals(
          error.message,
          'Invalid API key format for provider: openai'
        );
      });
    });

    describe('Anthropic', () => {
      it('should return credentials when API key is set with valid format', () => {
        setEnv('ANTHROPIC_API_KEY', 'sk-ant-test-key-123');

        const creds = getCredentials('anthropic');

        assertEquals(creds.apiKey, 'sk-ant-test-key-123');
        assertEquals(creds.organizationId, undefined);
        assertEquals(creds.webhookSecret, undefined);
      });

      it('should throw LLMError when API key is missing', () => {
        deleteEnv('ANTHROPIC_API_KEY');

        const error = assertThrows(
          () => getCredentials('anthropic'),
          LLMError
        );
        assertEquals(error.code, 'AUTHENTICATION_FAILED');
        assertEquals(error.provider, 'anthropic');
      });

      it('should throw LLMError when API key has invalid format', () => {
        setEnv('ANTHROPIC_API_KEY', 'sk-invalid-without-ant');

        const error = assertThrows(
          () => getCredentials('anthropic'),
          LLMError
        );
        assertEquals(error.code, 'AUTHENTICATION_FAILED');
        assertEquals(error.provider, 'anthropic');
      });
    });

    describe('Gemini', () => {
      it('should return credentials when API key is set (no prefix validation)', () => {
        setEnv('GEMINI_API_KEY', 'AIza-any-format-key');

        const creds = getCredentials('gemini');

        assertEquals(creds.apiKey, 'AIza-any-format-key');
      });

      it('should throw LLMError when API key is missing', () => {
        deleteEnv('GEMINI_API_KEY');

        const error = assertThrows(() => getCredentials('gemini'), LLMError);
        assertEquals(error.code, 'AUTHENTICATION_FAILED');
        assertEquals(error.provider, 'gemini');
      });
    });
  });

  describe('hasCredentials', () => {
    it('should return true when OpenAI API key exists', () => {
      setEnv('OPENAI_API_KEY', 'sk-test');

      assertEquals(hasCredentials('openai'), true);
    });

    it('should return false when OpenAI API key is missing', () => {
      deleteEnv('OPENAI_API_KEY');

      assertEquals(hasCredentials('openai'), false);
    });

    it('should return true when Anthropic API key exists', () => {
      setEnv('ANTHROPIC_API_KEY', 'sk-ant-test');

      assertEquals(hasCredentials('anthropic'), true);
    });

    it('should return false when Anthropic API key is missing', () => {
      deleteEnv('ANTHROPIC_API_KEY');

      assertEquals(hasCredentials('anthropic'), false);
    });

    it('should return true when Gemini API key exists', () => {
      setEnv('GEMINI_API_KEY', 'test-key');

      assertEquals(hasCredentials('gemini'), true);
    });

    it('should return false when Gemini API key is missing', () => {
      deleteEnv('GEMINI_API_KEY');

      assertEquals(hasCredentials('gemini'), false);
    });
  });

  describe('isValidKeyFormat', () => {
    describe('OpenAI', () => {
      it('should return true for keys starting with sk-', () => {
        assertEquals(isValidKeyFormat('openai', 'sk-test-key'), true);
        assertEquals(isValidKeyFormat('openai', 'sk-proj-abc123'), true);
      });

      it('should return false for keys not starting with sk-', () => {
        assertEquals(isValidKeyFormat('openai', 'invalid-key'), false);
        assertEquals(isValidKeyFormat('openai', 'pk-test'), false);
      });
    });

    describe('Anthropic', () => {
      it('should return true for keys starting with sk-ant-', () => {
        assertEquals(isValidKeyFormat('anthropic', 'sk-ant-test-key'), true);
        assertEquals(isValidKeyFormat('anthropic', 'sk-ant-api03-xyz'), true);
      });

      it('should return false for keys not starting with sk-ant-', () => {
        assertEquals(isValidKeyFormat('anthropic', 'sk-test'), false);
        assertEquals(isValidKeyFormat('anthropic', 'ant-key'), false);
      });
    });

    describe('Gemini', () => {
      it('should return true for any non-empty key (no prefix requirement)', () => {
        assertEquals(isValidKeyFormat('gemini', 'AIzaSy-test'), true);
        assertEquals(isValidKeyFormat('gemini', 'any-format'), true);
      });

      it('should return false for empty key', () => {
        assertEquals(isValidKeyFormat('gemini', ''), false);
      });
    });
  });
});
