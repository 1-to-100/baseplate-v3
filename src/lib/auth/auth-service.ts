import { createClient } from '@/lib/supabase/client';
import { edgeFunctions } from '@/lib/supabase/edge-functions';

interface RefreshContextParams {
  customerId?: string;
  impersonatedUserId?: string;
}

interface RefreshContextResponse {
  updated: boolean;
  message?: string;
  error?: string;
  context?: {
    customerId?: string;
    impersonatedUserId?: string;
  };
}

/**
 * SECURE: Auth service for managing JWT context claims
 * Replaces the insecure localStorage-based approach
 */
class AuthService {
  private supabase = createClient();

  /**
   * SECURE: Updates user context in app_metadata
   * Backend validates authorization before updating app_metadata
   * Then refreshes the session to get new JWT with updated claims
   *
   * Process:
   * 1. Backend validates permissions and updates Supabase user app_metadata
   * 2. Frontend calls refreshSession() to get new JWT with updated app_metadata
   * 3. New JWT contains validated customer_id and/or impersonated_user_id claims
   * 4. Automatic token refresh will maintain these claims until next context change
   */
  async refreshWithContext(params: RefreshContextParams): Promise<void> {
    try {
      const {
        data: { session },
      } = await this.supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('No active session. Please log in again.');
      }

      // Step 1: Update app_metadata via Edge Function
      try {
        const data = await edgeFunctions.refreshWithContext({
          customerId: params.customerId,
          impersonatedUserId: params.impersonatedUserId,
        });

        if (!data?.updated) {
          // Extract error message from response if available
          const responseData = data as RefreshContextResponse;
          const errorMessage =
            responseData?.message || responseData?.error || 'Context was not updated';
          throw new Error(errorMessage);
        }
      } catch (edgeError) {
        // Extract meaningful error message from edge function error
        if (edgeError instanceof Error) {
          const message = edgeError.message.toLowerCase();

          // Check for specific error patterns
          if (
            message.includes('permission') ||
            message.includes('forbidden') ||
            message.includes('403')
          ) {
            throw new Error('You do not have permission to perform this action');
          } else if (message.includes('not found') || message.includes('404')) {
            throw new Error('User or resource not found');
          } else if (message.includes('inactive') || message.includes('suspended')) {
            throw new Error('Cannot impersonate inactive or suspended users');
          } else if (message.includes('system administrator') || message.includes('admin')) {
            throw new Error('Cannot impersonate system administrators');
          } else if (message.includes('customer') && message.includes('scope')) {
            throw new Error('You do not have access to this customer');
          }

          // Re-throw with original message if it's user-friendly
          throw edgeError;
        }
        throw new Error('Failed to update context. Please try again.');
      }

      // Step 2: Refresh the Supabase session to get new JWT with updated app_metadata
      // Add a small delay to ensure Supabase has processed the metadata update
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const { data: refreshData, error: refreshError } = await this.supabase.auth.refreshSession();

      if (refreshError || !refreshData.session) {
        const errorMsg = refreshError?.message || 'Unknown error';
        throw new Error(`Failed to refresh session: ${errorMsg}`);
      }

      // Clean up old insecure storage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('selectedCustomerId');
        localStorage.removeItem('impersonatedUserId');
      }
    } catch (error) {
      // Re-throw with improved error message if needed
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to update context. Please try again.');
    }
  }

  /**
   * Clears user context claims
   */
  async clearContext(): Promise<void> {
    try {
      const {
        data: { session },
      } = await this.supabase.auth.getSession();

      if (!session?.access_token) {
        // If no session, just clean up storage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('selectedCustomerId');
          localStorage.removeItem('impersonatedUserId');
        }
        return;
      }

      try {
        await edgeFunctions.clearContext();
      } catch (edgeError) {
        // Extract meaningful error message from edge function error
        if (edgeError instanceof Error) {
          const message = edgeError.message.toLowerCase();

          // Check for specific error patterns
          if (
            message.includes('permission') ||
            message.includes('forbidden') ||
            message.includes('403')
          ) {
            throw new Error('You do not have permission to clear context');
          } else if (message.includes('session') || message.includes('authenticated')) {
            throw new Error('Authentication error. Please try logging in again');
          }

          // Re-throw with original message if it's user-friendly
          throw edgeError;
        }
        throw new Error('Failed to clear context. Please try again.');
      }

      // Refresh session to get updated token
      const { error: refreshError } = await this.supabase.auth.refreshSession();

      if (refreshError) {
        console.error('[AUTH] Failed to refresh session after clearing context:', refreshError);
        // Don't throw - context was cleared, session refresh failure is non-critical
      }

      // Clean up old insecure storage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('selectedCustomerId');
        localStorage.removeItem('impersonatedUserId');
      }
    } catch (error) {
      // Re-throw with improved error message if needed
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to clear context. Please try again.');
    }
  }

  /**
   * Gets the current access token
   */
  async getAccessToken(): Promise<string | null> {
    const {
      data: { session },
    } = await this.supabase.auth.getSession();
    return session?.access_token || null;
  }

  /**
   * Checks if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const {
      data: { session },
    } = await this.supabase.auth.getSession();
    return !!session;
  }

  /**
   * Gets the current context from JWT app_metadata
   * Returns customer_id and impersonated_user_id from the active JWT
   */
  async getCurrentContext(): Promise<{
    customerId?: string | null;
    impersonatedUserId?: string | null;
  }> {
    const {
      data: { session },
    } = await this.supabase.auth.getSession();

    if (!session?.user) {
      return {};
    }

    // Read from JWT app_metadata
    const appMetadata = session.user.app_metadata || {};

    return {
      customerId: appMetadata.customer_id || null,
      impersonatedUserId: appMetadata.impersonated_user_id || null,
    };
  }
}

export const authService = new AuthService();
