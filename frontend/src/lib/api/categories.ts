import { apiFetch } from "./api-fetch";
import { Category } from "@/contexts/auth/types";
import {config} from "@/config";

export interface ModulePermission {
  id: number;
  name: string;
  label: string;
}

interface PermissionsByModule {
  [moduleName: string]: ModulePermission[];
}
  
  interface CreateCategoryPayload {
    name: string;
    subcategory: string;
    about: string;
    icon: string;
  }
  
  interface AddRolePermissionsPayload {
    id: number;
    permissionNames: string[];
  }

  export interface GetCategoriesListParams {
    page?: number;
    perPage?: number;
    search?: string;
    orderBy?: string;
    orderDirection?: 'asc' | 'desc';
    roleId?: number[];
    customerId?: number[];
    statusId?: string[];
  }

  export interface GetCategoriesListResponse {
    data: Category[];
    meta: {
      total: number;
      page: number;
    };
  }

  export async function getSubcategories(): Promise<string[]> {
    return apiFetch<string[]>(`${config.site.apiUrl}/documents/categories/subcategories`, {
      method: "GET",
      headers: {
        accept: "*/*",
      },
    });
  }

  // export async function getCategoriesList(): Promise<Category[]> {
  //   return apiFetch<Category[]>(`${config.site.apiUrl}/documents/categories`, {
  //     method: "GET",
  //     headers: {
  //       accept: "*/*",
  //     },
  //   });
  // }

  export async function getCategoriesList(params: GetCategoriesListParams = {}): Promise<GetCategoriesListResponse> {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
  
    return apiFetch<GetCategoriesListResponse>(`${config.site.apiUrl}/documents/categories?${query.toString()}`, {
      method: 'GET',
    });
  }
  
  export async function createCategory(payload: CreateCategoryPayload): Promise<Category> {
    return apiFetch<Category>(`${config.site.apiUrl}/documents/categories`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }
 
  
  export async function getCategoryById(id: number): Promise<Category> {
    return apiFetch<Category>(`${config.site.apiUrl}/documents/categories/${id}`, {
      method: "GET",
    });
  }

  export async function deleteCategory(id: number): Promise<Category> {
    return apiFetch<Category>(`${config.site.apiUrl}/documents/categories/${id}`, {
      method: "DELETE",
    });
  }

  export async function editCategory(categoryId: number, payload: CreateCategoryPayload): Promise<Category> {
    return apiFetch<Category>(`${config.site.apiUrl}/documents/categories/${categoryId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }