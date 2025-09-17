import { apiFetch } from "./api-fetch";
import { Role } from "@/contexts/auth/types";
import {config} from "@/config";

export interface ModulePermission {
  id: number;
  name: string;
  label: string;
}

interface PermissionsByModule {
  [moduleName: string]: ModulePermission[];
}
  
  interface CreateRolePayload {
    name: string;
    description: string;
  }
  
  interface AddRolePermissionsPayload {
    id: number;
    permissionNames: string[];
  }

  export interface GetRolesParams {
    search?: string;
  }
  
  export async function getRoles(): Promise<Role[]> {
    return apiFetch<Role[]>(`${config.site.apiUrl}/taxonomies/roles`, {
      method: "GET",
      headers: {
        accept: "*/*",
      },
    });
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
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
  
    return apiFetch<Role[]>(`${config.site.apiUrl}/roles?${query.toString()}`, {
      method: 'GET',
    });
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
  
  export async function getRoleById(id: number): Promise<Role> {
    return apiFetch<Role>(`${config.site.apiUrl}/roles/${id}`, {
      method: "GET",
    });
  }

  export async function editRole(roleId: number, payload: CreateRolePayload): Promise<Role> {
    return apiFetch<Role>(`${config.site.apiUrl}/roles/${roleId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }