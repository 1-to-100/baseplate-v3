/**
 * Data Mappers for converting between database snake_case and frontend camelCase
 * 
 * Note: This is a starting point. You may choose to:
 * - Keep snake_case throughout (less mapping, easier)
 * - Use these mappers for specific DTOs
 * - Generate types from Supabase CLI (already snake_case)
 */

// ============================================================================
// USER MAPPERS
// ============================================================================

export interface DbUser {
  user_id: string
  auth_user_id: string
  email: string
  email_verified: boolean
  full_name: string | null
  avatar_url: string | null
  phone_number: string | null
  customer_id: string | null
  role_id: string | null
  manager_id: string | null
  status: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface ApiUser {
  userId: string
  authUserId: string
  email: string
  emailVerified: boolean
  fullName: string | null
  avatarUrl: string | null
  phoneNumber: string | null
  customerId: string | null
  roleId: string | null
  managerId: string | null
  status: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export function dbUserToApiUser(dbUser: DbUser): ApiUser {
  return {
    userId: dbUser.user_id,
    authUserId: dbUser.auth_user_id,
    email: dbUser.email,
    emailVerified: dbUser.email_verified,
    fullName: dbUser.full_name,
    avatarUrl: dbUser.avatar_url,
    phoneNumber: dbUser.phone_number,
    customerId: dbUser.customer_id,
    roleId: dbUser.role_id,
    managerId: dbUser.manager_id,
    status: dbUser.status,
    createdAt: dbUser.created_at,
    updatedAt: dbUser.updated_at,
    deletedAt: dbUser.deleted_at,
  }
}

export function apiUserToDbUser(apiUser: Partial<ApiUser>): Partial<DbUser> {
  const dbUser: Partial<DbUser> = {}
  
  if (apiUser.fullName !== undefined) dbUser.full_name = apiUser.fullName
  if (apiUser.avatarUrl !== undefined) dbUser.avatar_url = apiUser.avatarUrl
  if (apiUser.phoneNumber !== undefined) dbUser.phone_number = apiUser.phoneNumber
  if (apiUser.customerId !== undefined) dbUser.customer_id = apiUser.customerId
  if (apiUser.roleId !== undefined) dbUser.role_id = apiUser.roleId
  if (apiUser.managerId !== undefined) dbUser.manager_id = apiUser.managerId
  if (apiUser.status !== undefined) dbUser.status = apiUser.status
  
  return dbUser
}

// ============================================================================
// CUSTOMER MAPPERS
// ============================================================================

export interface DbCustomer {
  customer_id: string
  name: string
  domain: string | null
  lifecycle_stage: string | null
  status: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface ApiCustomer {
  customerId: string
  name: string
  domain: string | null
  lifecycleStage: string | null
  status: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export function dbCustomerToApiCustomer(dbCustomer: DbCustomer): ApiCustomer {
  return {
    customerId: dbCustomer.customer_id,
    name: dbCustomer.name,
    domain: dbCustomer.domain,
    lifecycleStage: dbCustomer.lifecycle_stage,
    status: dbCustomer.status,
    createdAt: dbCustomer.created_at,
    updatedAt: dbCustomer.updated_at,
    deletedAt: dbCustomer.deleted_at,
  }
}

export function apiCustomerToDbCustomer(apiCustomer: Partial<ApiCustomer>): Partial<DbCustomer> {
  const dbCustomer: Partial<DbCustomer> = {}
  
  if (apiCustomer.name !== undefined) dbCustomer.name = apiCustomer.name
  if (apiCustomer.domain !== undefined) dbCustomer.domain = apiCustomer.domain
  if (apiCustomer.lifecycleStage !== undefined) dbCustomer.lifecycle_stage = apiCustomer.lifecycleStage
  if (apiCustomer.status !== undefined) dbCustomer.status = apiCustomer.status
  
  return dbCustomer
}

// ============================================================================
// ROLE MAPPERS
// ============================================================================

export interface DbRole {
  role_id: string
  name: string
  display_name: string | null
  description: string | null
  is_system_role: boolean
  permissions: string[] | null
  created_at: string
  updated_at: string
}

export interface ApiRole {
  roleId: string
  name: string
  displayName: string | null
  description: string | null
  isSystemRole: boolean
  permissions: string[] | null
  createdAt: string
  updatedAt: string
}

export function dbRoleToApiRole(dbRole: DbRole): ApiRole {
  return {
    roleId: dbRole.role_id,
    name: dbRole.name,
    displayName: dbRole.display_name,
    description: dbRole.description,
    isSystemRole: dbRole.is_system_role,
    permissions: dbRole.permissions,
    createdAt: dbRole.created_at,
    updatedAt: dbRole.updated_at,
  }
}

// ============================================================================
// TEAM MAPPERS
// ============================================================================

export interface DbTeam {
  team_id: string
  name: string
  description: string | null
  customer_id: string
  is_primary: boolean
  created_at: string
  updated_at: string
}

export interface ApiTeam {
  teamId: string
  name: string
  description: string | null
  customerId: string
  isPrimary: boolean
  createdAt: string
  updatedAt: string
}

export function dbTeamToApiTeam(dbTeam: DbTeam): ApiTeam {
  return {
    teamId: dbTeam.team_id,
    name: dbTeam.name,
    description: dbTeam.description,
    customerId: dbTeam.customer_id,
    isPrimary: dbTeam.is_primary,
    createdAt: dbTeam.created_at,
    updatedAt: dbTeam.updated_at,
  }
}

export function apiTeamToDbTeam(apiTeam: Partial<ApiTeam>): Partial<DbTeam> {
  const dbTeam: Partial<DbTeam> = {}
  
  if (apiTeam.name !== undefined) dbTeam.name = apiTeam.name
  if (apiTeam.description !== undefined) dbTeam.description = apiTeam.description
  if (apiTeam.customerId !== undefined) dbTeam.customer_id = apiTeam.customerId
  if (apiTeam.isPrimary !== undefined) dbTeam.is_primary = apiTeam.isPrimary
  
  return dbTeam
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert snake_case keys to camelCase recursively
 */
export function snakeToCamel<T = unknown>(obj: unknown): T {
  if (obj === null || obj === undefined) return obj as T
  
  if (Array.isArray(obj)) {
    return obj.map(item => snakeToCamel(item)) as T
  }
  
  if (typeof obj === 'object' && obj.constructor === Object) {
    const newObj: Record<string, unknown> = {}
    for (const key in obj) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
      newObj[camelKey] = snakeToCamel((obj as Record<string, unknown>)[key])
    }
    return newObj as T
  }
  
  return obj as T
}

/**
 * Convert camelCase keys to snake_case recursively
 */
export function camelToSnake<T = unknown>(obj: unknown): T {
  if (obj === null || obj === undefined) return obj as T
  
  if (Array.isArray(obj)) {
    return obj.map(item => camelToSnake(item)) as T
  }
  
  if (typeof obj === 'object' && obj.constructor === Object) {
    const newObj: Record<string, unknown> = {}
    for (const key in obj) {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase()
      newObj[snakeKey] = camelToSnake((obj as Record<string, unknown>)[key])
    }
    return newObj as T
  }
  
  return obj as T
}

