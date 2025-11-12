#!/usr/bin/env tsx

/**
 * Bootstrap System Administrator
 * 
 * This script creates a default system administrator user if none exists.
 * It should be run once after initial database migration.
 * 
 * Usage:
 *   npm run bootstrap
 * 
 * Requirements:
 *   - SUPABASE_URL environment variable
 *   - SUPABASE_SERVICE_ROLE_KEY environment variable
 *   - Database migration already applied (roles table exists)
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '..', '.env') })

const SYSTEM_ADMIN_EMAIL = 'admin@system.local'
const SYSTEM_ADMIN_PASSWORD = 'Admin@123456'
const SYSTEM_ADMIN_ROLE_NAME = 'system_admin'

interface Role {
  role_id: string
  name: string
  display_name: string
}

interface User {
  user_id: string
  email: string
  auth_user_id: string
  role_id: string
}

interface AuthUser {
  id: string
  email: string
}

async function main() {
  console.log('🚀 Starting System Administrator Bootstrap...\n')

  // Validate environment variables
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Error: Missing required environment variables')
    console.error('   Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env file')
    console.error('   See env.example for reference')
    process.exit(1)
  }

  // Create Supabase client with service role key (bypasses RLS)
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    // Step 1: Find System Administrator role by name
    console.log('📋 Step 1: Looking for system_admin role...')
    const { data: systemAdminRole, error: roleError } = await supabase
      .from('roles')
      .select('role_id, name, display_name')
      .eq('name', SYSTEM_ADMIN_ROLE_NAME)
      .single()

    if (roleError || !systemAdminRole) {
      console.error('❌ Error: System Administrator role not found in database')
      console.error('   Make sure the database migration has been applied')
      console.error('   Run: npx supabase db push')
      process.exit(1)
    }

    console.log(`✅ Found role: ${systemAdminRole.display_name} (${systemAdminRole.role_id})`)

    // Step 2: Count users with System Administrator role
    console.log('\n📊 Step 2: Checking for existing system administrators...')
    const { count, error: countError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role_id', systemAdminRole.role_id)
      .is('deleted_at', null)

    if (countError) {
      console.error('❌ Error: Failed to count system administrators')
      console.error(countError)
      process.exit(1)
    }

    if (count && count > 0) {
      console.log(`✅ System Administrator user(s) already exist (count: ${count})`)
      console.log('   No action needed.')
      process.exit(0)
    }

    console.log('⚠️  No System Administrator found. Creating default admin user...')

    // Step 3: Check if auth user already exists
    console.log('\n🔐 Step 3: Checking Supabase Auth for existing user...')
    let authUserId: string

    const { data: authData, error: listError } = await supabase.auth.admin.listUsers()

    if (listError) {
      console.error('❌ Error: Failed to list auth users')
      console.error(listError)
      process.exit(1)
    }

    const existingAuthUser = authData.users?.find(
      (u: AuthUser) => u.email === SYSTEM_ADMIN_EMAIL
    )

    if (existingAuthUser) {
      console.log('✅ Auth user already exists, will create database record')
      authUserId = existingAuthUser.id
    } else {
      // Create user in Supabase Auth
      console.log('📝 Creating auth user...')
      const { data: newAuthUser, error: authError } = await supabase.auth.admin.createUser({
        email: SYSTEM_ADMIN_EMAIL,
        password: SYSTEM_ADMIN_PASSWORD,
        email_confirm: true,
      })

      if (authError || !newAuthUser.user) {
        console.error('❌ Error: Failed to create auth user')
        console.error(authError)
        process.exit(1)
      }

      authUserId = newAuthUser.user.id
      console.log(`✅ Auth user created (${authUserId})`)
    }

    // Step 4: Create user record in database
    console.log('\n💾 Step 4: Creating database user record...')
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        email: SYSTEM_ADMIN_EMAIL,
        auth_user_id: authUserId,
        full_name: 'System Administrator',
        role_id: systemAdminRole.role_id,
        status: 'active',
        customer_id: null, // System-level admin
      })
      .select('user_id, email')
      .single()

    if (userError) {
      console.error('❌ Error: Failed to create user record')
      console.error(userError)
      process.exit(1)
    }

    // Success!
    console.log('\n✅ Default System Administrator created successfully!')
    console.log('\n' + '='.repeat(60))
    console.log('⚠️  IMPORTANT - DEFAULT CREDENTIALS')
    console.log('='.repeat(60))
    console.log(`Email:    ${SYSTEM_ADMIN_EMAIL}`)
    console.log(`Password: ${SYSTEM_ADMIN_PASSWORD}`)
    console.log('='.repeat(60))
    console.log('⚠️  CHANGE THIS PASSWORD IMMEDIATELY!')
    console.log('='.repeat(60))
    console.log('\nNext steps:')
    console.log('1. Log in to your application with the above credentials')
    console.log('2. Change the password immediately')
    console.log('3. Optionally create additional admin users')
    console.log('')

  } catch (error) {
    console.error('\n❌ Unexpected error during bootstrap:')
    console.error(error)
    process.exit(1)
  }
}

// Run the script
main()
