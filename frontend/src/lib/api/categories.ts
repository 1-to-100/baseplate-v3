import { Category } from "@/contexts/auth/types";
import { createClient } from "@/lib/supabase/client";
import { supabaseDB } from "@/lib/supabase/database";
import { generateSlug } from "@/lib/helpers/string-helpers";

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

  // Helper function to parse full_name to firstName/lastName
  function parseUserName(fullName: string | null): {
    firstName: string;
    lastName: string;
  } {
    const trimmed = fullName?.trim() || '';
    const parts = trimmed.split(' ').filter(Boolean);

    if (parts.length === 0) {
      return { firstName: '', lastName: '' };
    } else if (parts.length === 1) {
      return { firstName: parts[0] || '', lastName: '' };
    } else {
      return {
        firstName: parts[0] || '',
        lastName: parts.slice(1).join(' '),
      };
    }
  }

  export async function getSubcategories(): Promise<string[]> {
    const supabase = createClient();
    const currentUser = await supabaseDB.getCurrentUser();
    
    if (!currentUser.customer_id) {
      throw new Error('User must have a customer_id');
    }

    const { data, error } = await supabase
      .from('help_article_categories')
      .select('subcategory')
      .eq('customer_id', currentUser.customer_id)
      .not('subcategory', 'is', null)
      .order('subcategory', { ascending: true });

    if (error) throw error;

    // Remove duplicates manually since Supabase doesn't have distinct in the same way
    const uniqueSubcategories = [
      ...new Set((data || []).map((cat) => cat.subcategory).filter(Boolean)),
    ];
    
    return uniqueSubcategories as string[];
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
    const supabase = createClient();
    const currentUser = await supabaseDB.getCurrentUser();
    
    if (!currentUser.customer_id) {
      throw new Error('User must have a customer_id');
    }

    const page = params.page || 1;
    const perPage = params.perPage || 10;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    // Build query with article count and creator info
    let query = supabase
      .from('help_article_categories')
      .select('*, help_articles(count), users!created_by(user_id, full_name)', { count: 'exact' })
      .eq('customer_id', currentUser.customer_id)
      .range(from, to);

    // Apply search filter if provided
    if (params.search) {
      query = query.or(`name.ilike.%${params.search}%,subcategory.ilike.%${params.search}%,about.ilike.%${params.search}%`);
    }

    // Apply sorting
    const orderBy = params.orderBy || 'created_at';
    const orderDirection = params.orderDirection || 'desc';
    query = query.order(orderBy, { ascending: orderDirection === 'asc' });

    const { data, error, count } = await query;

    if (error) throw error;

    const total = count || 0;

    // Transform data to Category format
    const categories = (data || []).map((cat: any) => {
      const { firstName, lastName } = parseUserName(
        cat.users?.full_name || null
      );

      return {
        id: cat.help_article_category_id,
        name: cat.name,
        subcategory: cat.subcategory ?? '',
        about: cat.about ?? '',
        icon: cat.icon ?? '',
        articlesCount: Array.isArray(cat.help_articles) && cat.help_articles[0] 
          ? cat.help_articles[0].count 
          : 0,
        updatedAt: cat.updated_at || cat.created_at,
        Creator: {
          id: cat.created_by || '',
          firstName,
          lastName,
        },
      } as Category;
    });

    return {
      data: categories,
      meta: {
        total,
        page,
      },
    };
  }
  
  export async function createCategory(payload: CreateCategoryPayload): Promise<Category> {
    const supabase = createClient();
    const currentUser = await supabaseDB.getCurrentUser();
    
    if (!currentUser.customer_id) {
      throw new Error('User must have a customer_id');
    }

    const slug = generateSlug(payload.name);

    const { data, error } = await supabase
      .from('help_article_categories')
      .insert({
        name: payload.name,
        slug,
        subcategory: payload.subcategory || null,
        about: payload.about || null,
        icon: payload.icon || null,
        customer_id: currentUser.customer_id,
        created_by: currentUser.user_id,
      })
      .select('*, users!created_by(user_id, full_name)')
      .single();

    if (error) throw error;

    const { firstName, lastName } = parseUserName(data.users?.full_name || null);

    return {
      id: data.help_article_category_id,
      name: data.name,
      subcategory: data.subcategory ?? '',
      about: data.about ?? '',
      icon: data.icon ?? '',
      articlesCount: 0,
      updatedAt: data.updated_at || data.created_at,
      Creator: {
        id: data.created_by || '',
        firstName,
        lastName,
      },
    } as Category;
  }
 
  
export async function getCategoryById(id: string): Promise<Category> {
  const supabase = createClient();
  const currentUser = await supabaseDB.getCurrentUser();
  
  if (!currentUser.customer_id) {
    throw new Error('User must have a customer_id');
  }

  const { data, error } = await supabase
    .from('help_article_categories')
    .select('*, help_articles(count), users!created_by(user_id, full_name)')
    .eq('help_article_category_id', id)
    .eq('customer_id', currentUser.customer_id)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Category not found');

  const { firstName, lastName } = parseUserName(data.users?.full_name || null);

  return {
    id: data.help_article_category_id,
    name: data.name,
    subcategory: data.subcategory ?? '',
    about: data.about ?? '',
    icon: data.icon ?? '',
    articlesCount: Array.isArray(data.help_articles) && data.help_articles[0] 
      ? data.help_articles[0].count 
      : 0,
    updatedAt: data.updated_at || data.created_at,
    Creator: {
      id: data.created_by || '',
      firstName,
      lastName,
    },
  } as Category;
}

export async function deleteCategory(id: string): Promise<Category> {
  const supabase = createClient();
  const currentUser = await supabaseDB.getCurrentUser();
  
  if (!currentUser.customer_id) {
    throw new Error('User must have a customer_id');
  }

  // First, get the category to return it
  const category = await getCategoryById(id);

  // Check if category has any articles
  const { data: articles, error: articlesError } = await supabase
    .from('help_articles')
    .select('help_article_id')
    .eq('category_id', id)
    .limit(1);

  if (articlesError) {
    throw new Error('Failed to verify category status');
  }

  if (articles && articles.length > 0) {
    throw new Error(
      'Cannot delete category that contains articles. Please remove or reassign all articles first.'
    );
  }

  // Delete the category
  const { error } = await supabase
    .from('help_article_categories')
    .delete()
    .eq('help_article_category_id', id)
    .eq('customer_id', currentUser.customer_id);

  if (error) throw error;

  return category;
}

export async function editCategory(categoryId: string, payload: CreateCategoryPayload): Promise<Category> {
  const supabase = createClient();
  const currentUser = await supabaseDB.getCurrentUser();
  
  if (!currentUser.customer_id) {
    throw new Error('User must have a customer_id');
  }

  // Build update data
  const updateData: {
    name?: string;
    slug?: string;
    subcategory?: string | null;
    about?: string | null;
    icon?: string | null;
  } = {};

  if (payload.name !== undefined) {
    updateData.name = payload.name;
    updateData.slug = generateSlug(payload.name);
  }
  if (payload.subcategory !== undefined) {
    updateData.subcategory = payload.subcategory || null;
  }
  if (payload.about !== undefined) {
    updateData.about = payload.about || null;
  }
  if (payload.icon !== undefined) {
    updateData.icon = payload.icon || null;
  }

  const { error } = await supabase
    .from('help_article_categories')
    .update(updateData)
    .eq('help_article_category_id', categoryId)
    .eq('customer_id', currentUser.customer_id);

  if (error) throw error;

  // Fetch and return updated category
  return getCategoryById(categoryId);
}
