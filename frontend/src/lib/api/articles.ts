import { Article } from "@/contexts/auth/types";
import { createClient } from "@/lib/supabase/client";
import { supabaseDB } from "@/lib/supabase/database";
import { generateSlug } from "@/lib/helpers/string-helpers";

interface CreateArticlePayload {
  title?: string;
  articleCategoryId?: string;
  subcategory?: string;
  status?: string;
  content?: string;
  videoUrl?: string;
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

export interface GetArticlesParams {
    page?: number;
    perPage?: number;
    search?: string;
    orderBy?: string;
    orderDirection?: 'asc' | 'desc';
    categoryId?: string[];
    statusId?: string[];
  }

  interface GetArticlesResponse {
    data: Article[]; 
    meta: {
      total: number;
      page: number;
      lastPage: number;
      perPage: number;
      currentPage: number;
      prev: number | null;
      next: number | null;
    };
  }


export async function getArticlesList(params: GetArticlesParams = {}): Promise<GetArticlesResponse> {
    const supabase = createClient();
    const currentUser = await supabaseDB.getCurrentUser();
    
    if (!currentUser.customer_id) {
      throw new Error('User must have a customer_id');
    }

    const page = params.page || 1;
    const perPage = params.perPage || 10;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    // Build query with relationships
    let query = supabase
      .from('help_articles')
      .select(`
        *,
        help_article_categories!category_id(*),
        users!created_by(user_id, full_name)
      `, { count: 'exact' })
      .eq('customer_id', currentUser.customer_id)
      .range(from, to);

    // Apply filters
    if (params.categoryId && params.categoryId.length > 0) {
      query = query.in('category_id', params.categoryId);
    }

    if (params.statusId && params.statusId.length > 0) {
      query = query.in('status', params.statusId);
    }

    // Apply search filter
    if (params.search) {
      query = query.or(`title.ilike.%${params.search}%,subcategory.ilike.%${params.search}%,content.ilike.%${params.search}%`);
    }

    // Apply sorting
    const orderBy = params.orderBy || 'help_article_id';
    const orderDirection = params.orderDirection || 'desc';
    query = query.order(orderBy, { ascending: orderDirection === 'asc' });

    const { data, error, count } = await query;

    if (error) throw error;

    const total = count || 0;
    const lastPage = Math.ceil(total / perPage);

    // Transform data to Article format
    const articles = (data || []).map((article: any) => {
      const { firstName, lastName } = parseUserName(article.users?.full_name || null);

      return {
        id: article.help_article_id,
        title: article.title,
        articleCategoryId: article.category_id,
        subcategory: article.subcategory ?? '',
        status: article.status,
        content: article.content ?? '',
        videoUrl: article.video_url ?? '',
        updatedAt: article.updated_at || article.created_at,
        viewsNumber: article.view_count || 0,
        Creator: {
          id: article.created_by || '',
          firstName,
          lastName,
        },
        Category: article.help_article_categories
          ? {
              id: article.help_article_categories.help_article_category_id,
              name: article.help_article_categories.name,
            }
          : {
              id: '',
              name: '',
            },
      } as Article;
    });

    return {
      data: articles,
      meta: {
        total,
        page,
        lastPage,
        perPage,
        currentPage: page,
        prev: page > 1 ? page - 1 : null,
        next: page < lastPage ? page + 1 : null,
      },
    };
  }

export async function createArticle(
  payload: CreateArticlePayload
): Promise<Article> {
  const supabase = createClient();
  const currentUser = await supabaseDB.getCurrentUser();
  
  if (!currentUser.customer_id) {
    throw new Error('User must have a customer_id');
  }

  if (!payload.title) {
    throw new Error('Title is required');
  }

  if (!payload.articleCategoryId) {
    throw new Error('Article category ID is required');
  }

  const slug = generateSlug(payload.title);

  const { data, error } = await supabase
    .from('help_articles')
    .insert({
      title: payload.title,
      slug,
      category_id: payload.articleCategoryId,
      subcategory: payload.subcategory || null,
      status: payload.status || 'draft',
      content: payload.content || null,
      video_url: payload.videoUrl || null,
      customer_id: currentUser.customer_id,
      created_by: currentUser.user_id,
    })
    .select(`
      *,
      help_article_categories!category_id(*),
      users!created_by(user_id, full_name)
    `)
    .single();

  if (error) throw error;

  const { firstName, lastName } = parseUserName(data.users?.full_name || null);

  return {
    id: data.help_article_id,
    title: data.title,
    articleCategoryId: data.category_id,
    subcategory: data.subcategory ?? '',
    status: data.status,
    content: data.content ?? '',
    videoUrl: data.video_url ?? '',
    updatedAt: data.updated_at || data.created_at,
    viewsNumber: data.view_count || 0,
    Creator: {
      id: data.created_by || '',
      firstName,
      lastName,
    },
    Category: data.help_article_categories
      ? {
          id: data.help_article_categories.help_article_category_id,
          name: data.help_article_categories.name,
        }
      : {
          id: '',
          name: '',
        },
  } as Article;
}

export async function getArticleById(id: string): Promise<Article> {
  const supabase = createClient();
  const currentUser = await supabaseDB.getCurrentUser();
  
  if (!currentUser.customer_id) {
    throw new Error('User must have a customer_id');
  }

  const { data, error } = await supabase
    .from('help_articles')
    .select(`
      *,
      help_article_categories!category_id(*),
      users!created_by(user_id, full_name)
    `)
    .eq('help_article_id', id)
    .eq('customer_id', currentUser.customer_id)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Article not found');

  const { firstName, lastName } = parseUserName(data.users?.full_name || null);

  return {
    id: data.help_article_id,
    title: data.title,
    articleCategoryId: data.category_id,
    subcategory: data.subcategory ?? '',
    status: data.status,
    content: data.content ?? '',
    videoUrl: data.video_url ?? '',
    updatedAt: data.updated_at || data.created_at,
    viewsNumber: data.view_count || 0,
    Creator: {
      id: data.created_by || '',
      firstName,
      lastName,
    },
    Category: data.help_article_categories
      ? {
          id: data.help_article_categories.help_article_category_id,
          name: data.help_article_categories.name,
        }
      : {
          id: '',
          name: '',
        },
  } as Article;
}

export async function deleteArticle(id: string): Promise<Article> {
  const supabase = createClient();
  const currentUser = await supabaseDB.getCurrentUser();
  
  if (!currentUser.customer_id) {
    throw new Error('User must have a customer_id');
  }

  // First, get the article to return it
  const article = await getArticleById(id);

  // Delete the article
  const { error } = await supabase
    .from('help_articles')
    .delete()
    .eq('help_article_id', id)
    .eq('customer_id', currentUser.customer_id);

  if (error) throw error;

  return article;
}

export async function editArticle(
  articleId: string,
  payload: CreateArticlePayload
): Promise<Article> {
  const supabase = createClient();
  const currentUser = await supabaseDB.getCurrentUser();
  
  if (!currentUser.customer_id) {
    throw new Error('User must have a customer_id');
  }

  // Build update data
  const updateData: {
    title?: string;
    slug?: string;
    category_id?: string;
    subcategory?: string | null;
    status?: string;
    content?: string | null;
    video_url?: string | null;
  } = {};

  if (payload.title !== undefined) {
    updateData.title = payload.title;
    updateData.slug = generateSlug(payload.title);
  }
  if (payload.articleCategoryId !== undefined) {
    updateData.category_id = payload.articleCategoryId;
  }
  if (payload.subcategory !== undefined) {
    updateData.subcategory = payload.subcategory || null;
  }
  if (payload.status !== undefined) {
    updateData.status = payload.status;
  }
  if (payload.content !== undefined) {
    updateData.content = payload.content || null;
  }
  if (payload.videoUrl !== undefined) {
    updateData.video_url = payload.videoUrl || null;
  }

  const { error } = await supabase
    .from('help_articles')
    .update(updateData)
    .eq('help_article_id', articleId)
    .eq('customer_id', currentUser.customer_id);

  if (error) throw error;

  // Fetch and return updated article
  return getArticleById(articleId);
}
