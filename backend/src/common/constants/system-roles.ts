/**
 * System Role Constants
 *
 * These constants define the three system roles that are created during migration.
 * System roles have IDs 1-3 and cannot be modified or deleted.
 * Custom roles created by users will have IDs >= 100.
 */

export const SYSTEM_ROLES = {
  SYSTEM_ADMINISTRATOR: 'System Administrator',
  CUSTOMER_SUCCESS: 'Customer Success',
  CUSTOMER_ADMINISTRATOR: 'Customer Administrator',
} as const;

export const SYSTEM_ROLE_IDS = {
  SYSTEM_ADMINISTRATOR: 1,
  CUSTOMER_SUCCESS: 2,
  CUSTOMER_ADMINISTRATOR: 3,
} as const;

/**
 * Type for system role names
 */
export type SystemRoleName = (typeof SYSTEM_ROLES)[keyof typeof SYSTEM_ROLES];

/**
 * Type for system role IDs
 */
export type SystemRoleId =
  (typeof SYSTEM_ROLE_IDS)[keyof typeof SYSTEM_ROLE_IDS];

/**
 * Minimum ID for custom roles (system roles have IDs 1-99)
 */
export const CUSTOM_ROLE_MIN_ID = 100;

/**
 * Helper function to check if a role name is a system role
 */
export function isSystemRole(roleName: string): roleName is SystemRoleName {
  return Object.values(SYSTEM_ROLES).includes(roleName as SystemRoleName);
}

/**
 * Helper function to check if a role ID is a system role
 */
export function isSystemRoleId(roleId: number): roleId is SystemRoleId {
  return roleId >= 1 && roleId <= 3;
}

/**
 * Helper function to check if a role ID is a custom role
 */
export function isCustomRoleId(roleId: number): boolean {
  return roleId >= CUSTOM_ROLE_MIN_ID;
}
