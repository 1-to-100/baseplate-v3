import { Role, TaxonomyItem } from '@/contexts/auth/types';
import { createClient } from '@/lib/supabase/client';

export interface ModulePermission {
  id: number;
  name: string;
  label: string;
}

interface PermissionsByModule {
  [moduleName: string]: ModulePermission[];
}

interface RoleData {
  role_id: string;
  name: string;
  display_name: string | null;
}

interface PermissionData {
  permission_id: string;
  name: string;
  display_name: string | null;
  description: string | null;
}

interface RoleWithRelations {
  role_id: string;
  name: string;
  display_name: string | null;
  description: string | null;
  permissions: PermissionData | PermissionData[] | null;
}

interface CreateRolePayload {
  name: string;
  description: string;
}

interface AddRolePermissionsPayload {
  id: string;
  permissionNames: string[];
}

export interface GetRolesParams {
  search?: string;
}

export type RoleListingItem = TaxonomyItem & { display_name: string };

export async function getRoles(): Promise<RoleListingItem[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('roles')
    .select('role_id, name, display_name')
    .order('name');

  if (error) throw error;

  return (data || []).map((role: RoleData) => ({
    id: role.role_id,
    name: role.name,
    display_name: role.display_name || role.name,
  }));
}

// export async function getRolesList(): Promise<Role[]> {
//   return apiFetch<Role[]>(`${config.site.apiUrl}/roles`, {
//     method: "GET",
//     headers: {
//       accept: "*/*",
//     },
//   });
// }

export async function getRolesList(params: GetRolesParams = {}): Promise<Role[]> {
  const supabase = createClient();

  // Build query
  let query = supabase
    .from('roles')
    .select(
      'role_id, name, display_name, description, permissions (permission_id, name, display_name, description)'
    )
    .order('name');

  // Add search filter if provided
  if (params.search) {
    query = query.or(`name.ilike.%${params.search}%,display_name.ilike.%${params.search}%`);
  }

  const { data: roles, error } = await query;

  if (error) throw error;

  // For each role, get user count
  const rolesWithDetails = await Promise.all(
    (roles || []).map(async (role: RoleWithRelations) => {
      // Count users with this role (excluding removed users)
      const { count: userCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role_id', role.role_id)
        .is('deleted_at', null);

      const permissions = role.permissions
        ? Array.isArray(role.permissions)
          ? role.permissions
          : [role.permissions]
        : [];

      return {
        role_id: role.role_id,
        id: role.role_id,
        name: role.name,
        display_name: role.display_name,
        displayName: role.display_name,
        description: role.description,
        permissions: permissions.map((p: PermissionData) => ({
          id: p.permission_id,
          name: p.name,
          displayName: p.display_name,
          description: p.description,
        })),
        _count: {
          users: userCount || 0,
        },
      };
    })
  );

  return rolesWithDetails as Role[];
}

export async function createRole(payload: CreateRolePayload): Promise<Role> {
  // API call removed
  throw new Error('API calls removed');
}

export async function addRolePermissions(payload: AddRolePermissionsPayload): Promise<Role> {
  // API call removed
  throw new Error('API calls removed');
}

export async function getRoleById(id: string): Promise<Role> {
  const supabase = createClient();

  const { data: roleData, error } = await supabase
    .from('roles')
    .select(
      'role_id, name, display_name, description, permissions (permission_id, name, display_name, description)'
    )
    .eq('role_id', id)
    .single();

  if (error) throw error;

  // Count users with this role (excluding removed users)
  const { count: userCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('role_id', id)
    .is('deleted_at', null);

  const role = roleData as RoleWithRelations;
  const permissions = role.permissions
    ? Array.isArray(role.permissions)
      ? role.permissions
      : [role.permissions]
    : [];

  return {
    role_id: role.role_id,
    id: role.role_id,
    name: role.name,
    display_name: role.display_name,
    displayName: role.display_name,
    description: role.description,
    permissions: permissions.map((p: PermissionData) => ({
      id: p.permission_id,
      name: p.name,
      displayName: p.display_name,
      description: p.description,
    })),
    _count: {
      users: userCount || 0,
    },
  } as unknown as Role;
}

export async function editRole(roleId: string, payload: CreateRolePayload): Promise<Role> {
  const supabase = createClient();

  const { error } = await supabase
    .from('roles')
    .update({
      name: payload.name,
      description: payload.description,
    })
    .eq('role_id', roleId);

  if (error) throw error;

  // Fetch and return updated role
  return getRoleById(roleId);
}
