import { SYSTEM_ROLES } from '@/common/constants/system-roles';
import { OutputUserDto } from '@/users/dto/output-user.dto';
import { SupabaseService } from '@/common/supabase/supabase.service';

/**
 * Check if user has System Administrator role
 */
export function isSystemAdministrator(user?: OutputUserDto | null): boolean {
  if (!user) return false;
  return user.role?.name === SYSTEM_ROLES.SYSTEM_ADMINISTRATOR;
}

/**
 * Check if user has Customer Success role
 */
export function isCustomerSuccess(user?: OutputUserDto | null): boolean {
  if (!user) return false;
  return user.role?.name === SYSTEM_ROLES.CUSTOMER_SUCCESS;
}

/**
 * Check if user has Customer Administrator role
 */
export function isCustomerAdministrator(user?: OutputUserDto | null): boolean {
  if (!user) return false;
  return user.role?.name === SYSTEM_ROLES.CUSTOMER_ADMINISTRATOR;
}

/**
 * Check if user has Manager role
 */
export function isManager(user?: OutputUserDto | null): boolean {
  if (!user) return false;
  return user.role?.name === SYSTEM_ROLES.MANAGER;
}

/**
 * Check if user has Customer Administrator or Manager role
 * (both have the same permissions)
 */
export function isCustomerAdminOrManager(user?: OutputUserDto | null): boolean {
  if (!user) return false;
  return (
    user.role?.name === SYSTEM_ROLES.CUSTOMER_ADMINISTRATOR ||
    user.role?.name === SYSTEM_ROLES.MANAGER
  );
}

/**
 * Check if user has a specific system role by name
 */
export function hasSystemRole(
  user: OutputUserDto | null | undefined,
  roleName: string,
): boolean {
  if (!user) return false;
  return user.role?.name === roleName;
}

/**
 * Get role information from Supabase by role ID
 */
export async function getUserRole(
  supabase: SupabaseService,
  roleId: number,
): Promise<{
  id: number;
  name: string;
  system_role: boolean;
} | null> {
  const { data } = await supabase
    .getClient()
    .from('roles')
    .select('id, name, system_role')
    .eq('id', roleId)
    .single();
  return data;
}
