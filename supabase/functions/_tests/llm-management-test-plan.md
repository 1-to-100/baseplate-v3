# LLM Management Edge Functions - Test Plan

This document outlines the comprehensive testing strategy for the LLM management Edge Functions in the Baseplate application.

## Overview

The LLM management system consists of four Edge Functions:

1. **llm-query** - Handles LLM query submissions
2. **llm-worker** - Processes LLM jobs in the background
3. **llm-webhook** - Receives callbacks from LLM providers
4. **llm-cancel** - Cancels pending/processing jobs

## Test Files

| File | Description |
|------|-------------|
| `test-utils.ts` | Shared test utilities, mocks, and factories |
| `llm-query.test.ts` | Tests for query submission endpoint |
| `llm-worker.test.ts` | Tests for background job processor |
| `llm-webhook.test.ts` | Tests for webhook receiver |
| `llm-cancel.test.ts` | Tests for job cancellation |

## Running Tests

```bash
# Run all LLM management tests
deno test --allow-env --allow-net supabase/functions/_tests/llm-*.test.ts

# Run specific test file
deno test --allow-env --allow-net supabase/functions/_tests/llm-query.test.ts

# Run with verbose output
deno test --allow-env --allow-net --reporter=verbose supabase/functions/_tests/llm-*.test.ts

# Run specific test by name
deno test --allow-env --allow-net --filter "should reject request without auth" supabase/functions/_tests/
```

## Test Categories

### Critical Priority (P0)

These tests cover core functionality that must work correctly:

#### llm-query
- [ ] Authentication - reject unauthenticated requests
- [ ] Authentication - accept valid tokens
- [ ] Validation - reject invalid provider
- [ ] Validation - reject missing required fields
- [ ] Job Creation - create job with pending status
- [ ] Authorization - user can only create jobs for own customer

#### llm-worker
- [ ] Job Claiming - claim pending jobs atomically
- [ ] Provider Execution - call OpenAI API correctly
- [ ] Provider Execution - call Anthropic API correctly
- [ ] Provider Execution - call Google AI API correctly
- [ ] Status Updates - mark job completed on success
- [ ] Status Updates - mark job failed on error

#### llm-webhook
- [ ] Signature Validation - reject invalid signatures
- [ ] Signature Validation - accept valid signatures
- [ ] Idempotency - handle duplicate webhooks
- [ ] Payload Processing - extract result from OpenAI
- [ ] Payload Processing - extract result from Anthropic
- [ ] Payload Processing - extract result from Google

#### llm-cancel
- [ ] Authorization - user can cancel own jobs
- [ ] Authorization - reject cancelling others' jobs
- [ ] State Validation - allow cancelling pending jobs
- [ ] State Validation - reject cancelling completed jobs
- [ ] Cancellation - update status to cancelled

### High Priority (P1)

Important tests for reliability and security:

#### llm-query
- [ ] Rate Limiting - enforce per-minute limits
- [ ] Rate Limiting - return 429 with Retry-After
- [ ] Validation - reject prompt exceeding max length
- [ ] Idempotency - return existing job for duplicate key
- [ ] CORS - handle OPTIONS preflight

#### llm-worker
- [ ] Retry Logic - retry on transient errors
- [ ] Retry Logic - use exponential backoff
- [ ] Retry Logic - fail after max retries
- [ ] Concurrent Claims - handle race conditions
- [ ] Error Handling - handle network timeouts

#### llm-webhook
- [ ] Provider Detection - detect OpenAI from headers
- [ ] Provider Detection - detect Anthropic from payload
- [ ] Guard Clauses - reject non-POST requests
- [ ] Guard Clauses - reject invalid Content-Type
- [ ] Timestamp Validation - reject stale webhooks

#### llm-cancel
- [ ] Batch Cancellation - cancel multiple jobs
- [ ] Provider Cancellation - attempt provider API call
- [ ] Audit Logging - log cancellation events
- [ ] Error Handling - handle database errors

### Medium Priority (P2)

Tests for edge cases and optimization:

#### llm-query
- [ ] Validation - validate optional parameters (temperature, max_tokens)
- [ ] Provider Validation - check API key is configured
- [ ] Webhook Configuration - include webhook URL in job metadata

#### llm-worker
- [ ] Batch Processing - process multiple jobs in parallel
- [ ] Priority Queue - prioritize by customer tier
- [ ] Health Monitoring - report worker status
- [ ] Graceful Shutdown - complete in-progress jobs

#### llm-webhook
- [ ] Provider-Specific - handle function call responses
- [ ] Provider-Specific - handle tool use responses
- [ ] Provider-Specific - handle safety filter blocks
- [ ] Token Usage - extract and store usage metrics

#### llm-cancel
- [ ] Rate Limiting - rate limit cancellation requests
- [ ] Batch Limits - enforce maximum batch size
- [ ] Partial Success - return results for batch operations

## Test Utilities

The `test-utils.ts` file provides:

### Mock Factories

```typescript
// Create mock users with different roles
createMockUser()        // Standard user
createSystemAdmin()     // System administrator
createCustomerAdmin()   // Customer administrator

// Create mock jobs
createMockLLMJob({
  status: "pending",
  provider: "openai",
  // ...other overrides
})
```

### Mock Supabase Client

```typescript
const mockSupabase = createMockSupabaseClient()

// Set auth response
mockSupabase.auth._setUserResponse({
  data: { user: mockUser },
  error: null,
})

// Set query response
mockSupabase._setQueryResponse("llm_jobs", {
  data: mockJob,
  error: null,
})
```

### Mock Fetch

```typescript
const fetchMock = createFetchMock()

// Mock API responses
fetchMock.mock(
  "api.openai.com",
  new Response(JSON.stringify(response), { status: 200 })
)

// Check calls
assertEquals(fetchMock.calls.length, 1)

// Clean up
fetchMock.restore()
```

### Mock Environment Variables

```typescript
const envMock = createEnvMock({
  OPENAI_API_KEY: "test-key",
  // ...other env vars
})

// Use in tests
assertEquals(envMock.get("OPENAI_API_KEY"), "test-key")

// Clean up
envMock.reset()
```

### Webhook Payloads

```typescript
// Create provider-specific payloads
const openaiPayload = createOpenAIWebhookPayload("job-123", "Response content")
const anthropicPayload = createAnthropicWebhookPayload("job-123", "Response content")
const googlePayload = createGoogleWebhookPayload("job-123", "Response content")

// Create signed request
const signedRequest = await createSignedWebhookRequest(payload, secret)
```

## Coverage Targets

| Area | Target | Rationale |
|------|--------|-----------|
| Authentication | 100% | Security critical |
| Authorization | 100% | Security critical |
| Input Validation | 95% | Prevent bad data |
| Happy Path | 100% | Core functionality |
| Error Handling | 90% | Reliability |
| Edge Cases | 80% | Robustness |
| Integration Points | 85% | External dependencies |

## Test Data Requirements

### Users
- System administrator (no customer_id, system_admin role)
- Customer administrator (customer_id, customer_admin role)
- Standard user (customer_id, standard_user role)
- User without LLM access permission

### Jobs
- Pending job
- Processing job
- Completed job with result
- Failed job with error
- Cancelled job
- Job with idempotency key
- Job with external_id

### Providers
- OpenAI (gpt-4, gpt-3.5-turbo)
- Anthropic (claude-3-opus, claude-3-sonnet)
- Google (gemini-pro, gemini-ultra)

## Error Scenarios to Test

### HTTP Status Codes

| Code | Scenario |
|------|----------|
| 400 | Invalid request body, missing fields, validation errors |
| 401 | Missing/invalid/expired auth token |
| 403 | Unauthorized action (wrong customer, missing permission) |
| 404 | Job not found |
| 409 | Job in invalid state for operation |
| 429 | Rate limit exceeded |
| 500 | Internal server error, database error |

### Provider Errors

| Provider | Error Type | Expected Behavior |
|----------|-----------|-------------------|
| OpenAI | 429 Rate limit | Retry with backoff |
| OpenAI | 500 Server error | Retry with backoff |
| OpenAI | 401 Invalid key | Fail immediately |
| Anthropic | 529 Overloaded | Retry with backoff |
| Anthropic | 400 Bad request | Fail immediately |
| Google | 429 Quota exceeded | Retry with backoff |
| Google | 403 Permission denied | Fail immediately |

## Security Testing

### Authentication
- Verify JWT signature validation
- Test expired token rejection
- Test malformed token handling
- Verify user lookup in database

### Authorization
- Role-based access control (RBAC)
- Customer isolation (multi-tenancy)
- Job ownership verification
- Permission checks

### Webhook Security
- HMAC signature validation
- Timestamp validation (replay attack prevention)
- IP whitelist verification (optional)
- Rate limiting on webhook endpoint

## Performance Testing

While unit tests focus on correctness, consider:

- Job claiming under concurrent load
- Webhook processing throughput
- Rate limiter accuracy under load
- Database query efficiency

## Maintenance Notes

### When to Update Tests

1. **New provider added** - Add provider-specific tests
2. **API contract changes** - Update request/response tests
3. **Security requirements change** - Update auth/authz tests
4. **New error codes** - Add error handling tests

### Test Flakiness Prevention

- Use deterministic mock data
- Avoid time-dependent tests
- Reset mocks between tests
- Use test-specific IDs to avoid collisions

### Mock Updates

When external APIs change:
1. Update webhook payload factories
2. Update provider response mocks
3. Update error response mocks
4. Update signature generation
