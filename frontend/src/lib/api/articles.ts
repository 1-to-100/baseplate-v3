import { Article } from "@/contexts/auth/types";

interface CreateArticlePayload {
  title?: string;
  articleCategoryId?: string;
  subcategory?: string;
  status?: string;
  content?: string;
  videoUrl?: string;
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
    // API call removed
    return {
      data: [],
      meta: {
        total: 0,
        page: params.page || 1,
        lastPage: 1,
        perPage: params.perPage || 10,
        currentPage: params.page || 1,
        prev: null,
        next: null,
      },
    };
  }

export async function createArticle(
  payload: CreateArticlePayload
): Promise<Article> {
  // API call removed
  throw new Error('API calls removed');
}

export async function getArticleById(id: string): Promise<Article> {
  // API call removed
  throw new Error('API calls removed');
}

export async function deleteArticle(id: string): Promise<Article> {
  // API call removed
  throw new Error('API calls removed');
}

export async function editArticle(
  articleId: string,
  payload: CreateArticlePayload
): Promise<Article> {
  // API call removed
  throw new Error('API calls removed');
}
