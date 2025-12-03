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
      status: 'inactive'
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
  const redirectUrl = (siteUrl && siteUrl.trim()) || Deno.env.get('SITE_URL') || 'http://localhost:3000'
  const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${redirectUrl}/auth/callback`
  })

  let emailSent = true
  let emailError: string | null = null
  
  if (inviteError) {
    console.error('Failed to send invite email:', inviteError)
    emailSent = false
    emailError = inviteError.message || 'Unknown error sending invitation email'
    // Don't throw - user is created, email failure is not critical
    // But we'll return the status so frontend can handle it appropriately
  } else if (!inviteData) {
    // inviteUserByEmail might succeed but not return data - this could indicate email wasn't sent
    console.warn('inviteUserByEmail returned no error but also no data - email may not have been sent', { email })
    // Still mark as sent since no error was returned (could be a false positive)
  } else {
    console.log('Invitation email sent successfully', { email, inviteData })
  }

  return createSuccessResponse({ 
    data: dbUser,
    emailSent: emailSent,
    emailError: emailError
  })
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

async function inviteUser(supabase: any, email: string, customerId: string | null, roleId: string | undefined, managerId: string | undefined, invitedBy: string, siteUrl?: string) {
  // Assign default role if not provided (matching backend behavior)
  let finalRoleId = roleId
  if (!finalRoleId) {
    const { data: standardUserRole, error: roleError } = await supabase
      .from('roles')
      .select('role_id')
      .eq('name', 'standard_user')
      .single()

    if (roleError || !standardUserRole) {
      throw new Error(`Failed to find standard_user role: ${roleError?.message || 'Role not found'}`)
    }
    finalRoleId = standardUserRole.role_id
  }

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

  // Generate full_name with fallback (email prefix or 'Unnamed User')
  const fullName = email.split('@')[0] || 'Unnamed User'

  const { data: dbUser, error: dbError } = await supabase
    .from('users')
    .insert({
      auth_user_id: authUser.user.id,
      email,
      full_name: fullName,
      customer_id: normalizedCustomerId,
      role_id: finalRoleId,
      manager_id: managerId,
      status: 'inactive'
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
    await supabase.auth.admin.deleteUser(authUser.user.id)
    throw new Error(`Failed to create ${email}: ${dbError.message}`)
  }

  const redirectUrl = (siteUrl && siteUrl.trim()) || Deno.env.get('SITE_URL') || 'http://localhost:3000'
  const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${redirectUrl}/auth/callback`
  })

  if (inviteError) {
    console.error('Failed to send invite email:', inviteError)
    // Don't throw - user is created, email failure is not critical
  }

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

  // Get or find auth user
  let authUserId: string | null = targetUser.auth_user_id || null
  let authUserData: any = null

  // If user doesn't have auth_user_id, try to find existing auth user
  if (!authUserId) {
    // Try to create a new auth user first
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
        let found = false
        let page = 1
        const perPage = 1000
        
        while (!found && page <= 50) {
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
            authUserData = existingAuthUser
            found = true
            break
          }
          
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
      authUserData = authUser.user
    }
    
    // Link auth user to DB user
    if (authUserId) {
      const { error: updateError } = await supabase
        .from('users')
        .update({ auth_user_id: authUserId })
        .eq('user_id', targetUser.user_id)
      
      if (updateError) {
        console.error('Failed to link auth user to DB user:', updateError)
      }
    }
  } else {
    // Get existing auth user data
    const { data: authUser, error: getUserError } = await supabase.auth.admin.getUserById(authUserId)
    if (getUserError) {
      throw new ApiError(`Failed to get auth user: ${getUserError.message}`, 400)
    }
    authUserData = authUser?.user
  }

  // Resend invitation
  const redirectUrl = (siteUrl && siteUrl.trim()) || Deno.env.get('SITE_URL') || 'http://localhost:3000'
  const redirectToUrl = `${redirectUrl}/auth/callback`

  // Handle different scenarios
  if (authUserId && authUserData) {
    // User exists in auth
    if (authUserData.email_confirmed_at) {
      // Email is already confirmed
      // If user status is not active, send an invite email for sign-in
      if (targetUser.status !== 'active') {
        // Following backend pattern: delete existing auth user, then inviteUserByEmail()
        // This allows inviteUserByEmail() to recreate the user and send the email
        if (authUserId) {
          try {
            await supabase.auth.admin.deleteUser(authUserId)
          } catch (error) {
            console.error(`Failed to delete auth user ${authUserId}:`, error)
            // Continue anyway - inviteUserByEmail might still work
          }
        }

        // Now inviteUserByEmail() will create a new auth user and send the email
        const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
          redirectTo: redirectToUrl
        })

        if (inviteError) {
          throw new ApiError(`Failed to send sign-in link: ${inviteError.message}`, 400)
        }

        // Get the newly created auth user to update DB with new auth_user_id
        const { data: authUsers } = await supabase.auth.admin.listUsers()
        const newAuthUser = authUsers?.users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase())
        
        if (newAuthUser) {
          // Update DB with new auth_user_id
          await supabase
            .from('users')
            .update({ auth_user_id: newAuthUser.id })
            .eq('user_id', targetUser.user_id)
        }

        return createSuccessResponse({ 
          message: 'Sign-in link sent successfully. User can use the link to sign in.',
          type: 'magiclink'
        })
      } else {
        throw new ApiError('User email is already confirmed and account is active. User should be able to sign in.', 400)
      }
    }

    // User exists but email not confirmed - use inviteUserByEmail to send invite
    // Following backend pattern: delete existing auth user first, then inviteUserByEmail()
    if (authUserId) {
      try {
        await supabase.auth.admin.deleteUser(authUserId)
      } catch (error) {
        console.error(`Failed to delete auth user ${authUserId}:`, error)
        // Continue anyway - inviteUserByEmail might still work
      }
    }

    // Now inviteUserByEmail() will create a new auth user and send the email
    const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo: redirectToUrl
    })

    if (inviteError) {
      throw new ApiError(`Failed to send invite: ${inviteError.message}`, 400)
    }

    // Get the newly created auth user to update DB and metadata
    const { data: authUsers } = await supabase.auth.admin.listUsers()
    const newAuthUser = authUsers?.users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase())
    
    if (newAuthUser) {
      // Update DB with new auth_user_id
      await supabase
        .from('users')
        .update({ auth_user_id: newAuthUser.id })
        .eq('user_id', targetUser.user_id)

      // Update user metadata to track the resend
      await supabase.auth.admin.updateUserById(newAuthUser.id, {
        user_metadata: {
          ...(authUserData?.user_metadata || {}),
          invited: true,
          invited_by: user.user_id,
          last_invite_sent_at: new Date().toISOString()
        }
      })
    }
    
  } else if (!authUserId) {
    // No auth user exists - create new one and send invite
    const { data: newAuthUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: false,
      user_metadata: {
        invited: true,
        invited_by: user.user_id,
        invited_at: new Date().toISOString()
      }
    })

    if (createError) {
      throw new ApiError(`Failed to create auth user: ${createError.message}`, 400)
    }

    // Update DB with auth_user_id
    await supabase
      .from('users')
      .update({ auth_user_id: newAuthUser.user.id })
      .eq('user_id', targetUser.user_id)

    // Send invite for new user
    const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo: redirectToUrl
    })

    if (inviteError) {
      throw new ApiError(`Failed to send invite: ${inviteError.message}`, 400)
    }
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

