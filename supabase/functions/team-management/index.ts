import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { createServiceClient } from '../_shared/supabase.ts'
import { authenticateRequest, isSystemAdmin, isCustomerSuccess, isCustomerAdmin } from '../_shared/auth.ts'
import { ApiError, createErrorResponse, createSuccessResponse } from '../_shared/errors.ts'

serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const user = await authenticateRequest(req)
    const body = await req.json()
    const { action } = body

    switch (action) {
      case 'get-managers':
        return await handleGetManagers(user, body)
      default:
        throw new ApiError('Invalid action', 400)
    }
  } catch (error) {
    return createErrorResponse(error)
  }
})

async function handleGetManagers(user: any, body: any) {
  const { customerId } = body

  // Authorization: Only system admins, customer success, customer admins, and managers can get managers
  const hasAccess = isSystemAdmin(user) || 
                    isCustomerSuccess(user) || 
                    isCustomerAdmin(user)

  if (!hasAccess) {
    throw new ApiError('No access to get managers', 403)
  }

  // Determine which customer ID to use
  let targetCustomerId: string | null = null
  const supabase = createServiceClient()

  if (isSystemAdmin(user)) {
    // System admins can access any customer
    targetCustomerId = customerId || null
    if (!targetCustomerId) {
      throw new ApiError('Customer ID is required', 400)
    }
  } else if (isCustomerSuccess(user)) {
    // Customer success can access their assigned customers
    // Check if they have access to the requested customer
    if (!customerId) {
      throw new ApiError('Customer ID is required', 400)
    }
    
    const { data: ownedCustomer, error: checkError } = await supabase
      .from('customer_success_owned_customers')
      .select('customer_id')
      .eq('user_id', user.user_id)
      .eq('customer_id', customerId)
      .single()
    
    if (checkError || !ownedCustomer) {
      // Also check if it's their own customer_id (fallback)
      if (user.customer_id !== customerId) {
        throw new ApiError('Cannot access managers for this customer', 403)
      }
    }
    
    targetCustomerId = customerId
  } else {
    // Customer admins and managers can only access their own customer
    if (customerId && customerId !== user.customer_id) {
      throw new ApiError('Cannot access managers for another customer', 403)
    }
    targetCustomerId = user.customer_id
  }

  if (!targetCustomerId) {
    throw new ApiError('Customer ID is required', 400)
  }

  // Get role IDs for customer_admin, manager, and customer_success
  const { data: roles, error: rolesError } = await supabase
    .from('roles')
    .select('role_id, name')
    .in('name', ['customer_admin', 'manager', 'customer_success'])

  if (rolesError) {
    throw new ApiError(`Failed to fetch roles: ${rolesError.message}`, 500)
  }

  if (!roles || roles.length === 0) {
    return createSuccessResponse({ data: [] })
  }

  const roleIds = roles.map((r: any) => r.role_id)

  // Get users with manager roles for the target customer
  // Also include customer success users who have access via customer_success_owned_customers
  const { data: customerSuccessOwned, error: csError } = await supabase
    .from('customer_success_owned_customers')
    .select('user_id')
    .eq('customer_id', targetCustomerId)

  if (csError) {
    // Log error but continue - CS users might not be needed
  }

  const csUserIds = (customerSuccessOwned || []).map((cs: any) => cs.user_id)

  // Get users with manager roles for the target customer
  // First, get users directly assigned to the customer
  const { data: directUsers, error: directError } = await supabase
    .from('users')
    .select(`
      user_id,
      email,
      full_name,
      role:roles(role_id, name, display_name)
    `)
    .in('role_id', roleIds)
    .eq('customer_id', targetCustomerId)
    .is('deleted_at', null)
    .order('full_name')

  if (directError) {
    throw new ApiError(`Failed to fetch managers: ${directError.message}`, 500)
  }

  // Get customer success users assigned via customer_success_owned_customers
  let csUsers: any[] = []
  if (csUserIds.length > 0) {
    const { data: csUsersData, error: csUsersError } = await supabase
      .from('users')
      .select(`
        user_id,
        email,
        full_name,
        role:roles(role_id, name, display_name)
      `)
      .in('user_id', csUserIds)
      .in('role_id', roleIds)
      .is('deleted_at', null)
      .order('full_name')

    if (csUsersError) {
      // Log error but continue - CS users might not be needed
    } else {
      csUsers = csUsersData || []
    }
  }

  // Combine and deduplicate users
  const userMap = new Map()
  ;(directUsers || []).forEach((u: any) => {
    userMap.set(u.user_id, u)
  })
  csUsers.forEach((u: any) => {
    if (!userMap.has(u.user_id)) {
      userMap.set(u.user_id, u)
    }
  })

  // Filter to only include users with the correct roles
  const managers = Array.from(userMap.values()).filter((u: any) => {
    const roleName = u.role?.name
    return roleName === 'customer_admin' || 
           roleName === 'manager' || 
           roleName === 'customer_success'
  })

  return createSuccessResponse({ 
    data: managers.map((u: any) => ({
      id: u.user_id,
      user_id: u.user_id,
      email: u.email,
      full_name: u.full_name,
      name: u.full_name || u.email,
    }))
  })
}

