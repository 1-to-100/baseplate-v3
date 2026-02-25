/**
 * Authentication Utilities for Edge Functions
 *
 * Provides user authentication and RLS-enforced Supabase client creation.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { createServiceClient } from './supabase.ts';
import { ApiError } from './errors.ts';
import type { AuthenticatedUser } from './types.ts';

// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

/**
 * Result of authenticating a request.
 * Includes both user info and an RLS-enforced Supabase client.
 */
export interface AuthResult {
  /** Authenticated user information */
  user: AuthenticatedUser;
  /** Supabase client with RLS enforced for this user's JWT */
  userClient: SupabaseClient;
}

/**
 * Authenticates a request and returns user info.
 *
 * @param req - The incoming request with Authorization header
 * @returns AuthenticatedUser with id, email, customer_id, and role
 * @throws ApiError if authentication fails
 *
 * @example
 * ```typescript
 * const user = await authenticateRequest(req);
 * console.log(user.id, user.customer_id);
 * ```
 */
export async function authenticateRequest(req: Request): Promise<AuthenticatedUser> {
  const { user } = await _authenticate(req);
  return user;
}

/**
 * Authenticates a request and returns both user info and an RLS-enforced client.
 *
 * Use this when you need a Supabase client scoped to the user's JWT for
 * RLS-enforced database operations.
 *
 * @param req - The incoming request with Authorization header
 * @returns AuthResult with user and RLS-enforced client
 * @throws ApiError if authentication fails
 *
 * @example
 * ```typescript
 * const { user, userClient } = await authenticateRequestWithClient(req);
 *
 * // Use userClient for RLS-enforced operations
 * const { data } = await userClient.from('jobs').select('*');
 * ```
 */
export async function authenticateRequestWithClient(req: Request): Promise<AuthResult> {
  return _authenticate(req);
}

async function _authenticate(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw new ApiError('Missing authorization header', 401);
  }

  const token = authHeader.replace('Bearer ', '');

  // Use service client to verify token and get user info
  const supabase = createServiceClient();

  // Verify JWT and get auth user
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !authUser) {
    throw new ApiError('Invalid or expired token', 401);
  }

  // Get database user with role
  const { data: dbUser, error: userError } = await supabase
    .from('users')
    .select(
      `
      user_id,
      customer_id,
      role:roles(name, is_system_role)
    `
    )
    .eq('auth_user_id', authUser.id)
    .single();

  if (userError || !dbUser) {
    throw new ApiError('User not found in database', 404);
  }

  // Normalize role - Supabase may return array or single object
  const role = Array.isArray(dbUser.role) ? (dbUser.role[0] ?? null) : (dbUser.role ?? null);

  // For system admin and customer success with context switcher: use JWT app_metadata.customer_id
  // Fallback to Admin API if JWT lacks it (JWT may not include custom app_metadata until refresh)
  let customerId: string | null = dbUser.customer_id;
  const roleName = role?.name;
  if (roleName === 'system_admin' || roleName === 'customer_success') {
    const jwtCustomerId = (authUser.app_metadata as Record<string, unknown> | undefined)
      ?.customer_id;
    if (typeof jwtCustomerId === 'string' && jwtCustomerId.trim()) {
      customerId = jwtCustomerId.trim();
    } else {
      // Fetch latest app_metadata from Auth (JWT can lag behind context switch)
      const { data: adminUser } = await supabase.auth.admin.getUserById(authUser.id);
      const metaCustomerId = (adminUser?.user?.app_metadata as Record<string, unknown> | undefined)
        ?.customer_id;
      if (typeof metaCustomerId === 'string' && metaCustomerId.trim()) {
        customerId = metaCustomerId.trim();
      }
    }
  }

  const user: AuthenticatedUser = {
    id: authUser.id,
    email: authUser.email!,
    user_id: dbUser.user_id,
    customer_id: customerId,
    role: role as { name: string; is_system_role: boolean } | null,
  };

  // Create RLS-enforced client with user's JWT
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    }
  );

  return { user, userClient };
}

/**
 * Checks if user is a system administrator.
 */
export function isSystemAdmin(user: AuthenticatedUser): boolean {
  return user.role?.name === 'system_admin';
}

/**
 * Checks if user is customer success.
 */
export function isCustomerSuccess(user: AuthenticatedUser): boolean {
  return user.role?.name === 'customer_success';
}

/**
 * Checks if user is a customer administrator.
 */
export function isCustomerAdmin(user: AuthenticatedUser): boolean {
  return user.role?.name === 'customer_admin' || user.role?.name === 'manager';
}

/**
 * Checks if user can access a specific customer's data.
 */
export function canAccessCustomer(user: AuthenticatedUser, targetCustomerId: string): boolean {
  if (isSystemAdmin(user)) return true;
  return user.customer_id === targetCustomerId;
}
