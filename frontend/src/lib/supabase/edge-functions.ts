import { createClient } from './client'

export class EdgeFunctions {
  private client = createClient()

  // ============================================================================
  // USER MANAGEMENT
  // ============================================================================

  async inviteUser(payload: {
    email: string
    customerId: string
    roleId: string
    managerId?: string
  }) {
    const { data, error } = await this.client.functions.invoke('user-management', {
      body: { action: 'invite', ...payload }
    })

    if (error) throw new Error(error.message)
    return data
  }

  async inviteMultipleUsers(payload: {
    emails: string[]
    customerId: string
    roleId: string
    managerId?: string
  }) {
    const { data, error } = await this.client.functions.invoke('user-management', {
      body: { action: 'invite-multiple', ...payload }
    })

    if (error) throw new Error(error.message)
    return data
  }

  async resendInvite(email: string) {
    const { data, error } = await this.client.functions.invoke('user-management', {
      body: { action: 'resend-invite', email }
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

