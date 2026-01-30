/// <reference lib="deno.ns" />
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { createServiceClient } from '../_shared/supabase.ts'
import { authenticateRequest, isSystemAdmin, isCustomerSuccess } from '../_shared/auth.ts'
import { ApiError, createErrorResponse, createSuccessResponse } from '../_shared/errors.ts'

Deno.serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const user = await authenticateRequest(req)
    const body = await req.json()
    const { action } = body

    switch (action) {
      case 'refresh':
        return await handleRefreshContext(user, body)
      case 'clear':
        return await handleClearContext(user)
      default:
        throw new ApiError('Invalid action', 400)
    }
  } catch (error) {
    return createErrorResponse(error)
  }
})

async function handleRefreshContext(user: any, body: any) {
  const { customerId, impersonatedUserId } = body
  const supabase = createServiceClient()

  // Validate permissions
  if (customerId && !isSystemAdmin(user) && customerId !== user.customer_id) {
    throw new ApiError('Cannot switch to another customer', 403)
  }

  if (impersonatedUserId) {
    // Only system admins and customer success can impersonate
    if (!isSystemAdmin(user) && !isCustomerSuccess(user)) {
      throw new ApiError('No permission to impersonate users', 403)
    }

    // Verify target user exists and check access
    const { data: targetUser, error } = await supabase
      .from('users')
      .select('user_id, customer_id')
      .eq('user_id', impersonatedUserId)
      .single()

    if (error || !targetUser) {
      throw new ApiError('Target user not found', 404)
    }

    // Customer success can only impersonate users in their assigned customers
    if (isCustomerSuccess(user) && !isSystemAdmin(user)) {
      // Check if user has access to this customer
      const { data: csAccess } = await supabase
        .from('customer_success_owned_customers')
        .select('customer_id')
        .eq('user_id', user.user_id)
        .eq('customer_id', targetUser.customer_id)
        .single()

      if (!csAccess) {
        throw new ApiError('Cannot impersonate users from this customer', 403)
      }
    }
  }

  // Update user app_metadata with new context
  const { error: updateError } = await supabase.auth.admin.updateUserById(
    user.id,
    {
      app_metadata: {
        customer_id: customerId,
        impersonated_user_id: impersonatedUserId
      }
    }
  )

  if (updateError) {
    throw new ApiError(`Failed to update context: ${updateError.message}`, 400)
  }

  return createSuccessResponse({ 
    updated: true,
    context: {
      customerId,
      impersonatedUserId
    }
  })
}

async function handleClearContext(user: any) {
  const supabase = createServiceClient()

  // Clear app_metadata
  const { error } = await supabase.auth.admin.updateUserById(
    user.id,
    {
      app_metadata: {
        customer_id: null,
        impersonated_user_id: null
      }
    }
  )

  if (error) {
    throw new ApiError(`Failed to clear context: ${error.message}`, 400)
  }

  return createSuccessResponse({ 
    message: 'Context cleared',
    updated: true
  })
}

