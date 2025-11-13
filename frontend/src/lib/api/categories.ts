import { Category } from "@/contexts/auth/types";

export interface ModulePermission {
  id: string;
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
    id: string;
    permissionNames: string[];
  }

  export interface GetCategoriesListParams {
    page?: number;
    perPage?: number;
    search?: string;
    orderBy?: string;
    orderDirection?: 'asc' | 'desc';
    roleId?: string[];
    customerId?: string[];
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
    // API call removed
    return [];
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
    // API call removed
    return {
      data: [],
      meta: {
        total: 0,
        page: params.page || 1,
      },
    };
  }
  
  export async function createCategory(payload: CreateCategoryPayload): Promise<Category> {
    // API call removed
    throw new Error('API calls removed');
  }
 
  
export async function getCategoryById(id: string): Promise<Category> {
  // API call removed
  throw new Error('API calls removed');
}

export async function deleteCategory(id: string): Promise<Category> {
  // API call removed
  throw new Error('API calls removed');
}

export async function editCategory(categoryId: string, payload: CreateCategoryPayload): Promise<Category> {
  // API call removed
  throw new Error('API calls removed');
}
