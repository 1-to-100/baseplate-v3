/// <reference lib="deno.ns" />
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { createServiceClient } from '../_shared/supabase.ts'
import { authenticateRequest, isSystemAdmin } from '../_shared/auth.ts'
import { ApiError, createErrorResponse, createSuccessResponse } from '../_shared/errors.ts'

Deno.serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const user = await authenticateRequest(req)
    const body = await req.json()
    const { action } = body

    // All admin operations require system admin role
    if (!isSystemAdmin(user)) {
      throw new ApiError('Only system administrators can perform admin operations', 403)
    }

    switch (action) {
      case 'create-customer':
        return await handleCreateCustomer(body)
      default:
        throw new ApiError('Invalid action', 400)
    }
  } catch (error) {
    return createErrorResponse(error)
  }
})

async function handleCreateCustomer(body: any) {
  const { name, domain, lifecycle_stage } = body

  if (!name) {
    throw new ApiError('Customer name is required', 400)
  }

  const supabase = createServiceClient()

  // Create customer
  const { data: customer, error } = await supabase
    .from('customers')
    .insert({
      name,
      domain,
      lifecycle_stage: lifecycle_stage || 'prospect'
    })
    .select()
    .single()

  if (error) {
    throw new ApiError(`Failed to create customer: ${error.message}`, 400)
  }

  return createSuccessResponse({ data: customer }, 201)
}

