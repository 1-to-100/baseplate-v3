import { createServiceClient } from './supabase.ts'
import { ApiError } from './errors.ts'
import type { AuthenticatedUser } from './types.ts'

export async function authenticateRequest(req: Request): Promise<AuthenticatedUser> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    throw new ApiError('Missing authorization header', 401)
  }

  const token = authHeader.replace('Bearer ', '')
  const supabase = createServiceClient()

  // Verify JWT and get auth user
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  
  if (authError || !user) {
    throw new ApiError('Invalid or expired token', 401)
  }

  // Get database user with role
  const { data: dbUser, error: userError } = await supabase
    .from('users')
    .select(`
      user_id,
      customer_id,
      role:roles(name, is_system_role)
    `)
    .eq('auth_user_id', user.id)
    .single()

  if (userError || !dbUser) {
    throw new ApiError('User not found in database', 404)
  }

  return {
    id: user.id,
    email: user.email!,
    user_id: dbUser.user_id,
    customer_id: dbUser.customer_id,
    role: dbUser.role as { name: string; is_system_role: boolean } | null
  }
}

export function isSystemAdmin(user: AuthenticatedUser): boolean {
  return user.role?.name === 'system_admin'
}

export function isCustomerSuccess(user: AuthenticatedUser): boolean {
  return user.role?.name === 'customer_success'
}

export function isCustomerAdmin(user: AuthenticatedUser): boolean {
  return user.role?.name === 'customer_admin' || user.role?.name === 'manager'
}

export function canAccessCustomer(user: AuthenticatedUser, targetCustomerId: string): boolean {
  if (isSystemAdmin(user)) return true
  return user.customer_id === targetCustomerId
}

