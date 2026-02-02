/**
 * LLM Provider Adapters - Logging Tests
 */

import { assertEquals, assertRejects } from 'jsr:@std/assert@1';
import { afterEach, beforeEach, describe, it } from 'jsr:@std/testing@1/bdd';
import {
  logLLMOperation,
  createTimer,
  withLogging,
} from '../../../../supabase/functions/_shared/llm/logging.ts';

describe('logging', () => {
  describe('logLLMOperation', () => {
    // Store captured log output
    let capturedLogs: string[] = [];
    let capturedErrors: string[] = [];
    let capturedWarns: string[] = [];
    let originalLog: typeof console.log;
    let originalError: typeof console.error;
    let originalWarn: typeof console.warn;

    beforeEach(() => {
      capturedLogs = [];
      capturedErrors = [];
      capturedWarns = [];
      originalLog = console.log;
      originalError = console.error;
      originalWarn = console.warn;
      console.log = (...args: unknown[]) => {
        capturedLogs.push(String(args[0]));
      };
      console.error = (...args: unknown[]) => {
        capturedErrors.push(String(args[0]));
      };
      console.warn = (...args: unknown[]) => {
        capturedWarns.push(String(args[0]));
      };
    });

    afterEach(() => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    });

    it('should log info level to console.log', () => {
      logLLMOperation({
        level: 'info',
        provider: 'openai',
        operation: 'chat.completions.create',
        model: 'gpt-4o',
        success: true,
      });

      assertEquals(capturedLogs.length, 1);
      assertEquals(capturedErrors.length, 0);
      assertEquals(capturedWarns.length, 0);
    });

    it('should log debug level to console.log', () => {
      logLLMOperation({
        level: 'debug',
        provider: 'anthropic',
        operation: 'messages.create',
        success: true,
      });

      assertEquals(capturedLogs.length, 1);
    });

    it('should log error level to console.error', () => {
      logLLMOperation({
        level: 'error',
        provider: 'openai',
        operation: 'chat.completions.create',
        success: false,
        error: 'Rate limit exceeded',
      });

      assertEquals(capturedErrors.length, 1);
      assertEquals(capturedLogs.length, 0);
    });

    it('should log warn level to console.warn', () => {
      logLLMOperation({
        level: 'warn',
        provider: 'gemini',
        operation: 'generateContent',
        success: true,
      });

      assertEquals(capturedWarns.length, 1);
    });

    it('should include timestamp and service in output', () => {
      logLLMOperation({
        level: 'info',
        provider: 'openai',
        operation: 'test',
        success: true,
      });

      const parsed = JSON.parse(capturedLogs[0]);

      assertEquals(parsed.service, 'llm-adapters');
      assertEquals(typeof parsed.timestamp, 'string');
      // Verify ISO format
      assertEquals(new Date(parsed.timestamp).toISOString(), parsed.timestamp);
    });

    it('should include all provided fields', () => {
      logLLMOperation({
        level: 'info',
        provider: 'openai',
        operation: 'chat.completions.create',
        model: 'gpt-4o',
        latencyMs: 1234,
        tokensUsed: 150,
        success: true,
        metadata: { requestId: 'req-123' },
      });

      const parsed = JSON.parse(capturedLogs[0]);

      assertEquals(parsed.provider, 'openai');
      assertEquals(parsed.operation, 'chat.completions.create');
      assertEquals(parsed.model, 'gpt-4o');
      assertEquals(parsed.latencyMs, 1234);
      assertEquals(parsed.tokensUsed, 150);
      assertEquals(parsed.success, true);
      assertEquals(parsed.metadata?.requestId, 'req-123');
    });

    it('should include error fields for failed operations', () => {
      logLLMOperation({
        level: 'error',
        provider: 'anthropic',
        operation: 'messages.create',
        success: false,
        error: 'Content blocked',
        errorCode: 'CONTENT_FILTERED',
      });

      const parsed = JSON.parse(capturedErrors[0]);

      assertEquals(parsed.success, false);
      assertEquals(parsed.error, 'Content blocked');
      assertEquals(parsed.errorCode, 'CONTENT_FILTERED');
    });

    it('should output single-line JSON', () => {
      logLLMOperation({
        level: 'info',
        provider: 'openai',
        operation: 'test',
        success: true,
        metadata: { nested: { value: 'test' } },
      });

      assertEquals(capturedLogs[0].includes('\n'), false);
    });
  });

  describe('createTimer', () => {
    it('should return elapsed time in milliseconds', async () => {
      const timer = createTimer();

      // Wait a small amount of time
      await new Promise((resolve) => setTimeout(resolve, 50));

      const elapsed = timer.elapsed();

      // Should be at least 50ms but less than 200ms (allowing for timing variance)
      assertEquals(elapsed >= 40, true); // Allow some variance
      assertEquals(elapsed < 200, true);
    });

    it('should return rounded integer values', () => {
      const timer = createTimer();
      const elapsed = timer.elapsed();

      assertEquals(Number.isInteger(elapsed), true);
    });

    it('should allow multiple elapsed() calls', async () => {
      const timer = createTimer();

      await new Promise((resolve) => setTimeout(resolve, 20));
      const elapsed1 = timer.elapsed();

      await new Promise((resolve) => setTimeout(resolve, 20));
      const elapsed2 = timer.elapsed();

      assertEquals(elapsed2 > elapsed1, true);
    });
  });

  describe('withLogging', () => {
    let capturedLogs: string[] = [];
    let capturedErrors: string[] = [];
    let originalLog: typeof console.log;
    let originalError: typeof console.error;

    beforeEach(() => {
      capturedLogs = [];
      capturedErrors = [];
      originalLog = console.log;
      originalError = console.error;
      console.log = (...args: unknown[]) => {
        capturedLogs.push(String(args[0]));
      };
      console.error = (...args: unknown[]) => {
        capturedErrors.push(String(args[0]));
      };
    });

    afterEach(() => {
      console.log = originalLog;
      console.error = originalError;
    });

    it('should return the result of the wrapped function', async () => {
      const result = await withLogging('openai', 'test', 'gpt-4o', async () => {
        return { data: 'test result' };
      });

      assertEquals(result, { data: 'test result' });
    });

    it('should log success when function completes', async () => {
      await withLogging(
        'openai',
        'chat.completions.create',
        'gpt-4o',
        async () => {
          return 'success';
        }
      );

      assertEquals(capturedLogs.length, 1);
      assertEquals(capturedErrors.length, 0);

      const parsed = JSON.parse(capturedLogs[0]);

      assertEquals(parsed.level, 'info');
      assertEquals(parsed.provider, 'openai');
      assertEquals(parsed.operation, 'chat.completions.create');
      assertEquals(parsed.model, 'gpt-4o');
      assertEquals(parsed.success, true);
      assertEquals(typeof parsed.latencyMs, 'number');
    });

    it('should log error and rethrow when function throws', async () => {
      const testError = new Error('Test error');

      await assertRejects(
        async () => {
          await withLogging(
            'anthropic',
            'messages.create',
            'claude-sonnet-4-20250514',
            async () => {
              throw testError;
            }
          );
        },
        Error,
        'Test error'
      );

      assertEquals(capturedErrors.length, 1);
      assertEquals(capturedLogs.length, 0);

      const parsed = JSON.parse(capturedErrors[0]);

      assertEquals(parsed.level, 'error');
      assertEquals(parsed.provider, 'anthropic');
      assertEquals(parsed.operation, 'messages.create');
      assertEquals(parsed.model, 'claude-sonnet-4-20250514');
      assertEquals(parsed.success, false);
      assertEquals(parsed.error, 'Test error');
      assertEquals(typeof parsed.latencyMs, 'number');
    });

    it('should work with undefined model', async () => {
      await withLogging('gemini', 'listModels', undefined, async () => {
        return ['model1', 'model2'];
      });

      const parsed = JSON.parse(capturedLogs[0]);

      assertEquals(parsed.model, undefined);
    });

    it('should stringify non-Error thrown values', async () => {
      await assertRejects(async () => {
        await withLogging('openai', 'test', 'gpt-4o', async () => {
          throw 'string error';
        });
      });

      const parsed = JSON.parse(capturedErrors[0]);

      assertEquals(parsed.error, 'string error');
    });

    it('should measure latency correctly', async () => {
      await withLogging('openai', 'test', 'gpt-4o', async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return 'done';
      });

      const parsed = JSON.parse(capturedLogs[0]);

      assertEquals(parsed.latencyMs >= 40, true);
      assertEquals(parsed.latencyMs < 200, true);
    });
  });
});
