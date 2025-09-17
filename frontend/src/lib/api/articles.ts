import { apiFetch } from "./api-fetch";
import { Article } from "@/contexts/auth/types";
import {config} from "@/config";

interface CreateArticlePayload {
  title?: string;
  articleCategoryId?: number;
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
    categoryId?: number[];
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
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page.toString());
    if (params.perPage) query.set('perPage', params.perPage.toString());
    if (params.search) query.set('search', params.search);
    if (params.orderBy) query.set('orderBy', params.orderBy);
    if (params.orderDirection) query.set('orderDirection', params.orderDirection);
    
    if (params.categoryId && params.categoryId.length > 0) {
      params.categoryId.forEach(id => query.append('categoryId', id.toString()));
    }
    
    if (params.statusId && params.statusId.length > 0) {
      params.statusId.forEach(status => query.append('status', status));
    }
  
    return apiFetch<GetArticlesResponse>(`${config.site.apiUrl}/documents/articles?${query.toString()}`, {
      method: 'GET',
    });
  }

export async function createArticle(
  payload: CreateArticlePayload
): Promise<Article> {
  return apiFetch<Article>(`${config.site.apiUrl}/documents/articles`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getArticleById(id: number): Promise<Article> {
  return apiFetch<Article>(`${config.site.apiUrl}/documents/articles/${id}`, {
    method: "GET",
  });
}

export async function deleteArticle(id: number): Promise<Article> {
  return apiFetch<Article>(`${config.site.apiUrl}/documents/articles/${id}`, {
    method: "DELETE",
  });
}

export async function editArticle(
  articleId: number,
  payload: CreateArticlePayload
): Promise<Article> {
  return apiFetch<Article>(`${config.site.apiUrl}/documents/articles/${articleId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
