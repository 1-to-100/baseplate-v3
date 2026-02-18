/**
 * Behavioral Tests for LLM Notifications Utility
 *
 * Tests cover:
 * - Notification creation (DB insert)
 * - Realtime broadcasting (notification + unread count)
 * - Error handling (non-blocking)
 * - Feature slug formatting
 *
 * Run with: deno test --allow-env --allow-net --allow-read supabase/functions/_tests/llm-notifications.test.ts
 */

import {
  assertEquals,
  assertExists,
  assertStringIncludes,
} from "https://deno.land/std@0.208.0/assert/mod.ts";

import {
  createLLMNotification,
  notifyJobStarted,
  notifyJobCompleted,
  notifyJobFailed,
  type LLMNotificationInput,
} from "../_shared/llm-notifications.ts";

// ============================================================================
// Test Utilities
// ============================================================================

interface MockCalls {
  // deno-lint-ignore no-explicit-any
  inserts: Array<{ table: string; data: any }>;
  // deno-lint-ignore no-explicit-any
  channelSends: Array<{ name: string; msg: any }>;
  subscribes: string[];
  unsubscribes: string[];
  // deno-lint-ignore no-explicit-any
  selects: Array<{ table: string }>;
}

/**
 * Create mock Supabase client for notification tests.
 * Simulates: from().insert(), from().select(), channel().subscribe/send/unsubscribe
 */
function createMockNotificationSupabase(options: {
  insertError?: string;
  countResult?: number;
  subscribeStatus?: string;
  sendResult?: string;
} = {}) {
  const {
    insertError,
    countResult = 5,
    subscribeStatus = "SUBSCRIBED",
    sendResult = "ok",
  } = options;

  const calls: MockCalls = {
    inserts: [],
    channelSends: [],
    subscribes: [],
    unsubscribes: [],
    selects: [],
  };

  const client = {
    from: (table: string) => ({
      insert: (data: unknown) => {
        calls.inserts.push({ table, data });
        if (insertError) {
          return { error: { message: insertError } };
        }
        return { error: null };
      },
      select: (_col: string, _opts?: unknown) => {
        calls.selects.push({ table });
        return {
          eq: () => ({
            is: () => Promise.resolve({ count: countResult, error: null }),
          }),
        };
      },
    }),
    channel: (name: string) => ({
      subscribe: (cb: (status: string) => void) => {
        calls.subscribes.push(name);
        // Simulate async subscription
        setTimeout(() => cb(subscribeStatus), 0);
        return { unsubscribe: () => {} };
      },
      send: (msg: unknown) => {
        calls.channelSends.push({ name, msg });
        return Promise.resolve(sendResult);
      },
      unsubscribe: () => {
        calls.unsubscribes.push(name);
        return Promise.resolve("ok");
      },
    }),
  };

  return { client, calls };
}

const baseInput: LLMNotificationInput = {
  jobId: "job-123",
  userId: "user-456",
  customerId: "cust-789",
  featureSlug: "extract-colors",
};

// ============================================================================
// Section 1: Notification Creation Tests
// ============================================================================

Deno.test("createLLMNotification: DB Insert", async (t) => {
  await t.step("inserts notification to database", async () => {
    const { client, calls } = createMockNotificationSupabase();

    await createLLMNotification(client, "job_started", baseInput);

    // Allow broadcasts to complete
    await new Promise((r) => setTimeout(r, 50));

    assertEquals(calls.inserts.length, 1);
    assertEquals(calls.inserts[0].table, "notifications");

    const insertedData = calls.inserts[0].data;
    assertEquals(insertedData.user_id, "user-456");
    assertEquals(insertedData.customer_id, "cust-789");
    assertEquals(insertedData.channel, "llm");
    assertEquals(insertedData.generated_by, "llm-system");
    assertEquals(insertedData.title, "AI Processing Started");
    assertStringIncludes(insertedData.message, "Extract Colors");
    assertEquals(insertedData.metadata.job_id, "job-123");
    assertEquals(insertedData.metadata.feature_slug, "extract-colors");
    assertEquals(insertedData.metadata.notification_type, "job_started");
  });
});

Deno.test("createLLMNotification: Broadcast", async (t) => {
  await t.step("broadcasts notification and unread count", async () => {
    const { client, calls } = createMockNotificationSupabase();

    await createLLMNotification(client, "job_completed", baseInput);

    // Allow async broadcasts to complete
    await new Promise((r) => setTimeout(r, 100));

    // Should have subscribed to both channels
    const mainChannel = calls.subscribes.find((n) =>
      n.startsWith("main-notifications:")
    );
    const unreadChannel = calls.subscribes.find((n) =>
      n.startsWith("unread-notifications:")
    );
    assertExists(mainChannel);
    assertExists(unreadChannel);

    // Should have sent on both channels
    const mainSend = calls.channelSends.find((s) =>
      s.name.startsWith("main-notifications:")
    );
    const unreadSend = calls.channelSends.find((s) =>
      s.name.startsWith("unread-notifications:")
    );
    assertExists(mainSend);
    assertExists(unreadSend);

    // Verify broadcast content
    // deno-lint-ignore no-explicit-any
    assertEquals((mainSend!.msg as any).event, "new");
    // deno-lint-ignore no-explicit-any
    assertEquals((unreadSend!.msg as any).event, "unread_count");
  });
});

// ============================================================================
// Section 2: Error Handling (Non-Blocking)
// ============================================================================

Deno.test("createLLMNotification: Error Handling", async (t) => {
  await t.step("DB insert error is non-blocking", async () => {
    const { client } = createMockNotificationSupabase({
      insertError: "duplicate key violation",
    });

    // Should not throw
    await createLLMNotification(client, "job_started", baseInput);
  });

  await t.step("broadcast error is non-blocking", async () => {
    const { client } = createMockNotificationSupabase({
      sendResult: "error",
    });

    // Should not throw even when broadcast fails
    await createLLMNotification(client, "job_completed", baseInput);

    // Allow async broadcasts to complete
    await new Promise((r) => setTimeout(r, 100));
  });
});

// ============================================================================
// Section 3: Feature Slug Formatting & Templates
// ============================================================================

Deno.test("createLLMNotification: Template Formatting", async (t) => {
  await t.step("formats feature slug in notification message", async () => {
    const { client, calls } = createMockNotificationSupabase();

    await createLLMNotification(client, "job_started", {
      ...baseInput,
      featureSlug: "extract-colors",
    });

    assertStringIncludes(calls.inserts[0].data.message, "Extract Colors");
  });

  await t.step("handles null feature slug gracefully", async () => {
    const { client, calls } = createMockNotificationSupabase();

    await createLLMNotification(client, "job_started", {
      ...baseInput,
      featureSlug: null,
    });

    assertStringIncludes(calls.inserts[0].data.message, "AI request");
  });

  await t.step("includes error message in failure notifications", async () => {
    const { client, calls } = createMockNotificationSupabase();

    await createLLMNotification(client, "job_failed", {
      ...baseInput,
      errorMessage: "Rate limit exceeded",
    });

    assertStringIncludes(calls.inserts[0].data.message, "Rate limit exceeded");
  });
});

// ============================================================================
// Section 4: Convenience Function Wrappers
// ============================================================================

Deno.test("Convenience Functions", async (t) => {
  await t.step("notifyJobStarted creates job_started notification", async () => {
    const { client, calls } = createMockNotificationSupabase();

    await notifyJobStarted(client, baseInput);

    assertEquals(calls.inserts[0].data.metadata.notification_type, "job_started");
  });

  await t.step("notifyJobCompleted creates job_completed notification", async () => {
    const { client, calls } = createMockNotificationSupabase();

    await notifyJobCompleted(client, baseInput);

    assertEquals(calls.inserts[0].data.metadata.notification_type, "job_completed");
  });

  await t.step("notifyJobFailed creates job_failed notification", async () => {
    const { client, calls } = createMockNotificationSupabase();

    await notifyJobFailed(client, baseInput);

    assertEquals(calls.inserts[0].data.metadata.notification_type, "job_failed");
  });
});
