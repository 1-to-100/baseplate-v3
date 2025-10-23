/**
 * System Role Constants
 *
 * These constants define the three system roles that are created during migration.
 * System roles are identified by their names and cannot be modified or deleted.
 * Custom roles created by users will have random UUIDs.
 */

export const SYSTEM_ROLES = {
  SYSTEM_ADMINISTRATOR: 'system_admin',
  CUSTOMER_SUCCESS: 'customer_success',
  CUSTOMER_ADMINISTRATOR: 'customer_admin',
} as const;

/**
 * Type for system role names
 */
export type SystemRoleName = (typeof SYSTEM_ROLES)[keyof typeof SYSTEM_ROLES];

/**
 * System role names for validation
 */
export const SYSTEM_ROLE_NAMES = Object.values(SYSTEM_ROLES);

/**
 * Helper function to check if a role name is a system role
 */
export function isSystemRole(roleName: string): roleName is SystemRoleName {
  return Object.values(SYSTEM_ROLES).includes(roleName as SystemRoleName);
}
