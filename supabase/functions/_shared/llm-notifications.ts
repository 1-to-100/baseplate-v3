/**
 * LLM Job Notifications Utility
 *
 * Creates in-app notifications for LLM job status changes.
 * Follows the pattern from notifications API for consistency.
 *
 * Notifications are non-blocking - errors are logged but don't fail the job.
 */

// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

/**
 * Notification types for LLM job events
 */
export type LLMNotificationType =
  | 'job_started'
  | 'job_completed'
  | 'job_failed'
  | 'job_exhausted'
  | 'job_cancelled';

/**
 * Input for creating an LLM job notification
 */
export interface LLMNotificationInput {
  /** The job ID */
  jobId: string;
  /** User ID to notify (job owner) */
  userId: string;
  /** Customer ID for the notification */
  customerId: string;
  /** Feature that initiated the job (for context) */
  featureSlug?: string | null;
  /** Error message if job failed */
  errorMessage?: string | null;
  /** Result summary if job completed */
  resultSummary?: string | null;
}

/**
 * Notification templates for different job events
 */
const NOTIFICATION_TEMPLATES: Record<
  LLMNotificationType,
  {
    title: string;
    getMessage: (input: LLMNotificationInput) => string;
  }
> = {
  job_started: {
    title: 'AI Processing Started',
    getMessage: (input) =>
      input.featureSlug
        ? `Your ${formatFeatureSlug(input.featureSlug)} request is being processed.`
        : 'Your AI request is being processed.',
  },
  job_completed: {
    title: 'AI Processing Complete',
    getMessage: (input) =>
      input.featureSlug
        ? `Your ${formatFeatureSlug(input.featureSlug)} request has completed successfully.`
        : 'Your AI request has completed successfully.',
  },
  job_failed: {
    title: 'AI Processing Failed',
    getMessage: (input) =>
      input.errorMessage
        ? `Your AI request failed: ${truncate(input.errorMessage, 100)}`
        : 'Your AI request failed. Please try again.',
  },
  job_exhausted: {
    title: 'AI Processing Failed',
    getMessage: (input) =>
      `Your AI request failed after multiple retry attempts.${input.errorMessage ? ` Error: ${truncate(input.errorMessage, 80)}` : ''}`,
  },
  job_cancelled: {
    title: 'AI Processing Cancelled',
    getMessage: (input) =>
      input.featureSlug
        ? `Your ${formatFeatureSlug(input.featureSlug)} request was cancelled.`
        : 'Your AI request was cancelled.',
  },
};

/**
 * Format feature slug for display (e.g., "content-generator" -> "Content Generator")
 */
function formatFeatureSlug(slug: string): string {
  return slug
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Truncate string to max length with ellipsis
 */
function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * Create a notification for an LLM job event.
 *
 * Non-blocking: logs errors but doesn't throw.
 *
 * @param supabase - Service client (bypasses RLS)
 * @param notificationType - Type of notification
 * @param input - Notification details
 */
export async function createLLMNotification(
  supabase: SupabaseClient,
  notificationType: LLMNotificationType,
  input: LLMNotificationInput
): Promise<void> {
  try {
    const template = NOTIFICATION_TEMPLATES[notificationType];

    const notificationData = {
      user_id: input.userId,
      customer_id: input.customerId,
      type: ['in_app'],
      title: template.title,
      message: template.getMessage(input),
      channel: 'llm',
      read_at: null,
      generated_by: 'llm-system',
      metadata: {
        job_id: input.jobId,
        feature_slug: input.featureSlug || null,
        notification_type: notificationType,
      },
    };

    const { error } = await supabase.from('notifications').insert(notificationData);

    if (error) {
      console.error(`Failed to create LLM notification (${notificationType}):`, error.message);
    } else {
      console.log(`LLM notification created: ${notificationType} for job ${input.jobId}`);
    }
  } catch (error) {
    // Non-blocking - log but don't throw
    console.error(`Error creating LLM notification:`, error);
  }
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Notify that a job has started processing
 */
export async function notifyJobStarted(
  supabase: SupabaseClient,
  input: LLMNotificationInput
): Promise<void> {
  await createLLMNotification(supabase, 'job_started', input);
}

/**
 * Notify that a job has completed successfully
 */
export async function notifyJobCompleted(
  supabase: SupabaseClient,
  input: LLMNotificationInput
): Promise<void> {
  await createLLMNotification(supabase, 'job_completed', input);
}

/**
 * Notify that a job has failed
 */
export async function notifyJobFailed(
  supabase: SupabaseClient,
  input: LLMNotificationInput
): Promise<void> {
  await createLLMNotification(supabase, 'job_failed', input);
}

/**
 * Notify that a job has exhausted all retries
 */
export async function notifyJobExhausted(
  supabase: SupabaseClient,
  input: LLMNotificationInput
): Promise<void> {
  await createLLMNotification(supabase, 'job_exhausted', input);
}

/**
 * Notify that a job was cancelled
 */
export async function notifyJobCancelled(
  supabase: SupabaseClient,
  input: LLMNotificationInput
): Promise<void> {
  await createLLMNotification(supabase, 'job_cancelled', input);
}
