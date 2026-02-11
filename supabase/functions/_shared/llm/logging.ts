/**
 * LLM Provider Adapters - Structured Logging
 *
 * Provides structured JSON logging for LLM operations.
 * All logs are output as single-line JSON for easy parsing.
 */

import type { LLMProvider } from './types.ts';

/**
 * Log entry structure for LLM operations.
 */
export interface LLMLogEntry {
  /** ISO timestamp */
  timestamp: string;
  /** Log level */
  level: 'debug' | 'info' | 'warn' | 'error';
  /** Service identifier */
  service: 'llm-adapters';
  /** Provider being used */
  provider: LLMProvider;
  /** Operation name (e.g., 'chat.completions.create') */
  operation: string;
  /** Model being used */
  model?: string;
  /** Operation latency in milliseconds */
  latencyMs?: number;
  /** Token usage (if available) */
  tokensUsed?: number;
  /** Whether operation succeeded */
  success: boolean;
  /** Error message (if failed) */
  error?: string;
  /** Error code (if failed) */
  errorCode?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Logs an LLM operation in structured JSON format.
 *
 * @param entry - Log entry (timestamp and service added automatically)
 *
 * @example
 * ```typescript
 * logLLMOperation({
 *   level: 'info',
 *   provider: 'openai',
 *   operation: 'chat.completions.create',
 *   model: 'gpt-4o',
 *   latencyMs: 1234,
 *   tokensUsed: 150,
 *   success: true,
 * });
 * ```
 */
export function logLLMOperation(
  entry: Omit<LLMLogEntry, 'timestamp' | 'service'>
): void {
  const logEntry: LLMLogEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
    service: 'llm-adapters',
  };

  const json = JSON.stringify(logEntry);

  if (entry.level === 'error') {
    console.error(json);
  } else if (entry.level === 'warn') {
    console.warn(json);
  } else {
    console.log(json);
  }
}

/**
 * Creates a timer for measuring operation latency.
 *
 * @returns Object with `elapsed()` method returning milliseconds since creation
 *
 * @example
 * ```typescript
 * const timer = createTimer();
 * await someOperation();
 * logLLMOperation({ ..., latencyMs: timer.elapsed() });
 * ```
 */
export function createTimer(): { elapsed: () => number } {
  const start = performance.now();
  return {
    elapsed: () => Math.round(performance.now() - start),
  };
}

/**
 * Wraps an async operation with automatic logging.
 *
 * @param provider - LLM provider
 * @param operation - Operation name
 * @param model - Model being used
 * @param fn - Async function to execute
 * @returns Result of the function
 *
 * @example
 * ```typescript
 * const result = await withLogging('openai', 'chat.completions.create', 'gpt-4o', async () => {
 *   return await openai.chat.completions.create({ ... });
 * });
 * ```
 */
export async function withLogging<T>(
  provider: LLMProvider,
  operation: string,
  model: string | undefined,
  fn: () => Promise<T>
): Promise<T> {
  const timer = createTimer();

  try {
    const result = await fn();

    logLLMOperation({
      level: 'info',
      provider,
      operation,
      model,
      latencyMs: timer.elapsed(),
      success: true,
    });

    return result;
  } catch (error) {
    logLLMOperation({
      level: 'error',
      provider,
      operation,
      model,
      latencyMs: timer.elapsed(),
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });

    throw error;
  }
}
