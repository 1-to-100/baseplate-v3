import { ApiUser, Status, TaxonomyItem } from '@/contexts/auth/types';
import { createClient } from '@/lib/supabase/client';
import { supabaseDB } from '@/lib/supabase/database';
import { edgeFunctions } from '@/lib/supabase/edge-functions';
import { SYSTEM_ROLES } from '@/lib/user-utils';
import { paths } from '@/paths';
import { config } from '@/config';

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

    // Find existing customer by domain
    const { data: existingCustomer, error: customerError } = await supabase
      .from('customers')
      .select('customer_id')
      .eq('email_domain', domain)
      .maybeSingle();

    if (customerError && customerError.code !== 'PGRST116') {
      // PGRST116 = not found, which is fine
      throw new Error(`Failed to check existing customer: ${customerError.message}`);
    }

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
          customer_id: existingCustomer?.customer_id || null,
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
          p_customer_id: existingCustomer?.customer_id || null,
        }
      );

      if (functionError || !functionResult) {
        throw new Error(`Failed to create user: ${functionError?.message || 'Unknown error'}`);
      }

      userId = functionResult;
    }

    let customerId = existingCustomer?.customer_id || null;
    let roleId: string | null = null;

    // If no existing customer, create new customer and assign role
    if (!existingCustomer) {
      // Get CUSTOMER_ADMINISTRATOR role ID
      const customerAdminRoleId = await getRoleIdByName(SYSTEM_ROLES.CUSTOMER_ADMINISTRATOR);
      if (!customerAdminRoleId) {
        throw new Error('Could not find customer_admin role. Please ensure the role exists in the database.');
      }
      roleId = customerAdminRoleId;

      // Create new customer using database function (more reliable than direct insert with RLS)
      let newCustomerId: string | null = null;
      
      const { data: functionResult, error: functionError } = await supabase.rpc(
        'create_customer_for_registration',
        {
          p_owner_id: userId,
          p_name: domain,
          p_email_domain: domain,
        }
      );

      if (functionError || !functionResult) {
        console.warn('Failed to create customer:', functionError);
      } else {
        newCustomerId = functionResult;
      }

      if (newCustomerId) {
        customerId = newCustomerId;

        // Update user with customer_id and role_id using database function (bypasses RLS)
        const { error: updateUserError } = await supabase.rpc(
          'update_user_customer_and_role',
          {
            p_user_id: userId,
            p_customer_id: customerId,
            p_role_id: roleId,
          }
        );

        if (updateUserError) {
          console.warn('Failed to update user with customer and role:', updateUserError);
        }
      }
    } else {
      // User is joining an existing customer - assign standard_user role
      const standardUserRoleId = await getRoleIdByName(SYSTEM_ROLES.STANDARD_USER);
      if (!standardUserRoleId) {
        console.warn('Could not find standard_user role. User will be created without a role.');
      } else {
        roleId = standardUserRoleId;

        // Update user with role_id using database function (bypasses RLS)
        // Note: customer_id is already set from existingCustomer, so we pass it again
        const { error: updateUserError } = await supabase.rpc(
          'update_user_customer_and_role',
          {
            p_user_id: userId,
            p_customer_id: customerId, // Already set from existingCustomer
            p_role_id: roleId,
          }
        );

        if (updateUserError) {
          console.warn('Failed to update user with standard_user role:', updateUserError);
        }
      }
    }

    // Fetch and return created user with relations
    // Try to fetch with relations, but if RLS blocks it, construct from known data
    let userData: UserWithRelations | null = null;
    
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
        status: 'inactive',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
        customer,
        role,
      };
    }

    // Ensure userData is not null (should never happen, but TypeScript needs this)
    if (!userData) {
      throw new Error('Failed to create or fetch user data');
    }

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
      const inviteResult = await edgeFunctions.inviteUser({
        email: payload.email,
        customerId: customerId,
        roleId: roleIdToUse,
        managerId: payload.managerId,
        fullName: fullName,
      });
      
      // Verify the edge function completed successfully
      if (!inviteResult) {
        throw new Error('Edge function did not return a result');
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
  
  // Get role IDs for customer_admin and standard_user (only these roles should be displayed)
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
  
  // If params.roleId is provided, intersect with allowed roles
  let roleIdsToFilter = allowedRoleIds;
  if (params.roleId && params.roleId.length > 0) {
    roleIdsToFilter = params.roleId.filter(id => allowedRoleIds.includes(id));
    // If no matching roles after intersection, return empty result
    if (roleIdsToFilter.length === 0) {
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
    .is('deleted_at', null) // Exclude deleted users
    .in('role_id', roleIdsToFilter); // Only show customer_admin and standard_user roles
  
  // Apply filters
  if (params.search) {
    query = query.or(`full_name.ilike.%${params.search}%,email.ilike.%${params.search}%`);
  }
  
  if (params.customerId && params.customerId.length > 0) {
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