import { createClient } from '@/lib/supabase/client';

interface RefreshContextParams {
  customerId?: string;
  impersonatedUserId?: string;
}

interface RefreshContextResponse {
  updated: boolean;
  message: string;
  context: {
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
    const { data: { session } } = await this.supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('No active session');
    }

    // Step 1: Tell backend to update app_metadata (with authorization checks)
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh-with-context`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(params),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to refresh context' }));
      throw new Error(error.message || 'Failed to refresh context');
    }

    const data: RefreshContextResponse = await response.json();

    if (!data.updated) {
      throw new Error('Context was not updated');
    }

    // Step 2: Refresh the Supabase session to get new JWT with updated app_metadata
    const { data: refreshData, error: refreshError } = 
      await this.supabase.auth.refreshSession();

    if (refreshError || !refreshData.session) {
      throw new Error(`Failed to refresh session: ${refreshError?.message || 'Unknown error'}`);
    }

    // Clean up old insecure storage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('selectedCustomerId');
      localStorage.removeItem('impersonatedUserId');
    }
  }

  /**
   * Clears user context claims
   */
  async clearContext(): Promise<void> {
    const { data: { session } } = await this.supabase.auth.getSession();
    
    if (!session?.access_token) {
      return;
    }

    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/auth/clear-context`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );

    // Refresh session to get updated token
    await this.supabase.auth.refreshSession();

    // Clean up old insecure storage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('selectedCustomerId');
      localStorage.removeItem('impersonatedUserId');
    }
  }

  /**
   * Gets the current access token
   */
  async getAccessToken(): Promise<string | null> {
    const { data: { session } } = await this.supabase.auth.getSession();
    return session?.access_token || null;
  }

  /**
   * Checks if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const { data: { session } } = await this.supabase.auth.getSession();
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
    const { data: { session } } = await this.supabase.auth.getSession();
    
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

