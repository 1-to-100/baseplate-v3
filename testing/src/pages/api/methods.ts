import type { APIRequestContext, APIResponse } from '@playwright/test';
import { request } from '@playwright/test';
import { APIRoutes } from './routes';
import { ConfigData } from '@configData';
import {
  getArticlePayload,
  getCategoriesPayload,
  getCreateRolePayload,
  getPermissionsPayload,
  getSupabaseLoginPayload,
  getUsersPayload,
} from './payload';

export class ApiMethods {
  private requestContext: APIRequestContext;

  constructor(requestContext: APIRequestContext) {
    this.requestContext = requestContext;
  }

  private async createContext(url: string) {
    this.requestContext = await request.newContext({
      baseURL: url,
    });
  }

  public static headerWithBearerToken(accessToken: string) {
    return {
      headers: { Authorization: `Bearer ${accessToken}` },
    };
  }

  async getAccessToken(userData: { user: string; password: string }): Promise<string> {
    await this.createContext(ConfigData.supabaseApiUrl);
    const response = await this.requestContext.post(APIRoutes.SupabaseLogin, {
      ...getSupabaseLoginPayload(userData),
      headers: {
        apikey: ConfigData.supabaseApiKey,
      },
    });
    return (await response.json()).access_token;
  }

  async createRole(description: string, name: string, apiKey: string): Promise<number> {
    await this.createContext(ConfigData.apiUrl);
    const response = await this.requestContext.post(APIRoutes.Roles, {
      ...ApiMethods.headerWithBearerToken(apiKey),
      ...getCreateRolePayload(description, name),
    });
    return (await response.json()).id;
  }

  async addPermissionsForRole(permissions: string[], roleId: number, apiKey: string): Promise<number> {
    await this.createContext(ConfigData.apiUrl);
    const response = await this.requestContext.post(APIRoutes.Roles + '/' + roleId + APIRoutes.Permissions, {
      ...ApiMethods.headerWithBearerToken(apiKey),
      ...getPermissionsPayload(permissions),
    });
    return response.status();
  }

  async getUserData(apiKey: string, user: string): Promise<APIResponse> {
    await this.createContext(ConfigData.apiUrl);
    return await this.requestContext.get(APIRoutes.Users, {
      ...ApiMethods.headerWithBearerToken(apiKey),
      ...getUsersPayload(user),
    });
  }

  async deleteUser(apiKey: string, userId: string): Promise<number> {
    await this.createContext(ConfigData.apiUrl);
    const response = await this.requestContext.delete(APIRoutes.Users + '/' + userId, {
      ...ApiMethods.headerWithBearerToken(apiKey),
    });
    return response.status();
  }

  async createCategory(apiKey: string, icon: string, name: string, subcategory: string): Promise<APIResponse> {
    await this.createContext(ConfigData.apiUrl);
    return await this.requestContext.post(APIRoutes.Categories, {
      ...ApiMethods.headerWithBearerToken(apiKey),
      ...getCategoriesPayload(icon, name, subcategory),
    });
  }

  async createArticle(
    apiKey: string,
    articleCategoryId: number,
    content: string,
    status: string,
    subcategory: string,
    title: string,
  ): Promise<number> {
    await this.createContext(ConfigData.apiUrl);
    const response = await this.requestContext.post(APIRoutes.Articles, {
      ...ApiMethods.headerWithBearerToken(apiKey),
      ...getArticlePayload(articleCategoryId, content, status, subcategory, title),
    });
    return response.status();
  }
}
