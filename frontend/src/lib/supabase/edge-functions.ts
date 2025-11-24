import { createClient } from './client'
import { config } from '@/config'
import { getSiteURL } from '@/lib/get-site-url'

export class EdgeFunctions {
  private client = createClient()

  // ============================================================================
  // USER MANAGEMENT
  // ============================================================================

  async inviteUser(payload: {
    email: string
    customerId?: string | null
    roleId: string
    managerId?: string
    fullName?: string
  }) {
    try {
      // Use direct fetch to get better error messages
      const { data: sessionData } = await this.client.auth.getSession();
      if (!sessionData?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const supabaseUrl = config.supabase.url;
      if (!supabaseUrl) {
        throw new Error('Supabase URL is not configured');
      }
      const functionUrl = `${supabaseUrl}/functions/v1/user-management`;
      const siteUrl = getSiteURL().replace(/\/$/, '') // Remove trailing slash
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({ 
          action: 'invite', 
          ...payload,
          siteUrl
        }),
      });

      let responseData;
      try {
        const responseText = await response.text();
        responseData = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        console.error('Failed to parse edge function response:', parseError);
        throw new Error(`Edge function returned invalid JSON (status: ${response.status})`);
      }

      if (!response.ok) {
        const errorMessage = responseData.error || responseData.message || `Edge function returned ${response.status}`;
        console.error('Edge function error:', {
          status: response.status,
          statusText: response.statusText,
          responseData,
          payload
        });
        throw new Error(errorMessage);
      }

      // Edge function returns { data: ... } structure
      return responseData.data || responseData;
    } catch (err: unknown) {
      // If it's already our error, re-throw it
      if (err instanceof Error && err.message && !err.message.includes('Edge Function returned')) {
        throw err;
      }
      
      // Otherwise, wrap it
      console.error('Unexpected error in inviteUser:', err);
      throw new Error(err instanceof Error ? err.message : 'Failed to invite user');
    }
  }

  async inviteMultipleUsers(payload: {
    emails: string[]
    customerId?: string | null
    roleId: string
    managerId?: string
  }) {
    const siteUrl = getSiteURL().replace(/\/$/, '') // Remove trailing slash
    const { data, error } = await this.client.functions.invoke('user-management', {
      body: { 
        action: 'invite-multiple', 
        ...payload,
        siteUrl
      }
    })

    if (error) throw new Error(error.message)
    return data
  }

  async resendInvite(email: string) {
    const siteUrl = getSiteURL().replace(/\/$/, '') // Remove trailing slash
    const { data, error } = await this.client.functions.invoke('user-management', {
      body: { 
        action: 'resend-invite', 
        email,
        siteUrl
      }
    })

    if (error) throw new Error(error.message)
    return data
  }

  async banUser(userId: string) {
    const { data, error } = await this.client.functions.invoke('user-management', {
      body: { action: 'ban', userId }
    })

    if (error) throw new Error(error.message)
    return data
  }

  async unbanUser(userId: string) {
    const { data, error } = await this.client.functions.invoke('user-management', {
      body: { action: 'unban', userId }
    })

    if (error) throw new Error(error.message)
    return data
  }

  // ============================================================================
  // AUTH CONTEXT
  // ============================================================================

  async refreshWithContext(context: {
    customerId?: string
    impersonatedUserId?: string
  }) {
    try {
      const { data, error } = await this.client.functions.invoke('auth-context', {
        body: { action: 'refresh', ...context }
      })

      if (error) {
        // Extract meaningful error message from edge function response
        let errorMessage = error.message || 'Failed to update context';
        
        // Check if error has additional details in different formats
        if (error.context) {
          const contextError = error.context as { message?: string; error?: string };
          errorMessage = contextError.message || contextError.error || errorMessage;
        }
        
        // Check if data contains error information
        if (data && typeof data === 'object' && 'error' in data) {
          const dataError = (data as { error?: string; message?: string });
          errorMessage = dataError.error || dataError.message || errorMessage;
        }
        
        // Provide user-friendly error messages based on common patterns
        const lowerMessage = errorMessage.toLowerCase();
        if (lowerMessage.includes('permission') || lowerMessage.includes('forbidden') || lowerMessage.includes('403')) {
          errorMessage = 'You do not have permission to perform this action';
        } else if (lowerMessage.includes('not found') || lowerMessage.includes('404')) {
          errorMessage = 'User or resource not found';
        } else if (lowerMessage.includes('inactive') || lowerMessage.includes('suspended')) {
          errorMessage = 'Cannot impersonate inactive or suspended users';
        } else if (lowerMessage.includes('system administrator') || lowerMessage.includes('admin')) {
          errorMessage = 'Cannot impersonate system administrators';
        } else if (lowerMessage.includes('customer') && (lowerMessage.includes('scope') || lowerMessage.includes('access'))) {
          errorMessage = 'You do not have access to this customer';
        } else if (lowerMessage.includes('session') || lowerMessage.includes('authenticated')) {
          errorMessage = 'Authentication error. Please try logging in again';
        }
        
        throw new Error(errorMessage);
      }

      // Verify the response indicates success
      if (data && typeof data === 'object' && 'updated' in data) {
        const responseData = data as { updated?: boolean; message?: string };
        if (responseData.updated === false) {
          throw new Error(responseData.message || 'Context was not updated');
        }
      }

      // Refresh session to get new JWT with updated app_metadata
      await this.client.auth.refreshSession()

      return data
    } catch (err: unknown) {
      // If it's already our error, re-throw it
      if (err instanceof Error) {
        throw err;
      }
      
      // Otherwise, wrap it
      console.error('Unexpected error in refreshWithContext:', err);
      throw new Error(err instanceof Error ? err.message : 'Failed to update context');
    }
  }

  async clearContext() {
    try {
      const { data, error } = await this.client.functions.invoke('auth-context', {
        body: { action: 'clear' }
      })

      if (error) {
        // Extract meaningful error message from edge function response
        let errorMessage = error.message || 'Failed to clear context';
        
        // Check if error has additional details in different formats
        if (error.context) {
          const contextError = error.context as { message?: string; error?: string };
          errorMessage = contextError.message || contextError.error || errorMessage;
        }
        
        // Check if data contains error information
        if (data && typeof data === 'object' && 'error' in data) {
          const dataError = (data as { error?: string; message?: string });
          errorMessage = dataError.error || dataError.message || errorMessage;
        }
        
        // Provide user-friendly error messages based on common patterns
        const lowerMessage = errorMessage.toLowerCase();
        if (lowerMessage.includes('permission') || lowerMessage.includes('forbidden') || lowerMessage.includes('403')) {
          errorMessage = 'You do not have permission to clear context';
        } else if (lowerMessage.includes('session') || lowerMessage.includes('authenticated')) {
          errorMessage = 'Authentication error. Please try logging in again';
        }
        
        throw new Error(errorMessage);
      }

      // Refresh session
      await this.client.auth.refreshSession()

      return data
    } catch (err: unknown) {
      // If it's already our error, re-throw it
      if (err instanceof Error) {
        throw err;
      }
      
      // Otherwise, wrap it
      console.error('Unexpected error in clearContext:', err);
      throw new Error(err instanceof Error ? err.message : 'Failed to clear context');
    }
  }

  // ============================================================================
  // ADMIN OPERATIONS
  // ============================================================================

  async createCustomer(customer: {
    name: string
    domain?: string
    lifecycle_stage?: string
  }) {
    const { data, error } = await this.client.functions.invoke('admin-operations', {
      body: { action: 'create-customer', ...customer }
    })

    if (error) throw new Error(error.message)
    return data
  }
}

// Export singleton instance
export const edgeFunctions = new EdgeFunctions()

