import { ApiUser } from "@/contexts/auth/types";

// System Role Names (must match backend constants - these are database names, not display names)
export const SYSTEM_ROLES = {
  SYSTEM_ADMINISTRATOR: 'system_admin',
  CUSTOMER_SUCCESS: 'customer_success',
  CUSTOMER_ADMINISTRATOR: 'customer_admin',
  STANDARD_USER: 'standard_user',
  MANAGER: 'manager',
} as const;

/**
 * Check if user is a System Administrator
 */
export const isSystemAdministrator = (user?: ApiUser): boolean => {
  return user?.role?.name === SYSTEM_ROLES.SYSTEM_ADMINISTRATOR;
};

/**
 * Check if user is Customer Success
 */
export const isCustomerSuccess = (user?: ApiUser): boolean => {
  return user?.role?.name === SYSTEM_ROLES.CUSTOMER_SUCCESS;
};

/**
 * Check if user is Customer Administrator
 */
export const isCustomerAdministrator = (user?: ApiUser): boolean => {
  return user?.role?.name === SYSTEM_ROLES.CUSTOMER_ADMINISTRATOR;
};

/**
 * Check if user is a Manager
 */
export const isManager = (user?: ApiUser): boolean => {
  return user?.role?.name === SYSTEM_ROLES.MANAGER;
};

/**
 * Check if user is Customer Administrator or Manager
 * (both have the same permissions)
 */
export const isCustomerAdminOrManager = (user?: ApiUser): boolean => {
  return user?.role?.name === SYSTEM_ROLES.CUSTOMER_ADMINISTRATOR ||
         user?.role?.name === SYSTEM_ROLES.MANAGER;
};

/**
 * Check if user has any system role
 */
export const hasSystemRole = (user?: ApiUser): boolean => {
  return user?.role?.systemRole === true;
};

/**
 * Check if user has a specific role name
 */
export const hasRole = (user: ApiUser | undefined, roleName: string): boolean => {
  return user?.role?.name === roleName;
};

/**
 * Check if the ownerUser can manage the target user
 * This includes System Admins, Customer Success for their customers, Customer Admins, and Managers for their customer
 */
export const isUserOwner = (ownerUser?: ApiUser, user?: ApiUser): boolean => {
  if (ownerUser?.customer?.ownerId === ownerUser?.id) {
    return true;
  }

  if (!ownerUser || !user) return false;

  // Check if the ownerUser is a System Administrator (replaces isSuperadmin)
  if (isSystemAdministrator(ownerUser)) return true;

  // Check if the ownerUser is Customer Success and the user belongs to the same customer (replaces isCustomerSuccess)
  if (
    isCustomerSuccess(ownerUser) &&
    ownerUser.customerId === user.customerId
  ) {
    return true;
  }

  // Check if the ownerUser is Customer Admin or Manager for the same customer
  if (
    isCustomerAdminOrManager(ownerUser) &&
    ownerUser.customerId === user.customerId
  ) {
    return true;
  }

  // Check if the ownerUser is the customer owner
  if (
    ownerUser?.customer?.ownerId === ownerUser.id &&
    ownerUser.customerId === user.customerId
  ) {
    return true;
  }

  return false;
};

/**
 * Legacy compatibility: Check if user has superadmin-like privileges
 * @deprecated Use isSystemAdministrator instead
 */
export const isSuperadmin = (user?: ApiUser): boolean => {
  return isSystemAdministrator(user) || user?.isSuperadmin === true;
};

/**
 * Legacy compatibility: Check if user has customer success privileges  
 * @deprecated Use isCustomerSuccess instead
 */
export const isCustomerSuccessLegacy = (user?: ApiUser): boolean => {
  return isCustomerSuccess(user) || user?.isCustomerSuccess === true;
};