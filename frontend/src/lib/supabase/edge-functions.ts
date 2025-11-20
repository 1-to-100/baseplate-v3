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
      console.log('Invite user - sending siteUrl:', siteUrl)
      
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
    console.log('Invite multiple users - sending siteUrl:', siteUrl)
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
    console.log('Resend invite - sending siteUrl:', siteUrl)
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
    const { data, error } = await this.client.functions.invoke('auth-context', {
      body: { action: 'refresh', ...context }
    })

    if (error) throw new Error(error.message)

    // Refresh session to get new JWT with updated app_metadata
    await this.client.auth.refreshSession()

    return data
  }

  async clearContext() {
    const { data, error } = await this.client.functions.invoke('auth-context', {
      body: { action: 'clear' }
    })

    if (error) throw new Error(error.message)

    // Refresh session
    await this.client.auth.refreshSession()

    return data
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

