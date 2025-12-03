import { ApiUser, Status, TaxonomyItem } from '@/contexts/auth/types';
import { createClient } from '@/lib/supabase/client';
import { supabaseDB } from '@/lib/supabase/database';
import { edgeFunctions } from '@/lib/supabase/edge-functions';
import { SYSTEM_ROLES, isSystemAdministrator, isCustomerSuccess } from '@/lib/user-utils';
import { paths } from '@/paths';
import { config } from '@/config';
import type { SupabaseClient } from '@supabase/supabase-js';

// Helper function to extract domain from email
function getDomainFromEmail(email: string): string {
  if (!email) return '';
  const trimmed = email.trim().toLowerCase();
  const domainRegex = /@([^@\s]+)$/;
  const match = domainRegex.exec(trimmed);
  return match ? (match[1] || '') : '';
}

// Helper function to check if domain is a public email domain
function isPublicEmailDomain(domain: string): boolean {
  const PUBLIC_EMAIL_DOMAINS = new Set([
    'gmail.com', 'yahoo.com', 'yahoo.co.uk', 'yahoo.fr', 'yahoo.co.jp',
    'hotmail.com', 'hotmail.co.uk', 'hotmail.fr',
    'outlook.com', 'outlook.co.uk', 'outlook.fr',
    'live.com', 'msn.com', 'icloud.com', 'me.com', 'mac.com',
    'aol.com', 'protonmail.com', 'proton.me',
    'yandex.com', 'yandex.ru', 'mail.ru',
    'zoho.com', 'gmx.com', 'gmx.net', 'mail.com',
    'inbox.com', 'fastmail.com', 'fastmail.fm',
    'tutanota.com', 'tutanota.de', 'titan.email',
  ]);
  return PUBLIC_EMAIL_DOMAINS.has(domain.toLowerCase().trim());
}

// Helper function to get role ID by name
async function getRoleIdByName(roleName: string): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('roles')
    .select('role_id')
    .eq('name', roleName)
    .maybeSingle(); // Use maybeSingle instead of single to handle not found gracefully
  
  if (error) {
    console.error(`Failed to find role ${roleName}:`, error);
    return null;
  }
  
  if (!data) {
    console.error(`Role ${roleName} not found in database`);
    return null;
  }
  
  return data.role_id;
}

interface CustomerData {
  customer_id: string;
  name: string;
  email_domain: string | null;
}

interface RoleData {
  role_id: string;
  name: string;
  display_name: string | null;
}

interface StatusData {
  status_id: string;
  name: string;
  display_name: string | null;
}

interface UserWithRelations {
  user_id: string;
  auth_user_id: string;
  email: string;
  full_name: string | null;
  phone_number: string | null;
  avatar_url: string | null;
  customer_id: string | null;
  role_id: string | null;
  manager_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  customer: CustomerData | CustomerData[] | null;
  role: RoleData | RoleData[] | null;
}

interface RegisterUserPayload {
  firstName: string,
  lastName: string,
  email: string,
  password: string
}

interface CreateUserPayload {
  email: string;
  firstName: string;
  lastName: string;
  customerId?: string;
  roleId?: string;
  managerId?: string;
  status?: 'active' | 'inactive' | 'suspended';
}

interface UpdateUserPayload extends Partial<CreateUserPayload> {
  id: string;
}

interface EditUserInfoPayload extends Partial<CreateUserPayload> {
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  avatar?: string;
}

export interface GetUsersParams {
  page?: number;
  perPage?: number;
  search?: string;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  roleId?: string[];
  customerId?: string[];
  statusId?: string[];
  hasCustomer?: boolean;
}

interface GetUsersResponse {
  data: ApiUser[]; 
  meta: {
    total: number;
    page: number;
    lastPage: number;
    perPage: number;
    currentPage: number;
    prev: number | null;
    next: number | null;
  };
}

interface InviteUserPayload {
  email: string;
  customerId?: string;
  roleId?: string;
}

interface InviteMultipleUsersPayload {
  emails: string[];
  customerId?: string;
  roleId?: string;
}

export async function validateEmail(email: string): Promise<boolean> {
  // API call removed
  return true;
}

export async function resetPassword(email: string): Promise<{status: string, message: string}> {
  const supabase = createClient();
  
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/callback`,
  });

  if (error) {
    throw new Error(error.message || 'Failed to send password reset email');
  }

  return {
    status: 'success',
    message: 'Password reset email sent successfully'
  };
}

// Helper function to find or create customer for a user
async function findOrCreateCustomerForUser(
  supabase: SupabaseClient,
  domain: string,
  userId: string
): Promise<{ customerId: string | null; isNewCustomer: boolean }> {
  
  // Find existing customer by domain using RPC function (bypasses RLS)
  const { data: customerId, error: customerError } = await supabase.rpc(
    'find_customer_by_domain',
    { p_email_domain: domain }
  );

  if (customerError) {
    throw new Error(`Failed to check existing customer: ${customerError.message}`);
  }

  if (customerId) {
    return { customerId, isNewCustomer: false };
  }

  // Create new customer using database function
  const { data: functionResult, error: functionError } = await supabase.rpc(
    'create_customer_for_registration',
    {
      p_owner_id: userId,
      p_name: domain,
      p_email_domain: domain,
    }
  );

  if (functionError || !functionResult) {
    return { customerId: null, isNewCustomer: false };
  }

  return { customerId: functionResult, isNewCustomer: true };
}

// Helper function to assign role to user
async function assignUserRole(
  supabase: SupabaseClient,
  userId: string,
  customerId: string | null,
  isNewCustomer: boolean
): Promise<string | null> {
  let roleId: string | null = null;

  if (isNewCustomer) {
    // Get CUSTOMER_ADMINISTRATOR role ID
    const customerAdminRoleId = await getRoleIdByName(SYSTEM_ROLES.CUSTOMER_ADMINISTRATOR);
    if (!customerAdminRoleId) {
      throw new Error('Could not find customer_admin role. Please ensure the role exists in the database.');
    }
    roleId = customerAdminRoleId;
  } else {
    // User is joining an existing customer - assign standard_user role
    const standardUserRoleId = await getRoleIdByName(SYSTEM_ROLES.STANDARD_USER);
    if (!standardUserRoleId) {
      throw new Error('Could not find standard_user role. Please ensure the role exists in the database.');
    }
    roleId = standardUserRoleId;
  }

  // Always update customer_id if provided
  // We ensure roleId is always set (throw error if not), so we can always use the RPC function
  if (customerId && roleId) {
    // Update both customer_id and role_id using database function (bypasses RLS)
    const { error: updateUserError } = await supabase.rpc(
      'update_user_customer_and_role',
      {
        p_user_id: userId,
        p_customer_id: customerId,
        p_role_id: roleId,
      }
    );

    if (updateUserError) {
      throw new Error(`Failed to assign customer and role: ${updateUserError.message}`);
    }
  } else if (customerId && !roleId) {
    // This should never happen now since we throw if roleId is null
    throw new Error('Role ID is required to assign customer');
  } else if (!customerId) {
    console.warn('[assignUserRole] No customer ID provided, skipping customer assignment');
  }

  return roleId;
}

// Helper function to fetch user with relations
async function fetchUserWithRelations(
  supabase: SupabaseClient,
  userId: string,
  customerId: string | null,
  roleId: string | null,
  authUserId: string,
  email: string,
  fullName: string,
  status: string
): Promise<UserWithRelations> {
  // Try to fetch the user (without relations first to avoid RLS issues with joins)
  const { data: userBasic, error: userFetchError } = await supabase
    .from('users')
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
      deleted_at
    `)
    .eq('user_id', userId)
    .maybeSingle();

  let userData: UserWithRelations | null = null;

  if (!userFetchError && userBasic) {
    // Initialize userData with customer and role as null
    userData = {
      ...userBasic,
      customer: null,
      role: null,
    };
    
    // Try to fetch relations separately to avoid RLS issues with joins
    if (customerId) {
      const { data: customerData } = await supabase
        .from('customers')
        .select('customer_id, name, email_domain')
        .eq('customer_id', customerId)
        .maybeSingle();
      if (customerData) {
        userData.customer = customerData;
      }
    }
    
    if (roleId) {
      const { data: roleData } = await supabase
        .from('roles')
        .select('role_id, name, display_name')
        .eq('role_id', roleId)
        .maybeSingle();
      if (roleData) {
        userData.role = roleData;
      }
    }
  } else {
    console.warn('Failed to fetch user, constructing from known data:', userFetchError);
  }
  
  // If we couldn't fetch, construct the user data from what we know
  if (!userData) {
    // Fetch customer and role separately if needed
    let customer: CustomerData | null = null;
    let role: RoleData | null = null;
    
    if (customerId) {
      const { data: customerData } = await supabase
        .from('customers')
        .select('customer_id, name, email_domain')
        .eq('customer_id', customerId)
        .maybeSingle();
      if (customerData) {
        customer = customerData as CustomerData;
      }
    }
    
    if (roleId) {
      const { data: roleData } = await supabase
        .from('roles')
        .select('role_id, name, display_name')
        .eq('role_id', roleId)
        .maybeSingle();
      if (roleData) {
        role = roleData as RoleData;
      }
    }
    
    // Construct user data from known values
    userData = {
      user_id: userId,
      auth_user_id: authUserId,
      email,
      full_name: fullName,
      phone_number: null,
      avatar_url: null,
      customer_id: customerId,
      role_id: roleId,
      manager_id: null,
      status,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      customer,
      role,
    };
  }

  return userData;
}

export async function registerUser(payload: RegisterUserPayload): Promise<ApiUser> {
  try {
    const { firstName, lastName, email, password } = payload;
    const supabase = createClient();
    const fullName = `${firstName} ${lastName}`.trim();

    // Extract domain from email
    const domain = getDomainFromEmail(email);
    if (!domain) {
      throw new Error('Email address does not contain a valid domain');
    }

    // Check if it's a public email domain
    if (isPublicEmailDomain(domain)) {
      throw new Error('Please use your work email instead of a personal one (@gmail, @yahoo, etc.) to connect with your company. Personal email domains cannot join existing companies.');
    }

    // Check if email already exists
    const emailExists = await supabaseDB.checkEmailExists(email);
    if (emailExists) {
      throw new Error('User with this email already exists');
    }

    // Find existing customer by domain (will be handled in helper function after user creation)

    // Sign up user in Supabase Auth
    const redirectToUrl = `${config.site.url}${paths.auth.supabase.callback.implicit}`;
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectToUrl,
        data: {
          firstName,
          lastName,
        },
      },
    });

    if (signUpError) {
      throw new Error(`Failed to sign up in Supabase: ${signUpError.message}`);
    }

    if (!authData.user) {
      throw new Error('Failed to create auth user');
    }

    const authUserId = authData.user.id;

    // Create user record in database
    // If a session exists, we can use direct insert (RLS policy will allow it)
    // If no session (email confirmation required), use the database function
    let userId: string;
    
    if (authData.session) {
      // Session exists - use direct insert (RLS policy will allow it)
      const { data: newUser, error: createUserError } = await supabase
        .from('users')
        .insert({
          auth_user_id: authUserId,
          email,
          full_name: fullName,
          customer_id: null, // Will be set after customer creation
          status: 'inactive', // Will be activated after email confirmation
        })
        .select('user_id')
        .single();

      if (createUserError || !newUser) {
        throw new Error(`Failed to create user: ${createUserError?.message || 'Unknown error'}`);
      }

      userId = newUser.user_id;
    } else {
      // No session - use database function that bypasses RLS
      const { data: functionResult, error: functionError } = await supabase.rpc(
        'create_user_for_registration',
        {
          p_auth_user_id: authUserId,
          p_email: email,
          p_full_name: fullName,
          p_customer_id: null, // Will be set after customer creation
        }
      );

      if (functionError || !functionResult) {
        throw new Error(`Failed to create user: ${functionError?.message || 'Unknown error'}`);
      }

      userId = functionResult;
    }

    // Find or create customer for user
    const { customerId, isNewCustomer } = await findOrCreateCustomerForUser(supabase, domain, userId);

    // Assign appropriate role
    const roleId = await assignUserRole(supabase, userId, customerId, isNewCustomer);

    // Fetch user with relations
    const userData = await fetchUserWithRelations(
      supabase,
      userId,
      customerId,
      roleId,
      authUserId,
      email,
      fullName,
      'inactive'
    );

    // Map to ApiUser format
    const customer = userData.customer as CustomerData | CustomerData[] | null;
    const role = userData.role as RoleData | RoleData[] | null;

    return {
      id: userData.user_id,
      uid: userData.auth_user_id || undefined,
      email: userData.email,
      name: userData.full_name || fullName,
      firstName,
      lastName,
      avatar: userData.avatar_url || undefined,
      phoneNumber: userData.phone_number || undefined,
      customerId: userData.customer_id || undefined,
      roleId: userData.role_id || undefined,
      managerId: userData.manager_id || undefined,
      status: userData.status as Status,
      createdAt: userData.created_at,
      updatedAt: userData.updated_at || undefined,
      deletedAt: userData.deleted_at || undefined,
      customer: customer ? (Array.isArray(customer) ? {
        id: customer[0]?.customer_id || '',
        name: customer[0]?.name || '',
        domain: customer[0]?.email_domain || '',
      } : {
        id: customer.customer_id,
        name: customer.name,
        domain: customer.email_domain,
      }) : undefined,
      role: role ? (Array.isArray(role) ? {
        id: role[0]?.role_id || '',
        name: role[0]?.name || '',
        displayName: role[0]?.display_name || '',
      } : {
        id: role.role_id,
        name: role.name,
        displayName: role.display_name,
      }) : undefined,
    } as ApiUser;
  } catch (error: unknown) {
    console.error('Error in registerUser:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to register user';
    throw new Error(errorMessage);
  }
}

interface CreateOAuthUserParams {
  supabase: SupabaseClient;
  authUserId: string;
  email: string;
  userMetadata?: {
    firstName?: string;
    lastName?: string;
    full_name?: string;
  };
  name?: string;
  avatarUrl?: string;
}

export async function createOAuthUser(params: CreateOAuthUserParams): Promise<ApiUser | null> {
  try {
    const { supabase, authUserId, email, userMetadata, name, avatarUrl } = params;

    // Check if user already exists in database
    const { data: existingUser } = await supabase
      .from('users')
      .select('user_id, auth_user_id, email, full_name, customer_id, role_id, status')
      .eq('auth_user_id', authUserId)
      .maybeSingle();

    if (existingUser) {
      // User already exists, return null to indicate no action needed
      return null;
    }

    // Extract domain from email
    const domain = getDomainFromEmail(email);
    if (!domain) {
      throw new Error('Email address does not contain a valid domain');
    }

    // Check if it's a public email domain
    if (isPublicEmailDomain(domain)) {
      throw new Error('Please use your work email instead of a personal one (@gmail, @yahoo, etc.) to connect with your company. Personal email domains cannot join existing companies.');
    }

    // Extract firstName and lastName from user_metadata or name
    let firstName = '';
    let lastName = '';
    
    if (userMetadata?.firstName && userMetadata?.lastName) {
      firstName = userMetadata.firstName;
      lastName = userMetadata.lastName;
    } else if (userMetadata?.full_name) {
      const nameParts = userMetadata.full_name.trim().split(/\s+/);
      firstName = nameParts[0] || '';
      lastName = nameParts.slice(1).join(' ') || '';
    } else if (name) {
      const nameParts = name.trim().split(/\s+/);
      firstName = nameParts[0] || '';
      lastName = nameParts.slice(1).join(' ') || '';
    } else {
      // Fallback: use email prefix as first name
      firstName = email.split('@')[0] || '';
      lastName = '';
    }

    const fullName = `${firstName} ${lastName}`.trim() || email.split('@')[0] || 'User';

    // Create user record in database using RPC function to bypass RLS
    // Even though we have a session, using the RPC function is more reliable in server-side contexts
    const { data: userId, error: createUserError } = await supabase.rpc(
      'create_user_for_registration',
      {
        p_auth_user_id: authUserId,
        p_email: email,
        p_full_name: fullName,
        p_customer_id: null, // Will be set after customer creation
      }
    );

    if (createUserError || !userId) {
      throw new Error(`Failed to create user: ${createUserError?.message || 'Unknown error'}`);
    }

    // Update user status to 'active' and set avatar_url since OAuth users don't need email confirmation
    // The RPC function creates users as 'inactive' by default and doesn't support avatar_url
    const { error: updateStatusError } = await supabase
      .from('users')
      .update({ 
        status: 'active',
        avatar_url: avatarUrl || null
      })
      .eq('user_id', userId);

    if (updateStatusError) {
      // Don't throw - continue with customer/role assignment
    }

    // Find or create customer for user
    const { customerId, isNewCustomer } = await findOrCreateCustomerForUser(supabase, domain, userId);

    // Assign appropriate role
    const roleId = await assignUserRole(supabase, userId, customerId, isNewCustomer);

    // Fetch user with relations
    const userData = await fetchUserWithRelations(
      supabase,
      userId,
      customerId,
      roleId,
      authUserId,
      email,
      fullName,
      'active'
    );

    // Map to ApiUser format
    const customer = userData.customer as CustomerData | CustomerData[] | null;
    const role = userData.role as RoleData | RoleData[] | null;

    return {
      id: userData.user_id,
      uid: userData.auth_user_id || undefined,
      email: userData.email,
      name: userData.full_name || fullName,
      firstName,
      lastName,
      avatar: userData.avatar_url || avatarUrl || undefined,
      phoneNumber: userData.phone_number || undefined,
      customerId: userData.customer_id || undefined,
      roleId: userData.role_id || undefined,
      managerId: userData.manager_id || undefined,
      status: userData.status as Status,
      createdAt: userData.created_at,
      updatedAt: userData.updated_at || undefined,
      deletedAt: userData.deleted_at || undefined,
      customer: customer ? (Array.isArray(customer) ? {
        id: customer[0]?.customer_id || '',
        name: customer[0]?.name || '',
        domain: customer[0]?.email_domain || '',
      } : {
        id: customer.customer_id,
        name: customer.name,
        domain: customer.email_domain,
      }) : undefined,
      role: role ? (Array.isArray(role) ? {
        id: role[0]?.role_id || '',
        name: role[0]?.name || '',
        displayName: role[0]?.display_name || '',
      } : {
        id: role.role_id,
        name: role.name,
        displayName: role.display_name,
      }) : undefined,
    } as ApiUser;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to create OAuth user';
    throw new Error(errorMessage);
  }
}

export async function createUser(payload: CreateUserPayload): Promise<ApiUser> {
  // Check if email already exists
  const emailExists = await supabaseDB.checkEmailExists(payload.email);
  if (emailExists) {
    throw new Error('User with this email already exists');
  }
  
  const supabase = createClient();
  const fullName = `${payload.firstName} ${payload.lastName}`.trim();
  
  // Extract domain from email
  const domain = getDomainFromEmail(payload.email);
  if (!domain) {
    throw new Error('Email address does not contain a valid domain');
  }
  
  // Check if it's a public email domain (optional - you may want to allow these)
  // if (isPublicEmailDomain(domain)) {
  //   throw new Error('Public email domains are not allowed');
  // }
  
  try {
    // Check if customer with this domain already exists
    let customerId = payload.customerId;
    let existingCustomer = null;
    let isNewCustomer = false;
    let newCustomerId: string | null = null;
    
    if (!customerId && domain) {
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('customer_id')
        .eq('email_domain', domain)
        .single();
      
      if (customerError && customerError.code !== 'PGRST116') {
        // PGRST116 = not found, which is fine
        console.warn('Error checking for existing customer:', customerError);
      } else if (customerData) {
        existingCustomer = customerData;
        customerId = customerData.customer_id;
      } else {
        // Customer doesn't exist - we need to create it first, then use edge function
        isNewCustomer = true;
      }
    }
    
    // If this is a new customer, create it first (but don't set owner_id yet - user doesn't exist)
    if (isNewCustomer && domain) {
      // Get customer_admin role ID for later use
      const customerAdminRoleId = await getRoleIdByName(SYSTEM_ROLES.CUSTOMER_ADMINISTRATOR);
      
      if (!customerAdminRoleId) {
        console.warn('Could not find customer_admin role');
      }
      
      // Create new customer (owner_id will be set after user is created)
      const { data: newCustomer, error: customerCreateError } = await supabase
        .from('customers')
        .insert({
          name: domain,
          email_domain: domain,
          owner_id: null, // Will be updated after user is created
          lifecycle_stage: 'onboarding',
          active: true,
        })
        .select('customer_id')
        .single();
      
      if (customerCreateError || !newCustomer) {
        console.error('Failed to create customer:', customerCreateError);
        throw new Error(customerCreateError?.message || 'Failed to create customer');
      }
      
      customerId = newCustomer.customer_id;
      newCustomerId = newCustomer.customer_id;
    }
    
    // Use edge function to create user and send invitation email
    // This handles: creating auth user, creating db user, and sending invite email
    // Track email status (declared outside if block so it's accessible later)
    let emailSent = true; // Default to true for backward compatibility
    let emailError: string | null = null;
    
    if (customerId) {
      // Determine roleId - use customer_admin if new customer, otherwise use provided roleId
      let roleIdToUse: string;
      if (isNewCustomer) {
        const customerAdminRoleId = await getRoleIdByName(SYSTEM_ROLES.CUSTOMER_ADMINISTRATOR);
        if (!customerAdminRoleId) {
          throw new Error('Could not find customer_admin role. Please ensure the role exists in the database.');
        }
        roleIdToUse = customerAdminRoleId;
      } else {
        if (!payload.roleId) {
          throw new Error('Role ID is required when creating a user for an existing customer');
        }
        roleIdToUse = payload.roleId;
      }
      
      // Call edge function to create auth user, db user, and send invite
      interface InviteResult {
        data?: unknown;
        emailSent?: boolean;
        emailError?: string | null;
        [key: string]: unknown;
      }
      let inviteResult: InviteResult;
      
      try {
        inviteResult = await edgeFunctions.inviteUser({
          email: payload.email,
          customerId: customerId,
          roleId: roleIdToUse,
          managerId: payload.managerId,
          fullName: fullName,
        });
        
        // Verify the edge function completed successfully
        if (!inviteResult) {
          console.error('Edge function inviteUser returned no result', { email: payload.email, customerId, roleId: roleIdToUse });
          throw new Error('Edge function did not return a result - invitation email may not have been sent');
        }
        
        console.log('Edge function inviteUser completed successfully', { 
          email: payload.email, 
          result: inviteResult,
          emailSent: inviteResult?.emailSent,
          emailError: inviteResult?.emailError
        });
        
        // Check if email was actually sent
        // The edge function now returns emailSent status in the response
        emailSent = inviteResult?.emailSent !== false; // Default to true if not specified (backward compatibility)
        emailError = inviteResult?.emailError || null;
        
        if (!emailSent) {
          console.warn('User created but invitation email was not sent', { 
            email: payload.email, 
            emailError 
          });
          // Don't throw - user is created, but log warning
          // Frontend can handle this by showing a warning or allowing manual resend
        } else {
          console.log('Invitation email sent successfully', { email: payload.email });
        }
      } catch (inviteError) {
        console.error('Error calling edge function inviteUser:', inviteError);
        // Re-throw with more context
        const errorMessage = inviteError instanceof Error 
          ? inviteError.message 
          : 'Failed to send invitation email';
        throw new Error(`User creation failed: ${errorMessage}`);
      }
      
      // Wait a moment for the user to be created in the database
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // If this is a new customer, update the customer's owner_id with the created user
      if (isNewCustomer && newCustomerId) {
        // Fetch the created user to get their user_id
        const { data: createdUser, error: fetchUserError } = await supabase
          .from('users')
          .select('user_id')
          .eq('email', payload.email)
          .single();
        
        if (!fetchUserError && createdUser) {
          // Update customer with owner_id
          const { error: updateCustomerError } = await supabase
            .from('customers')
            .update({ owner_id: createdUser.user_id })
            .eq('customer_id', newCustomerId);
          
          if (updateCustomerError) {
            console.warn('Failed to update customer owner_id:', updateCustomerError);
          }
        }
      }
      
      // Update the user's status if needed (edge function sets status to 'invited' by default)
      // Note: full_name is now set by the edge function, so we only need to update status if needed
      if (payload.status) {
        const { error: updateError } = await supabase
          .from('users')
          .update({ 
            status: payload.status,
          })
          .eq('email', payload.email);
        
        if (updateError) {
          console.warn('Failed to update user status:', updateError);
          // Continue anyway - user is created and invite is sent
        }
      }
    } else {
      // No customerId and no domain - create user without customer (system admin case)
      // Note: This doesn't create an auth user or send invite email
      const { data: userData, error: createError } = await supabase
        .from('users')
        .insert({
          email: payload.email,
          full_name: fullName,
          customer_id: null,
          role_id: payload.roleId || null,
          manager_id: payload.managerId || null,
          status: payload.status || 'inactive',
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
          role:roles(role_id, name, display_name)
        `)
        .single();
      
      if (createError || !userData) {
        throw new Error(createError?.message || 'Failed to create user');
      }
      
      // Map to ApiUser format and return
      const customer = userData.customer as CustomerData | CustomerData[] | null;
      const role = userData.role as RoleData | RoleData[] | null;
      
      return {
        id: userData.user_id,
        uid: userData.auth_user_id || undefined,
        email: userData.email,
        name: userData.full_name || fullName,
        firstName: payload.firstName,
        lastName: payload.lastName,
        avatar: userData.avatar_url || undefined,
        phoneNumber: userData.phone_number || undefined,
        customerId: userData.customer_id || undefined,
        roleId: userData.role_id || undefined,
        managerId: userData.manager_id || undefined,
        status: userData.status as Status,
        createdAt: userData.created_at,
        updatedAt: userData.updated_at || undefined,
        deletedAt: userData.deleted_at || undefined,
        customer: customer ? (Array.isArray(customer) ? {
          id: customer[0]?.customer_id || '',
          name: customer[0]?.name || '',
          domain: customer[0]?.email_domain || '',
        } : {
          id: customer.customer_id,
          name: customer.name,
          domain: customer.email_domain,
        }) : undefined,
        role: role ? (Array.isArray(role) ? {
          id: role[0]?.role_id || '',
          name: role[0]?.name || '',
          displayName: role[0]?.display_name || '',
        } : {
          id: role.role_id,
          name: role.name,
          displayName: role.display_name,
        }) : undefined,
      } as ApiUser;
    }
    
    // Fetch the created user to return it (for the edge function path)
    const { data: userData, error: fetchError } = await supabase
      .from('users')
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
        role:roles(role_id, name, display_name)
      `)
      .eq('email', payload.email)
      .single();
    
    if (fetchError || !userData) {
      throw new Error('User was created but could not be fetched');
    }
    
    // Map to ApiUser format
    const customer = userData.customer as CustomerData | CustomerData[] | null;
    const role = userData.role as RoleData | RoleData[] | null;
    
    // Map to ApiUser format and add email status
    const apiUser = {
      id: userData.user_id,
      uid: userData.auth_user_id || undefined,
      email: userData.email,
      name: userData.full_name || fullName,
      firstName: payload.firstName,
      lastName: payload.lastName,
      avatar: userData.avatar_url || undefined,
      phoneNumber: userData.phone_number || undefined,
      customerId: userData.customer_id || undefined,
      roleId: userData.role_id || undefined,
      managerId: userData.manager_id || undefined,
      status: userData.status as Status,
      createdAt: userData.created_at,
      updatedAt: userData.updated_at || undefined,
      deletedAt: userData.deleted_at || undefined,
      customer: customer ? (Array.isArray(customer) ? {
        id: customer[0]?.customer_id || '',
        name: customer[0]?.name || '',
        domain: customer[0]?.email_domain || '',
      } : {
        id: customer.customer_id,
        name: customer.name,
        domain: customer.email_domain,
      }) : undefined,
      role: role ? (Array.isArray(role) ? {
        id: role[0]?.role_id || '',
        name: role[0]?.name || '',
        displayName: role[0]?.display_name || '',
      } : {
        id: role.role_id,
        name: role.name,
        displayName: role.display_name,
      }) : undefined,
      // Add email status if available (extended property)
      emailSent: emailSent,
      emailError: emailError,
    };
    
    return apiUser as ApiUser & { emailSent?: boolean; emailError?: string | null };
  } catch (error: unknown) {
    console.error('Error in createUser:', error);
    // If edge function fails, throw the error with more context
    const errorMessage = error instanceof Error ? error.message : 'Failed to create user and send invitation';
    throw new Error(errorMessage);
  }
}

export async function updateUser(payload: UpdateUserPayload): Promise<ApiUser> {
  const supabase = createClient();
  
  const fullName = payload.firstName && payload.lastName 
    ? `${payload.firstName} ${payload.lastName}`.trim() 
    : undefined;
  
  const { error } = await supabase
    .from('users')
    .update({
      full_name: fullName,
      email: payload.email,
      customer_id: payload.customerId,
      role_id: payload.roleId,
      manager_id: payload.managerId,
      status: payload.status,
    })
    .eq('user_id', payload.id);
  
  if (error) throw error;
  
  // Fetch and return updated user
  return getUserById(payload.id);
}

export async function getUsers(params: GetUsersParams = {}): Promise<GetUsersResponse> {
  const supabase = createClient();
  
  // Get current user (will be impersonated user if impersonating)
  const dbCurrentUser = await supabaseDB.getCurrentUser();
  
  // Convert to ApiUser format for role checking
  const currentUser: ApiUser = {
    id: dbCurrentUser.user_id,
    uid: dbCurrentUser.auth_user_id,
    email: dbCurrentUser.email,
    name: dbCurrentUser.full_name || '',
    firstName: dbCurrentUser.full_name?.split(' ')[0] || '',
    lastName: dbCurrentUser.full_name?.split(' ').slice(1).join(' ') || '',
    customerId: dbCurrentUser.customer_id || undefined,
    roleId: dbCurrentUser.role_id || undefined,
    managerId: dbCurrentUser.manager_id || undefined,
    status: dbCurrentUser.status as Status,
    role: dbCurrentUser.role ? {
      id: dbCurrentUser.role.role_id,
      name: dbCurrentUser.role.name,
      displayName: dbCurrentUser.role.display_name || '',
    } : undefined,
  } as ApiUser;
  
  // Determine which role IDs to filter by
  let roleIdsToFilter: string[] | undefined;
  
  if (params.roleId && params.roleId.length > 0) {
    // If roleId is explicitly provided, use it directly (for role page - allows any role)
    roleIdsToFilter = params.roleId;
  } else {
    // If roleId is NOT provided, restrict to system roles (for user management page)
    const customerAdminRoleId = await getRoleIdByName(SYSTEM_ROLES.CUSTOMER_ADMINISTRATOR);
    const standardUserRoleId = await getRoleIdByName(SYSTEM_ROLES.STANDARD_USER);
    const managerRoleId = await getRoleIdByName(SYSTEM_ROLES.MANAGER);
    
    // Build array of allowed role IDs (filter out nulls)
    const allowedRoleIds: string[] = [];
    if (customerAdminRoleId) allowedRoleIds.push(customerAdminRoleId);
    if (standardUserRoleId) allowedRoleIds.push(standardUserRoleId);
    if (managerRoleId) allowedRoleIds.push(managerRoleId);
    
    // If no allowed roles found, return empty result
    if (allowedRoleIds.length === 0) {
      return {
        data: [],
        meta: {
          total: 0,
          page: params.page || 1,
          lastPage: 1,
          perPage: params.perPage || 10,
          currentPage: params.page || 1,
          prev: null,
          next: null,
        },
      };
    }
    
    roleIdsToFilter = allowedRoleIds;
  }
  
  const page = params.page || 1;
  const perPage = params.perPage || 10;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  
  // Build the query with joins
  let query = supabase
    .from('users')
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
      role:roles(role_id, name, display_name)
    `, { count: 'exact' })
    .is('deleted_at', null); // Exclude deleted users
  
  // Apply role filter if we have role IDs to filter by
  if (roleIdsToFilter && roleIdsToFilter.length > 0) {
    query = query.in('role_id', roleIdsToFilter);
  }
  
  // Apply filters
  if (params.search) {
    query = query.or(`full_name.ilike.%${params.search}%,email.ilike.%${params.search}%`);
  }
  
  // SECURITY: Filter by customer_id based on user role
  const isSystemAdmin = isSystemAdministrator(currentUser);
  const isCS = isCustomerSuccess(currentUser);
  
  // If user is customer success, get their assigned customers
  let assignedCustomerIds: string[] | null = null;
  if (isCS && dbCurrentUser.user_id) {
    const { data: csAssignments, error: csError } = await supabase
      .from('customer_success_owned_customers')
      .select('customer_id')
      .eq('user_id', dbCurrentUser.user_id);
    
    if (csError) {
      throw csError;
    }
    
    assignedCustomerIds = (csAssignments || []).map((assignment: { customer_id: string }) => assignment.customer_id);
    
    // If no assigned customers, return empty result
    if (assignedCustomerIds.length === 0) {
      return {
        data: [],
        meta: {
          total: 0,
          page,
          lastPage: 1,
          perPage,
          currentPage: page,
          prev: null,
          next: null,
        },
      };
    }
  }
  
  // If user is customer admin or manager, restrict to their customer
  if (!isSystemAdmin && !isCS && currentUser.customerId) {
    // If params.customerId is provided, intersect it with current user's customer
    if (params.customerId && params.customerId.length > 0) {
      // Only allow filtering by customer if it matches the current user's customer
      const allowedCustomerIds = params.customerId.filter(id => id === currentUser.customerId);
      if (allowedCustomerIds.length > 0) {
        query = query.in('customer_id', allowedCustomerIds);
      } else {
        // If no matching customer IDs, return empty result
        return {
          data: [],
          meta: {
            total: 0,
            page,
            lastPage: 1,
            perPage,
            currentPage: page,
            prev: null,
            next: null,
          },
        };
      }
    } else {
      // No customer filter in params, restrict to current user's customer
      query = query.eq('customer_id', currentUser.customerId);
    }
  } else if (isCS && assignedCustomerIds && assignedCustomerIds.length > 0) {
    // Customer success - filter by assigned customers
    if (params.customerId && params.customerId.length > 0) {
      // Intersect params.customerId with assigned customer IDs
      const allowedCustomerIds = params.customerId.filter(id => assignedCustomerIds!.includes(id));
      if (allowedCustomerIds.length > 0) {
        query = query.in('customer_id', allowedCustomerIds);
      } else {
        // If no matching customer IDs, return empty result
        return {
          data: [],
          meta: {
            total: 0,
            page,
            lastPage: 1,
            perPage,
            currentPage: page,
            prev: null,
            next: null,
          },
        };
      }
    } else {
      // No customer filter in params, restrict to assigned customers
      query = query.in('customer_id', assignedCustomerIds);
    }
  } else if (isSystemAdmin && params.customerId && params.customerId.length > 0) {
    // System admin - can filter by any customer
    query = query.in('customer_id', params.customerId);
  }
  
  if (params.statusId && params.statusId.length > 0) {
    query = query.in('status', params.statusId);
  }
  
  if (params.hasCustomer !== undefined) {
    if (params.hasCustomer) {
      query = query.not('customer_id', 'is', null);
    } else {
      query = query.is('customer_id', null);
    }
  }
  
  // Apply sorting - map 'name' to 'full_name' since users table doesn't have 'name' column
  const validOrderColumns = ['user_id', 'auth_user_id', 'email', 'full_name', 'phone_number', 'avatar_url', 'customer_id', 'role_id', 'manager_id', 'status', 'created_at', 'updated_at', 'deleted_at'];
  let orderBy = params.orderBy || 'created_at';
  // Map 'name' to 'full_name' for users table
  if (orderBy === 'name') {
    orderBy = 'full_name';
  }
  // Only allow valid columns
  if (!validOrderColumns.includes(orderBy)) {
    orderBy = 'created_at';
  }
  const orderDirection = params.orderDirection || 'desc';
  query = query.order(orderBy, { ascending: orderDirection === 'asc' });
  
  // Apply pagination
  query = query.range(from, to);
  
  const { data, error, count } = await query;
  
  if (error) throw error;
  
  const total = count || 0;
  const lastPage = Math.ceil(total / perPage);
  
  return {
    data: (data || []).map((user: UserWithRelations) => ({
      id: user.user_id,
      uid: user.auth_user_id,
      email: user.email,
      name: user.full_name || '',
      firstName: user.full_name?.split(' ')[0] || '',
      lastName: user.full_name?.split(' ').slice(1).join(' ') || '',
      avatar: user.avatar_url || undefined,
      phoneNumber: user.phone_number || undefined,
      customerId: user.customer_id || undefined,
      roleId: user.role_id || undefined,
      managerId: user.manager_id || undefined,
      status: user.status as Status,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      deletedAt: user.deleted_at || undefined,
      customer: user.customer ? (Array.isArray(user.customer) ? {
        id: user.customer[0]?.customer_id || '',
        name: user.customer[0]?.name || '',
        domain: user.customer[0]?.email_domain || '',
      } : {
        id: user.customer.customer_id,
        name: user.customer.name,
        domain: user.customer.email_domain,
      }) : undefined,
      role: user.role ? (Array.isArray(user.role) ? {
        id: user.role[0]?.role_id || '',
        name: user.role[0]?.name || '',
        displayName: user.role[0]?.display_name || '',
      } : {
        id: user.role.role_id,
        name: user.role.name,
        displayName: user.role.display_name,
      }) : undefined,
    })) as ApiUser[],
    meta: {
      total,
      page,
      lastPage,
      perPage,
      currentPage: page,
      prev: page > 1 ? page - 1 : null,
      next: page < lastPage ? page + 1 : null,
    },
  };
}

interface ManagerData {
  manager_id: string;
  full_name: string;
  email: string;
}

export async function getUserById(id: string): Promise<ApiUser> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('users')
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
    .eq('user_id', id)
    .single();
  
  if (error) {
    console.error('Error fetching user by id:', error);
    throw error;
  }
  
  if (!data) {
    throw new Error('User not found');
  }
  
  const customer = data.customer as CustomerData | CustomerData[] | null;
  const role = data.role as RoleData | RoleData[] | null;
  const manager = data.manager as ManagerData | ManagerData[] | null;
  
  return {
    id: data.user_id,
    uid: data.auth_user_id || undefined,
    email: data.email,
    name: data.full_name || '',
    firstName: data.full_name?.split(' ')[0] || '',
    lastName: data.full_name?.split(' ').slice(1).join(' ') || '',
    avatar: data.avatar_url || undefined,
    phoneNumber: data.phone_number || undefined,
    customerId: data.customer_id || undefined,
    roleId: data.role_id || undefined,
    managerId: data.manager_id || undefined,
    status: data.status as Status,
    createdAt: data.created_at,
    updatedAt: data.updated_at || undefined,
    deletedAt: data.deleted_at || undefined,
    customer: customer ? (Array.isArray(customer) ? {
      id: customer[0]?.customer_id || '',
      name: customer[0]?.name || '',
      domain: customer[0]?.email_domain || '',
    } : {
      id: customer.customer_id,
      name: customer.name,
      domain: customer.email_domain,
    }) : undefined,
    role: role ? (Array.isArray(role) ? {
      id: role[0]?.role_id || '',
      name: role[0]?.name || '',
      displayName: role[0]?.display_name || '',
    } : {
      id: role.role_id,
      name: role.name,
      displayName: role.display_name,
    }) : undefined,
    manager: manager ? (Array.isArray(manager) ? {
      id: manager[0]?.manager_id || '',
      name: manager[0]?.full_name || manager[0]?.email || '',
    } : {
      id: manager.manager_id,
      name: manager.full_name || manager.email,
    }) : undefined,
  } as ApiUser;
}

export async function getUserInfo(): Promise<ApiUser> {
  const dbUser = await supabaseDB.getCurrentUser();
  
  // Map database response to API format
  return {
    id: dbUser.user_id,
    uid: dbUser.auth_user_id,
    email: dbUser.email,
    name: dbUser.full_name || '',
    firstName: dbUser.full_name?.split(' ')[0] || '',
    lastName: dbUser.full_name?.split(' ').slice(1).join(' ') || '',
    avatar: dbUser.avatar_url || undefined,
    phoneNumber: dbUser.phone_number || undefined,
    customerId: dbUser.customer_id || undefined,
    roleId: dbUser.role_id || undefined,
    managerId: dbUser.manager_id || undefined,
    status: dbUser.status as Status,
    createdAt: dbUser.created_at,
    updatedAt: dbUser.updated_at,
    deletedAt: dbUser.deleted_at || undefined,
    customer: dbUser.customer ? {
      id: dbUser.customer.customer_id,
      name: dbUser.customer.name,
      domain: dbUser.customer.email_domain || null,
    } : undefined,
    role: dbUser.role ? {
      id: dbUser.role.role_id,
      name: dbUser.role.name,
      displayName: dbUser.role.display_name,
    } : undefined,
  } as ApiUser;
}

export async function editUserInfo(payload: EditUserInfoPayload): Promise<ApiUser> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  
  // Get current user to find user_id
  const currentUser = await supabaseDB.getCurrentUser();
  
  // Update user with mapped fields
  const fullName = `${payload.firstName || ''} ${payload.lastName || ''}`.trim();
  await supabaseDB.updateUser(currentUser.user_id, {
    full_name: fullName || undefined,
    phone_number: payload.phoneNumber,
    avatar_url: payload.avatar,
  });
  
  // Fetch and return updated user
  return getUserInfo();
}

export async function deleteUser(id: string): Promise<ApiUser> {
  const supabase = createClient();
  
  // Fetch user before deletion
  const userToDelete = await getUserById(id);
  
  const { error } = await supabase
    .from('users')
    .update({
      deleted_at: new Date().toISOString(),
      status: 'inactive',
    })
    .eq('user_id', id);
  
  if (error) throw error;
  
  return userToDelete;
}

export async function getStatuses(): Promise<TaxonomyItem[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('statuses')
    .select('status_id, name, display_name')
    .order('name');
  
  if (error) throw error;
  
  return (data || []).map((status: StatusData) => ({
    id: status.status_id,
    name: status.display_name || status.name,
  }));
}

export async function inviteUser(payload: InviteUserPayload): Promise<void> {
  await edgeFunctions.inviteUser({
    email: payload.email,
    customerId: payload.customerId || null,
    roleId: payload.roleId || '',
  });
}

export async function resendInviteUser(email: string): Promise<void> {
  await edgeFunctions.resendInvite(email);
}

export async function inviteMultipleUsers(payload: InviteMultipleUsersPayload): Promise<void> {
  await edgeFunctions.inviteMultipleUsers({
    emails: payload.emails,
    customerId: payload.customerId || null,
    roleId: payload.roleId || '',
  });
}