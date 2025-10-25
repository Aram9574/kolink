/**
 * Logger Utility for Kolink
 *
 * Centralized logging system that sends events to Supabase
 * and outputs to console in development mode.
 *
 * Usage:
 * ```typescript
 * import { logEvent, logAdminAction } from '@/lib/logger';
 *
 * // Log user event
 * await logEvent(userId, 'generation', 'Post generated successfully', { postId: '...' });
 *
 * // Log admin action
 * await logAdminAction('add_credits', targetUserId, { credits_added: 10 });
 * ```
 */

import { supabaseClient } from './supabaseClient';
import { getSupabaseAdminClient } from './supabaseAdmin';

/**
 * Log event types
 */
export type LogEventType =
  | 'login'
  | 'generation'
  | 'payment'
  | 'error'
  | 'profile_update'
  | 'other';

/**
 * Log metadata interface
 */
export interface LogMetadata {
  [key: string]: string | number | boolean | null | undefined | object;
}

/**
 * Log a user event to Supabase
 *
 * @param userId - The ID of the user performing the action
 * @param type - Type of event (login, generation, payment, error, profile_update, other)
 * @param message - Human-readable message describing the event
 * @param metadata - Optional additional data (JSON object)
 * @returns Promise<string | null> - The ID of the created log entry, or null on error
 */
export async function logEvent(
  userId: string,
  type: LogEventType,
  message: string,
  metadata: LogMetadata = {}
): Promise<string | null> {
  try {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[LOG] [${type.toUpperCase()}] User: ${userId}`);
      console.log(`  Message: ${message}`);
      if (Object.keys(metadata).length > 0) {
        console.log('  Metadata:', metadata);
      }
    }

    // Use admin client to bypass RLS for service role insertions
    const supabase = getSupabaseAdminClient();

    const { data, error } = await supabase
      .from('logs')
      .insert({
        user_id: userId,
        type,
        message,
        metadata: metadata || {},
      })
      .select('id')
      .single();

    if (error) {
      console.error('❌ Error logging event to Supabase:', error.message);
      return null;
    }

    return data?.id || null;
  } catch (error) {
    console.error('❌ Exception in logEvent:', error);
    return null;
  }
}

/**
 * Log an administrative action to Supabase
 *
 * @param action - The action performed (e.g., 'add_credits', 'change_plan', 'delete_user')
 * @param targetUserId - The ID of the user being affected
 * @param metadata - Optional additional data (JSON object)
 * @returns Promise<string | null> - The ID of the created log entry, or null on error
 */
export async function logAdminAction(
  action: string,
  targetUserId: string,
  metadata: LogMetadata = {}
): Promise<string | null> {
  try {
    // Get current admin user ID from session
    const { data: { session } } = await supabaseClient.auth.getSession();
    const adminId = session?.user?.id;

    if (!adminId) {
      console.error('❌ Cannot log admin action: No authenticated admin');
      return null;
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[ADMIN LOG] Action: ${action}`);
      console.log(`  Admin ID: ${adminId}`);
      console.log(`  Target User: ${targetUserId}`);
      if (Object.keys(metadata).length > 0) {
        console.log('  Metadata:', metadata);
      }
    }

    const supabase = getSupabaseAdminClient();

    const { data, error } = await supabase
      .from('admin_logs')
      .insert({
        admin_id: adminId,
        action,
        target_user: targetUserId,
        metadata: metadata || {},
      })
      .select('id')
      .single();

    if (error) {
      console.error('❌ Error logging admin action to Supabase:', error.message);
      return null;
    }

    return data?.id || null;
  } catch (error) {
    console.error('❌ Exception in logAdminAction:', error);
    return null;
  }
}

/**
 * Log an error event
 *
 * @param userId - The ID of the user (or 'system' for system errors)
 * @param errorMessage - The error message
 * @param errorDetails - Optional error details (stack trace, etc.)
 * @returns Promise<string | null>
 */
export async function logError(
  userId: string,
  errorMessage: string,
  errorDetails: LogMetadata = {}
): Promise<string | null> {
  return logEvent(userId, 'error', errorMessage, {
    ...errorDetails,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Log a payment event
 *
 * @param userId - The ID of the user
 * @param plan - The plan purchased
 * @param amount - The amount paid (in cents)
 * @param stripeSessionId - Optional Stripe session ID
 * @returns Promise<string | null>
 */
export async function logPayment(
  userId: string,
  plan: string,
  amount: number,
  stripeSessionId?: string
): Promise<string | null> {
  return logEvent(userId, 'payment', `Payment completed for ${plan} plan`, {
    plan,
    amount,
    stripe_session_id: stripeSessionId,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Log a content generation event
 *
 * @param userId - The ID of the user
 * @param postId - The ID of the generated post
 * @param creditsUsed - Number of credits consumed
 * @returns Promise<string | null>
 */
export async function logGeneration(
  userId: string,
  postId: string,
  creditsUsed: number = 1
): Promise<string | null> {
  return logEvent(userId, 'generation', 'Content generated successfully', {
    post_id: postId,
    credits_used: creditsUsed,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Log a user login event
 *
 * @param userId - The ID of the user
 * @param method - Login method (e.g., 'email', 'google', 'linkedin')
 * @returns Promise<string | null>
 */
export async function logLogin(
  userId: string,
  method: string = 'email'
): Promise<string | null> {
  return logEvent(userId, 'login', `User logged in via ${method}`, {
    method,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Batch log multiple events (useful for analytics)
 *
 * @param events - Array of events to log
 * @returns Promise<number> - Number of successfully logged events
 */
export async function logBatch(
  events: Array<{
    userId: string;
    type: LogEventType;
    message: string;
    metadata?: LogMetadata;
  }>
): Promise<number> {
  let successCount = 0;

  for (const event of events) {
    const result = await logEvent(
      event.userId,
      event.type,
      event.message,
      event.metadata
    );

    if (result) {
      successCount++;
    }
  }

  return successCount;
}

/**
 * Get recent logs for a user
 *
 * @param userId - The ID of the user
 * @param limit - Maximum number of logs to retrieve (default: 50)
 * @returns Promise<Array> - Array of log entries
 */
export async function getUserLogs(
  userId: string,
  limit: number = 50
): Promise<Array<any>> {
  try {
    const { data, error } = await supabaseClient
      .from('logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Error fetching user logs:', error.message);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('❌ Exception in getUserLogs:', error);
    return [];
  }
}

/**
 * Get admin action logs
 *
 * @param limit - Maximum number of logs to retrieve (default: 100)
 * @returns Promise<Array> - Array of admin log entries
 */
export async function getAdminLogs(limit: number = 100): Promise<Array<any>> {
  try {
    const supabase = getSupabaseAdminClient();

    const { data, error } = await supabase
      .from('admin_logs')
      .select(`
        *,
        admin:admin_id (email),
        target:target_user (email)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Error fetching admin logs:', error.message);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('❌ Exception in getAdminLogs:', error);
    return [];
  }
}
