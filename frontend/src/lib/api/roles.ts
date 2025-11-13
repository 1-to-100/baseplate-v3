import { apiFetch } from "./api-fetch";
import { Role, TaxonomyItem } from "@/contexts/auth/types";
import {config} from "@/config";
import { createClient } from "@/lib/supabase/client";

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
  users_count: unknown[] | null;
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
  
  export async function getRoles(): Promise<TaxonomyItem[]> {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('roles')
      .select('role_id, name, display_name')
      .order('name');
    
    if (error) throw error;
    
    return (data || []).map((role: RoleData) => ({
      id: role.role_id,
      name: role.display_name || role.name,
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
    
    let query = supabase
      .from('roles')
      .select('role_id, name, display_name, description, permissions (permission_id, name, display_name, description), users_count:users(count)')
      .order('name');
    
    if (params.search) {
      query = query.or(`name.ilike.%${params.search}%,display_name.ilike.%${params.search}%`);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return (data || []).map((role: RoleWithRelations) => {
      const permissions = role.permissions 
        ? (Array.isArray(role.permissions) ? role.permissions : [role.permissions])
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
          users: Array.isArray(role.users_count) ? role.users_count.length : 0,
        },
      };
    }) as Role[];
  }
  
  export async function createRole(payload: CreateRolePayload): Promise<Role> {
    return apiFetch<Role>(`${config.site.apiUrl}/roles`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }
  
  export async function addRolePermissions(payload: AddRolePermissionsPayload): Promise<Role> {
    return apiFetch<Role>(`${config.site.apiUrl}/roles/${payload.id}/permissions`, {
      method: "POST",
      body: JSON.stringify({ permissionNames: payload.permissionNames }),
    });
  }
  
  export async function getRoleById(id: string): Promise<Role> {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('roles')
      .select('role_id, name, display_name, description, permissions (permission_id, name, display_name, description), users_count:users(count)')
      .eq('role_id', id)
      .single();
    
    if (error) throw error;
    
    const roleData = data as RoleWithRelations;
    const permissions = roleData.permissions 
      ? (Array.isArray(roleData.permissions) ? roleData.permissions : [roleData.permissions])
      : [];
    
    return {
      role_id: roleData.role_id,
      id: roleData.role_id,
      name: roleData.name,
      display_name: roleData.display_name,
      displayName: roleData.display_name,
      description: roleData.description,
      permissions: permissions.map((p: PermissionData) => ({
        id: p.permission_id,
        name: p.name,
        displayName: p.display_name,
        description: p.description,
      })),
      _count: {
        users: Array.isArray(roleData.users_count) ? roleData.users_count.length : 0,
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