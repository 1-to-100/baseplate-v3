/**
 * LLM Provider Adapters - Credentials Utility
 *
 * Fetches provider credentials from Deno environment variables.
 * Throws LLMError if required credentials are missing or invalid.
 */

import type { LLMProvider } from './types.ts';
import { LLMError } from './errors.ts';

/**
 * Provider credentials structure.
 */
export interface ProviderCredentials {
  /** API key for the provider (required) */
  apiKey: string;
  /** Organization ID (optional, OpenAI) */
  organizationId?: string;
  /** Webhook signing secret (optional) */
  webhookSecret?: string;
}

/**
 * Environment variable mapping per provider.
 */
const ENV_VAR_MAP: Record<
  LLMProvider,
  { apiKey: string; orgId?: string; webhookSecret?: string; keyPrefix?: string }
> = {
  openai: {
    apiKey: 'OPENAI_API_KEY',
    orgId: 'OPENAI_ORG_ID',
    webhookSecret: 'OPENAI_WEBHOOK_SECRET',
    keyPrefix: 'sk-',
  },
  anthropic: {
    apiKey: 'ANTHROPIC_API_KEY',
    keyPrefix: 'sk-ant-',
  },
  gemini: {
    apiKey: 'GEMINI_API_KEY',
    // Gemini keys don't have a standard prefix
  },
};

/**
 * Fetches credentials for a provider from Deno environment variables.
 *
 * @param provider - The LLM provider to get credentials for
 * @returns Provider credentials
 * @throws LLMError if required API key is missing or invalid format
 *
 * @example
 * ```typescript
 * const credentials = getCredentials('openai');
 * // credentials.apiKey is guaranteed to exist and have valid format
 * ```
 */
export function getCredentials(provider: LLMProvider): ProviderCredentials {
  const envVars = ENV_VAR_MAP[provider];

  const apiKey = Deno.env.get(envVars.apiKey);
  if (!apiKey) {
    // Don't expose env var names in error messages for security
    throw new LLMError(
      `Missing API key for provider: ${provider}`,
      'AUTHENTICATION_FAILED',
      provider
    );
  }

  // Validate API key format if prefix is defined
  if (envVars.keyPrefix && !apiKey.startsWith(envVars.keyPrefix)) {
    throw new LLMError(
      `Invalid API key format for provider: ${provider}`,
      'AUTHENTICATION_FAILED',
      provider
    );
  }

  return {
    apiKey,
    organizationId: envVars.orgId ? Deno.env.get(envVars.orgId) : undefined,
    webhookSecret: envVars.webhookSecret
      ? Deno.env.get(envVars.webhookSecret)
      : undefined,
  };
}

/**
 * Checks if credentials are available for a provider without throwing.
 *
 * @param provider - The LLM provider to check
 * @returns true if API key exists in environment
 */
export function hasCredentials(provider: LLMProvider): boolean {
  const envVars = ENV_VAR_MAP[provider];
  return !!Deno.env.get(envVars.apiKey);
}

/**
 * Validates API key format for a provider without fetching.
 *
 * @param provider - The LLM provider
 * @param apiKey - The API key to validate
 * @returns true if API key has valid format
 */
export function isValidKeyFormat(provider: LLMProvider, apiKey: string): boolean {
  const envVars = ENV_VAR_MAP[provider];
  if (!envVars.keyPrefix) {
    // No prefix validation for this provider
    return apiKey.length > 0;
  }
  return apiKey.startsWith(envVars.keyPrefix);
}
