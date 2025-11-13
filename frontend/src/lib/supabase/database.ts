import { createClient } from './client'
import type { SupabaseClient } from '@supabase/supabase-js'

export class SupabaseDatabase {
  private client: SupabaseClient

  constructor() {
    this.client = createClient()
  }

  // Helper to get current auth user
  private async getAuthUser() {
    const { data: { user }, error } = await this.client.auth.getUser()
    if (error || !user) throw new Error('Not authenticated')
    return user
  }

  // ============================================================================
  // USERS
  // ============================================================================

  async getCurrentUser() {
    const user = await this.getAuthUser()
    const { data, error } = await this.client
      .from('users')
      .select(`
        user_id,
        auth_user_id,
        email,
        full_name,
        avatar_url,
        phone_number,
        customer_id,
        role_id,
        manager_id,
        status,
        last_login_at,
        preferences,
        created_at,
        updated_at,
        deleted_at,
        customer:customers(customer_id, name, email_domain),
        role:roles(role_id, name, display_name)
      `)
      .eq('auth_user_id', user.id)
      .single()

    if (error) {
      console.error('Error fetching current user:', error);
      throw error;
    }
    console.log('Current user data:', data);
    
    // Handle array responses from Supabase (should be single objects for these relationships)
    const result = {
      ...data,
      customer: Array.isArray(data.customer) ? data.customer[0] || null : data.customer,
      role: Array.isArray(data.role) ? data.role[0] || null : data.role,
    }
    
    return result
  }

  async getUsers(params: {
    page?: number
    perPage?: number
    search?: string
    customerId?: string[]
    roleId?: string[]
    status?: string[]
    orderBy?: string
    orderDirection?: 'asc' | 'desc'
  }) {
    let query = this.client
      .from('users')
      .select(`
        *,
        customer:customers(*),
        role:roles(*),
        manager:managers(*)
      `, { count: 'exact' })

    // Search filter
    if (params.search) {
      query = query.or(`full_name.ilike.%${params.search}%,email.ilike.%${params.search}%`)
    }

    // Customer filter
    if (params.customerId && params.customerId.length > 0) {
      query = query.in('customer_id', params.customerId)
    }

    // Role filter
    if (params.roleId && params.roleId.length > 0) {
      query = query.in('role_id', params.roleId)
    }

    // Status filter
    if (params.status && params.status.length > 0) {
      query = query.in('status', params.status)
    }

    // Sorting
    const orderBy = params.orderBy || 'created_at'
    const orderDirection = params.orderDirection || 'desc'
    query = query.order(orderBy, { ascending: orderDirection === 'asc' })

    // Pagination
    const page = params.page || 1
    const perPage = params.perPage || 10
    const from = (page - 1) * perPage
    const to = from + perPage - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) throw error

    return {
      data,
      meta: {
        page,
        perPage,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / perPage)
      }
    }
  }

  async getUserById(userId: string) {
    const { data, error } = await this.client
      .from('users')
      .select(`
        *,
        customer:customers(*),
        role:roles(*),
        manager:managers(*)
      `)
      .eq('user_id', userId)
      .single()

    if (error) throw error
    return data
  }

  async updateUser(userId: string, updates: {
    full_name?: string
    phone_number?: string
    avatar_url?: string
    role_id?: string
    manager_id?: string
    status?: string
  }) {
    const { data, error } = await this.client
      .from('users')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async softDeleteUser(userId: string) {
    const { data, error } = await this.client
      .from('users')
      .update({ deleted_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async checkEmailExists(email: string) {
    const { data, error } = await this.client
      .from('users')
      .select('user_id')
      .eq('email', email)
      .single()

    if (error && error.code !== 'PGRST116') throw error // PGRST116 = not found
    return !!data
  }

  // ============================================================================
  // CUSTOMERS
  // ============================================================================

  async getCustomers(params: {
    page?: number
    perPage?: number
    search?: string
    id?: string[]
  }) {
    let query = this.client
      .from('customers')
      .select('*', { count: 'exact' })

    if (params.search) {
      query = query.ilike('name', `%${params.search}%`)
    }

    if (params.id && params.id.length > 0) {
      query = query.in('customer_id', params.id)
    }

    const page = params.page || 1
    const perPage = params.perPage || 10
    const from = (page - 1) * perPage
    const to = from + perPage - 1

    const { data, error, count } = await query.range(from, to)

    if (error) throw error

    return {
      data,
      meta: {
        page,
        perPage,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / perPage)
      }
    }
  }

  async getCustomerById(customerId: string) {
    const { data, error } = await this.client
      .from('customers')
      .select('*')
      .eq('customer_id', customerId)
      .single()

    if (error) throw error
    return data
  }

  async updateCustomer(customerId: string, updates: {
    name?: string
    domain?: string
    lifecycle_stage?: string
    status?: string
  }) {
    const { data, error } = await this.client
      .from('customers')
      .update(updates)
      .eq('customer_id', customerId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // ============================================================================
  // ROLES
  // ============================================================================

  async getRoles() {
    const { data, error } = await this.client
      .from('roles')
      .select('*')
      .order('name')

    if (error) throw error
    return data
  }

  async getRoleById(roleId: string) {
    const { data, error } = await this.client
      .from('roles')
      .select('*')
      .eq('role_id', roleId)
      .single()

    if (error) throw error
    return data
  }

  // ============================================================================
  // TEAMS
  // ============================================================================

  async getTeams(customerId?: string) {
    let query = this.client
      .from('teams')
      .select(`
        *,
        customer:customers(*)
      `)

    if (customerId) {
      query = query.eq('customer_id', customerId)
    }

    const { data, error } = await query

    if (error) throw error
    return data
  }

  async getTeamById(teamId: string) {
    const { data, error } = await this.client
      .from('teams')
      .select(`
        *,
        customer:customers(*),
        members:team_members(
          *,
          user:users(*)
        )
      `)
      .eq('team_id', teamId)
      .single()

    if (error) throw error
    return data
  }

  async createTeam(team: {
    name: string
    description?: string
    customer_id: string
    is_primary?: boolean
  }) {
    const { data, error } = await this.client
      .from('teams')
      .insert(team)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateTeam(teamId: string, updates: {
    name?: string
    description?: string
  }) {
    const { data, error } = await this.client
      .from('teams')
      .update(updates)
      .eq('team_id', teamId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteTeam(teamId: string) {
    const { error } = await this.client
      .from('teams')
      .delete()
      .eq('team_id', teamId)

    if (error) throw error
  }

  // ============================================================================
  // ARTICLES
  // ============================================================================

  async getArticles(params: {
    page?: number
    perPage?: number
    search?: string
    categoryId?: string[]
    status?: string[]
    orderBy?: string
    orderDirection?: 'asc' | 'desc'
  }) {
    let query = this.client
      .from('help_articles')
      .select(`
        *,
        category:help_article_categories(*)
      `, { count: 'exact' })

    if (params.search) {
      query = query.or(`title.ilike.%${params.search}%,content.ilike.%${params.search}%`)
    }

    if (params.categoryId && params.categoryId.length > 0) {
      query = query.in('category_id', params.categoryId)
    }

    if (params.status && params.status.length > 0) {
      query = query.in('status', params.status)
    }

    const orderBy = params.orderBy || 'created_at'
    const orderDirection = params.orderDirection || 'desc'
    query = query.order(orderBy, { ascending: orderDirection === 'asc' })

    const page = params.page || 1
    const perPage = params.perPage || 10
    const from = (page - 1) * perPage
    const to = from + perPage - 1

    const { data, error, count } = await query.range(from, to)

    if (error) throw error

    return {
      data,
      meta: {
        page,
        perPage,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / perPage)
      }
    }
  }

  async getArticleById(articleId: string) {
    const { data, error } = await this.client
      .from('help_articles')
      .select(`
        *,
        category:help_article_categories(*)
      `)
      .eq('article_id', articleId)
      .single()

    if (error) throw error
    return data
  }

  // ============================================================================
  // NOTIFICATIONS
  // ============================================================================

  async getNotifications(params: {
    page?: number
    perPage?: number
    read?: boolean
  }) {
    let query = this.client
      .from('notifications')
      .select('*', { count: 'exact' })

    if (params.read !== undefined) {
      query = query.eq('read', params.read)
    }

    query = query.order('created_at', { ascending: false })

    const page = params.page || 1
    const perPage = params.perPage || 20
    const from = (page - 1) * perPage
    const to = from + perPage - 1

    const { data, error, count } = await query.range(from, to)

    if (error) throw error

    return {
      data,
      meta: {
        page,
        perPage,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / perPage)
      }
    }
  }

  async markNotificationAsRead(notificationId: string) {
    const { data, error } = await this.client
      .from('notifications')
      .update({ read: true })
      .eq('notification_id', notificationId)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

// Export singleton instance
export const supabaseDB = new SupabaseDatabase()

