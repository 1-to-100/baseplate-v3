import type { SupabaseClient } from '@supabase/supabase-js';

export interface NotificationInput {
  customer_id: string;
  user_id: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

/**
 * Create an in-app notification
 */
export async function createNotification(
  supabase: SupabaseClient,
  input: NotificationInput
): Promise<void> {
  const { error } = await supabase.from('notifications').insert({
    customer_id: input.customer_id,
    user_id: input.user_id,
    type: ['in_app'],
    title: input.title,
    message: input.message,
    channel: 'segment',
    metadata: input.metadata || {},
    generated_by: 'system (segment service)',
  });

  if (error) {
    console.error('Failed to create notification:', error);
    // Don't throw - notifications are non-critical
  }
}

/**
 * Create notification for segment processing started
 */
export async function notifyProcessingStarted(
  supabase: SupabaseClient,
  customerId: string,
  userId: string,
  segmentName: string,
  segmentId: string
): Promise<void> {
  await createNotification(supabase, {
    customer_id: customerId,
    user_id: userId,
    title: 'Segment Processing Started',
    message: `Segment "${segmentName}" is being processed.`,
    metadata: {
      id: segmentId,
      name: segmentName,
      status: 'processing',
    },
  });
}

/**
 * Create notification for segment processing completed
 */
export async function notifyProcessingCompleted(
  supabase: SupabaseClient,
  customerId: string,
  userId: string,
  segmentName: string,
  segmentId: string,
  companyCount: number,
  note?: string
): Promise<void> {
  let message = `Segment "${segmentName}" has been processed successfully. ${companyCount} ${
    companyCount === 1 ? 'company' : 'companies'
  } added.`;

  if (note) {
    message += ` ${note}`;
  }

  await createNotification(supabase, {
    customer_id: customerId,
    user_id: userId,
    title: 'Segment Processed Successfully',
    message,
    metadata: {
      id: segmentId,
      name: segmentName,
      status: 'completed',
      company_count: companyCount,
      note: note || null,
    },
  });
}

/**
 * Create notification for segment processing failed
 */
export async function notifyProcessingFailed(
  supabase: SupabaseClient,
  customerId: string,
  userId: string,
  segmentName: string,
  segmentId: string,
  errorMessage: string
): Promise<void> {
  await createNotification(supabase, {
    customer_id: customerId,
    user_id: userId,
    title: 'Segment Processing Failed',
    message: `Failed to process segment "${segmentName}". ${errorMessage}`,
    metadata: {
      id: segmentId,
      name: segmentName,
      status: 'failed',
      error: errorMessage,
    },
  });
}
