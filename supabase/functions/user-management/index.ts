import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { createServiceClient } from '../_shared/supabase.ts'
import { authenticateRequest, isSystemAdmin } from '../_shared/auth.ts'
import { ApiError, createErrorResponse, createSuccessResponse } from '../_shared/errors.ts'

serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const user = await authenticateRequest(req)
    const body = await req.json()
    const { action } = body

    switch (action) {
      case 'invite':
        return await handleInvite(user, body)
      case 'invite-multiple':
        return await handleInviteMultiple(user, body)
      case 'resend-invite':
        return await handleResendInvite(user, body)
      case 'ban':
        return await handleBan(user, body)
      case 'unban':
        return await handleUnban(user, body)
      default:
        throw new ApiError('Invalid action', 400)
    }
  } catch (error) {
    return createErrorResponse(error)
  }
})

async function handleInvite(user: any, body: any) {
  const { email, customerId, roleId, managerId, fullName, siteUrl } = body

  // Convert empty string to null for customerId
  const normalizedCustomerId = customerId === '' || customerId === undefined ? null : customerId

  // Authorization
  if (!isSystemAdmin(user) && !user.customer_id) {
    throw new ApiError('No access to invite users', 403)
  }

  if (!isSystemAdmin(user) && user.customer_id !== normalizedCustomerId) {
    throw new ApiError('Cannot invite users for another customer', 403)
  }

  const supabase = createServiceClient()

  // Check if user already exists
  const { data: existing } = await supabase
    .from('users')
    .select('user_id')
    .eq('email', email)
    .single()

  if (existing) {
    throw new ApiError('User with this email already exists', 409)
  }

  // Create auth user
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    email_confirm: false,
    user_metadata: {
      invited: true,
      invited_by: user.user_id,
      invited_at: new Date().toISOString()
    }
  })

  if (authError) {
    throw new ApiError(`Failed to create auth user: ${authError.message}`, 400)
  }

  // Create database record
  const { data: dbUser, error: dbError } = await supabase
    .from('users')
    .insert({
      auth_user_id: authUser.user.id,
      email,
      full_name: fullName || email.split('@')[0], // Use email prefix as fallback
      customer_id: normalizedCustomerId,
      role_id: roleId,
      manager_id: managerId,
      status: 'invited'
    })
    .select(`
      user_id,
      auth_user_id,
      email,
      full_name,
      phone_number,
      avatar_url,
      customer_id,
      role_id,
      manager_id,
      status,
      created_at,
      updated_at,
      deleted_at,
      customer:customers!users_customer_id_fkey(customer_id, name, email_domain),
      role:roles(role_id, name, display_name),
      manager:managers(manager_id, full_name, email)
    `)
    .single()

  if (dbError) {
    // Rollback: delete auth user
    await supabase.auth.admin.deleteUser(authUser.user.id)
    throw new ApiError(`Failed to create user record: ${dbError.message}`, 400)
  }

  // Send invitation email
  const redirectUrl = siteUrl || Deno.env.get('SITE_URL') || 'http://localhost:3000'
  console.log('Invite redirect URL:', { siteUrl, envUrl: Deno.env.get('SITE_URL'), redirectUrl })
  const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${redirectUrl}/auth/callback`
  })

  if (inviteError) {
    console.error('Failed to send invite email:', inviteError)
    // Don't throw - user is created, email failure is not critical
  }

  return createSuccessResponse({ data: dbUser })
}

async function handleInviteMultiple(user: any, body: any) {
  const { emails, customerId, roleId, managerId, siteUrl } = body

  // Convert empty string to null for customerId
  const normalizedCustomerId = customerId === '' || customerId === undefined ? null : customerId

  // Authorization
  if (!isSystemAdmin(user) && !user.customer_id) {
    throw new ApiError('No access to invite users', 403)
  }

  if (!isSystemAdmin(user) && user.customer_id !== normalizedCustomerId) {
    throw new ApiError('Cannot invite users for another customer', 403)
  }

  // Check for duplicates
  const uniqueEmails = [...new Set(emails)]
  if (uniqueEmails.length !== emails.length) {
    throw new ApiError('Duplicate emails in request', 400)
  }

  const supabase = createServiceClient()

  // Check if any emails already exist
  const { data: existing } = await supabase
    .from('users')
    .select('email')
    .in('email', uniqueEmails)

  if (existing && existing.length > 0) {
    const existingEmails = existing.map((u: any) => u.email)
    throw new ApiError(
      `The following emails already exist: ${existingEmails.join(', ')}`,
      409
    )
  }

  // Create users in parallel
  const results = await Promise.allSettled(
    uniqueEmails.map((email: string) => 
      inviteUser(supabase, email, normalizedCustomerId, roleId, managerId, user.user_id, siteUrl)
    )
  )

  const successful = results
    .filter((r: any) => r.status === 'fulfilled')
    .map((r: any) => r.value)
  
  const failed = results
    .filter((r: any) => r.status === 'rejected')
    .map((r: any) => r.reason)

  return createSuccessResponse({ 
    data: successful,
    errors: failed,
    summary: {
      total: uniqueEmails.length,
      successful: successful.length,
      failed: failed.length
    }
  })
}

async function inviteUser(supabase: any, email: string, customerId: string | null, roleId: string, managerId: string | undefined, invitedBy: string, siteUrl?: string) {
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    email_confirm: false,
    user_metadata: {
      invited: true,
      invited_by: invitedBy,
      invited_at: new Date().toISOString()
    }
  })

  if (authError) throw new Error(`Failed to create ${email}: ${authError.message}`)

  // Convert empty string to null for customerId
  const normalizedCustomerId = customerId === '' || customerId === undefined ? null : customerId

  const { data: dbUser, error: dbError } = await supabase
    .from('users')
    .insert({
      auth_user_id: authUser.user.id,
      email,
      customer_id: normalizedCustomerId,
      role_id: roleId,
      manager_id: managerId,
      status: 'invited'
    })
    .select()
    .single()

  if (dbError) {
    await supabase.auth.admin.deleteUser(authUser.user.id)
    throw new Error(`Failed to create ${email}: ${dbError.message}`)
  }

  const redirectUrl = siteUrl || Deno.env.get('SITE_URL') || 'http://localhost:3000'
  console.log('Invite multiple redirect URL:', { siteUrl, envUrl: Deno.env.get('SITE_URL'), redirectUrl })
  await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${redirectUrl}/auth/callback`
  })

  return dbUser
}

async function handleResendInvite(user: any, body: any) {
  const { email, siteUrl } = body

  const supabase = createServiceClient()

  // Get user
  const { data: targetUser } = await supabase
    .from('users')
    .select('user_id, customer_id, auth_user_id, status')
    .eq('email', email)
    .single()

  if (!targetUser) {
    throw new ApiError('User not found', 404)
  }

  // Allow resending invite for active users if they don't have auth_user_id
  // This handles cases where user was created without auth user
  if (targetUser.status === 'active' && targetUser.auth_user_id) {
    throw new ApiError('User is already active', 400)
  }

  // Authorization
  if (!isSystemAdmin(user) && user.customer_id !== targetUser.customer_id) {
    throw new ApiError('Cannot resend invite for user from another customer', 403)
  }

  // If user doesn't have auth_user_id, create or find auth user first
  if (!targetUser.auth_user_id) {
    let authUserId: string | null = null
    
    // First, try to create a new auth user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: false,
      user_metadata: {
        invited: true,
        invited_by: user.user_id,
        invited_at: new Date().toISOString()
      }
    })

    if (authError) {
      // If creation fails because user already exists, find and link it
      if (authError.message?.includes('already registered') || 
          authError.message?.includes('already exists') ||
          authError.message?.includes('User already registered')) {
        
        // Search for existing auth user by email
        // We need to paginate through all users to find by email
        let found = false
        let page = 1
        const perPage = 1000 // Use larger page size for efficiency
        
        while (!found && page <= 50) { // Search up to 50k users
          const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers({
            page,
            perPage
          })
          
          if (listError) {
            console.error('Error listing users:', listError)
            break
          }
          
          if (!authUsers?.users || authUsers.users.length === 0) {
            break
          }
          
          const existingAuthUser = authUsers.users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase())
          if (existingAuthUser) {
            authUserId = existingAuthUser.id
            found = true
            break
          }
          
          // If we got fewer users than perPage, we've reached the end
          if (authUsers.users.length < perPage) {
            break
          }
          
          page++
        }
        
        if (!authUserId) {
          throw new ApiError(`Auth user with email ${email} exists but could not be found. Please contact support.`, 400)
        }
      } else {
        throw new ApiError(`Failed to create auth user: ${authError.message}`, 400)
      }
    } else {
      // Successfully created new auth user
      authUserId = authUser.user.id
    }
    
    // Link auth user to DB user
    if (authUserId) {
      const { error: updateError } = await supabase
        .from('users')
        .update({ auth_user_id: authUserId })
        .eq('user_id', targetUser.user_id)
      
      if (updateError) {
        console.error('Failed to link auth user to DB user:', updateError)
        // Don't throw - we can still try to send the invite
      }
    }
  }

  // Resend invitation
  const redirectUrl = siteUrl || Deno.env.get('SITE_URL') || 'http://localhost:3000'
  console.log('Resend invite redirect URL:', { siteUrl, envUrl: Deno.env.get('SITE_URL'), redirectUrl })
  const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${redirectUrl}/auth/callback`
  })

  if (error) {
    throw new ApiError(`Failed to resend invite: ${error.message}`, 400)
  }

  return createSuccessResponse({ message: 'Invitation resent successfully' })
}

async function handleBan(user: any, body: any) {
  const { userId } = body

  // Only system admins can ban users
  if (!isSystemAdmin(user)) {
    throw new ApiError('Only system administrators can ban users', 403)
  }

  const supabase = createServiceClient()

  // Get target user
  const { data: targetUser } = await supabase
    .from('users')
    .select('auth_user_id, email')
    .eq('user_id', userId)
    .single()

  if (!targetUser) {
    throw new ApiError('User not found', 404)
  }

  // Ban user
  const { error } = await supabase.auth.admin.updateUserById(
    targetUser.auth_user_id,
    { ban_duration: '876000h' } // 100 years
  )

  if (error) {
    throw new ApiError(`Failed to ban user: ${error.message}`, 400)
  }

  return createSuccessResponse({ message: 'User banned successfully' })
}

async function handleUnban(user: any, body: any) {
  const { userId } = body

  // Only system admins can unban users
  if (!isSystemAdmin(user)) {
    throw new ApiError('Only system administrators can unban users', 403)
  }

  const supabase = createServiceClient()

  // Get target user
  const { data: targetUser } = await supabase
    .from('users')
    .select('auth_user_id, email')
    .eq('user_id', userId)
    .single()

  if (!targetUser) {
    throw new ApiError('User not found', 404)
  }

  // Unban user
  const { error } = await supabase.auth.admin.updateUserById(
    targetUser.auth_user_id,
    { ban_duration: 'none' }
  )

  if (error) {
    throw new ApiError(`Failed to unban user: ${error.message}`, 400)
  }

  return createSuccessResponse({ message: 'User unbanned successfully' })
}

